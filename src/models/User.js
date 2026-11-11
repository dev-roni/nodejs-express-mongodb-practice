const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, lowercase: true, trim: true },
        password: { type: String, required: true, select: false }, // query-তে by default আসবে না
        role: { type: String, enum: ["user", "admin"], default: "user" },
        interests: { type: [String], default: [] }, // যেমন ['chess', 'reading']
    },
    { timestamps: true } // createdAt, updatedAt নিজে বানাবে
);

// Login এবং email দিয়ে profile fetch। unique-ও এখান থেকেই।
userSchema.index({ email: 1 }, { unique: true });

// Admin-এর user list (সবচেয়ে নতুন আগে, pagination সহ)
userSchema.index({ createdAt: -1 });

module.exports = mongoose.model("User", userSchema);