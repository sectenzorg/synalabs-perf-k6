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
    version?: string;
    region?: string;
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
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
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

    const filteredTargets = targets.filter(t =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.baseUrl.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in pb-12">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-2">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-display">Environments</h1>
                    <p className="text-slate-500 mt-1 font-medium">Monitor and manage your deployment targets globally.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button
                            onClick={() => setViewMode("grid")}
                            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${viewMode === "grid" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
                        >
                            Grid
                        </button>
                        <button
                            onClick={() => setViewMode("list")}
                            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${viewMode === "list" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
                        >
                            List
                        </button>
                    </div>
                    {canEdit && (
                        <button onClick={openCreate} className="bg-[#ec5b13] text-white flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-[#ec5b13]/20 hover:opacity-90 transition-opacity">
                            <span className="material-symbols-outlined text-lg">add</span>
                            <span>New Target</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                {[
                    { label: "Active Targets", val: targets.length, change: "100%", trend: "up", color: "text-emerald-500" },
                    { label: "Avg Latency", val: "34ms", change: "4ms", trend: "down", color: "text-emerald-500" },
                    { label: "Incident Rate", val: "0.02%", change: "Stable", trend: null, color: "text-slate-400" },
                    { label: "Uptime (30d)", val: "99.99%", change: "SLA Met", trend: null, color: "text-[#ec5b13]" },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">{stat.label}</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-slate-900">{stat.val}</span>
                            <span className={`${stat.color} text-[10px] font-bold flex items-center`}>
                                {stat.trend === "up" && <span className="material-symbols-outlined text-xs mr-0.5">trending_up</span>}
                                {stat.trend === "down" && <span className="material-symbols-outlined text-xs mr-0.5">trending_down</span>}
                                {stat.change}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Tabs Filter */}
            <div className="border-b border-slate-200 mb-8 overflow-x-auto no-scrollbar">
                <nav className="flex gap-8 min-w-max px-2">
                    {[
                        { id: "", label: "All Environments", icon: "apps" },
                        { id: "PROD", label: "Active Nodes", icon: "check_circle" },
                        { id: "STAGING", label: "Staging Pipeline", icon: "construction" },
                        { id: "DEV", label: "Dev Instances", icon: "code" },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setEnv(tab.id)}
                            className={`flex items-center gap-2 pb-4 px-1 text-sm font-bold transition-all border-b-2 ${env === tab.id ? "border-[#ec5b13] text-[#ec5b13]" : "border-transparent text-slate-400 hover:text-slate-600"}`}
                        >
                            <span className="material-symbols-outlined text-lg">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Search Input Bar */}
            <div className="relative max-w-md w-full mb-8">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
                <input
                    type="text"
                    placeholder="Search environments, regions or tags..."
                    className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-[#ec5b13]/20 focus:border-[#ec5b13] outline-none shadow-sm transition-all placeholder:text-slate-400"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {loading ? (
                <div className="py-24 flex justify-center items-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-100 border-t-[#ec5b13]"></div>
                </div>
            ) : filteredTargets.length === 0 ? (
                <div className="bg-white py-24 rounded-3xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center px-6">
                    <div className="size-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-6 text-slate-200">
                        <span className="material-symbols-outlined text-3xl">hub</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-1">No infra nodes detected</h3>
                    <p className="text-slate-500 text-sm max-w-sm mx-auto mb-8 font-medium">Provision your first target environment to begin profiling.</p>
                    {canEdit && (
                        <button onClick={openCreate} className="btn-primary">Provision Node</button>
                    )}
                </div>
            ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTargets.map(t => {
                        const conn = connectivity[t.id];
                        return (
                            <div key={t.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col group">
                                <div className="p-6 pb-4">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className={`size-12 rounded-xl flex items-center justify-center transition-colors ${t.environment === "PROD" ? "bg-orange-50 text-[#ec5b13]" :
                                                t.environment === "STAGING" ? "bg-blue-50 text-blue-500" : "bg-purple-50 text-purple-500"
                                            }`}>
                                            <span className="material-symbols-outlined text-3xl">
                                                {t.environment === "PROD" ? "rocket_launch" : t.environment === "STAGING" ? "biotech" : "code"}
                                            </span>
                                        </div>
                                        {conn && conn !== "loading" ? (
                                            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${conn.reachable ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                                                }`}>
                                                <span className={`w-2 h-2 rounded-full ${conn.reachable ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`}></span>
                                                {conn.reachable ? `${conn.status} OK` : "OFFLINE"}
                                            </div>
                                        ) : (
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.environment}</div>
                                        )}
                                    </div>
                                    <div className="mb-6">
                                        <h3 className="text-xl font-bold text-slate-900 group-hover:text-[#ec5b13] transition-colors">{t.name}</h3>
                                        <p className="text-sm text-slate-500 flex items-center gap-1 font-medium mt-1">
                                            <span className="material-symbols-outlined text-xs">public</span>
                                            {t.baseUrl.replace(/(^\w+:|^)\/\//, "")}
                                        </p>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between text-xs font-bold">
                                            <span className="text-slate-400 uppercase tracking-widest">Perf Latency</span>
                                            <span className="text-slate-900">{conn && conn !== "loading" && conn.reachable ? `${conn.latencyMs}ms` : "—"}</span>
                                        </div>
                                        {/* Sparkline simulation */}
                                        <div className="h-10 w-full flex items-end gap-1 px-1">
                                            {[40, 35, 50, 60, 45, 70, 65, 55, 80].map((h, idx) => (
                                                <div
                                                    key={idx}
                                                    className={`w-full rounded-t-sm transition-all duration-500 ${idx === 8 ? "bg-[#ec5b13]" : "bg-[#ec5b13]/20"}`}
                                                    style={{ height: `${h}%` }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-auto border-t border-slate-50 p-4 bg-slate-50/30 flex items-center justify-between">
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => testConnectivity(t.id)}
                                            className="size-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-[#ec5b13] hover:bg-white transition-all"
                                            title="Quick Diagnostics"
                                        >
                                            <span className={`material-symbols-outlined text-lg ${conn === "loading" ? "animate-spin" : ""}`}>
                                                {conn === "loading" ? "sync" : "health_and_safety"}
                                            </span>
                                        </button>
                                        {canEdit && (
                                            <button onClick={() => openEdit(t)} className="size-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-blue-500 hover:bg-white transition-all">
                                                <span className="material-symbols-outlined text-lg">edit</span>
                                            </button>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => openEdit(t)}
                                        className="bg-[#ec5b13] text-white text-[10px] font-bold px-4 py-2 rounded-lg hover:brightness-110 active:scale-95 transition-all shadow-sm"
                                    >
                                        Manage Node
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    {canEdit && (
                        <button
                            onClick={openCreate}
                            className="border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-8 text-slate-400 hover:text-[#ec5b13] hover:border-[#ec5b13] hover:bg-orange-50/30 transition-all group"
                        >
                            <span className="material-symbols-outlined text-4xl mb-3 group-hover:scale-110 transition-transform">add_circle</span>
                            <span className="font-bold">Add New Environment</span>
                            <span className="text-xs mt-1">Deploy to a new network node</span>
                        </button>
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global Identity</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Network Health</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Operations</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredTargets.map(t => {
                                const conn = connectivity[t.id];
                                return (
                                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="size-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                                                    <span className="material-symbols-outlined">dns</span>
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-slate-900">{t.name}</div>
                                                    <div className="text-xs font-medium text-slate-400 truncate max-w-[300px]">{t.baseUrl}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {conn === "loading" ? (
                                                <span className="text-[10px] font-bold text-[#ec5b13] uppercase tracking-widest animate-pulse">Telemetry Scan...</span>
                                            ) : conn ? (
                                                <div className="flex items-center gap-2">
                                                    <div className={`size-2 rounded-full ${conn.reachable ? "bg-emerald-500" : "bg-rose-500"}`}></div>
                                                    <span className="text-xs font-bold text-slate-700">{conn.reachable ? `${conn.latencyMs}ms` : "Packet Loss"}</span>
                                                </div>
                                            ) : (
                                                <button onClick={() => testConnectivity(t.id)} className="text-[10px] font-bold text-slate-400 hover:text-[#ec5b13] uppercase tracking-[0.15em] transition-colors">Invoke Ping</button>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {canEdit && (
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => openEdit(t)} className="p-2 text-slate-400 hover:text-blue-500 transition-colors">
                                                        <span className="material-symbols-outlined text-lg">edit</span>
                                                    </button>
                                                    <button onClick={() => deleteTarget(t.id)} className="p-2 text-slate-400 hover:text-rose-600 transition-colors">
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
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-10 py-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                            <div className="flex flex-col">
                                <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight font-display">Provision Node</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Hardware & protocol allocation</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="size-12 flex items-center justify-center rounded-2xl bg-white text-slate-400 hover:text-slate-600 shadow-sm border border-slate-100 hover:border-slate-200 transition-all">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-10 overflow-y-auto space-y-8 no-scrollbar">
                            {error && (
                                <div className="p-5 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-[11px] font-bold animate-in flex items-center gap-3">
                                    <span className="material-symbols-outlined text-lg">warning</span>
                                    {error}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-2.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 ml-1 opacity-80">Resource Alias</label>
                                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} type="text" className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl px-6 text-sm font-bold focus:bg-white focus:border-[#ec5b13] transition-all outline-none shadow-sm" placeholder="e.g. Frankfurt Engine" />
                                </div>
                                <div className="space-y-2.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 ml-1 opacity-80">Environment Scope</label>
                                    <select value={form.environment} onChange={(e) => setForm({ ...form, environment: e.target.value })} className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl px-6 text-sm font-bold focus:bg-white focus:border-[#ec5b13] transition-all cursor-pointer shadow-sm outline-none">
                                        {ENV_OPTIONS.map((e) => <option key={e} value={e}>{e}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 ml-1 opacity-80">Network Entrypoint</label>
                                <div className="relative group/input">
                                    <input value={form.baseUrl} onChange={(e) => setForm({ ...form, baseUrl: e.target.value })} type="text" className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl pl-6 pr-14 text-sm font-mono font-bold focus:bg-white focus:border-[#ec5b13] transition-all outline-none shadow-sm" placeholder="https://api.internal.cloud" />
                                    <span className="material-symbols-outlined absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/input:text-[#ec5b13] transition-colors">lan</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-2.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 ml-1 opacity-80">Authorization Node</label>
                                    <select value={form.authType} onChange={(e) => setForm({ ...form, authType: e.target.value })} className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl px-6 text-sm font-bold focus:bg-white focus:border-[#ec5b13] transition-all cursor-pointer shadow-sm outline-none">
                                        {AUTH_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 ml-1 opacity-80">Time Threshold (ms)</label>
                                    <input value={form.timeoutMs} onChange={(e) => setForm({ ...form, timeoutMs: parseInt(e.target.value) })} type="number" className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl px-6 text-sm font-bold focus:bg-white focus:border-[#ec5b13] transition-all shadow-sm outline-none" />
                                </div>
                            </div>

                            <label className="flex items-center gap-5 p-6 bg-slate-50 rounded-[2rem] border border-slate-100 cursor-pointer hover:bg-white hover:border-[#ec5b13]/40 transition-all group shadow-sm">
                                <div className="relative">
                                    <input checked={form.tlsVerify} onChange={(e) => setForm({ ...form, tlsVerify: e.target.checked })} type="checkbox" className="size-6 rounded-lg border-slate-300 text-[#ec5b13] focus:ring-[#ec5b13]/20 transition-all cursor-pointer" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-slate-800 group-hover:text-slate-900 transition-colors">Strict TLS Verification</span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Validate certificates for all transport layers</span>
                                </div>
                                <span className="material-symbols-outlined ml-auto text-slate-300 group-hover:text-[#ec5b13] transition-colors">verified_user</span>
                            </label>
                        </div>

                        <div className="px-10 py-8 border-t border-slate-50 flex items-center justify-end gap-6 bg-slate-50/50">
                            <button onClick={() => setShowModal(false)} className="text-[11px] font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-[0.2em]">Discard</button>
                            <button onClick={save} disabled={saving} className="bg-slate-900 hover:bg-black text-white h-14 px-10 rounded-2xl text-[13px] font-bold shadow-xl shadow-slate-900/10 active:scale-95 disabled:opacity-50 transition-all min-w-[200px] flex items-center justify-center">
                                {saving ? <div className="size-6 border-[3px] border-white/20 border-t-white rounded-full animate-spin"></div> : (editTarget ? "Sync Architecture" : "Deploy Strategy")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
