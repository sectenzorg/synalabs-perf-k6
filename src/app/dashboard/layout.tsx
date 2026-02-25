"use client";
import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";

const NAV = [
    {
        section: "Overview",
        items: [
            { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
        ],
    },
    {
        section: "Testing",
        items: [
            { href: "/dashboard/targets", label: "Targets", icon: "target" },
            { href: "/dashboard/plans", label: "Test Plans", icon: "assignment" },
            { href: "/dashboard/runs", label: "Run History", icon: "history" },
            { href: "/dashboard/compare", label: "Compare Runs", icon: "compare_arrows" },
        ],
    },
    {
        section: "Admin",
        items: [
            { href: "/dashboard/users", label: "Users", icon: "group" },
            { href: "/dashboard/settings", label: "Settings", icon: "settings" },
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
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!session) return null;

    const role = session.user.role as string;
    const initials = (session.user.name ?? "U").slice(0, 2).toUpperCase();

    return (
        <div className="flex h-screen overflow-hidden text-slate-900 dark:text-slate-100 font-display">
            {/* Sidebar */}
            <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col h-full shrink-0">
                <div className="p-6">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-white">
                            <span className="material-symbols-outlined">bolt</span>
                        </div>
                        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-none">Synalabs Perf K6</h1>
                    </div>
                    <p className="text-xs text-slate-500 font-medium px-1 uppercase tracking-wider">Performance Monitoring</p>
                </div>

                <nav className="flex-1 px-4 space-y-6 overflow-y-auto custom-scrollbar">
                    {NAV.map((section) => {
                        if (section.section === "Admin" && role !== "ADMIN") return null;

                        return (
                            <div key={section.section}>
                                {section.section !== "Overview" && (
                                    <p className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 mt-4">{section.section}</p>
                                )}
                                <div className="space-y-1">
                                    {section.items.map((item) => {
                                        const isActive = pathname === item.href;
                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isActive
                                                        ? "bg-primary/10 text-primary"
                                                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                                    }`}
                                            >
                                                <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
                                                <p className="text-sm font-medium">{item.label}</p>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-slate-200 dark:border-slate-800">
                    <div
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                        onClick={() => signOut({ callbackUrl: "/login" })}
                    >
                        <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden text-primary font-bold">
                            {initials}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-semibold truncate text-slate-900 dark:text-white">{session.user.name}</p>
                            <p className="text-xs text-slate-500 truncate">{role} Account · Sign Out</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background-light dark:bg-background-dark">
                {children}
            </main>
        </div>
    );
}
