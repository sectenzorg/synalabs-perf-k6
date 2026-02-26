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
        <div className="min-h-[100dvh] flex bg-white relative overflow-hidden font-body selection:bg-primary/10">
            {/* High-Impact Design Accents */}
            <div className="absolute inset-0 z-0 select-none pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-slate-900/[0.02] rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/[0.03] rounded-full blur-[150px] animate-pulse duration-[4000ms]" />
                <div className="absolute inset-0 geometric-bg opacity-[0.03] shrink-0" />
            </div>

            <div className="flex-1 flex flex-col items-center justify-center relative z-10 w-full lg:grid lg:grid-cols-2 lg:gap-0 lg:p-0">
                {/* Tactical Visual Side (Desktop Only) */}
                <div className="hidden lg:flex flex-col justify-center p-16 xl:p-24 bg-slate-950 relative overflow-hidden h-full">
                    <div className="absolute inset-0 geometric-bg opacity-10" />
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

                    <div className="relative z-10 space-y-16">
                        <div className="flex items-center gap-5 group cursor-default">
                            <div className="size-16 bg-white rounded-3xl flex items-center justify-center text-slate-950 shadow-2xl transition-all duration-700 group-hover:rotate-12 group-hover:scale-110">
                                <span className="material-symbols-outlined text-4xl italic text-sky-500">bolt</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-3xl font-black text-white tracking-tighter italic">SYNALABS</span>
                                <span className="text-[10px] font-black text-sky-400 uppercase tracking-[0.4em] mt-0.5">Strategic Intelligence</span>
                            </div>
                        </div>

                        <div className="space-y-8">
                            <h2 className="text-5xl xl:text-7xl font-black text-white tracking-tighter leading-none italic font-display">
                                Engineering <br />
                                <span className="text-sky-400 not-italic uppercase">Atmospheric</span> <br />
                                Stability.
                            </h2>
                            <p className="text-slate-400 text-lg xl:text-xl font-medium max-w-md leading-relaxed italic border-l-2 border-white/5 pl-8">
                                Benchmarking infrastructure through strategic sequence analytics and high-fidelity stress telemetry.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-12 pt-16 border-t border-white/10 relative">
                            <div className="space-y-2">
                                <p className="text-white text-4xl font-black font-display tracking-tighter italic">2.4k+</p>
                                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] font-display">Cycles_Analyzed</p>
                            </div>
                            <div className="space-y-2">
                                <p className="text-white text-4xl font-black font-display tracking-tighter italic">&lt;15ms</p>
                                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] font-display">P95_Horizon</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Secure Auth Side */}
                <div className="w-full flex flex-col items-center justify-center lg:bg-white h-full px-6 py-12 sm:px-12 lg:px-24 xl:px-32">
                    <div className="w-full max-w-[420px] space-y-12 animate-in">
                        <div className="space-y-5">
                            <div className="lg:hidden size-16 bg-slate-950 rounded-[2rem] flex items-center justify-center text-white shadow-2xl mb-10 mx-auto sm:mx-0">
                                <span className="material-symbols-outlined text-4xl italic">bolt</span>
                            </div>
                            <div className="flex items-center gap-3 px-1">
                                <div className="size-2 rounded-full bg-primary animate-pulse" />
                                <span className="text-[10px] font-black text-primary uppercase tracking-[0.4em] italic font-display">Secure_Access_Module</span>
                            </div>
                            <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tighter text-center sm:text-left italic font-display">
                                Agent Console_
                            </h1>
                            <p className="text-slate-500 font-medium text-center sm:text-left italic text-sm sm:text-base border-l-2 border-slate-100 sm:pl-6 pl-0">
                                Authorize with your encrypted identifier to bypass primary telemetry locks.
                            </p>
                        </div>

                        {error && (
                            <div className="p-6 bg-red-50 border-2 border-red-100 text-red-600 rounded-[2rem] text-xs font-black animate-in flex items-center gap-4 italic shadow-lg shadow-red-500/5">
                                <span className="material-symbols-outlined text-2xl">security_update_warning</span>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-2 italic font-display">Auth_Identifier</label>
                                <div className="relative group">
                                    <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-all duration-500 group-focus-within:rotate-12">person</span>
                                    <input
                                        type="email"
                                        required
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] pl-16 pr-8 py-5 text-sm font-black focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none shadow-sm italic"
                                        placeholder="agent@synalabs.id"
                                        value={credentials.email}
                                        onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-2 italic font-display">Security_Cipher</label>
                                <div className="relative group">
                                    <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-all duration-500 group-focus-within:rotate-12">encrypted</span>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] pl-16 pr-16 py-5 text-sm font-black focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none shadow-sm italic"
                                        placeholder="••••••••••••"
                                        value={credentials.password}
                                        onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-6 top-1/2 -translate-y-1/2 cursor-pointer text-slate-300 hover:text-slate-900 active:scale-95 transition-all p-2 rounded-xl hover:bg-slate-100"
                                    >
                                        <span className="material-symbols-outlined text-2xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full btn-primary h-[72px] text-xs font-black tracking-[0.4em] shadow-2xl shadow-primary/30 uppercase mt-4"
                            >
                                {loading ? (
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                                ) : (
                                    <>
                                        ESTABLISH_SESSION
                                        <span className="material-symbols-outlined text-xl italic ml-2">login</span>
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="pt-10 border-t-2 border-slate-50">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                                <div className="flex items-center gap-3">
                                    <div className="size-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">System_State: Stable</span>
                                </div>
                                <p className="text-[10px] text-slate-300 font-black uppercase tracking-widest italic">© 2026 Synalabs_Strat_Int</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
