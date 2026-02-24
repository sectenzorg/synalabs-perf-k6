"use client";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface Target { id: string; name: string; }
interface Plan { id: string; name: string; }
interface Run {
    id: string; status: string; label?: string;
    createdAt: string; startedAt?: string; finishedAt?: string;
    vusOverride?: number; durationOverride?: number;
    target: { id: string; name: string };
    plan: { id: string; name: string };
    triggeredBy: { username: string };
    metricsAgg?: {
        totalRequests: number; errorRate: number;
        p95Ms: number; avgRps: number; sloPass: boolean;
    };
}

const STATUS_OPTIONS = ["QUEUED", "RUNNING", "DONE", "FAILED", "CANCELED"];

export default function RunsPage() {
    const { data: session } = useSession();
    const [runs, setRuns] = useState<Run[]>([]);
    const [targets, setTargets] = useState<Target[]>([]);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ targetId: "", planId: "", status: "", label: "" });
    const [showRunModal, setShowRunModal] = useState(false);
    const [runForm, setRunForm] = useState({ targetId: "", planId: "", label: "", vusOverride: "", durationOverride: "" });
    const [launching, setLaunching] = useState(false);
    const [runError, setRunError] = useState("");
    const canRun = session?.user.role !== "VIEWER";
    const LIMIT = 20;

    const load = useCallback(async () => {
        setLoading(true);
        const p = new URLSearchParams({
            page: String(page), limit: String(LIMIT),
            ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
        });
        const res = await fetch(`/api/runs?${p}`);
        const data = await res.json();
        setRuns(data.runs ?? []);
        setTotal(data.total ?? 0);
        setLoading(false);
    }, [page, filters]);

    useEffect(() => { load(); }, [load]);

    // Auto-refresh when there are active runs
    useEffect(() => {
        const hasActive = runs.some((r) => r.status === "RUNNING" || r.status === "QUEUED");
        if (!hasActive) return;
        const t = setInterval(load, 3000);
        return () => clearInterval(t);
    }, [runs, load]);

    useEffect(() => {
        Promise.all([fetch("/api/targets"), fetch("/api/plans")]).then(async ([t, p]) => {
            setTargets(await t.json());
            setPlans(await p.json());
        });
    }, []);

    async function launchRun() {
        setRunError(""); setLaunching(true);
        try {
            const body: any = {
                targetId: runForm.targetId,
                planId: runForm.planId,
                label: runForm.label || null,
                vusOverride: runForm.vusOverride ? parseInt(runForm.vusOverride) : null,
                durationOverride: runForm.durationOverride ? parseInt(runForm.durationOverride) : null,
            };
            const res = await fetch("/api/runs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                const d = await res.json();
                setRunError(d.error ?? "Failed to launch"); return;
            }
            setShowRunModal(false);
            load();
        } finally {
            setLaunching(false);
        }
    }

    async function cancelRun(id: string) {
        await fetch(`/api/runs/${id}/cancel`, { method: "POST" });
        load();
    }

    const statusClass: Record<string, string> = {
        RUNNING: "badge-running", DONE: "badge-done",
        FAILED: "badge-failed", QUEUED: "badge-queued", CANCELED: "badge-canceled",
    };

    const filteredPlans = runForm.targetId
        ? plans.filter((p: any) => p.targetId === runForm.targetId || !p.targetId)
        : plans;

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Run History</h1>
                    <p className="page-subtitle">All stress test executions — {total} total</p>
                </div>
                {canRun && (
                    <button id="launch-run-btn" className="btn btn-primary" onClick={() => { setShowRunModal(true); setRunError(""); }}>
                        🚀 New Run
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 mb-4" style={{ flexWrap: "wrap" }}>
                <select className="form-select" style={{ maxWidth: 200 }} value={filters.targetId} onChange={(e) => setFilters({ ...filters, targetId: e.target.value })}>
                    <option value="">All Targets</option>
                    {targets.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <select className="form-select" style={{ maxWidth: 200 }} value={filters.planId} onChange={(e) => setFilters({ ...filters, planId: e.target.value })}>
                    <option value="">All Plans</option>
                    {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <select className="form-select" style={{ maxWidth: 160 }} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                    <option value="">All Status</option>
                    {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                </select>
                <input className="form-input" style={{ maxWidth: 200 }} placeholder="Search label/tag…" value={filters.label} onChange={(e) => setFilters({ ...filters, label: e.target.value })} />
            </div>

            <div className="card">
                {loading ? (
                    <div className="flex-center" style={{ padding: "3rem" }}>
                        <div className="spinner" style={{ width: 36, height: 36 }} />
                    </div>
                ) : runs.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">🚀</div>
                        <h3>No runs found</h3>
                        <p>Launch a new run to get started</p>
                    </div>
                ) : (
                    <>
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Status</th>
                                        <th>Target</th>
                                        <th>Plan</th>
                                        <th>Label</th>
                                        <th>Config</th>
                                        <th>p95</th>
                                        <th>Err%</th>
                                        <th>RPS</th>
                                        <th>SLO</th>
                                        <th>By</th>
                                        <th>Started</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {runs.map((run) => (
                                        <tr key={run.id}>
                                            <td>
                                                <div className="flex items-center gap-2">
                                                    <span className={`status-dot dot-${run.status.toLowerCase()}`} />
                                                    <span className={`badge ${statusClass[run.status]}`}>{run.status}</span>
                                                </div>
                                            </td>
                                            <td style={{ maxWidth: 120 }} className="truncate">{run.target?.name}</td>
                                            <td style={{ maxWidth: 140 }} className="truncate">{run.plan?.name}</td>
                                            <td>{run.label ? <span className="badge badge-dev">{run.label}</span> : <span className="text-muted">—</span>}</td>
                                            <td className="font-mono text-sm text-muted">
                                                {run.vusOverride ?? "—"} VU × {run.durationOverride ?? "—"}s
                                            </td>
                                            <td className="font-mono text-sm">{run.metricsAgg ? `${run.metricsAgg.p95Ms.toFixed(0)}ms` : "—"}</td>
                                            <td className="font-mono text-sm" style={{ color: run.metricsAgg && run.metricsAgg.errorRate > 0.05 ? "var(--accent-red)" : undefined }}>
                                                {run.metricsAgg ? `${(run.metricsAgg.errorRate * 100).toFixed(2)}%` : "—"}
                                            </td>
                                            <td className="font-mono text-sm">{run.metricsAgg ? run.metricsAgg.avgRps.toFixed(1) : "—"}</td>
                                            <td>
                                                {run.metricsAgg != null
                                                    ? <span className={`badge ${run.metricsAgg.sloPass ? "badge-pass" : "badge-fail"}`}>{run.metricsAgg.sloPass ? "PASS" : "FAIL"}</span>
                                                    : "—"
                                                }
                                            </td>
                                            <td className="text-muted text-sm">{run.triggeredBy?.username}</td>
                                            <td className="text-muted text-sm">{run.createdAt ? new Date(run.createdAt).toLocaleString() : "—"}</td>
                                            <td>
                                                <div className="flex gap-2">
                                                    <Link href={`/dashboard/runs/${run.id}`} className="btn btn-ghost btn-sm">Details</Link>
                                                    {canRun && (run.status === "RUNNING" || run.status === "QUEUED") && (
                                                        <button className="btn btn-danger btn-sm" onClick={() => cancelRun(run.id)}>Cancel</button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {total > LIMIT && (
                            <div className="flex items-center gap-3 mt-4" style={{ justifyContent: "center" }}>
                                <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(page - 1)}>← Prev</button>
                                <span className="text-muted text-sm">Page {page} of {Math.ceil(total / LIMIT)}</span>
                                <button className="btn btn-secondary btn-sm" disabled={page >= Math.ceil(total / LIMIT)} onClick={() => setPage(page + 1)}>Next →</button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Launch Run Modal */}
            {showRunModal && (
                <div className="modal-overlay" onClick={() => setShowRunModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">🚀 Launch New Run</h3>
                            <button className="modal-close" onClick={() => setShowRunModal(false)}>✕</button>
                        </div>

                        {runError && <div className="alert alert-error">{runError}</div>}

                        <div className="form-group">
                            <label className="form-label">Target <span className="required">*</span></label>
                            <select id="run-target" className="form-select" value={runForm.targetId} onChange={(e) => setRunForm({ ...runForm, targetId: e.target.value, planId: "" })}>
                                <option value="">-- Select Target --</option>
                                {targets.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Test Plan <span className="required">*</span></label>
                            <select id="run-plan" className="form-select" value={runForm.planId} onChange={(e) => setRunForm({ ...runForm, planId: e.target.value })}>
                                <option value="">-- Select Plan --</option>
                                {filteredPlans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Label / Tag (optional)</label>
                            <input id="run-label" className="form-input" value={runForm.label} onChange={(e) => setRunForm({ ...runForm, label: e.target.value })} placeholder="release-1.2.3" />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Override VUs</label>
                                <input id="run-vus" className="form-input" type="number" value={runForm.vusOverride} onChange={(e) => setRunForm({ ...runForm, vusOverride: e.target.value })} placeholder="Leave blank for plan default" min={1} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Override Duration (s)</label>
                                <input id="run-duration" className="form-input" type="number" value={runForm.durationOverride} onChange={(e) => setRunForm({ ...runForm, durationOverride: e.target.value })} placeholder="Leave blank for plan default" min={5} />
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowRunModal(false)}>Cancel</button>
                            <button id="confirm-run-btn" className="btn btn-primary" onClick={launchRun} disabled={launching || !runForm.targetId || !runForm.planId}>
                                {launching ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Launching…</> : "🚀 Launch Run"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
