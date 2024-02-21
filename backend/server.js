require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const userRoute = require("./routes/userRoute");
const errorHandler = require("./middleware/errorMiddleware");

//Initialized app
const app = express();

//Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(
  cors({
    origin: ["http://localhost:3000", "https://auth-app.vercel.app"], // reflecting the request header
    credentials: true,
  })
);

//Routes
app.use("/api/users", userRoute);

//Create a route
app.get("/", (req, res) => {
  res.send("Home Page");
});

//Error Handler
app.use(errorHandler);

//Create the port
const PORT = process.env.PORT || 5000;

//Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on ${PORT}`);
    });
  })
  .catch((err) => {
    console.log(err);
  });
