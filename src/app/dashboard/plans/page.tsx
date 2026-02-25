"use client";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

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
    target: { id: string; name: string; baseUrl: string };
    createdAt: string;
}

interface Target { id: string; name: string; baseUrl: string; }

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
    const [plans, setPlans] = useState<Plan[]>([]);
    const [targets, setTargets] = useState<Target[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterTarget, setFilterTarget] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editPlan, setEditPlan] = useState<Plan | null>(null);
    const [form, setForm] = useState({ ...emptyForm });
    const [saving, setSaving] = useState(false);
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

    async function deletePlan(id: string) {
        if (!confirm("Delete this plan?")) return;
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
        <div className="space-y-8 animate-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 mb-2">Test Plans</h1>
                    <p className="text-slate-500 font-medium">Define load patterns, thresholds, and execution logic.</p>
                </div>
                {canEdit && (
                    <button onClick={openCreate} className="btn-primary">
                        <span className="material-symbols-outlined">add_task</span>
                        Draft Plan
                    </button>
                )}
            </div>

            <div className="grid gap-6">
                <div className="card-premium">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Filter</span>
                            <select
                                className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-primary/20"
                                value={filterTarget}
                                onChange={(e) => setFilterTarget(e.target.value)}
                            >
                                <option value="">All Endpoints</option>
                                {targets.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                    </div>

                    {loading ? (
                        <div className="p-20 flex justify-center items-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : plans.length === 0 ? (
                        <div className="p-20 text-center flex flex-col items-center">
                            <span className="material-symbols-outlined text-5xl text-slate-200 mb-4 animate-pulse">schema</span>
                            <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight">Strategy Empty</h3>
                            <p className="text-slate-500 mb-8 max-w-sm">No test plans found. Create your first performance testing strategy to begin benchmarks.</p>
                            {canEdit && (
                                <button onClick={openCreate} className="btn-primary">Define first strategy</button>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4">Strategy & Target</th>
                                        <th className="px-6 py-4">Endpoint Pattern</th>
                                        <th className="px-6 py-4">Load Profile</th>
                                        <th className="px-6 py-4">Thresholds</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {plans.map((p) => (
                                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-sm font-black text-slate-900">{p.name} <span className="text-[10px] text-slate-300 ml-1 font-mono">v{p.planVersion}</span></span>
                                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{p.target.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${p.method === 'GET' ? 'bg-blue-50 text-blue-600' :
                                                            p.method === 'POST' ? 'bg-green-50 text-green-600' :
                                                                'bg-slate-100 text-slate-600'
                                                        }`}>{p.method}</span>
                                                    <span className="text-xs font-mono font-medium text-slate-500 truncate max-w-[150px]">{p.path}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg w-fit">
                                                    <span className="material-symbols-outlined text-[14px] text-slate-400">groups</span>
                                                    <span className="text-xs font-black text-slate-700">{p.vus}<small className="ml-0.5 text-slate-400">VU</small></span>
                                                    <span className="w-1 h-3 bg-slate-200 mx-1" />
                                                    <span className="text-xs font-black text-slate-700">{p.duration}<small className="ml-0.5 text-slate-400">s</small></span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col gap-1">
                                                    {p.sloP95Ms && (
                                                        <div className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-500">
                                                            <span className="material-symbols-outlined text-[12px]">speed</span>
                                                            p95 &lt; {p.sloP95Ms}ms
                                                        </div>
                                                    )}
                                                    {p.sloErrorPct != null && (
                                                        <div className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-500">
                                                            <span className="material-symbols-outlined text-[12px]">error_outline</span>
                                                            Err &lt; {p.sloErrorPct}%
                                                        </div>
                                                    )}
                                                    {!p.sloP95Ms && p.sloErrorPct == null && <span className="text-[10px] text-slate-300 font-bold uppercase">No Limits</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => previewScript(p.id)} className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg" title="k6 Script">
                                                        <span className="material-symbols-outlined text-lg">code</span>
                                                    </button>
                                                    {canEdit && (
                                                        <>
                                                            <button onClick={() => openEdit(p)} className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg">
                                                                <span className="material-symbols-outlined text-lg">edit</span>
                                                            </button>
                                                            <button onClick={() => deletePlan(p.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50/50 rounded-lg">
                                                                <span className="material-symbols-outlined text-lg">delete</span>
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-premium w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in border border-white">
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="font-black text-slate-900 uppercase tracking-tight">{editPlan ? "Refine" : "Compose"} Test Plan</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                            {error && (
                                <div className="p-4 bg-red-50 text-red-600 rounded-xl text-xs font-black uppercase tracking-widest border border-red-100">{error}</div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Plan Identifier</label>
                                    <input value={form.name} onChange={(e) => f("name", e.target.value)} type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all" placeholder="Homepage Baseline" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Environment Cluster</label>
                                    <select value={form.targetId} onChange={(e) => f("targetId", e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none">
                                        <option value="">-- Infrastructure --</option>
                                        {targets.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="flex border-b border-slate-100">
                                {["endpoint", "load", "slo", "advanced"].map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest relative transition-colors ${activeTab === tab ? 'text-primary' : 'text-slate-400 hover:text-slate-600'
                                            }`}
                                    >
                                        {tab}
                                        {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary" />}
                                    </button>
                                ))}
                            </div>

                            <div className="py-2 animate-in">
                                {activeTab === "endpoint" && (
                                    <div className="space-y-5">
                                        <div className="flex gap-4">
                                            <div className="w-1/3 space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verb</label>
                                                <select value={form.method} onChange={(e) => f("method", e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-black focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none">
                                                    {METHODS.map(m => <option key={m}>{m}</option>)}
                                                </select>
                                            </div>
                                            <div className="flex-1 space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Routing Path</label>
                                                <input value={form.path} onChange={(e) => f("path", e.target.value)} type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono font-bold" placeholder="/v1/search" />
                                            </div>
                                        </div>
                                        {["POST", "PUT", "PATCH"].includes(form.method) && (
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payload Architecture (JSON)</label>
                                                <textarea value={form.body} onChange={(e) => f("body", e.target.value)} rows={6} className="w-full bg-slate-950 text-slate-300 border-none rounded-2xl px-4 py-4 text-xs font-mono outline-none shadow-inner" placeholder='{ "query": "..." }' />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === "load" && (
                                    <div className="space-y-5">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Load Density (VUs)</label>
                                                <input value={form.vus} onChange={(e) => f("vus", parseInt(e.target.value))} type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Window (Seconds)</label>
                                                <input value={form.duration} onChange={(e) => f("duration", parseInt(e.target.value))} type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold" />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                            <label className="text-[11px] font-black text-slate-900 uppercase tracking-tight mb-2 block">Advanced ramp-up configuration</label>
                                            <textarea value={form.rampUpStages} onChange={(e) => f("rampUpStages", e.target.value)} rows={3} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-mono" placeholder='[ { "duration": "1m", "target": 100 } ]' />
                                        </div>
                                    </div>
                                )}

                                {activeTab === "slo" && (
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-6">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">p95 Bound (ms)</label>
                                            <input value={form.sloP95Ms} onChange={(e) => f("sloP95Ms", e.target.value)} type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold" placeholder="2000" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fault Tolerance (%)</label>
                                            <input value={form.sloErrorPct} onChange={(e) => f("sloErrorPct", e.target.value)} type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold" placeholder="1.0" />
                                        </div>
                                        <div className="col-span-2 p-4 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100 flex gap-3">
                                            <span className="material-symbols-outlined text-lg">verified_user</span>
                                            <p className="text-[11px] font-bold leading-relaxed uppercase tracking-tight">System will mark the run as unstable if these thresholds are exceeded during live execution.</p>
                                        </div>
                                    </div>
                                )}

                                {activeTab === "advanced" && (
                                    <div className="space-y-5">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Custom Transport Headers</label>
                                            <textarea value={form.headers} onChange={(e) => f("headers", e.target.value)} rows={3} className="w-full bg-slate-950 text-slate-300 border-none rounded-2xl px-4 py-4 text-xs font-mono shadow-inner" placeholder='{ "Accept-Encoding": "gzip" }' />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Secret Variables (JSON)</label>
                                            <textarea value={form.envVars} onChange={(e) => f("envVars", e.target.value)} rows={3} className="w-full bg-slate-950 text-slate-300 border-none rounded-2xl px-4 py-4 text-xs font-mono shadow-inner" placeholder='{ "API_KEY": "..." }' />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="px-6 py-5 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/30">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-xs font-black uppercase text-slate-400 hover:text-slate-600 transition-colors">Discard</button>
                            <button onClick={save} disabled={saving} className="btn-primary min-w-[140px]">
                                {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : editPlan ? "Update Strategy" : "Commit Strategy"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Preview Modal */}
            {showPreview && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 rounded-2xl shadow-premium w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh] border border-white/5 animate-in">
                        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                            <h3 className="text-white font-mono text-sm font-black flex items-center gap-2">
                                <span className="bg-primary px-1.5 py-0.5 rounded text-[10px] text-white">k6</span>
                                Script Generator Output
                            </h3>
                            <button onClick={() => setShowPreview(false)} className="text-slate-400 hover:text-white transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-0 overflow-y-auto custom-scrollbar flex-1 bg-slate-950">
                            <pre className="p-6 text-blue-400 font-mono text-[11px] leading-relaxed select-all">{preview}</pre>
                        </div>
                        <div className="px-6 py-4 border-t border-white/5 flex items-center justify-end bg-slate-900">
                            <button onClick={() => setShowPreview(false)} className="px-6 py-2 bg-white text-slate-900 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-colors">Finalize</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
