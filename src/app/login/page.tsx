"use client";
import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const { status } = useSession();
    const router = useRouter();
    const [login, setLogin] = useState("");
    const [password, setPassword] = useState("");
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

        try {
            const res = await signIn("credentials", {
                login,
                password,
                redirect: false,
            });

            if (res?.error) {
                setError("Authentication failed. Please verify your credentials.");
            } else if (res?.ok) {
                router.push("/dashboard");
            }
        } catch (err) {
            setError("Critical gateway error. Please contact infrastructure admin.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-[100dvh] flex items-center justify-center bg-[#f8fafc] font-body selection:bg-sky-100 relative overflow-hidden">
            {/* Ambient Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className="absolute top-[-10%] left-[-5%] size-[400px] bg-sky-200/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-5%] size-[400px] bg-indigo-200/20 rounded-full blur-[120px]" />
            </div>

            <div className="w-full max-w-[460px] px-6 py-12 relative z-10">
                <div className="card-premium p-10 sm:p-14 space-y-12 border-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] bg-white/80 backdrop-blur-2xl rounded-[2.5rem] animate-in overflow-visible">
                    {/* Branding */}
                    <div className="flex flex-col items-center text-center space-y-8">
                        <div className="relative group">
                            <div className="absolute -inset-4 bg-sky-500/20 rounded-[2rem] blur-xl opacity-0 group-hover:opacity-100 transition-all duration-700" />
                            <div className="size-16 bg-sky-500 rounded-[1.25rem] flex items-center justify-center text-white shadow-2xl shadow-sky-500/40 relative active:scale-95 transition-transform">
                                <span className="material-symbols-outlined text-3xl">bolt</span>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-display">Synalabs Perf</h1>
                            <p className="text-slate-500 text-sm font-medium max-w-[280px] mx-auto leading-relaxed">Infrastructure benching and continuous performance validation node.</p>
                        </div>
                    </div>

                    {error && (
                        <div className="p-5 bg-rose-50 border border-rose-100 text-rose-600 rounded-[1.25rem] text-[11px] font-bold animate-in flex items-center gap-3">
                            <div className="size-8 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-lg">warning</span>
                            </div>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="space-y-2.5 text-left">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] px-1 ml-1 opacity-80">Access Identity</label>
                            <div className="relative group/input">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within/input:text-sky-500 text-slate-400">
                                    <span className="material-symbols-outlined text-xl">alternate_email</span>
                                </div>
                                <input
                                    type="text"
                                    required
                                    autoComplete="username"
                                    className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 text-sm font-bold focus:bg-white focus:border-sky-500 transition-all outline-none shadow-sm placeholder:text-slate-300 placeholder:font-medium"
                                    placeholder="Username or network email"
                                    value={login}
                                    onChange={(e) => setLogin(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2.5 text-left">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] px-1 ml-1 opacity-80">Security Cipher</label>
                            <div className="relative group/input">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within/input:text-sky-500 text-slate-400">
                                    <span className="material-symbols-outlined text-xl">lock</span>
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    autoComplete="current-password"
                                    className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-12 text-sm font-bold focus:bg-white focus:border-sky-500 transition-all outline-none shadow-sm placeholder:text-slate-300 placeholder:font-medium"
                                    placeholder="Secure numeric or string key"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-14 bg-slate-900 hover:bg-black text-white rounded-2xl text-[13px] font-bold shadow-2xl shadow-slate-900/10 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 relative group overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-sky-500/0 via-sky-500/10 to-sky-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                            {loading ? (
                                <div className="size-6 border-[3px] border-white/20 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span>Establish Session</span>
                                    <span className="material-symbols-outlined text-lg leading-none">login</span>
                                </>
                            )}
                        </button>
                    </form>

                    <div className="pt-10 border-t border-slate-100 flex items-center justify-center gap-6">
                        <div className="flex items-center gap-3">
                            <span className="relative flex size-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full size-2 bg-emerald-500"></span>
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]">Engine Live</span>
                        </div>
                        <div className="w-px h-3 bg-slate-100" />
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-xs text-slate-300">verified_user</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]">v2.4 LTS</span>
                        </div>
                    </div>
                </div>

                <div className="mt-12 flex flex-col items-center gap-1 opacity-40 hover:opacity-100 transition-opacity">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.15em]">
                        Synalabs Intelligence Node
                    </p>
                    <p className="text-[9px] text-slate-400 font-medium">
                        Secure telemetry portal. Authorization required for all endpoints.
                    </p>
                </div>
            </div>
        </div>
    );
}
