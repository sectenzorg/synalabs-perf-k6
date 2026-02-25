"use client";
import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

interface RunDetail {
    id: string; status: string; label?: string;
    createdAt: string; startedAt?: string; finishedAt?: string;
    vusOverride?: number; durationOverride?: number;
    target: { name: string; baseUrl: string; environment: string };
    plan: { name: string; method: string; path: string; vus: number; duration: number; sloP95Ms?: number; sloErrorPct?: number };
    triggeredBy: { username: string };
    metricsAgg?: {
        totalRequests: number; errorRate: number;
        p50Ms: number; p95Ms: number; p99Ms: number;
        avgRps: number; durationSec: number;
        statusCodes: Record<string, number>;
        topErrors: Array<{ msg: string; count: number }>;
        sloPass: boolean;
    };
    metricsSeries: Array<{ bucketTs: string; rps: number; p95Ms: number; errorRate: number; activeVus: number }>;
    insights: Array<{ id: string; level: string; category: string; message: string; detail?: string }>;
}

export default function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [run, setRun] = useState<RunDetail | null>(null);
    const [logs, setLogs] = useState("");
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("overview");

    const load = useCallback(async () => {
        const res = await fetch(`/api/runs/${id}`);
        if (res.ok) setRun(await res.json());
        setLoading(false);
    }, [id]);

    const loadLogs = useCallback(async () => {
        const res = await fetch(`/api/runs/${id}/logs`);
        if (res.ok) { const d = await res.json(); setLogs(d.logs ?? ""); }
    }, [id]);

    useEffect(() => { load(); }, [load]);

    // Auto-refresh when running
    useEffect(() => {
        if (!run) return;
        if (run.status !== "RUNNING" && run.status !== "QUEUED") return;
        const t = setInterval(() => { load(); loadLogs(); }, 3000);
        return () => clearInterval(t);
    }, [run, load, loadLogs]);

    useEffect(() => {
        if (activeTab === "logs") loadLogs();
    }, [activeTab, loadLogs]);

    if (loading) return (
        <div className="flex-1 flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
    );

    if (!run) return (
        <div className="flex-1 p-8">
            <div className="bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 p-4 rounded-lg border border-red-100 dark:border-red-900/20 font-medium flex items-center gap-3">
                <span className="material-symbols-outlined">error</span>
                Run not found.
            </div>
        </div>
    );

    const m = run.metricsAgg;
    const series = run.metricsSeries.map((s) => ({
        time: new Date(s.bucketTs).toLocaleTimeString(),
        RPS: +s.rps.toFixed(2),
        "p95 (ms)": +s.p95Ms.toFixed(1),
        "Err%": +(s.errorRate * 100).toFixed(2),
    }));

    const statusCodes = m ? Object.entries(m.statusCodes as Record<string, number>).sort(([, a], [, b]) => b - a) : [];

    async function cancel() {
        await fetch(`/api/runs/${id}/cancel`, { method: "POST" });
        load();
    }

    return (
        <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden text-slate-900 dark:text-slate-100 font-display">
            {/* Header */}
            <header className="px-8 py-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Link href="/dashboard/runs" className="text-sm font-bold text-slate-500 hover:text-primary transition-colors flex items-center gap-1">
                                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                                Back to Runs
                            </Link>
                            <span className="text-slate-300 dark:text-slate-700">|</span>
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${run.status === 'DONE' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                    run.status === 'RUNNING' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 animate-pulse' :
                                        run.status === 'FAILED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                            run.status === 'CANCELED' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                                                'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                }`}>
                                {run.status === 'RUNNING' && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5 animate-ping"></span>}
                                {run.status}
                            </span>
                            {run.label && <span className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">{run.label}</span>}
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                            {run.target.name} <span className="text-slate-400 font-normal material-symbols-outlined text-lg">chevron_right</span> {run.plan.name}
                        </h1>
                        <p className="text-sm text-slate-500 flex items-center gap-x-3 flex-wrap">
                            <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px]">api</span> {run.plan.method} {run.target.baseUrl}{run.plan.path}</span>
                            <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px]">person</span> {run.triggeredBy.username}</span>
                            <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px]">schedule</span> {new Date(run.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {(run.status === "RUNNING" || run.status === "QUEUED") && (
                            <button onClick={cancel} className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 hover:dark:bg-red-900/40 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors">
                                <span className="material-symbols-outlined text-[18px]">stop_circle</span>
                                Cancel Run
                            </button>
                        )}
                        {(run.status === "DONE" || run.status === "FAILED") && (
                            <a href={`/api/runs/${id}/report`} target="_blank" rel="noopener noreferrer" className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-primary hover:text-primary px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors">
                                <span className="material-symbols-outlined text-[18px]">sim_card_download</span>
                                Export Report
                            </a>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar space-y-8 bg-slate-50/50 dark:bg-transparent">

                {/* KPI Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-4">
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="material-symbols-outlined text-4xl text-primary">data_usage</span>
                        </div>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Requests</span>
                        <span className="text-xl md:text-2xl font-black text-slate-900 dark:text-white font-mono">{m?.totalRequests?.toLocaleString() ?? "—"}</span>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="material-symbols-outlined text-4xl text-primary">bolt</span>
                        </div>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Avg RPS</span>
                        <span className="text-xl md:text-2xl font-black text-slate-900 dark:text-white font-mono">{m ? m.avgRps.toFixed(1) : "—"}</span>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="material-symbols-outlined text-4xl text-primary">timer</span>
                        </div>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">p50 Latency</span>
                        <span className="text-xl md:text-2xl font-black text-slate-900 dark:text-white font-mono">{m ? `${m.p50Ms.toFixed(0)} ms` : "—"}</span>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="material-symbols-outlined text-4xl text-primary">speed</span>
                        </div>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">p95 Latency</span>
                        <span className={`text-xl md:text-2xl font-black font-mono ${m && run.plan.sloP95Ms && m.p95Ms > run.plan.sloP95Ms ? "text-red-500" : "text-slate-900 dark:text-white"}`}>
                            {m ? `${m.p95Ms.toFixed(0)} ms` : "—"}
                        </span>
                        {run.plan.sloP95Ms && <span className="text-[10px] text-slate-400 mt-1">SLO: &lt; {run.plan.sloP95Ms}ms</span>}
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="material-symbols-outlined text-4xl text-primary">rocket</span>
                        </div>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">p99 Latency</span>
                        <span className="text-xl md:text-2xl font-black text-slate-900 dark:text-white font-mono">{m ? `${m.p99Ms.toFixed(0)} ms` : "—"}</span>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="material-symbols-outlined text-4xl text-primary">error</span>
                        </div>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Error Rate</span>
                        <span className={`text-xl md:text-2xl font-black font-mono ${m && m.errorRate > 0.05 ? "text-red-500" : (m && m.errorRate === 0 ? "text-green-500" : "text-slate-900 dark:text-white")}`}>
                            {m ? `${(m.errorRate * 100).toFixed(2)}%` : "—"}
                        </span>
                        {run.plan.sloErrorPct != null && <span className="text-[10px] text-slate-400 mt-1">SLO: &lt; {run.plan.sloErrorPct}%</span>}
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="material-symbols-outlined text-4xl text-primary">hourglass_empty</span>
                        </div>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Duration</span>
                        <span className="text-xl md:text-2xl font-black text-slate-900 dark:text-white font-mono">{m ? `${m.durationSec.toFixed(0)}s` : "—"}</span>
                    </div>
                    <div className={`p-4 rounded-xl border shadow-sm flex flex-col justify-center items-center text-center relative overflow-hidden group ${!m ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800' :
                            m.sloPass ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30' :
                                'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30'
                        }`}>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 z-10 w-full text-left">SLO Status</span>
                        <div className="flex-1 flex items-center justify-center w-full">
                            {m != null ? (
                                <div className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border font-black text-sm uppercase tracking-wider ${m.sloPass
                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800'
                                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
                                    }`}>
                                    <span className="material-symbols-outlined text-lg">{m.sloPass ? 'check_circle' : 'cancel'}</span>
                                    {m.sloPass ? "PASS" : "FAIL"}
                                </div>
                            ) : <span className="text-slate-400">—</span>}
                        </div>
                    </div>
                </div>

                {/* Tabs Area */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden flex flex-col min-h-0">
                    <div className="flex bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 shrink-0 overflow-x-auto">
                        {[
                            { id: "overview", label: "Overview", icon: "dashboard" },
                            { id: "charts", label: "Charts", icon: "monitoring" },
                            { id: "insights", label: "Insights", icon: "lightbulb" },
                            { id: "logs", label: "Live Logs", icon: "terminal" }
                        ].map(({ id, label, icon }) => (
                            <button
                                key={id}
                                className={`flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === id
                                        ? "border-primary text-primary bg-white dark:bg-slate-900"
                                        : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                                    }`}
                                onClick={() => setActiveTab(id)}
                            >
                                <span className={`material-symbols-outlined text-[18px] ${activeTab === id ? 'text-primary' : 'text-slate-400'}`}>{icon}</span>
                                {label}
                            </button>
                        ))}
                    </div>

                    <div className="p-6 overflow-y-auto">
                        {/* Overview Tab */}
                        {activeTab === "overview" && (
                            <div className="flex flex-col lg:flex-row gap-6">
                                <div className="flex-1 space-y-6">
                                    <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                                        <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3 border-b border-slate-200 dark:border-slate-800">
                                            <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                                                <span className="material-symbols-outlined text-primary text-[18px]">dns</span>
                                                Status Code Distribution
                                            </h3>
                                        </div>
                                        {statusCodes.length === 0 ? (
                                            <div className="p-8 text-center text-sm text-slate-500">No data yet</div>
                                        ) : (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-sm">
                                                    <thead className="bg-slate-50 dark:bg-slate-800/30 text-xs text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                                                        <tr>
                                                            <th className="px-4 py-3 font-bold">Status Code</th>
                                                            <th className="px-4 py-3 font-bold text-right">Count</th>
                                                            <th className="px-4 py-3 font-bold text-right">% of Total</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                        {statusCodes.map(([code, count]) => {
                                                            const isError = parseInt(code) >= 400;
                                                            return (
                                                                <tr key={code} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                                                    <td className="px-4 py-3">
                                                                        <span className={`inline-flex items-center justify-center px-2 py-1 rounded text-xs font-bold ${isError ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                                            }`}>
                                                                            {code}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-4 py-3 font-mono text-right text-slate-700 dark:text-slate-300">{count.toLocaleString()}</td>
                                                                    <td className="px-4 py-3 font-mono text-right text-slate-500">
                                                                        <div className="flex items-center justify-end gap-2">
                                                                            <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                                                <div className={`h-full ${isError ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${m ? ((count / m.totalRequests) * 100) : 0}%` }}></div>
                                                                            </div>
                                                                            <span className="w-10">{m ? ((count / m.totalRequests) * 100).toFixed(1) : 0}%</span>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>

                                    {m && m.topErrors.length > 0 && (
                                        <div className="border border-red-200 dark:border-red-900/30 rounded-lg overflow-hidden bg-red-50/30 dark:bg-red-900/5">
                                            <div className="bg-red-50 dark:bg-red-900/20 px-4 py-3 border-b border-red-100 dark:border-red-900/30">
                                                <h3 className="font-bold text-sm text-red-800 dark:text-red-400 flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-[18px]">bug_report</span>
                                                    Top Errors
                                                </h3>
                                            </div>
                                            <div className="p-4 space-y-3">
                                                {(m.topErrors as any[]).slice(0, 5).map((e: any, i: number) => (
                                                    <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white dark:bg-slate-900 border border-red-100 dark:border-red-900/20 rounded shadow-sm">
                                                        <span className="text-sm text-slate-700 dark:text-slate-300 font-mono break-all line-clamp-2" title={e.msg}>{e.msg}</span>
                                                        <span className="inline-flex items-center px-2 py-1 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs font-bold whitespace-nowrap self-start sm:self-auto">
                                                            {e.count} occurrences
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="w-full lg:w-80 shrink-0 space-y-6">
                                    <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                                        <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3 border-b border-slate-200 dark:border-slate-800">
                                            <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                                                <span className="material-symbols-outlined text-primary text-[18px]">settings</span>
                                                Test Configuration
                                            </h3>
                                        </div>
                                        <div className="p-4 space-y-3">
                                            {[
                                                { label: "Environment", value: run.target.environment, icon: "cloud" },
                                                { label: "Target API", value: run.target.name, icon: "api" },
                                                { label: "Base URL", value: run.target.baseUrl, icon: "link", copy: true },
                                                { label: "Endpoint", value: `${run.plan.method} ${run.plan.path}`, icon: "route" },
                                                { label: "Load Profile", value: `${run.vusOverride ?? run.plan.vus} VUs × ${run.durationOverride ?? run.plan.duration}s`, icon: "tune" },
                                            ].map((item, i) => (
                                                <div key={i} className="flex flex-col gap-1 pb-3 border-b border-slate-100 dark:border-slate-800 last:border-0 last:pb-0">
                                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                                        <span className="material-symbols-outlined text-[14px] text-slate-400">{item.icon}</span>
                                                        {item.label}
                                                    </span>
                                                    <div className="flex items-center justify-between gap-2 pl-5">
                                                        <span className="text-sm font-medium text-slate-900 dark:text-slate-200 truncate" title={item.value}>{item.value}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Charts Tab */}
                        {activeTab === "charts" && (
                            <div className="space-y-6">
                                {series.length === 0 ? (
                                    <div className="py-20 flex flex-col items-center justify-center text-center">
                                        <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-700 mb-4">monitoring</span>
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No time-series data yet</h3>
                                        <p className="text-sm text-slate-500 max-w-sm">Charts will populate dynamically as the test progresses. Check back in a few moments.</p>
                                    </div>
                                ) : (
                                    <>
                                        {[
                                            { key: "RPS", color: "#3b82f6", label: "Requests per Second (RPS)", icon: "bolt" },
                                            { key: "p95 (ms)", color: "#8b5cf6", label: "p95 Latency (ms)", icon: "speed" },
                                            { key: "Err%", color: "#ef4444", label: "Error Rate (%)", icon: "error" },
                                        ].map(({ key, color, label, icon }) => (
                                            <div key={key} className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-900">
                                                <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                                                    <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                                                        <span className="material-symbols-outlined text-[18px]" style={{ color }}>{icon}</span>
                                                        {label}
                                                    </h3>
                                                </div>
                                                <div className="p-4 bg-slate-50/30 dark:bg-transparent">
                                                    <ResponsiveContainer width="100%" height={240}>
                                                        <LineChart data={series} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-200 dark:text-slate-800" />
                                                            <XAxis dataKey="time" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={30} stroke="currentColor" className="text-slate-400" />
                                                            <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} stroke="currentColor" className="text-slate-400" />
                                                            <Tooltip
                                                                contentStyle={{ background: "rgba(15, 23, 42, 0.9)", border: "none", borderRadius: "8px", color: "white", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)", backdropFilter: "blur(4px)" }}
                                                                itemStyle={{ fontSize: "14px", fontWeight: "bold" }}
                                                                labelStyle={{ color: "#94a3b8", fontSize: "12px", marginBottom: "4px" }}
                                                            />
                                                            <Line type="monotone" dataKey={key} stroke={color} dot={false} strokeWidth={2.5} activeDot={{ r: 6, strokeWidth: 0 }} />
                                                        </LineChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>
                                        ))}
                                    </>
                                )}
                            </div>
                        )}

                        {/* Insights Tab */}
                        {activeTab === "insights" && (
                            <div className="max-w-4xl mx-auto">
                                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">psychology</span>
                                    AI-Powered Performance Insights
                                </h3>
                                {run.insights.length === 0 ? (
                                    <div className="bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 rounded-lg p-8 text-center flex flex-col items-center">
                                        <span className="material-symbols-outlined text-4xl text-slate-400 mb-3 animate-pulse">model_training</span>
                                        <p className="text-slate-600 dark:text-slate-400 text-sm max-w-md">Insights are analyzing your test results in real-time. Actionable recommendations will appear here once significant patterns are detected or the run completes.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {run.insights.map((ins) => {
                                            const colors = {
                                                ERROR: "border-red-200 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10 text-red-800 dark:text-red-300",
                                                WARNING: "border-amber-200 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-900/10 text-amber-800 dark:text-amber-300",
                                                SUCCESS: "border-green-200 dark:border-green-900/30 bg-green-50/50 dark:bg-green-900/10 text-green-800 dark:text-green-300",
                                                INFO: "border-blue-200 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-900/10 text-blue-800 dark:text-blue-300",
                                            }[ins.level] || "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/10 text-slate-800 dark:text-slate-300";

                                            const icon = {
                                                ERROR: "error", WARNING: "warning", SUCCESS: "check_circle", INFO: "info"
                                            }[ins.level] || "lightbulb";

                                            return (
                                                <div key={ins.id} className={`p-4 rounded-lg border ${colors} flex items-start gap-4 transition-all hover:shadow-sm`}>
                                                    <span className="material-symbols-outlined mt-0.5">{icon}</span>
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between gap-2 mb-1">
                                                            <h4 className="font-bold text-sm">{ins.message}</h4>
                                                            <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded">{ins.category}</span>
                                                        </div>
                                                        {ins.detail && <p className="text-sm opacity-90 leading-relaxed mt-2 p-3 bg-white/50 dark:bg-black/20 rounded border border-white/20 dark:border-black/20">{ins.detail}</p>}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Logs Tab */}
                        {activeTab === "logs" && (
                            <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-slate-950 flex flex-col" style={{ height: "600px" }}>
                                <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between shrink-0">
                                    <div className="flex items-center gap-2">
                                        <span className="w-3 h-3 rounded-full bg-red-500"></span>
                                        <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                                        <span className="w-3 h-3 rounded-full bg-green-500"></span>
                                        <span className="ml-2 text-xs font-mono text-slate-400">k6-worker.log</span>
                                    </div>
                                    <button onClick={loadLogs} className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors">
                                        <span className="material-symbols-outlined text-[14px]">refresh</span> Refresh
                                    </button>
                                </div>
                                <div className="p-4 overflow-y-auto font-mono text-xs sm:text-sm text-slate-300 whitespace-pre-wrap leading-relaxed flex-1 custom-scrollbar">
                                    {logs || (
                                        <div className="flex flex-col items-center justify-center h-full text-slate-600 space-y-2">
                                            <span className="material-symbols-outlined text-3xl animate-pulse">terminal</span>
                                            <span>Waiting for execution output...</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
