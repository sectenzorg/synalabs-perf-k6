"use client";
import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

const NAV = [
    {
        section: "Overview",
        items: [
            { href: "/dashboard", label: "Dashboard", icon: "grid_view" },
        ],
    },
    {
        section: "Testing",
        items: [
            { href: "/dashboard/targets", label: "Targets", icon: "hub" },
            { href: "/dashboard/plans", label: "Test Plans", icon: "description" },
            { href: "/dashboard/runs", label: "Run History", icon: "history" },
            { href: "/dashboard/compare", label: "Compare Runs", icon: "compare_arrows" },
        ],
    },
    {
        section: "Admin",
        items: [
            { href: "/dashboard/users", label: "Users", icon: "manage_accounts" },
            { href: "/dashboard/settings", label: "Settings", icon: "settings_suggest" },
        ],
    },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        if (status === "unauthenticated") router.push("/login");
    }, [status, router]);

    // Close sidebar on mobile when route changes
    useEffect(() => {
        setIsSidebarOpen(false);
    }, [pathname]);

    // Prevent body scroll when sidebar is open on mobile
    useEffect(() => {
        if (isSidebarOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => { document.body.style.overflow = ""; };
    }, [isSidebarOpen]);

    if (status === "loading") {
        return (
            <div className="flex items-center justify-center min-h-[100dvh] bg-slate-50">
                <div className="relative">
                    <div className="size-14 rounded-full border-4 border-slate-200"></div>
                    <div className="absolute top-0 left-0 size-14 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                </div>
            </div>
        );
    }

    if (!session) return null;

    const role = session.user.role as string;
    const initials = (session.user.name ?? "U").slice(0, 2).toUpperCase();

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/10 backdrop-blur-sm z-40 lg:hidden transition-all"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 w-72 bg-white/80 backdrop-blur-xl border-r border-slate-200/60
                flex flex-col h-full shrink-0 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0
                ${isSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}
            `}>
                <div className="px-8 py-10">
                    <Link href="/dashboard" className="flex items-center gap-3.5 group">
                        <div className="size-10 bg-sky-500 rounded-xl flex items-center justify-center text-white shadow-xl shadow-sky-500/20 group-hover:scale-105 transition-transform">
                            <span className="material-symbols-outlined text-2xl">bolt</span>
                        </div>
                        <div>
                            <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-none">Synalabs</h1>
                            <p className="text-[10px] text-sky-500 font-bold uppercase tracking-widest mt-1">Performance</p>
                        </div>
                    </Link>
                </div>

                <nav className="flex-1 px-4 space-y-8 overflow-y-auto no-scrollbar pb-10">
                    {NAV.map((section) => {
                        if (section.section === "Admin" && role !== "ADMIN") return null;

                        return (
                            <div key={section.section} className="space-y-1.5">
                                <p className="px-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest opacity-60">{section.section}</p>
                                <div className="space-y-0.5">
                                    {section.items.map((item) => {
                                        const isActive = pathname === item.href;
                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                className={`flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                                                    ? "bg-slate-900 text-white shadow-xl shadow-slate-900/10"
                                                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                                    }`}
                                            >
                                                <span className={`material-symbols-outlined text-[20px] ${isActive ? "text-white" : "text-slate-400 group-hover:text-slate-900"}`}>
                                                    {item.icon}
                                                </span>
                                                <p className="text-sm font-bold tracking-tight">{item.label}</p>
                                                {isActive && (
                                                    <div className="ml-auto size-1 rounded-full bg-sky-400" />
                                                )}
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </nav>

                {/* User Profile */}
                <div className="p-6 border-t border-slate-100/60 bg-white/50">
                    <div className="flex items-center gap-4 py-1">
                        <div className="size-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-900 font-bold text-xs ring-4 ring-slate-50/50">
                            {initials}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-xs font-bold truncate text-slate-900">{session.user.name}</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest opacity-50 mt-0.5">{role}</p>
                        </div>
                        <button
                            onClick={() => signOut({ callbackUrl: "/login" })}
                            className="size-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all border border-transparent hover:border-rose-100"
                            title="Sign Out"
                        >
                            <span className="material-symbols-outlined text-lg">logout</span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                {/* Mobile Header Bar */}
                <header className="lg:hidden flex items-center justify-between px-6 py-5 bg-white border-b border-slate-100 sticky top-0 z-30">
                    <div className="flex items-center gap-3">
                        <div className="size-9 bg-sky-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-sky-500/10">
                            <span className="material-symbols-outlined text-xl">bolt</span>
                        </div>
                        <span className="font-bold text-slate-900 tracking-tight text-base">Synalabs</span>
                    </div>
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="size-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-600 border border-slate-200 shadow-sm"
                    >
                        <span className="material-symbols-outlined">menu</span>
                    </button>
                </header>

                <main className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-10 bg-slate-50">
                    <div className="max-w-6xl mx-auto w-full">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
