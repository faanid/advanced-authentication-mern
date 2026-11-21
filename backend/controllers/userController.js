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
  const token = generateToken(user._id);

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
  const token = generateToken(user._id);

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

  const token = generateToken(user._id);
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
    res.status(400);
    throw new Error("User already verified");
  }

  // Delete Token if it's exists in DB
  let token = await Token.findOne({ userId: user._id });
  if (token) {
    await token.deleteOne();
  }

  // Create verification Token and Save in DB
  const verificationToken = crypto.randomBytes(32).toString("hex") + user._id;

  // Hash token and save
  const hashedToken = hashToken(verificationToken);
  await new Token({
    userId: user._id,
    vToken: hashedToken, //verify token
    createdAt: Date.now(),
    expiresAt: Date.now() + 30 * (60 * 1000), // 60 mins
  }).save();

  // Construct Verification URL
  const verificationUrl = `${
    (process.env, FRONTEND_URL)
  }/verify/${verificationToken}`;

  // Send Email
  const subject = "Verify Your Account - AUTH:F";
  const send_to = user.email;
  const sent_from = process.env.EMAIL_USER;
  const reply_to = "noreply@fti.com";
  const template = "verifyEmail";
  const name = user.name;
  const link = verificationUrl;

  try {
    await sendEmail(
      subject,
      send_to,
      sent_from,
      reply_to,
      template,
      name,
      link
    );
    res.status(200).json({ message: "Verification Email Sent" });
  } catch (error) {
    res.status(500);
    throw new Error("Email not send, please try again.");
  }
});

// Verify User
const verifyToken = asyncHandler(async (req, res) => {
  const { verificationToken } = req.params;

  const hashedToken = hashToken(verificationToken);

  const userToken = await Token.findOne({
    vToken: hashedToken,
    expiresAt: { $gt: Date.now() },
  });

  if (!userToken) {
    res.status(404);
    throw new Error("Invalid or Expired Token");
  }

  // Find User
  const user = await User.findOne({ _id: userToken.userId });

  if (user.isVerified) {
    res.status(400);
    throw new Error("User is already verified!");
  }

  // Now verify user
  user.isVerified = true;
  await user.save();
  res.status(200).json({ message: "Account Verification Successful" });
});

/// Logout User
const logoutUser = asyncHandler(async (req, res) => {
  clearAuthCookie(res);
  return res.status(200).json({ message: "Logout successful" });
});

const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const { name, phone, bio, photo } = req.body;

  if (name !== undefined) user.name = String(name).trim();
  if (phone !== undefined) user.phone = String(phone).trim();
  if (bio !== undefined) user.bio = String(bio).trim();
  if (photo !== undefined) user.photo = String(photo).trim();

  const updatedUser = await user.save();

  return res.status(200).json({
    _id: updatedUser._id,
    name: updatedUser.name,
    email: updatedUser.email,
    phone: updatedUser.phone,
    bio: updatedUser.bio,
    photo: updatedUser.photo,
    role: updatedUser.role,
    isVerified: updatedUser.isVerified,
  });
});

const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  await Promise.all([
    User.deleteOne({ _id: user._id }),
    Token.deleteMany({ userId: user._id }),
  ]);

  return res.status(200).json({ message: "User deleted successfully" });
});

const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find().sort("-createdAt").select("-password");
  if (!users) {
    res.status(400);
    throw new Error("Something went wrong");
  }
  res.status(200).json(users);
});

// Get Login Status
const loginStatus = asyncHandler(async (req, res) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(200).json(false);
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    const userExists = await User.exists({
      _id: verified.id,
      role: { $ne: "suspended" },
    });

    return res.status(200).json(Boolean(userExists));
  } catch (error) {
    if (
      ["JsonWebTokenError", "TokenExpiredError", "NotBeforeError"].includes(
        error.name
      )
    ) {
      return res.status(200).json(false);
    }

    throw error;
  }
});

const upgradeUser = asyncHandler(async (req, res) => {
  const { role, id } = req.body;
  const allowedRoles = ["subscriber", "author", "admin", "suspended"];

  if (!id || !allowedRoles.includes(role)) {
    res.status(400);
    throw new Error("A valid user ID and role are required");
  }

  const user = await User.findById(id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  user.role = role;
  await user.save();

  return res.status(200).json({
    message: "User role updated successfully",
    userId: user._id,
    role: user.role,
  });
});

const sendAutomatedEmail = asyncHandler(async (req, res) => {
  const { id, role } = req.body;
  const allowedRoles = ["subscriber", "author", "admin", "suspended"];

  if (!id || !allowedRoles.includes(role)) {
    res.status(400);
    throw new Error("A valid user ID and role are required");
  }

  const user = await User.findById(id);

  if (!user || user.role !== role) {
    res.status(404);
    throw new Error("Updated user not found");
  }

  if (!process.env.FRONTEND_URL) {
    throw new Error("FRONTEND_URL must be configured");
  }

  await sendEmail(
    "Your account role was updated",
    user.email,
    process.env.EMAIL_USER,
    process.env.EMAIL_REPLY_TO || process.env.EMAIL_USER,
    "changeRole",
    user.name,
    `${process.env.FRONTEND_URL.replace(/\/+$/, "")}/login`
  );

  return res.status(200).json({ message: "Role notification email sent" });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    res.status(404);
    throw new Error("No user with this email!");
  }
  // Delete Token if it's exists in DB
  let token = await Token.findOne({ userId: user._id });
  if (token) {
    await token.deleteOne();
  }

  // Create verification Token and Save in DB
  const resetToken = crypto.randomBytes(32).toString("hex") + user._id;
  console.log(resetToken);

  // Hash token and save
  const hashedToken = hashToken(resetToken);
  await new Token({
    userId: user._id,
    rToken: hashedToken, //reset token
    createdAt: Date.now(),
    expiresAt: Date.now() + 30 * (60 * 1000), // 60 mins
  }).save();

  // Construct Reset URL
  const resetUrl = `${(process.env, FRONTEND_URL)}/resetPassword/${resetToken}`;

  // Send Email
  const subject = "Password Reset Request - AUTH:F";
  const send_to = user.email;
  const sent_from = process.env.EMAIL_USER;
  const reply_to = "noreply@fti.com";
  const template = "forgotPassword";
  const name = user.name;
  const link = resetUrl;

  try {
    await sendEmail(
      subject,
      send_to,
      sent_from,
      reply_to,
      template,
      name,
      link
    );
    res.status(200).json({ message: "Password Reset Email Sent" });
  } catch (error) {
    res.status(500);
    throw new Error("Email not send, please try again.");
  }
});

// Reset Password
const resetPassword = asyncHandler(async (req, res) => {
  const { resetToken } = req.params;
  const { password } = req.body;
  console.log(resetToken);
  console.log("Password received for reset.");

  const hashedToken = hashToken(resetToken);

  const userToken = await Token.findOne({
    rToken: hashedToken,
    expiresAt: { $gt: Date.now() },
  });

  if (!userToken) {
    res.status(404);
    throw new Error("Invalid or Expired Token");
  }

  // Find User
  const user = await User.findOne({ _id: userToken.userId });

  // Now Reset password
  user.password = password;
  await user.save();

  res.status(200).json({ message: "Password Reset Successful, please login" });
});

// Change Password
const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, password } = req.body;
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error("User not found!");
  }

  if (!oldPassword || !password) {
    res.status(404);
    throw new Error("Please enter old and new password");
  }

  // Check if old password is correct
  const passwordIsCorrect = await bcrypt.compare(oldPassword, user.password);

  // Save new password
  if (user && passwordIsCorrect) {
    user.password = password;
    await user.save();

    res
      .status(200)
      .json({ message: "Password changed successfully! Please re-login" });
  } else {
    res.status(400);
    throw new Error("Old Password is incorrect");
  }
});

// Login with Google
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

  const token = generateToken(user._id);
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
