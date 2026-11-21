const fs = require("fs/promises");
const path = require("path");
const Handlebars = require("handlebars");
const nodemailer = require("nodemailer");

const allowedTemplates = new Set([
  "changePassword",
  "changeRole",
  "forgotPassword",
  "loginCode",
  "test",
  "verifyEmail",
]);

const templateDirectory = path.resolve(__dirname, "../views");

const sendEmail = async (
  subject,
  sendTo,
  sentFrom,
  replyTo,
  template,
  name,
  link
) => {
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error("Email transport configuration is incomplete");
  }

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

  const port = Number(process.env.EMAIL_PORT) || 587;
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    ...(port === 587 ? { requireTLS: true } : {}),
  });

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
