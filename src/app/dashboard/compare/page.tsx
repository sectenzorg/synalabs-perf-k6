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
        fetch("/api/runs?limit=100&status=DONE").then((r) => r.json()).then((d) => setRuns(d.runs ?? []));
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
        <div className="space-y-8 animate-in pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-1 font-display">Performance Comparison</h1>
                    <p className="text-slate-500 text-sm font-medium">Compare metrics between two different test runs to identify regressions.</p>
                </div>
            </div>

            <div className="space-y-8">
                {/* Selection Matrix */}
                <div className="card-premium p-8 bg-white border-slate-100 shadow-xl shadow-slate-200/10">
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-8 items-center">
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Baseline Run</label>
                            <div className="relative">
                                <select
                                    value={runA}
                                    onChange={(e) => setRunA(e.target.value)}
                                    className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-bold focus:bg-white focus:border-sky-500 outline-none transition-all appearance-none cursor-pointer"
                                >
                                    <option value="">-- Select Baseline --</option>
                                    {runOpts.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                                </select>
                                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                            </div>
                        </div>

                        <div className="hidden lg:flex items-center justify-center size-10 rounded-full bg-slate-50 text-slate-400 border border-slate-100">
                            <span className="material-symbols-outlined text-xl">compare_arrows</span>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Comparison Run</label>
                            <div className="relative">
                                <select
                                    value={runB}
                                    onChange={(e) => setRunB(e.target.value)}
                                    className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-bold focus:bg-white focus:border-sky-500 outline-none transition-all appearance-none cursor-pointer"
                                >
                                    <option value="">-- Select Comparison --</option>
                                    {runOpts.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                                </select>
                                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex justify-center">
                        <button
                            onClick={compare}
                            disabled={loading || !runA || !runB}
                            className="btn-primary min-w-[200px] shadow-lg shadow-sky-500/20"
                        >
                            {loading ? (
                                <div className="size-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    Compare Now
                                    <span className="material-symbols-outlined text-xl">analytics</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="p-6 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 flex items-center gap-4 animate-in">
                        <span className="material-symbols-outlined text-2xl">error</span>
                        <p className="text-sm font-bold">{error}</p>
                    </div>
                )}

                {!result && !loading && !error && (
                    <div className="py-24 flex flex-col items-center justify-center text-center px-6">
                        <div className="size-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-6 border border-slate-100 text-slate-200">
                            <span className="material-symbols-outlined text-3xl">query_stats</span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-1">Awaiting analysis</h3>
                        <p className="text-slate-500 text-sm max-w-sm mx-auto font-medium">Select two test runs to analyze performance drift and identify potential regressions.</p>
                    </div>
                )}

                {result && (
                    <div className="space-y-8 animate-in">
                        {/* Summary Status */}
                        <div className={`p-8 rounded-3xl border shadow-lg transition-all ${result.delta.regression ? 'bg-rose-50 border-rose-100 text-rose-900' : 'bg-emerald-50 border-emerald-100 text-emerald-900'}`}>
                            <div className="flex flex-col sm:flex-row items-center gap-6">
                                <div className={`size-14 rounded-2xl flex items-center justify-center text-white ${result.delta.regression ? 'bg-rose-500' : 'bg-emerald-500'}`}>
                                    <span className="material-symbols-outlined text-3xl">
                                        {result.delta.regression ? 'trending_down' : 'trending_up'}
                                    </span>
                                </div>
                                <div className="text-center sm:text-left">
                                    <h2 className="text-xl font-bold">
                                        {result.delta.regression ? 'Regression Detected' : 'Performance Stable'}
                                    </h2>
                                    <p className="text-sm font-medium opacity-80">
                                        {result.delta.regression
                                            ? 'Performance metrics show significant degradation compared to the baseline.'
                                            : 'Services are performing within acceptable margins of the baseline.'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Metric Comparison */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <DeltaWidget label="P95 Latency" value={result.delta.p95Ms} suffix="ms" invert={true} icon="speed" />
                            <DeltaWidget label="Error Rate" value={result.delta.errorRate} suffix="%" invert={true} icon="error_outline" />
                            <DeltaWidget label="Throughput" value={result.delta.avgRps} suffix="req/s" invert={false} icon="bolt" />
                        </div>

                        {/* Side by Side Detailed View */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <RunDetailCard label="Baseline" run={result.runA} />
                            <RunDetailCard label="Comparison" run={result.runB} isRegression={result.delta.regression} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function DeltaWidget({ label, value, suffix, invert = false, icon }: {
    label: string, value: number | null, suffix: string, invert?: boolean, icon: string
}) {
    const isNeutral = value === null || Math.abs(value) < 0.1;
    const isPositive = !isNeutral && (invert ? value! < 0 : value! > 0);
    const isNegative = !isNeutral && (invert ? value! > 0 : value! < 0);

    return (
        <div className="card-premium p-6 flex flex-col items-center justify-center text-center bg-white border-slate-100 shadow-md">
            <div className={`size-10 rounded-xl flex items-center justify-center mb-4 ${isPositive ? 'bg-emerald-50 text-emerald-500' :
                isNegative ? 'bg-rose-50 text-rose-500' : 'bg-slate-50 text-slate-400'
                }`}>
                <span className="material-symbols-outlined text-xl">{icon}</span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{label}</span>
            <div className="flex items-baseline gap-1">
                <span className={`text-2xl font-bold ${isPositive ? 'text-emerald-600' : isNegative ? 'text-rose-600' : 'text-slate-900'
                    }`}>
                    {value !== null && value !== 0 ? (value > 0 ? "+" : "") : ""}
                    {value?.toFixed(1) ?? "—"}
                </span>
                <span className="text-[10px] font-bold text-slate-300 uppercase">{suffix}</span>
            </div>
        </div>
    );
}

function RunDetailCard({ label, run, isRegression = false }: { label: string, run: any, isRegression?: boolean }) {
    if (!run) return null;

    const metrics = [
        { label: "p95 Latency", val: `${run.metricsAgg?.p95Ms?.toFixed(0)}ms`, icon: "speed" },
        { label: "Throughput", val: `${run.metricsAgg?.avgRps?.toFixed(1)} req/s`, icon: "bolt" },
        { label: "Total Req", val: run.metricsAgg?.totalRequests?.toLocaleString(), icon: "data_usage" },
        { label: "Error Rate", val: `${(run.metricsAgg?.errorRate * 100).toFixed(2)}%`, icon: "error_outline" },
    ];

    return (
        <div className={`card-premium overflow-hidden bg-white border-slate-100 shadow-xl shadow-slate-200/5`}>
            <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</span>
                <span className="text-[10px] font-bold text-slate-400">{new Date(run.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="p-8">
                <div className="mb-8">
                    <h4 className="text-xl font-bold text-slate-900 tracking-tight">{run.plan?.name}</h4>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{run.target?.name}</p>
                </div>

                <div className="grid grid-cols-2 gap-y-8 gap-x-4">
                    {metrics.map((m, i) => (
                        <div key={i} className="space-y-1">
                            <div className="flex items-center gap-2 text-slate-400">
                                <span className="material-symbols-outlined text-lg">{m.icon}</span>
                                <span className="text-[10px] font-bold uppercase tracking-wider">{m.label}</span>
                            </div>
                            <p className="text-lg font-bold text-slate-800">{m.val}</p>
                        </div>
                    ))}
                </div>

                <div className={`mt-8 p-4 rounded-xl flex items-center justify-between border ${run.metricsAgg?.sloPass
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                    : 'bg-rose-50 border-rose-100 text-rose-700'
                    }`}>
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Compliance</span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg ${run.metricsAgg?.sloPass ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                        }`}>{run.metricsAgg?.sloPass ? "Verified" : "Breached"}</span>
                </div>
            </div>
        </div>
    );
}
