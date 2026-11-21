const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const sendEmail = require("../utils/sendEmail");
const { generateToken, hashToken } = require("../utils/index");
const Token = require("../models/tokenModel");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");


const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const hashLoginCode = (code) =>
  crypto.createHmac("sha256", process.env.JWT_SECRET).update(code).digest("hex");

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

  return process.env.FRONTEND_URL.replace(/\\/+$/, "") + path;
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


// Register User
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

  // Get UserAgent
  const userAgent = [req.get("user-agent") || "unknown"];

  // Create New User
  const user = await User.create({
    name: normalizedName,
    email: normalizedEmail,
    password,
    userAgent,
  });

  //Generate Token
  const token = generateToken(user._id, user.tokenVersion);

  //Send HTTP-only cookie
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

// Login User
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validation
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

  //Generate Token
  const token = generateToken(user._id, user.tokenVersion);

  if (user && passwordIsCorrect) {
    // Send HTTP-only cookie
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

// Send Login Code
const sendLoginCode = asyncHandler(async (req, res) => {
  const email = String(req.params.email || "").trim().toLowerCase();

  if (!email) {
    res.status(400);
    throw new Error("Email is required");
  }

  const user = await User.findOne({ email });

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const existingToken = await Token.findOne({
    userId: user._id,
    purpose: "login_otp",
  });

  if (
    existingToken &&
    Date.now() - existingToken.createdAt.getTime() < 60 * 1000
  ) {
    res.status(429);
    throw new Error("Please wait before requesting another login code");
  }

  const loginCode = crypto.randomInt(100000, 1000000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await Token.deleteMany({
    userId: user._id,
    purpose: "login_otp",
  });

  const loginToken = await Token.create({
    userId: user._id,
    purpose: "login_otp",
    loginToken: hashLoginCode(loginCode),
    attempts: 0,
    createdAt: new Date(),
    expiresAt,
  });

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
    await Token.deleteOne({ _id: loginToken._id });
    res.status(502);
    throw new Error("Unable to send the login code");
  }

  return res.status(200).json({
    message: `Access code sent to ${user.email}`,
  });
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
  const email = String(req.params.email || "").trim().toLowerCase();
  const loginCode = String(req.body.loginCode || "").trim();

  if (!/^[0-9]{6}$/.test(loginCode)) {
    res.status(400);
    throw new Error("A valid six-digit login code is required");
  }

  const user = await User.findOne({ email });

  if (!user) {
    res.status(401);
    throw new Error("Invalid email or login code");
  }

  const userToken = await Token.findOne({
    userId: user._id,
    purpose: "login_otp",
    expiresAt: { $gt: new Date() },
    attempts: { $lt: 5 },
  });

  if (!userToken) {
    res.status(401);
    throw new Error("Login code is invalid or expired");
  }

  const expectedHash = Buffer.from(userToken.loginToken, "hex");
  const receivedHash = Buffer.from(hashLoginCode(loginCode), "hex");
  const isCodeValid =
    expectedHash.length === receivedHash.length &&
    crypto.timingSafeEqual(expectedHash, receivedHash);

  if (!isCodeValid) {
    const updatedToken = await Token.findOneAndUpdate(
      { _id: userToken._id, attempts: { $lt: 5 } },
      { $inc: { attempts: 1 } },
      { new: true }
    );

    if (updatedToken?.attempts >= 5) {
      await updatedToken.deleteOne();
    }

    res.status(401);
    throw new Error("Incorrect login code");
  }

  const consumedToken = await Token.deleteOne({
    _id: userToken._id,
    loginToken: userToken.loginToken,
    expiresAt: { $gt: new Date() },
    attempts: { $lt: 5 },
  });

  if (consumedToken.deletedCount !== 1) {
    res.status(401);
    throw new Error("Login code is invalid or has already been used");
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

// Send Verification Email
const sendVerificationEmail = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (user.isVerified) {
    return res.status(200).json({ message: "Account is already verified" });
  }

  const existingToken = await Token.findOne({
    userId: user._id,
    purpose: "email_verification",
  });

  if (
    existingToken &&
    Date.now() - existingToken.createdAt.getTime() < 60 * 1000
  ) {
    res.status(429);
    throw new Error("Please wait before requesting another verification email");
  }

  await Token.deleteMany({
    userId: user._id,
    purpose: "email_verification",
  });

  const verificationToken = crypto.randomBytes(32).toString("hex");
  const tokenRecord = await Token.create({
    userId: user._id,
    purpose: "email_verification",
    vToken: hashToken(verificationToken),
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
  });

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
    await Token.deleteOne({ _id: tokenRecord._id });
    res.status(502);
    throw new Error("Unable to send the verification email");
  }

  return res.status(200).json({ message: "Verification email sent" });
});

const verifyToken = asyncHandler(async (req, res) => {
  const verificationToken = String(req.params.verificationToken || "");
  const userToken = await Token.findOne({
    purpose: "email_verification",
    vToken: hashToken(verificationToken),
    expiresAt: { $gt: new Date() },
  });

  if (!userToken) {
    res.status(400);
    throw new Error("Verification link is invalid or expired");
  }

  const consumedToken = await Token.deleteOne({
    _id: userToken._id,
    purpose: "email_verification",
    expiresAt: { $gt: new Date() },
  });

  if (consumedToken.deletedCount !== 1) {
    res.status(400);
    throw new Error("Verification link has already been used");
  }

  const user = await User.findById(userToken.userId);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (!user.isVerified) {
    user.isVerified = true;
    await user.save();
  }

  return res.status(200).json({
    message: "Account verification successful",
  });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const genericMessage =
    "If an account with that email exists, a password reset link will be sent";

  if (!email) {
    return res.status(200).json({ message: genericMessage });
  }

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(200).json({ message: genericMessage });
  }

  const existingToken = await Token.findOne({
    userId: user._id,
    purpose: "password_reset",
  });

  if (
    existingToken &&
    Date.now() - existingToken.createdAt.getTime() < 60 * 1000
  ) {
    return res.status(200).json({ message: genericMessage });
  }

  await Token.deleteMany({
    userId: user._id,
    purpose: "password_reset",
  });

  const resetToken = crypto.randomBytes(32).toString("hex");
  const tokenRecord = await Token.create({
    userId: user._id,
    purpose: "password_reset",
    rToken: hashToken(resetToken),
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
  });

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
    await Token.deleteOne({ _id: tokenRecord._id });
    res.status(502);
    throw new Error("Unable to send the password reset email");
  }

  return res.status(200).json({ message: genericMessage });
});

const resetPassword = asyncHandler(async (req, res) => {
  const resetToken = String(req.params.resetToken || "");
  const password = String(req.body.password || "");

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
    purpose: "password_reset",
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
