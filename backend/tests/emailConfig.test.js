const test = require("node:test");
const assert = require("node:assert/strict");
const { getTransportOptions } = require("../utils/sendEmail");

const baseConfig = {
  EMAIL_HOST: "smtp.example.test",
  EMAIL_USER: "mailer@example.test",
  EMAIL_PASS: "test-password",
};

test("SMTP defaults to STARTTLS on port 587", () => {
  const options = getTransportOptions(baseConfig);

  assert.equal(options.host, baseConfig.EMAIL_HOST);
  assert.equal(options.port, 587);
  assert.equal(options.secure, false);
  assert.equal(options.requireTLS, true);
  assert.deepEqual(options.auth, {
    user: baseConfig.EMAIL_USER,
    pass: baseConfig.EMAIL_PASS,
  });
});

test("SMTP uses implicit TLS on port 465", () => {
  const options = getTransportOptions({
    ...baseConfig,
    EMAIL_PORT: "465",
  });

  assert.equal(options.port, 465);
  assert.equal(options.secure, true);
  assert.equal("requireTLS" in options, false);
});

test("SMTP rejects invalid port values", () => {
  assert.throws(
    () => getTransportOptions({ ...baseConfig, EMAIL_PORT: "70000" }),
    { message: "EMAIL_PORT must be a valid TCP port" }
  );
});

test("SMTP requires complete credentials", () => {
  assert.throws(
    () => getTransportOptions({ EMAIL_HOST: baseConfig.EMAIL_HOST }),
    { message: "Email transport configuration is incomplete" }
  );
});
