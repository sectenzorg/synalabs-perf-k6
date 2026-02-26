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
        <div className="bg-[#f8f6f6] min-h-screen flex items-center justify-center font-display selection:bg-[#ec5b13]/30">
            <div className="w-full max-w-md p-8 lg:p-12">
                <div className="flex flex-col items-center mb-10">
                    <div className="mb-6 flex items-center justify-center w-12 h-12 rounded-xl bg-[#ec5b13] text-white shadow-lg shadow-[#ec5b13]/20">
                        <span className="material-symbols-outlined text-3xl">bolt</span>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Synalabs Perf</h1>
                    <p className="text-slate-500 mt-2 text-sm">Elevate your performance workflow</p>
                </div>

                <div className="bg-white p-8 rounded-xl shadow-xl shadow-slate-200/50 border border-slate-100">
                    {error && (
                        <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-lg text-xs font-semibold animate-in flex items-center gap-3">
                            <span className="material-symbols-outlined text-lg">error</span>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2" htmlFor="email">Email Address</label>
                            <input
                                className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-[#ec5b13]/20 focus:border-[#ec5b13] outline-none transition-all duration-200 placeholder:text-slate-400"
                                id="email"
                                type="text"
                                required
                                placeholder="name@company.com"
                                value={login}
                                onChange={(e) => setLogin(e.target.value)}
                            />
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500" htmlFor="password">Password</label>
                                <a className="text-xs font-semibold text-[#ec5b13] hover:text-[#ec5b13]/80 transition-colors" href="#">Forgot password?</a>
                            </div>
                            <input
                                className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-[#ec5b13]/20 focus:border-[#ec5b13] outline-none transition-all duration-200 placeholder:text-slate-400"
                                id="password"
                                type="password"
                                required
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center">
                            <input className="w-4 h-4 text-[#ec5b13] border-slate-300 rounded focus:ring-[#ec5b13] cursor-pointer" id="remember" type="checkbox" />
                            <label className="ml-2 text-sm text-slate-600 cursor-pointer" htmlFor="remember">Stay logged in for 30 days</label>
                        </div>
                        <button
                            disabled={loading}
                            className="w-full bg-[#ec5b13] hover:bg-[#ec5b13]/90 text-white font-semibold py-3.5 rounded-lg shadow-md shadow-[#ec5b13]/25 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center"
                            type="submit"
                        >
                            {loading ? (
                                <div className="size-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            ) : "Sign In"}
                        </button>
                    </form>

                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center internal-none">
                            <div className="w-full border-t border-slate-200"></div>
                        </div>
                        <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
                            <span className="bg-white px-4 text-slate-400">Or continue with</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <button className="flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors duration-200">
                            <img alt="Google" className="w-5 h-5" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAKT4ME7veulBeZ0sT3PK4G3Vfhs3ieChXejttevB_oc7SBvPs3PKm70KW89BjQbf3AivfjKuJdEJKZSJau0TyVETvrrH5Oy12xyMO7AFcNDV0Kg-5nsF4AZCAZa3lZ-Cq0XwWPBsnHXdNJZ3uWPHwDpsQeqnl1qhwp4rgivmV1yUCoa8-6l0y1uitFoVE_FXy0tzRJGJ7lzxWL6ZdQ4u-Y2V9uXI6qKEF5E_tY-nq6rvIbDQfr_agVxF2OfvqwelKSwMGEYeN_-_0" />
                            <span className="text-sm font-medium text-slate-700">Google</span>
                        </button>
                        <button className="flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors duration-200">
                            <span className="material-symbols-outlined text-slate-900 text-[20px]">apple</span>
                            <span className="text-sm font-medium text-slate-700">Apple</span>
                        </button>
                    </div>
                </div>

                <p className="text-center mt-10 text-sm text-slate-500">
                    Don't have an account?
                    <a className="font-semibold text-[#ec5b13] hover:underline underline-offset-4" href="#">Start your free trial</a>
                </p>

                <div className="mt-12 flex justify-center space-x-6">
                    <a className="text-xs text-slate-400 hover:text-slate-600 transition-colors" href="#">Privacy Policy</a>
                    <a className="text-xs text-slate-400 hover:text-slate-600 transition-colors" href="#">Terms of Service</a>
                    <a className="text-xs text-slate-400 hover:text-slate-600 transition-colors" href="#">Contact Support</a>
                </div>
            </div>
        </div>
    );
}
