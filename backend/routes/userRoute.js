const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  registerUser,
  loginUser,
  logoutUser,
  getUser,
} = require("../controllers/userController");

router.post("/register", registerUser);
router.get("/login", loginUser);
router.get("logout", logoutUser);
router.get("/getUser", protect, getUser);

module.exports = router;
