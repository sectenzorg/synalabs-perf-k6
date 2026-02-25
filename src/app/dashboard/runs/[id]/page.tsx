"use client";
import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
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

    if (loading) return (
        <div className="flex-1 flex justify-center items-center h-[60vh]">
            <div className="relative">
                <div className="size-12 rounded-full border-4 border-slate-200"></div>
                <div className="absolute top-0 left-0 size-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
            </div>
        </div>
    );

    if (!run) return (
        <div className="p-8">
            <div className="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-100 font-bold flex items-center gap-3">
                <span className="material-symbols-outlined">error</span>
                Execution data not found.
            </div>
        </div>
    );

    const m = run.metricsAgg;
    const series = run.metricsSeries.map((s) => ({
        time: new Date(s.bucketTs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        RPS: +s.rps.toFixed(1),
        "p95": +s.p95Ms.toFixed(0),
        "Err": +(s.errorRate * 100).toFixed(1),
    }));

    const statusCodes = m ? Object.entries(m.statusCodes as Record<string, number>).sort(([, a], [, b]) => b - a) : [];

    async function cancel() {
        await fetch(`/api/runs/${id}/cancel`, { method: "POST" });
        load();
    }

    return (
        <div className="space-y-8 animate-in pb-20">
            {/* Header Card */}
            <div className="card-premium p-6 md:p-8 flex flex-col md:flex-row justify-between gap-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <Link href="/dashboard/runs" className="text-xs font-black text-slate-400 hover:text-primary transition-colors flex items-center gap-1 uppercase tracking-widest">
                            <span className="material-symbols-outlined text-sm">arrow_back</span>
                            Back
                        </Link>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${run.status === 'DONE' ? 'bg-green-50 text-green-600 border border-green-100' :
                                run.status === 'RUNNING' ? 'bg-blue-50 text-blue-600 border border-blue-100 animate-pulse' :
                                    'bg-slate-100 text-slate-500'
                            }`}>
                            {run.status}
                        </span>
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex flex-wrap items-center gap-x-3">
                            {run.target.name}
                            <span className="text-slate-300 material-symbols-outlined">chevron_right</span>
                            <span className="text-primary">{run.plan.name}</span>
                        </h1>
                        <div className="flex flex-wrap items-center gap-y-2 gap-x-6 mt-3 text-sm text-slate-500 font-medium">
                            <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-sm text-slate-400">api</span> {run.plan.method} {run.plan.path}</span>
                            <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-sm text-slate-400">calendar_today</span> {new Date(run.createdAt).toLocaleString()}</span>
                            <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-sm text-slate-400">person</span> {run.triggeredBy.username}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-start gap-3">
                    {run.status === "RUNNING" && (
                        <button onClick={cancel} className="bg-red-50 text-red-600 border border-red-100 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-100 transition-colors flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">stop_circle</span>
                            Abort
                        </button>
                    )}
                    <button className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-colors flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">download</span>
                        Export
                    </button>
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {[
                    { label: "Requests", value: m?.totalRequests?.toLocaleString() ?? "—", icon: "data_usage" },
                    { label: "Avg RPS", value: m ? m.avgRps.toFixed(1) : "—", icon: "bolt" },
                    { label: "p50 Latency", value: m ? `${m.p50Ms.toFixed(0)}ms` : "—", icon: "timer" },
                    { label: "p95 Latency", value: m ? `${m.p95Ms.toFixed(0)}ms` : "—", icon: "speed", color: m && run.plan.sloP95Ms && m.p95Ms > run.plan.sloP95Ms ? "text-red-500" : "" },
                    { label: "Error Rate", value: m ? `${(m.errorRate * 100).toFixed(2)}%` : "—", icon: "error_outline", color: m && m.errorRate > 0.05 ? "text-red-500" : "text-green-500" },
                    { label: "SLO Pass", value: m ? (m.sloPass ? "PASS" : "FAIL") : "—", icon: "verified", badge: m?.sloPass },
                ].map((kpi, i) => (
                    <div key={i} className="card-premium p-5 flex flex-col justify-between group overflow-hidden relative">
                        <div className="absolute -right-2 -top-2 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                            <span className="material-symbols-outlined text-5xl">{kpi.icon}</span>
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{kpi.label}</span>
                        <div className="flex items-baseline gap-1">
                            {kpi.badge !== undefined ? (
                                <span className={`px-2 py-0.5 rounded font-black text-xs ${kpi.badge ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {kpi.value}
                                </span>
                            ) : (
                                <span className={`text-xl font-black font-mono tracking-tight ${kpi.color}`}>{kpi.value}</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="space-y-6">
                <div className="flex items-center gap-8 border-b border-slate-200 px-2 transition-all">
                    {[
                        { id: "overview", label: "Overview", icon: "grid_view" },
                        { id: "insights", label: "Insights", icon: "psychology" },
                        { id: "logs", label: "Output Logs", icon: "terminal" },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 py-4 text-xs font-black uppercase tracking-[0.15em] relative transition-colors ${activeTab === tab.id ? 'text-primary' : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            <span className="material-symbols-outlined text-lg">{tab.icon}</span>
                            {tab.label}
                            {activeTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary animate-in" />}
                        </button>
                    ))}
                </div>

                <div className="animate-in">
                    {activeTab === "overview" && (
                        <div className="grid lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 space-y-8">
                                <div className="card-premium p-6">
                                    <div className="flex items-center justify-between mb-8">
                                        <h3 className="font-black text-sm uppercase tracking-widest text-slate-900 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-primary">monitoring</span>
                                            Traffic & Latency
                                        </h3>
                                        <div className="flex gap-4">
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase"><span className="size-2 rounded-full bg-primary" /> RPS</div>
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase"><span className="size-2 rounded-full bg-accent" /> p95</div>
                                        </div>
                                    </div>
                                    {series.length > 0 ? (
                                        <div className="h-[300px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={series}>
                                                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                                                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} minTickGap={40} />
                                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} />
                                                    <Tooltip
                                                        contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                                    />
                                                    <Line type="monotone" dataKey="RPS" stroke="#3b82f6" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                                                    <Line type="monotone" dataKey="p95" stroke="#8b5cf6" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    ) : (
                                        <div className="h-[300px] flex flex-col items-center justify-center text-slate-300">
                                            <span className="material-symbols-outlined text-5xl mb-2 animate-pulse">show_chart</span>
                                            <p className="text-xs font-bold uppercase tracking-widest">Collecting data...</p>
                                        </div>
                                    )}
                                </div>

                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="card-premium p-6">
                                        <h3 className="font-black text-sm uppercase tracking-widest text-slate-900 mb-4">Response Codes</h3>
                                        <div className="space-y-4">
                                            {statusCodes.map(([code, count]) => (
                                                <div key={code} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <span className={`size-2 rounded-full ${code.startsWith('2') ? 'bg-green-500' : 'bg-red-500'}`} />
                                                        <span className="text-sm font-black text-slate-800 font-mono">{code}</span>
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-500">{count.toLocaleString()}</span>
                                                </div>
                                            ))}
                                            {statusCodes.length === 0 && <p className="text-xs text-slate-400 font-bold uppercase py-4">No requests logged</p>}
                                        </div>
                                    </div>
                                    <div className="card-premium p-6">
                                        <h3 className="font-black text-sm uppercase tracking-widest text-slate-900 mb-4">Failures</h3>
                                        <div className="space-y-4">
                                            {m?.topErrors.slice(0, 3).map((err, i) => (
                                                <div key={i} className="flex flex-col gap-1">
                                                    <span className="text-xs font-bold text-slate-700 truncate" title={err.msg}>{err.msg}</span>
                                                    <span className="text-[10px] font-black text-red-500 uppercase">{err.count} hits</span>
                                                </div>
                                            ))}
                                            {(!m || m.topErrors.length === 0) && <p className="text-xs text-green-500 font-bold uppercase py-4">0 errors detected</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="card-premium p-6 bg-slate-50/50 border-dashed">
                                    <h3 className="font-black text-sm uppercase tracking-widest text-slate-900 mb-6">Execution Config</h3>
                                    <div className="space-y-5">
                                        {[
                                            { label: "Environment", value: run.target.environment, icon: "cloud" },
                                            { label: "VUs / Intensity", value: `${run.vusOverride ?? run.plan.vus} Load`, icon: "groups" },
                                            { label: "Planned Window", value: `${run.durationOverride ?? run.plan.duration} Seconds`, icon: "timer" },
                                            { label: "SLO Limit", value: `${run.plan.sloP95Ms}ms p95`, icon: "verified_user" },
                                        ].map((item, i) => (
                                            <div key={i} className="flex items-center gap-4">
                                                <div className="size-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                                                    <span className="material-symbols-outlined text-lg">{item.icon}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</span>
                                                    <span className="text-sm font-bold text-slate-800">{item.value}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "insights" && (
                        <div className="max-w-3xl mx-auto space-y-4">
                            {run.insights.map(ins => (
                                <div key={ins.id} className="card-premium p-6 flex gap-4 animate-in">
                                    <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${ins.level === 'ERROR' ? 'bg-red-50 text-red-600' :
                                            ins.level === 'WARNING' ? 'bg-amber-50 text-amber-600' :
                                                'bg-blue-50 text-blue-600'
                                        }`}>
                                        <span className="material-symbols-outlined text-xl">
                                            {ins.level === 'ERROR' ? 'error' : ins.level === 'WARNING' ? 'warning' : 'info'}
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-black text-slate-900">{ins.message}</h4>
                                            <span className="text-[10px] font-black uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded text-slate-500">{ins.category}</span>
                                        </div>
                                        <p className="text-sm text-slate-500 leading-relaxed font-medium">{ins.detail}</p>
                                    </div>
                                </div>
                            ))}
                            {run.insights.length === 0 && (
                                <div className="text-center py-20">
                                    <span className="material-symbols-outlined text-4xl text-slate-200 mb-4 animate-pulse">psychology</span>
                                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Analyzing execution patterns...</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "logs" && (
                        <div className="card-premium overflow-hidden bg-slate-950 border-none shadow-premium animate-in">
                            <div className="bg-slate-900 px-4 py-3 flex items-center justify-between border-b border-white/5">
                                <div className="flex items-center gap-2">
                                    <div className="flex gap-1.5">
                                        <div className="size-2.5 rounded-full bg-red-500/50" />
                                        <div className="size-2.5 rounded-full bg-amber-500/50" />
                                        <div className="size-2.5 rounded-full bg-green-500/50" />
                                    </div>
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Console Output</span>
                                </div>
                                <button onClick={loadLogs} className="text-[10px] font-black text-primary uppercase tracking-widest hover:text-white transition-colors">Refresh</button>
                            </div>
                            <div className="p-6 h-[500px] overflow-y-auto custom-scrollbar font-mono text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                                {logs || "Initializing worker stream..."}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
