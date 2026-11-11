const express = require("express");
const mongoose = require("mongoose");
const Note = require("../models/Note");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/role");
const { getPagination, buildMeta } = require("../utils/pagination");

const router = express.Router();

router.use(auth); // এই file-এর সব route-এ login লাগবে

// POST /api/notes: নতুন note
router.post("/", async (req, res) => {
    try {
        const { title, content } = req.body;
        if (!title) return res.status(400).json({ message: "title required" });

        // owner সবসময় token থেকে আসবে, body থেকে কখনো নয়
        const note = await Note.create({ title, content, owner: req.user._id });
        res.status(201).json({ note });
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

// GET /api/notes: নিজের notes (pagination সহ)
// index: { owner: 1, createdAt: -1 }
router.get("/", async (req, res) => {
    try {
        const { page, limit, skip } = getPagination(req.query);
        const filter = { owner: req.user._id };

        const [notes, total] = await Promise.all([
            Note.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
            Note.countDocuments(filter),
        ]);

        res.json({ data: notes, ...buildMeta(page, limit, total) });
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

// GET /api/notes/all: শুধু admin, সবার notes
// index: { createdAt: -1 }
// (এটা অবশ্যই "/:id"-এর আগে থাকবে, নইলে "all" কে id ভেবে নেবে)
router.get("/all", requireRole("admin"), async (req, res) => {
    try {
        const { page, limit, skip } = getPagination(req.query);

        const [notes, total] = await Promise.all([
            Note.find().sort({ createdAt: -1 }).skip(skip).limit(limit).populate("owner", "name email"),
            Note.estimatedDocumentCount(),
        ]);

        res.json({ data: notes, ...buildMeta(page, limit, total) });
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

// GET /api/notes/:id: একটা note (নিজের, অথবা admin হলে যেকোনো)
// index: _id (MongoDB-র নিজের)
router.get("/:id", async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: "Invalid id" });
        }

        const note = await Note.findById(req.params.id);
        if (!note) return res.status(404).json({ message: "Note not found" });

        const isOwner = note.owner.equals(req.user._id);
        if (!isOwner && req.user.role !== "admin") {
            return res.status(404).json({ message: "Note not found" }); // অন্যের note আছে কিনা সেটাও লুকালাম
        }

        res.json({ note });
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

// PUT /api/notes/:id: শুধু নিজের note update
router.put("/:id", async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: "Invalid id" });
        }

        const updates = {};
        if (req.body.title !== undefined) updates.title = req.body.title;
        if (req.body.content !== undefined) updates.content = req.body.content;

        const note = await Note.findOneAndUpdate(
            { _id: req.params.id, owner: req.user._id }, // owner মিললে তবেই update
            updates,
            { new: true, runValidators: true }
        );
        if (!note) return res.status(404).json({ message: "Note not found" });

        res.json({ note });
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

// DELETE /api/notes/:id: শুধু নিজের note delete
router.delete("/:id", async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: "Invalid id" });
        }

        const note = await Note.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
        if (!note) return res.status(404).json({ message: "Note not found" });

        res.json({ message: "Note deleted" });
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;