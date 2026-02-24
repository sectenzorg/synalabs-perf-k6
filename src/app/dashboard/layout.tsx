"use client";
import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";

const NAV = [
    {
        section: "Overview",
        items: [
            { href: "/dashboard", label: "Dashboard", icon: "📊" },
        ],
    },
    {
        section: "Testing",
        items: [
            { href: "/dashboard/targets", label: "Targets", icon: "🎯" },
            { href: "/dashboard/plans", label: "Test Plans", icon: "📋" },
            { href: "/dashboard/runs", label: "Run History", icon: "🚀" },
            { href: "/dashboard/compare", label: "Compare Runs", icon: "⚖️" },
        ],
    },
    {
        section: "Admin",
        items: [
            { href: "/dashboard/users", label: "Users", icon: "👥" },
            { href: "/dashboard/settings", label: "Settings", icon: "⚙️" },
        ],
    },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (status === "unauthenticated") router.push("/login");
    }, [status, router]);

    if (status === "loading") {
        return (
            <div className="flex-center" style={{ minHeight: "100vh" }}>
                <div className="spinner" style={{ width: 40, height: 40 }} />
            </div>
        );
    }

    if (!session) return null;

    const role = session.user.role as string;
    const initials = (session.user.name ?? "U").slice(0, 2).toUpperCase();

    return (
        <div className="app-layout">
            {/* Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <div className="logo-text">⚡ Synalabs Perf</div>
                    <div className="logo-sub">Stress Test Dashboard</div>
                </div>

                <nav className="sidebar-nav">
                    {NAV.map((section) => {
                        // Hide admin section for non-admins
                        if (section.section === "Admin" && role !== "ADMIN") return null;
                        return (
                            <div key={section.section}>
                                <div className="nav-section-label">{section.section}</div>
                                {section.items.map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`nav-item ${pathname === item.href ? "active" : ""}`}
                                    >
                                        <span>{item.icon}</span>
                                        {item.label}
                                    </Link>
                                ))}
                            </div>
                        );
                    })}
                </nav>

                <div className="sidebar-footer">
                    <div className="user-info" onClick={() => signOut({ callbackUrl: "/login" })}>
                        <div className="user-avatar">{initials}</div>
                        <div className="user-meta">
                            <div className="user-name">{session.user.name}</div>
                            <div className="user-role">{role} · Sign out</div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main */}
            <main className="main-content">
                <div className="topbar">
                    <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                        {pathname.split("/").filter(Boolean).join(" / ")}
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`badge badge-${role.toLowerCase()}`}>{role}</span>
                        <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                            {session.user.email}
                        </span>
                    </div>
                </div>
                <div className="page-content">{children}</div>
            </main>
        </div>
    );
}
