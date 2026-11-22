const test = require("node:test");
const assert = require("node:assert/strict");
const {
  rememberUserAgent,
  setAuthCookie,
} = require("../utils/authHelpers");

test("rememberUserAgent avoids duplicates and records new devices", () => {
  const user = { userAgent: ["browser-one"] };

  assert.equal(rememberUserAgent(user, "browser-one"), false);
  assert.equal(rememberUserAgent(user, "browser-two"), true);
  assert.deepEqual(user.userAgent, ["browser-one", "browser-two"]);
});

test("rememberUserAgent retains only the ten most recent device identifiers", () => {
  const user = {
    userAgent: Array.from({ length: 10 }, (_, index) => `browser-${index}`),
  };

  assert.equal(rememberUserAgent(user, "browser-new"), true);
  assert.equal(user.userAgent.length, 10);
  assert.equal(user.userAgent[0], "browser-1");
  assert.equal(user.userAgent[9], "browser-new");
});

test("setAuthCookie uses the configured JWT lifetime", () => {
  const previousExpiry = process.env.JWT_EXPIRES_IN;
  const previousEnvironment = process.env.NODE_ENV;
  let cookieOptions;

  process.env.JWT_EXPIRES_IN = "2h";
  process.env.NODE_ENV = "test";

  try {
    setAuthCookie(
      {
        cookie(name, value, options) {
          cookieOptions = { name, value, options };
        },
      },
      "test-token"
    );

    assert.equal(cookieOptions.name, "token");
    assert.equal(cookieOptions.options.maxAge, 2 * 60 * 60 * 1000);
    assert.equal(cookieOptions.options.httpOnly, true);
  } finally {
    if (previousExpiry === undefined) {
      delete process.env.JWT_EXPIRES_IN;
    } else {
      process.env.JWT_EXPIRES_IN = previousExpiry;
    }

    if (previousEnvironment === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousEnvironment;
    }
  }
});
