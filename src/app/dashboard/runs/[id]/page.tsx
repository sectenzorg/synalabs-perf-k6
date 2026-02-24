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
        <div className="flex-center" style={{ padding: "4rem" }}>
            <div className="spinner" style={{ width: 36, height: 36 }} />
        </div>
    );

    if (!run) return <div className="alert alert-error">Run not found.</div>;

    const m = run.metricsAgg;
    const series = run.metricsSeries.map((s) => ({
        time: new Date(s.bucketTs).toLocaleTimeString(),
        RPS: +s.rps.toFixed(2),
        "p95 (ms)": +s.p95Ms.toFixed(1),
        "Err%": +(s.errorRate * 100).toFixed(2),
    }));

    const statusCodes = m ? Object.entries(m.statusCodes as Record<string, number>).sort(([, a], [, b]) => b - a) : [];

    const statusClass: Record<string, string> = {
        RUNNING: "badge-running", DONE: "badge-done",
        FAILED: "badge-failed", QUEUED: "badge-queued", CANCELED: "badge-canceled",
    };

    async function cancel() {
        await fetch(`/api/runs/${id}/cancel`, { method: "POST" });
        load();
    }

    return (
        <div>
            {/* Header */}
            <div className="page-header">
                <div>
                    <div className="flex items-center gap-3" style={{ marginBottom: "0.3rem" }}>
                        <Link href="/dashboard/runs" className="btn btn-ghost btn-sm">← Back</Link>
                        <span className={`badge ${statusClass[run.status]}`}>
                            <span className={`status-dot dot-${run.status.toLowerCase()}`} style={{ marginRight: 4 }} />
                            {run.status}
                        </span>
                        {run.label && <span className="badge badge-dev">{run.label}</span>}
                    </div>
                    <h1 className="page-title">{run.target.name} — {run.plan.name}</h1>
                    <p className="page-subtitle">
                        {run.plan.method} {run.target.baseUrl}{run.plan.path} &nbsp;·&nbsp;
                        by {run.triggeredBy.username} &nbsp;·&nbsp;
                        {new Date(run.createdAt).toLocaleString()}
                    </p>
                </div>
                <div className="flex gap-2">
                    {(run.status === "RUNNING" || run.status === "QUEUED") && (
                        <button className="btn btn-danger" onClick={cancel}>⛔ Cancel</button>
                    )}
                    {run.status === "DONE" || run.status === "FAILED" ? (
                        <a href={`/api/runs/${id}/report`} className="btn btn-secondary" target="_blank">
                            📄 Export HTML
                        </a>
                    ) : null}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="kpi-grid">
                <div className="kpi-card">
                    <div className="kpi-label">Total Requests</div>
                    <div className="kpi-value">{m?.totalRequests?.toLocaleString() ?? "—"}</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-label">Avg RPS</div>
                    <div className="kpi-value">{m ? m.avgRps.toFixed(1) : "—"}</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-label">p50 Latency</div>
                    <div className="kpi-value">{m ? `${m.p50Ms.toFixed(0)}ms` : "—"}</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-label">p95 Latency</div>
                    <div className="kpi-value" style={{ color: m && run.plan.sloP95Ms && m.p95Ms > run.plan.sloP95Ms ? "var(--accent-red)" : undefined }}>
                        {m ? `${m.p95Ms.toFixed(0)}ms` : "—"}
                    </div>
                    {run.plan.sloP95Ms && <div className="kpi-sub">SLO: &lt; {run.plan.sloP95Ms}ms</div>}
                </div>
                <div className="kpi-card">
                    <div className="kpi-label">p99 Latency</div>
                    <div className="kpi-value">{m ? `${m.p99Ms.toFixed(0)}ms` : "—"}</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-label">Error Rate</div>
                    <div className="kpi-value" style={{ color: m && m.errorRate > 0.05 ? "var(--accent-red)" : "var(--accent-green)" }}>
                        {m ? `${(m.errorRate * 100).toFixed(2)}%` : "—"}
                    </div>
                    {run.plan.sloErrorPct != null && <div className="kpi-sub">SLO: &lt; {run.plan.sloErrorPct}%</div>}
                </div>
                <div className="kpi-card">
                    <div className="kpi-label">Duration</div>
                    <div className="kpi-value">{m ? `${m.durationSec.toFixed(0)}s` : "—"}</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-label">SLO Gate</div>
                    <div className="kpi-value">
                        {m != null
                            ? <span className={`badge ${m.sloPass ? "badge-pass" : "badge-fail"}`} style={{ fontSize: "1rem", padding: "0.3rem 0.8rem" }}>
                                {m.sloPass ? "✅ PASS" : "❌ FAIL"}
                            </span>
                            : "—"
                        }
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="tabs">
                {["overview", "charts", "insights", "logs"].map((tab) => (
                    <button key={tab} className={`tab ${activeTab === tab ? "active" : ""}`} onClick={() => setActiveTab(tab)}>
                        {tab === "overview" ? "📋 Overview" : tab === "charts" ? "📈 Charts" : tab === "insights" ? "💡 Insights" : "🖥 Logs"}
                    </button>
                ))}
            </div>

            {/* Overview Tab */}
            {activeTab === "overview" && (
                <div className="grid-2">
                    <div className="card">
                        <div className="card-header"><h3 className="card-title">Status Code Distribution</h3></div>
                        {statusCodes.length === 0 ? <p className="text-muted text-sm">No data yet</p> : (
                            <table>
                                <thead><tr><th>Code</th><th>Count</th><th>%</th></tr></thead>
                                <tbody>
                                    {statusCodes.map(([code, count]) => (
                                        <tr key={code}>
                                            <td><span className={`badge ${parseInt(code) >= 400 ? "badge-failed" : "badge-done"}`}>{code}</span></td>
                                            <td className="font-mono">{count.toLocaleString()}</td>
                                            <td className="font-mono text-muted">{m ? ((count / m.totalRequests) * 100).toFixed(1) : 0}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    <div>
                        <div className="card" style={{ marginBottom: "1rem" }}>
                            <div className="card-header"><h3 className="card-title">Test Configuration</h3></div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                {[
                                    ["Target", run.target.name],
                                    ["URL", `${run.target.baseUrl}${run.plan.path}`],
                                    ["Method", run.plan.method],
                                    ["Environment", run.target.environment],
                                    ["VUs", String(run.vusOverride ?? run.plan.vus)],
                                    ["Duration", `${run.durationOverride ?? run.plan.duration}s`],
                                ].map(([k, v]) => (
                                    <div key={k} className="flex items-center" style={{ justifyContent: "space-between", paddingBottom: "0.4rem", borderBottom: "1px solid var(--border)" }}>
                                        <span className="text-muted text-sm">{k}</span>
                                        <span className="text-sm font-mono">{v}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {m && m.topErrors.length > 0 && (
                            <div className="card">
                                <div className="card-header"><h3 className="card-title">Top Errors</h3></div>
                                {(m.topErrors as any[]).slice(0, 5).map((e: any, i: number) => (
                                    <div key={i} className="flex items-center gap-2" style={{ padding: "0.4rem 0", borderBottom: "1px solid var(--border)", justifyContent: "space-between" }}>
                                        <span className="text-sm text-red truncate">{e.msg}</span>
                                        <span className="badge badge-failed">{e.count}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Charts Tab */}
            {activeTab === "charts" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {series.length === 0 ? (
                        <div className="empty-state"><div className="empty-state-icon">📈</div><h3>No time-series data</h3><p>Charts will appear after run completes</p></div>
                    ) : (
                        <>
                            {[
                                { key: "RPS", color: "#3b82f6", label: "Requests per Second" },
                                { key: "p95 (ms)", color: "#8b5cf6", label: "p95 Latency (ms)" },
                                { key: "Err%", color: "#ef4444", label: "Error Rate (%)" },
                            ].map(({ key, color, label }) => (
                                <div key={key} className="card">
                                    <div className="card-header"><h3 className="card-title">{label}</h3></div>
                                    <ResponsiveContainer width="100%" height={200}>
                                        <LineChart data={series} margin={{ left: -10 }}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                                            <YAxis tick={{ fontSize: 10 }} />
                                            <Tooltip contentStyle={{ background: "#1a2235", border: "1px solid #1e3a5f", borderRadius: 8 }} />
                                            <Line type="monotone" dataKey={key} stroke={color} dot={false} strokeWidth={2} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            ))}
                        </>
                    )}
                </div>
            )}

            {/* Insights Tab */}
            {activeTab === "insights" && (
                <div className="card">
                    <div className="card-header"><h3 className="card-title">Rule-based Insights</h3></div>
                    {run.insights.length === 0 ? (
                        <p className="text-muted text-sm">Insights will be generated after run completes.</p>
                    ) : (
                        run.insights.map((ins) => (
                            <div key={ins.id} className={`insight-item ${ins.level}`}>
                                <div>
                                    <div className="insight-msg">{ins.message}</div>
                                    {ins.detail && <div className="insight-detail">{ins.detail}</div>}
                                    <div className="text-xs text-muted" style={{ marginTop: "0.3rem" }}>
                                        Category: {ins.category}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Logs Tab */}
            {activeTab === "logs" && (
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Live Output</h3>
                        <button className="btn btn-ghost btn-sm" onClick={loadLogs}>↻ Refresh</button>
                    </div>
                    <div className="log-viewer">
                        {logs || "No logs yet. k6 output will appear here during run…"}
                    </div>
                </div>
            )}
        </div>
    );
}
