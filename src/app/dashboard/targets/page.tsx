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
        <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden text-slate-900 dark:text-slate-100 font-display">
            {/* Header */}
            <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-8 shrink-0">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Target Manager</h2>
                </div>
                {canEdit && (
                    <button id="add-target-btn" onClick={openCreate} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-primary/90 transition-colors">
                        <span className="material-symbols-outlined text-lg">add</span>
                        New Target
                    </button>
                )}
            </header>

            {/* Main Area */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">

                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col min-h-0">
                    {/* Toolbar */}
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 shrink-0">
                        <div className="flex items-center gap-3 flex-1 lg:max-w-md">
                            <div className="relative w-full">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                                <input
                                    type="text"
                                    placeholder="Search targets..."
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none text-slate-900 dark:text-white placeholder-slate-400"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <select
                                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                                value={env}
                                onChange={(e) => setEnv(e.target.value)}
                            >
                                <option value="">All Env</option>
                                {ENV_OPTIONS.map((e) => <option key={e} value={e}>{e}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Table */}
                    {loading ? (
                        <div className="p-12 flex justify-center items-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : targets.length === 0 ? (
                        <div className="p-16 text-center flex flex-col items-center">
                            <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">radar</span>
                            <h3 className="font-bold text-slate-900 dark:text-white text-lg">No Targets Configured</h3>
                            <p className="text-slate-500 mb-4 max-w-sm">You haven't added any target environments yet. Add one to start testing.</p>
                            {canEdit && (
                                <button onClick={openCreate} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-primary/90 transition-colors">
                                    <span className="material-symbols-outlined text-lg">add</span>
                                    Add your first target
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto flex-1">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs font-bold uppercase tracking-wider sticky top-0 z-10">
                                    <tr>
                                        <th className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">Name / Environment</th>
                                        <th className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">Base URL</th>
                                        <th className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">Auth & Auth</th>
                                        <th className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">Connectivity</th>
                                        <th className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                    {targets.map(t => {
                                        const conn = connectivity[t.id];
                                        return (
                                            <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <p className="font-bold text-slate-900 dark:text-white text-sm">{t.name}</p>
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase mt-1 ${t.environment === "PROD" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                                                                t.environment === "STAGING" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
                                                                    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                                            }`}>
                                                            {t.environment}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <a href={t.baseUrl} target="_blank" rel="noopener" className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary max-w-[200px] truncate font-mono">
                                                            {t.baseUrl}
                                                        </a>
                                                        <button className="text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <span className="material-symbols-outlined text-sm">content_copy</span>
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded inline-block w-max font-medium">{t.authType}</span>
                                                        <span className="text-[11px] text-slate-500">{t.tlsVerify ? "TLS Verified" : "TLS Ignored"}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {conn === "loading" ? (
                                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                                    ) : conn ? (
                                                        <div className="flex items-center gap-1.5">
                                                            <div className={`size-2 rounded-full ${conn.reachable ? "bg-green-500" : "bg-red-500"}`}></div>
                                                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                                                {conn.reachable ? `${conn.status} (${conn.latencyMs}ms)` : "Unreachable"}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <button onClick={() => testConnectivity(t.id)} className="text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-2.5 py-1.5 rounded transition-colors font-medium">
                                                            Ping Target
                                                        </button>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {canEdit && (
                                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => openEdit(t)} className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded transition-colors">
                                                                <span className="material-symbols-outlined text-sm">edit</span>
                                                            </button>
                                                            <button onClick={() => deleteTarget(t.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors">
                                                                <span className="material-symbols-outlined text-sm">delete</span>
                                                            </button>
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
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white">{editTarget ? "Edit Target" : "New Target"}</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
                            {error && (
                                <div className="p-3 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium border border-red-100 dark:border-red-900/20">{error}</div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Target Name</label>
                                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} type="text" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="Primary API" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Environment</label>
                                    <select value={form.environment} onChange={(e) => setForm({ ...form, environment: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none">
                                        {ENV_OPTIONS.map((e) => <option key={e}>{e}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Base URL</label>
                                <input value={form.baseUrl} onChange={(e) => setForm({ ...form, baseUrl: e.target.value })} type="text" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="https://api.example.com" />
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Auth Type</label>
                                    <select value={form.authType} onChange={(e) => setForm({ ...form, authType: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none">
                                        {AUTH_OPTIONS.map((a) => <option key={a}>{a}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Timeout (ms)</label>
                                    <input value={form.timeoutMs} onChange={(e) => setForm({ ...form, timeoutMs: parseInt(e.target.value) })} type="number" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
                                </div>
                            </div>

                            {form.authType !== "NONE" && (
                                <div className="grid grid-cols-2 gap-4">
                                    {form.authType === "API_KEY" && (
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Header Key</label>
                                            <input value={form.authKey} onChange={(e) => setForm({ ...form, authKey: e.target.value })} type="text" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm" placeholder="X-API-Key" />
                                        </div>
                                    )}
                                    <div className={`space-y-1.5 ${form.authType !== "API_KEY" ? "col-span-2" : ""}`}>
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Auth Value / Token</label>
                                        <input value={form.authValue} onChange={(e) => setForm({ ...form, authValue: e.target.value })} type="password" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm" placeholder="••••••••" />
                                    </div>
                                </div>
                            )}

                            <label className="flex items-center gap-2 pt-2 cursor-pointer">
                                <input checked={form.tlsVerify} onChange={(e) => setForm({ ...form, tlsVerify: e.target.checked })} type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary" />
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Verify TLS/SSL certificate</span>
                            </label>
                        </div>

                        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-3 bg-slate-50/50 dark:bg-slate-800/50">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors">Cancel</button>
                            <button onClick={save} disabled={saving} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 flex items-center justify-center min-w-[120px]">
                                {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : editTarget ? "Save Changes" : "Create Target"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
