const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true },
        content: { type: String, default: "" },
        owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    },
    { timestamps: true }
);

// User-এর নিজের notes list: filter owner, sort createdAt
noteSchema.index({ owner: 1, createdAt: -1 });

// Admin-এর সবার notes list: filter নেই, শুধু sort createdAt
noteSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Note", noteSchema);