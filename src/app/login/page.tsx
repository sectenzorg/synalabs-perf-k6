"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const router = useRouter();
    const [login, setLogin] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setLoading(true);
        const res = await signIn("credentials", {
            login,
            password,
            redirect: false,
        });
        setLoading(false);
        if (res?.error) {
            setError("Invalid credentials. Please try again.");
        } else {
            router.push("/dashboard");
        }
    }

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-logo">
                    <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>⚡</div>
                    <h1>Synalabs Perf</h1>
                    <p>Stress Testing Dashboard</p>
                </div>

                {error && (
                    <div className="alert alert-error" style={{ marginBottom: "1rem" }}>
                        <span>⚠️</span> {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Email or Username</label>
                        <input
                            id="login-input"
                            className="form-input"
                            type="text"
                            value={login}
                            onChange={(e) => setLogin(e.target.value)}
                            placeholder="admin@synalabs.id"
                            autoComplete="username"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input
                            id="password-input"
                            className="form-input"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            autoComplete="current-password"
                            required
                        />
                    </div>

                    <button
                        id="login-submit"
                        type="submit"
                        className="btn btn-primary w-full"
                        style={{ width: "100%", justifyContent: "center", padding: "0.75rem" }}
                        disabled={loading}
                    >
                        {loading ? (
                            <><span className="spinner" style={{ width: 16, height: 16 }} /> Signing in...</>
                        ) : (
                            "Sign In →"
                        )}
                    </button>
                </form>

                <div style={{ marginTop: "1.5rem", padding: "1rem", background: "var(--bg-secondary)", borderRadius: "8px", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    <strong style={{ color: "var(--text-secondary)" }}>Default credentials:</strong><br />
                    admin@synalabs.id / admin123
                </div>
            </div>
        </div>
    );
}
