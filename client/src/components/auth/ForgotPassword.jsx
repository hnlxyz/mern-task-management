import { useState } from "react";
import { ArrowLeft, Mail, Send } from "lucide-react";

function ForgotPassword({ API_URL, onBack }) {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = async (event) => {
        event.preventDefault();

        setMessage("");
        setError("");
        setLoading(true);

        try {
            const response = await fetch(
                `${API_URL}/auth/forgot-password`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ email }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Failed to send reset email."
                );
            }

            setMessage(
                "If an account exists with this email, a password reset link has been sent."
            );

            setEmail("");
        } catch (error) {
            console.error("Forgot password error:", error);

            setError(
                error.message ||
                "Unable to send password reset email."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">

                <div className="auth-header">
                    <Mail size={32} />

                    <h1>Forgot Password</h1>

                    <p>
                        Enter your email address to receive a
                        password reset link.
                    </p>
                </div>

                {error && (
                    <div className="auth-error">
                        {error}
                    </div>
                )}

                {message && (
                    <div className="auth-success">
                        {message}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="auth-field">
                        <label htmlFor="forgot-email">
                            Email
                        </label>

                        <input
                            id="forgot-email"
                            type="email"
                            value={email}
                            onChange={(event) =>
                                setEmail(event.target.value)
                            }
                            placeholder="Enter your email"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="auth-submit-button"
                        disabled={loading}
                    >
                        <Send size={15} />

                        {loading
                            ? "Sending..."
                            : "Send Reset Link"}
                    </button>
                </form>

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

export default ForgotPassword;