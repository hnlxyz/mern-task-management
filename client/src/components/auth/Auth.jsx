import { useState } from "react";
import { LogIn, UserPlus } from "lucide-react";
import ForgotPassword from "./ForgotPassword";

function Auth({ API_URL, onLogin }) {
    const [isLogin, setIsLogin] = useState(true);
    const [showForgotPassword, setShowForgotPassword] = useState(false);

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (event) => {
        event.preventDefault();

        setError("");
        setLoading(true);

        try {
            const endpoint = isLogin
                ? `${API_URL}/auth/login`
                : `${API_URL}/auth/register`;

            const body = isLogin
                ? { email, password }
                : { name, email, password };

            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Something went wrong"
                );
            }

            if (isLogin) {
                onLogin(data.user);
            } else {
                setIsLogin(true);
                setName("");
                setPassword("");

                alert("Registration successful. Please login.");
            }
        } catch (error) {
            console.error("Authentication error:", error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    // Forgot Password Screen
    if (showForgotPassword) {
        return (
            <ForgotPassword
                API_URL={API_URL}
                onBack={() => {
                    setShowForgotPassword(false);
                    setError("");
                }}
            />
        );
    }

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-header">
                    {isLogin ? (
                        <LogIn size={32} />
                    ) : (
                        <UserPlus size={32} />
                    )}

                    <h1>
                        {isLogin
                            ? "Welcome Back"
                            : "Create Account"}
                    </h1>

                    <p>
                        {isLogin
                            ? "Sign in to manage your tasks"
                            : "Create an account to get started"}
                    </p>
                </div>

                {error && (
                    <div className="auth-error">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {!isLogin && (
                        <div className="auth-field">
                            <label htmlFor="name">Name</label>

                            <input
                                id="name"
                                type="text"
                                value={name}
                                onChange={(event) =>
                                    setName(event.target.value)
                                }
                                placeholder="Enter your name"
                                required
                            />
                        </div>
                    )}

                    <div className="auth-field">
                        <label htmlFor="email">Email</label>

                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(event) =>
                                setEmail(event.target.value)
                            }
                            placeholder="Enter your email"
                            required
                        />
                    </div>

                    <div className="auth-field">
                        <label htmlFor="password">Password</label>

                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(event) =>
                                setPassword(event.target.value)
                            }
                            placeholder="Enter your password"
                            minLength={8}
                            maxLength={128}
                            required
                        />

                        {!isLogin && (
                            <div className="password-requirements">
                                <span>Password requirements:</span>
                                <ul>
                                    <li>At least 8 characters</li>
                                    <li>At least 1 uppercase letter</li>
                                    <li>At least 1 lowercase letter</li>
                                    <li>At least 1 number</li>
                                </ul>
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        className="auth-submit-button"
                        disabled={loading}
                    >
                        {loading
                            ? "Please wait..."
                            : isLogin
                                ? "Login"
                                : "Register"}
                    </button>
                </form>

                {isLogin && (
                    <div className="forgot-password">
                        <button
                            type="button"
                            onClick={() => {
                                setShowForgotPassword(true);
                                setError("");
                            }}
                        >
                            Forgot Password?
                        </button>
                    </div>
                )}

                <div className="auth-switch">
                    <span>
                        {isLogin
                            ? "Don't have an account?"
                            : "Already have an account?"}
                    </span>

                    <button
                        type="button"
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setError("");
                        }}
                    >
                        {isLogin ? "Register" : "Login"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Auth;