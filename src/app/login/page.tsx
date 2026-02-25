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
        <div className="relative flex h-auto min-h-screen w-full flex-col geometric-bg overflow-x-hidden">
            <div className="layout-container flex h-full grow flex-col">
                {/* Top Navigation / Logo Header */}
                <header className="flex items-center justify-between whitespace-nowrap px-6 py-6 md:px-12 lg:px-24">
                    <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                        <div className="flex items-center justify-center size-10 rounded-lg bg-primary text-white">
                            <span className="material-symbols-outlined text-2xl">bolt</span>
                        </div>
                        <h2 className="text-xl font-extrabold leading-tight tracking-tight">Synalabs Perf K6</h2>
                    </div>
                    <div>
                        <a className="text-sm font-medium text-slate-600 hover:text-primary transition-colors" href="#">Help Center</a>
                    </div>
                </header>

                {/* Main Content Section */}
                <main className="flex flex-1 items-center justify-center px-4 py-12">
                    <div className="w-full max-w-[440px] bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-none rounded-xl p-8 border border-slate-100 dark:border-slate-800">
                        <div className="mb-8">
                            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Welcome Back</h1>
                            <p className="text-slate-500 dark:text-slate-400 text-base font-normal">Log in to your Synalabs Perf K6 account</p>
                        </div>

                        {error && (
                            <div className="mb-6 rounded-lg bg-red-50 dark:bg-red-900/10 p-4 border border-red-100 dark:border-red-900/20 flex gap-3 text-red-600 dark:text-red-400 text-sm items-start">
                                <span className="material-symbols-outlined mt-0.5" style={{ fontSize: 18 }}>error</span>
                                <span>{error}</span>
                            </div>
                        )}

                        <form className="space-y-5" onSubmit={handleSubmit}>
                            {/* Email Field */}
                            <div className="flex flex-col gap-2">
                                <label className="text-slate-700 dark:text-slate-300 text-sm font-semibold" htmlFor="login">Email Address</label>
                                <div className="relative group">
                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">mail</span>
                                    <input
                                        className="flex w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-3.5 pl-12 pr-4 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none text-base"
                                        id="login"
                                        placeholder="name@company.com"
                                        type="text"
                                        value={login}
                                        onChange={(e) => setLogin(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Password Field */}
                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-slate-700 dark:text-slate-300 text-sm font-semibold" htmlFor="password">Password</label>
                                    <a className="text-xs font-semibold text-primary hover:underline" href="#">Forgot password?</a>
                                </div>
                                <div className="relative group">
                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">lock</span>
                                    <input
                                        className="flex w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-3.5 pl-12 pr-12 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none text-base"
                                        id="password"
                                        placeholder="••••••••"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                    <button className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors" type="button">
                                        <span className="material-symbols-outlined text-xl">visibility</span>
                                    </button>
                                </div>
                            </div>

                            {/* Remember Me */}
                            <div className="flex items-center gap-3 py-1">
                                <input className="h-5 w-5 rounded border-slate-300 dark:border-slate-700 text-primary focus:ring-primary/30 transition-all cursor-pointer" id="remember" type="checkbox" />
                                <label className="text-slate-600 dark:text-slate-400 text-sm font-medium cursor-pointer select-none" htmlFor="remember">Remember this device</label>
                            </div>

                            {/* Login Button */}
                            <button
                                className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-lg shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 group active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                                type="submit"
                                disabled={loading}
                            >
                                {loading ? "Signing In..." : "Sign In"}
                                {!loading && <span className="material-symbols-outlined text-xl group-hover:translate-x-1 transition-transform">arrow_forward</span>}
                            </button>
                        </form>
                    </div>
                </main>

                {/* Footer */}
                <footer className="p-6 text-center">
                    <p className="text-slate-400 text-xs font-medium">© 2026 Synalabs Perf K6. All rights reserved. Professional Performance Intelligence.</p>
                </footer>
            </div>
        </div>
    );
}
