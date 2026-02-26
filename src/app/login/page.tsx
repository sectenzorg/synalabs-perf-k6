"use client";
import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const { data: status } = useSession() as any;
    const router = useRouter();
    const [credentials, setCredentials] = useState({ email: "", password: "" });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        if (status === "authenticated") router.push("/dashboard");
    }, [status, router]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError("");
        const res = await signIn("credentials", {
            ...credentials,
            redirect: false,
        });
        if (res?.error) setError("The credentials provided are invalid.");
        else router.push("/dashboard");
        setLoading(false);
    }

    return (
        <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50 font-body selection:bg-sky-100">
            <div className="w-full max-w-[440px] px-6 py-12">
                <div className="card-premium p-8 sm:p-12 space-y-10 border-slate-200/60 shadow-2xl shadow-slate-900/5 bg-white rounded-3xl animate-in">
                    {/* Branding */}
                    <div className="flex flex-col items-center text-center space-y-6">
                        <div className="size-14 bg-sky-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-sky-500/20">
                            <span className="material-symbols-outlined text-3xl">bolt</span>
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Sign in to Synalabs</h1>
                            <p className="text-slate-500 text-sm font-medium">Performance monitoring & infrastructure testing</p>
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-semibold animate-in flex items-center gap-3">
                            <span className="material-symbols-outlined text-lg">error</span>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2 text-left">
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Email Address</label>
                            <div className="relative group">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg group-focus-within:text-sky-500 transition-colors">alternate_email</span>
                                <input
                                    type="email"
                                    required
                                    className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 text-sm font-medium focus:bg-white focus:border-sky-500 transition-all outline-none"
                                    placeholder="name@example.com"
                                    value={credentials.email}
                                    onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2 text-left">
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Security Key</label>
                            <div className="relative group">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg group-focus-within:text-sky-500 transition-colors">lock</span>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-11 text-sm font-medium focus:bg-white focus:border-sky-500 transition-all outline-none"
                                    placeholder="Enter your password"
                                    value={credentials.password}
                                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                                >
                                    <span className="material-symbols-outlined text-lg">{showPassword ? 'visibility_off' : 'visibility'}</span>
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-12 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-sky-600/10 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="size-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    Sign in
                                    <span className="material-symbols-outlined text-lg">arrow_forward</span>
                                </>
                            )}
                        </button>
                    </form>

                    <div className="pt-8 border-t border-slate-100 flex items-center justify-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="size-2 rounded-full bg-emerald-500" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">System Operational</span>
                        </div>
                    </div>
                </div>

                <p className="mt-8 text-center text-[11px] text-slate-400 font-medium">
                    © 2026 Synalabs Intelligence. All rights reserved.
                </p>
            </div>
        </div>
    );
}
