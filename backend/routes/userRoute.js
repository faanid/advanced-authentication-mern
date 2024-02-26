const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  registerUser,
  loginUser,
  logoutUser,
  getUser,
  updateUser,
} = require("../controllers/userController");

router.post("/register", registerUser);
router.get("/login", loginUser);
router.get("logout", logoutUser);
router.get("/getUser", protect, getUser);
router.patch("/updateUser", protect, updateUser);

module.exports = router;
