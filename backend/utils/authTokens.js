const crypto = require("crypto");

const generateLoginCode = () =>
  crypto.randomInt(100000, 1000000).toString();

const hashLoginCode = (code, secret = process.env.JWT_SECRET) => {
  if (!secret) {
    throw new Error("JWT_SECRET must be configured");
  }

  return crypto
    .createHmac("sha256", secret)
    .update(String(code))
    .digest("hex");
};

const verifyLoginCode = (code, storedHash, secret = process.env.JWT_SECRET) => {
  if (!/^[0-9]{6}$/.test(String(code))) {
    return false;
  }

  if (!/^[a-f0-9]{64}$/i.test(String(storedHash))) {
    return false;
  }

  const expectedHash = Buffer.from(storedHash, "hex");
  const receivedHash = Buffer.from(hashLoginCode(code, secret), "hex");

  return (
    expectedHash.length === receivedHash.length &&
    crypto.timingSafeEqual(expectedHash, receivedHash)
  );
};

module.exports = {
  generateLoginCode,
  hashLoginCode,
  verifyLoginCode,
};
