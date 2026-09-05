const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");

const User = require("../models/user");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

/* PASSWORD VALIDATION */
const validatePassword = (password) => {
    if (typeof password !== "string") {
        return "Password is required.";
    }

    if (password.length < 8) {
        return "Password must be at least 8 characters.";
    }

    if (password.length > 128) {
        return "Password must not exceed 128 characters.";
    }

    if (!/[A-Z]/.test(password)) {
        return "Password must contain at least one uppercase letter.";
    }

    if (!/[a-z]/.test(password)) {
        return "Password must contain at least one lowercase letter.";
    }

    if (!/[0-9]/.test(password)) {
        return "Password must contain at least one number.";
    }

    return null;
};

/* RATE LIMITERS */

// Registration
const registerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        message:
            "Too many registration attempts. Please try again later.",
    },
});

// Login
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        message:
            "Too many login attempts. Please try again later.",
    },
});

// Forgot password
const forgotPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        message:
            "Too many password reset requests. Please try again later.",
    },
});

// Reset password
const resetPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        message:
            "Too many password reset attempts. Please try again later.",
    },
});

// Change password
const changePasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        message:
            "Too many password change attempts. Please try again later.",
    },
});

/* EMAIL TRANSPORTER */
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,

    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },

    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,

    requireTLS: true,
});

// Verify SMTP configuration when server starts
transporter.verify((error) => {
    if (error) {
        console.error(
            "SMTP transporter verification failed:",
            error.message
        );
    } else {
        console.log("SMTP transporter is ready.");
    }
});

/* REGISTER */
router.post(
    "/register",
    registerLimiter,
    async (req, res) => {
        try {
            const {
                name,
                email,
                password,
            } = req.body;

            // Required fields
            if (
                typeof name !== "string" ||
                typeof email !== "string" ||
                typeof password !== "string"
            ) {
                return res.status(400).json({
                    message:
                        "Name, email and password are required.",
                });
            }

            const trimmedName = name.trim();

            const normalizedEmail =
                email.trim().toLowerCase();

            // Name validation
            if (trimmedName.length < 2) {
                return res.status(400).json({
                    message:
                        "Name must be at least 2 characters.",
                });
            }

            if (trimmedName.length > 100) {
                return res.status(400).json({
                    message:
                        "Name must not exceed 100 characters.",
                });
            }

            // Password validation
            const passwordError =
                validatePassword(password);

            if (passwordError) {
                return res.status(400).json({
                    message: passwordError,
                });
            }

            // Check existing user
            const existingUser =
                await User.findOne({
                    email: normalizedEmail,
                });

            if (existingUser) {
                return res.status(409).json({
                    message:
                        "An account with this email already exists.",
                });
            }

            // Hash password
            const hashedPassword =
                await bcrypt.hash(password, 12);

            // Create pending user
            const user = await User.create({
                name: trimmedName,
                email: normalizedEmail,
                password: hashedPassword,
                role: "user",
                status: "pending",
            });

            return res.status(201).json({
                message:
                    "Registration successful. Your account is pending approval.",

                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    status: user.status,
                },
            });
        } catch (error) {
            console.error(
                "Registration error:",
                error
            );

            return res.status(500).json({
                message:
                    "Registration failed.",
            });
        }
    }
);

/* FORGOT PASSWORD */
router.post(
    "/forgot-password",
    forgotPasswordLimiter,
    async (req, res) => {
        try {
            const email =
                typeof req.body.email === "string"
                    ? req.body.email
                        .trim()
                        .toLowerCase()
                    : "";

            /*
             * Always return the same response
             * whether the email exists or not.
             */
            const genericResponse = {
                message:
                    "If an account with that email exists, a password reset link has been sent.",
            };

            if (!email) {
                return res.status(200).json(
                    genericResponse
                );
            }

            const user =
                await User.findOne({
                    email,
                });

            if (!user) {
                return res.status(200).json(
                    genericResponse
                );
            }

            // Generate reset token
            const resetToken =
                crypto.randomBytes(32).toString("hex");

            // Store only hashed token
            const hashedToken =
                crypto
                    .createHash("sha256")
                    .update(resetToken)
                    .digest("hex");

            user.resetPasswordToken =
                hashedToken;

            user.resetPasswordExpires =
                new Date(
                    Date.now() +
                    15 * 60 * 1000
                );

            await user.save();

            const clientUrl =
                process.env.CLIENT_URL ||
                "http://localhost:5173";

            const resetUrl =
                `${clientUrl}/TaskManagement/reset-password/${resetToken}`;

            /*
             * Return response before sending email.
             * This prevents email delivery delays from
             * blocking the API response.
             */
            res.status(200).json(
                genericResponse
            );

            // Send email in background
            try {
                await transporter.sendMail({
                    from: `"Task Management" <${process.env.EMAIL_USER}>`,
                    to: user.email,
                    subject: "Password Reset Request",

                    text:
                        `You requested a password reset.\n\n` +
                        `Reset your password using this link:\n` +
                        `${resetUrl}\n\n` +
                        `This link expires in 15 minutes.\n\n` +
                        `If you did not request this, you can safely ignore this email.`,

                    html: `
                        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                        <p>You requested a password reset.</p>

                        <p>
                         Click the button below to reset your password:
                        </p>

                        <p style="margin: 24px 0;">
                            <a
                             href="${resetUrl}"
                             style="
                                    display: inline-block;
                                    padding: 12px 24px;
                                    background-color: #2563eb;
                                    color: #ffffff;
                                    text-decoration: none;
                                    border-radius: 6px;
                                    font-weight: 600;
                                "
                            >
                            Reset Password
                            </a>
                        </p>

                        <p>
                            This link expires in 15 minutes.
                        </p>

                        <p>
                            If you did not request this,
                            you can safely ignore this email.
                        </p>
                        </div>
                    `,
                });
            } catch (emailError) {
                console.error(
                    "Password reset email failed:",
                    emailError.message
                );
            }
        } catch (error) {
            console.error(
                "Forgot password error:",
                error
            );

            return res.status(500).json({
                message:
                    "Unable to process password reset request.",
            });
        }
    }
);

/* RESET PASSWORD */
router.post(
    "/reset-password",
    resetPasswordLimiter,
    async (req, res) => {
        try {
            const {
                token,
                password,
            } = req.body;

            if (
                typeof token !== "string" ||
                !token.trim()
            ) {
                return res.status(400).json({
                    message:
                        "Invalid or expired reset link.",
                });
            }

            const passwordError =
                validatePassword(password);

            if (passwordError) {
                return res.status(400).json({
                    message: passwordError,
                });
            }

            const hashedToken =
                crypto
                    .createHash("sha256")
                    .update(token)
                    .digest("hex");

            /*
             * Explicitly select fields that are
             * hidden by the User schema.
             */
            const user =
                await User.findOne({
                    resetPasswordToken:
                        hashedToken,

                    resetPasswordExpires: {
                        $gt: new Date(),
                    },
                }).select(
                    "+password +resetPasswordToken +resetPasswordExpires"
                );

            if (!user) {
                return res.status(400).json({
                    message:
                        "Invalid or expired reset link.",
                });
            }

            // Prevent same password
            const samePassword =
                await bcrypt.compare(
                    password,
                    user.password
                );

            if (samePassword) {
                return res.status(400).json({
                    message:
                        "New password must be different from your current password.",
                });
            }

            // Update password
            user.password =
                await bcrypt.hash(
                    password,
                    12
                );

            // Invalidate reset token
            user.resetPasswordToken =
                undefined;

            user.resetPasswordExpires =
                undefined;

            await user.save();

            return res.status(200).json({
                message:
                    "Password reset successful. You can now log in.",
            });
        } catch (error) {
            console.error(
                "Reset password error:",
                error
            );

            return res.status(500).json({
                message:
                    "Password reset failed.",
            });
        }
    }
);

/* LOGIN */
router.post(
    "/login",
    loginLimiter,
    async (req, res) => {
        try {
            const {
                email,
                password,
            } = req.body;

            if (
                typeof email !== "string" ||
                typeof password !== "string"
            ) {
                return res.status(400).json({
                    message:
                        "Email and password are required.",
                });
            }

            const normalizedEmail =
                email.trim().toLowerCase();

            /*
             * Password is select:false in User model,
             * so explicitly include it for authentication.
             */
            const user =
                await User.findOne({
                    email: normalizedEmail,
                }).select("+password");

            if (!user) {
                return res.status(401).json({
                    message:
                        "Invalid email or password.",
                });
            }

            const passwordMatches =
                await bcrypt.compare(
                    password,
                    user.password
                );

            if (!passwordMatches) {
                return res.status(401).json({
                    message:
                        "Invalid email or password.",
                });
            }

            // Account status
            if (user.status === "pending") {
                return res.status(403).json({
                    message:
                        "Your account is pending approval.",
                });
            }

            if (user.status === "rejected") {
                return res.status(403).json({
                    message:
                        "Your account has been rejected.",
                });
            }

            if (user.status === "suspended") {
                return res.status(403).json({
                    message:
                        "Your account has been suspended.",
                });
            }

            if (user.status !== "active") {
                return res.status(403).json({
                    message:
                        "Your account is not active.",
                });
            }

            if (!process.env.JWT_SECRET) {
                console.error(
                    "JWT_SECRET is not configured."
                );

                return res.status(500).json({
                    message:
                        "Authentication service unavailable.",
                });
            }

            // Create JWT
            const token = jwt.sign(
                {
                    id: user._id,
                    role: user.role,
                    status: user.status,
                },
                process.env.JWT_SECRET,
                {
                    expiresIn: "1h",
                }
            );

            // HttpOnly authentication cookie
            res.cookie(
                "token",
                token,
                {
                    httpOnly: true,

                    secure:
                        process.env.NODE_ENV ===
                        "production",

                    sameSite: "lax",

                    maxAge:
                        60 * 60 * 1000,

                    path: "/",
                }
            );

            return res.status(200).json({
                message: "Login successful.",

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
                "Login error:",
                error
            );

            return res.status(500).json({
                message:
                    "Login failed.",
            });
        }
    }
);

/* CURRENT USER */
router.get(
    "/me",
    authMiddleware,
    async (req, res) => {
        try {
            const user =
                await User.findById(
                    req.user.id
                ).select(
                    "_id name email role status"
                );

            if (!user) {
                return res.status(401).json({
                    message:
                        "Authentication required.",
                });
            }

            if (user.status !== "active") {
                return res.status(403).json({
                    message:
                        "Your account is no longer active.",
                });
            }

            return res.status(200).json({
                user,
            });
        } catch (error) {
            console.error(
                "Get current user error:",
                error
            );

            return res.status(500).json({
                message:
                    "Failed to fetch current user.",
            });
        }
    }
);

/* LOGOUT */
router.post(
    "/logout",
    (req, res) => {
        res.clearCookie(
            "token",
            {
                httpOnly: true,

                secure:
                    process.env.NODE_ENV ===
                    "production",

                sameSite: "lax",

                path: "/",
            }
        );

        return res.status(200).json({
            message:
                "Logout successful.",
        });
    }
);

/* CHANGE PASSWORD */
router.post(
    "/change-password",
    authMiddleware,
    changePasswordLimiter,
    async (req, res) => {
        try {
            const {
                currentPassword,
                newPassword,
            } = req.body;

            if (
                typeof currentPassword !==
                "string" ||
                typeof newPassword !==
                "string"
            ) {
                return res.status(400).json({
                    message:
                        "Current password and new password are required.",
                });
            }

            const passwordError =
                validatePassword(
                    newPassword
                );

            if (passwordError) {
                return res.status(400).json({
                    message: passwordError,
                });
            }

            /*
             * Explicitly select sensitive fields
             * hidden by the User schema.
             */
            const user =
                await User.findById(
                    req.user.id
                ).select(
                    "+password +resetPasswordToken +resetPasswordExpires"
                );

            if (!user) {
                return res.status(401).json({
                    message:
                        "Authentication required.",
                });
            }

            const currentPasswordMatches =
                await bcrypt.compare(
                    currentPassword,
                    user.password
                );

            if (!currentPasswordMatches) {
                return res.status(401).json({
                    message:
                        "Current password is incorrect.",
                });
            }

            // Prevent same password
            const samePassword =
                await bcrypt.compare(
                    newPassword,
                    user.password
                );

            if (samePassword) {
                return res.status(400).json({
                    message:
                        "New password must be different from your current password.",
                });
            }

            user.password =
                await bcrypt.hash(
                    newPassword,
                    12
                );

            // Invalidate any existing reset token
            user.resetPasswordToken =
                undefined;

            user.resetPasswordExpires =
                undefined;

            await user.save();

            /*
             * Force the user to log in again.
             * Clear the current authentication cookie.
             */
            res.clearCookie(
                "token",
                {
                    httpOnly: true,

                    secure:
                        process.env.NODE_ENV ===
                        "production",

                    sameSite: "lax",

                    path: "/",
                }
            );

            return res.status(200).json({
                message:
                    "Password changed successfully. Please log in again.",
            });
        } catch (error) {
            console.error(
                "Change password error:",
                error
            );

            return res.status(500).json({
                message:
                    "Password change failed.",
            });
        }
    }
);

/* EXPORT */

module.exports = router;