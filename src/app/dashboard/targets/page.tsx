"use client";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

interface Target {
    id: string;
    name: string;
    baseUrl: string;
    environment: string;
    authType: string;
    timeoutMs: number;
    tlsVerify: boolean;
    isActive: boolean;
    createdAt: string;
}

const ENV_OPTIONS = ["PROD", "STAGING", "DEV"];
const AUTH_OPTIONS = ["NONE", "BEARER", "BASIC", "API_KEY"];

const emptyForm = {
    name: "", baseUrl: "", environment: "DEV",
    authType: "NONE", authValue: "", authKey: "",
    timeoutMs: 30000, tlsVerify: true,
};

export default function TargetsPage() {
    const { data: session } = useSession();
    const [targets, setTargets] = useState<Target[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [env, setEnv] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editTarget, setEditTarget] = useState<Target | null>(null);
    const [form, setForm] = useState({ ...emptyForm });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [connectivity, setConnectivity] = useState<Record<string, { reachable: boolean; latencyMs: number; status: number | null; message: string } | "loading">>({});
    const canEdit = session?.user.role !== "VIEWER";

    const load = useCallback(async () => {
        const res = await fetch(`/api/targets?q=${search}&env=${env}`);
        const data = await res.json();
        setTargets(Array.isArray(data) ? data : []);
        setLoading(false);
    }, [search, env]);

    useEffect(() => { load(); }, [load]);

    function openCreate() {
        setEditTarget(null);
        setForm({ ...emptyForm });
        setError("");
        setShowModal(true);
    }

    function openEdit(t: Target) {
        setEditTarget(t);
        setForm({
            name: t.name, baseUrl: t.baseUrl, environment: t.environment,
            authType: t.authType, authValue: "", authKey: "",
            timeoutMs: t.timeoutMs, tlsVerify: t.tlsVerify,
        });
        setError("");
        setShowModal(true);
    }

    async function save() {
        setError("");
        setSaving(true);
        try {
            const url = editTarget ? `/api/targets/${editTarget.id}` : "/api/targets";
            const method = editTarget ? "PUT" : "POST";
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            if (!res.ok) {
                const d = await res.json();
                setError(d.error ?? "Failed to save");
                return;
            }
            setShowModal(false);
            load();
        } finally {
            setSaving(false);
        }
    }

    async function deleteTarget(id: string) {
        if (!confirm("Delete this target?")) return;
        await fetch(`/api/targets/${id}`, { method: "DELETE" });
        load();
    }

    async function testConnectivity(id: string) {
        setConnectivity((c) => ({ ...c, [id]: "loading" }));
        const res = await fetch(`/api/targets/${id}/connectivity`);
        const data = await res.json();
        setConnectivity((c) => ({ ...c, [id]: data }));
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Targets</h1>
                    <p className="page-subtitle">Manage test domains and base URLs</p>
                </div>
                {canEdit && (
                    <button id="add-target-btn" className="btn btn-primary" onClick={openCreate}>
                        + Add Target
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 mb-4">
                <input
                    className="form-input"
                    style={{ maxWidth: 280 }}
                    placeholder="Search targets..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <select className="form-select" style={{ maxWidth: 160 }} value={env} onChange={(e) => setEnv(e.target.value)}>
                    <option value="">All Environments</option>
                    {ENV_OPTIONS.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
            </div>

            <div className="card">
                {loading ? (
                    <div className="flex-center" style={{ padding: "3rem" }}>
                        <div className="spinner" style={{ width: 36, height: 36 }} />
                    </div>
                ) : targets.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">🎯</div>
                        <h3>No targets yet</h3>
                        <p>Add a base URL to start building test plans</p>
                    </div>
                ) : (
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Base URL</th>
                                    <th>Environment</th>
                                    <th>Auth</th>
                                    <th>Timeout</th>
                                    <th>TLS</th>
                                    <th>Connectivity</th>
                                    <th>Created</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {targets.map((t) => {
                                    const conn = connectivity[t.id];
                                    return (
                                        <tr key={t.id}>
                                            <td style={{ fontWeight: 600 }}>{t.name}</td>
                                            <td>
                                                <a href={t.baseUrl} target="_blank" rel="noopener" className="text-blue font-mono text-sm" style={{ textDecoration: "none" }}>
                                                    {t.baseUrl.length > 40 ? t.baseUrl.slice(0, 40) + "…" : t.baseUrl}
                                                </a>
                                            </td>
                                            <td><span className={`badge badge-${t.environment.toLowerCase()}`}>{t.environment}</span></td>
                                            <td><span className="badge badge-dev">{t.authType}</span></td>
                                            <td className="font-mono text-sm">{(t.timeoutMs / 1000).toFixed(0)}s</td>
                                            <td>{t.tlsVerify ? "✅" : "⚠️"}</td>
                                            <td>
                                                {conn === "loading" ? (
                                                    <span className="spinner" style={{ width: 14, height: 14 }} />
                                                ) : conn ? (
                                                    <span className={conn.reachable ? "text-green" : "text-red"} style={{ fontSize: "0.78rem" }}>
                                                        {conn.reachable ? `✅ ${conn.status} (${conn.latencyMs}ms)` : `❌ ${conn.message.slice(0, 30)}`}
                                                    </span>
                                                ) : (
                                                    <button className="btn btn-ghost btn-sm" onClick={() => testConnectivity(t.id)}>
                                                        Test
                                                    </button>
                                                )}
                                            </td>
                                            <td className="text-muted text-sm">{new Date(t.createdAt).toLocaleDateString()}</td>
                                            <td>
                                                {canEdit && (
                                                    <div className="flex gap-2">
                                                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(t)}>Edit</button>
                                                        <button className="btn btn-danger btn-sm" onClick={() => deleteTarget(t.id)}>Del</button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{editTarget ? "Edit Target" : "Add Target"}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
                        </div>

                        {error && <div className="alert alert-error">{error}</div>}

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Name <span className="required">*</span></label>
                                <input id="target-name" className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Production API" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Environment</label>
                                <select id="target-env" className="form-select" value={form.environment} onChange={(e) => setForm({ ...form, environment: e.target.value })}>
                                    {ENV_OPTIONS.map((e) => <option key={e}>{e}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Base URL <span className="required">*</span></label>
                            <input id="target-url" className="form-input" value={form.baseUrl} onChange={(e) => setForm({ ...form, baseUrl: e.target.value })} placeholder="https://api.example.com" />
                            <div className="form-hint">Must be a valid URL. Endpoint paths are defined in Test Plans.</div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Auth Type</label>
                                <select id="target-auth" className="form-select" value={form.authType} onChange={(e) => setForm({ ...form, authType: e.target.value })}>
                                    {AUTH_OPTIONS.map((a) => <option key={a}>{a}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Timeout (ms)</label>
                                <input id="target-timeout" className="form-input" type="number" value={form.timeoutMs} onChange={(e) => setForm({ ...form, timeoutMs: parseInt(e.target.value) })} />
                            </div>
                        </div>

                        {form.authType !== "NONE" && (
                            <div className="form-row">
                                {form.authType === "API_KEY" && (
                                    <div className="form-group">
                                        <label className="form-label">Header Key</label>
                                        <input id="target-authkey" className="form-input" value={form.authKey} onChange={(e) => setForm({ ...form, authKey: e.target.value })} placeholder="X-API-Key" />
                                    </div>
                                )}
                                <div className="form-group">
                                    <label className="form-label">Auth Value / Token</label>
                                    <input id="target-authval" className="form-input" type="password" value={form.authValue} onChange={(e) => setForm({ ...form, authValue: e.target.value })} placeholder="••••••••" />
                                </div>
                            </div>
                        )}

                        <div className="form-group">
                            <div className="checkbox-group">
                                <input type="checkbox" id="tls-verify" checked={form.tlsVerify} onChange={(e) => setForm({ ...form, tlsVerify: e.target.checked })} />
                                <label htmlFor="tls-verify">Verify TLS/SSL certificate</label>
                            </div>
                            <div className="form-hint">Disable for internal/self-signed certificates</div>
                        </div>

                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button id="save-target-btn" className="btn btn-primary" onClick={save} disabled={saving}>
                                {saving ? "Saving..." : editTarget ? "Update Target" : "Add Target"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
