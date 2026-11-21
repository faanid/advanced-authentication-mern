require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const userRoute = require("./routes/userRoute");
const errorHandler = require("./middleware/errorMiddleware");

const app = express();

const normalizeOrigin = (value) => {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

const configuredOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || "")
  .split(",")
  .map((origin) => normalizeOrigin(origin.trim()))
  .filter(Boolean);

const developmentOrigins =
  process.env.NODE_ENV === "production"
    ? []
    : ["http://localhost:3000", "http://127.0.0.1:3000"];

const allowedOrigins = new Set([...developmentOrigins, ...configuredOrigins]);

app.disable("x-powered-by");
app.set("trust proxy", process.env.TRUST_PROXY === "true" ? 1 : false);

app.use(helmet());

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      return callback(null, allowedOrigins.has(normalizeOrigin(origin)));
    },
    credentials: true,
  })
);

app.use((req, res, next) => {
  const unsafeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
  const origin = req.get("origin");

  if (unsafeMethods.has(req.method) && origin && !allowedOrigins.has(normalizeOrigin(origin))) {
    return res.status(403).json({ message: "Request origin is not allowed" });
  }

  return next();
});

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: false, limit: "10kb" }));
app.use(cookieParser());

app.get("/", (req, res) => {
  res.status(200).json({ message: "Authentication API is running" });
});

app.use("/api/users", userRoute);
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});
app.use(errorHandler);

const startServer = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI must be configured");
  }

  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET must be configured");
  }

  const port = Number(process.env.PORT) || 5000;

  await mongoose.connect(process.env.MONGO_URI);

  const server = app.listen(port, () => {
    process.stdout.write(`Server listening on port ${port}\n`);
  });

  const shutdown = () => {
    server.close(async () => {
      await mongoose.connection.close();
      process.exit(0);
    });
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);

  return server;
};

if (require.main === module) {
  startServer().catch((error) => {
    process.stderr.write(`Server startup failed: ${error.message}\n`);
    process.exit(1);
  });
}

module.exports = {
  app,
  startServer,
};
