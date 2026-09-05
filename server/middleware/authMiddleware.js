const jwt = require("jsonwebtoken");

const User = require("../models/user");

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.cookies?.token;

        // No authentication cookie
        if (!token) {
            return res.status(401).json({
                message: "Authentication required.",
            });
        }

        // JWT secret must be configured
        if (!process.env.JWT_SECRET) {
            console.error(
                "JWT_SECRET is not configured."
            );

            return res.status(500).json({
                message:
                    "Authentication service unavailable.",
            });
        }

        // Verify JWT
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // Load current user from database
        const user = await User.findById(
            decoded.id
        ).select(
            "_id name email role status"
        );

        // User no longer exists
        if (!user) {
            return res.status(401).json({
                message:
                    "Authentication required.",
            });
        }

        // Account is no longer active
        if (user.status !== "active") {
            return res.status(403).json({
                message:
                    "Your account is no longer active.",
            });
        }

        // Use current database values
        // instead of trusting old JWT role/status
        req.user = {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
        };

        next();
    } catch (error) {
        // Invalid or expired JWT
        return res.status(401).json({
            message:
                "Invalid or expired token.",
        });
    }
};

module.exports = authMiddleware;