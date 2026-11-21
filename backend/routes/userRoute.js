const express = require("express");
const router = express.Router();
const { protect, adminOnly } = require("../middleware/authMiddleware");
const {
  registrationLimiter,
  loginLimiter,
  passwordResetLimiter,
  otpLimiter,
  verificationEmailLimiter,
} = require("../middleware/rateLimiters");
const {
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
} = require("../controllers/userController");

router.post("/register", registrationLimiter, registerUser);
router.post("/login", loginLimiter, loginUser);
router.post("/logout", logoutUser);
router.get("/getUser", protect, getUser);
router.patch("/updateUser", protect, updateUser);

router.delete("/:id", protect, adminOnly, deleteUser);
router.get("/getUsers", protect, adminOnly, getUsers);
router.get("/loginStatus", loginStatus);
router.post("/upgradeUser", protect, adminOnly, upgradeUser);
router.post("/sendAutomatedEmail", protect, adminOnly, sendAutomatedEmail);

router.post("/sendVerificationEmail", protect, verificationEmailLimiter, sendVerificationEmail);
router.patch("/verifyToken/:verificationToken", verifyToken);
router.post("/forgotPassword", passwordResetLimiter, forgotPassword);
router.patch("/resetPassword/:resetToken", resetPassword);
router.patch("/changePassword", protect, changePassword);

router.post("/sendLoginCode", otpLimiter, sendLoginCode);
router.post("/loginWithCode", otpLimiter, loginWithCode);

router.post("/google/callback", loginLimiter, loginWithGoogle);

module.exports = router;
