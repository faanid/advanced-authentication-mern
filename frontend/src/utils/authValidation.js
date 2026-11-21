const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateEmail = (email) =>
  typeof email === "string" && EMAIL_PATTERN.test(email.trim());

export const sanitizeLoginCode = (value) =>
  String(value ?? "").replace(/\D/g, "").slice(0, 6);

export const isValidLoginCode = (value) => /^[0-9]{6}$/.test(String(value ?? ""));
