"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface Stats {
    totalRuns: number;
    runningRuns: number;
    totalTargets: number;
    totalPlans: number;
    recentRuns: any[];
    passRate: number;
}

export default function DashboardHome() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const dashboardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        async function load() {
            try {
                const [runsRes, targetsRes, plansRes] = await Promise.all([
                    fetch("/api/runs?limit=5"),
                    fetch("/api/targets"),
                    fetch("/api/plans"),
                ]);
                const runsData = await runsRes.json();
                const targets = await targetsRes.json();
                const plans = await plansRes.json();

                const runs: any[] = runsData.runs ?? [];

                const allRunsRes = await fetch("/api/runs?limit=50");
                const allRunsData = await allRunsRes.json();
                const allRuns: any[] = allRunsData.runs ?? [];
                const doneRuns = allRuns.filter((r) => r.status === "DONE");
                const passRuns = doneRuns.filter((r) => r.metricsAgg?.sloPass);

                setStats({
                    totalRuns: runsData.total ?? 0,
                    runningRuns: allRuns.filter((r) => r.status === "RUNNING").length,
                    totalTargets: Array.isArray(targets) ? targets.length : 0,
                    totalPlans: Array.isArray(plans) ? plans.length : 0,
                    recentRuns: runs,
                    passRate: doneRuns.length > 0 ? (passRuns.length / doneRuns.length) * 100 : 0,
                });
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        load();
        const interval = setInterval(load, 15000);
        return () => clearInterval(interval);
    }, []);

    const exportToPDF = async () => {
        if (!dashboardRef.current) return;
        try {
            const canvas = await html2canvas(dashboardRef.current, { scale: 2 });
            const imgData = canvas.toDataURL("image/png");
            const pdf = new jsPDF("p", "mm", "a4");
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
            pdf.save("synalabs-performance-summary.pdf");
        } catch (err) {
            console.error("Failed to export PDF", err);
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex justify-center items-center h-[60vh]">
                <div className="relative">
                    <div className="size-12 rounded-full border-4 border-slate-200"></div>
                    <div className="absolute top-0 left-0 size-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 sm:space-y-8 animate-in" ref={dashboardRef}>
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mb-1">System Overview</h1>
                    <p className="text-slate-500 text-sm font-medium">Real-time performance intelligence and health telemetry.</p>
                </div>
                <div className="flex items-center gap-2.5">
                    <button onClick={exportToPDF} className="btn-premium bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs">
                        <span className="material-symbols-outlined text-lg">download</span>
                        <span className="hidden sm:inline">Snapshot</span>
                    </button>
                    <Link href="/dashboard/runs" className="btn-primary text-xs">
                        <span className="material-symbols-outlined text-lg">rocket_launch</span>
                        Quick Execute
                    </Link>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {[
                    { label: "Executions", value: stats?.totalRuns ?? 0, icon: "history", sub: "All-time runs", color: "text-blue-500", bg: "bg-blue-50" },
                    { label: "Stability", value: `${stats?.passRate.toFixed(1)}%`, icon: "shield_check", sub: "SLO Pass rate", color: "text-emerald-500", bg: "bg-emerald-50" },
                    { label: "Endpoints", value: stats?.totalTargets ?? 0, icon: "hub", sub: "Production targets", color: "text-violet-500", bg: "bg-violet-50" },
                    { label: "Test Plans", value: stats?.totalPlans ?? 0, icon: "assignment", sub: "Configured scripts", color: "text-amber-500", bg: "bg-amber-50" },
                ].map((kpi, i) => (
                    <div key={i} className="card-premium p-4 sm:p-5 group">
                        <div className="flex items-start justify-between mb-3">
                            <div className={`size-9 sm:size-10 rounded-xl ${kpi.bg} flex items-center justify-center ${kpi.color} transition-all group-hover:scale-110`}>
                                <span className="material-symbols-outlined text-lg sm:text-xl">{kpi.icon}</span>
                            </div>
                            {kpi.label === "Stability" && (
                                <span className="text-[10px] font-bold uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">Optimal</span>
                            )}
                        </div>
                        <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mb-0.5">{kpi.value}</h3>
                        <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-widest">{kpi.label}</p>
                    </div>
                ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Recent Activity */}
                <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                    <div className="card-premium overflow-hidden">
                        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900">Live Activity Feed</h3>
                            <Link href="/dashboard/runs" className="text-xs font-bold text-primary hover:underline">Full History</Link>
                        </div>

                        {/* Mobile: Card view */}
                        <div className="sm:hidden divide-y divide-slate-100">
                            {stats?.recentRuns.map((run) => (
                                <Link key={run.id} href={`/dashboard/runs/${run.id}`} className="flex items-center gap-3 p-4 hover:bg-slate-50/50 transition-colors">
                                    <div className={`size-2.5 rounded-full shrink-0 ${run.status === 'DONE' && run.metricsAgg?.sloPass ? 'bg-green-500' :
                                        run.status === 'RUNNING' ? 'bg-blue-500 animate-pulse' : 'bg-red-500'
                                        }`} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-800 truncate">{run.plan.name}</p>
                                        <p className="text-[11px] text-slate-400 font-medium">{new Date(run.createdAt).toLocaleTimeString()}</p>
                                    </div>
                                    {run.metricsAgg ? (
                                        <span className="text-xs font-mono font-bold text-slate-700">{run.metricsAgg.p95Ms.toFixed(0)}<span className="text-slate-400 text-[10px]">ms</span></span>
                                    ) : (
                                        <span className="text-slate-300">—</span>
                                    )}
                                    <span className="material-symbols-outlined text-slate-300 text-lg">chevron_right</span>
                                </Link>
                            ))}
                            {stats?.recentRuns.length === 0 && (
                                <div className="px-4 py-10 text-center text-slate-400 text-sm italic">No activity detected yet</div>
                            )}
                        </div>

                        {/* Desktop: Table view */}
                        <div className="hidden sm:block overflow-x-auto">
                            <table className="w-full text-left">
                                <tbody className="divide-y divide-slate-100">
                                    {stats?.recentRuns.map((run) => (
                                        <tr key={run.id} className="hover:bg-slate-50/30 transition-colors">
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`size-2 rounded-full shrink-0 ${run.status === 'DONE' && run.metricsAgg?.sloPass ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' :
                                                        run.status === 'RUNNING' ? 'bg-blue-500 animate-pulse' : 'bg-red-500'
                                                        }`} />
                                                    <div className="flex flex-col min-w-0">
                                                        <Link href={`/dashboard/runs/${run.id}`} className="text-sm font-semibold text-slate-800 hover:text-primary transition-colors truncate">
                                                            {run.plan.name}
                                                        </Link>
                                                        <span className="text-[11px] text-slate-400 font-medium">Executed {new Date(run.createdAt).toLocaleTimeString()}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className="text-[11px] font-bold text-slate-500 uppercase bg-slate-100 px-2 py-0.5 rounded">
                                                    {run.target.environment}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4">
                                                {run.metricsAgg ? (
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="text-sm font-mono font-bold text-slate-900">{run.metricsAgg.p95Ms.toFixed(0)}</span>
                                                        <span className="text-[10px] font-medium text-slate-400">ms</span>
                                                    </div>
                                                ) : <span className="text-slate-300 font-bold">—</span>}
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <Link href={`/dashboard/runs/${run.id}`} className="material-symbols-outlined text-slate-300 hover:text-primary transition-colors text-xl">
                                                    open_in_new
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                    {stats?.recentRuns.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-5 py-10 text-center text-slate-400 italic text-sm">No activity detected yet</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Status Column */}
                <div className="space-y-4 sm:space-y-6">
                    <div className="card-premium p-5 sm:p-6 bg-primary shadow-lg shadow-primary/15 text-white border-none relative overflow-hidden">
                        <div className="absolute -right-4 -bottom-4 opacity-10">
                            <span className="material-symbols-outlined text-8xl">analytics</span>
                        </div>
                        <h3 className="text-xs font-bold uppercase tracking-widest mb-5 opacity-80">Health Insights</h3>
                        <div className="space-y-5 relative z-10">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium">Infrastructure Stability</span>
                                    <span className="text-xs font-bold">{stats?.passRate.toFixed(0)}%</span>
                                </div>
                                <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                                    <div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: `${stats?.passRate}%` }} />
                                </div>
                            </div>

                            <div className="bg-white/10 rounded-xl p-3.5 border border-white/10">
                                <p className="text-[11px] font-medium leading-relaxed">
                                    {stats && stats.passRate > 90
                                        ? "System performing within target SLO parameters across all production endpoints."
                                        : "Recent tests indicate increased latency or error rates. Investigation recommended."}
                                </p>
                            </div>

                            <Link href="/dashboard/settings" className="flex items-center justify-center gap-2 p-3 bg-white text-primary rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors shadow-lg">
                                <span className="material-symbols-outlined text-lg">health_and_safety</span>
                                Full Health Check
                            </Link>
                        </div>
                    </div>

                    <div className="card-premium p-5 sm:p-6">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900 mb-3">Active Jobs</h3>
                        {stats?.runningRuns ? (
                            <div className="flex items-center gap-3 text-blue-600 bg-blue-50/50 p-3.5 rounded-xl border border-blue-100">
                                <span className="material-symbols-outlined animate-spin text-xl">sync</span>
                                <span className="text-xs font-bold uppercase tracking-wider">{stats.runningRuns} Executing Now</span>
                            </div>
                        ) : (
                            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider py-3">No background jobs</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
