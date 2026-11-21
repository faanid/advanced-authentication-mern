const test = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const express = require("express");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const {
  protect,
  adminOnly,
  authorOnly,
  verifiedOnly,
} = require("../middleware/authMiddleware");

const app = express();
app.use(cookieParser());

app.get("/protected", protect, (req, res) => {
  res.status(200).json({ userId: String(req.user._id) });
});

app.get("/admin", protect, adminOnly, (req, res) => {
  res.sendStatus(204);
});

app.get("/author", protect, authorOnly, (req, res) => {
  res.sendStatus(204);
});

app.get("/verified", protect, verifiedOnly, (req, res) => {
  res.sendStatus(204);
});

const secret = "middleware-test-secret-with-sufficient-entropy";
const originalSecret = process.env.JWT_SECRET;
const originalFindById = User.findById;

let server;
let baseUrl;
let mockUser;

const createSession = (tokenVersion = 0) =>
  jwt.sign(
    { id: "test-user-id", tokenVersion },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

const requestWithToken = (path, token) =>
  fetch(baseUrl + path, {
    headers: token ? { Cookie: `token=${token}` } : {},
  });

test.before(async () => {
  process.env.JWT_SECRET = secret;
  server = app.listen(0);
  await once(server, "listening");
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  User.findById = originalFindById;

  if (originalSecret === undefined) {
    delete process.env.JWT_SECRET;
  } else {
    process.env.JWT_SECRET = originalSecret;
  }

  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test.beforeEach(() => {
  mockUser = {
    _id: "test-user-id",
    role: "subscriber",
    isVerified: true,
    tokenVersion: 0,
  };

  User.findById = () => ({
    select: async () => mockUser,
  });
});

test("protect rejects requests without a session cookie", async () => {
  const response = await requestWithToken("/protected");

  assert.equal(response.status, 401);
  assert.equal((await response.json()).message, "Not authorized, please login");
});

test("protect rejects malformed JWTs", async () => {
  const response = await requestWithToken("/protected", "not-a-jwt");

  assert.equal(response.status, 401);
  assert.equal((await response.json()).message, "Invalid or expired session");
});

test("protect accepts a valid session and attaches the user", async () => {
  const response = await requestWithToken("/protected", createSession());

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { userId: "test-user-id" });
});

test("protect rejects sessions with an outdated token version", async () => {
  mockUser.tokenVersion = 2;
  const response = await requestWithToken("/protected", createSession(1));

  assert.equal(response.status, 401);
  assert.equal((await response.json()).message, "Session has been revoked");
});

test("protect rejects suspended accounts", async () => {
  mockUser.role = "suspended";
  const response = await requestWithToken("/protected", createSession());

  assert.equal(response.status, 403);
});

test("adminOnly rejects subscribers and accepts administrators", async () => {
  const token = createSession();
  const denied = await requestWithToken("/admin", token);

  assert.equal(denied.status, 403);

  mockUser.role = "admin";
  const allowed = await requestWithToken("/admin", token);

  assert.equal(allowed.status, 204);
});

test("authorOnly accepts authors and administrators", async () => {
  const token = createSession();
  const denied = await requestWithToken("/author", token);

  assert.equal(denied.status, 403);

  mockUser.role = "author";
  const authorResponse = await requestWithToken("/author", token);

  assert.equal(authorResponse.status, 204);

  mockUser.role = "admin";
  const adminResponse = await requestWithToken("/author", token);

  assert.equal(adminResponse.status, 204);
});

test("verifiedOnly rejects unverified accounts", async () => {
  mockUser.isVerified = false;
  const response = await requestWithToken("/verified", createSession());

  assert.equal(response.status, 403);
  assert.equal((await response.json()).message, "Account verification required");
});
