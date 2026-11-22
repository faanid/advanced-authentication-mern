const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");

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

module.exports = {
  getUser,
  updateUser,
};
