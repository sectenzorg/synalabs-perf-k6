"use client";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Plan {
    id: string;
    name: string;
    description?: string;
    method: string;
    path: string;
    vus: number;
    duration: number;
    sloP95Ms?: number;
    sloErrorPct?: number;
    planVersion: number;
    target: { id: string; name: string; baseUrl: string; environment: string };
    createdAt: string;
}

interface Target { id: string; name: string; baseUrl: string; environment: string; }

const METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"];
const emptyForm = {
    name: "", description: "", targetId: "",
    method: "GET", path: "/", headers: "{}", body: "",
    expectedStatus: 200,
    vus: 10, duration: 30, rampUpStages: "",
    sloP95Ms: "", sloErrorPct: "", sloMinRps: "",
    envVars: "{}",
};

export default function PlansPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const [plans, setPlans] = useState<Plan[]>([]);
    const [targets, setTargets] = useState<Target[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterTarget, setFilterTarget] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [showRunModal, setShowRunModal] = useState(false);
    const [activePlan, setActivePlan] = useState<Plan | null>(null);
    const [editPlan, setEditPlan] = useState<Plan | null>(null);
    const [form, setForm] = useState({ ...emptyForm });
    const [runForm, setRunForm] = useState({ vus: 10, duration: 30, label: "" });
    const [saving, setSaving] = useState(false);
    const [running, setRunning] = useState(false);
    const [error, setError] = useState("");
    const [preview, setPreview] = useState("");
    const [showPreview, setShowPreview] = useState(false);
    const [activeTab, setActiveTab] = useState("endpoint");
    const canEdit = session?.user.role !== "VIEWER";

    const load = useCallback(async () => {
        const [plansRes, targetsRes] = await Promise.all([
            fetch(`/api/plans?targetId=${filterTarget}`),
            fetch("/api/targets"),
        ]);
        const plansData = await plansRes.json();
        const targetsData = await targetsRes.json();
        setPlans(Array.isArray(plansData) ? plansData : []);
        setTargets(Array.isArray(targetsData) ? targetsData : []);
        setLoading(false);
    }, [filterTarget]);

    useEffect(() => { load(); }, [load]);

    function openCreate() {
        setEditPlan(null);
        setForm({ ...emptyForm, targetId: targets[0]?.id ?? "" });
        setError(""); setActiveTab("endpoint");
        setShowModal(true);
    }

    function openEdit(p: Plan) {
        setEditPlan(p);
        setForm({
            name: p.name, description: p.description ?? "",
            targetId: p.target.id, method: p.method, path: p.path,
            headers: "{}", body: "", expectedStatus: 200,
            vus: p.vus, duration: p.duration, rampUpStages: "",
            sloP95Ms: p.sloP95Ms?.toString() ?? "",
            sloErrorPct: p.sloErrorPct?.toString() ?? "",
            sloMinRps: "", envVars: "{}",
        });
        setError(""); setActiveTab("endpoint");
        setShowModal(true);
    }

    function openRun(p: Plan) {
        setActivePlan(p);
        setRunForm({ vus: p.vus, duration: p.duration, label: `Execution: ${new Date().toLocaleDateString()}` });
        setShowRunModal(true);
    }

    async function save() {
        setError("");
        setSaving(true);
        try {
            const body: any = {
                ...form,
                sloP95Ms: form.sloP95Ms ? parseInt(form.sloP95Ms as string) : null,
                sloErrorPct: form.sloErrorPct ? parseFloat(form.sloErrorPct as string) : null,
                sloMinRps: form.sloMinRps ? parseFloat(form.sloMinRps as string) : null,
                headers: JSON.parse(form.headers || "{}"),
                envVars: JSON.parse(form.envVars || "{}"),
                rampUpStages: form.rampUpStages ? JSON.parse(form.rampUpStages) : null,
            };
            const url = editPlan ? `/api/plans/${editPlan.id}` : "/api/plans";
            const method = editPlan ? "PUT" : "POST";
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                const d = await res.json();
                setError(d.error ?? "Failed to save configuration."); return;
            }
            setShowModal(false); load();
        } catch (e: any) {
            setError(e.message ?? "Invalid configuration metadata.");
        } finally {
            setSaving(false);
        }
    }

    async function executeRun() {
        if (!activePlan) return;
        setRunning(true);
        try {
            const res = await fetch("/api/runs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    targetId: activePlan.target.id,
                    planId: activePlan.id,
                    vusOverride: runForm.vus,
                    durationOverride: runForm.duration,
                    label: runForm.label,
                }),
            });
            if (res.ok) {
                const run = await res.json();
                router.push(`/dashboard/runs/${run.id}`);
            } else {
                const d = await res.json();
                alert(d.error ?? "Failed to initiate execution sequence.");
            }
        } finally {
            setRunning(false);
            setShowRunModal(false);
        }
    }

    async function deletePlan(id: string) {
        if (!confirm("Decommission this profiling plan? Telemetry archives will be retained but the strategy will be removed.")) return;
        await fetch(`/api/plans/${id}`, { method: "DELETE" });
        load();
    }

    async function previewScript(id: string) {
        const res = await fetch(`/api/plans/${id}/preview`, { method: "POST" });
        const data = await res.json();
        setPreview(data.script ?? "");
        setShowPreview(true);
    }

    const f = (k: keyof typeof form, v: any) => setForm((prev) => ({ ...prev, [k]: v }));

    return (
        <div className="space-y-8 animate-in pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-1 font-display">Profiling Strategies</h1>
                    <p className="text-slate-500 text-sm font-medium">Define workloads, stress scenarios, and performance thresholds.</p>
                </div>
                {canEdit && (
                    <button onClick={openCreate} className="btn-primary">
                        <span className="material-symbols-outlined text-lg">add</span>
                        New Strategy
                    </button>
                )}
            </div>

            <div className="space-y-8">
                {/* Filter Bar */}
                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="flex items-center gap-3 px-4 py-2 bg-white border border-slate-200 rounded-xl w-full sm:w-auto shadow-sm">
                        <span className="material-symbols-outlined text-slate-400 text-xl">filter_list</span>
                        <select
                            className="bg-transparent border-none text-sm font-bold text-slate-600 outline-none cursor-pointer pr-8"
                            value={filterTarget}
                            onChange={(e) => setFilterTarget(e.target.value)}
                        >
                            <option value="">All Target Resources</option>
                            {targets.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="py-24 flex justify-center items-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-100 border-t-sky-500"></div>
                    </div>
                ) : plans.length === 0 ? (
                    <div className="card-premium py-24 flex flex-col items-center justify-center text-center px-6 border-slate-100">
                        <div className="size-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-6 border border-slate-100 text-slate-200">
                            <span className="material-symbols-outlined text-3xl">assignment_turned_in</span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-1">No strategies detected</h3>
                        <p className="text-slate-500 text-sm max-w-sm mx-auto mb-8 font-medium">Create your first test scenario to begin performance validation.</p>
                        {canEdit && (
                            <button onClick={openCreate} className="btn-primary scale-90">Provision Strategy</button>
                        )}
                    </div>
                ) : (
                    <div className="card-premium overflow-hidden border-slate-100 bg-white shadow-xl shadow-slate-200/5">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Strategy & Resource</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Logic End-point</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Load Profile</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">SLO Thresholds</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {plans.map((p) => (
                                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-bold text-slate-900">{p.name}</span>
                                                        <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase tracking-wider">REV {p.planVersion}</span>
                                                    </div>
                                                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">{p.target.name} · {p.target.environment}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${p.method === 'GET' ? 'bg-sky-50 text-sky-600 border-sky-100' :
                                                            p.method === 'POST' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                                'bg-slate-50 text-slate-500 border-slate-100'
                                                        }`}>{p.method}</span>
                                                    <span className="text-xs font-mono font-medium text-slate-400 truncate max-w-[140px]">{p.path}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Users</span>
                                                        <span className="text-sm font-bold text-slate-700">{p.vus}</span>
                                                    </div>
                                                    <div className="w-px h-6 bg-slate-100" />
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Duration</span>
                                                        <span className="text-sm font-bold text-slate-700">{p.duration}s</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                {p.sloP95Ms ? (
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600">
                                                            <span className="material-symbols-outlined text-sm text-sky-500 scale-75">speed</span>
                                                            p95 &lt; {p.sloP95Ms}ms
                                                        </div>
                                                        {p.sloErrorPct && (
                                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600">
                                                                <span className="material-symbols-outlined text-sm text-emerald-500 scale-75">check_circle</span>
                                                                Err &lt; {p.sloErrorPct}%
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">No Constraints</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => openRun(p)} className="btn-primary h-9 px-5 scale-90">
                                                        Execute
                                                    </button>
                                                    <div className="flex items-center gap-1">
                                                        <button onClick={() => previewScript(p.id)} className="size-9 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-all border border-slate-100" title="Inspect Logic">
                                                            <span className="material-symbols-outlined text-lg">code</span>
                                                        </button>
                                                        {canEdit && (
                                                            <>
                                                                <button onClick={() => openEdit(p)} className="size-9 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-all border border-slate-100">
                                                                    <span className="material-symbols-outlined text-lg">edit</span>
                                                                </button>
                                                                <button onClick={() => deletePlan(p.id)} className="size-9 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all border border-slate-100">
                                                                    <span className="material-symbols-outlined text-lg">delete</span>
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Run Modal */}
            {showRunModal && activePlan && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
                        <div className="p-10">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Initiate Execution</h3>
                                <button onClick={() => setShowRunModal(false)} className="size-10 rounded-xl bg-slate-50 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <div className="space-y-8">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Run Identifier</label>
                                    <input
                                        value={runForm.label}
                                        onChange={(e) => setRunForm({ ...runForm, label: e.target.value })}
                                        className="w-full h-12 bg-slate-50 border border-slate-200 rounded-2xl px-4 text-sm font-bold focus:bg-white focus:border-sky-500 outline-none transition-all shadow-sm"
                                        placeholder="e.g. Baseline Validation"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Active Users</label>
                                        <input
                                            type="number"
                                            value={runForm.vus}
                                            onChange={(e) => setRunForm({ ...runForm, vus: parseInt(e.target.value) })}
                                            className="w-full h-12 bg-slate-50 border border-slate-200 rounded-2xl px-4 text-sm font-bold focus:bg-white focus:border-sky-500 outline-none transition-all shadow-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Duration (s)</label>
                                        <input
                                            type="number"
                                            value={runForm.duration}
                                            onChange={(e) => setRunForm({ ...runForm, duration: parseInt(e.target.value) })}
                                            className="w-full h-12 bg-slate-50 border border-slate-200 rounded-2xl px-4 text-sm font-bold focus:bg-white focus:border-sky-500 outline-none transition-all shadow-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-10 pt-0 flex gap-4">
                            <button onClick={() => setShowRunModal(false)} className="flex-1 h-14 rounded-2xl text-[11px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors">Discard</button>
                            <button onClick={executeRun} disabled={running} className="flex-[2] h-14 btn-primary text-sm">
                                {running ? (
                                    <div className="size-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <span>Launch Sequence</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-10 py-7 border-b border-slate-50 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-slate-900 tracking-tight">{editPlan ? "Update Strategy Template" : "Provision New Strategy"}</h3>
                            <button onClick={() => setShowModal(false)} className="size-11 flex items-center justify-center rounded-2xl bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-10 overflow-y-auto space-y-10 custom-scrollbar">
                            {error && (
                                <div className="p-5 bg-rose-50 text-rose-600 rounded-2xl text-[11px] font-bold border border-rose-100 flex items-center gap-3 animate-gentle-pulse">
                                    <span className="material-symbols-outlined text-xl">error</span>
                                    {error}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Strategy Name</label>
                                    <input value={form.name} onChange={(e) => f("name", e.target.value)} type="text" className="w-full h-12 bg-slate-50 border border-slate-200 rounded-2xl px-5 text-sm font-bold focus:bg-white focus:border-sky-500 outline-none transition-all shadow-sm" placeholder="e.g. Core API Load Balance" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Infrastructure Node</label>
                                    <select value={form.targetId} onChange={(e) => f("targetId", e.target.value)} className="w-full h-12 bg-slate-50 border border-slate-200 rounded-2xl px-5 text-sm font-bold focus:bg-white focus:border-sky-500 outline-none transition-all cursor-pointer shadow-sm">
                                        <option value="">-- Resolve Node --</option>
                                        {targets.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.environment})</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-2 p-1.5 bg-slate-50 rounded-2xl border border-slate-100">
                                {[
                                    { id: "endpoint", icon: "hub", label: "Logic" },
                                    { id: "load", icon: "equalizer", label: "Pressure" },
                                    { id: "slo", icon: "verified", label: "Thresholds" },
                                    { id: "advanced", icon: "settings", label: "Protocol" }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === tab.id ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                                            }`}
                                    >
                                        <span className="material-symbols-outlined text-lg scale-90">{tab.icon}</span>
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            <div className="min-h-[300px]">
                                {activeTab === "endpoint" && (
                                    <div className="space-y-6 animate-in">
                                        <div className="grid grid-cols-4 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Method</label>
                                                <select value={form.method} onChange={(e) => f("method", e.target.value)} className="w-full h-12 bg-slate-50 border border-slate-200 rounded-2xl px-4 text-sm font-bold focus:bg-white focus:border-sky-500 outline-none shadow-sm">
                                                    {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                                                </select>
                                            </div>
                                            <div className="col-span-3 space-y-2">
                                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Resource Path</label>
                                                <input value={form.path} onChange={(e) => f("path", e.target.value)} type="text" className="w-full h-12 bg-slate-50 border border-slate-200 rounded-2xl px-5 text-sm font-mono font-medium focus:bg-white focus:border-sky-500 outline-none shadow-sm" placeholder="/api/v1/..." />
                                            </div>
                                        </div>
                                        {["POST", "PUT", "PATCH"].includes(form.method) && (
                                            <div className="space-y-2">
                                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Payload Specification (JSON)</label>
                                                <textarea value={form.body} onChange={(e) => f("body", e.target.value)} rows={8} className="w-full bg-slate-100/50 border border-slate-200 rounded-3xl px-6 py-5 text-sm font-mono focus:bg-white focus:border-sky-500 outline-none shadow-sm transition-all" placeholder='{ "id": "tx_4920", ... }' />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === "load" && (
                                    <div className="space-y-8 animate-in">
                                        <div className="grid grid-cols-2 gap-8">
                                            <div className="space-y-2">
                                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Target Parallelism (VUs)</label>
                                                <input value={form.vus} onChange={(e) => f("vus", parseInt(e.target.value))} type="number" className="w-full h-12 bg-slate-50 border border-slate-200 rounded-2xl px-5 text-sm font-bold shadow-sm" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Sequence Runtime (sec)</label>
                                                <input value={form.duration} onChange={(e) => f("duration", parseInt(e.target.value))} type="number" className="w-full h-12 bg-slate-50 border border-slate-200 rounded-2xl px-5 text-sm font-bold shadow-sm" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Evolutionary Stages (JSON)</label>
                                            <textarea value={form.rampUpStages} onChange={(e) => f("rampUpStages", e.target.value)} rows={5} className="w-full bg-slate-100/50 border border-slate-200 rounded-3xl px-6 py-5 text-sm font-mono shadow-sm" placeholder='[ { "duration": "2m", "target": 500 } ]' />
                                            <p className="text-[10px] text-slate-400 font-medium px-2 italic">Standard k6 stages array for complex load modeling.</p>
                                        </div>
                                    </div>
                                )}

                                {activeTab === "slo" && (
                                    <div className="space-y-8 animate-in">
                                        <div className="grid grid-cols-2 gap-8">
                                            <div className="space-y-2">
                                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Latency Boundary (p95 ms)</label>
                                                <input value={form.sloP95Ms} onChange={(e) => f("sloP95Ms", e.target.value)} type="number" className="w-full h-12 bg-slate-50 border border-slate-200 rounded-2xl px-5 text-sm font-bold shadow-sm" placeholder="1200" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Error Frequency Limit (%)</label>
                                                <input value={form.sloErrorPct} onChange={(e) => f("sloErrorPct", e.target.value)} type="number" className="w-full h-12 bg-slate-50 border border-slate-200 rounded-2xl px-5 text-sm font-bold shadow-sm" placeholder="0.5" />
                                            </div>
                                        </div>
                                        <div className="p-8 bg-sky-50 rounded-[2rem] border border-sky-100/50">
                                            <div className="flex items-center gap-3 text-sky-700 font-bold text-sm mb-3">
                                                <span className="material-symbols-outlined text-xl">security</span>
                                                Assurance Constraints
                                            </div>
                                            <p className="text-sky-600/70 text-[11px] font-medium leading-relaxed">Runs exceeding these limits will be flagged as "Regression Detected" in the analytical feed. These thresholds act as the passing criteria for your CICD performance gates.</p>
                                        </div>
                                    </div>
                                )}

                                {activeTab === "advanced" && (
                                    <div className="space-y-8 animate-in">
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Protocol Extensions (Headers JSON)</label>
                                            <textarea value={form.headers} onChange={(e) => f("headers", e.target.value)} rows={5} className="w-full bg-slate-100/50 border border-slate-200 rounded-3xl px-6 py-5 text-sm font-mono shadow-sm" placeholder='{ "X-Trace-ID": "internal" }' />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Environment Injection (JSON)</label>
                                            <textarea value={form.envVars} onChange={(e) => f("envVars", e.target.value)} rows={5} className="w-full bg-slate-100/50 border border-slate-200 rounded-3xl px-6 py-5 text-sm font-mono shadow-sm" placeholder='{ "DEBUG_MODE": "true" }' />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="px-10 py-7 border-t border-slate-50 flex items-center justify-end gap-4 bg-slate-50/30">
                            <button onClick={() => setShowModal(false)} className="text-[11px] font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest">Discard</button>
                            <button onClick={save} disabled={saving} className="btn-primary h-14 px-10 min-w-[200px] text-sm">
                                {saving ? <div className="size-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : (editPlan ? "Update Strategy" : "Commit Strategy")}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Preview Modal */}
            {showPreview && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-6 animate-in">
                    <div className="bg-slate-950 rounded-[2.5rem] shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col h-[85vh] border border-white/5">
                        <div className="px-8 py-5 bg-slate-900 border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="flex gap-1.5">
                                    <div className="size-3 rounded-full bg-rose-500/20" />
                                    <div className="size-3 rounded-full bg-amber-500/20" />
                                    <div className="size-3 rounded-full bg-emerald-500/20" />
                                </div>
                                <div className="h-4 w-px bg-white/10" />
                                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <span className="material-symbols-outlined text-xs">terminal</span>
                                    k6-engine-core.js
                                </span>
                            </div>
                            <button onClick={() => setShowPreview(false)} className="size-10 flex items-center justify-center rounded-xl bg-white/5 text-slate-400 hover:text-white transition-all">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-10 bg-slate-950 custom-scrollbar">
                            <pre className="text-emerald-400/90 font-mono text-[11px] leading-relaxed select-all selection:bg-emerald-500/30">{preview}</pre>
                        </div>
                        <div className="px-8 py-5 bg-slate-900 border-t border-white/5 flex items-center justify-end">
                            <button onClick={() => setShowPreview(false)} className="h-11 px-8 bg-white text-slate-950 rounded-[1rem] text-[11px] font-bold uppercase tracking-widest hover:bg-slate-100 transition-all shadow-lg active:scale-95">Exit Preview</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
