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

    function deltaClass(val: number | null, invert = false) {
        if (val === null) return "delta-neutral";
        const positive = invert ? val < 0 : val > 0;
        return positive ? "delta-positive" : val === 0 ? "delta-neutral" : "delta-negative";
    }

    function deltaText(val: number | null, suffix = "%") {
        if (val === null) return "—";
        const sign = val > 0 ? "+" : "";
        return `${sign}${val.toFixed(1)}${suffix}`;
    }

    const runOpts = runs.map((r) => ({
        id: r.id,
        label: `${r.target?.name} / ${r.plan?.name}${r.label ? ` [${r.label}]` : ""} · ${new Date(r.createdAt).toLocaleDateString()}`,
    }));

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Compare Runs</h1>
                    <p className="page-subtitle">Delta analysis — baseline vs current</p>
                </div>
            </div>

            <div className="card" style={{ marginBottom: "1.5rem" }}>
                <div className="card-header"><h3 className="card-title">Select Runs to Compare</h3></div>
                <div className="form-row" style={{ alignItems: "flex-end" }}>
                    <div className="form-group">
                        <label className="form-label">Run A (Baseline)</label>
                        <select id="compare-run-a" className="form-select" value={runA} onChange={(e) => setRunA(e.target.value)}>
                            <option value="">-- Select baseline run --</option>
                            {runOpts.filter((r) => r.id !== runB).map((r) => (
                                <option key={r.id} value={r.id}>{r.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Run B (Current)</label>
                        <select id="compare-run-b" className="form-select" value={runB} onChange={(e) => setRunB(e.target.value)}>
                            <option value="">-- Select current run --</option>
                            {runOpts.filter((r) => r.id !== runA).map((r) => (
                                <option key={r.id} value={r.id}>{r.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: "1rem" }}>
                        <button id="compare-btn" className="btn btn-primary" onClick={compare} disabled={!runA || !runB || loading}>
                            {loading ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Comparing…</> : "⚖️ Compare"}
                        </button>
                    </div>
                </div>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            {result && (
                <>
                    {result.delta.regression && (
                        <div className="alert alert-error" style={{ marginBottom: "1.5rem" }}>
                            🚨 <strong>Regression detected!</strong> Run B shows significant degradation compared to baseline.
                        </div>
                    )}

                    {/* Side-by-side comparison */}
                    <div className="compare-grid" style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "1rem", alignItems: "start" }}>
                        {/* Run A */}
                        <div className="card">
                            <div className="card-header">
                                <div>
                                    <h3 className="card-title">Run A — Baseline</h3>
                                    <div className="text-muted text-sm">{result.runA.target} / {result.runA.plan}</div>
                                    {result.runA.label && <span className="badge badge-dev mt-1">{result.runA.label}</span>}
                                </div>
                            </div>
                            <MetricsDisplay m={result.runA.metrics} />
                        </div>

                        {/* VS */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", paddingTop: "3rem" }}>
                            <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-muted)" }}>VS</div>
                        </div>

                        {/* Run B */}
                        <div className="card">
                            <div className="card-header">
                                <div>
                                    <h3 className="card-title">Run B — Current</h3>
                                    <div className="text-muted text-sm">{result.runB.target} / {result.runB.plan}</div>
                                    {result.runB.label && <span className="badge badge-dev mt-1">{result.runB.label}</span>}
                                </div>
                            </div>
                            <MetricsDisplay m={result.runB.metrics} />
                        </div>
                    </div>

                    {/* Delta Summary */}
                    <div className="card" style={{ marginTop: "1.5rem" }}>
                        <div className="card-header"><h3 className="card-title">Delta Summary</h3></div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                            <DeltaCard label="p95 Latency" value={result.delta.p95Ms} suffix="%" invert />
                            <DeltaCard label="Error Rate" value={result.delta.errorRate} suffix="%" invert />
                            <DeltaCard label="Avg RPS" value={result.delta.avgRps} suffix=" req/s" invert={false} isAbsolute />
                        </div>

                        <div style={{ marginTop: "1rem", padding: "1rem", background: "var(--bg-secondary)", borderRadius: 8 }}>
                            <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Interpretation</div>
                            <ul style={{ color: "var(--text-secondary)", fontSize: "0.85rem", paddingLeft: "1.2rem" }}>
                                {result.delta.p95Ms !== null && (
                                    <li style={{ marginBottom: "0.3rem" }}>
                                        p95 latency {result.delta.p95Ms > 0 ? "increased" : "decreased"} by{" "}
                                        <strong className={result.delta.p95Ms > 20 ? "text-red" : "text-green"}>
                                            {Math.abs(result.delta.p95Ms).toFixed(1)}%
                                        </strong>
                                        {result.delta.p95Ms > 20 ? " — ⚠️ regression threshold exceeded (>20%)" : " — within acceptable range"}
                                    </li>
                                )}
                                {result.delta.errorRate !== null && (
                                    <li style={{ marginBottom: "0.3rem" }}>
                                        Error rate {result.delta.errorRate > 0 ? "increased" : "decreased"} by{" "}
                                        <strong className={result.delta.errorRate > 50 ? "text-red" : "text-green"}>
                                            {Math.abs(result.delta.errorRate).toFixed(1)}%
                                        </strong>
                                    </li>
                                )}
                                {result.delta.avgRps !== null && (
                                    <li>
                                        Throughput {result.delta.avgRps > 0 ? "improved" : "degraded"} by{" "}
                                        <strong>{Math.abs(result.delta.avgRps).toFixed(1)} req/s</strong>
                                    </li>
                                )}
                            </ul>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

function MetricsDisplay({ m }: { m: any }) {
    if (!m) return <p className="text-muted text-sm">No metrics</p>;
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {[
                ["Total Requests", m.totalRequests?.toLocaleString()],
                ["Avg RPS", m.avgRps?.toFixed(1)],
                ["p95 Latency", `${m.p95Ms?.toFixed(0)}ms`],
                ["Error Rate", `${(m.errorRate * 100).toFixed(2)}%`],
                ["SLO", m.sloPass ? "✅ PASS" : "❌ FAIL"],
            ].map(([k, v]) => (
                <div key={k} className="flex items-center" style={{ justifyContent: "space-between" }}>
                    <span className="text-muted text-sm">{k}</span>
                    <span className="font-mono text-sm">{v}</span>
                </div>
            ))}
        </div>
    );
}

function DeltaCard({ label, value, suffix, invert = false, isAbsolute = false }: {
    label: string; value: number | null; suffix: string; invert?: boolean; isAbsolute?: boolean;
}) {
    const cls = value === null ? "delta-neutral"
        : invert
            ? value > 0 ? "delta-positive" : value < 0 ? "delta-negative" : "delta-neutral"
            : value > 0 ? "delta-negative" : value < 0 ? "delta-positive" : "delta-neutral";

    const text = value === null ? "—"
        : isAbsolute
            ? `${value > 0 ? "+" : ""}${value.toFixed(1)}${suffix}`
            : `${value > 0 ? "+" : ""}${value.toFixed(1)}${suffix}`;

    return (
        <div className="card" style={{ textAlign: "center" }}>
            <div className="text-muted text-sm" style={{ marginBottom: "0.5rem" }}>{label}</div>
            <div className={`kpi-value ${cls}`} style={{ fontSize: "1.75rem" }}>{text}</div>
        </div>
    );
}
