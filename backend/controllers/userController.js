const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const sendEmail = require("../utils/sendEmail");
const { generateToken, hashToken } = require("../utils/index");
const { generateLoginCode, hashLoginCode, verifyLoginCode } = require("../utils/authTokens");
const Token = require("../models/tokenModel");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");


const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const setAuthCookie = (res, token) => {
  const isProduction = process.env.NODE_ENV === "production";

  res.cookie("token", token, {
    path: "/",
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: isProduction ? "none" : "lax",
    secure: isProduction,
  });
};

const buildFrontendUrl = (path) => {
  if (!process.env.FRONTEND_URL) {
    throw new Error("FRONTEND_URL must be configured");
  }

  return process.env.FRONTEND_URL.replace(/\/+$/, "") + path;
};

const issueOneTimeToken = async ({
  userId,
  purpose,
  tokenField,
  tokenHash,
  expiresInMs,
  cooldownMs = 60 * 1000,
}) => {
  const now = new Date();
  const cooldownBoundary = new Date(now.getTime() - cooldownMs);

  try {
    return await Token.findOneAndUpdate(
      {
        userId,
        purpose,
        $or: [
          { createdAt: { $lte: cooldownBoundary } },
          { createdAt: { $exists: false } },
        ],
      },
      {
        $set: {
          [tokenField]: tokenHash,
          attempts: 0,
          createdAt: now,
          expiresAt: new Date(now.getTime() + expiresInMs),
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
      return null;
    }

    throw error;
  }
};

const clearAuthCookie = (res) => {
  const isProduction = process.env.NODE_ENV === "production";

  res.clearCookie("token", {
    path: "/",
    httpOnly: true,
    sameSite: isProduction ? "none" : "lax",
    secure: isProduction,
  });
};


const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedName = String(name || "").trim();

  if (!normalizedName || !normalizedEmail || !password) {
    res.status(400);
    throw new Error("Name, email, and password are required");
  }

  if (password.length < 6) {
    res.status(400);
    throw new Error("Password must be at least 6 characters");
  }

  const userExists = await User.findOne({ email: normalizedEmail });

  if (userExists) {
    res.status(400);
    throw new Error("Email already in use. Please login instead.");
  }

  const userAgent = [req.get("user-agent") || "unknown"];

  const user = await User.create({
    name: normalizedName,
    email: normalizedEmail,
    password,
    userAgent,
  });

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

  if (!email || !password) {
    res.status(400);
    throw new Error("Please add email and password");
  }

  const normalizedEmail = String(email || "").trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

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

const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

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

const sendVerificationEmail = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (user.isVerified) {
    return res.status(200).json({ message: "Account is already verified" });
  }

  const verificationToken = crypto.randomBytes(32).toString("hex");
  const verificationHash = hashToken(verificationToken);
  const tokenRecord = await issueOneTimeToken({
    userId: user._id,
    purpose: "email_verification",
    tokenField: "vToken",
    tokenHash: verificationHash,
    expiresInMs: 30 * 60 * 1000,
  });

  if (!tokenRecord) {
    return res.status(429).json({
      message: "Please wait before requesting another verification email",
    });
  }

  try {
    await sendEmail(
      "Verify Your Account - AUTH:F",
      user.email,
      process.env.EMAIL_USER,
      process.env.EMAIL_REPLY_TO || process.env.EMAIL_USER,
      "verifyEmail",
      user.name,
      buildFrontendUrl("/verify/" + verificationToken)
    );
  } catch (error) {
    await Token.deleteOne({
      _id: tokenRecord._id,
      vToken: verificationHash,
    });

    return res.status(502).json({
      message: "Unable to send the verification email",
    });
  }

  return res.status(200).json({ message: "Verification email sent" });
});

const verifyToken = asyncHandler(async (req, res) => {
  const verificationToken = String(req.params.verificationToken || "");

  if (!verificationToken) {
    return res.status(400).json({ message: "Verification link is invalid or expired" });
  }

  const verificationHash = hashToken(verificationToken);
  const userToken = await Token.findOne({
    purpose: "email_verification",
    vToken: verificationHash,
    expiresAt: { $gt: new Date() },
  });

  if (!userToken) {
    return res.status(400).json({ message: "Verification link is invalid or expired" });
  }

  const user = await User.findById(userToken.userId);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (!user.isVerified) {
    user.isVerified = true;
    await user.save();
  }

  const consumedToken = await Token.deleteOne({
    _id: userToken._id,
    userId: user._id,
    purpose: "email_verification",
    vToken: verificationHash,
    expiresAt: { $gt: new Date() },
  });

  if (consumedToken.deletedCount !== 1) {
    return res.status(400).json({
      message: "Verification link has already been used",
    });
  }

  return res.status(200).json({
    message: "Account verification successful",
  });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const genericMessage =
    "If an account with that email exists, a password reset link will be sent";

  if (!email) {
    return res.status(200).json({ message: genericMessage });
  }

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(200).json({ message: genericMessage });
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetHash = hashToken(resetToken);
  const tokenRecord = await issueOneTimeToken({
    userId: user._id,
    purpose: "password_reset",
    tokenField: "rToken",
    tokenHash: resetHash,
    expiresInMs: 15 * 60 * 1000,
  });

  if (!tokenRecord) {
    return res.status(200).json({ message: genericMessage });
  }

  try {
    await sendEmail(
      "Password Reset Request - AUTH:F",
      user.email,
      process.env.EMAIL_USER,
      process.env.EMAIL_REPLY_TO || process.env.EMAIL_USER,
      "forgotPassword",
      user.name,
      buildFrontendUrl("/resetPassword/" + resetToken)
    );
  } catch (error) {
    await Token.deleteOne({
      _id: tokenRecord._id,
      rToken: resetHash,
    });
    console.error("Password reset email delivery failed");
  }

  return res.status(200).json({ message: genericMessage });
});

const resetPassword = asyncHandler(async (req, res) => {
  const resetToken = String(req.params.resetToken || "");
  const password = String(req.body?.password || "");

  if (password.length < 6) {
    res.status(400);
    throw new Error("Password must be at least 6 characters");
  }

  const userToken = await Token.findOne({
    purpose: "password_reset",
    rToken: hashToken(resetToken),
    expiresAt: { $gt: new Date() },
  });

  if (!userToken) {
    res.status(400);
    throw new Error("Password reset link is invalid or expired");
  }

  const consumedToken = await Token.deleteOne({
    _id: userToken._id,
    userId: userToken.userId,
    purpose: "password_reset",
    rToken: hashToken(resetToken),
    expiresAt: { $gt: new Date() },
  });

  if (consumedToken.deletedCount !== 1) {
    res.status(400);
    throw new Error("Password reset link has already been used");
  }

  const user = await User.findById(userToken.userId);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  user.password = password;
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();
  await Token.deleteMany({ userId: user._id });

  return res.status(200).json({
    message: "Password reset successful. Please log in again.",
  });
});

const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, password } = req.body;
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (!oldPassword || !password || password.length < 6) {
    res.status(400);
    throw new Error("Enter your current password and a new password of at least 6 characters");
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

const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const updates = req.body || {};

  if (Object.prototype.hasOwnProperty.call(updates, "name")) {
    const name = String(updates.name || "").trim();

    if (!name || name.length > 80) {
      return res.status(400).json({ message: "Name must contain 1 to 80 characters" });
    }

    user.name = name;
  }

  if (Object.prototype.hasOwnProperty.call(updates, "phone")) {
    const phone = String(updates.phone || "").trim();

    if (phone.length > 32) {
      return res.status(400).json({ message: "Phone number is too long" });
    }

    user.phone = phone;
  }

  if (Object.prototype.hasOwnProperty.call(updates, "bio")) {
    const bio = String(updates.bio || "").trim();

    if (bio.length > 500) {
      return res.status(400).json({ message: "Bio must not exceed 500 characters" });
    }

    user.bio = bio;
  }

  if (Object.prototype.hasOwnProperty.call(updates, "photo")) {
    const photo = String(updates.photo || "").trim();

    if (photo) {
      let photoUrl;

      try {
        photoUrl = new URL(photo);
      } catch {
        return res.status(400).json({ message: "A valid profile image URL is required" });
      }

      if (photoUrl.protocol !== "https:") {
        return res.status(400).json({ message: "Profile image URL must use HTTPS" });
      }
    }

    user.photo = photo;
  }

  await user.save();

  const updatedUser = await User.findById(user._id).select("-password");
  return res.status(200).json(updatedUser);
});

const deleteUser = asyncHandler(async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) {
    return res.status(400).json({ message: "You cannot delete your own account from this endpoint" });
  }

  const user = await User.findByIdAndDelete(req.params.id);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  await Token.deleteMany({ userId: user._id });

  return res.status(200).json({ message: "User deleted successfully" });
});

const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find()
    .select("-password")
    .sort({ createdAt: -1 })
    .lean();

  return res.status(200).json(users);
});

const upgradeUser = asyncHandler(async (req, res) => {
  const { id, role } = req.body || {};
  const allowedRoles = ["subscriber", "author", "admin", "suspended"];

  if (!id || !allowedRoles.includes(role)) {
    return res.status(400).json({ message: "A valid user ID and role are required" });
  }

  if (String(id) === String(req.user._id)) {
    return res.status(400).json({ message: "You cannot change your own role" });
  }

  const user = await User.findById(id);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (user.role === role) {
    return res.status(200).json({ message: "User already has this role" });
  }

  user.role = role;
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();
  await Token.deleteMany({ userId: user._id, purpose: "login_otp" });

  return res.status(200).json({ message: "User role updated successfully" });
});

const sendAutomatedEmail = asyncHandler(async (req, res) => {
  const { id, role } = req.body || {};

  if (!id || !["subscriber", "author", "admin", "suspended"].includes(role)) {
    return res.status(400).json({ message: "A valid user ID and role are required" });
  }

  const user = await User.findById(id).select("name email role");

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (user.role !== role) {
    return res.status(409).json({ message: "The user's role has changed; refresh and try again" });
  }

  await sendEmail(
    "Your account role has changed - AUTH:F",
    user.email,
    process.env.EMAIL_USER,
    process.env.EMAIL_REPLY_TO || process.env.EMAIL_USER,
    "changeRole",
    user.name,
    buildFrontendUrl("/login")
  );

  return res.status(200).json({ message: "Role notification email sent" });
});

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  getUser,
  updateUser,
  deleteUser,
  getUsers,
  loginStatus,
  upgradeUser,
  sendAutomatedEmail,
  sendVerificationEmail,
  verifyToken,
  forgotPassword,
  resetPassword,
  changePassword,
  sendLoginCode,
  loginWithCode,
  loginWithGoogle,
};
