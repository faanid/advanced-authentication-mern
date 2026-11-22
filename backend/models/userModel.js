const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please add a name"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Please add an email"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        "Please enter a valid email",
      ],
    },
    password: {
      type: String,
      required: [true, "Please add a password"],
      minlength: [8, "Password must be at least 8 characters"],
      maxlength: [72, "Password must not exceed 72 characters"],
      select: false,
      validate: {
        validator: (value) =>
          typeof value === "string" && Buffer.byteLength(value, "utf8") <= 72,
        message: "Password must not exceed 72 UTF-8 bytes",
      },
    },
    photo: {
      type: String,
      default:
        "https://github.com/zinotrust/auth-app-styles/blob/master/assets/avatarr.png",
    },
    phone: {
      type: String,
      default: "+234",
      trim: true,
    },
    bio: {
      type: String,
      default: "",
      trim: true,
    },
    role: {
      type: String,
      enum: ["subscriber", "author", "admin", "suspended"],
      default: "subscriber",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    tokenVersion: {
      type: Number,
      default: 0,
      min: 0,
    },
    userAgent: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    minimize: false,
  }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

const User = mongoose.model("User", userSchema);

module.exports = User;
