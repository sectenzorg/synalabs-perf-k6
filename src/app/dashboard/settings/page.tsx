"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const [dbOk, setDbOk] = useState<boolean | null>(null);
    const [dockerOk, setDockerOk] = useState<boolean | null>(null);
    const [checking, setChecking] = useState(false);

    useEffect(() => {
        if (session && session.user.role !== "ADMIN") router.push("/dashboard");
    }, [session, router]);

    async function checkHealth() {
        setChecking(true);
        try {
            const res = await fetch("/api/health");
            if (res.ok) {
                const d = await res.json();
                setDbOk(d.db);
                setDockerOk(d.docker);
            }
        } catch { setDbOk(false); setDockerOk(false); }
        setChecking(false);
    }

    return (
        <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden text-slate-900 dark:text-slate-100 font-display">
            {/* Header */}
            <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-8 shrink-0">
                <div className="flex flex-col justify-center">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">settings</span>
                        Settings
                    </h2>
                    <p className="text-xs text-slate-500">System configuration and health checks</p>
                </div>
            </header>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8 bg-slate-50/50 dark:bg-transparent">
                <div className="max-w-4xl space-y-8">
                    {/* Health Check */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm">
                                <span className="material-symbols-outlined text-slate-400 text-[18px]">health_and_safety</span>
                                System Health
                            </h3>
                            <button
                                onClick={checkHealth}
                                disabled={checking}
                                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                {checking ? (
                                    <><div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div> Checking...</>
                                ) : (
                                    <><span className="material-symbols-outlined text-[14px]">refresh</span> Check Now</>
                                )}
                            </button>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 shrink-0">
                                    <span className="material-symbols-outlined text-[24px]">database</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-sm text-slate-900 dark:text-white">PostgreSQL</div>
                                    <div className={`text-xs mt-1 font-medium ${dbOk === null ? "text-slate-500" : dbOk ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                                        {dbOk === null ? "Status unchecked" : dbOk ? "Connected and healthy" : "Database unreachable"}
                                    </div>
                                </div>
                                {dbOk !== null && (
                                    <span className={`material-symbols-outlined text-[20px] ${dbOk ? "text-green-500" : "text-red-500"}`}>
                                        {dbOk ? "check_circle" : "error"}
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                                <div className="w-12 h-12 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800/50 shrink-0">
                                    <span className="material-symbols-outlined text-[24px]">terminal</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-sm text-slate-900 dark:text-white">Docker / k6 Runner</div>
                                    <div className={`text-xs mt-1 font-medium ${dockerOk === null ? "text-slate-500" : dockerOk ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400"}`}>
                                        {dockerOk === null ? "Status unchecked" : dockerOk ? "Daemon available" : "Fallback to k6 CLI"}
                                    </div>
                                </div>
                                {dockerOk !== null && (
                                    <span className={`material-symbols-outlined text-[20px] ${dockerOk ? "text-green-500" : "text-yellow-500"}`}>
                                        {dockerOk ? "check_circle" : "warning"}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Configuration Info */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm">
                                <span className="material-symbols-outlined text-slate-400 text-[18px]">tune</span>
                                Runtime Configuration
                            </h3>
                        </div>
                        <div className="p-0">
                            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                {[
                                    ["k6 Docker Image", process.env.NEXT_PUBLIC_K6_IMAGE ?? "grafana/k6:latest", "layers"],
                                    ["Artifacts Directory", "./artifacts", "folder_open"],
                                    ["Session Strategy", "JWT (cookie-based)", "key"],
                                    ["Rate Limit (Login)", "5 req/min", "speed"],
                                ].map(([k, v, icon]) => (
                                    <div key={k as string} className="flex items-center justify-between p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <span className="material-symbols-outlined text-slate-400 text-[18px]">{icon as string}</span>
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{k as string}</span>
                                        </div>
                                        <span className="font-mono text-sm text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                            {v as string}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* About */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm">
                                <span className="material-symbols-outlined text-slate-400 text-[18px]">info</span>
                                About Synalabs Perf K6
                            </h3>
                        </div>
                        <div className="p-6">
                            <div className="flex flex-col md:flex-row gap-6 items-start">
                                <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
                                    <span className="material-symbols-outlined text-[32px]">science</span>
                                </div>
                                <div className="space-y-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                    <p>
                                        Internal stress testing dashboard built with <strong className="text-slate-900 dark:text-white">Next.js 15</strong> and <strong className="text-slate-900 dark:text-white">k6</strong>.
                                    </p>
                                    <p>
                                        Provides a focused environment for performance assessment including CRUD target management, parameterized test plan templates, containerized k6 execution, automated metric parsing, rule-based test insight generation, and comprehensive HTML report exports.
                                    </p>
                                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-800/80 inline-block font-mono text-xs text-primary dark:text-primary">
                                        Stack: Next.js · TypeScript · Prisma · PostgreSQL · TailwindCSS · Recharts · k6
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
