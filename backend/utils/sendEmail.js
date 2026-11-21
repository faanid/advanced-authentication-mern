const fs = require("fs/promises");
const path = require("path");
const Handlebars = require("handlebars");
const nodemailer = require("nodemailer");

const allowedTemplates = new Set([
  "changePassword",
  "changeRole",
  "forgotPassword",
  "loginCode",
  "verifyEmail",
]);

const templateDirectory = path.resolve(__dirname, "../views");

const getTransportOptions = (env = process.env) => {
  if (!env.EMAIL_HOST || !env.EMAIL_USER || !env.EMAIL_PASS) {
    throw new Error("Email transport configuration is incomplete");
  }

  const port = env.EMAIL_PORT === undefined || env.EMAIL_PORT === ""
    ? 587
    : Number(env.EMAIL_PORT);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("EMAIL_PORT must be a valid TCP port");
  }

  return {
    host: env.EMAIL_HOST,
    port,
    secure: port === 465,
    auth: {
      user: env.EMAIL_USER,
      pass: env.EMAIL_PASS,
    },
    ...(port === 465 ? {} : { requireTLS: true }),
  };
};

const sendEmail = async (
  subject,
  sendTo,
  sentFrom,
  replyTo,
  template,
  name,
  link
) => {
  if (!allowedTemplates.has(template)) {
    throw new Error("Unsupported email template");
  }

  if (!subject || !sendTo || !sentFrom || !replyTo) {
    throw new Error("Required email fields are missing");
  }

  const templatePath = path.join(templateDirectory, `${template}.handlebars`);
  const templateSource = await fs.readFile(templatePath, "utf8");
  const render = Handlebars.compile(templateSource);
  const html = render({ name, link });

  const transporter = nodemailer.createTransport(getTransportOptions());

  try {
    return await transporter.sendMail({
      from: sentFrom,
      to: sendTo,
      replyTo,
      subject,
      html,
    });
  } finally {
    transporter.close();
  }
};

module.exports = sendEmail;
module.exports.getTransportOptions = getTransportOptions;
