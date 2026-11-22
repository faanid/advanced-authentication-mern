const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const getJwtExpiresInMs = (value = process.env.JWT_EXPIRES_IN || "1d") => {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error("JWT_EXPIRES_IN must be a positive duration");
    }

    return value * 1000;
  }

  const match = String(value)
    .trim()
    .match(/^([0-9]+(?:\.[0-9]+)?)\s*(ms|msec|millisecond|milliseconds|s|sec|second|seconds|m|min|minute|minutes|h|hr|hour|hours|d|day|days|w|week|weeks|y|year|years)?$/i);

  if (!match) {
    throw new Error("JWT_EXPIRES_IN must be a valid duration");
  }

  const amount = Number(match[1]);
  const unit = (match[2] || "ms").toLowerCase();
  const multipliers = {
    ms: 1,
    msec: 1,
    millisecond: 1,
    milliseconds: 1,
    s: 1000,
    sec: 1000,
    second: 1000,
    seconds: 1000,
    m: 60 * 1000,
    min: 60 * 1000,
    minute: 60 * 1000,
    minutes: 60 * 1000,
    h: 60 * 60 * 1000,
    hr: 60 * 60 * 1000,
    hour: 60 * 60 * 1000,
    hours: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
    days: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    weeks: 7 * 24 * 60 * 60 * 1000,
    y: 365.25 * 24 * 60 * 60 * 1000,
    year: 365.25 * 24 * 60 * 60 * 1000,
    years: 365.25 * 24 * 60 * 60 * 1000,
  };
  const duration = amount * multipliers[unit];

  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error("JWT_EXPIRES_IN must be a positive duration");
  }

  return Math.floor(duration);
};

const generateToken = (id, tokenVersion = 0) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET must be configured");
  }

  const expiresIn = process.env.JWT_EXPIRES_IN || "1d";
  getJwtExpiresInMs(expiresIn);

  return jwt.sign({ id, tokenVersion }, process.env.JWT_SECRET, {
    expiresIn,
  });
};

const hashToken = (token) => {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
};

module.exports = {
  generateToken,
  hashToken,
  getJwtExpiresInMs,
};
