const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const generateToken = (id, tokenVersion = 0) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET must be configured");
  }

  return jwt.sign({ id, tokenVersion }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  });
};

const hashToken = (token) => {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
};

module.exports = {
  generateToken,
  hashToken,
};
