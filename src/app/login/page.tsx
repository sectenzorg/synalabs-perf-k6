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
    const [showPw, setShowPw] = useState(false);

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
        <div className="relative flex min-h-[100dvh] w-full flex-col geometric-bg overflow-x-hidden">
            <div className="flex h-full grow flex-col">
                {/* Minimal Logo Header */}
                <header className="flex items-center px-6 py-6 md:px-12 lg:px-24">
                    <div className="flex items-center gap-2.5 text-slate-900">
                        <div className="flex items-center justify-center size-9 rounded-xl bg-primary text-white shadow-lg shadow-primary/20">
                            <span className="material-symbols-outlined text-xl">bolt</span>
                        </div>
                        <h2 className="text-lg font-extrabold leading-tight tracking-tight">Synalabs Perf K6</h2>
                    </div>
                </header>

                {/* Main Content Section */}
                <main className="flex flex-1 items-center justify-center px-4 py-8 sm:py-12">
                    <div className="w-full max-w-[420px] bg-white shadow-xl shadow-slate-200/50 rounded-2xl p-7 sm:p-8 border border-slate-100/80">
                        <div className="mb-7">
                            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-1.5">Welcome Back</h1>
                            <p className="text-slate-500 text-sm sm:text-base font-normal">Log in to your performance dashboard</p>
                        </div>

                        {error && (
                            <div className="mb-5 rounded-xl bg-red-50 p-3.5 border border-red-100 flex gap-2.5 text-red-600 text-sm items-center">
                                <span className="material-symbols-outlined text-lg shrink-0">error</span>
                                <span className="font-medium">{error}</span>
                            </div>
                        )}

                        <form className="space-y-4.5" onSubmit={handleSubmit}>
                            {/* Email Field */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-slate-700 text-xs font-semibold uppercase tracking-wider" htmlFor="login">Email Address</label>
                                <div className="relative group">
                                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xl group-focus-within:text-primary transition-colors">mail</span>
                                    <input
                                        className="flex w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pl-11 pr-4 text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all outline-none text-sm"
                                        id="login"
                                        placeholder="name@company.com"
                                        type="text"
                                        value={login}
                                        onChange={(e) => setLogin(e.target.value)}
                                        required
                                        autoComplete="email"
                                    />
                                </div>
                            </div>

                            {/* Password Field */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-slate-700 text-xs font-semibold uppercase tracking-wider" htmlFor="password">Password</label>
                                <div className="relative group">
                                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xl group-focus-within:text-primary transition-colors">lock</span>
                                    <input
                                        className="flex w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pl-11 pr-11 text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all outline-none text-sm"
                                        id="password"
                                        placeholder="••••••••"
                                        type={showPw ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        autoComplete="current-password"
                                    />
                                    <button
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-0.5"
                                        type="button"
                                        onClick={() => setShowPw(!showPw)}
                                        tabIndex={-1}
                                    >
                                        <span className="material-symbols-outlined text-lg">{showPw ? "visibility_off" : "visibility"}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Remember Me */}
                            <div className="flex items-center gap-2.5 py-0.5">
                                <input className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/30 transition-all cursor-pointer accent-primary" id="remember" type="checkbox" />
                                <label className="text-slate-600 text-sm font-medium cursor-pointer select-none" htmlFor="remember">Remember this device</label>
                            </div>

                            {/* Login Button */}
                            <button
                                className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all flex items-center justify-center gap-2 group active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none text-sm"
                                type="submit"
                                disabled={loading}
                            >
                                {loading ? (
                                    <div className="flex items-center gap-2">
                                        <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Signing In...
                                    </div>
                                ) : (
                                    <>
                                        Sign In
                                        <span className="material-symbols-outlined text-lg group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </main>

                {/* Footer */}
                <footer className="p-5 text-center">
                    <p className="text-slate-400 text-[11px] font-medium">© 2026 Synalabs Perf K6. All rights reserved.</p>
                </footer>
            </div>
        </div>
    );
}
