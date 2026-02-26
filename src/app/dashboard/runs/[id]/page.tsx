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
        <div className="space-y-8 sm:space-y-12 animate-in pb-20">
            {/* Header: Mission Control Aesthetic */}
            <div className="card-premium p-8 lg:p-12 flex flex-col lg:flex-row justify-between gap-10 relative overflow-hidden bg-white border-none shadow-2xl">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] rotate-12 flex scale-150">
                    <span className="material-symbols-outlined text-[120px] text-slate-900 font-extralight italic">rocket_launch</span>
                </div>
                <div className="space-y-6 min-w-0 relative z-10">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard/runs" className="size-10 flex items-center justify-center rounded-2xl bg-slate-50 text-slate-400 hover:text-primary transition-all active:scale-95 border border-slate-100">
                            <span className="material-symbols-outlined">arrow_back</span>
                        </Link>
                        <div className="flex gap-2">
                            <span className={`px-4 py-1 rounded-[12px] text-[10px] font-extrabold uppercase tracking-[0.2em] border shadow-sm ${run.status === 'DONE' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                run.status === 'RUNNING' ? 'bg-blue-50 text-blue-600 border-blue-100 animate-pulse' :
                                    'bg-slate-100 text-slate-500 border-slate-200'
                                }`}>
                                {run.status}
                            </span>
                            {m && (
                                <span className={`px-4 py-1 rounded-[12px] text-[10px] font-extrabold uppercase tracking-[0.2em] border shadow-sm ${m.sloPass ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-red-500 text-white border-red-500'
                                    }`}>
                                    {m.sloPass ? 'SLA_COMPLIANT' : 'VIOLATION_DETECTED'}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-3 font-display">
                            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tighter italic">
                                Seq.{run.id.substring(0, 8).toUpperCase()}
                            </h1>
                            <span className="text-slate-200 text-3xl font-light">—</span>
                            <span className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-primary tracking-tighter">
                                {run.plan.name}
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-y-3 gap-x-8 text-[11px] font-bold text-slate-400 uppercase tracking-widest italic">
                            <div className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
                                <span className="material-symbols-outlined text-lg text-primary">dns</span>
                                {run.target.name} ({run.target.environment})
                            </div>
                            <div className="flex items-center gap-2.5">
                                <span className="material-symbols-outlined text-lg">calendar_today</span>
                                {new Date(run.createdAt).toLocaleString()}
                            </div>
                            <div className="flex items-center gap-2.5">
                                <span className="material-symbols-outlined text-lg">person</span>
                                Operator: {run.triggeredBy.username}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-start gap-4 shrink-0 mt-4 lg:mt-0">
                    {run.status === "RUNNING" && (
                        <button onClick={cancel} className="btn-primary bg-red-500 hover:bg-red-600 border-red-600 shadow-red-500/20 px-8 h-[64px]">
                            <span className="material-symbols-outlined">stop_circle</span>
                            Abort Sequence
                        </button>
                    )}
                    <button className="btn-premium px-8 h-[64px] bg-white border-2 border-slate-100 hover:bg-slate-50">
                        <span className="material-symbols-outlined">download</span>
                        Export Manifest
                    </button>
                </div>
            </div>

            {/* Tactical Metric Array */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                {[
                    { label: "Throughput", value: m?.totalRequests?.toLocaleString() ?? "—", sub: "Total Req", icon: "data_usage", trend: "up" },
                    { label: "Intensity", value: m ? m.avgRps.toFixed(1) : "—", sub: "Avg RPS", icon: "bolt", trend: "neutral" },
                    { label: "P50 Horizon", value: m ? `${m.p50Ms.toFixed(0)}ms` : "—", sub: "Median Latency", icon: "timer", trend: "down" },
                    { label: "P95 Critical", value: m ? `${m.p95Ms.toFixed(0)}ms` : "—", sub: "Peak Tail", icon: "speed", color: m && run.plan.sloP95Ms && m.p95Ms > run.plan.sloP95Ms ? "text-red-600" : "text-emerald-600" },
                    { label: "Integrity", value: m ? `${(m.errorRate * 100).toFixed(2)}%` : "—", sub: "Failure Ratio", icon: "error_outline", color: m && m.errorRate > 0.05 ? "text-red-500" : "text-emerald-500" },
                    { label: "VUser Peak", value: run.vusOverride ?? run.plan.vus, sub: "Max Concurrency", icon: "group", trend: "neutral" },
                ].map((kpi, i) => (
                    <div key={i} className="card-premium p-8 relative overflow-hidden group">
                        <div className="absolute right-0 bottom-0 p-4 opacity-[0.05] group-hover:scale-125 transition-transform duration-500">
                            <span className="material-symbols-outlined text-6xl text-slate-900">{kpi.icon}</span>
                        </div>
                        <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.25em] mb-4 flex items-center gap-2">
                            {kpi.label}
                        </h4>
                        <div className="space-y-1">
                            <p className={`text-2xl font-black font-display tracking-tight ${kpi.color ?? 'text-slate-900'}`}>{kpi.value}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic opacity-60">{kpi.sub}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Observation Tabs */}
            <div className="space-y-8">
                <div className="flex gap-4 p-2 bg-slate-900/5 rounded-3xl w-fit border border-slate-100">
                    {[
                        { id: "overview", label: "Real-time Telemetry", icon: "monitoring" },
                        { id: "insights", label: "Pattern Analysis", icon: "psychology" },
                        { id: "logs", label: "Console Stream", icon: "terminal" },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-3 px-8 py-4 rounded-2xl text-[10px] font-extrabold uppercase tracking-[0.2em] transition-all ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-2xl' : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            <span className="material-symbols-outlined text-xl">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="animate-in">
                    {activeTab === "overview" && (
                        <div className="grid lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 space-y-8">
                                <div className="card-premium p-10 bg-white">
                                    <div className="flex flex-col sm:flex-row items-center justify-between mb-12 gap-6">
                                        <div className="space-y-1">
                                            <h3 className="text-xl font-black text-slate-900 tracking-tight italic">TELEMETRY_TRAJECTORY</h3>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic opacity-60">Synchronized RPS & Latency Over Time</p>
                                        </div>
                                        <div className="flex items-center gap-8">
                                            <div className="flex items-center gap-3">
                                                <div className="size-3 rounded-full bg-primary shadow-lg shadow-primary/30" />
                                                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">TPS</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="size-3 rounded-full bg-purple-500 shadow-lg shadow-purple-500/30" />
                                                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">p95</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="h-[400px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={series}>
                                                <defs>
                                                    <linearGradient id="colorRps" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#4f6ef7" stopOpacity={0.1} />
                                                        <stop offset="95%" stopColor="#4f6ef7" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} minTickGap={40} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '24px', border: 'none', padding: '20px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}
                                                    itemStyle={{ color: '#fff', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}
                                                    labelStyle={{ color: '#64748b', marginBottom: '8px', fontSize: '10px', fontWeight: 'bold' }}
                                                />
                                                <Area type="monotone" dataKey="RPS" stroke="#4f6ef7" strokeWidth={4} fillOpacity={1} fill="url(#colorRps)" />
                                                <Line type="monotone" dataKey="p95" stroke="#a855f7" strokeWidth={3} dot={false} strokeDasharray="5 5" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="grid sm:grid-cols-2 gap-8">
                                    <div className="card-premium p-10 flex flex-col">
                                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.25em] mb-8 border-b border-slate-50 pb-4">Status Distribution</h3>
                                        <div className="space-y-6 flex-1">
                                            {statusCodes.map(([code, count]) => (
                                                <div key={code} className="group cursor-default">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`size-2.5 rounded-full ${code.startsWith('2') ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30' : 'bg-red-500 shadow-lg shadow-red-500/30'}`} />
                                                            <span className="text-sm font-black text-slate-800 font-mono tracking-tighter uppercase">Response_{code}</span>
                                                        </div>
                                                        <span className="text-xs font-bold text-slate-400 italic">{(count / (m?.totalRequests || 1) * 100).toFixed(1)}%</span>
                                                    </div>
                                                    <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full transition-all duration-1000 ${code.startsWith('2') ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${(count / (m?.totalRequests || 1) * 100)}%` }} />
                                                    </div>
                                                </div>
                                            ))}
                                            {statusCodes.length === 0 && (
                                                <div className="flex flex-col items-center justify-center py-12 text-slate-200">
                                                    <span className="material-symbols-outlined text-4xl mb-2">analytics</span>
                                                    <p className="text-[10px] font-bold uppercase tracking-widest italic">Awaiting Payload...</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="card-premium p-10">
                                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.25em] mb-8 border-b border-slate-50 pb-4">Integrity Failures</h3>
                                        <div className="space-y-6">
                                            {m?.topErrors.slice(0, 4).map((err, i) => (
                                                <div key={i} className="p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100 group hover:border-red-200 transition-all">
                                                    <div className="flex justify-between items-start gap-4 mb-2">
                                                        <span className="text-[11px] font-black text-slate-900 font-mono break-all line-clamp-2 leading-relaxed">{err.msg}</span>
                                                        <span className="text-[10px] font-black text-red-500 bg-red-50 px-2 py-1 rounded-lg shrink-0">x{err.count}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="size-1 rounded-full bg-red-400 group-hover:animate-ping" />
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">Exception identified</span>
                                                    </div>
                                                </div>
                                            ))}
                                            {(!m || m.topErrors.length === 0) && (
                                                <div className="flex flex-col items-center justify-center py-12">
                                                    <div className="size-16 rounded-[2rem] bg-emerald-50 flex items-center justify-center mb-6">
                                                        <span className="material-symbols-outlined text-emerald-500 text-3xl">verified</span>
                                                    </div>
                                                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] italic">Full Integrity Observed</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-8">
                                <div className="card-premium p-10 bg-slate-950 text-white relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-8 opacity-5">
                                        <span className="material-symbols-outlined text-8xl text-white">settings_input_component</span>
                                    </div>
                                    <h3 className="text-xs font-black uppercase tracking-[0.3em] mb-10 text-primary italic border-b border-white/10 pb-4 flex items-center justify-between">
                                        Structural Config
                                        <span className="material-symbols-outlined text-lg">tune</span>
                                    </h3>
                                    <div className="space-y-8 relative z-10">
                                        {[
                                            { label: "Env_Instance", value: run.target.environment, icon: "cloud_done" },
                                            { label: "Load_Vector", value: `${run.vusOverride ?? run.plan.vus} Concurrent`, icon: "groups_3" },
                                            { label: "Timeframe", value: `${run.durationOverride ?? run.plan.duration} Sec`, icon: "hourglass_empty" },
                                            { label: "SLA_Objective", value: `${run.plan.sloP95Ms}ms p95`, icon: "gpp_good" },
                                            { label: "Auth_Gate", value: run.target.authType, icon: "key" },
                                        ].map((item, i) => (
                                            <div key={i} className="flex items-center gap-6 group">
                                                <div className="size-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 transition-all group-hover:scale-110 group-hover:bg-white/10 group-hover:text-primary">
                                                    <span className="material-symbols-outlined text-xl">{item.icon}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">{item.label}</span>
                                                    <span className="text-sm font-bold font-mono text-white/90">{item.value}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="card-premium p-10 bg-gradient-to-br from-primary to-indigo-800 text-white shadow-2xl shadow-primary/20">
                                    <div className="flex items-center gap-4 mb-6">
                                        <span className="material-symbols-outlined text-4xl">lightbulb</span>
                                        <div>
                                            <h4 className="text-lg font-black tracking-tight italic">Live Recommendation</h4>
                                            <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Calculated from sequence telemetry</p>
                                        </div>
                                    </div>
                                    <p className="text-sm font-medium leading-relaxed italic border-l-2 border-white/30 pl-6 py-2">
                                        {m && m.p95Ms > (run.plan.sloP95Ms || 2000)
                                            ? "Warning: Performance threshold violation detected. Infrastructure scaling or query optimization recommended."
                                            : "Stability confirmed. The current infrastructure deployment handles the specified load vector within SLA bounds."}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "insights" && (
                        <div className="max-w-4xl mx-auto space-y-6">
                            {run.insights.map(ins => (
                                <div key={ins.id} className="card-premium p-10 flex gap-8 animate-in group hover:translate-x-2 transition-all">
                                    <div className={`size-16 rounded-[2rem] flex items-center justify-center shrink-0 shadow-2xl transition-all group-hover:scale-110 ${ins.level === 'ERROR' ? 'bg-red-500 text-white shadow-red-500/20' :
                                        ins.level === 'WARNING' ? 'bg-amber-500 text-white shadow-amber-500/20' :
                                            'bg-primary text-white shadow-primary/20'
                                        }`}>
                                        <span className="material-symbols-outlined text-3xl">
                                            {ins.level === 'ERROR' ? 'report_gmailerrorred' : ins.level === 'WARNING' ? 'notification_important' : 'psychology_alt'}
                                        </span>
                                    </div>
                                    <div className="space-y-4 min-w-0">
                                        <div className="flex flex-wrap items-center gap-4">
                                            <h4 className="font-black text-slate-900 text-xl tracking-tight italic uppercase">{ins.message}</h4>
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] bg-slate-100 px-4 py-1.5 rounded-full text-slate-500 border border-slate-200">{ins.category}</span>
                                        </div>
                                        <p className="text-sm sm:text-base text-slate-500 leading-relaxed font-medium italic opacity-80">{ins.detail}</p>
                                    </div>
                                </div>
                            ))}
                            {run.insights.length === 0 && (
                                <div className="text-center py-32 flex flex-col items-center">
                                    <div className="size-24 rounded-[3rem] bg-slate-50 flex items-center justify-center mb-8 border border-slate-100 shadow-inner">
                                        <span className="material-symbols-outlined text-4xl text-slate-200 animate-gentle-pulse">brain</span>
                                    </div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] italic mb-2">Deep Learning Engine Engaged</p>
                                    <p className="text-xs font-semibold text-slate-300">Synthesizing correlations and anomaly vectors...</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "logs" && (
                        <div className="card-premium overflow-hidden bg-slate-950 border-none shadow-premium animate-in">
                            <div className="bg-slate-900/50 px-8 py-6 flex items-center justify-between border-b border-white/5 backdrop-blur-md">
                                <div className="flex items-center gap-6">
                                    <div className="flex gap-2">
                                        <div className="size-3 rounded-full bg-red-500/30" />
                                        <div className="size-3 rounded-full bg-amber-500/30" />
                                        <div className="size-3 rounded-full bg-emerald-500/30" />
                                    </div>
                                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] ml-4 flex items-center gap-4">
                                        Engine_Output_Stream
                                        <span className="text-primary italic opacity-50 font-medium tracking-normal text-xs animate-pulse">● LIVE</span>
                                    </h3>
                                </div>
                                <button onClick={loadLogs} className="btn-premium px-6 py-2 text-[10px] bg-white/5 border-white/10 text-primary hover:bg-white/10">Synchronize Logs</button>
                            </div>
                            <div className="p-10 h-[600px] overflow-y-auto custom-scrollbar font-mono text-sm text-emerald-400/90 whitespace-pre-wrap leading-relaxed select-all bg-slate-950/40 relative">
                                <div className="absolute left-0 top-0 w-16 h-full border-r border-white/5 flex flex-col gap-0 items-center pt-10 text-[9px] font-black text-slate-800 tracking-tighter cursor-default select-none">
                                    {Array.from({ length: 100 }).map((_, i) => <div key={i} className="h-6 flex items-center">{(i + 1).toString().padStart(3, '0')}</div>)}
                                </div>
                                <div className="pl-12">
                                    {logs || "Worker process initiated. Awaiting initial telemetry buffer..."}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
