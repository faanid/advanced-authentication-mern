const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");
const Token = require("../models/tokenModel");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");
const { hashToken } = require("../utils");
const {
  isValidPassword,
  buildFrontendUrl,
  issueOneTimeToken,
} = require("../utils/authHelpers");

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
  const password = req.body?.password;

  if (!isValidPassword(password)) {
    res.status(400);
    throw new Error("Password must be at least 8 characters and no more than 72 UTF-8 bytes");
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

module.exports = {
  sendVerificationEmail,
  verifyToken,
  forgotPassword,
  resetPassword,
};
