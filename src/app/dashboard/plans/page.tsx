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
        <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden text-slate-900 dark:text-slate-100 font-display">
            {/* Header */}
            <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-8 shrink-0">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Test Plans</h2>
                </div>
                {canEdit && (
                    <button id="add-plan-btn" onClick={openCreate} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-primary/90 transition-colors">
                        <span className="material-symbols-outlined text-lg">add</span>
                        Create Plan
                    </button>
                )}
            </header>

            {/* Main Area */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">

                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col min-h-0">
                    {/* Toolbar */}
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 shrink-0">
                        <div className="flex items-center gap-3 flex-1 lg:max-w-md">
                            <span className="text-sm font-medium text-slate-500 whitespace-nowrap">Filter Target:</span>
                            <select
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                                value={filterTarget}
                                onChange={(e) => setFilterTarget(e.target.value)}
                            >
                                <option value="">All Targets</option>
                                {targets.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Table */}
                    {loading ? (
                        <div className="p-12 flex justify-center items-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : plans.length === 0 ? (
                        <div className="p-16 text-center flex flex-col items-center">
                            <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">schema</span>
                            <h3 className="font-bold text-slate-900 dark:text-white text-lg">No Test Plans Configured</h3>
                            <p className="text-slate-500 mb-4 max-w-sm">Create a reusable plan to define your load testing configuration.</p>
                            {canEdit && (
                                <button onClick={openCreate} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-primary/90 transition-colors">
                                    <span className="material-symbols-outlined text-lg">add</span>
                                    Create Test Plan
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto flex-1">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs font-bold uppercase tracking-wider sticky top-0 z-10">
                                    <tr>
                                        <th className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">Name / Target</th>
                                        <th className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">Endpoint</th>
                                        <th className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">Load Profile</th>
                                        <th className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">SLOs</th>
                                        <th className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                    {plans.map((p) => (
                                        <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="font-bold text-slate-900 dark:text-white text-sm">{p.name} <span className="text-[10px] font-bold text-slate-400 ml-1">v{p.planVersion}</span></p>
                                                    <p className="text-xs text-slate-500 mt-1">{p.target.name}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${p.method === 'GET' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                            p.method === 'POST' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                                p.method === 'DELETE' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                                    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                                        }`}>{p.method}</span>
                                                    <span className="font-mono text-xs text-slate-600 dark:text-slate-400">{p.path}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded inline-block w-max">
                                                    {p.vus} VU × {p.duration}s
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    {p.sloP95Ms && <span className="text-xs text-slate-500">p95 &lt; {p.sloP95Ms}ms</span>}
                                                    {p.sloErrorPct != null && <span className="text-xs text-slate-500">Err &lt; {p.sloErrorPct}%</span>}
                                                    {!p.sloP95Ms && p.sloErrorPct == null && <span className="text-xs text-slate-400 italic">No SLOs</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => previewScript(p.id)} className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded transition-colors" title="Preview k6 Script">
                                                        <span className="material-symbols-outlined text-sm">code</span>
                                                    </button>
                                                    {canEdit && (
                                                        <>
                                                            <button onClick={() => openEdit(p)} className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded transition-colors">
                                                                <span className="material-symbols-outlined text-sm">edit</span>
                                                            </button>
                                                            <button onClick={() => deletePlan(p.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors">
                                                                <span className="material-symbols-outlined text-sm">delete</span>
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

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white">{editPlan ? "Edit Plan" : "Create Test Plan"}</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5">
                            {error && (
                                <div className="p-3 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium border border-red-100 dark:border-red-900/20">{error}</div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Plan Name</label>
                                    <input value={form.name} onChange={(e) => f("name", e.target.value)} type="text" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="Homepage Load Test" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Target API</label>
                                    <select value={form.targetId} onChange={(e) => f("targetId", e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none">
                                        <option value="">-- Select Target --</option>
                                        {targets.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Tabs Header */}
                            <div className="flex border-b border-slate-200 dark:border-slate-700">
                                {["endpoint", "load", "slo", "params"].map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-colors ${activeTab === tab
                                                ? "border-primary text-primary"
                                                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                            }`}
                                    >
                                        {tab === "endpoint" ? "Endpoint" : tab === "load" ? "Load Profile" : tab === "slo" ? "Thresholds" : "Settings"}
                                    </button>
                                ))}
                            </div>

                            {/* Tabs Content */}
                            <div className="py-2">
                                {activeTab === "endpoint" && (
                                    <div className="space-y-4">
                                        <div className="flex gap-4">
                                            <div className="space-y-1.5 w-1/3">
                                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Method</label>
                                                <select value={form.method} onChange={(e) => f("method", e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none font-mono">
                                                    {METHODS.map((m) => <option key={m}>{m}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-1.5 flex-1">
                                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Path</label>
                                                <input value={form.path} onChange={(e) => f("path", e.target.value)} type="text" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none font-mono" placeholder="/api/v1/resource" />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5 w-1/3">
                                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Expected Status</label>
                                            <input value={form.expectedStatus} onChange={(e) => f("expectedStatus", parseInt(e.target.value))} type="number" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none font-mono" />
                                        </div>
                                        {["POST", "PUT", "PATCH"].includes(form.method) && (
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex justify-between">
                                                    Request Body (JSON)
                                                    <span className="text-[10px] text-slate-400 font-normal normal-case">Supports {"{{ENV_VAR}}"}</span>
                                                </label>
                                                <textarea value={form.body} onChange={(e) => f("body", e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none text-slate-300 font-mono" rows={5} placeholder={'{\n  "key": "value"\n}'} />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === "load" && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Virtual Users (VUs)</label>
                                                <input value={form.vus} onChange={(e) => f("vus", parseInt(e.target.value))} type="number" min={1} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none font-mono" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Duration (sec)</label>
                                                <input value={form.duration} onChange={(e) => f("duration", parseInt(e.target.value))} type="number" min={1} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none font-mono" />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex justify-between">
                                                Ramp-up Stages (Optional)
                                                <span className="text-[10px] text-slate-400 font-normal normal-case">Overrides VUs/Duration</span>
                                            </label>
                                            <textarea value={form.rampUpStages} onChange={(e) => f("rampUpStages", e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none text-slate-300 font-mono" rows={3} placeholder={'[\n  {"duration":"10s","target":50},\n  {"duration":"30s","target":50}\n]'} />
                                        </div>
                                    </div>
                                )}

                                {activeTab === "slo" && (
                                    <div className="space-y-4">
                                        <div className="p-3 bg-blue-50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-400 rounded-lg text-sm flex items-start gap-2 border border-blue-100 dark:border-blue-900/20">
                                            <span className="material-symbols-outlined text-lg shrink-0">info</span>
                                            <p>Pass/fail thresholds. If breached during execution, the test run is marked as FAILED.</p>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">p95 Latency &lt; (ms)</label>
                                                <input value={form.sloP95Ms} onChange={(e) => f("sloP95Ms", e.target.value)} type="number" placeholder="2000" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none font-mono" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Error Rate &lt; (%)</label>
                                                <input value={form.sloErrorPct} onChange={(e) => f("sloErrorPct", e.target.value)} type="number" step="0.1" placeholder="1.0" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none font-mono" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Min RPS &gt;=</label>
                                                <input value={form.sloMinRps} onChange={(e) => f("sloMinRps", e.target.value)} type="number" placeholder="50" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none font-mono" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === "params" && (
                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex justify-between">
                                                Custom Headers (JSON)
                                            </label>
                                            <textarea value={form.headers} onChange={(e) => f("headers", e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none text-slate-300 font-mono" rows={3} placeholder={'{\n  "Accept": "application/json"\n}'} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex justify-between">
                                                Environment Variables (JSON)
                                                <span className="text-[10px] text-slate-400 font-normal normal-case">Hidden in logs</span>
                                            </label>
                                            <textarea value={form.envVars} onChange={(e) => f("envVars", e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none text-slate-300 font-mono" rows={3} placeholder={'{\n  "TOKEN": "secret_123"\n}'} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-3 bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors">Cancel</button>
                            <button onClick={save} disabled={saving} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 flex items-center justify-center min-w-[120px]">
                                {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : editPlan ? "Save Changes" : "Create Plan"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Preview Modal */}
            {showPreview && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 rounded-xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-700">
                        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
                            <h3 className="font-bold text-lg text-white font-mono flex items-center gap-2">
                                <span className="text-primary">k6</span> Script Preview
                            </h3>
                            <button onClick={() => setShowPreview(false)} className="text-slate-400 hover:text-white transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto max-h-[60vh] custom-scrollbar bg-slate-950">
                            <pre className="text-green-400 font-mono text-xs whitespace-pre-wrap">{preview}</pre>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-end bg-slate-900/80">
                            <button onClick={() => setShowPreview(false)} className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-700 transition-colors">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
