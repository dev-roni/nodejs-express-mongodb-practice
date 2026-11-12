const express = require("express");
const mongoose = require("mongoose");
const Post = require("../models/Post");
const User = require("../models/User");
const auth = require("../middleware/auth");
const { getPagination } = require("../utils/pagination");

const router = express.Router();

// POST /api/posts: নতুন post (login লাগবে)
router.post("/", auth, async (req, res) => {
    try {
        const { title, body } = req.body;
        if (!title) return res.status(400).json({ message: "title required" });

        // author সবসময় token থেকে আসবে
        const post = await Post.create({ title, body, author: req.user._id });
        res.status(201).json({ post });
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

// GET /api/posts/user/:userId: Scenario 2, একজন user-এর সব posts
// একটাই aggregate() call, একটাই $lookup। Posts সবাই দেখতে পারে, তাই login লাগে না।
router.get("/user/:userId", async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.userId)) {
            return res.status(400).json({ message: "Invalid id" });
        }
        const { page, limit, skip } = getPagination(req.query);

        // aggregate()-এ Mongoose নিজে string কে ObjectId বানায় না, তাই হাতে বানাতে হবে
        const userId = new mongoose.Types.ObjectId(req.params.userId);

        const result = await User.aggregate([
            { $match: { _id: userId } }, // _id index
            {
                $lookup: {
                    from: "posts",
                    let: { uid: "$_id" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$author", "$$uid"] } } }, // Posts { author, createdAt } index
                        { $sort: { createdAt: -1 } },
                        { $skip: skip },
                        { $limit: limit },
                        { $project: { title: 1, body: 1, createdAt: 1 } },
                    ],
                    as: "posts",
                },
            },
            // aggregate-এ select:false কাজ করে না, তাই password যেন না যায় সেজন্য নিজে project করছি
            { $project: { name: 1, posts: 1 } },
        ]);

        if (result.length === 0) return res.status(404).json({ message: "User not found" });

        res.json({ page, limit, ...result[0] });
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

// GET /api/posts/:id: একটা post (index: _id)
router.get("/:id", async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: "Invalid id" });
        }
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: "Post not found" });
        res.json({ post });
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

// DELETE /api/posts/:id: শুধু নিজের post
router.delete("/:id", auth, async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: "Invalid id" });
        }
        const post = await Post.findOneAndDelete({ _id: req.params.id, author: req.user._id });
        if (!post) return res.status(404).json({ message: "Post not found" });
        res.json({ message: "Post deleted" });
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;