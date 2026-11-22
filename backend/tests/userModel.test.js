const test = require("node:test");
const assert = require("node:assert/strict");
const User = require("../models/userModel");

test("user schema requires a password without throwing from byte validation", async () => {
  const user = new User({
    name: "Missing Password",
    email: "missing-password@example.com",
  });

  await assert.rejects(user.validate(), (error) => {
    assert.ok(error.errors.password);
    return true;
  });
});

test("user schema rejects passwords exceeding 72 UTF-8 bytes", async () => {
  const user = new User({
    name: "Long Password",
    email: "long-password@example.com",
    password: "é".repeat(37),
  });

  await assert.rejects(user.validate(), (error) => {
    assert.ok(error.errors.password);
    return true;
  });
});

test("user schema accepts a password within the 72-byte limit", async () => {
  const user = new User({
    name: "Valid Password",
    email: "valid-password@example.com",
    password: "é".repeat(36),
  });

  await assert.doesNotReject(user.validate());
});
