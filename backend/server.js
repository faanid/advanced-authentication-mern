require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");

//Initialized app
const app = express();

//Create a route
app.get("/", (req, res) => {
  res.send("Home Page");
});

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
//test
