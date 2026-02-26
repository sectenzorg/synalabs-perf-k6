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
        <div className="space-y-6 sm:space-y-8 animate-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mb-1">Access Control</h1>
                    <p className="text-slate-500 text-sm font-medium">Manage organization members and role-based permissions.</p>
                </div>
                <button onClick={openCreate} className="btn-primary text-xs">
                    <span className="material-symbols-outlined text-lg">person_add</span>
                    Add Member
                </button>
            </div>

            <div className="grid gap-4 sm:gap-6">
                <div className="card-premium overflow-hidden">
                    {loading ? (
                        <div className="p-16 sm:p-20 flex justify-center items-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : (
                        <>
                            {/* Mobile: Card layout */}
                            <div className="sm:hidden divide-y divide-slate-100">
                                {users.map((u) => (
                                    <div key={u.id} className={`p-4 flex items-center gap-3 ${!u.isActive ? "opacity-60" : ""}`}>
                                        <div className="size-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200 shrink-0">
                                            <span className="material-symbols-outlined text-xl">account_circle</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-sm font-semibold text-slate-900 truncate">{u.username}</span>
                                                {u.id === session?.user.id && (
                                                    <span className="text-[9px] font-bold bg-primary/10 text-primary px-1 py-0.5 rounded uppercase shrink-0">Me</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className={`text-[10px] font-bold px-1 py-0.5 rounded border uppercase ${u.role === 'ADMIN' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                                                    u.role === 'TESTER' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                        'bg-slate-50 text-slate-600 border-slate-200'
                                                    }`}>
                                                    {u.role}
                                                </span>
                                                <div className={`size-1.5 rounded-full ${u.isActive ? "bg-green-500" : "bg-red-500"}`} />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <button onClick={() => openEdit(u)} className="p-1.5 text-slate-400 hover:text-primary rounded-lg">
                                                <span className="material-symbols-outlined text-lg">settings_suggest</span>
                                            </button>
                                            {u.id !== session?.user.id && (
                                                <button
                                                    onClick={() => toggleActive(u)}
                                                    className={`p-1.5 rounded-lg ${u.isActive ? "text-slate-400 hover:text-red-500" : "text-green-500"}`}
                                                >
                                                    <span className="material-symbols-outlined text-lg">{u.isActive ? "person_off" : "person_check"}</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Desktop: Table layout */}
                            <div className="hidden sm:block overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50/50 text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                        <tr>
                                            <th className="px-5 py-3.5">Identity</th>
                                            <th className="px-5 py-3.5">Access Level</th>
                                            <th className="px-5 py-3.5">Status</th>
                                            <th className="px-5 py-3.5 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {users.map((u) => (
                                            <tr key={u.id} className={`hover:bg-slate-50/50 transition-colors group ${!u.isActive ? "opacity-60" : ""}`}>
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="size-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200 shrink-0">
                                                            <span className="material-symbols-outlined">account_circle</span>
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-bold text-slate-900">{u.username}</span>
                                                                {u.id === session?.user.id && (
                                                                    <span className="text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/10 uppercase">Me</span>
                                                                )}
                                                            </div>
                                                            <span className="text-[11px] font-medium text-slate-400 truncate">{u.email}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${u.role === 'ADMIN' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                                                        u.role === 'TESTER' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                            'bg-slate-50 text-slate-600 border-slate-200'
                                                        }`}>
                                                        {u.role}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`size-2 rounded-full ${u.isActive ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" : "bg-red-500"}`} />
                                                        <span className="text-xs font-bold text-slate-700 uppercase">{u.isActive ? "Active" : "Revoked"}</span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                        </>
                    )}
                </div>

                {/* Permissions Matrix */}
                <div className="card-premium p-5 sm:p-6">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-5">Permission Matrix</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[400px]">
                            <thead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                <tr>
                                    <th className="py-2">Scope</th>
                                    <th className="py-2 text-center w-20">Admin</th>
                                    <th className="py-2 text-center w-20">Tester</th>
                                    <th className="py-2 text-center w-20">Viewer</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {[
                                    { p: "User Management", a: true, t: false, v: false },
                                    { p: "Create/Edit Plans", a: true, t: true, v: false },
                                    { p: "Execute Tests", a: true, t: true, v: false },
                                    { p: "View Results", a: true, t: true, v: true },
                                ].map((row, i) => (
                                    <tr key={i} className="text-xs font-medium text-slate-600">
                                        <td className="py-3.5">{row.p}</td>
                                        <td className="py-3.5 text-center"><span className={`material-symbols-outlined text-lg ${row.a ? 'text-green-500' : 'text-slate-200'}`}>check_circle</span></td>
                                        <td className="py-3.5 text-center"><span className={`material-symbols-outlined text-lg ${row.t ? 'text-green-500' : 'text-slate-200'}`}>check_circle</span></td>
                                        <td className="py-3.5 text-center"><span className={`material-symbols-outlined text-lg ${row.v ? 'text-green-500' : 'text-slate-200'}`}>check_circle</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-premium w-full sm:max-w-md overflow-hidden flex flex-col max-h-[90vh] animate-in border border-white">
                        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                            <h3 className="font-bold text-slate-900">{editUser ? "Edit" : "Add"} Member</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5">
                            {error && (
                                <div className="p-3.5 bg-red-50 text-red-600 rounded-xl text-xs font-bold border border-red-100">{error}</div>
                            )}

                            {!editUser && (
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Username</label>
                                        <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold" placeholder="j.doe" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email</label>
                                        <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold" placeholder="jane@synalabs.io" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Password</label>
                                        <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} type="password" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold" placeholder="••••••••" />
                                    </div>
                                </div>
                            )}

                            {editUser && (
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">New Password</label>
                                    <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} type="password" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold" placeholder="Leave empty to keep current" />
                                    <p className="text-[10px] text-slate-400 font-medium pt-0.5">Leave empty to maintain existing password</p>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Role</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {ROLES.map(role => (
                                        <button
                                            key={role}
                                            onClick={() => setForm({ ...form, role })}
                                            className={`p-2.5 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all ${form.role === role ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-105' : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300'
                                                }`}
                                        >
                                            {role}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="px-5 sm:px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/30 shrink-0">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors">Cancel</button>
                            <button onClick={save} disabled={saving} className="btn-primary min-w-[120px] text-xs">
                                {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : editUser ? "Update" : "Create"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
