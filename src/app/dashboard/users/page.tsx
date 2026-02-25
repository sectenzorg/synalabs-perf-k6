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
        <div className="space-y-8 animate-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 mb-2">Access Control</h1>
                    <p className="text-slate-500 font-medium">Manage organization members and role-based permissions.</p>
                </div>
                <button onClick={openCreate} className="btn-primary">
                    <span className="material-symbols-outlined">person_add</span>
                    Onboard Member
                </button>
            </div>

            <div className="grid gap-8">
                <div className="card-premium overflow-hidden">
                    {loading ? (
                        <div className="p-20 flex justify-center items-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4">Identity</th>
                                        <th className="px-6 py-4">Access Level</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {users.map((u) => (
                                        <tr key={u.id} className={`hover:bg-slate-50/50 transition-colors group ${!u.isActive ? "opacity-60 grayscale-[0.5]" : ""}`}>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="size-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                                                        <span className="material-symbols-outlined">account_circle</span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-black text-slate-900">{u.username}</span>
                                                            {u.id === session?.user.id && (
                                                                <span className="text-[10px] font-black bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/10 uppercase">Me</span>
                                                            )}
                                                        </div>
                                                        <span className="text-[11px] font-bold text-slate-400">{u.email}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border uppercase ${u.role === 'ADMIN' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                                                        u.role === 'TESTER' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                            'bg-slate-50 text-slate-600 border-slate-200'
                                                    }`}>
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2">
                                                    <div className={`size-2 rounded-full ${u.isActive ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" : "bg-red-500"}`} />
                                                    <span className="text-xs font-black text-slate-700 uppercase">{u.isActive ? "Authorized" : "Revoked"}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => openEdit(u)} className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg">
                                                        <span className="material-symbols-outlined text-lg">settings_suggest</span>
                                                    </button>
                                                    {u.id !== session?.user.id && (
                                                        <button
                                                            onClick={() => toggleActive(u)}
                                                            className={`p-2 rounded-lg transition-colors ${u.isActive ? "text-slate-400 hover:text-red-500 hover:bg-red-50" : "text-green-500 hover:bg-green-50"}`}
                                                        >
                                                            <span className="material-symbols-outlined text-lg">{u.isActive ? "person_off" : "person_check"}</span>
                                                        </button>
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

                {/* Permissions Matrix */}
                <div className="card-premium p-6">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Permission Hierarchy Matrix</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                <tr>
                                    <th className="py-2">Policy Scope</th>
                                    <th className="py-2 text-center w-24">Admin</th>
                                    <th className="py-2 text-center w-24">Tester</th>
                                    <th className="py-2 text-center w-24">Viewer</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {[
                                    { p: "Cluster Management", a: true, t: false, v: false },
                                    { p: "Strategy Definition", a: true, t: true, v: false },
                                    { p: "Execution Trigger", a: true, t: true, v: false },
                                    { p: "Analytical Insights", a: true, t: true, v: true },
                                ].map((row, i) => (
                                    <tr key={i} className="text-xs font-bold text-slate-600">
                                        <td className="py-4">{row.p}</td>
                                        <td className="py-4 text-center"><span className={`material-symbols-outlined text-lg overflow-hidden ${row.a ? 'text-green-500' : 'text-slate-100'}`}>check_circle</span></td>
                                        <td className="py-4 text-center"><span className={`material-symbols-outlined text-lg overflow-hidden ${row.t ? 'text-green-500' : 'text-slate-100'}`}>check_circle</span></td>
                                        <td className="py-4 text-center"><span className={`material-symbols-outlined text-lg overflow-hidden ${row.v ? 'text-green-500' : 'text-slate-100'}`}>check_circle</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-premium w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] animate-in border border-white">
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="font-black text-slate-900 uppercase tracking-tight">{editUser ? "Modify" : "Enlist"} Member</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                            {error && (
                                <div className="p-4 bg-red-50 text-red-600 rounded-xl text-xs font-black uppercase tracking-widest border border-red-100">{error}</div>
                            )}

                            {!editUser && (
                                <div className="space-y-5">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Display Handle</label>
                                        <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold" placeholder="j.doe" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Identity</label>
                                        <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold" placeholder="jane@synalabs.io" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Initial Credentials</label>
                                        <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} type="password" title="password required" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold" placeholder="********" />
                                    </div>
                                </div>
                            )}

                            {editUser && (
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rotate Credentials</label>
                                    <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} type="password" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold" placeholder="New Password" />
                                    <p className="text-[10px] text-slate-400 font-bold uppercase py-1">Leave empty to maintain existing</p>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Policy Assignment</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {ROLES.map(role => (
                                        <button
                                            key={role}
                                            onClick={() => setForm({ ...form, role })}
                                            className={`p-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${form.role === role ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-105' : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300'
                                                }`}
                                        >
                                            {role}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-5 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/30">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-xs font-black uppercase text-slate-400 hover:text-slate-600 transition-colors">Abort</button>
                            <button onClick={save} disabled={saving} className="btn-primary min-w-[140px]">
                                {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : editUser ? "Update Identity" : "Commit Member"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
