import { useState } from "react";
import {
    ArrowLeft,
    LockKeyhole,
    CheckCircle2,
    AlertCircle,
} from "lucide-react";

function ResetPassword({ API_URL, token, onBack }) {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    // PASSWORD VALIDATION
    const validatePassword = (value) => {
        if (value.length < 8) {
            return "Password must be at least 8 characters.";
        }

        if (value.length > 128) {
            return "Password must not exceed 128 characters.";
        }

        if (!/[A-Z]/.test(value)) {
            return "Password must contain at least one uppercase letter.";
        }

        if (!/[a-z]/.test(value)) {
            return "Password must contain at least one lowercase letter.";
        }

        if (!/[0-9]/.test(value)) {
            return "Password must contain at least one number.";
        }

        return null;
    };

    // SUBMIT
    const handleSubmit = async (event) => {
        event.preventDefault();

        setMessage("");
        setError("");

        // Validate password
        const passwordError =
            validatePassword(password);

        if (passwordError) {
            setError(passwordError);
            return;
        }

        // Confirm password
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        try {
            setLoading(true);

            const response = await fetch(
                `${API_URL}/auth/reset-password`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                    },

                    body: JSON.stringify({
                        token,
                        password,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "Failed to reset password."
                );
            }

            setMessage(
                "Password reset successful. You can now login with your new password."
            );

            setPassword("");
            setConfirmPassword("");
        } catch (error) {
            console.error(
                "Reset password error:",
                error
            );

            setError(
                error.message ||
                "Unable to reset password."
            );
        } finally {
            setLoading(false);
        }
    };

    // UI
    return (
        <div className="auth-page">
            <div className="auth-card">

                {/* Header */}

                <div className="auth-header">
                    <LockKeyhole size={32} />

                    <h1>
                        Reset Password
                    </h1>

                    <p>
                        Enter your new password below.
                    </p>
                </div>

                {/* Error */}

                {error && (
                    <div className="auth-error">
                        <AlertCircle size={16} />

                        <span>
                            {error}
                        </span>
                    </div>
                )}

                {/* Success */}

                {message && (
                    <div className="auth-success">
                        <CheckCircle2 size={16} />

                        <span>
                            {message}
                        </span>
                    </div>
                )}

                {!message && (
                    <form onSubmit={handleSubmit}>

                        {/* New Password */}

                        <div className="auth-field">
                            <label htmlFor="new-password">
                                New Password
                            </label>

                            <input
                                id="new-password"
                                type="password"
                                value={password}
                                onChange={(event) => {
                                    setPassword(
                                        event.target.value
                                    );

                                    setError("");
                                }}
                                placeholder="Enter new password"
                                minLength={8}
                                maxLength={128}
                                required
                            />
                        </div>

                        {/* Password Requirements */}

                        <div className="password-requirements">
                            <p>
                                Password must:
                            </p>

                            <ul>
                                <li
                                    className={
                                        password.length >= 8
                                            ? "requirement-valid"
                                            : ""
                                    }
                                >
                                    At least 8 characters
                                </li>

                                <li
                                    className={
                                        /[A-Z]/.test(password)
                                            ? "requirement-valid"
                                            : ""
                                    }
                                >
                                    At least one uppercase letter
                                </li>

                                <li
                                    className={
                                        /[a-z]/.test(password)
                                            ? "requirement-valid"
                                            : ""
                                    }
                                >
                                    At least one lowercase letter
                                </li>

                                <li
                                    className={
                                        /[0-9]/.test(password)
                                            ? "requirement-valid"
                                            : ""
                                    }
                                >
                                    At least one number
                                </li>

                                <li>
                                    Maximum 128 characters
                                </li>
                            </ul>
                        </div>

                        {/* Confirm Password */}

                        <div className="auth-field">
                            <label htmlFor="confirm-password">
                                Confirm Password
                            </label>

                            <input
                                id="confirm-password"
                                type="password"
                                value={confirmPassword}
                                onChange={(event) => {
                                    setConfirmPassword(
                                        event.target.value
                                    );

                                    setError("");
                                }}
                                placeholder="Confirm new password"
                                minLength={8}
                                maxLength={128}
                                required
                            />
                        </div>

                        {/* Submit */}

                        <button
                            type="submit"
                            className="auth-submit-button"
                            disabled={loading}
                        >
                            {loading
                                ? "Resetting..."
                                : "Reset Password"}
                        </button>

                    </form>
                )}

                {/* Back */}

                <div className="auth-switch">
                    <button
                        type="button"
                        onClick={onBack}
                    >
                        <ArrowLeft size={14} />

                        Back to Login
                    </button>
                </div>

            </div>
        </div>
    );
}

export default ResetPassword;