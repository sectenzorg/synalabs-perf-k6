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
        setRunForm({ vus: p.vus, duration: p.duration, label: `Run ${new Date().toLocaleDateString()}` });
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
                setError(d.error ?? "Failed"); return;
            }
            setShowModal(false); load();
        } catch (e: any) {
            setError(e.message ?? "Invalid JSON in fields");
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
                alert(d.error ?? "Failed to start run");
            }
        } finally {
            setRunning(false);
            setShowRunModal(false);
        }
    }

    async function deletePlan(id: string) {
        if (!confirm("Delete this strategy? This will archive all associated telemetry data.")) return;
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
        <div className="space-y-8 sm:space-y-12 animate-in pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mb-1.5 font-display">Test Strategies</h1>
                    <p className="text-slate-500 text-sm sm:text-base font-medium">Calibrate load patterns, failure thresholds, and stress behavior.</p>
                </div>
                {canEdit && (
                    <button onClick={openCreate} className="btn-primary">
                        <span className="material-symbols-outlined text-lg">add_task</span>
                        Draft Strategy
                    </button>
                )}
            </div>

            <div className="grid gap-6 sm:gap-8">
                {/* Filter Bar */}
                <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-3 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-50">
                    <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-2xl w-full sm:w-auto">
                        <span className="material-symbols-outlined text-slate-400 text-xl">filter_list</span>
                        <select
                            className="bg-transparent border-none text-[10px] font-bold text-slate-600 uppercase tracking-widest outline-none cursor-pointer pr-8"
                            value={filterTarget}
                            onChange={(e) => setFilterTarget(e.target.value)}
                        >
                            <option value="">All Domains</option>
                            {targets.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                    <div className="h-6 w-px bg-slate-100 hidden sm:block" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 italic">
                        {plans.length} Execution Blueprints Loaded
                    </p>
                </div>

                {loading ? (
                    <div className="py-24 flex justify-center items-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                ) : plans.length === 0 ? (
                    <div className="card-premium py-24 sm:py-32 flex flex-col items-center justify-center text-center px-6">
                        <div className="size-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-8 border border-slate-100 shadow-inner">
                            <span className="material-symbols-outlined text-4xl text-slate-200">schema</span>
                        </div>
                        <h3 className="text-xl font-extrabold text-slate-900 mb-2">Strategy Registry Exhausted</h3>
                        <p className="text-slate-500 text-sm max-w-sm mx-auto mb-10 font-medium italic">Construct a performance testing blueprint to begin infrastructure benchmarking.</p>
                        {canEdit && (
                            <button onClick={openCreate} className="btn-primary">Provision First Plan</button>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Mobile: Card layout */}
                        <div className="sm:hidden space-y-4">
                            {plans.map((p) => (
                                <div key={p.id} className="card-premium p-6 space-y-6 bg-white hover:border-primary/20 transition-all group overflow-hidden relative">
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{p.target.name} · {p.target.environment}</p>
                                            <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">{p.name}</h3>
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold border ${p.method === 'GET' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                p.method === 'POST' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                    'bg-slate-50 text-slate-600 border-slate-200'
                                            }`}>{p.method}</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">VUsers</p>
                                            <p className="text-lg font-extrabold text-slate-900 tracking-tight">{p.vus}</p>
                                        </div>
                                        <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Duration</p>
                                            <p className="text-lg font-extrabold text-slate-900 tracking-tight">{p.duration}s</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-3 pt-2">
                                        <button onClick={() => openRun(p)} className="flex-1 btn-primary h-[44px]">
                                            <span className="material-symbols-outlined text-lg">play_arrow</span>
                                            Execute
                                        </button>
                                        <div className="flex gap-1">
                                            <button onClick={() => previewScript(p.id)} className="size-11 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-primary transition-all active:scale-90 border border-slate-100">
                                                <span className="material-symbols-outlined">code</span>
                                            </button>
                                            <button onClick={() => openEdit(p)} className="size-11 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-primary transition-all active:scale-90 border border-slate-100">
                                                <span className="material-symbols-outlined">edit</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop: Table layout */}
                        <div className="hidden sm:block card-premium overflow-hidden border-none shadow-2xl">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-900 text-white">
                                        <tr>
                                            <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.25em] opacity-60">Strategy Schema</th>
                                            <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.25em] opacity-60">Access Vector</th>
                                            <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.25em] opacity-60">Load Profile</th>
                                            <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.25em] opacity-60">SLA Bounds</th>
                                            <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.25em] opacity-60 text-right">Operations</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {plans.map((p) => (
                                            <tr key={p.id} className="hover:bg-slate-50/80 transition-all group">
                                                <td className="px-8 py-6">
                                                    <div className="flex flex-col gap-1.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-base font-extrabold text-slate-900 group-hover:text-primary transition-colors">{p.name}</span>
                                                            <span className="text-[9px] font-extrabold bg-slate-900 text-white px-1.5 py-0.5 rounded tracking-widest opacity-80 group-hover:bg-primary transition-colors">v{p.planVersion}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
                                                            <span className="material-symbols-outlined text-sm">location_on</span>
                                                            {p.target.name} · {p.target.environment}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-3">
                                                        <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full border uppercase tracking-widest ${p.method === 'GET' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                                p.method === 'POST' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                                    'bg-slate-50 text-slate-500 border-slate-100'
                                                            }`}>{p.method}</span>
                                                        <span className="text-xs font-mono font-bold text-slate-400 truncate max-w-[140px] opacity-70 italic">{p.path}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 px-4 py-2 rounded-2xl w-fit group-hover:bg-white transition-colors">
                                                        <div className="flex flex-col">
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Users</span>
                                                            <span className="text-sm font-extrabold text-slate-900">{p.vus}</span>
                                                        </div>
                                                        <div className="w-px h-6 bg-slate-200" />
                                                        <div className="flex flex-col">
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Time</span>
                                                            <span className="text-sm font-extrabold text-slate-900">{p.duration}s</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex flex-col gap-1.5">
                                                        {p.sloP95Ms ? (
                                                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-700 bg-slate-100/50 px-2 py-1 rounded-lg border border-slate-100 w-fit">
                                                                <span className="material-symbols-outlined text-sm text-primary">speed</span>
                                                                p95 &lt; {p.sloP95Ms}ms
                                                            </div>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest italic">— No Bounds</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button onClick={() => openRun(p)} className="btn-premium px-4 py-2 text-[11px] bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 shadow-xl shadow-emerald-500/10">
                                                            Execute
                                                            <span className="material-symbols-outlined text-sm">bolt</span>
                                                        </button>
                                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                                                            <button onClick={() => previewScript(p.id)} className="size-9 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-primary hover:bg-white hover:border-slate-200 border border-transparent transition-all" title="View k6 Script">
                                                                <span className="material-symbols-outlined text-lg">code</span>
                                                            </button>
                                                            {canEdit && (
                                                                <>
                                                                    <button onClick={() => openEdit(p)} className="size-9 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-primary hover:bg-white hover:border-slate-200 border border-transparent transition-all">
                                                                        <span className="material-symbols-outlined text-lg">edit</span>
                                                                    </button>
                                                                    <button onClick={() => deletePlan(p.id)} className="size-9 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 border border-transparent transition-all">
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
                    </>
                )}
            </div>

            {/* Run Modal - Sophisticated */}
            {showRunModal && activePlan && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-in">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-white relative">
                        <div className="p-8 pb-4">
                            <div className="flex items-center justify-between mb-8">
                                <div className="space-y-1">
                                    <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">Initiate Stress Sequence</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] italic">Deploying to {activePlan.target.name}</p>
                                </div>
                                <button onClick={() => setShowRunModal(false)} className="size-12 rounded-2xl bg-slate-50 text-slate-400 hover:text-red-500 transition-all active:scale-95 flex items-center justify-center">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Operational Label</label>
                                    <input
                                        value={runForm.label}
                                        onChange={(e) => setRunForm({ ...runForm, label: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-6 py-4 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                                        placeholder="Maintenance Window A..."
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">VUser Intensity</label>
                                        <div className="relative group">
                                            <input
                                                type="number"
                                                value={runForm.vus}
                                                onChange={(e) => setRunForm({ ...runForm, vus: parseInt(e.target.value) })}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-6 py-4 text-lg font-extrabold text-slate-900 focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                                            />
                                            <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-300 uppercase">Users</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Execution Period</label>
                                        <div className="relative group">
                                            <input
                                                type="number"
                                                value={runForm.duration}
                                                onChange={(e) => setRunForm({ ...runForm, duration: parseInt(e.target.value) })}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-6 py-4 text-lg font-extrabold text-slate-900 focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                                            />
                                            <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-300 uppercase">Sec</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 bg-slate-900 rounded-[2rem] text-white space-y-4 shadow-xl">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.25em]">Profile Synopsis</p>
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium flex items-center justify-between">
                                            <span className="opacity-60 italic">Theoretical Throughput:</span>
                                            <span className="font-bold">~{(runForm.vus * 10).toLocaleString()} req/sec</span>
                                        </p>
                                        <p className="text-sm font-medium flex items-center justify-between">
                                            <span className="opacity-60 italic">Telemetry Store:</span>
                                            <span className="font-bold text-primary">InfluxDB Enabled</span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 pt-4 flex gap-4">
                            <button onClick={() => setShowRunModal(false)} className="flex-1 h-[64px] rounded-3xl text-sm font-bold text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest">Abort</button>
                            <button onClick={executeRun} disabled={running} className="flex-[2] h-[64px] btn-primary shadow-2xl shadow-primary/30">
                                {running ? (
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                                ) : (
                                    <>
                                        Calibrate & Launch
                                        <span className="material-symbols-outlined text-xl">rocket_launch</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create/Edit Modal - Redesigned */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in">
                    <div className="bg-white rounded-t-[3rem] sm:rounded-[3rem] shadow-premium w-full sm:max-w-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh] border border-white">
                        <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between shrink-0">
                            <div className="space-y-1">
                                <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">{editPlan ? "Modify Strategy" : "Define Strategy"}</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{editPlan ? 'Blueprint Rev. 4' : 'Structural Design'}</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="size-10 flex items-center justify-center rounded-2xl bg-slate-50 text-slate-400 hover:text-red-500 transition-all active:scale-95">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8">
                            {error && (
                                <div className="p-5 bg-red-50 text-red-600 rounded-3xl text-xs font-bold border border-red-100 flex items-center gap-3">
                                    <span className="material-symbols-outlined">security_update_warning</span>
                                    {error}
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] px-1">Blueprint Title</label>
                                    <input value={form.name} onChange={(e) => f("name", e.target.value)} type="text" className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-6 py-4 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-primary/10 outline-none transition-all shadow-sm" placeholder="e.g. Auth Service Stress" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] px-1">Infrastructure Target</label>
                                    <select value={form.targetId} onChange={(e) => f("targetId", e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-6 py-4 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-primary/10 outline-none transition-all shadow-sm appearance-none cursor-pointer">
                                        <option value="">-- Deployment Target --</option>
                                        {targets.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.environment})</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-2 p-1.5 bg-slate-50 rounded-[2rem] border border-slate-100 overflow-x-auto no-scrollbar">
                                {["endpoint", "load", "slo", "advanced"].map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`flex-1 min-w-[100px] py-3 rounded-[1.5rem] text-[10px] font-extrabold uppercase tracking-widest transition-all duration-300 ${activeTab === tab ? 'bg-white text-slate-900 shadow-xl border border-slate-200/50' : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                                            }`}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>

                            <div className="min-h-[280px] animate-in">
                                {activeTab === "endpoint" && (
                                    <div className="space-y-6">
                                        <div className="flex flex-col sm:flex-row gap-6">
                                            <div className="w-full sm:w-1/3 space-y-2">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Verb</label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {METHODS.slice(0, 4).map(m => (
                                                        <button
                                                            key={m}
                                                            onClick={() => f("method", m)}
                                                            className={`py-3 rounded-2xl text-[10px] font-extrabold transition-all border ${form.method === m ? 'bg-primary text-white border-primary shadow-lg' : 'bg-white text-slate-400 border-slate-200'}`}
                                                        >
                                                            {m}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex-1 space-y-2">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Endpoint Trajectory</label>
                                                <input value={form.path} onChange={(e) => f("path", e.target.value)} type="text" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-mono font-bold" placeholder="/v1/telemetry" />
                                            </div>
                                        </div>
                                        {["POST", "PUT", "PATCH"].includes(form.method) && (
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Data Payload (JSON Schema)</label>
                                                <textarea value={form.body} onChange={(e) => f("body", e.target.value)} rows={6} className="w-full bg-slate-900 text-emerald-400 border-none rounded-[2rem] px-8 py-6 text-xs font-mono outline-none shadow-2xl" placeholder='{ "id": "{{UUID}}", "timestamp": "{{NOW}}" }' />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === "load" && (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">VUser Density</label>
                                                <input value={form.vus} onChange={(e) => f("vus", parseInt(e.target.value))} type="number" className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-6 py-4 text-lg font-extrabold" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Session Horizon (s)</label>
                                                <input value={form.duration} onChange={(e) => f("duration", parseInt(e.target.value))} type="number" className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-6 py-4 text-lg font-extrabold" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center px-2">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Procedural Ramp-up</label>
                                                <span className="text-[9px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-widest">Advanced Logic</span>
                                            </div>
                                            <textarea value={form.rampUpStages} onChange={(e) => f("rampUpStages", e.target.value)} rows={4} className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-6 py-4 text-xs font-mono" placeholder='[ { "duration": "1m", "target": 100 } ]' />
                                        </div>
                                    </div>
                                )}

                                {activeTab === "slo" && (
                                    <div className="space-y-8">
                                        <div className="grid grid-cols-2 gap-8">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">p95 Critical Bound (ms)</label>
                                                <input value={form.sloP95Ms} onChange={(e) => f("sloP95Ms", e.target.value)} type="number" className="w-full border-b-2 border-slate-100 px-2 py-4 text-3xl font-extrabold text-slate-900 focus:border-primary outline-none transition-all placeholder:text-slate-100" placeholder="2000" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Failure Threshold (%)</label>
                                                <input value={form.sloErrorPct} onChange={(e) => f("sloErrorPct", e.target.value)} type="number" className="w-full border-b-2 border-slate-100 px-2 py-4 text-3xl font-extrabold text-slate-900 focus:border-primary outline-none transition-all placeholder:text-slate-100" placeholder="0.5" />
                                            </div>
                                        </div>
                                        <div className="p-8 bg-slate-900 rounded-[2.5rem] relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-8 opacity-10">
                                                <span className="material-symbols-outlined text-6xl text-white">verified_user</span>
                                            </div>
                                            <h4 className="text-white text-sm font-bold mb-3 flex items-center gap-2">
                                                <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                SLA Compliance Engine
                                            </h4>
                                            <p className="text-slate-400 text-xs leading-relaxed max-w-sm italic">These constraints are enforced in real-time during telemetry collection. Violations will trigger high-priority alerts in the logs.</p>
                                        </div>
                                    </div>
                                )}

                                {activeTab === "advanced" && (
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4">Custom Protocol Headers</label>
                                            <textarea value={form.headers} onChange={(e) => f("headers", e.target.value)} rows={4} className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-8 py-6 text-xs font-mono shadow-inner" placeholder='{ "X-Protocol": "Synalabs-ST-3" }' />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4">Injection Variables (Secret Store)</label>
                                            <textarea value={form.envVars} onChange={(e) => f("envVars", e.target.value)} rows={4} className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-8 py-6 text-xs font-mono shadow-inner" placeholder='{ "TEST_SECRET": "ENC:..." }' />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="px-10 py-8 border-t border-slate-50 flex items-center justify-end gap-6 bg-slate-50/50 shrink-0">
                            <button onClick={() => setShowModal(false)} className="text-[10px] font-extrabold text-slate-400 hover:text-slate-700 uppercase tracking-[0.2em] transition-colors">Discard</button>
                            <button onClick={save} disabled={saving} className="btn-primary min-w-[180px] h-[64px] shadow-2xl shadow-primary/20">
                                {saving ? <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div> : editPlan ? "Apply Changes" : "Commit Strategy"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Preview Modal - Terminal Redesign */}
            {showPreview && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[70] flex items-center justify-center p-4 sm:p-12 transition-all">
                    <div className="bg-slate-950 rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col h-[85vh] border border-white/10 animate-in">
                        <div className="px-8 py-5 border-b border-white/5 flex items-center justify-between shrink-0 bg-slate-900/50">
                            <div className="flex items-center gap-4">
                                <div className="flex gap-1.5">
                                    <div className="size-3 rounded-full bg-red-500/50" />
                                    <div className="size-3 rounded-full bg-amber-500/50" />
                                    <div className="size-3 rounded-full bg-emerald-500/50" />
                                </div>
                                <h3 className="text-white font-mono text-[10px] font-bold uppercase tracking-[0.3em] flex items-center gap-3">
                                    <span className="text-primary">k6_engine</span>
                                    <span className="opacity-20">//</span>
                                    generated_blueprint.js
                                </h3>
                            </div>
                            <button onClick={() => setShowPreview(false)} className="size-10 flex items-center justify-center rounded-2xl bg-white/5 text-slate-400 hover:text-white transition-all active:scale-95 border border-white/5">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-0 overflow-y-auto custom-scrollbar flex-1 bg-slate-950/40 relative">
                            {/* Line Numbers */}
                            <div className="absolute left-0 top-0 w-12 h-full bg-white/5 border-r border-white/5" />
                            <pre className="p-8 pl-16 text-emerald-400/90 font-mono text-[11px] leading-relaxed select-all whitespace-pre-wrap">{preview}</pre>
                        </div>
                        <div className="px-8 py-5 border-t border-white/5 flex items-center justify-between bg-slate-900/50 shrink-0">
                            <p className="text-[9px] font-mono text-slate-500 font-bold uppercase tracking-widest">Compiler v2.4.0-native-optimized</p>
                            <button onClick={() => setShowPreview(false)} className="px-8 py-3 bg-white text-slate-900 rounded-2xl text-[10px] font-extrabold uppercase tracking-widest hover:bg-white/90 transition-all active:scale-95 shadow-xl">Close Stream</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
