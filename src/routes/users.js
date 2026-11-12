const express = require("express");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const User = require("../models/User");
const Note = require("../models/Note");
const Post = require("../models/Post");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/role");
const { getPagination, buildMeta } = require("../utils/pagination");

const router = express.Router();

// এই file-এর সব route-এ login + admin লাগবে
router.use(auth, requireRole("admin"));

function checkId(req, res, next) {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ message: "Invalid id" });
    }
    next();
}

// GET /api/users: সব user list (pagination সহ)
// index: { createdAt: -1 }
router.get("/", async (req, res) => {
    try {
        const { page, limit, skip } = getPagination(req.query);

        const [users, total] = await Promise.all([
            User.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
            User.estimatedDocumentCount(),
        ]);

        res.json({ data: users, ...buildMeta(page, limit, total) });
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

// GET /api/users/grouped/interests: Scenario 2... না, Scenario 1: interest অনুযায়ী users
// একটাই User.aggregate() call, আর কোনো find/count নেই
router.get("/grouped/interests", async (req, res) => {
    try {
        const { page, limit, skip } = getPagination(req.query);

        const groups = await User.aggregate([
            { $unwind: "$interests" },
            {
                $group: {
                    _id: "$interests",
                    count: { $sum: 1 },
                    users: { $push: { _id: "$_id", name: "$name", email: "$email" } },
                },
            },
            { $sort: { count: -1, _id: 1 } },
            { $skip: skip },
            { $limit: limit },
            { $project: { _id: 0, interest: "$_id", count: 1, users: 1 } },
        ]);

        res.json({ page, limit, data: groups });
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

// GET /api/users/:id: একজন user (index: _id)
router.get("/:id", checkId, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found" });
        res.json({ user });
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

// POST /api/users: admin নতুন user বানাবে (চাইলে role-ও দিতে পারবে)
router.post("/", async (req, res) => {
    try {
        const { name, email, password, role, interests } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: "name, email, password required" });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        }
        if (role !== undefined && !["user", "admin"].includes(role)) {
            return res.status(400).json({ message: "role must be user or admin" });
        }

        const hashed = await bcrypt.hash(password, 10);
        const user = await User.create({
            name,
            email,
            password: hashed,
            role: role || "user",
            interests: Array.isArray(interests) ? interests : [],
        });

        res.status(201).json({
            user: { id: user._id, name: user.name, email: user.email, role: user.role, interests: user.interests },
        });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ message: "Email already registered" });
        }
        res.status(500).json({ message: "Server error" });
    }
});

// PUT /api/users/:id: user update
router.put("/:id", checkId, async (req, res) => {
    try {
        const { name, email, password, role, interests } = req.body;
        const updates = {};

        if (name !== undefined) updates.name = name;
        if (email !== undefined) updates.email = email;
        if (Array.isArray(interests)) updates.interests = interests;

        if (password !== undefined) {
            if (password.length < 6) {
                return res.status(400).json({ message: "Password must be at least 6 characters" });
            }
            updates.password = await bcrypt.hash(password, 10);
        }

        if (role !== undefined) {
            if (!["user", "admin"].includes(role)) {
                return res.status(400).json({ message: "role must be user or admin" });
            }
            // নিজের role নিজে বদলাতে দেব না, নইলে শেষ admin নিজেকে user বানিয়ে ফেলতে পারে
            if (req.params.id === req.user._id.toString() && role !== req.user.role) {
                return res.status(400).json({ message: "You cannot change your own role" });
            }
            updates.role = role;
        }

        const user = await User.findByIdAndUpdate(req.params.id, updates, {
            new: true,
            runValidators: true,
        });
        if (!user) return res.status(404).json({ message: "User not found" });

        res.json({ user });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ message: "Email already in use" });
        }
        res.status(500).json({ message: "Server error" });
    }
});

// DELETE /api/users/:id: user মুছবে, সাথে তার notes আর posts-ও
router.delete("/:id", checkId, async (req, res) => {
    try {
        if (req.params.id === req.user._id.toString()) {
            return res.status(400).json({ message: "You cannot delete yourself" });
        }

        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        // নইলে orphan data পড়ে থাকবে। দুটো query-ই আগের index-গুলো ব্যবহার করে
        // (Note: owner, Post: author), তাই নতুন index লাগল না।
        await Promise.all([
            Note.deleteMany({ owner: user._id }),
            Post.deleteMany({ author: user._id }),
        ]);

        res.json({ message: "User deleted" });
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;