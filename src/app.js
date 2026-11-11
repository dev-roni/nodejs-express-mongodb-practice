const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth");

const app = express();

app.use(cors());
app.use(express.json()); // JSON body পড়ার জন্য
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
    res.json({ message: "API is running" });
});

module.exports = app;