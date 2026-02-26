"use client";
import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from "recharts";

interface RunDetail {
    id: string; status: string; label?: string;
    createdAt: string; startedAt?: string; finishedAt?: string;
    vusOverride?: number; durationOverride?: number;
    target: { name: string; baseUrl: string; environment: string; authType: string };
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

    useEffect(() => {
        if (!run) return;
        if (run.status !== "RUNNING" && run.status !== "QUEUED") return;
        const t = setInterval(() => { load(); loadLogs(); }, 3000);
        return () => clearInterval(t);
    }, [run, load, loadLogs]);

    if (loading) return (
        <div className="flex-1 flex flex-col justify-center items-center h-[60vh] gap-6 animate-pulse">
            <div className="relative size-24">
                <div className="absolute inset-0 rounded-full border-[6px] border-slate-100"></div>
                <div className="absolute inset-0 rounded-full border-[6px] border-primary border-t-transparent animate-spin"></div>
                <div className="absolute inset-4 rounded-full bg-slate-50 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-3xl">terminal</span>
                </div>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Synchronizing Telemetry...</p>
        </div>
    );

    if (!run) return (
        <div className="p-8">
            <div className="bg-red-50 text-red-600 p-8 rounded-[2rem] border border-red-100 font-bold flex items-center gap-6 shadow-2xl shadow-red-500/10">
                <span className="material-symbols-outlined text-4xl">warning_amber</span>
                <div className="space-y-1">
                    <h3 className="text-xl">Execution Context Invalid</h3>
                    <p className="opacity-60 text-sm font-medium italic">Target run ID {id} not found in historical registry.</p>
                </div>
            </div>
        </div>
    );

    const m = run.metricsAgg;
    const series = run.metricsSeries.map((s) => ({
        time: new Date(s.bucketTs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        RPS: +s.rps.toFixed(1),
        "p95": +s.p95Ms.toFixed(0),
        "Err": +(s.errorRate * 100).toFixed(1),
        "VUs": s.activeVus,
    }));

    const statusCodes = m ? Object.entries(m.statusCodes as Record<string, number>).sort(([, a], [, b]) => b - a) : [];

    async function cancel() {
        if (!confirm("Terminate operational sequence immediately?")) return;
        await fetch(`/api/runs/${id}/cancel`, { method: "POST" });
        load();
    }

    return (
        <div className="space-y-8 animate-in pb-20">
            {/* Header */}
            <div className="card-premium p-8 lg:p-10 flex flex-col lg:flex-row justify-between gap-8 bg-white border-slate-100 shadow-xl shadow-slate-200/20">
                <div className="space-y-6 min-w-0">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard/runs" className="size-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-sky-600 transition-all border border-slate-100">
                            <span className="material-symbols-outlined">arrow_back</span>
                        </Link>
                        <div className="flex gap-2">
                            <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${run.status === 'DONE' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                run.status === 'RUNNING' ? 'bg-sky-50 text-sky-600 border-sky-100 animate-pulse' :
                                    'bg-slate-50 text-slate-500 border-slate-100'
                                }`}>
                                {run.status}
                            </span>
                            {m && (
                                <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${m.sloPass ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-rose-500 text-white border-rose-500'
                                    }`}>
                                    {m.sloPass ? 'SLA Passed' : 'SLA Breached'}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-3xl font-bold text-slate-900 tracking-tight font-display">
                                Run #{run.id.substring(0, 8).toUpperCase()}
                            </h1>
                            <span className="text-slate-200 text-2xl font-light">/</span>
                            <span className="text-2xl font-bold text-sky-600 tracking-tight">
                                {run.plan.name}
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-y-3 gap-x-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-base text-sky-500">dns</span>
                                {run.target.name} ({run.target.environment})
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-base">calendar_today</span>
                                {new Date(run.createdAt).toLocaleString()}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-base">person</span>
                                Operator: {run.triggeredBy.username}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-start gap-3 shrink-0">
                    {run.status === "RUNNING" && (
                        <button onClick={cancel} className="btn-primary bg-rose-500 hover:bg-rose-600 border-rose-600 shadow-rose-500/20 px-6 h-12 shadow-lg">
                            <span className="material-symbols-outlined">stop_circle</span>
                            Cancel Run
                        </button>
                    )}
                    <button className="h-12 px-6 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-all flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg">download</span>
                        Export Result
                    </button>
                </div>
            </div>

            {/* KPI Array */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                {[
                    { label: "Throughput", value: m?.totalRequests?.toLocaleString() ?? "—", sub: "Total Requests", icon: "data_usage" },
                    { label: "Capacity", value: m ? m.avgRps.toFixed(1) : "—", sub: "Avg Requests / s", icon: "bolt" },
                    { label: "P50 Latency", value: m ? `${m.p50Ms.toFixed(0)}ms` : "—", sub: "Median Latency", icon: "timer" },
                    { label: "P95 Latency", value: m ? `${m.p95Ms.toFixed(0)}ms` : "—", sub: "Peak Latency", icon: "speed", color: m && run.plan.sloP95Ms && m.p95Ms > run.plan.sloP95Ms ? "text-rose-600" : "text-emerald-600" },
                    { label: "Error Rate", value: m ? `${(m.errorRate * 100).toFixed(2)}%` : "—", sub: "Failure Ratio", icon: "error_outline", color: m && m.errorRate > 0.05 ? "text-rose-500" : "text-emerald-500" },
                    { label: "Concurrency", value: run.vusOverride ?? run.plan.vus, sub: "Virtual Users", icon: "group" },
                ].map((kpi, i) => (
                    <div key={i} className="card-premium p-6 relative bg-white border-slate-100 shadow-lg shadow-slate-200/10 group">
                        <div className="absolute right-0 bottom-0 p-4 opacity-[0.03] group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-5xl text-slate-900">{kpi.icon}</span>
                        </div>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-50 pb-2">
                            {kpi.label}
                        </h4>
                        <div className="space-y-1">
                            <p className={`text-2xl font-bold tracking-tight ${kpi.color ?? 'text-slate-900'}`}>{kpi.value}</p>
                            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest opacity-60">{kpi.sub}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Navigation Tabs */}
            <div className="space-y-8">
                <div className="flex gap-2 p-1.5 bg-slate-100/50 rounded-2xl w-fit border border-slate-200/50">
                    {[
                        { id: "overview", label: "Analytics", icon: "monitoring" },
                        { id: "insights", label: "Insights", icon: "auto_awesome" },
                        { id: "logs", label: "Execution Logs", icon: "terminal" },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2.5 px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === tab.id
                                ? 'bg-white text-sky-600 shadow-md border border-slate-100'
                                : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
                                }`}
                        >
                            <span className="material-symbols-outlined text-lg">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="animate-in">
                    {activeTab === "overview" && (
                        <div className="grid lg:grid-cols-[1fr_320px] gap-8">
                            <div className="space-y-8">
                                <div className="card-premium p-8 bg-white border-slate-100 shadow-xl shadow-slate-200/10">
                                    <div className="flex flex-col sm:flex-row items-center justify-between mb-10 gap-6">
                                        <div className="space-y-1">
                                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Performance Metrics</h3>
                                            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Throughput & p95 Latency distribution</p>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <div className="flex items-center gap-2">
                                                <div className="size-2 rounded-full bg-sky-500" />
                                                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Requests/s</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="size-2 rounded-full bg-indigo-400" />
                                                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">p95 Latency</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="h-[380px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={series}>
                                                <defs>
                                                    <linearGradient id="colorRps" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.1} />
                                                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 600, fill: '#94a3b8' }} minTickGap={50} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 600, fill: '#94a3b8' }} />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #f1f5f9', padding: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                                    itemStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}
                                                    labelStyle={{ color: '#94a3b8', marginBottom: '4px', fontSize: '9px', fontWeight: 'bold' }}
                                                />
                                                <Area type="monotone" dataKey="RPS" stroke="#0ea5e9" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRps)" />
                                                <Line type="monotone" dataKey="p95" stroke="#818cf8" strokeWidth={2.5} dot={false} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="grid sm:grid-cols-2 gap-8">
                                    <div className="card-premium p-8 flex flex-col bg-white border-slate-100 shadow-xl shadow-slate-200/10">
                                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-6 pb-3 border-b border-slate-50">Status Distribution</h3>
                                        <div className="space-y-6 flex-1">
                                            {statusCodes.map(([code, count]) => (
                                                <div key={code}>
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`size-1.5 rounded-full ${code.startsWith('2') ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                            <span className="text-xs font-bold text-slate-700">{code} Response</span>
                                                        </div>
                                                        <span className="text-[10px] font-bold text-slate-400">{(count / (m?.totalRequests || 1) * 100).toFixed(1)}%</span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full transition-all duration-1000 ${code.startsWith('2') ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${(count / (m?.totalRequests || 1) * 100)}%` }} />
                                                    </div>
                                                </div>
                                            ))}
                                            {statusCodes.length === 0 && (
                                                <div className="flex flex-col items-center justify-center py-12 text-slate-200">
                                                    <span className="material-symbols-outlined text-4xl mb-2">analytics</span>
                                                    <p className="text-[10px] font-bold uppercase tracking-widest">Awaiting result...</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="card-premium p-8 bg-white border-slate-100 shadow-xl shadow-slate-200/10">
                                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-6 pb-3 border-b border-slate-50">Detailed Errors</h3>
                                        <div className="space-y-4">
                                            {m?.topErrors.slice(0, 3).map((err, i) => (
                                                <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-100 group">
                                                    <div className="flex justify-between items-start gap-4 mb-2">
                                                        <span className="text-[11px] font-bold text-slate-600 break-all line-clamp-2 leading-relaxed">{err.msg}</span>
                                                        <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-lg shrink-0">x{err.count}</span>
                                                    </div>
                                                </div>
                                            ))}
                                            {(!m || m.topErrors.length === 0) && (
                                                <div className="flex flex-col items-center justify-center py-12">
                                                    <div className="size-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-6">
                                                        <span className="material-symbols-outlined text-emerald-500 text-3xl">verified</span>
                                                    </div>
                                                    <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">No errors observed</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-8">
                                <div className="card-premium p-8 bg-slate-900 text-white border-none shadow-xl shadow-slate-900/10 group">
                                    <h3 className="text-[10px] font-bold uppercase tracking-widest mb-8 text-sky-400 border-b border-white/5 pb-3">Configuration</h3>
                                    <div className="space-y-6">
                                        {[
                                            { label: "Environment", value: run.target.environment, icon: "cloud_queue" },
                                            { label: "Target Load", value: `${run.vusOverride ?? run.plan.vus} VUs`, icon: "groups" },
                                            { label: "Duration", value: `${run.durationOverride ?? run.plan.duration}s`, icon: "schedule" },
                                            { label: "SLA Threshold", value: `${run.plan.sloP95Ms}ms`, icon: "gpp_good" },
                                            { label: "Auth Layer", value: run.target.authType, icon: "security" },
                                        ].map((item, i) => (
                                            <div key={i} className="flex flex-col gap-1.5 grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all">
                                                <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">{item.label}</span>
                                                <div className="flex items-center gap-3">
                                                    <span className="material-symbols-outlined text-base text-sky-400">{item.icon}</span>
                                                    <span className="text-sm font-bold">{item.value}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="card-premium p-8 bg-sky-50 border-sky-100 shadow-lg shadow-sky-500/5">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="size-10 rounded-xl bg-sky-500 text-white flex items-center justify-center shadow-lg shadow-sky-500/20">
                                            <span className="material-symbols-outlined text-xl">auto_awesome</span>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-900">Summary</h4>
                                            <p className="text-[10px] font-bold text-sky-600 uppercase tracking-widest">AI Analysis Result</p>
                                        </div>
                                    </div>
                                    <p className="text-xs font-medium leading-relaxed text-slate-600 italic">
                                        {m && m.p95Ms > (run.plan.sloP95Ms || 2000)
                                            ? "Alert: Critical performance breach. Resource saturation detected under current load parameters."
                                            : "Optimal stability. All services remained within operational bounds during the execution window."}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "insights" && (
                        <div className="max-w-4xl mx-auto space-y-4">
                            {run.insights.map(ins => (
                                <div key={ins.id} className="card-premium p-8 flex gap-6 bg-white border-slate-100 shadow-md hover:border-sky-200 transition-all">
                                    <div className={`size-12 rounded-xl flex items-center justify-center shrink-0 ${ins.level === 'ERROR' ? 'bg-rose-50 text-rose-600' :
                                        ins.level === 'WARNING' ? 'bg-amber-50 text-amber-600' :
                                            'bg-sky-50 text-sky-600'
                                        }`}>
                                        <span className="material-symbols-outlined text-2xl">
                                            {ins.level === 'ERROR' ? 'report' : ins.level === 'WARNING' ? 'warning' : 'info'}
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3">
                                            <h4 className="font-bold text-slate-900 text-lg tracking-tight">{ins.message}</h4>
                                            <span className="text-[9px] font-bold uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded border border-slate-100 text-slate-400">{ins.category}</span>
                                        </div>
                                        <p className="text-sm text-slate-500 font-medium">{ins.detail}</p>
                                    </div>
                                </div>
                            ))}
                            {run.insights.length === 0 && (
                                <div className="text-center py-20 flex flex-col items-center">
                                    <div className="size-20 rounded-2xl bg-slate-50 flex items-center justify-center mb-6 border border-slate-100 text-slate-200">
                                        <span className="material-symbols-outlined text-4xl animate-pulse">psychology</span>
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Synthesizing insights</p>
                                    <p className="text-xs font-medium text-slate-300">Processing telemetry patterns...</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "logs" && (
                        <div className="card-premium overflow-hidden bg-slate-900 border-none shadow-2xl">
                            <div className="px-6 py-4 flex items-center justify-between border-b border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="flex gap-1.5">
                                        <div className="size-2.5 rounded-full bg-slate-700" />
                                        <div className="size-2.5 rounded-full bg-slate-700" />
                                        <div className="size-2.5 rounded-full bg-slate-700" />
                                    </div>
                                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-4">Worker Log Stream</h3>
                                </div>
                                <button onClick={loadLogs} className="h-8 px-4 rounded-lg bg-white/5 border border-white/10 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all">Reload</button>
                            </div>
                            <div className="p-8 h-[600px] overflow-y-auto custom-scrollbar font-mono text-[13px] text-sky-400/80 whitespace-pre-wrap leading-relaxed bg-[#0a0f1a]">
                                {logs || "Awaiting stream buffer initialization..."}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
