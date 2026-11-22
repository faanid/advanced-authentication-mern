const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");
const Token = require("../models/tokenModel");
const sendEmail = require("../utils/sendEmail");
const { buildFrontendUrl } = require("../utils/authHelpers");

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
    .select("-password -userAgent")
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
  deleteUser,
  getUsers,
  upgradeUser,
  sendAutomatedEmail,
};
