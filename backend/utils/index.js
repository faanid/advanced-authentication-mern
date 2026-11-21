const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const generateToken = (id) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET must be configured");
  }

  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  });
};

// Hash one-time tokens before storing them in the database.
const hashToken = (token) => {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
};

module.exports = {
  generateToken,
  hashToken,
};
