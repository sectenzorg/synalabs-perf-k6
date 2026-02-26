"use client";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface User {
    id: string; email: string; username: string;
    role: string; isActive: boolean; createdAt: string;
}

const ROLES = ["ADMIN", "TESTER", "VIEWER"];

export default function UsersPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editUser, setEditUser] = useState<User | null>(null);
    const [form, setForm] = useState({ email: "", username: "", password: "", role: "VIEWER" });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (session && session.user.role !== "ADMIN") router.push("/dashboard");
    }, [session, router]);

    const load = useCallback(async () => {
        const res = await fetch("/api/users");
        if (res.ok) setUsers(await res.json());
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    function openCreate() {
        setEditUser(null);
        setForm({ email: "", username: "", password: "", role: "VIEWER" });
        setError(""); setShowModal(true);
    }

    function openEdit(u: User) {
        setEditUser(u);
        setForm({ email: u.email, username: u.username, password: "", role: u.role });
        setError(""); setShowModal(true);
    }

    async function save() {
        setError(""); setSaving(true);
        try {
            const url = editUser ? `/api/users/${editUser.id}` : "/api/users";
            const method = editUser ? "PUT" : "POST";
            const body: any = editUser
                ? { role: form.role, ...(form.password ? { password: form.password } : {}) }
                : { email: form.email, username: form.username, password: form.password, role: form.role };
            const res = await fetch(url, {
                method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
            });
            if (!res.ok) { const d = await res.json(); setError(d.error ?? "Failed"); return; }
            setShowModal(false); load();
        } finally { setSaving(false); }
    }

    async function toggleActive(u: User) {
        await fetch(`/api/users/${u.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isActive: !u.isActive }),
        });
        load();
    }

    return (
        <div className="space-y-8 sm:space-y-12 animate-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mb-1.5 font-display">Access Control</h1>
                    <p className="text-slate-500 text-sm sm:text-base font-medium">Manage members and calibrate role-based permissions.</p>
                </div>
                <button onClick={openCreate} className="btn-primary">
                    <span className="material-symbols-outlined text-lg">person_add</span>
                    Add Member
                </button>
            </div>

            <div className="grid gap-6 sm:gap-8">
                <div className="card-premium overflow-hidden border-none shadow-2xl">
                    {loading ? (
                        <div className="py-24 flex justify-center items-center">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                        </div>
                    ) : (
                        <>
                            {/* Mobile: Card layout */}
                            <div className="sm:hidden divide-y divide-slate-50 bg-white">
                                {users.map((u) => (
                                    <div key={u.id} className={`p-6 flex items-center gap-4 ${!u.isActive ? "opacity-60 grayscale" : ""}`}>
                                        <div className="size-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100 shrink-0">
                                            <span className="material-symbols-outlined text-2xl">account_circle</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-base font-bold text-slate-900 truncate tracking-tight">{u.username}</span>
                                                {u.id === session?.user.id && (
                                                    <span className="text-[9px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full uppercase shrink-0 tracking-widest">Me</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-widest ${u.role === 'ADMIN' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                                                    u.role === 'TESTER' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                        'bg-slate-50 text-slate-600 border-slate-100'
                                                    }`}>
                                                    {u.role}
                                                </span>
                                                <div className="flex items-center gap-1.5">
                                                    <div className={`size-1.5 rounded-full ${u.isActive ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" : "bg-red-500"}`} />
                                                    <span className="text-[10px] font-bold uppercase text-slate-400">{u.isActive ? "Active" : "Locked"}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <button onClick={() => openEdit(u)} className="p-2.5 text-slate-400 hover:text-primary active:scale-90 transition-all">
                                                <span className="material-symbols-outlined text-xl">settings_suggest</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Desktop: Table layout */}
                            <div className="hidden sm:block overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-900 text-white">
                                        <tr>
                                            <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.25em] opacity-60">Identity Domain</th>
                                            <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.25em] opacity-60 text-center">Authorization</th>
                                            <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.25em] opacity-60 text-center">Integrity</th>
                                            <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.25em] opacity-60 text-right">Operational Toolset</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {users.map((u) => (
                                            <tr key={u.id} className={`hover:bg-slate-50/80 transition-all group ${!u.isActive ? "opacity-60 grayscale" : ""}`}>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="size-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 border border-slate-100 shrink-0 group-hover:scale-110 group-hover:bg-primary/5 group-hover:text-primary transition-all duration-500">
                                                            <span className="material-symbols-outlined">account_circle</span>
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <div className="flex items-center gap-3 mb-1">
                                                                <span className="text-base font-extrabold text-slate-900 group-hover:text-primary transition-colors">{u.username}</span>
                                                                {u.id === session?.user.id && (
                                                                    <span className="text-[9px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/10 uppercase tracking-widest">Me</span>
                                                                )}
                                                            </div>
                                                            <span className="text-xs font-medium text-slate-400 italic truncate tracking-tight">{u.email}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-center">
                                                    <span className={`inline-block text-[10px] font-bold px-3 py-1 rounded-full border uppercase tracking-widest ${u.role === 'ADMIN' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                                                        u.role === 'TESTER' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                            'bg-slate-50 text-slate-600 border-slate-100'
                                                        }`}>
                                                        {u.role}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6 text-center">
                                                    <div className="flex items-center justify-center gap-2.5">
                                                        <div className={`size-2 rounded-full ${u.isActive ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)] animate-pulse" : "bg-red-500"}`} />
                                                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">{u.isActive ? "Active" : "Locked"}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                                        <button onClick={() => openEdit(u)} className="btn-premium px-3 py-1.5 text-[10px] hover:bg-primary/5">
                                                            Configure
                                                            <span className="material-symbols-outlined text-sm">settings_suggest</span>
                                                        </button>
                                                        {u.id !== session?.user.id && (
                                                            <button
                                                                onClick={() => toggleActive(u)}
                                                                className={`p-2 rounded-xl transition-all active:scale-90 ${u.isActive ? "text-slate-400 hover:text-red-500 hover:bg-red-50" : "text-emerald-500 hover:bg-emerald-50"}`}
                                                            >
                                                                <span className="material-symbols-outlined text-xl">{u.isActive ? "person_off" : "person_check"}</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>

                {/* Permissions Matrix */}
                <div className="card-premium p-8 sm:p-10 bg-slate-900 border-none shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                        <span className="material-symbols-outlined text-9xl">encrypted</span>
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="size-1 rounded-full bg-primary" />
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.25em]">Global Permission Schema</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left min-w-[500px]">
                                <thead className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.3em] border-b border-white/5">
                                    <tr>
                                        <th className="py-4 font-bold text-slate-500">Security Clearance Level</th>
                                        <th className="py-4 text-center w-28 text-white">Administrator</th>
                                        <th className="py-4 text-center w-28 text-blue-400">Tactical Tester</th>
                                        <th className="py-4 text-center w-28 text-slate-400">Analytic Viewer</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {[
                                        { p: "Account & Clearance Management", a: true, t: false, v: false },
                                        { p: "Infrastructure Target Provisioning", a: true, t: true, v: false },
                                        { p: "Stress Profile Calibration (Plans)", a: true, t: true, v: false },
                                        { p: "Execution Trigger & Control", a: true, t: true, v: false },
                                        { p: "Telemetry & Delta Analysis", a: true, t: true, v: true },
                                    ].map((row, i) => (
                                        <tr key={i} className="text-sm font-medium text-slate-300 hover:bg-white/5 transition-colors group/row">
                                            <td className="py-5 flex items-center gap-3">
                                                <div className="size-1 bg-slate-700 rounded-full group-hover/row:scale-150 transition-all font-display" />
                                                {row.p}
                                            </td>
                                            <td className="py-5 text-center"><span className={`material-symbols-outlined text-xl ${row.a ? 'text-emerald-500' : 'text-slate-800'}`}>check_circle</span></td>
                                            <td className="py-5 text-center"><span className={`material-symbols-outlined text-xl ${row.t ? 'text-blue-500' : 'text-slate-800'}`}>check_circle</span></td>
                                            <td className="py-5 text-center"><span className={`material-symbols-outlined text-xl ${row.v ? 'text-slate-400' : 'text-slate-800'}`}>check_circle</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal - Modernized */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 transition-all animate-fade-in">
                    <div className="bg-white rounded-t-3xl sm:rounded-[2rem] shadow-2xl w-full sm:max-w-md overflow-hidden flex flex-col max-h-[90vh] animate-in border border-white relative">
                        <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between shrink-0">
                            <div className="space-y-1">
                                <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">{editUser ? "Reconfigure" : "Provision"} Member</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{editUser ? "Update credentials" : "New clearance grant"}</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="size-10 flex items-center justify-center rounded-2xl bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all active:scale-90">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                            {error && (
                                <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-100 flex items-center gap-3">
                                    <span className="material-symbols-outlined text-lg">warning</span>
                                    {error}
                                </div>
                            )}

                            {!editUser && (
                                <div className="space-y-5">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block px-1">Identity Handle</label>
                                        <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} type="text" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold shadow-sm" placeholder="e.g. j.keller" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block px-1">Network Email</label>
                                        <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold shadow-sm" placeholder="user@synalabs.id" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block px-1">Initial Cipher</label>
                                        <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} type="password" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold shadow-sm" placeholder="••••••••" />
                                    </div>
                                </div>
                            )}

                            {editUser && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block px-1">Recalibrate Cipher</label>
                                    <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} type="password" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold shadow-sm" placeholder="Leave blank to maintain current" />
                                    <p className="text-[10px] text-slate-400 font-medium px-1 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[12px]">info</span>
                                        Maintain existing cipher if field remains empty.
                                    </p>
                                </div>
                            )}

                            <div className="space-y-3 pt-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block px-1">Security Domain</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {ROLES.map(role => (
                                        <button
                                            key={role}
                                            onClick={() => setForm({ ...form, role })}
                                            className={`p-3 rounded-2xl border text-[9px] font-extrabold uppercase tracking-widest transition-all duration-300 ${form.role === role
                                                ? 'bg-primary text-white border-primary shadow-xl shadow-primary/20 scale-105'
                                                : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                                }`}
                                        >
                                            {role}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="px-8 py-6 border-t border-slate-50 flex items-center justify-end gap-3 bg-slate-50/50 shrink-0">
                            <button onClick={() => setShowModal(false)} className="px-6 py-3 text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors uppercase tracking-widest">Abort</button>
                            <button onClick={save} disabled={saving} className="btn-primary min-w-[140px] px-8">
                                {saving ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : editUser ? "Apply" : "Authorize"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
