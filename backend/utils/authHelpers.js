const Token = require("../models/tokenModel");

const isValidPassword = (password) =>
  typeof password === "string" &&
  password.length >= 8 &&
  Buffer.byteLength(password, "utf8") <= 72;

const isWithinBcryptLimit = (password) =>
  typeof password === "string" &&
  password.length > 0 &&
  Buffer.byteLength(password, "utf8") <= 72;

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

const buildFrontendUrl = (path) => {
  if (!process.env.FRONTEND_URL) {
    throw new Error("FRONTEND_URL must be configured");
  }

  return process.env.FRONTEND_URL.replace(/\/+$/, "") + path;
};

const issueOneTimeToken = async ({
  userId,
  purpose,
  tokenField,
  tokenHash,
  expiresInMs,
  cooldownMs = 60 * 1000,
}) => {
  const now = new Date();
  const cooldownBoundary = new Date(now.getTime() - cooldownMs);

  try {
    return await Token.findOneAndUpdate(
      {
        userId,
        purpose,
        $or: [
          { createdAt: { $lte: cooldownBoundary } },
          { createdAt: { $exists: false } },
        ],
      },
      {
        $set: {
          [tokenField]: tokenHash,
          attempts: 0,
          createdAt: now,
          expiresAt: new Date(now.getTime() + expiresInMs),
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );
  } catch (error) {
    if (error.code === 11000) {
      return null;
    }

    throw error;
  }
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

module.exports = {
  isValidPassword,
  isWithinBcryptLimit,
  setAuthCookie,
  buildFrontendUrl,
  issueOneTimeToken,
  clearAuthCookie,
};
