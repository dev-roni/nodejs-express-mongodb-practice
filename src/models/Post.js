const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true },
        body: { type: String, default: "" },
        author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    },
    { timestamps: true }
);

// একজন user-এর posts, এবং Scenario 2-এর $lookup (foreignField: "author")
postSchema.index({ author: 1, createdAt: -1 });

module.exports = mongoose.model("Post", postSchema);