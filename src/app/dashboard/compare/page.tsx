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
        <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden text-slate-900 dark:text-slate-100 font-display">
            {/* Header */}
            <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-8 shrink-0">
                <div className="flex flex-col justify-center">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">compare_arrows</span>
                        Compare Runs
                    </h2>
                    <p className="text-xs text-slate-500">Delta analysis — baseline vs current</p>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar bg-slate-50/50 dark:bg-transparent">
                <div className="max-w-6xl mx-auto space-y-6">

                    {/* Selection Card */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-slate-400">checklist</span>
                                Select Runs to Compare
                            </h3>
                        </div>
                        <div className="p-6 flex flex-col md:flex-row gap-6 items-end">
                            <div className="flex-1 w-full space-y-2">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                                    Run A (Baseline)
                                </label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[18px]">history</span>
                                    <select
                                        className="w-full bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none appearance-none transition-all"
                                        value={runA}
                                        onChange={(e) => setRunA(e.target.value)}
                                    >
                                        <option value="">-- Select baseline run --</option>
                                        {runOpts.filter((r) => r.id !== runB).map((r) => (
                                            <option key={r.id} value={r.id}>{r.label}</option>
                                        ))}
                                    </select>
                                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                                </div>
                            </div>

                            <div className="hidden md:flex items-center justify-center shrink-0 w-12 pb-2 opacity-50">
                                <span className="material-symbols-outlined text-3xl">compare_arrows</span>
                            </div>

                            <div className="flex-1 w-full space-y-2">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-primary"></span>
                                    Run B (Current)
                                </label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[18px]">update</span>
                                    <select
                                        className="w-full bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none appearance-none transition-all"
                                        value={runB}
                                        onChange={(e) => setRunB(e.target.value)}
                                    >
                                        <option value="">-- Select current run --</option>
                                        {runOpts.filter((r) => r.id !== runA).map((r) => (
                                            <option key={r.id} value={r.id}>{r.label}</option>
                                        ))}
                                    </select>
                                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                                </div>
                            </div>

                            <div className="w-full md:w-auto">
                                <button
                                    className="w-full md:w-auto px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-sm shadow-primary/20"
                                    onClick={compare}
                                    disabled={!runA || !runB || loading}
                                >
                                    {loading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <span className="material-symbols-outlined text-[18px]">balance</span>}
                                    {loading ? "Comparing…" : "Compare"}
                                </button>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-xl flex items-center gap-3 text-red-700 dark:text-red-400 shadow-sm">
                            <span className="material-symbols-outlined">error</span>
                            <span className="text-sm font-medium">{error}</span>
                        </div>
                    )}

                    {!result && !loading && !error && (
                        <div className="py-20 flex flex-col items-center justify-center text-center px-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
                            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-3xl text-slate-400">query_stats</span>
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Ready to Compare</h3>
                            <p className="text-sm text-slate-500 max-w-sm">Select two runs from the dropdowns above to analyze performance deltas and identify regressions.</p>
                        </div>
                    )}

                    {result && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                            {result.delta.regression && (
                                <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-xl flex items-start gap-3 text-red-800 dark:text-red-300 shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-bl-full -mr-8 -mt-8 pointer-events-none"></div>
                                    <span className="material-symbols-outlined text-red-500 mt-0.5">warning</span>
                                    <div>
                                        <h4 className="font-bold text-sm">Regression Detected</h4>
                                        <p className="text-sm mt-1 opacity-90">Run B shows significant performance degradation compared to the baseline.</p>
                                    </div>
                                </div>
                            )}

                            {/* Side-by-side Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 items-stretch">
                                {/* Run A */}
                                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col relative">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-slate-300 dark:bg-slate-600"></div>
                                    <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Baseline</span>
                                        <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                                            Run A
                                        </h3>
                                        <div className="text-xs text-slate-500 mt-1 truncate" title={`${result.runA.target.name} / ${result.runA.plan.name}`}>
                                            {result.runA.target.name} <span className="mx-1">/</span> {result.runA.plan.name}
                                        </div>
                                        {result.runA.label && <span className="inline-block mt-2 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">{result.runA.label}</span>}
                                    </div>
                                    <div className="p-5 flex-1 bg-white dark:bg-slate-900">
                                        <MetricsDisplay m={result.runA.metrics} />
                                    </div>
                                </div>

                                {/* VS Divider */}
                                <div className="flex justify-center items-center py-4 md:py-0">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-sm z-10 mx-auto">
                                        <span className="text-xs font-black text-slate-400">VS</span>
                                    </div>
                                </div>

                                {/* Run B */}
                                <div className={`bg-white dark:bg-slate-900 rounded-xl border shadow-sm overflow-hidden flex flex-col relative ${result.delta.regression ? 'border-red-200 dark:border-red-900/50 ring-1 ring-red-500/20 shadow-red-500/5' : 'border-slate-200 dark:border-slate-800'}`}>
                                    <div className={`absolute top-0 left-0 w-full h-1 ${result.delta.regression ? 'bg-red-500' : 'bg-primary'}`}></div>
                                    <div className={`px-5 py-4 border-b bg-slate-50/50 dark:bg-slate-800/20 ${result.delta.regression ? 'border-red-100 dark:border-red-900/30' : 'border-slate-100 dark:border-slate-800'}`}>
                                        <span className={`text-[10px] font-bold uppercase tracking-wider mb-1 block ${result.delta.regression ? 'text-red-500' : 'text-primary'}`}>Current</span>
                                        <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                                            Run B
                                        </h3>
                                        <div className="text-xs text-slate-500 mt-1 truncate" title={`${result.runB.target.name} / ${result.runB.plan.name}`}>
                                            {result.runB.target.name} <span className="mx-1">/</span> {result.runB.plan.name}
                                        </div>
                                        {result.runB.label && <span className={`inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded border ${result.delta.regression ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/50' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/50'}`}>{result.runB.label}</span>}
                                    </div>
                                    <div className="p-5 flex-1 bg-white dark:bg-slate-900">
                                        <MetricsDisplay m={result.runB.metrics} />
                                    </div>
                                </div>
                            </div>

                            {/* Delta Summary */}
                            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-slate-400">analytics</span>
                                    <h3 className="font-bold text-slate-800 dark:text-white">Delta Analysis</h3>
                                </div>
                                <div className="p-6 space-y-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <DeltaCard label="p95 Latency" value={result.delta.p95Ms} suffix="%" invert icon="speed" />
                                        <DeltaCard label="Error Rate" value={result.delta.errorRate} suffix="%" invert icon="error" />
                                        <DeltaCard label="Avg RPS" value={result.delta.avgRps} suffix=" req/s" invert={false} isAbsolute icon="bolt" />
                                    </div>

                                    <div className="bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50 rounded-lg p-5">
                                        <h4 className="font-bold text-sm text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-primary text-[18px]">psychology</span>
                                            Interpretation
                                        </h4>
                                        <ul className="space-y-3">
                                            {result.delta.p95Ms !== null && (
                                                <li className="flex items-start gap-3 text-sm">
                                                    <span className={`material-symbols-outlined text-[18px] mt-0.5 ${result.delta.p95Ms > 0 ? (result.delta.p95Ms > 20 ? "text-red-500" : "text-amber-500") : "text-green-500"}`}>
                                                        {result.delta.p95Ms > 0 ? "trending_up" : "trending_down"}
                                                    </span>
                                                    <div>
                                                        <span className="text-slate-600 dark:text-slate-300">p95 latency {result.delta.p95Ms > 0 ? "increased" : "decreased"} by </span>
                                                        <strong className={result.delta.p95Ms > 20 ? "text-red-600 dark:text-red-400" : (result.delta.p95Ms < 0 ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400")}>
                                                            {Math.abs(result.delta.p95Ms).toFixed(1)}%
                                                        </strong>
                                                        <span className="text-slate-500 dark:text-slate-400 text-xs ml-1 block mt-0.5">
                                                            {result.delta.p95Ms > 20 ? "⚠️ regression threshold exceeded (>20%)" : "within acceptable variance range"}
                                                        </span>
                                                    </div>
                                                </li>
                                            )}
                                            {result.delta.errorRate !== null && (
                                                <li className="flex items-start gap-3 text-sm">
                                                    <span className={`material-symbols-outlined text-[18px] mt-0.5 ${result.delta.errorRate > 0 ? "text-red-500" : "text-green-500"}`}>
                                                        {result.delta.errorRate > 0 ? "trending_up" : "trending_down"}
                                                    </span>
                                                    <div>
                                                        <span className="text-slate-600 dark:text-slate-300">Error rate {result.delta.errorRate > 0 ? "increased" : "decreased"} by </span>
                                                        <strong className={result.delta.errorRate > 50 ? "text-red-600 dark:text-red-400" : (result.delta.errorRate < 0 ? "text-green-600 dark:text-green-400" : "text-slate-800 dark:text-slate-200")}>
                                                            {Math.abs(result.delta.errorRate).toFixed(1)}%
                                                        </strong>
                                                    </div>
                                                </li>
                                            )}
                                            {result.delta.avgRps !== null && (
                                                <li className="flex items-start gap-3 text-sm">
                                                    <span className={`material-symbols-outlined text-[18px] mt-0.5 ${result.delta.avgRps > 0 ? "text-green-500" : "text-red-500"}`}>
                                                        {result.delta.avgRps > 0 ? "trending_up" : "trending_down"}
                                                    </span>
                                                    <div>
                                                        <span className="text-slate-600 dark:text-slate-300">Throughput {result.delta.avgRps > 0 ? "improved" : "degraded"} by </span>
                                                        <strong className={result.delta.avgRps > 0 ? "text-green-600 dark:text-green-400" : (result.delta.avgRps < 0 ? "text-red-600 dark:text-red-400" : "text-slate-800 dark:text-slate-200")}>
                                                            {Math.abs(result.delta.avgRps).toFixed(1)} req/s
                                                        </strong>
                                                    </div>
                                                </li>
                                            )}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function MetricsDisplay({ m }: { m: any }) {
    if (!m) return (
        <div className="h-full border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-lg flex flex-col items-center justify-center p-6 text-center text-slate-400">
            <span className="material-symbols-outlined text-3xl mb-2 opacity-50">hourglass_empty</span>
            <span className="text-sm font-medium">No metrics available</span>
        </div>
    );

    return (
        <div className="flex flex-col gap-3">
            {[
                { label: "Total Requests", value: m.totalRequests?.toLocaleString(), icon: "data_usage" },
                { label: "Avg RPS", value: m.avgRps?.toFixed(1), icon: "bolt" },
                { label: "p95 Latency", value: `${m.p95Ms?.toFixed(0)} ms`, icon: "speed" },
                { label: "Error Rate", value: `${(m.errorRate * 100).toFixed(2)}%`, icon: "error" },
            ].map((item) => (
                <div key={item.label} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-2 sm:p-0 border-b border-slate-50 dark:border-slate-800/50 sm:border-0 last:border-0">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px] text-slate-400">{item.icon}</span>
                        {item.label}
                    </span>
                    <span className="font-mono text-sm font-medium text-slate-900 dark:text-slate-200">{item.value}</span>
                </div>
            ))}

            <div className={`mt-2 p-2.5 rounded-lg flex items-center justify-between border ${m.sloPass
                    ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
                    : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
                }`}>
                <span className="text-xs font-bold uppercase tracking-wider">Service Level Obj.</span>
                <span className="font-black text-sm uppercase tracking-wider flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">{m.sloPass ? 'check_circle' : 'cancel'}</span>
                    {m.sloPass ? "PASS" : "FAIL"}
                </span>
            </div>
        </div>
    );
}

function DeltaCard({ label, value, suffix, invert = false, isAbsolute = false, icon }: {
    label: string; value: number | null; suffix: string; invert?: boolean; isAbsolute?: boolean; icon: string;
}) {
    // Determine condition: positive=good, negative=bad, neutral=0
    let state = "neutral";
    if (value !== null && value !== 0) {
        if (invert) {
            state = value < 0 ? "positive" : "negative";
        } else {
            state = value > 0 ? "positive" : "negative";
        }
    }

    const colorClasses = {
        neutral: "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300",
        positive: "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30 text-green-600 dark:text-green-400",
        negative: "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400",
    };

    const text = value === null ? "—"
        : `${value > 0 ? "+" : ""}${value.toFixed(1)}${suffix}`;

    const trendIcon = value === null || value === 0 ? "horizontal_rule" : (value > 0 ? "trending_up" : "trending_down");

    return (
        <div className={`rounded-xl border p-4 text-center flex flex-col items-center justify-center relative overflow-hidden group transition-colors ${colorClasses[state as keyof typeof colorClasses]}`}>
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="material-symbols-outlined text-4xl">{icon}</span>
            </div>
            <span className="text-xs font-bold uppercase tracking-wider opacity-70 mb-1 z-10">{label}</span>
            <div className="flex items-center justify-center gap-1.5 z-10">
                {value !== null && value !== 0 && (
                    <span className="material-symbols-outlined text-[20px] mb-0.5">{trendIcon}</span>
                )}
                <span className="text-2xl font-black font-mono tracking-tight">{text}</span>
            </div>
        </div>
    );
}
