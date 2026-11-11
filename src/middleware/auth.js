const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports = async function auth(req, res, next) {
    try {
        const header = req.headers.authorization || "";
        const [scheme, token] = header.split(" ");

        if (scheme !== "Bearer" || !token) {
            return res.status(401).json({ message: "Token missing" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // প্রতি request-এ DB থেকে user আনা হচ্ছে (_id index আছে, তাই দ্রুত)।
        // এতে admin কোনো user delete করলে বা role বদলালে সাথে সাথে কার্যকর হয়।
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ message: "User no longer exists" });
        }

        req.user = user;
        next();
    } catch (err) {
        res.status(401).json({ message: "Invalid or expired token" });
    }
};