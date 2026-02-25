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
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">User Management</h1>
                    <p className="page-subtitle">RBAC — Admin, Tester, Viewer roles</p>
                </div>
                <button id="add-user-btn" className="btn btn-primary" onClick={openCreate}>+ Add User</button>
            </div>

            <div className="card">
                {loading ? (
                    <div className="flex-center" style={{ padding: "3rem" }}>
                        <div className="spinner" style={{ width: 36, height: 36 }} />
                    </div>
                ) : (
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Username</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                    <th>Created</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((u) => (
                                    <tr key={u.id} style={{ opacity: u.isActive ? 1 : 0.5 }}>
                                        <td style={{ fontWeight: 600 }}>
                                            {u.username}
                                            {u.id === session?.user.id && (
                                                <span className="badge badge-dev" style={{ marginLeft: 8 }}>You</span>
                                            )}
                                        </td>
                                        <td className="text-secondary">{u.email}</td>
                                        <td><span className={`badge badge-${u.role.toLowerCase()}`}>{u.role}</span></td>
                                        <td>
                                            <span className={`badge ${u.isActive ? "badge-done" : "badge-failed"}`}>
                                                {u.isActive ? "Active" : "Disabled"}
                                            </span>
                                        </td>
                                        <td className="text-muted text-sm">{new Date(u.createdAt).toLocaleDateString()}</td>
                                        <td>
                                            <div className="flex gap-2">
                                                <button className="btn btn-secondary btn-sm" onClick={() => openEdit(u)}>Edit</button>
                                                {u.id !== session?.user.id && (
                                                    <button
                                                        className={`btn btn-sm ${u.isActive ? "btn-danger" : "btn-success"}`}
                                                        onClick={() => toggleActive(u)}
                                                    >
                                                        {u.isActive ? "Disable" : "Enable"}
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
            <div className="card" style={{ marginTop: "1.5rem" }}>
                <div className="card-header"><h3 className="card-title">Role Permissions Reference</h3></div>
                <div className="table-wrapper">
                    <table>
                        <thead>
                            <tr><th>Permission</th><th>Admin</th><th>Tester</th><th>Viewer</th></tr>
                        </thead>
                        <tbody>
                            {[
                                ["Manage Users", "✅", "❌", "❌"],
                                ["CRUD Targets", "✅", "✅", "❌"],
                                ["CRUD Test Plans", "✅", "✅", "❌"],
                                ["Run Tests", "✅", "✅", "❌"],
                                ["View Results & Reports", "✅", "✅", "✅"],
                                ["Compare Runs", "✅", "✅", "✅"],
                                ["Global Settings", "✅", "❌", "❌"],
                            ].map(([perm, ...vals]) => (
                                <tr key={perm}>
                                    <td style={{ fontWeight: 500 }}>{perm}</td>
                                    {vals.map((v, i) => <td key={i} style={{ textAlign: "center" }}>{v}</td>)}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{editUser ? "Edit User" : "Add User"}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        {error && <div className="alert alert-error">{error}</div>}

                        {!editUser && (
                            <>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Username <span className="required">*</span></label>
                                        <input id="user-username" className="form-input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="johndoe" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Email <span className="required">*</span></label>
                                        <input id="user-email" className="form-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@synalabs.id" />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Password <span className="required">*</span></label>
                                    <input id="user-password" className="form-input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="min 8 characters" />
                                </div>
                            </>
                        )}

                        {editUser && (
                            <div className="form-group">
                                <label className="form-label">New Password (leave blank to keep)</label>
                                <input id="user-newpass" className="form-input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label">Role</label>
                            <select id="user-role" className="form-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                                {ROLES.map((r) => <option key={r}>{r}</option>)}
                            </select>
                        </div>

                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button id="save-user-btn" className="btn btn-primary" onClick={save} disabled={saving}>
                                {saving ? "Saving..." : editUser ? "Update User" : "Create User"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
