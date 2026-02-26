"use client";
import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

const NAV = [
    {
        section: "Analytical Feed",
        items: [
            { href: "/dashboard", label: "Overview", icon: "grid_view" },
            { href: "/dashboard/runs", label: "Activity Logs", icon: "list_alt" },
        ],
    },
    {
        section: "Infrastructure Ops",
        items: [
            { href: "/dashboard/targets", label: "Environments", icon: "hub" },
            { href: "/dashboard/plans", label: "Profiling Strategies", icon: "description" },
            { href: "/dashboard/compare", label: "Drift Analysis", icon: "compare_arrows" },
        ],
    },
    {
        section: "Platform Console",
        items: [
            { href: "/dashboard/users", label: "Access Control", icon: "groups" },
            { href: "/dashboard/settings", label: "Node Settings", icon: "settings" },
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

    useEffect(() => {
        setIsSidebarOpen(false);
    }, [pathname]);

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
            <div className="flex items-center justify-center min-h-[100dvh] bg-[#f8f6f6]">
                <div className="relative">
                    <div className="size-16 rounded-full border-4 border-slate-200"></div>
                    <div className="absolute top-0 left-0 size-16 rounded-full border-4 border-[#ec5b13] border-t-transparent animate-spin"></div>
                </div>
            </div>
        );
    }

    if (!session) return null;

    const role = session.user.role as string;
    const initials = (session.user.name ?? session.user.email ?? "U").slice(0, 2).toUpperCase();

    return (
        <div className="flex h-screen overflow-hidden bg-[#f8f6f6] text-slate-900 font-body">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/20 backdrop-blur-md z-40 lg:hidden transition-all duration-300"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 w-80 bg-white border-r border-slate-200
                flex flex-col h-full shrink-0 transition-transform duration-500 ease-in-out lg:static lg:translate-x-0
                ${isSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}
            `}>
                <div className="px-10 py-12">
                    <Link href="/dashboard" className="flex items-center gap-4 group">
                        <div className="size-12 bg-[#ec5b13] rounded-2xl flex items-center justify-center text-white shadow-xl shadow-[#ec5b13]/30 group-hover:scale-105 transition-transform duration-500">
                            <span className="material-symbols-outlined text-3xl">bolt</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 leading-none font-display">Synalabs</h1>
                            <p className="text-[10px] text-[#ec5b13] font-bold uppercase tracking-[0.2em] mt-1.5 flex items-center gap-1.5">
                                <span className="size-1.5 rounded-full bg-[#ec5b13] animate-pulse"></span>
                                Performance
                            </p>
                        </div>
                    </Link>
                </div>

                <nav className="flex-1 px-5 space-y-10 overflow-y-auto no-scrollbar pb-10">
                    {NAV.map((section) => {
                        if (section.section === "Platform Console" && role !== "ADMIN") return null;

                        return (
                            <div key={section.section} className="space-y-3">
                                <p className="px-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] opacity-80">{section.section}</p>
                                <div className="space-y-1">
                                    {section.items.map((item) => {
                                        const isActive = pathname === item.href;
                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group ${isActive
                                                    ? "bg-[#ec5b13] text-white shadow-xl shadow-[#ec5b13]/20"
                                                    : "text-slate-500 hover:bg-orange-50/50 hover:text-[#ec5b13]"
                                                    }`}
                                            >
                                                <span className={`material-symbols-outlined text-xl ${isActive ? "text-white" : "text-slate-400 group-hover:text-[#ec5b13]"}`}>
                                                    {item.icon}
                                                </span>
                                                <p className="text-[13px] font-bold tracking-tight">{item.label}</p>
                                                {isActive && (
                                                    <div className="ml-auto size-1.5 rounded-full bg-white animate-pulse" />
                                                )}
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </nav>

                {/* User Identity Section */}
                <div className="p-8 border-t border-slate-100 bg-slate-50/30">
                    <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
                        <div className="size-11 rounded-xl bg-orange-100 border border-[#ec5b13]/10 flex items-center justify-center text-[#ec5b13] font-extrabold text-sm shadow-inner">
                            {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold truncate text-slate-900">{session.user.name || "Default Operator"}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="size-1.5 rounded-full bg-emerald-500"></span>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{role}</span>
                            </div>
                        </div>
                        <button
                            onClick={() => signOut({ callbackUrl: "/login" })}
                            className="size-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all border border-transparent hover:border-rose-100 group"
                            title="Deauthenticate"
                        >
                            <span className="material-symbols-outlined text-lg group-active:scale-90 transition-transform">logout</span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Navigation & Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                {/* Global Search & Notif Header */}
                <header className="sticky top-0 z-30 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md px-8 py-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1">
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                className="lg:hidden size-11 flex items-center justify-center rounded-xl bg-slate-100 text-slate-600 border border-slate-200 shadow-sm"
                            >
                                <span className="material-symbols-outlined">menu</span>
                            </button>
                            <div className="max-w-md w-full relative group hidden sm:block">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl group-focus-within:text-[#ec5b13] transition-colors">search</span>
                                <input
                                    className="w-full bg-slate-100 border-none rounded-2xl py-2.5 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-[#ec5b13]/50 placeholder:text-slate-400 transition-all"
                                    placeholder="Search nodes, profiles or results..."
                                    type="text"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button className="size-11 flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-[#ec5b13] rounded-xl transition-all relative">
                                <span className="material-symbols-outlined">notifications</span>
                                <span className="absolute top-3 right-3 w-2 h-2 bg-[#ec5b13] rounded-full border-2 border-white"></span>
                            </button>
                            <div className="h-6 w-[1px] bg-slate-200 mx-2 hidden sm:block"></div>
                            <div className="flex items-center gap-3 pl-2 group cursor-pointer hidden sm:flex">
                                <div className="text-right">
                                    <p className="text-xs font-bold leading-none text-slate-900">{session.user.name || "Operator"}</p>
                                    <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mt-1 opacity-60">{role}</p>
                                </div>
                                <div className="size-10 rounded-full border-2 border-orange-100 overflow-hidden group-hover:border-[#ec5b13] transition-all">
                                    <img alt="Profile" className="size-full object-cover" src={`https://ui-avatars.com/api/?name=${session.user.name}&background=ec5b13&color=fff&bold=true`} />
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto custom-scrollbar p-8 lg:p-14 bg-[#f8f6f6]">
                    <div className="max-w-7xl mx-auto w-full">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
