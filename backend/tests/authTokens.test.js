const test = require("node:test");
const assert = require("node:assert/strict");
const {
  generateLoginCode,
  hashLoginCode,
  verifyLoginCode,
} = require("../utils/authTokens");

test("generateLoginCode returns a six-digit numeric code", () => {
  for (let index = 0; index < 100; index += 1) {
    assert.match(generateLoginCode(), /^[0-9]{6}$/);
  }
});

test("hashLoginCode produces a keyed SHA-256 digest", () => {
  const secret = "test-secret-with-enough-entropy-for-unit-tests";
  const digest = hashLoginCode("123456", secret);

  assert.match(digest, /^[a-f0-9]{64}$/);
  assert.notEqual(digest, "123456");
  assert.equal(digest, hashLoginCode("123456", secret));
  assert.notEqual(digest, hashLoginCode("123456", "a-different-secret"));
});

test("verifyLoginCode compares valid codes and rejects invalid input", () => {
  const secret = "test-secret-with-enough-entropy-for-unit-tests";
  const digest = hashLoginCode("123456", secret);

  assert.equal(verifyLoginCode("123456", digest, secret), true);
  assert.equal(verifyLoginCode("123457", digest, secret), false);
  assert.equal(verifyLoginCode("12345", digest, secret), false);
  assert.equal(verifyLoginCode("abcdef", digest, secret), false);
  assert.equal(verifyLoginCode("123456", "invalid-hash", secret), false);
});

test("hashLoginCode fails when JWT_SECRET is missing", () => {
  assert.throws(() => hashLoginCode("123456", ""), {
    message: "JWT_SECRET must be configured",
  });
});
