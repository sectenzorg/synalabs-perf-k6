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
                const allRunsRes = await fetch("/api/runs?limit=100");
                const allRunsData = await allRunsRes.json();
                const allRuns: any[] = allRunsData.runs ?? [];
                const doneRuns = allRuns.filter((r) => r.status === "DONE");
                const passRuns = doneRuns.filter((r) => r.metricsAgg?.sloPass);

                setStats({
                    totalRuns: runsData.total ?? 0,
                    runningRuns: allRuns.filter((r) => r.status === "RUNNING" || r.status === "QUEUED").length,
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
        const interval = setInterval(load, 10000);
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
            pdf.save("synalabs-performance-report.pdf");
        } catch (err) {
            console.error("Failed to export PDF", err);
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden" ref={dashboardRef}>
            {/* Header */}
            <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-8 shrink-0">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Dashboard Overview</h2>
                    <span className="px-2 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-bold uppercase tracking-wider">Live</span>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={exportToPDF} className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                        <span className="material-symbols-outlined text-lg">download</span>
                        Export PDF
                    </button>
                    <Link href="/dashboard/runs" className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-primary/90 transition-colors">
                        <span className="material-symbols-outlined text-lg">add</span>
                        New Run
                    </Link>
                </div>
            </header>

            {/* Scrollable Area */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="flex items-start justify-between mb-4">
                            <p className="text-sm font-medium text-slate-500">Total Runs</p>
                            <span className="material-symbols-outlined text-primary bg-primary/10 p-2 rounded-lg">rocket_launch</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.totalRuns ?? 0}</h3>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">All time</p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="flex items-start justify-between mb-4">
                            <p className="text-sm font-medium text-slate-500">Success Rate</p>
                            <span className="material-symbols-outlined text-green-500 bg-green-500/10 p-2 rounded-lg">check_circle</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.passRate.toFixed(1) ?? 0}%</h3>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">SLO Pass Rate</p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="flex items-start justify-between mb-4">
                            <p className="text-sm font-medium text-slate-500">Active Test Plans</p>
                            <span className="material-symbols-outlined text-orange-500 bg-orange-500/10 p-2 rounded-lg">assignment</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.totalPlans ?? 0}</h3>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">Ready for execution</p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="flex items-start justify-between mb-4">
                            <p className="text-sm font-medium text-slate-500">Targets Configured</p>
                            <span className="material-symbols-outlined text-purple-500 bg-purple-500/10 p-2 rounded-lg">hub</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.totalTargets ?? 0}</h3>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">Active registered domains</p>
                    </div>
                </div>

                {/* Main Dashboard Layout (Chart + Insights) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Activity Feed / Chart Space */}
                    <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex flex-col items-center justify-center min-h-[300px] bg-slate-50/50 dark:bg-slate-900/50 relative overflow-hidden">
                        <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-700 mb-2">monitoring</span>
                        <p className="text-sm font-medium text-slate-500 text-center">Export reports or use Grafana for detailed visualization charts</p>
                    </div>

                    {/* Insights Hub */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex flex-col">
                        <h3 className="font-bold text-slate-900 dark:text-white mb-4">Performance Insights</h3>
                        <div className="space-y-4 flex-1">
                            {((stats?.passRate ?? 0) < 80) ? (
                                <div className="flex gap-3 items-start p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-lg">
                                    <span className="material-symbols-outlined text-red-500">warning</span>
                                    <div>
                                        <p className="text-xs font-bold text-red-700 dark:text-red-400">Low SLO Pass Rate</p>
                                        <p className="text-[11px] text-red-600 dark:text-red-300/70 mt-1">Your overall success rate has dropped below optimal levels. Check recent failures.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex gap-3 items-start p-3 bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/20 rounded-lg">
                                    <span className="material-symbols-outlined text-green-500">verified</span>
                                    <div>
                                        <p className="text-xs font-bold text-green-700 dark:text-green-400">Healthy Infrastructure</p>
                                        <p className="text-[11px] text-green-600 dark:text-green-300/70 mt-1">SLO pass rates reflect stable performance outcomes across your recent tests.</p>
                                    </div>
                                </div>
                            )}

                            {stats?.runningRuns ? (
                                <div className="flex gap-3 items-start p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 rounded-lg">
                                    <span className="material-symbols-outlined text-blue-500">running_with_errors</span>
                                    <div>
                                        <p className="text-xs font-bold text-blue-700 dark:text-blue-400">Tests Running</p>
                                        <p className="text-[11px] text-blue-600 dark:text-blue-300/70 mt-1">There are {stats.runningRuns} tests actively running.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex gap-3 items-start p-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg">
                                    <span className="material-symbols-outlined text-slate-500">mode_standby</span>
                                    <div>
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Run idle</p>
                                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">No tests currently running right now.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Recent Activity Table */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white">Recent Activity</h3>
                            <p className="text-sm text-slate-500">Latest execution results from your test plans</p>
                        </div>
                        <Link href="/dashboard/runs" className="text-primary text-sm font-bold hover:underline">View All</Link>
                    </div>

                    {stats?.recentRuns.length === 0 ? (
                        <div className="p-12 text-center flex flex-col items-center">
                            <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">inbox</span>
                            <p className="text-slate-500 font-medium">No recent activities found.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Test Plan</th>
                                        <th className="px-6 py-4">Target</th>
                                        <th className="px-6 py-4">Avg Latency</th>
                                        <th className="px-6 py-4">Error Rate</th>
                                        <th className="px-6 py-4 text-right">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                    {stats?.recentRuns.map((run) => (
                                        <tr key={run.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-6 py-4">
                                                {run.status === "DONE" && run.metricsAgg?.sloPass ? (
                                                    <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                                                        <div className="size-2 rounded-full bg-current"></div>
                                                        <span className="text-xs font-bold">Passed</span>
                                                    </div>
                                                ) : run.status === "RUNNING" ? (
                                                    <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                                                        <div className="size-2 rounded-full bg-current animate-pulse"></div>
                                                        <span className="text-xs font-bold">Running</span>
                                                    </div>
                                                ) : run.status === "FAILED" || (run.status === "DONE" && !run.metricsAgg?.sloPass) ? (
                                                    <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
                                                        <div className="size-2 rounded-full bg-current"></div>
                                                        <span className="text-xs font-bold">Failed</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1.5 text-slate-500">
                                                        <div className="size-2 rounded-full bg-current"></div>
                                                        <span className="text-xs font-bold">{run.status}</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <Link href={`/dashboard/runs/${run.id}`} className="text-sm font-bold text-slate-900 dark:text-white hover:text-primary">
                                                    {run.plan?.name || "Unnamed Test"}
                                                </Link>
                                                {run.label && <p className="text-[10px] text-slate-400 uppercase tracking-widest">{run.label}</p>}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs font-medium bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                                                    {run.target?.name || "Unknown Target"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium">
                                                {run.metricsAgg ? `${Math.round(run.metricsAgg.p95Ms)}ms` : "—"}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium">
                                                {run.metricsAgg ? `${(run.metricsAgg.errorRate * 100).toFixed(2)}%` : "—"}
                                            </td>
                                            <td className="px-6 py-4 text-right text-xs text-slate-500">
                                                {new Date(run.createdAt).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
