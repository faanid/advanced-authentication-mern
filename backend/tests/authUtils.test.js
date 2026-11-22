const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");
const { generateToken, hashToken, getJwtExpiresInMs } = require("../utils");

test("generateToken signs the user ID and token version", () => {
  const previousSecret = process.env.JWT_SECRET;
  const previousExpiry = process.env.JWT_EXPIRES_IN;

  process.env.JWT_SECRET = "test-secret-with-enough-entropy-for-unit-tests";
  process.env.JWT_EXPIRES_IN = "1h";

  try {
    const token = generateToken("user-123", 4);
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    assert.equal(payload.id, "user-123");
    assert.equal(payload.tokenVersion, 4);
    assert.ok(payload.exp > payload.iat);
  } finally {
    if (previousSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = previousSecret;
    }

    if (previousExpiry === undefined) {
      delete process.env.JWT_EXPIRES_IN;
    } else {
      process.env.JWT_EXPIRES_IN = previousExpiry;
    }
  }
});

test("generateToken uses token version zero by default", () => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "test-secret-with-enough-entropy-for-unit-tests";

  try {
    const token = generateToken("user-456");
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    assert.equal(payload.tokenVersion, 0);
  } finally {
    if (previousSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = previousSecret;
    }
  }
});

test("generateToken fails when JWT_SECRET is missing", () => {
  const previousSecret = process.env.JWT_SECRET;
  delete process.env.JWT_SECRET;

  try {
    assert.throws(() => generateToken("user-789"), {
      message: "JWT_SECRET must be configured",
    });
  } finally {
    if (previousSecret !== undefined) {
      process.env.JWT_SECRET = previousSecret;
    }
  }
});

test("hashToken returns a deterministic SHA-256 digest", () => {
  const value = "a-high-entropy-reset-token";
  const expected = crypto.createHash("sha256").update(value).digest("hex");

  assert.equal(hashToken(value), expected);
  assert.equal(hashToken(value), hashToken(value));
  assert.notEqual(hashToken(value), value);
  assert.match(hashToken(value), /^[a-f0-9]{64}$/);
});

test("getJwtExpiresInMs supports the same common durations as JWT expiry", () => {
  assert.equal(getJwtExpiresInMs("1h"), 60 * 60 * 1000);
  assert.equal(getJwtExpiresInMs("2 days"), 2 * 24 * 60 * 60 * 1000);
  assert.equal(getJwtExpiresInMs("500"), 500);
  assert.equal(getJwtExpiresInMs(60), 60 * 1000);
});

test("getJwtExpiresInMs rejects invalid or non-positive durations", () => {
  assert.throws(() => getJwtExpiresInMs("invalid"), {
    message: "JWT_EXPIRES_IN must be a valid duration",
  });
  assert.throws(() => getJwtExpiresInMs("0s"), {
    message: "JWT_EXPIRES_IN must be a positive duration",
  });
});
