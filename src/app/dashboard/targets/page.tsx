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
        <div className="space-y-6 sm:space-y-8 animate-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mb-1">Targets</h1>
                    <p className="text-slate-500 text-sm font-medium">Manage environments and endpoints for your performance tests.</p>
                </div>
                {canEdit && (
                    <button onClick={openCreate} className="btn-primary text-xs">
                        <span className="material-symbols-outlined text-lg">add</span>
                        New Target
                    </button>
                )}
            </div>

            <div className="card-premium overflow-hidden">
                {/* Toolbar */}
                <div className="p-3.5 sm:p-4 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-slate-50/30">
                    <div className="relative w-full sm:max-w-sm">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
                        <input
                            type="text"
                            placeholder="Search targets..."
                            className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <select
                        className="w-full sm:w-auto bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                        value={env}
                        onChange={(e) => setEnv(e.target.value)}
                    >
                        <option value="">All Environments</option>
                        {ENV_OPTIONS.map((e) => <option key={e} value={e}>{e}</option>)}
                    </select>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="p-16 sm:p-20 flex justify-center items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : targets.length === 0 ? (
                    <div className="p-12 sm:p-20 text-center flex flex-col items-center">
                        <span className="material-symbols-outlined text-4xl sm:text-5xl text-slate-200 mb-3 animate-gentle-pulse">router</span>
                        <h3 className="font-bold text-slate-900 text-base sm:text-lg mb-2">Empty Inventory</h3>
                        <p className="text-slate-500 text-sm mb-6 max-w-sm">No target endpoints configured. Register a target to begin performance benchmarking.</p>
                        {canEdit && (
                            <button onClick={openCreate} className="btn-primary text-xs">Initialize Target</button>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Mobile: Card layout */}
                        <div className="sm:hidden divide-y divide-slate-100">
                            {targets.map(t => {
                                const conn = connectivity[t.id];
                                return (
                                    <div key={t.id} className="p-4 space-y-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${t.environment === "PROD" ? "bg-red-50 text-red-600 border-red-100" :
                                                        t.environment === "STAGING" ? "bg-amber-50 text-amber-600 border-amber-100" :
                                                            "bg-blue-50 text-blue-600 border-blue-100"
                                                        }`}>
                                                        {t.environment}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-mono truncate">{t.baseUrl}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                {conn === "loading" ? (
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                                ) : conn ? (
                                                    <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                                                        <div className={`size-2 rounded-full ${conn.reachable ? "bg-green-500" : "bg-red-500"}`}></div>
                                                        <span className="text-[11px] font-bold text-slate-700">
                                                            {conn.reachable ? `${conn.status} · ${conn.latencyMs}ms` : "OFFLINE"}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => testConnectivity(t.id)} className="text-[10px] font-bold text-primary uppercase tracking-wider px-2 py-1 hover:underline">
                                                        Ping
                                                    </button>
                                                )}
                                                <span className="text-[10px] font-medium text-slate-400 uppercase">{t.authType}</span>
                                            </div>
                                            {canEdit && (
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => openEdit(t)} className="p-1.5 text-slate-400 hover:text-primary rounded-lg">
                                                        <span className="material-symbols-outlined text-lg">edit</span>
                                                    </button>
                                                    <button onClick={() => deleteTarget(t.id)} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg">
                                                        <span className="material-symbols-outlined text-lg">delete</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Desktop: Table layout */}
                        <div className="hidden sm:block overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50 text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                    <tr>
                                        <th className="px-5 py-3.5">Environment</th>
                                        <th className="px-5 py-3.5">Status & Connectivity</th>
                                        <th className="px-5 py-3.5">Security</th>
                                        <th className="px-5 py-3.5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {targets.map(t => {
                                        const conn = connectivity[t.id];
                                        return (
                                            <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-5 py-4">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-sm font-bold text-slate-900">{t.name}</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${t.environment === "PROD" ? "bg-red-50 text-red-600 border-red-100" :
                                                                t.environment === "STAGING" ? "bg-amber-50 text-amber-600 border-amber-100" :
                                                                    "bg-blue-50 text-blue-600 border-blue-100"
                                                                }`}>
                                                                {t.environment}
                                                            </span>
                                                            <span className="text-[10px] text-slate-400 font-mono font-medium truncate max-w-[200px]">{t.baseUrl}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    {conn === "loading" ? (
                                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                                    ) : conn ? (
                                                        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 w-fit">
                                                            <div className={`size-2 rounded-full ${conn.reachable ? "bg-green-500" : "bg-red-500"}`}></div>
                                                            <span className="text-xs font-bold text-slate-700">
                                                                {conn.reachable ? `${conn.status} · ${conn.latencyMs}ms` : "OFFLINE"}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <button onClick={() => testConnectivity(t.id)} className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline px-2 py-1">
                                                            Ping Endpoint
                                                        </button>
                                                    )}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t.authType}</span>
                                                        <span className="text-[11px] font-medium text-slate-400">{t.tlsVerify ? "TLS Active" : "No SSL Verify"}</span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    {canEdit && (
                                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => openEdit(t)} className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg">
                                                                <span className="material-symbols-outlined text-lg">edit</span>
                                                            </button>
                                                            <button onClick={() => deleteTarget(t.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50/50 rounded-lg">
                                                                <span className="material-symbols-outlined text-lg">delete</span>
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
                    </>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-premium w-full sm:max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in border border-white">
                        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                            <h3 className="font-bold text-slate-900">{editTarget ? "Modify" : "New"} Target</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
                            {error && (
                                <div className="p-3.5 bg-red-50 text-red-600 rounded-xl text-xs font-bold border border-red-100">{error}</div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Name</label>
                                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all" placeholder="e.g. Core API" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Environment</label>
                                    <select value={form.environment} onChange={(e) => setForm({ ...form, environment: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none">
                                        {ENV_OPTIONS.map((e) => <option key={e}>{e}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Base URL</label>
                                <input value={form.baseUrl} onChange={(e) => setForm({ ...form, baseUrl: e.target.value })} type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all" placeholder="https://api.example.com" />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Auth Type</label>
                                    <select value={form.authType} onChange={(e) => setForm({ ...form, authType: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none">
                                        {AUTH_OPTIONS.map((a) => <option key={a}>{a}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Timeout (ms)</label>
                                    <input value={form.timeoutMs} onChange={(e) => setForm({ ...form, timeoutMs: parseInt(e.target.value) })} type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none" />
                                </div>
                            </div>

                            {form.authType !== "NONE" && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in">
                                    {form.authType === "API_KEY" && (
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Header Key</label>
                                            <input value={form.authKey} onChange={(e) => setForm({ ...form, authKey: e.target.value })} type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold" placeholder="X-API-Key" />
                                        </div>
                                    )}
                                    <div className={`space-y-1.5 ${form.authType !== "API_KEY" ? "sm:col-span-2" : ""}`}>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Credential Value</label>
                                        <input value={form.authValue} onChange={(e) => setForm({ ...form, authValue: e.target.value })} type="password" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold" placeholder="••••••••" />
                                    </div>
                                </div>
                            )}

                            <label className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl cursor-pointer group hover:bg-slate-100 transition-colors">
                                <input checked={form.tlsVerify} onChange={(e) => setForm({ ...form, tlsVerify: e.target.checked })} type="checkbox" className="size-4 rounded border-slate-300 text-primary focus:ring-primary transition-all accent-primary" />
                                <div className="flex flex-col">
                                    <span className="text-sm font-semibold text-slate-800">Enforce SSL Verification</span>
                                    <span className="text-[10px] font-medium text-slate-400">Disable for local untrusted certificates</span>
                                </div>
                            </label>
                        </div>

                        <div className="px-5 sm:px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors">Cancel</button>
                            <button onClick={save} disabled={saving} className="btn-primary min-w-[120px] text-xs">
                                {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : editTarget ? "Update" : "Create"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
