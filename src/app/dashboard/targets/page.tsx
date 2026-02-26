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
        if (!confirm("Decommission this infrastructure node?")) return;
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
        <div className="space-y-8 animate-in pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-1 font-display">Resource Inventory</h1>
                    <p className="text-slate-500 text-sm font-medium">Provision and validate infrastructure end-points for profiling.</p>
                </div>
                {canEdit && (
                    <button onClick={openCreate} className="btn-primary">
                        <span className="material-symbols-outlined text-lg">add</span>
                        New Target
                    </button>
                )}
            </div>

            <div className="space-y-8">
                {/* Search & Filter */}
                <div className="flex flex-col md:flex-row items-center gap-4">
                    <div className="relative flex-1 w-full">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
                        <input
                            type="text"
                            placeholder="Find infrastructure..."
                            className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-sm font-medium focus:border-sky-500 outline-none transition-all shadow-sm"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <select
                            className="bg-white border border-slate-200 text-sm font-bold text-slate-600 rounded-xl px-4 py-3 outline-none cursor-pointer shadow-sm w-full md:w-auto"
                            value={env}
                            onChange={(e) => setEnv(e.target.value)}
                        >
                            <option value="">All Environments</option>
                            {ENV_OPTIONS.map((e) => <option key={e} value={e}>{e}</option>)}
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="py-24 flex justify-center items-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-100 border-t-sky-500"></div>
                    </div>
                ) : targets.length === 0 ? (
                    <div className="card-premium py-24 flex flex-col items-center justify-center text-center px-6 border-slate-100">
                        <div className="size-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-6 border border-slate-100 text-slate-200">
                            <span className="material-symbols-outlined text-3xl">hub</span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-1">No targets detected</h3>
                        <p className="text-slate-500 text-sm max-w-sm mx-auto mb-8 font-medium">Add your first server or API endpoint to begin system profiling.</p>
                        {canEdit && (
                            <button onClick={openCreate} className="btn-primary scale-90">Provision First Target</button>
                        )}
                    </div>
                ) : (
                    <div className="card-premium overflow-hidden border-slate-100 bg-white shadow-xl shadow-slate-200/5">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Environment & Identity</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Connectivity Status</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Specifications</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {targets.map(t => {
                                        const conn = connectivity[t.id];
                                        return (
                                            <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-5">
                                                    <div className="flex flex-col gap-1.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${t.environment === "PROD" ? "bg-rose-50 text-rose-600 border-rose-100" :
                                                                    t.environment === "STAGING" ? "bg-amber-50 text-amber-600 border-amber-100" :
                                                                        "bg-sky-50 text-sky-600 border-sky-100"
                                                                }`}>
                                                                {t.environment}
                                                            </span>
                                                            <span className="text-sm font-bold text-slate-900">{t.name}</span>
                                                        </div>
                                                        <span className="text-[11px] font-mono font-medium text-slate-400 truncate max-w-[240px]">{t.baseUrl}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    {conn === "loading" ? (
                                                        <div className="flex items-center gap-3">
                                                            <div className="size-4 border-2 border-slate-100 border-t-sky-500 rounded-full animate-spin"></div>
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Validating...</span>
                                                        </div>
                                                    ) : conn ? (
                                                        <div className="flex items-center gap-3">
                                                            <div className={`size-2.5 rounded-full ${conn.reachable ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" : "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)]"}`}></div>
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-bold text-slate-700">
                                                                    {conn.reachable ? `${conn.status} OK` : "Endpoint Offline"}
                                                                </span>
                                                                {conn.reachable && <span className="text-[10px] font-medium text-slate-400">{conn.latencyMs}ms Latency</span>}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => testConnectivity(t.id)}
                                                            className="h-8 px-4 bg-slate-50 hover:bg-sky-50 text-slate-500 hover:text-sky-600 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border border-slate-100 hover:border-sky-100"
                                                        >
                                                            Verify Reachability
                                                        </button>
                                                    )}
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="material-symbols-outlined text-sm text-slate-400">lock</span>
                                                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{t.authType || "Anonymous"}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="material-symbols-outlined text-sm text-slate-400">verified_user</span>
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.tlsVerify ? "Secure TLS" : "Insecure Mode"}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    {canEdit && (
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button onClick={() => openEdit(t)} className="size-9 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-all border border-slate-100">
                                                                <span className="material-symbols-outlined text-lg">edit</span>
                                                            </button>
                                                            <button onClick={() => deleteTarget(t.id)} className="size-9 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all border border-slate-100">
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
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-slate-900 tracking-tight">Configure Infrastructure</h3>
                            <button onClick={() => setShowModal(false)} className="size-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-slate-600">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-8 overflow-y-auto space-y-8">
                            {error && (
                                <div className="p-4 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold border border-rose-100 flex items-center gap-3">
                                    <span className="material-symbols-outlined text-lg">error</span>
                                    {error}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Resource Name</label>
                                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} type="text" className="w-full h-12 bg-slate-50 border border-slate-200 rounded-2xl px-4 text-sm font-bold focus:bg-white transition-all shadow-sm" placeholder="e.g. Core API Cluster" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Environment</label>
                                    <select value={form.environment} onChange={(e) => setForm({ ...form, environment: e.target.value })} className="w-full h-12 bg-slate-50 border border-slate-200 rounded-2xl px-4 text-sm font-bold focus:bg-white transition-all cursor-pointer shadow-sm">
                                        {ENV_OPTIONS.map((e) => <option key={e} value={e}>{e}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Endpoint URL</label>
                                <div className="relative">
                                    <input value={form.baseUrl} onChange={(e) => setForm({ ...form, baseUrl: e.target.value })} type="text" className="w-full h-12 bg-slate-50 border border-slate-200 rounded-2xl pl-4 pr-12 text-sm font-mono font-medium focus:bg-white transition-all shadow-sm" placeholder="https://api.internal.cloud" />
                                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">link</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Authentication</label>
                                    <select value={form.authType} onChange={(e) => setForm({ ...form, authType: e.target.value })} className="w-full h-12 bg-slate-50 border border-slate-200 rounded-2xl px-4 text-sm font-bold focus:bg-white transition-all cursor-pointer shadow-sm">
                                        {AUTH_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Timeout (ms)</label>
                                    <input value={form.timeoutMs} onChange={(e) => setForm({ ...form, timeoutMs: parseInt(e.target.value) })} type="number" className="w-full h-12 bg-slate-50 border border-slate-200 rounded-2xl px-4 text-sm font-bold focus:bg-white transition-all shadow-sm" />
                                </div>
                            </div>

                            {form.authType !== "NONE" && (
                                <div className="p-8 bg-sky-50/30 rounded-3xl border border-sky-100/50 space-y-6 animate-in">
                                    {form.authType === "API_KEY" && (
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Header Key</label>
                                            <input value={form.authKey} onChange={(e) => setForm({ ...form, authKey: e.target.value })} type="text" className="w-full h-11 bg-white border border-slate-200 rounded-xl px-4 text-sm font-medium focus:border-sky-500 outline-none" placeholder="X-API-Key" />
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Credentials / Secret</label>
                                        <input value={form.authValue} onChange={(e) => setForm({ ...form, authValue: e.target.value })} type="password" className="w-full h-11 bg-white border border-slate-200 rounded-xl px-4 text-sm font-medium focus:border-sky-500 outline-none" placeholder="••••••••••••••••" />
                                    </div>
                                </div>
                            )}

                            <label className="flex items-center gap-4 p-5 bg-slate-50 rounded-3xl border border-slate-100 cursor-pointer hover:bg-slate-100/50 transition-all group">
                                <div className="relative">
                                    <input checked={form.tlsVerify} onChange={(e) => setForm({ ...form, tlsVerify: e.target.checked })} type="checkbox" className="size-6 rounded-lg border-slate-300 text-sky-600 focus:ring-sky-500/20" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors">Enforce TLS Verification</span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Secure handshake required for all operations</span>
                                </div>
                            </label>
                        </div>

                        <div className="px-8 py-6 border-t border-slate-50 flex items-center justify-end gap-4 bg-slate-50/30">
                            <button onClick={() => setShowModal(false)} className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest">Discard</button>
                            <button onClick={save} disabled={saving} className="btn-primary px-10 h-12 min-w-[160px]">
                                {saving ? <div className="size-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : (editTarget ? "Update Resource" : "Provision Resource")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
