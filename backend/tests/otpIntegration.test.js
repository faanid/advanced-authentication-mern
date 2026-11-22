const test = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const mongoose = require("mongoose");

const mongoUri = process.env.MONGO_URI;
const jwtSecret = process.env.JWT_SECRET;

if (!mongoUri || !jwtSecret) {
  test("OTP integration tests require MongoDB and JWT_SECRET", { skip: true }, () => {});
} else {
  process.env.EMAIL_USER = process.env.EMAIL_USER || "mailer@example.test";

  const sentCodes = [];
  const sendEmailPath = require.resolve("../utils/sendEmail");
  require(sendEmailPath);
  require.cache[sendEmailPath].exports = async (...args) => {
    if (args[4] === "loginCode") sentCodes.push(args[6]);
    return { messageId: "test-message" };
  };

  const User = require("../models/userModel");
  const Token = require("../models/tokenModel");
  const { app } = require("../server");

  let server;
  let baseUrl;

  const request = (path, options = {}) => {
    const headers = { "User-Agent": options.agent || "known-device" };
    if (options.body !== undefined) headers["Content-Type"] = "application/json";
    if (options.cookie) headers.Cookie = options.cookie;

    return fetch(baseUrl + path, {
      method: options.method || "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  };

  test.before(async () => {
    await mongoose.connect(mongoUri, { dbName: "advanced_auth_otp_test" });
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

  test("new-device login codes are verified and consumed once", async () => {
    const registration = await request("/api/users/register", {
      method: "POST",
      agent: "device-one",
      body: {
        name: "OTP Test",
        email: "otp-flow@example.test",
        password: "OtpPassword123",
      },
    });

    assert.equal(registration.status, 201);

    const newDeviceLogin = await request("/api/users/login", {
      method: "POST",
      agent: "device-two",
      body: {
        email: "otp-flow@example.test",
        password: "OtpPassword123",
      },
    });

    assert.equal(newDeviceLogin.status, 401);

    const codeRequest = await request("/api/users/sendLoginCode", {
      method: "POST",
      agent: "device-two",
      body: { email: "otp-flow@example.test" },
    });

    assert.equal(codeRequest.status, 200);
    assert.equal(sentCodes.length, 1);
    assert.match(sentCodes[0], /^[0-9]{6}$/);

    const login = await request("/api/users/loginWithCode", {
      method: "POST",
      agent: "device-two",
      body: {
        email: "otp-flow@example.test",
        loginCode: sentCodes[0],
      },
    });

    assert.equal(login.status, 200);

    const user = await User.findOne({ email: "otp-flow@example.test" });
    assert.ok(user.userAgent.includes("device-two"));
    assert.equal(
      await Token.countDocuments({ userId: user._id, purpose: "login_otp" }),
      0
    );

    const replay = await request("/api/users/loginWithCode", {
      method: "POST",
      agent: "device-two",
      body: {
        email: "otp-flow@example.test",
        loginCode: sentCodes[0],
      },
    });

    assert.equal(replay.status, 401);
  });
}
