import { useState } from "react";
import { LockKeyhole, X, Loader2 } from "lucide-react";

function ChangePassword({ API_URL, onClose, onPasswordChanged }) {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (event) => {
        event.preventDefault();

        setError("");

        if (!currentPassword || !newPassword || !confirmPassword) {
            setError("All password fields are required.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("New password and confirmation password do not match.");
            return;
        }

        if (newPassword.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }

        if (newPassword.length > 128) {
            setError("Password must not exceed 128 characters.");
            return;
        }

        if (!/[A-Z]/.test(newPassword)) {
            setError(
                "Password must contain at least one uppercase letter."
            );
            return;
        }

        if (!/[a-z]/.test(newPassword)) {
            setError(
                "Password must contain at least one lowercase letter."
            );
            return;
        }

        if (!/[0-9]/.test(newPassword)) {
            setError(
                "Password must contain at least one number."
            );
            return;
        }

        try {
            setLoading(true);

            const response = await fetch(
                `${API_URL}/auth/change-password`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    credentials: "include",
                    body: JSON.stringify({
                        currentPassword,
                        newPassword,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Failed to change password."
                );
            }

            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");

            onPasswordChanged();
        } catch (error) {
            console.error(
                "Change password error:",
                error
            );

            setError(
                error.message ||
                    "Unable to change password. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="password-modal-overlay">
            <div className="password-modal">
                <div className="password-modal-header">
                    <div>
                        <div className="password-modal-title">
                            <LockKeyhole size={20} />
                            <h2>Change Password</h2>
                        </div>

                        <p>
                            Update your account password.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="password-modal-close"
                        onClick={onClose}
                        disabled={loading}
                        aria-label="Close"
                        title="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                {error && (
                    <div className="password-modal-error">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="auth-field">
                        <label htmlFor="current-password">
                            Current Password
                        </label>

                        <input
                            id="current-password"
                            type="password"
                            value={currentPassword}
                            onChange={(event) =>
                                setCurrentPassword(
                                    event.target.value
                                )
                            }
                            placeholder="Enter your current password"
                            autoComplete="current-password"
                            required
                        />
                    </div>

                    <div className="auth-field">
                        <label htmlFor="new-password">
                            New Password
                        </label>

                        <input
                            id="new-password"
                            type="password"
                            value={newPassword}
                            onChange={(event) =>
                                setNewPassword(
                                    event.target.value
                                )
                            }
                            placeholder="Enter your new password"
                            autoComplete="new-password"
                            minLength={8}
                            maxLength={128}
                            required
                        />

                        <div className="password-requirements">
                            <span>Password requirements:</span>

                            <ul>
                                <li>At least 8 characters</li>
                                <li>
                                    At least 1 uppercase letter
                                </li>
                                <li>
                                    At least 1 lowercase letter
                                </li>
                                <li>At least 1 number</li>
                            </ul>
                        </div>
                    </div>

                    <div className="auth-field">
                        <label htmlFor="confirm-password">
                            Confirm New Password
                        </label>

                        <input
                            id="confirm-password"
                            type="password"
                            value={confirmPassword}
                            onChange={(event) =>
                                setConfirmPassword(
                                    event.target.value
                                )
                            }
                            placeholder="Confirm your new password"
                            autoComplete="new-password"
                            minLength={8}
                            maxLength={128}
                            required
                        />
                    </div>

                    <div className="password-modal-actions">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2
                                        size={15}
                                        className="icon-spin"
                                    />
                                    Changing...
                                </>
                            ) : (
                                <>
                                    <LockKeyhole size={15} />
                                    Change Password
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default ChangePassword;