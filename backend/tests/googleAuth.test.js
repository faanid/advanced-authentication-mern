const test = require("node:test");
const assert = require("node:assert/strict");
const { OAuth2Client } = require("google-auth-library");

test("Google OAuth client exposes ID token verification", () => {
  const client = new OAuth2Client("test-client-id");

  assert.equal(typeof client.verifyIdToken, "function");
});
