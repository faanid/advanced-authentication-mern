const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");
const Token = require("../models/tokenModel");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");
const { generateToken } = require("../utils");
const {
  generateLoginCode,
  hashLoginCode,
  verifyLoginCode,
} = require("../utils/authTokens");
const { OAuth2Client } = require("google-auth-library");
const {
  isValidPassword,
  isWithinBcryptLimit,
  setAuthCookie,
  buildFrontendUrl,
  clearAuthCookie,
} = require("../utils/authHelpers");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedName = String(name || "").trim();

  if (!normalizedName || !normalizedEmail || typeof password !== "string") {
    res.status(400);
    throw new Error("Name, email, and password are required");
  }

  if (!isValidPassword(password)) {
    res.status(400);
    throw new Error("Password must be at least 8 characters and no more than 72 UTF-8 bytes");
  }

  const userExists = await User.findOne({ email: normalizedEmail });

  if (userExists) {
    res.status(400);
    throw new Error("Email already in use. Please login instead.");
  }

  const userAgent = [req.get("user-agent") || "unknown"];

  let user;

  try {
    user = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      password,
      userAgent,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Email already in use. Please login instead.",
      });
    }

    throw error;
  }

  const token = generateToken(user._id, user.tokenVersion);

  setAuthCookie(res, token);

  if (user) {
    const { _id, name, email, phone, bio, photo, role, isVerified } = user;

    res.status(201).json({
      _id,
      name,
      email,
      phone,
      bio,
      photo,
      role,
      isVerified,
    });
  } else {
    res.status(400);
    throw new Error("Invalid user data");
  }
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (
    typeof email !== "string" ||
    !email.trim() ||
    !isWithinBcryptLimit(password)
  ) {
    res.status(400);
    throw new Error("Please add a valid email and password");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail }).select("+password");

  if (!user) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  const passwordIsCorrect = await bcrypt.compare(password, user.password);

  if (!passwordIsCorrect) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  const currentUserAgent = req.get("user-agent") || "unknown";

  if (user.role === "suspended") {
    res.status(403);
    throw new Error("User suspended, please contact support");
  }

  if (!user.userAgent.includes(currentUserAgent)) {
    res.status(401);
    throw new Error("New browser or device detected");
  }

  const token = generateToken(user._id, user.tokenVersion);

  if (user && passwordIsCorrect) {
    setAuthCookie(res, token);
    const { _id, name, email, phone, bio, photo, role, isVerified } = user;

    res.status(200).json({
      _id,
      name,
      email,
      phone,
      bio,
      photo,
      role,
      isVerified,
    });
  } else {
    res.status(500);
    throw new Error("Something went wrong, please try again");
  }
});

const sendLoginCode = asyncHandler(async (req, res) => {
  const email = String(req.params.email || req.body?.email || "")
    .trim()
    .toLowerCase();
  const genericResponse = {
    message: "If an eligible account exists, a login code will be sent",
  };

  if (!email) {
    return res.status(200).json(genericResponse);
  }

  const user = await User.findOne({ email }).select("_id email name role");

  if (!user || user.role === "suspended") {
    return res.status(200).json(genericResponse);
  }

  const now = new Date();
  const cooldownBoundary = new Date(now.getTime() - 60 * 1000);
  const loginCode = generateLoginCode();
  const loginCodeHash = hashLoginCode(loginCode);
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);

  let loginToken;

  try {
    loginToken = await Token.findOneAndUpdate(
      {
        userId: user._id,
        purpose: "login_otp",
        $or: [
          { createdAt: { $lte: cooldownBoundary } },
          { createdAt: { $exists: false } },
        ],
      },
      {
        $set: {
          loginToken: loginCodeHash,
          attempts: 0,
          createdAt: now,
          expiresAt,
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );
  } catch (error) {
    if (error.code === 11000) {
      return res.status(200).json(genericResponse);
    }

    throw error;
  }

  try {
    await sendEmail(
      "Login Access Code - AUTH:F",
      user.email,
      process.env.EMAIL_USER,
      process.env.EMAIL_REPLY_TO || process.env.EMAIL_USER,
      "loginCode",
      user.name,
      loginCode
    );
  } catch (error) {
    await Token.deleteOne({
      _id: loginToken._id,
      loginToken: loginCodeHash,
    });

    return res.status(502).json({
      message: "Unable to send the login code",
    });
  }

  return res.status(200).json(genericResponse);
});

const loginWithCode = asyncHandler(async (req, res) => {
  const email = String(req.params.email || req.body?.email || "")
    .trim()
    .toLowerCase();
  const loginCode = String(req.body?.loginCode || "").trim();

  if (!email || !/^[0-9]{6}$/.test(loginCode)) {
    return res.status(401).json({ message: "Invalid email or login code" });
  }

  const user = await User.findOne({ email });

  if (!user || user.role === "suspended") {
    return res.status(401).json({ message: "Invalid email or login code" });
  }

  const userToken = await Token.findOne({
    userId: user._id,
    purpose: "login_otp",
    expiresAt: { $gt: new Date() },
    attempts: { $lt: 5 },
  });

  if (!userToken || !verifyLoginCode(loginCode, userToken.loginToken)) {
    if (userToken) {
      const updatedToken = await Token.findOneAndUpdate(
        {
          _id: userToken._id,
          userId: user._id,
          purpose: "login_otp",
          expiresAt: { $gt: new Date() },
          attempts: { $lt: 5 },
        },
        { $inc: { attempts: 1 } },
        { new: true }
      );

      if (updatedToken?.attempts >= 5) {
        await Token.deleteOne({
          _id: updatedToken._id,
          attempts: { $gte: 5 },
        });
      }
    }

    return res.status(401).json({ message: "Invalid email or login code" });
  }

  const consumedToken = await Token.deleteOne({
    _id: userToken._id,
    userId: user._id,
    purpose: "login_otp",
    loginToken: userToken.loginToken,
    expiresAt: { $gt: new Date() },
    attempts: { $lt: 5 },
  });

  if (consumedToken.deletedCount !== 1) {
    return res.status(401).json({
      message: "Invalid email or login code",
    });
  }

  const currentUserAgent = req.get("user-agent") || "unknown";
  user.userAgent = [...new Set([...(user.userAgent || []), currentUserAgent])];
  await user.save();

  const token = generateToken(user._id, user.tokenVersion);
  setAuthCookie(res, token);

  const { _id, name, phone, bio, photo, role, isVerified } = user;

  return res.status(200).json({
    _id,
    name,
    email: user.email,
    phone,
    bio,
    photo,
    role,
    isVerified,
  });
});

const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, password } = req.body;
  const user = await User.findById(req.user._id).select("+password");

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (!isWithinBcryptLimit(oldPassword) || !isValidPassword(password)) {
    res.status(400);
    throw new Error("Enter your current password and a new password of at least 8 characters and no more than 72 UTF-8 bytes");
  }

  const passwordIsCorrect = await bcrypt.compare(oldPassword, user.password);

  if (!passwordIsCorrect) {
    res.status(401);
    throw new Error("Current password is incorrect");
  }

  if (oldPassword === password) {
    res.status(400);
    throw new Error("New password must be different from the current password");
  }

  user.password = password;
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();
  await Token.deleteMany({ userId: user._id });
  clearAuthCookie(res);

  if (process.env.EMAIL_USER && process.env.FRONTEND_URL) {
    try {
      await sendEmail(
        "Password Changed - AUTH:F",
        user.email,
        process.env.EMAIL_USER,
        process.env.EMAIL_REPLY_TO || process.env.EMAIL_USER,
        "changePassword",
        user.name,
        buildFrontendUrl("/login")
      );
    } catch (error) {
      console.error("Password change notification failed:", error.message);
    }
  }

  return res.status(200).json({
    message: "Password changed successfully. Please log in again.",
  });
});

const loginWithGoogle = asyncHandler(async (req, res) => {
  const { userToken } = req.body;

  if (!userToken || !process.env.GOOGLE_CLIENT_ID) {
    res.status(400);
    throw new Error("Google credential is required");
  }

  const ticket = await client.verifyIdToken({
    idToken: userToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();

  if (!payload?.email || payload.email_verified !== true) {
    res.status(401);
    throw new Error("Google account email must be verified");
  }

  const email = payload.email.toLowerCase();
  const userAgent = req.get("user-agent") || "unknown";
  let user = await User.findOne({ email });

  if (!user) {
    user = await User.create({
      name: payload.name || email.split("@")[0],
      email,
      password: crypto.randomBytes(32).toString("hex"),
      photo: payload.picture,
      isVerified: true,
      userAgent: [userAgent],
    });
  } else if (user.role === "suspended") {
    res.status(403);
    throw new Error("User suspended, please contact support");
  }

  const token = generateToken(user._id, user.tokenVersion);
  setAuthCookie(res, token);

  return res.status(200).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    bio: user.bio,
    photo: user.photo,
    role: user.role,
    isVerified: user.isVerified,
  });
});

const logoutUser = asyncHandler(async (req, res) => {
  const token = req.cookies?.token;
  clearAuthCookie(res);

  if (token && process.env.JWT_SECRET) {
    let payload;

    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (
        error.name !== "JsonWebTokenError" &&
        error.name !== "TokenExpiredError" &&
        error.name !== "NotBeforeError"
      ) {
        throw error;
      }
    }

    if (payload?.id) {
      const user = await User.findById(payload.id);

      if (
        user &&
        (payload.tokenVersion ?? 0) === (user.tokenVersion || 0)
      ) {
        user.tokenVersion = (user.tokenVersion || 0) + 1;
        await user.save();
      }
    }
  }

  return res.status(200).json({ message: "Logged out successfully" });
});

const loginStatus = asyncHandler(async (req, res) => {
  const token = req.cookies?.token;

  if (!token || !process.env.JWT_SECRET) {
    return res.status(200).json(false);
  }

  let payload;

  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError" ||
      error.name === "NotBeforeError"
    ) {
      return res.status(200).json(false);
    }

    throw error;
  }

  const user = await User.findById(payload.id).select("_id role tokenVersion");
  const tokenVersion = Number.isInteger(payload.tokenVersion)
    ? payload.tokenVersion
    : 0;
  const isLoggedIn = Boolean(
    user &&
      user.role !== "suspended" &&
      tokenVersion === (user.tokenVersion || 0)
  );

  return res.status(200).json(isLoggedIn);
});

module.exports = {
  registerUser,
  loginUser,
  sendLoginCode,
  loginWithCode,
  changePassword,
  loginWithGoogle,
  logoutUser,
  loginStatus,
};
