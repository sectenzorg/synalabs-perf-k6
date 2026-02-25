"use client";
import { useState, useEffect } from "react";

interface Run {
    id: string; label?: string; createdAt: string;
    target: { name: string }; plan: { name: string };
    metricsAgg?: {
        p95Ms: number; errorRate: number; avgRps: number;
        totalRequests: number; sloPass: boolean;
    };
}

interface CompareResult {
    runA: any; runB: any;
    delta: { p95Ms: number | null; errorRate: number | null; avgRps: number | null; regression: boolean };
}

export default function ComparePage() {
    const [runs, setRuns] = useState<Run[]>([]);
    const [runA, setRunA] = useState("");
    const [runB, setRunB] = useState("");
    const [result, setResult] = useState<CompareResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        fetch("/api/runs?limit=50&status=DONE").then((r) => r.json()).then((d) => setRuns(d.runs ?? []));
    }, []);

    async function compare() {
        if (!runA || !runB) return;
        setLoading(true); setError(""); setResult(null);
        try {
            const res = await fetch(`/api/runs/compare?a=${runA}&b=${runB}`);
            if (!res.ok) { const d = await res.json(); setError(d.error); return; }
            setResult(await res.json());
        } finally {
            setLoading(false);
        }
    }

    const runOpts = runs.map((r) => ({
        id: r.id,
        label: `${r.target?.name} / ${r.plan?.name}${r.label ? ` [${r.label}]` : ""} · ${new Date(r.createdAt).toLocaleDateString()}`,
    }));

    return (
        <div className="space-y-8 animate-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 mb-2">Delta Analysis</h1>
                    <p className="text-slate-500 font-medium">Compare execution profiles to detect regressions and performance shifts.</p>
                </div>
            </div>

            <div className="grid gap-8">
                {/* Selection Section */}
                <div className="card-premium p-6">
                    <div className="flex flex-col md:flex-row items-end gap-6">
                        <div className="flex-1 space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Baseline Reference (Run A)</label>
                            <div className="relative">
                                <select
                                    value={runA}
                                    onChange={(e) => setRunA(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none transition-all appearance-none"
                                >
                                    <option value="">-- Choose Baseline --</option>
                                    {runOpts.filter(r => r.id !== runB).map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                                </select>
                                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                            </div>
                        </div>

                        <div className="hidden md:flex flex-col items-center justify-center p-3 text-slate-200">
                            <span className="material-symbols-outlined text-3xl">compare_arrows</span>
                        </div>

                        <div className="flex-1 space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Target Assessment (Run B)</label>
                            <div className="relative">
                                <select
                                    value={runB}
                                    onChange={(e) => setRunB(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none transition-all appearance-none"
                                >
                                    <option value="">-- Choose Candidate --</option>
                                    {runOpts.filter(r => r.id !== runA).map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                                </select>
                                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                            </div>
                        </div>

                        <button
                            onClick={compare}
                            disabled={!runA || !runB || loading}
                            className="btn-primary px-10 h-[46px]"
                        >
                            {loading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : "Compare"}
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-xs font-black uppercase tracking-widest">{error}</div>
                )}

                {!result && !loading && !error && (
                    <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/30">
                        <span className="material-symbols-outlined text-7xl text-slate-200 mb-4 animate-pulse">query_stats</span>
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Select Benchmarks to Analyze</h3>
                    </div>
                )}

                {result && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                        {/* Summary Alert */}
                        {result.delta.regression ? (
                            <div className="p-5 bg-red-50 rounded-3xl border border-red-100 flex items-center gap-4 text-red-700">
                                <div className="size-12 rounded-2xl bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-200">
                                    <span className="material-symbols-outlined">warning</span>
                                </div>
                                <div>
                                    <h4 className="text-sm font-black uppercase tracking-tight">Critical Regression Detected</h4>
                                    <p className="text-[11px] font-bold opacity-80 uppercase tracking-widest">Candidate run shows significant performance degradation exceeding baseline thresholds.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="p-5 bg-green-50 rounded-3xl border border-green-100 flex items-center gap-4 text-green-700">
                                <div className="size-12 rounded-2xl bg-green-500 text-white flex items-center justify-center shadow-lg shadow-green-200">
                                    <span className="material-symbols-outlined">auto_graph</span>
                                </div>
                                <div>
                                    <h4 className="text-sm font-black uppercase tracking-tight">Performance Stable</h4>
                                    <p className="text-[11px] font-bold opacity-80 uppercase tracking-widest">No significant degradations detected relative to baseline reference.</p>
                                </div>
                            </div>
                        )}

                        {/* Metrics Grid */}
                        <div className="grid md:grid-cols-2 gap-8 items-start">
                            {/* Side-by-side comparison cards */}
                            <CompareSideCard title="Baseline" run={result.runA} isBaseline />
                            <CompareSideCard title="Candidate" run={result.runB} isRegression={result.delta.regression} />
                        </div>

                        {/* Delta Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            <DeltaCard label="Latency Shift" value={result.delta.p95Ms} suffix="%" invert icon="speed" />
                            <DeltaCard label="Fault Variance" value={result.delta.errorRate} suffix="%" invert icon="error" />
                            <DeltaCard label="Throughput Δ" value={result.delta.avgRps} suffix=" RPS" invert={false} isAbsolute icon="bolt" />
                        </div>

                        {/* Insight Panel */}
                        <div className="card-premium p-8 bg-slate-900 text-white border-none shadow-2xl shadow-slate-200">
                            <div className="flex items-center gap-3 mb-6">
                                <span className="material-symbols-outlined text-primary">psychology</span>
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tactical Insights</h3>
                            </div>
                            <div className="space-y-4">
                                {result.delta.p95Ms !== null && (
                                    <div className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                                        <div className={`mt-1 size-2 rounded-full ${result.delta.p95Ms > 10 ? 'bg-red-500' : 'bg-green-500'}`} />
                                        <p className="text-xs font-bold leading-relaxed">
                                            Response times have {result.delta.p95Ms > 0 ? 'slowed down' : 'improved'} by {Math.abs(result.delta.p95Ms).toFixed(1)}%.
                                            {result.delta.p95Ms > 20 && " This represents a major breach of performance objectives."}
                                        </p>
                                    </div>
                                )}
                                {result.delta.avgRps !== null && (
                                    <div className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                                        <div className={`mt-1 size-2 rounded-full ${result.delta.avgRps < 0 ? 'bg-red-500' : 'bg-green-500'}`} />
                                        <p className="text-xs font-bold leading-relaxed">
                                            Throughput (RPS) changed by {result.delta.avgRps > 0 ? '+' : ''}{result.delta.avgRps.toFixed(1)} units.
                                            {result.delta.avgRps < -10 && " Throughput degradation detected; investigate bottleneck."}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function CompareSideCard({ title, run, isBaseline = false, isRegression = false }: { title: string, run: any, isBaseline?: boolean, isRegression?: boolean }) {
    const kpiClass = isRegression ? "text-red-500" : isBaseline ? "text-slate-400" : "text-primary";

    return (
        <div className={`card-premium overflow-hidden transition-all duration-500 ${isRegression ? 'ring-2 ring-red-500 border-red-500' : ''}`}>
            <div className={`px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between`}>
                <span className={`text-[10px] font-black uppercase tracking-widest ${kpiClass}`}>{title}</span>
                <span className="text-[10px] font-mono text-slate-400">{new Date(run.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="p-6 space-y-4">
                <div className="mb-4">
                    <h4 className="text-sm font-black text-slate-900 mb-1">{run.plan.name}</h4>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{run.target.name}</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {[
                        { l: "p95 Floor", v: `${run.metrics?.p95Ms?.toFixed(0)}ms` },
                        { l: "Throughput", v: `${run.metrics?.avgRps?.toFixed(1)} RPS` },
                        { l: "Total Ops", v: run.metrics?.totalRequests?.toLocaleString() },
                        { l: "Fault %", v: `${(run.metrics?.errorRate * 100).toFixed(2)}%` }
                    ].map((m, i) => (
                        <div key={i} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">{m.l}</span>
                            <span className="text-xs font-black text-slate-700">{m.v}</span>
                        </div>
                    ))}
                </div>

                <div className={`mt-2 p-3 rounded-xl flex items-center justify-between border ${run.metrics?.sloPass ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                    <span className="text-[9px] font-black uppercase tracking-widest">Global SLO</span>
                    <span className="text-[10px] font-black uppercase tracking-widest">{run.metrics?.sloPass ? "Compliant" : "Violation"}</span>
                </div>
            </div>
        </div>
    );
}

function DeltaCard({ label, value, suffix, invert = false, isAbsolute = false, icon }: {
    label: string, value: number | null, suffix: string, invert?: boolean, isAbsolute?: boolean, icon: string
}) {
    let state = "neutral";
    if (value !== null && value !== 0) {
        if (invert) state = value < 0 ? "positive" : "negative";
        else state = value > 0 ? "positive" : "negative";
    }

    const theme = {
        positive: "bg-green-50 border-green-100 text-green-600",
        negative: "bg-red-50 border-red-100 text-red-600",
        neutral: "bg-slate-50 border-slate-200 text-slate-400"
    }[state as 'positive' | 'negative' | 'neutral'];

    return (
        <div className={`card-premium p-6 border-2 flex flex-col items-center justify-center relative overflow-hidden group ${theme}`}>
            <span className="material-symbols-outlined text-4xl absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-all">{icon}</span>
            <span className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-70">{label}</span>
            <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black tracking-tight">{value !== null ? (value > 0 ? "+" : "") : ""}{value?.toFixed(1) ?? "—"}</span>
                <span className="text-[10px] font-black uppercase opacity-60">{suffix}</span>
            </div>
        </div>
    );
}
