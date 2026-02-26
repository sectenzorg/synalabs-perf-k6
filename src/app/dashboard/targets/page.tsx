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
        <div className="space-y-8 sm:space-y-12 animate-in pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mb-1.5 font-display">Resource Inventory</h1>
                    <p className="text-slate-500 text-sm sm:text-base font-medium">Provision and validate infrastructure end-points for profiling.</p>
                </div>
                {canEdit && (
                    <button onClick={openCreate} className="btn-primary">
                        <span className="material-symbols-outlined text-lg">router</span>
                        Provision Target
                    </button>
                )}
            </div>

            <div className="grid gap-6 sm:gap-8">
                {/* Search & Filter - Redesigned */}
                <div className="flex flex-col lg:flex-row items-center gap-4 bg-white p-3 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-50">
                    <div className="relative flex-1 w-full lg:max-w-md">
                        <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 text-2xl group-focus-within:text-primary transition-colors">search</span>
                        <input
                            type="text"
                            placeholder="Identify specific infrastructure..."
                            className="w-full bg-slate-50 border border-slate-100 rounded-[1.8rem] pl-16 pr-8 py-4 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-4 w-full lg:w-auto">
                        <div className="h-8 w-px bg-slate-100 hidden lg:block" />
                        <div className="flex items-center gap-3 px-6 py-4 bg-slate-50 rounded-[1.8rem] flex-1 lg:flex-none">
                            <span className="material-symbols-outlined text-slate-400 text-xl font-display">dns</span>
                            <select
                                className="bg-transparent border-none text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em] outline-none cursor-pointer pr-4"
                                value={env}
                                onChange={(e) => setEnv(e.target.value)}
                            >
                                <option value="">Global Environment</option>
                                {ENV_OPTIONS.map((e) => <option key={e} value={e}>{e}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="py-24 flex justify-center items-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                ) : targets.length === 0 ? (
                    <div className="card-premium py-24 sm:py-32 flex flex-col items-center justify-center text-center px-6">
                        <div className="size-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mb-8 border border-slate-100 shadow-inner group">
                            <span className="material-symbols-outlined text-5xl text-slate-200 group-hover:scale-110 group-hover:text-primary transition-all duration-500">router</span>
                        </div>
                        <h3 className="text-2xl font-extrabold text-slate-900 mb-2">Inventory Depleted</h3>
                        <p className="text-slate-500 text-sm max-w-sm mx-auto mb-10 font-medium italic">No operational endpoints identified. Register a base infrastructure URL to initialize telemetry.</p>
                        {canEdit && (
                            <button onClick={openCreate} className="btn-primary">Register Primary Node</button>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Mobile: Card layout */}
                        <div className="sm:hidden space-y-4">
                            {targets.map(t => {
                                const conn = connectivity[t.id];
                                return (
                                    <div key={t.id} className="card-premium p-6 space-y-6 bg-white overflow-hidden relative group">
                                        <div className="flex items-start justify-between">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <div className={`size-1.5 rounded-full ${t.environment === "PROD" ? "bg-red-500" : t.environment === "STAGING" ? "bg-amber-500" : "bg-blue-500"}`} />
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.environment} INSTANCE</span>
                                                </div>
                                                <h3 className="text-xl font-extrabold text-slate-900">{t.name}</h3>
                                                <p className="text-xs font-mono font-bold text-slate-400 truncate opacity-60">{t.baseUrl}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                                            <div className="flex items-center gap-3">
                                                {conn === "loading" ? (
                                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                                                ) : conn ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className={`size-3 rounded-full ${conn.reachable ? "bg-emerald-500 shadow-lg" : "bg-red-500"} transition-all animate-pulse`}></div>
                                                        <span className="text-xs font-extrabold text-slate-700">
                                                            {conn.reachable ? `${conn.status} · ${conn.latencyMs}ms` : "REFUSED"}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => testConnectivity(t.id)} className="text-[10px] font-extrabold text-primary uppercase tracking-[0.2em] px-3 py-1 bg-primary/10 rounded-full hover:bg-primary hover:text-white transition-all">
                                                        Probe Node
                                                    </button>
                                                )}
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.authType}</span>
                                        </div>

                                        <div className="flex items-center justify-end gap-2 pt-2">
                                            {canEdit && (
                                                <>
                                                    <button onClick={() => openEdit(t)} className="flex-1 btn-premium py-3 text-[10px]">Configure</button>
                                                    <button onClick={() => deleteTarget(t.id)} className="size-12 flex items-center justify-center rounded-2xl bg-red-50 text-red-500 border border-red-100 active:scale-95 transition-all">
                                                        <span className="material-symbols-outlined text-xl">delete_outline</span>
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Desktop: Table layout */}
                        <div className="hidden sm:block card-premium overflow-hidden border-none shadow-2xl">
                            <table className="w-full text-left">
                                <thead className="bg-slate-900 text-white">
                                    <tr>
                                        <th className="px-10 py-6 text-[10px] font-bold uppercase tracking-[0.3em] opacity-60">Domain Specification</th>
                                        <th className="px-10 py-6 text-[10px] font-bold uppercase tracking-[0.3em] opacity-60">Availability Probe</th>
                                        <th className="px-10 py-6 text-[10px] font-bold uppercase tracking-[0.3em] opacity-60">Security Fabric</th>
                                        <th className="px-10 py-6 text-[10px] font-bold uppercase tracking-[0.3em] opacity-60 text-right">Operational Logic</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {targets.map(t => {
                                        const conn = connectivity[t.id];
                                        return (
                                            <tr key={t.id} className="hover:bg-slate-50/80 transition-all group">
                                                <td className="px-10 py-8">
                                                    <div className="flex items-center gap-6">
                                                        <div className={`size-14 rounded-3xl flex items-center justify-center text-white/90 shadow-2xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 ${t.environment === "PROD" ? "bg-gradient-to-br from-red-500 to-red-700 shadow-red-500/20" :
                                                                t.environment === "STAGING" ? "bg-gradient-to-br from-amber-500 to-amber-700 shadow-amber-500/20" :
                                                                    "bg-gradient-to-br from-primary to-indigo-600 shadow-primary/20"
                                                            }`}>
                                                            <span className="material-symbols-outlined text-2xl">dns</span>
                                                        </div>
                                                        <div className="flex flex-col gap-1.5">
                                                            <span className="text-lg font-extrabold text-slate-900 group-hover:text-primary transition-colors">{t.name}</span>
                                                            <div className="flex items-center gap-3">
                                                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border tracking-widest ${t.environment === "PROD" ? "bg-red-50 text-red-600 border-red-100" :
                                                                        t.environment === "STAGING" ? "bg-amber-50 text-amber-600 border-amber-100" :
                                                                            "bg-blue-50 text-blue-600 border-blue-100"
                                                                    }`}>
                                                                    {t.environment}
                                                                </span>
                                                                <span className="text-xs font-mono font-bold text-slate-400 group-hover:text-slate-500 transition-colors italic opacity-60">{t.baseUrl}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-10 py-8">
                                                    <div className="relative">
                                                        {conn === "loading" ? (
                                                            <div className="flex items-center gap-3 animate-in">
                                                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                                                                <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">Executing Probe...</span>
                                                            </div>
                                                        ) : conn ? (
                                                            <div className="flex items-center gap-5 bg-slate-50 border border-slate-100 px-5 py-3 rounded-2xl w-fit group-hover:bg-white transition-all hover:shadow-lg">
                                                                <div className={`size-3 rounded-full ${conn.reachable ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)] animate-pulse" : "bg-red-500"}`}></div>
                                                                <div className="flex flex-col">
                                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Status</span>
                                                                    <span className={`text-sm font-extrabold ${conn.reachable ? 'text-slate-900' : 'text-red-600'}`}>
                                                                        {conn.reachable ? `${conn.status} · ${conn.latencyMs}ms` : "PORT_REFUSED"}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => testConnectivity(t.id)}
                                                                className="btn-premium px-4 py-2 text-[10px] opacity-40 group-hover:opacity-100 transition-all hover:bg-primary/5 hover:text-primary hover:border-primary/20"
                                                            >
                                                                Probe Infrastructure
                                                                <span className="material-symbols-outlined text-sm">satellite_alt</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-10 py-8">
                                                    <div className="flex flex-col gap-1.5 font-display">
                                                        <div className="flex items-center gap-2">
                                                            <span className="material-symbols-outlined text-slate-300 text-lg">shield_lock</span>
                                                            <span className="text-[10px] font-extrabold text-slate-700 uppercase tracking-widest">{t.authType}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <div className={`size-1.5 rounded-full ${t.tlsVerify ? "bg-emerald-400" : "bg-slate-300"}`} />
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.tlsVerify ? "TLS Validated" : "Insecure OK"}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-10 py-8 text-right">
                                                    {canEdit && (
                                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                                                            <button onClick={() => openEdit(t)} className="btn-premium px-4 py-2 text-[10px]">
                                                                Calibrate
                                                                <span className="material-symbols-outlined text-sm">tune</span>
                                                            </button>
                                                            <button onClick={() => deleteTarget(t.id)} className="size-10 flex items-center justify-center rounded-xl bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all active:scale-95 border border-red-100">
                                                                <span className="material-symbols-outlined text-xl">delete_sweep</span>
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

            {/* Modal - Sophisticated Provisioning */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in">
                    <div className="bg-white rounded-t-[3rem] sm:rounded-[3rem] shadow-premium w-full sm:max-w-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh] border border-white">
                        <div className="px-10 py-8 border-b border-slate-50 flex items-center justify-between shrink-0">
                            <div className="space-y-1">
                                <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">{editTarget ? "Calibrate Inventory" : "Provision Resource"}</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{editTarget ? "Updating operational manifest" : "New infrastructure grant"}</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="size-12 flex items-center justify-center rounded-2xl bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all active:scale-90">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-10 overflow-y-auto custom-scrollbar flex-1 space-y-8">
                            {error && (
                                <div className="p-5 bg-red-50 text-red-600 rounded-3xl text-xs font-bold border border-red-100 flex items-center gap-3">
                                    <span className="material-symbols-outlined italic">security_update_warning</span>
                                    {error}
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] px-2 font-display">Target Handle</label>
                                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} type="text" className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-8 py-5 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-primary/10 outline-none transition-all shadow-sm" placeholder="e.g. Gateway Alpha" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] px-2 font-display">Environment Tier</label>
                                    <select value={form.environment} onChange={(e) => setForm({ ...form, environment: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-8 py-5 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-primary/10 outline-none transition-all shadow-sm appearance-none cursor-pointer">
                                        {ENV_OPTIONS.map((e) => <option key={e} value={e}>{e} DEPLOYMENT</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] px-2 font-display">Base Infrastructure URL</label>
                                <input value={form.baseUrl} onChange={(e) => setForm({ ...form, baseUrl: e.target.value })} type="text" className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-8 py-5 text-sm font-mono font-bold focus:bg-white focus:ring-4 focus:ring-primary/10 outline-none transition-all shadow-sm" placeholder="https://api.v2.infrastructure.id" />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] px-2 font-display">Authorization Schema</label>
                                    <select value={form.authType} onChange={(e) => setForm({ ...form, authType: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-8 py-5 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-primary/10 outline-none appearance-none cursor-pointer">
                                        {AUTH_OPTIONS.map((a) => <option key={a} value={a}>{a} COMPLIANCE</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] px-2 font-display">Response Window (ms)</label>
                                    <input value={form.timeoutMs} onChange={(e) => setForm({ ...form, timeoutMs: parseInt(e.target.value) })} type="number" className="w-full bg-white border-b-2 border-slate-100 px-2 py-4 text-2xl font-extrabold text-slate-900 focus:border-primary outline-none transition-all" />
                                </div>
                            </div>

                            {form.authType !== "NONE" && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 animate-in p-8 bg-slate-950 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-8 opacity-10 flex">
                                        <span className="material-symbols-outlined text-6xl text-white">encrypted</span>
                                    </div>
                                    {form.authType === "API_KEY" && (
                                        <div className="space-y-2 relative z-10">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] px-2">Key Identifier</label>
                                            <input value={form.authKey} onChange={(e) => setForm({ ...form, authKey: e.target.value })} type="text" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none focus:border-primary/50" placeholder="X-Internal-Token" />
                                        </div>
                                    )}
                                    <div className={`space-y-2 relative z-10 ${form.authType !== "API_KEY" ? "sm:col-span-2" : ""}`}>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] px-2">Secure Secret</label>
                                        <input value={form.authValue} onChange={(e) => setForm({ ...form, authValue: e.target.value })} type="password" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none focus:border-primary/50" placeholder="••••••••" />
                                    </div>
                                </div>
                            )}

                            <label className="flex items-center gap-6 p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 cursor-pointer group hover:bg-slate-100 transition-all">
                                <div className="relative flex items-center justify-center">
                                    <input checked={form.tlsVerify} onChange={(e) => setForm({ ...form, tlsVerify: e.target.checked })} type="checkbox" className="peer size-6 rounded-lg opacity-0 pointer-events-none" />
                                    <div className={`size-6 rounded-lg bg-white border-2 border-slate-200 transition-all peer-checked:bg-primary peer-checked:border-primary flex items-center justify-center`}>
                                        <span className={`material-symbols-outlined text-sm text-white transition-all transform ${form.tlsVerify ? 'scale-100' : 'scale-0'}`}>check</span>
                                    </div>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-base font-extrabold text-slate-800">Enforce TLS Verification</span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Recommended for production environments</span>
                                </div>
                            </label>
                        </div>

                        <div className="px-10 py-8 border-t border-slate-50 flex items-center justify-end gap-6 bg-slate-50/50 shrink-0">
                            <button onClick={() => setShowModal(false)} className="text-[10px] font-extrabold text-slate-400 hover:text-slate-700 uppercase tracking-[0.2em] transition-colors">Discard</button>
                            <button onClick={save} disabled={saving} className="btn-primary min-w-[200px] h-[64px] shadow-2xl shadow-primary/20">
                                {saving ? <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div> : editTarget ? "Update Schema" : "Commit Provisioning"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
