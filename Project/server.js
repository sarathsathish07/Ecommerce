const express = require("express");
const app = express();
require("dotenv").config();
const mongoose = require("mongoose");
const path = require("path");
const session = require("express-session");
const nocache = require("nocache");


app.use(nocache());

const { v4: uuidv4 } = require("uuid");

//port configuration
const port = process.env.PORT || 5000;

//connecting database
const db = mongoose.connect(process.env.DB_URI);
db.then(() => {
  console.log("Database connected");
}).catch(() => {
  console.log("Error in connecting to database");
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//setting view engine
app.set("view engine", "ejs");

// miidleware to serve static files
app.use("/temp", express.static("temp"));
app.use("/static", express.static(path.join(__dirname, "public")));

//middleware to handle session
app.use(
  session({
    secret: uuidv4(),
    resave: false,
    saveUninitialized: true,
  })
);

app.use((req, res, next) => {
  res.locals.message = req.session.message;
  delete req.session.message;
  next();
});

app.use("/", require("./routes/userRoutes"));
app.use("/", require("./routes/adminRoutes"));

// middleware for handling  errors
app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  res.status(err.status || 500);
  console.log(err);
  res.render("error");
});

app.listen(port, () => {
  console.log("Listening to server http://localhost:5000");
});
