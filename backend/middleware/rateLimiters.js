const { rateLimit } = require("express-rate-limit");

const createLimiter = (windowMs, limit, message) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json({ message }),
  });

const registrationLimiter = createLimiter(
  15 * 60 * 1000,
  5,
  "Too many registration attempts. Please try again later."
);

const loginLimiter = createLimiter(
  15 * 60 * 1000,
  10,
  "Too many login attempts. Please try again later."
);

const passwordResetLimiter = createLimiter(
  60 * 60 * 1000,
  5,
  "Too many password reset requests. Please try again later."
);

const otpLimiter = createLimiter(
  15 * 60 * 1000,
  8,
  "Too many verification code requests. Please try again later."
);

const verificationEmailLimiter = createLimiter(
  60 * 60 * 1000,
  3,
  "Too many verification email requests. Please try again later."
);

module.exports = {
  registrationLimiter,
  loginLimiter,
  passwordResetLimiter,
  otpLimiter,
  verificationEmailLimiter,
};
