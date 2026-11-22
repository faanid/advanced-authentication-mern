const test = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/userModel");
const { generateToken } = require("../utils");
const { app } = require("../server");

const mongoUri = process.env.MONGO_URI;
const jwtSecret = process.env.JWT_SECRET;
const userAgent = "advanced-auth-integration-test";

let server;
let baseUrl;

const request = (path, options = {}) => {
  const {
    method = "GET",
    body,
    cookie,
    agent = userAgent,
  } = options;

  const headers = {
    "User-Agent": agent,
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (cookie) {
    headers.Cookie = cookie;
  }

  return fetch(baseUrl + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
};

const getSessionCookie = (response) => {
  const value = response.headers.get("set-cookie");

  assert.ok(value, "Expected the API to set an authentication cookie");

  return value.split(";")[0];
};

if (!mongoUri || !jwtSecret) {
  test("MongoDB authentication integration tests require MONGO_URI and JWT_SECRET", {
    skip: true,
  }, () => {});
} else {
  test.before(async () => {
    await mongoose.connect(mongoUri);
    await mongoose.connection.db.dropDatabase();

    server = app.listen(0);
    await once(server, "listening");
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  test.after(async () => {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }

    await mongoose.disconnect();
  });

  test("registration, authentication, profile updates, logout, and password changes work with MongoDB", async () => {
    const shortPasswordRegistration = await request("/api/users/register", {
      method: "POST",
      body: {
        name: "Short Password",
        email: "short-password@example.com",
        password: "Short7!",
      },
    });

    assert.equal(shortPasswordRegistration.status, 400);

    const oversizedPasswordRegistration = await request("/api/users/register", {
      method: "POST",
      body: {
        name: "Oversized Password",
        email: "oversized-password@example.com",
        password: "a".repeat(73),
      },
    });

    assert.equal(oversizedPasswordRegistration.status, 400);

    const registration = await request("/api/users/register", {
      method: "POST",
      body: {
        name: "Integration User",
        email: "  Integration.User@Example.COM  ",
        password: "InitialPassword123",
      },
    });

    assert.equal(registration.status, 201);

    const registeredUser = await registration.json();
    const firstCookie = getSessionCookie(registration);

    assert.equal(registeredUser.email, "integration.user@example.com");
    assert.equal(registeredUser.role, "subscriber");
    assert.equal(registeredUser.isVerified, false);
    assert.equal("password" in registeredUser, false);

    const userWithoutPassword = await User.findById(registeredUser._id);
    assert.equal(userWithoutPassword.password, undefined);

    let storedUser = await User.findById(registeredUser._id).select("+password");

    assert.ok(storedUser);
    assert.notEqual(storedUser.password, "InitialPassword123");
    assert.equal(
      await bcrypt.compare("InitialPassword123", storedUser.password),
      true
    );
    assert.ok(storedUser.createdAt instanceof Date);
    assert.ok(storedUser.userAgent.includes(userAgent));

    const currentSession = await request("/api/users/loginStatus", {
      cookie: firstCookie,
    });

    assert.equal(currentSession.status, 200);
    assert.equal(await currentSession.json(), true);

    const profile = await request("/api/users/getUser", {
      cookie: firstCookie,
    });

    assert.equal(profile.status, 200);
    assert.equal((await profile.json()).email, "integration.user@example.com");

    const profileUpdate = await request("/api/users/updateUser", {
      method: "PATCH",
      cookie: firstCookie,
      body: {
        name: "Updated Integration User",
        bio: "Updated through the authenticated API",
        email: "attacker@example.com",
        role: "admin",
      },
    });

    assert.equal(profileUpdate.status, 200);

    const updatedProfile = await profileUpdate.json();

    assert.equal(updatedProfile.name, "Updated Integration User");
    assert.equal(updatedProfile.bio, "Updated through the authenticated API");
    assert.equal(updatedProfile.email, "integration.user@example.com");
    assert.equal(updatedProfile.role, "subscriber");
    assert.equal("password" in updatedProfile, false);

    const deniedAdminList = await request("/api/users/getUsers", {
      cookie: firstCookie,
    });

    assert.equal(deniedAdminList.status, 403);

    const admin = await User.create({
      name: "Integration Admin",
      email: "integration-admin@example.com",
      password: "AdminPassword123",
      role: "admin",
      isVerified: true,
      userAgent: [userAgent],
    });
    const adminCookie = `token=${generateToken(admin._id, admin.tokenVersion)}`;
    const adminUserList = await request("/api/users/getUsers", {
      cookie: adminCookie,
    });

    assert.equal(adminUserList.status, 200);

    const listedUsers = await adminUserList.json();

    assert.equal(listedUsers.length, 2);
    assert.equal(listedUsers.some((user) => "password" in user), false);
    assert.equal(listedUsers.some((user) => "userAgent" in user), false);

    const oversizedLogin = await request("/api/users/login", {
      method: "POST",
      body: {
        email: "integration.user@example.com",
        password: "a".repeat(73),
      },
    });

    assert.equal(oversizedLogin.status, 400);

    const newDeviceLogin = await request("/api/users/login", {
      method: "POST",
      agent: "unrecognized-browser",
      body: {
        email: "integration.user@example.com",
        password: "InitialPassword123",
      },
    });

    assert.equal(newDeviceLogin.status, 401);
    assert.equal(
      (await newDeviceLogin.json()).message,
      "New browser or device detected"
    );

    const login = await request("/api/users/login", {
      method: "POST",
      body: {
        email: "integration.user@example.com",
        password: "InitialPassword123",
      },
    });

    assert.equal(login.status, 200);
    const loginCookie = getSessionCookie(login);

    const logout = await request("/api/users/logout", {
      method: "POST",
      cookie: loginCookie,
    });

    assert.equal(logout.status, 200);

    const revokedSession = await request("/api/users/loginStatus", {
      cookie: loginCookie,
    });

    assert.equal(revokedSession.status, 200);
    assert.equal(await revokedSession.json(), false);

    const protectedAfterLogout = await request("/api/users/getUser", {
      cookie: loginCookie,
    });

    assert.equal(protectedAfterLogout.status, 401);

    const loginAfterLogout = await request("/api/users/login", {
      method: "POST",
      body: {
        email: "integration.user@example.com",
        password: "InitialPassword123",
      },
    });

    assert.equal(loginAfterLogout.status, 200);
    const passwordChangeCookie = getSessionCookie(loginAfterLogout);

    const passwordChange = await request("/api/users/changePassword", {
      method: "PATCH",
      cookie: passwordChangeCookie,
      body: {
        oldPassword: "InitialPassword123",
        password: "UpdatedPassword456",
      },
    });

    assert.equal(passwordChange.status, 200);

    storedUser = await User.findById(registeredUser._id).select("+password");

    assert.equal(
      await bcrypt.compare("UpdatedPassword456", storedUser.password),
      true
    );
    assert.equal(storedUser.tokenVersion, 2);

    const oldPasswordLogin = await request("/api/users/login", {
      method: "POST",
      body: {
        email: "integration.user@example.com",
        password: "InitialPassword123",
      },
    });

    assert.equal(oldPasswordLogin.status, 401);

    const newPasswordLogin = await request("/api/users/login", {
      method: "POST",
      body: {
        email: "integration.user@example.com",
        password: "UpdatedPassword456",
      },
    });

    assert.equal(newPasswordLogin.status, 200);
  });
}
