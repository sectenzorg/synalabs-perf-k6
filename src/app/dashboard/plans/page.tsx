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
                sloP95Ms: form.sloP95Ms ? parseInt(form.sloP95Ms) : null,
                sloErrorPct: form.sloErrorPct ? parseFloat(form.sloErrorPct) : null,
                sloMinRps: form.sloMinRps ? parseFloat(form.sloMinRps) : null,
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
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Test Plans</h1>
                    <p className="page-subtitle">Reusable load test templates with SLO thresholds</p>
                </div>
                {canEdit && (
                    <button id="add-plan-btn" className="btn btn-primary" onClick={openCreate}>
                        + Create Plan
                    </button>
                )}
            </div>

            <div className="flex items-center gap-3 mb-4">
                <select className="form-select" style={{ maxWidth: 240 }} value={filterTarget} onChange={(e) => setFilterTarget(e.target.value)}>
                    <option value="">All Targets</option>
                    {targets.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
            </div>

            <div className="card">
                {loading ? (
                    <div className="flex-center" style={{ padding: "3rem" }}>
                        <div className="spinner" style={{ width: 36, height: 36 }} />
                    </div>
                ) : plans.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">📋</div>
                        <h3>No test plans yet</h3>
                        <p>Create a plan to define endpoint + load profile + SLO</p>
                    </div>
                ) : (
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Target</th>
                                    <th>Endpoint</th>
                                    <th>Load</th>
                                    <th>SLO p95</th>
                                    <th>SLO Err%</th>
                                    <th>v</th>
                                    <th>Created</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {plans.map((p) => (
                                    <tr key={p.id}>
                                        <td style={{ fontWeight: 600 }}>{p.name}</td>
                                        <td>{p.target.name}</td>
                                        <td>
                                            <span className="badge badge-dev" style={{ marginRight: 4 }}>{p.method}</span>
                                            <span className="font-mono text-sm">{p.path}</span>
                                        </td>
                                        <td className="font-mono text-sm">{p.vus} VU × {p.duration}s</td>
                                        <td className="font-mono text-sm">{p.sloP95Ms ? `< ${p.sloP95Ms}ms` : "—"}</td>
                                        <td className="font-mono text-sm">{p.sloErrorPct != null ? `< ${p.sloErrorPct}%` : "—"}</td>
                                        <td><span className="badge badge-viewer">v{p.planVersion}</span></td>
                                        <td className="text-muted text-sm">{new Date(p.createdAt).toLocaleDateString()}</td>
                                        <td>
                                            <div className="flex gap-2">
                                                <button className="btn btn-ghost btn-sm" onClick={() => previewScript(p.id)}>Preview</button>
                                                {canEdit && (
                                                    <>
                                                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(p)}>Edit</button>
                                                        <button className="btn btn-danger btn-sm" onClick={() => deletePlan(p.id)}>Del</button>
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

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{editPlan ? "Edit Plan" : "Create Test Plan"}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
                        </div>

                        {error && <div className="alert alert-error">{error}</div>}

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Plan Name <span className="required">*</span></label>
                                <input id="plan-name" className="form-input" value={form.name} onChange={(e) => f("name", e.target.value)} placeholder="Homepage Load Test" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Target <span className="required">*</span></label>
                                <select id="plan-target" className="form-select" value={form.targetId} onChange={(e) => f("targetId", e.target.value)}>
                                    <option value="">-- Select Target --</option>
                                    {targets.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.baseUrl})</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="tabs">
                            {["endpoint", "load", "slo", "params"].map((tab) => (
                                <button key={tab} className={`tab ${activeTab === tab ? "active" : ""}`} onClick={() => setActiveTab(tab)}>
                                    {tab === "endpoint" ? "🔗 Endpoint" : tab === "load" ? "⚡ Load Profile" : tab === "slo" ? "🎯 SLO / Thresholds" : "🔧 Parameters"}
                                </button>
                            ))}
                        </div>

                        {activeTab === "endpoint" && (
                            <>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Method</label>
                                        <select id="plan-method" className="form-select" value={form.method} onChange={(e) => f("method", e.target.value)}>
                                            {METHODS.map((m) => <option key={m}>{m}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Path <span className="required">*</span></label>
                                        <input id="plan-path" className="form-input font-mono" value={form.path} onChange={(e) => f("path", e.target.value)} placeholder="/api/health" />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Expected Status Code</label>
                                    <input id="plan-status" className="form-input" type="number" value={form.expectedStatus} onChange={(e) => f("expectedStatus", parseInt(e.target.value))} />
                                </div>
                                {["POST", "PUT", "PATCH"].includes(form.method) && (
                                    <div className="form-group">
                                        <label className="form-label">Request Body (JSON)</label>
                                        <textarea id="plan-body" className="form-textarea" value={form.body} onChange={(e) => f("body", e.target.value)} placeholder={'{"key": "value"}'} rows={4} />
                                        <div className="form-hint">Use {"{{TOKEN}}"} for dynamic values from Parameters tab</div>
                                    </div>
                                )}
                            </>
                        )}

                        {activeTab === "load" && (
                            <>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Virtual Users (VUs)</label>
                                        <input id="plan-vus" className="form-input" type="number" value={form.vus} onChange={(e) => f("vus", parseInt(e.target.value))} min={1} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Duration (seconds)</label>
                                        <input id="plan-duration" className="form-input" type="number" value={form.duration} onChange={(e) => f("duration", parseInt(e.target.value))} min={5} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Ramp-up Stages (JSON, optional)</label>
                                    <textarea id="plan-stages" className="form-textarea" value={form.rampUpStages} onChange={(e) => f("rampUpStages", e.target.value)} placeholder={'[{"duration":"10s","target":5},{"duration":"20s","target":20}]'} rows={3} />
                                    <div className="form-hint">If set, overrides VUs × Duration with staged ramp-up</div>
                                </div>
                            </>
                        )}

                        {activeTab === "slo" && (
                            <>
                                <div className="alert alert-info" style={{ marginBottom: "1rem" }}>
                                    Define pass/fail thresholds. Runs will be evaluated against these SLOs automatically.
                                </div>
                                <div className="form-row-3">
                                    <div className="form-group">
                                        <label className="form-label">p95 Latency &lt; (ms)</label>
                                        <input id="plan-slo-p95" className="form-input" type="number" value={form.sloP95Ms} onChange={(e) => f("sloP95Ms", e.target.value)} placeholder="2000" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Error Rate &lt; (%)</label>
                                        <input id="plan-slo-err" className="form-input" type="number" value={form.sloErrorPct} onChange={(e) => f("sloErrorPct", e.target.value)} placeholder="1.0" step="0.1" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Min RPS &gt;= </label>
                                        <input id="plan-slo-rps" className="form-input" type="number" value={form.sloMinRps} onChange={(e) => f("sloMinRps", e.target.value)} placeholder="10" />
                                    </div>
                                </div>
                            </>
                        )}

                        {activeTab === "params" && (
                            <>
                                <div className="form-group">
                                    <label className="form-label">Environment Variables (JSON)</label>
                                    <textarea id="plan-envvars" className="form-textarea" value={form.envVars} onChange={(e) => f("envVars", e.target.value)} placeholder={'{"TOKEN": "Bearer xyz", "USER_ID": "123"}'} rows={5} />
                                    <div className="form-hint">Use {"{{TOKEN}}"} in request body or headers. Secrets are masked in logs.</div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Custom Headers (JSON)</label>
                                    <textarea id="plan-headers" className="form-textarea" value={form.headers} onChange={(e) => f("headers", e.target.value)} placeholder={'{"Content-Type": "application/json"}'} rows={3} />
                                </div>
                            </>
                        )}

                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button id="save-plan-btn" className="btn btn-primary" onClick={save} disabled={saving}>
                                {saving ? "Saving..." : editPlan ? "Update Plan" : "Create Plan"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Preview Modal */}
            {showPreview && (
                <div className="modal-overlay" onClick={() => setShowPreview(false)}>
                    <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">k6 Script Preview</h3>
                            <button className="modal-close" onClick={() => setShowPreview(false)}>✕</button>
                        </div>
                        <pre className="code-block">{preview}</pre>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowPreview(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
