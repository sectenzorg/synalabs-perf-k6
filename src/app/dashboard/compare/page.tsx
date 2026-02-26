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
        <div className="space-y-10 sm:space-y-16 animate-in pb-12">
            {/* Header: Delta Analysis Command */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 pb-10 border-b border-slate-100">
                <div className="space-y-4">
                    <div className="flex items-center gap-3 font-display italic">
                        <div className="size-2 rounded-full bg-primary" />
                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">Comparative_Analytics_v2.0</span>
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-slate-900 leading-none italic font-display">
                        Performance <span className="text-primary not-italic">Differential</span>
                    </h1>
                    <p className="text-slate-500 font-medium text-sm sm:text-lg max-w-xl leading-relaxed italic border-l-2 border-slate-100 pl-6">
                        Quantifying variance between execution cycles. Select primary baseline and candidate subjects for structural telemetry correlation.
                    </p>
                </div>
            </div>

            <div className="grid gap-12 sm:gap-16">
                {/* Selection Matrix */}
                <div className="card-premium p-10 lg:p-14 bg-white border-2 border-slate-50 relative overflow-hidden group shadow-2xl">
                    <div className="absolute top-0 right-0 p-12 opacity-[0.02] flex group-hover:opacity-[0.05] transition-opacity duration-1000">
                        <span className="material-symbols-outlined text-[150px] italic">compare_arrows</span>
                    </div>
                    <div className="flex flex-col gap-12 relative z-10">
                        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-10 items-end">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] font-display italic px-2">Primary_Baseline</label>
                                <div className="relative">
                                    <select
                                        value={runA}
                                        onChange={(e) => setRunA(e.target.value)}
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] px-8 py-5 text-sm font-black focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all shadow-sm appearance-none cursor-pointer italic"
                                    >
                                        <option value="">-- SELECT_REFERENCE --</option>
                                        {runOpts.map(r => <option key={r.id} value={r.id} className="font-sans font-bold">{r.label}</option>)}
                                    </select>
                                    <span className="material-symbols-outlined absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none">expand_more</span>
                                </div>
                            </div>

                            <div className="hidden lg:flex items-center justify-center size-20 rounded-[2.5rem] bg-slate-900 text-white shadow-2xl shadow-slate-900/20 group-hover:rotate-180 transition-all duration-700">
                                <span className="material-symbols-outlined text-4xl italic">compare_arrows</span>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] font-display italic px-2">Candidate_Subject</label>
                                <div className="relative">
                                    <select
                                        value={runB}
                                        onChange={(e) => setRunB(e.target.value)}
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] px-8 py-5 text-sm font-black focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all shadow-sm appearance-none cursor-pointer italic"
                                    >
                                        <option value="">-- SELECT_CANDIDATE --</option>
                                        {runOpts.map(r => <option key={r.id} value={r.id} className="font-sans font-bold">{r.label}</option>)}
                                    </select>
                                    <span className="material-symbols-outlined absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none">expand_more</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-8 border-t border-slate-50">
                            <button
                                onClick={compare}
                                disabled={!runA || !runB || loading}
                                className="btn-primary w-full lg:w-fit px-12 h-[64px] shadow-2xl shadow-primary/30"
                            >
                                {loading ? (
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                                ) : (
                                    <>
                                        Run Variance Delta
                                        <span className="material-symbols-outlined text-xl">biotech</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {error ? (
                    <div className="p-8 bg-red-50 text-red-600 rounded-[2rem] border-2 border-red-100 text-sm font-black flex items-center gap-6 animate-in">
                        <span className="material-symbols-outlined text-4xl">security_update_warning</span>
                        <div className="space-y-1">
                            <h4 className="uppercase tracking-widest italic font-display">Correlation Error</h4>
                            <p className="opacity-70 font-medium italic">{error}</p>
                        </div>
                    </div>
                ) : null}

                {!result && !loading && !error && (
                    <div className="py-32 flex flex-col items-center justify-center text-center group cursor-default">
                        <div className="size-32 rounded-[4rem] bg-slate-50 border-2 border-slate-100 flex items-center justify-center text-slate-200 mb-10 shadow-inner group-hover:scale-110 group-hover:bg-white transition-all duration-700">
                            <span className="material-symbols-outlined text-7xl group-hover:text-primary transition-colors italic">query_stats</span>
                        </div>
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] italic mb-4">Awaiting Telemetry Sync</h3>
                        <p className="text-sm text-slate-400 max-w-sm mx-auto font-medium italic leading-relaxed">Map two independent execution vectors to visualize performance shift and structural regression profiles.</p>
                    </div>
                )}

                {result && (
                    <div className="space-y-12 animate-in lg:pb-12">
                        {/* High-Impact Insight Banner */}
                        <div className={`p-10 lg:p-14 rounded-[3.5rem] border-4 flex flex-col lg:flex-row lg:items-center gap-10 shadow-2xl transition-all hover:scale-[1.01] ${result.delta.regression
                            ? "bg-red-50 border-red-100 text-red-900 shadow-red-500/10"
                            : "bg-emerald-50 border-emerald-100 text-emerald-900 shadow-emerald-500/10"}`}>
                            <div className={`size-24 rounded-[2.5rem] flex items-center justify-center shrink-0 shadow-2xl transform hover:rotate-12 transition-transform duration-500 ${result.delta.regression
                                ? "bg-red-500 text-white shadow-red-500/30"
                                : "bg-emerald-500 text-white shadow-emerald-500/30"}`}>
                                <span className="material-symbols-outlined text-5xl italic">
                                    {result.delta.regression ? "warning" : "auto_graph"}
                                </span>
                            </div>
                            <div className="space-y-3 flex-1 relative z-10">
                                <div className="flex items-center gap-3 mb-2 font-display">
                                    <div className={`size-2 rounded-full animate-pulse ${result.delta.regression ? 'bg-red-500' : 'bg-emerald-500'}`} />
                                    <span className="text-[10px] font-black uppercase tracking-[0.4em]">Correlation_Result</span>
                                </div>
                                <h4 className="text-3xl lg:text-4xl font-black tracking-tighter italic leading-none">
                                    {result.delta.regression ? "Critical_Regression" : "Performance_Parity"}
                                </h4>
                                <p className="text-sm lg:text-base font-medium opacity-80 leading-relaxed italic max-w-2xl border-l-2 border-current/20 pl-6">
                                    {result.delta.regression
                                        ? "Structural degradation detected. Candidate telemetry drifted beyond safe operational thresholds compared to the established baseline reference."
                                        : "Sequence integrity verified. The candidate cycle exhibits stable behavioral patterns and maintains statistical parity with baseline benchmarks."}
                                </p>
                            </div>
                        </div>

                        {/* Variance Grid: Industrial Aesthetic */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <DeltaWidget label="Latency_Shift" value={result.delta.p95Ms} suffix="%" invert icon="speed" />
                            <DeltaWidget label="Fault_Tolerance" value={result.delta.errorRate} suffix="%" invert icon="error" />
                            <DeltaWidget label="Throughput_Delta" value={result.delta.avgRps} suffix=" TPS" invert={false} isAbsolute icon="bolt" />
                        </div>

                        {/* Side-by-Side Architectural Detail */}
                        <div className="grid lg:grid-cols-2 gap-10 items-start">
                            <RunDetailCard label="Structural Baseline" run={result.runA} isBaseline />
                            <RunDetailCard label="Candidate Assessment" run={result.runB} isRegression={result.delta.regression} />
                        </div>

                        {/* Neural Insight Bridge */}
                        <div className="card-premium p-10 lg:p-16 bg-slate-950 text-white border-none shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 group-hover:scale-125 transition-transform duration-1000">
                                <span className="material-symbols-outlined text-[150px] italic">psychology</span>
                            </div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-4 mb-12">
                                    <h3 className="text-xs font-black uppercase tracking-[0.4em] text-slate-500 italic border-b border-white/10 pb-4">Engine Telemetry Insights</h3>
                                    <div className="h-px w-24 bg-white/10" />
                                </div>
                                <div className="grid lg:grid-cols-2 gap-12 lg:gap-20">
                                    {result.delta.p95Ms !== null && (
                                        <InsightItem
                                            icon="speed"
                                            title="Response Dynamics"
                                            message={`Latency Profile: ${result.delta.p95Ms > 0 ? 'Degraded' : 'Optimized'} by ${Math.abs(result.delta.p95Ms).toFixed(1)}%.`}
                                            detail={result.delta.p95Ms > 15 ? "Operational breach. Resource saturation or thread contention identified during peak concurrency." : "Variance falls within the nominal cluster-noise threshold."}
                                            severity={result.delta.p95Ms > 15 ? "high" : "low"}
                                        />
                                    )}
                                    {result.delta.avgRps !== null && (
                                        <InsightItem
                                            icon="bolt"
                                            title="Capacity Analysis"
                                            message={`Throughput Shift: ${Math.abs(result.delta.avgRps).toFixed(1)} ${result.delta.avgRps > 0 ? 'TPS Gain' : 'TPS Loss'}.`}
                                            detail={result.delta.avgRps < -10 ? "Capacity bottleneck identified. Significant drop in structural handling capability." : "Throughput trajectory remains parallel to baseline profile."}
                                            severity={result.delta.avgRps < -10 ? "high" : "low"}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function DeltaWidget({ label, value, suffix, invert = false, isAbsolute = false, icon }: {
    label: string, value: number | null, suffix: string, invert?: boolean, isAbsolute?: boolean, icon: string
}) {
    const isNeutral = value === null || Math.abs(value) < 0.5;
    const isPositive = !isNeutral && (invert ? value! < 0 : value! > 0);
    const isNegative = !isNeutral && (invert ? value! > 0 : value! < 0);

    return (
        <div className="card-premium p-10 flex flex-col items-center justify-center text-center group border-2 border-slate-50 relative overflow-hidden">
            <div className={`size-16 rounded-[2.2rem] flex items-center justify-center mb-6 shadow-2xl transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 ${isPositive ? 'bg-emerald-500 text-white shadow-emerald-500/20' :
                isNegative ? 'bg-red-500 text-white shadow-red-500/20' :
                    'bg-slate-900 text-white shadow-slate-900/10'
                }`}>
                <span className="material-symbols-outlined text-3xl italic">{icon}</span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2 italic font-display">{label}</span>
            <div className="flex items-baseline gap-2">
                <span className={`text-4xl font-black font-display tracking-tighter italic ${isPositive ? 'text-emerald-600' : isNegative ? 'text-red-600' : 'text-slate-900'
                    }`}>
                    {value !== null && value !== 0 ? (value > 0 ? "+" : "") : ""}
                    {value?.toFixed(1) ?? "—"}
                </span>
                <span className="text-[10px] font-black text-slate-300 uppercase italic">{suffix}</span>
            </div>
        </div>
    );
}

function RunDetailCard({ label, run, isBaseline = false, isRegression = false }: { label: string, run: any, isBaseline?: boolean, isRegression?: boolean }) {
    const metrics = [
        { l: "p95 Latency", v: `${run.metrics?.p95Ms?.toFixed(0)}ms`, i: "speed" },
        { l: "Throughput", v: `${run.metrics?.avgRps?.toFixed(1)} TPS`, i: "bolt" },
        { l: "Total Ops", v: run.metrics?.totalRequests?.toLocaleString(), i: "data_usage" },
        { l: "Integrity", v: `${(run.metrics?.errorRate * 100).toFixed(2)}%`, i: "error_outline" },
    ];

    return (
        <div className={`card-premium overflow-hidden border-2 transition-all ${isRegression ? 'border-red-200 shadow-red-500/5' : 'border-slate-50'}`}>
            <div className="px-10 py-6 border-b-2 border-slate-50 bg-slate-50/50 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 italic">{label}</span>
                <span className="text-[10px] font-black text-slate-400 bg-white border-2 border-slate-100 px-4 py-1.5 rounded-xl uppercase tracking-widest italic shadow-sm">
                    {new Date(run.createdAt).toLocaleDateString()}
                </span>
            </div>
            <div className="p-10 lg:p-14">
                <div className="mb-10 space-y-2">
                    <h4 className="text-2xl font-black text-slate-900 tracking-tighter italic uppercase">{run.plan.name}</h4>
                    <div className="flex items-center gap-3">
                        <span className="size-2 rounded-full bg-primary" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{run.target.name}</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-10">
                    {metrics.map((m, i) => (
                        <div key={i} className="space-y-2 group">
                            <div className="flex items-center gap-2.5 opacity-40 group-hover:opacity-100 transition-all">
                                <span className="material-symbols-outlined text-lg">{m.i}</span>
                                <span className="text-[9px] font-black uppercase tracking-[0.25em]">{m.l}</span>
                            </div>
                            <p className="text-xl font-black text-slate-800 font-display tracking-tight italic">{m.v}</p>
                        </div>
                    ))}
                </div>

                <div className={`mt-12 p-6 rounded-[2rem] flex items-center justify-between border-2 shadow-inner ${run.metrics?.sloPass
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-700 shadow-emerald-500/5'
                    : 'bg-red-50 border-red-100 text-red-700 shadow-red-500/5'
                    }`}>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] font-display">Compliance_Module</span>
                    <span className={`text-xs font-black uppercase px-4 py-1.5 rounded-full border shadow-sm ${run.metrics?.sloPass ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-red-500 text-white border-red-400'
                        }`}>{run.metrics?.sloPass ? "Verified" : "Exception"}</span>
                </div>
            </div>
        </div>
    );
}

function InsightItem({ icon, title, message, detail, severity }: { icon: string, title: string, message: string, detail: string, severity: 'high' | 'low' }) {
    return (
        <div className="flex gap-8 group">
            <div className={`size-16 rounded-[2rem] flex items-center justify-center shrink-0 border-2 transition-all duration-700 group-hover:scale-110 group-hover:rotate-6 ${severity === 'high' ? 'bg-red-500/10 border-red-500/20 text-red-400 shadow-xl shadow-red-500/10' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-xl shadow-emerald-500/10'
                }`}>
                <span className="material-symbols-outlined text-3xl italic">{icon}</span>
            </div>
            <div className="space-y-2.5">
                <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary italic font-display">{title}</h5>
                <p className="text-lg font-black text-white leading-tight italic tracking-tight">{message}</p>
                <p className="text-xs text-slate-500 font-medium leading-relaxed italic opacity-80 border-l border-white/5 pl-4">{detail}</p>
            </div>
        </div>
    );
}
