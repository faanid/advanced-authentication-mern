const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");
const jwt = require("jsonwebtoken");

const protect = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ message: "Not authorized, please login" });
  }

  let verified;
  try {
    verified = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError" ||
      error.name === "NotBeforeError"
    ) {
      return res.status(401).json({ message: "Invalid or expired session" });
    }
    throw error;
  }

  const user = await User.findById(verified.id).select("-password");

  if (!user) {
    return res.status(401).json({ message: "User not found" });
  }

  if (user.role === "suspended") {
    return res.status(403).json({ message: "User suspended, please contact support" });
  }

  req.user = user;
  return next();
});

const adminOnly = asyncHandler(async (req, res, next) => {
  if (req.user?.role === "admin") {
    return next();
  }

  return res.status(403).json({ message: "Admin access required" });
});

const authorOnly = asyncHandler(async (req, res, next) => {
  if (req.user?.role === "author" || req.user?.role === "admin") {
    return next();
  }

  return res.status(403).json({ message: "Author access required" });
});

const verifiedOnly = asyncHandler(async (req, res, next) => {
  if (req.user?.isVerified) {
    return next();
  }

  return res.status(403).json({ message: "Account verification required" });
});

module.exports = {
  protect,
  adminOnly,
  authorOnly,
  verifiedOnly,
};
