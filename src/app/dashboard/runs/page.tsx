"use client";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface Target { id: string; name: string; }
interface Plan { id: string; name: string; targetId?: string; }
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

    const filteredPlans = runForm.targetId
        ? plans.filter((p: any) => p.targetId === runForm.targetId || !p.targetId)
        : plans;

    return (
        <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden text-slate-900 dark:text-slate-100 font-display">
            {/* Header */}
            <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-8 shrink-0">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Run History <span className="text-sm font-normal text-slate-500 ml-2">({total} total)</span></h2>
                </div>
                {canRun && (
                    <button id="launch-run-btn" onClick={() => { setShowRunModal(true); setRunError(""); }} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-primary/90 transition-colors">
                        <span className="material-symbols-outlined text-lg">rocket_launch</span>
                        New Run
                    </button>
                )}
            </header>

            {/* Main Area */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">

                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col min-h-0">
                    {/* Toolbar / Filters */}
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-4 shrink-0 bg-slate-50/50 dark:bg-slate-800/30">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-slate-400 text-sm">filter_list</span>
                            <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Filters:</span>
                        </div>
                        <select className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none max-w-[200px]" value={filters.targetId} onChange={(e) => setFilters({ ...filters, targetId: e.target.value })}>
                            <option value="">All Targets</option>
                            {targets.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        <select className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none max-w-[200px]" value={filters.planId} onChange={(e) => setFilters({ ...filters, planId: e.target.value })}>
                            <option value="">All Plans</option>
                            {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <select className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none max-w-[160px]" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                            <option value="">All Status</option>
                            {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                        </select>
                        <div className="relative flex-1 min-w-[200px] max-w-sm">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                            <input type="text" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="Search label/tag…" value={filters.label} onChange={(e) => setFilters({ ...filters, label: e.target.value })} />
                        </div>
                    </div>

                    {/* Table */}
                    {loading ? (
                        <div className="p-12 flex justify-center items-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : runs.length === 0 ? (
                        <div className="p-16 text-center flex flex-col items-center">
                            <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">rocket</span>
                            <h3 className="font-bold text-slate-900 dark:text-white text-lg">No Runs Found</h3>
                            <p className="text-slate-500 mb-4 max-w-sm">Try adjusting your filters, or launch a new load test execution.</p>
                            {canRun && (
                                <button onClick={() => { setShowRunModal(true); setRunError(""); }} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-primary/90 transition-colors">
                                    <span className="material-symbols-outlined text-lg">rocket_launch</span>
                                    Launch Run
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto flex-1">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs font-bold uppercase tracking-wider sticky top-0 z-10">
                                    <tr>
                                        <th className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 w-32">Status</th>
                                        <th className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">Test Execution</th>
                                        <th className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">Performance Metrics</th>
                                        <th className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">Details</th>
                                        <th className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                    {runs.map((run) => (
                                        <tr key={run.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1 items-start">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${run.status === 'DONE' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                            run.status === 'RUNNING' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 animate-pulse' :
                                                                run.status === 'FAILED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                                    run.status === 'CANCELED' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                                                                        'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                                        }`}>
                                                        {run.status === 'RUNNING' && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5 animate-ping"></span>}
                                                        {run.status}
                                                    </span>
                                                    {run.metricsAgg != null && (
                                                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${run.metricsAgg.sloPass ? "text-green-600 bg-green-50 dark:bg-green-900/20" : "text-red-600 bg-red-50 dark:bg-red-900/20"}`}>
                                                            {run.metricsAgg.sloPass ? "SLO PASS" : "SLO FAIL"}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="font-bold text-slate-900 dark:text-white text-sm hover:text-primary cursor-pointer truncate max-w-[200px]" title={run.plan?.name}>{run.plan?.name}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-xs text-slate-500 truncate max-w-[120px]" title={run.target?.name}>{run.target?.name}</span>
                                                        {run.label && <span className="text-[10px] bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded border border-blue-100 dark:border-blue-800">{run.label}</span>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm font-mono text-slate-600 dark:text-slate-400">
                                                    <div className="flex items-center gap-1" title="95th Percentile Latency">
                                                        <span className="text-slate-400 material-symbols-outlined text-[14px]">speed</span>
                                                        {run.metricsAgg ? `${run.metricsAgg.p95Ms.toFixed(0)} ms` : "—"}
                                                    </div>
                                                    <div className="flex items-center gap-1" title="Requests Per Second">
                                                        <span className="text-slate-400 material-symbols-outlined text-[14px]">bolt</span>
                                                        {run.metricsAgg ? `${run.metricsAgg.avgRps.toFixed(1)} req/s` : "—"}
                                                    </div>
                                                    <div className="flex items-center gap-1" title="Error Rate">
                                                        <span className="text-slate-400 material-symbols-outlined text-[14px]">error</span>
                                                        <span className={run.metricsAgg && run.metricsAgg.errorRate > 0.05 ? "text-red-500 font-bold" : ""}>
                                                            {run.metricsAgg ? `${(run.metricsAgg.errorRate * 100).toFixed(2)}%` : "—"}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1" title="Total Requests">
                                                        <span className="text-slate-400 material-symbols-outlined text-[14px]">data_usage</span>
                                                        {run.metricsAgg ? run.metricsAgg.totalRequests.toLocaleString() : "—"}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                        <span className="material-symbols-outlined text-[14px]">tune</span>
                                                        <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">{run.vusOverride ?? "Default"} VUs × {run.durationOverride ?? "Default"}s</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                                                        {run.createdAt ? new Date(run.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : "—"}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                        <span className="material-symbols-outlined text-[14px]">person</span>
                                                        {run.triggeredBy?.username || "System"}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Link href={`/dashboard/runs/${run.id}`} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-primary hover:text-primary text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
                                                        Details
                                                    </Link>
                                                    {canRun && (run.status === "RUNNING" || run.status === "QUEUED") && (
                                                        <button onClick={() => cancelRun(run.id)} className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 hover:dark:bg-red-900/40 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
                                                            Cancel
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {total > LIMIT && (
                        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-800/30">
                            <p className="text-sm text-slate-500">Showing <span className="font-bold text-slate-900 dark:text-white">{Math.min(LIMIT * (page - 1) + 1, total)}</span> to <span className="font-bold text-slate-900 dark:text-white">{Math.min(LIMIT * page, total)}</span> of <span className="font-bold text-slate-900 dark:text-white">{total}</span> results</p>
                            <div className="flex gap-2">
                                <button disabled={page === 1} onClick={() => setPage(page - 1)} className="px-3 py-1.5 text-sm font-bold border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 hover:dark:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Previous</button>
                                <button disabled={page >= Math.ceil(total / LIMIT)} onClick={() => setPage(page + 1)} className="px-3 py-1.5 text-sm font-bold border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 hover:dark:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Next</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Launch Run Modal */}
            {showRunModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2"><span className="material-symbols-outlined text-primary">rocket_launch</span> Launch Test</h3>
                            <button onClick={() => setShowRunModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5">
                            {runError && (
                                <div className="p-3 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium border border-red-100 dark:border-red-900/20">{runError}</div>
                            )}

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Target API</label>
                                    <select value={runForm.targetId} onChange={(e) => setRunForm({ ...runForm, targetId: e.target.value, planId: "" })} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none">
                                        <option value="">-- Select Target --</option>
                                        {targets.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Test Plan</label>
                                    <select value={runForm.planId} onChange={(e) => setRunForm({ ...runForm, planId: e.target.value })} disabled={!runForm.targetId} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none disabled:opacity-50">
                                        <option value="">-- Select Plan --</option>
                                        {filteredPlans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex justify-between">
                                        Run Label / Tag <span className="font-normal text-[10px] text-slate-400 normal-case">Optional</span>
                                    </label>
                                    <input value={runForm.label} onChange={(e) => setRunForm({ ...runForm, label: e.target.value })} placeholder="e.g. baseline-v1.4, release-candidate" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
                                </div>

                                <div className="pt-2">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1"></div>
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overrides (Optional)</span>
                                        <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1"></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">VUs</label>
                                            <input value={runForm.vusOverride} onChange={(e) => setRunForm({ ...runForm, vusOverride: e.target.value })} type="number" min={1} placeholder="Plan Default" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none font-mono placeholder:font-sans text-center" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Duration (s)</label>
                                            <input value={runForm.durationOverride} onChange={(e) => setRunForm({ ...runForm, durationOverride: e.target.value })} type="number" min={5} placeholder="Plan Default" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none font-mono placeholder:font-sans text-center" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-3 bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
                            <button onClick={() => setShowRunModal(false)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors">Cancel</button>
                            <button onClick={launchRun} disabled={launching || !runForm.targetId || !runForm.planId} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 flex items-center justify-center min-w-[120px] disabled:opacity-50">
                                {launching ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : "Launch Run"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
