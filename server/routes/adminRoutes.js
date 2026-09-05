const express = require("express");

const User = require("../models/user");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const router = express.Router();

// HELPERS
const escapeRegex = (value) => {
    return value.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );
};

// ADMIN AUTHORIZATION
router.use(authMiddleware);
router.use(adminMiddleware);

// GET ALL USERS
router.get("/users", async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = "",
            role = "all",
            status = "all",
        } = req.query;

        const currentPage = Math.max(
            parseInt(page, 10) || 1,
            1
        );

        const perPage = Math.min(
            Math.max(
                parseInt(limit, 10) || 10,
                1
            ),
            50
        );

        const query = {};

        // SEARCH BY NAME OR EMAIL
        const trimmedSearch = search.trim();

        if (trimmedSearch) {
            const escapedSearch =
                escapeRegex(trimmedSearch);

            const searchRegex = new RegExp(
                escapedSearch,
                "i"
            );

            query.$or = [
                {
                    name: searchRegex,
                },
                {
                    email: searchRegex,
                },
            ];
        }

        // ROLE FILTER
        if (
            role &&
            role !== "all" &&
            ["user", "admin"].includes(role)
        ) {
            query.role = role;
        }

        // STATUS FILTER
        if (
            status &&
            status !== "all" &&
            [
                "pending",
                "active",
                "rejected",
                "suspended",
            ].includes(status)
        ) {
            query.status = status;
        }

        // COUNT USERS
        const totalUsers =
            await User.countDocuments(query);

        const totalPages = Math.max(
            Math.ceil(
                totalUsers / perPage
            ),
            1
        );

        const safePage = Math.min(
            currentPage,
            totalPages
        );

        // FETCH USERS
        const users = await User.find(query)
            .select(
                "_id name email role status createdAt updatedAt"
            )
            .sort({
                createdAt: -1,
            })
            .skip(
                (safePage - 1) * perPage
            )
            .limit(perPage);

        return res.status(200).json({
            users,
            pagination: {
                page: safePage,
                limit: perPage,
                totalUsers,
                totalPages,
            },
        });
    } catch (error) {
        console.error(
            "Error fetching admin users:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to fetch users.",
        });
    }
});

// APPROVE USER
router.patch(
    "/users/:id/approve",
    async (req, res) => {
        try {
            const user =
                await User.findById(
                    req.params.id
                );

            if (!user) {
                return res.status(404).json({
                    message:
                        "User not found.",
                });
            }

            if (user.role === "admin") {
                return res.status(400).json({
                    message:
                        "Admin accounts cannot be approved or changed through this action.",
                });
            }

            if (user.status === "active") {
                return res.status(400).json({
                    message:
                        "User is already active.",
                });
            }

            if (
                user.status !== "pending" &&
                user.status !== "rejected"
            ) {
                return res.status(400).json({
                    message:
                        "Only pending or rejected users can be approved.",
                });
            }

            user.status = "active";

            await user.save();

            return res.status(200).json({
                message:
                    "User approved successfully.",
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    status: user.status,
                },
            });
        } catch (error) {
            console.error(
                "Error approving user:",
                error
            );

            return res.status(500).json({
                message:
                    "Failed to approve user.",
            });
        }
    }
);

// REJECT USER
router.patch(
    "/users/:id/reject",
    async (req, res) => {
        try {
            const user =
                await User.findById(
                    req.params.id
                );

            if (!user) {
                return res.status(404).json({
                    message:
                        "User not found.",
                });
            }

            if (user.role === "admin") {
                return res.status(400).json({
                    message:
                        "Admin accounts cannot be rejected.",
                });
            }

            if (user.status === "rejected") {
                return res.status(400).json({
                    message:
                        "User is already rejected.",
                });
            }

            if (user.status !== "pending") {
                return res.status(400).json({
                    message:
                        "Only pending users can be rejected.",
                });
            }

            user.status = "rejected";

            await user.save();

            return res.status(200).json({
                message:
                    "User rejected successfully.",
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    status: user.status,
                },
            });
        } catch (error) {
            console.error(
                "Error rejecting user:",
                error
            );

            return res.status(500).json({
                message:
                    "Failed to reject user.",
            });
        }
    }
);

// SUSPEND USER
router.patch(
    "/users/:id/suspend",
    async (req, res) => {
        try {
            const user =
                await User.findById(
                    req.params.id
                );

            if (!user) {
                return res.status(404).json({
                    message:
                        "User not found.",
                });
            }

            if (user.role === "admin") {
                return res.status(400).json({
                    message:
                        "Admin accounts cannot be suspended.",
                });
            }

            if (user.status === "suspended") {
                return res.status(400).json({
                    message:
                        "User is already suspended.",
                });
            }

            if (user.status !== "active") {
                return res.status(400).json({
                    message:
                        "Only active users can be suspended.",
                });
            }

            user.status = "suspended";

            await user.save();

            return res.status(200).json({
                message:
                    "User suspended successfully.",
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    status: user.status,
                },
            });
        } catch (error) {
            console.error(
                "Error suspending user:",
                error
            );

            return res.status(500).json({
                message:
                    "Failed to suspend user.",
            });
        }
    }
);

// REACTIVATE USER
router.patch(
    "/users/:id/reactivate",
    async (req, res) => {
        try {
            const user =
                await User.findById(
                    req.params.id
                );

            if (!user) {
                return res.status(404).json({
                    message:
                        "User not found.",
                });
            }

            if (user.role === "admin") {
                return res.status(400).json({
                    message:
                        "Admin accounts do not need to be reactivated.",
                });
            }

            if (user.status === "active") {
                return res.status(400).json({
                    message:
                        "User is already active.",
                });
            }

            if (user.status !== "suspended") {
                return res.status(400).json({
                    message:
                        "Only suspended users can be reactivated.",
                });
            }

            user.status = "active";

            await user.save();

            return res.status(200).json({
                message:
                    "User reactivated successfully.",
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    status: user.status,
                },
            });
        } catch (error) {
            console.error(
                "Error reactivating user:",
                error
            );

            return res.status(500).json({
                message:
                    "Failed to reactivate user.",
            });
        }
    }
);

module.exports = router;