const test = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const mongoose = require("mongoose");

const mongoUri = process.env.MONGO_URI;
const jwtSecret = process.env.JWT_SECRET;

if (!mongoUri || !jwtSecret) {
  test("email flow integration tests require MongoDB and JWT_SECRET", { skip: true }, () => {});
} else {
  process.env.FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
  process.env.EMAIL_USER = process.env.EMAIL_USER || "mailer@example.test";

  const sentEmails = [];
  const sendEmailPath = require.resolve("../utils/sendEmail");
  require(sendEmailPath);
  require.cache[sendEmailPath].exports = async (...args) => {
    sentEmails.push(args);
    return { messageId: "test-message" };
  };

  const User = require("../models/userModel");
  const { app } = require("../server");

  let server;
  let baseUrl;

  const request = (path, options = {}) => {
    const headers = { "User-Agent": "email-flow-integration-test" };
    if (options.body !== undefined) headers["Content-Type"] = "application/json";
    if (options.cookie) headers.Cookie = options.cookie;

    return fetch(baseUrl + path, {
      method: options.method || "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  };

  const latestEmail = (template) =>
    sentEmails.findLast((email) => email[4] === template);

  test.before(async () => {
    await mongoose.connect(mongoUri, { dbName: "advanced_auth_email_test" });
    await mongoose.connection.db.dropDatabase();
    server = app.listen(0);
    await once(server, "listening");
    baseUrl = "http://127.0.0.1:" + server.address().port;
  });

  test.after(async () => {
    if (server) {
      await new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      );
    }
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  test("verification and password reset links are single-use", async () => {
    const registration = await request("/api/users/register", {
      method: "POST",
      body: {
        name: "Email Test",
        email: "email-flow@example.test",
        password: "InitialPassword123",
      },
    });

    assert.equal(registration.status, 201);
    const user = await registration.json();
    const cookie = registration.headers.get("set-cookie").split(";")[0];

    const verificationRequest = await request("/api/users/sendVerificationEmail", {
      method: "POST",
      cookie,
    });

    assert.equal(verificationRequest.status, 200);
    const verificationEmail = latestEmail("verifyEmail");
    const verificationToken = verificationEmail[6].split("/").pop();

    const verification = await request(
      "/api/users/verifyToken/" + verificationToken,
      { method: "PATCH" }
    );

    assert.equal(verification.status, 200);
    assert.equal((await User.findById(user._id)).isVerified, true);

    const unknownReset = await request("/api/users/forgotPassword", {
      method: "POST",
      body: { email: "missing@example.test" },
    });

    assert.equal(unknownReset.status, 200);

    const resetRequest = await request("/api/users/forgotPassword", {
      method: "POST",
      body: { email: "email-flow@example.test" },
    });

    assert.equal(resetRequest.status, 200);
    const resetEmail = latestEmail("forgotPassword");
    const resetToken = resetEmail[6].split("/").pop();

    const reset = await request("/api/users/resetPassword/" + resetToken, {
      method: "PATCH",
      body: { password: "UpdatedPassword456" },
    });

    assert.equal(reset.status, 200);

    const replay = await request("/api/users/resetPassword/" + resetToken, {
      method: "PATCH",
      body: { password: "AnotherPassword789" },
    });

    assert.equal(replay.status, 400);
  });
}
