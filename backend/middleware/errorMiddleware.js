const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode ? res.statusCode : 500;

  res.status(statusCode);

  res.json({
    message: err.message,
    //stack means : where is your error coming from ,
    //and what file and what length number is your error coming from
    stack: process.env.NODE_ENV === "development" ? err.stack : null,
  });
};
module.exports = errorHandler;
