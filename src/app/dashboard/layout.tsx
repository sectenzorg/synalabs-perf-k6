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
        <div className="flex h-[100dvh] overflow-hidden text-slate-900 font-display geometric-bg">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 w-64 lg:w-[270px] bg-white/80 backdrop-blur-2xl border-r border-slate-200/60 
                flex flex-col h-full shrink-0 transition-transform duration-500 ease-in-out lg:static lg:translate-x-0
                ${isSidebarOpen ? "translate-x-0 shadow-2xl shadow-sky-900/10" : "-translate-x-full"}
            `}>
                <div className="p-8 lg:p-10">
                    <div className="flex items-center gap-3 group cursor-default">
                        <div className="size-11 bg-primary rounded-2xl flex items-center justify-center text-white shadow-xl shadow-primary/30 transition-all duration-500 group-hover:rotate-12 group-hover:scale-110">
                            <span className="material-symbols-outlined text-2xl italic">bolt</span>
                        </div>
                        <div className="flex flex-col">
                            <h1 className="text-lg font-black tracking-tighter text-slate-900 leading-none italic">SYNALABS</h1>
                            <p className="text-[9px] text-primary font-black uppercase tracking-[0.3em] mt-1 shrink-0">Perf Intelligence</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-8 overflow-y-auto no-scrollbar pt-2 pb-6">
                    {NAV.map((section) => {
                        if (section.section === "Admin" && role !== "ADMIN") return null;

                        return (
                            <div key={section.section} className="space-y-3">
                                <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] italic opacity-60">{section.section}</p>
                                <div className="space-y-1">
                                    {section.items.map((item) => {
                                        const isActive = pathname === item.href;
                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                className={`flex items-center gap-4 px-4 py-3.5 rounded-[1.25rem] transition-all duration-300 group relative overflow-hidden ${isActive
                                                    ? "bg-slate-950 text-white shadow-xl shadow-slate-900/20 translate-x-1"
                                                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                                    }`}
                                            >
                                                {isActive && (
                                                    <div className="absolute left-0 top-0 w-1 h-full bg-primary" />
                                                )}
                                                <span className={`material-symbols-outlined text-[22px] transition-all duration-300 ${isActive ? "text-primary" : "text-slate-300 group-hover:text-primary group-hover:rotate-6"}`}>
                                                    {item.icon}
                                                </span>
                                                <p className="text-sm font-bold tracking-tight italic">{item.label}</p>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </nav>

                {/* User Profile / Footer */}
                <div className="p-6 mt-auto border-t border-slate-50">
                    <div className="bg-slate-50/50 rounded-[2rem] p-4 flex flex-col gap-4 border border-slate-100/50">
                        <div className="flex items-center gap-3">
                            <div className="size-11 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-primary font-black text-sm shadow-sm transition-transform hover:scale-105">
                                {initials}
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className="text-sm font-black truncate text-slate-900 tracking-tight italic">{session.user.name}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{role}</p>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => signOut({ callbackUrl: "/login" })}
                            className="w-full flex items-center justify-center gap-2.5 px-3 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black text-slate-500 hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all active:scale-95 uppercase tracking-widest italic"
                        >
                            <span className="material-symbols-outlined text-base">logout</span>
                            Terminate_Session
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                {/* Mobile Header Bar */}
                <header className="lg:hidden flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-30">
                    <div className="flex items-center gap-3">
                        <div className="size-9 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
                            <span className="material-symbols-outlined text-xl italic">bolt</span>
                        </div>
                        <span className="font-black text-slate-900 tracking-tighter text-base italic leading-none">SYNALABS</span>
                    </div>
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="size-11 flex items-center justify-center rounded-2xl bg-white text-slate-600 active:scale-90 transition-transform border border-slate-200 shadow-sm"
                    >
                        <span className="material-symbols-outlined">menu</span>
                    </button>
                </header>

                <main className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8 xl:p-10">
                    <div className="max-w-[1440px] mx-auto w-full">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
