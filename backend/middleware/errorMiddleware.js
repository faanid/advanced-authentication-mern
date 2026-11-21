const errorHandler = (error, req, res, next) => {
  let statusCode =
    error.statusCode ||
    (res.statusCode !== 200 ? res.statusCode : 500);
  let message = error.message || "Internal server error";

  if (error.code === 11000) {
    statusCode = 409;
    message = "A record with this value already exists";
  } else if (error.name === "ValidationError" || error.name === "CastError") {
    statusCode = 400;
  } else if (error.type === "entity.too.large") {
    statusCode = 413;
    message = "Request body is too large";
  }

  const response = { message };

  if (process.env.NODE_ENV === "development") {
    response.stack = error.stack;
  }

  return res.status(statusCode).json(response);
};

module.exports = errorHandler;
