const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const auth = require("../middleware/auth");

const router = express.Router();

function signToken(user) {
    return jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

// POST /api/auth/register
router.post("/register", async (req, res) => {
    try {
        const { name, email, password, interests } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: "name, email, password required" });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        }

        const hashed = await bcrypt.hash(password, 10);

        // role এখানে কখনো client থেকে নেওয়া হবে না, সবাই "user" হিসেবে শুরু করবে
        const user = await User.create({
            name,
            email,
            password: hashed,
            interests: Array.isArray(interests) ? interests : [],
        });

        res.status(201).json({
            token: signToken(user),
            user: { id: user._id, name: user.name, email: user.email, role: user.role },
        });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ message: "Email already registered" });
        }
        res.status(500).json({ message: "Server error" });
    }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "email and password required" });
        }

        // password field-এ select:false ছিল, তাই এখানে আলাদা করে চাইতে হবে
        const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
        const ok = user && (await bcrypt.compare(password, user.password));

        if (!ok) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        res.json({
            token: signToken(user),
            user: { id: user._id, name: user.name, email: user.email, role: user.role },
        });
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

// GET /api/auth/me (profile, token দিয়ে)
router.get("/me", auth, (req, res) => {
    res.json({ user: req.user });
});

module.exports = router;