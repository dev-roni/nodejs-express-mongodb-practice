// ব্যবহার: router.get("/", auth, requireRole("admin"), handler)
module.exports = function requireRole(...roles) {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: "Forbidden" });
        }
        next();
    };
};