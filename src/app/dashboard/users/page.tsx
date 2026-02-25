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
        <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden text-slate-900 dark:text-slate-100 font-display">
            {/* Header */}
            <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-8 shrink-0">
                <div className="flex flex-col justify-center">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">group</span>
                        User Management
                    </h2>
                    <p className="text-xs text-slate-500">RBAC — Admin, Tester, Viewer roles</p>
                </div>
                <div>
                    <button id="add-user-btn" onClick={openCreate} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20">
                        <span className="material-symbols-outlined text-[18px]">person_add</span>
                        Add User
                    </button>
                </div>
            </header>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8 bg-slate-50/50 dark:bg-transparent">

                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                    {loading ? (
                        <div className="flex items-center justify-center p-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto min-h-0">
                            <table className="w-full text-left border-collapse whitespace-nowrap">
                                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 backdrop-blur-sm">
                                    <tr>
                                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Username</th>
                                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th>
                                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider w-1">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                    {users.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center text-slate-500 text-sm">
                                                No users found.
                                            </td>
                                        </tr>
                                    ) : users.map((u) => (
                                        <tr key={u.id} className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors ${!u.isActive ? "opacity-60 bg-slate-50/50 dark:bg-slate-900/50" : ""}`}>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 border border-slate-200 dark:border-slate-700">
                                                        <span className="material-symbols-outlined text-[16px]">person</span>
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                                                            {u.username}
                                                            {u.id === session?.user.id && (
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">You</span>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-slate-500 flex items-center gap-1">
                                                            <span className="material-symbols-outlined text-[12px]">schedule</span>
                                                            {new Date(u.createdAt).toLocaleDateString()}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                                {u.email}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800/50' :
                                                        u.role === 'TESTER' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50' :
                                                            'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                                                    }`}>
                                                    <span className="material-symbols-outlined text-[12px]">
                                                        {u.role === 'ADMIN' ? 'admin_panel_settings' : u.role === 'TESTER' ? 'science' : 'visibility'}
                                                    </span>
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${u.isActive ? "bg-green-500" : "bg-red-500"}`}></div>
                                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                                        {u.isActive ? "Active" : "Disabled"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => openEdit(u)} className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors" title="Edit User">
                                                        <span className="material-symbols-outlined text-[18px]">edit</span>
                                                    </button>
                                                    {u.id !== session?.user.id && (
                                                        <button
                                                            onClick={() => toggleActive(u)}
                                                            className={`p-1.5 rounded transition-colors ${u.isActive ? "text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" : "text-slate-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20"}`}
                                                            title={u.isActive ? "Disable User" : "Enable User"}
                                                        >
                                                            <span className="material-symbols-outlined text-[18px]">{u.isActive ? "block" : "check_circle"}</span>
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

                {/* Permissions Reference */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                        <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm">
                            <span className="material-symbols-outlined text-slate-400 text-[18px]">verified_user</span>
                            Role Permissions Reference
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse whitespace-nowrap text-sm">
                            <thead className="bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800">
                                <tr>
                                    <th className="px-6 py-3 font-bold text-slate-700 dark:text-slate-300">Permission Category</th>
                                    <th className="px-6 py-3 font-bold text-center text-slate-700 dark:text-slate-300">Admin</th>
                                    <th className="px-6 py-3 font-bold text-center text-slate-700 dark:text-slate-300">Tester</th>
                                    <th className="px-6 py-3 font-bold text-center text-slate-700 dark:text-slate-300">Viewer</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                {[
                                    ["Manage Users & Roles", true, false, false, "admin_panel_settings"],
                                    ["Create & Manage Target APIs", true, true, false, "api"],
                                    ["Create & Edit Test Plans", true, true, false, "description"],
                                    ["Launch & Cancel Runs", true, true, false, "play_circle"],
                                    ["View Run Results & Logs", true, true, true, "monitoring"],
                                    ["Compare Test Runs", true, true, true, "compare_arrows"],
                                    ["System Integrity Settings", true, false, false, "settings"],
                                ].map(([perm, admin, tester, viewer, icon]) => (
                                    <tr key={perm as string} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                                        <td className="px-6 py-3 flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                            <span className="material-symbols-outlined text-[16px] text-slate-400">{icon as string}</span>
                                            {perm as string}
                                        </td>
                                        <td className="px-6 py-3 text-center">
                                            <span className={`material-symbols-outlined text-[18px] ${admin ? "text-green-500" : "text-slate-300 dark:text-slate-700"}`}>{admin ? "check_circle" : "cancel"}</span>
                                        </td>
                                        <td className="px-6 py-3 text-center">
                                            <span className={`material-symbols-outlined text-[18px] ${tester ? "text-green-500" : "text-slate-300 dark:text-slate-700"}`}>{tester ? "check_circle" : "cancel"}</span>
                                        </td>
                                        <td className="px-6 py-3 text-center">
                                            <span className={`material-symbols-outlined text-[18px] ${viewer ? "text-green-500" : "text-slate-300 dark:text-slate-700"}`}>{viewer ? "check_circle" : "cancel"}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal Overlay */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setShowModal(false)}>

                    {/* Modal Dialog */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>

                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30 shrink-0">
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">{editUser ? "manage_accounts" : "person_add"}</span>
                                {editUser ? "Edit User" : "Add New User"}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
                            {error && (
                                <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400 text-sm shadow-sm mb-4">
                                    <span className="material-symbols-outlined text-[18px]">error</span>
                                    {error}
                                </div>
                            )}

                            {!editUser && (
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <div className="flex-1 space-y-1.5 text-left">
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">Username <span className="text-red-500">*</span></label>
                                        <input
                                            id="user-username"
                                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-slate-400"
                                            value={form.username}
                                            onChange={(e) => setForm({ ...form, username: e.target.value })}
                                            placeholder="johndoe"
                                        />
                                    </div>
                                    <div className="flex-1 space-y-1.5 text-left">
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">Email <span className="text-red-500">*</span></label>
                                        <input
                                            id="user-email"
                                            type="email"
                                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-slate-400"
                                            value={form.email}
                                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                                            placeholder="name@synalabs.id"
                                        />
                                    </div>
                                </div>
                            )}

                            {!editUser && (
                                <div className="space-y-1.5 text-left">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">Password <span className="text-red-500">*</span></label>
                                    <input
                                        id="user-password"
                                        type="password"
                                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-slate-400"
                                        value={form.password}
                                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                                        placeholder="Min 8 characters"
                                    />
                                </div>
                            )}

                            {editUser && (
                                <div className="space-y-1.5 text-left">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">New Password</label>
                                    <input
                                        id="user-newpass"
                                        type="password"
                                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-slate-400"
                                        value={form.password}
                                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                                        placeholder="Leave blank to keep current"
                                    />
                                    <p className="text-[10px] text-slate-500 mt-1">Leave blank to keep existing credentials.</p>
                                </div>
                            )}

                            <div className="space-y-1.5 text-left">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">Role Assignment</label>
                                <div className="relative">
                                    <select
                                        id="user-role"
                                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none appearance-none transition-all font-mono"
                                        value={form.role}
                                        onChange={(e) => setForm({ ...form, role: e.target.value })}
                                    >
                                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                                </div>
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded flex items-start gap-2 mt-2">
                                    <span className="material-symbols-outlined text-blue-500 text-[16px] mt-0.5">info</span>
                                    <p className="text-[11px] text-blue-800 dark:text-blue-300 leading-tight">
                                        Test access is restricted based on role. Admins manage users, Testers execute load profiles, Viewers are constrained to analysis tools.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-end gap-3 shrink-0">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                id="save-user-btn"
                                onClick={save}
                                disabled={saving}
                                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-sm shadow-primary/20"
                            >
                                {saving ? (
                                    <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> Saving...</>
                                ) : (
                                    <><span className="material-symbols-outlined text-[18px]">save</span> {editUser ? "Update User" : "Create User"}</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
