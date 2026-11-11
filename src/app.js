const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const noteRoutes = require("./routes/notes");

const app = express();

app.use(cors());
app.use(express.json()); // JSON body পড়ার জন্য
app.use("/api/auth", authRoutes);
app.use("/api/notes", noteRoutes);

app.get("/", (req, res) => {
    res.json({ message: "API is running" });
});

module.exports = app;