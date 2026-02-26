"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Run {
    id: string;
    status: string;
    createdAt: string;
    target: { name: string; environment: string };
    plan: { name: string; vus: number; duration: number };
    metricsAgg?: {
        totalRequests: number;
        errorRate: number;
        p95Ms: number;
        sloPass: boolean;
    };
}

export default function RunsPage() {
    const [runs, setRuns] = useState<Run[]>([]);
    const [loading, setLoading] = useState(true);

    async function fetchRuns() {
        const res = await fetch("/api/runs");
        if (res.ok) {
            const data = await res.json();
            setRuns(data.runs ?? []);
        }
        setLoading(false);
    }

    useEffect(() => {
        fetchRuns();
    }, []);

    if (loading) {
        return (
            <div className="flex-1 flex justify-center items-center h-[60vh]">
                <div className="relative">
                    <div className="size-14 rounded-full border-4 border-slate-100"></div>
                    <div className="absolute top-0 left-0 size-14 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 sm:space-y-12 animate-in">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mb-1.5 font-display">Execution Logs</h1>
                    <p className="text-slate-500 text-sm sm:text-base font-medium">Archived telemetry and performance profiling records.</p>
                </div>
                <Link href="/dashboard/plans" className="btn-primary group h-[48px]">
                    <span className="material-symbols-outlined group-hover:rotate-90 transition-transform text-lg">add</span>
                    Initialize Profile
                </Link>
            </div>

            <div className="grid gap-4 sm:gap-8">
                {runs.length === 0 ? (
                    <div className="card-premium py-24 sm:py-32 flex flex-col items-center justify-center text-center px-4">
                        <div className="size-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6 border border-slate-100">
                            <span className="material-symbols-outlined text-4xl text-slate-200">history</span>
                        </div>
                        <h3 className="text-xl font-extrabold text-slate-900 mb-2">Registry Empty</h3>
                        <p className="text-slate-500 text-sm max-w-sm mx-auto mb-8 font-medium italic">No execution records detected in the persistent telemetry store.</p>
                        <Link href="/dashboard/plans" className="btn-primary">Go to Test Plans</Link>
                    </div>
                ) : (
                    <>
                        {/* Mobile: Card layout */}
                        <div className="sm:hidden space-y-4">
                            {runs.map((run) => (
                                <Link key={run.id} href={`/dashboard/runs/${run.id}`} className="card-premium p-6 flex flex-col gap-4 active:scale-[0.98] transition-all bg-white hover:border-primary/20">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${run.status === 'DONE' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                    run.status === 'RUNNING' ? 'bg-blue-50 text-blue-600 border-blue-100 animate-pulse' :
                                                        run.status === 'FAILED' ? 'bg-red-50 text-red-600 border-red-100' :
                                                            'bg-slate-100 text-slate-500 border-slate-200'
                                                }`}>
                                                {run.status}
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                            {new Date(run.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Environment Target</p>
                                        <p className="text-lg font-extrabold text-slate-900 leading-tight">{run.target.name}</p>
                                        <p className="text-xs font-medium text-slate-500 italic">Plan: {run.plan.name}</p>
                                    </div>
                                    {run.metricsAgg && (
                                        <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-[10px] text-slate-400 font-bold uppercase">p95</span>
                                                <span className={`text-xl font-bold font-mono tracking-tight ${run.metricsAgg.sloPass ? 'text-slate-900' : 'text-red-600'}`}>
                                                    {run.metricsAgg.p95Ms.toFixed(0)}<small className="text-[10px] ml-0.5">ms</small>
                                                </span>
                                            </div>
                                            <div className={`px-3 py-1 rounded-lg border flex items-center gap-2 ${run.metricsAgg.sloPass ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                                <span className="material-symbols-outlined text-lg">{run.metricsAgg.sloPass ? 'verified' : 'error'}</span>
                                                <span className="text-[10px] font-bold uppercase tracking-widest">{run.metricsAgg.sloPass ? 'Compliant' : 'Breach'}</span>
                                            </div>
                                        </div>
                                    )}
                                </Link>
                            ))}
                        </div>

                        {/* Desktop: Table layout */}
                        <div className="hidden sm:block card-premium overflow-hidden border-none shadow-2xl">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[800px]">
                                    <thead>
                                        <tr className="bg-slate-900 text-white">
                                            <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.25em] opacity-60">Sequence ID</th>
                                            <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.25em] opacity-60">Infrastructure Context</th>
                                            <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.25em] opacity-60">Operational Status</th>
                                            <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.25em] opacity-60 text-center">Telemetry Result</th>
                                            <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.25em] opacity-60 text-right">Audit</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {runs.map((run) => (
                                            <tr key={run.id} className="hover:bg-slate-50/80 transition-all group">
                                                <td className="px-8 py-6">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-slate-900 mb-1 group-hover:text-primary transition-colors">#{run.id.slice(0, 8)}</span>
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                                                            <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                                                            {new Date(run.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex flex-col gap-1.5">
                                                        <div className="flex items-center gap-2 font-extrabold text-sm text-slate-900 group-hover:translate-x-1 transition-transform">
                                                            {run.target.name}
                                                            <span className="material-symbols-outlined text-slate-300 text-[14px]">arrow_forward</span>
                                                            {run.plan.name}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[9px] bg-slate-50 text-slate-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest border border-slate-100">
                                                                {run.target.environment}
                                                            </span>
                                                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                                                                {run.plan.vus} VUs / {run.plan.duration}s
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.15em] border ${run.status === 'DONE' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                            run.status === 'RUNNING' ? 'bg-blue-50 text-blue-600 border-blue-100 animate-pulse' :
                                                                run.status === 'FAILED' ? 'bg-red-50 text-red-600 border-red-100' :
                                                                    'bg-slate-50 text-slate-500 border-slate-100'
                                                        }`}>
                                                        {run.status === 'RUNNING' && <div className="size-1.5 rounded-full bg-blue-500 animate-ping" />}
                                                        {run.status}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6">
                                                    {run.metricsAgg ? (
                                                        <div className="flex items-center justify-center gap-8">
                                                            <div className="flex flex-col items-start min-w-[60px]">
                                                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1 opacity-60">Avg p95</span>
                                                                <span className={`text-base font-bold font-mono tracking-tighter ${run.metricsAgg.sloPass ? 'text-slate-900' : 'text-red-500'}`}>
                                                                    {run.metricsAgg.p95Ms.toFixed(0)}<small className="text-[10px] ml-0.5">ms</small>
                                                                </span>
                                                            </div>
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1 opacity-60">Audit</span>
                                                                <span className={`material-symbols-outlined text-xl ${run.metricsAgg.sloPass ? 'text-emerald-500' : 'text-red-500'}`}>
                                                                    {run.metricsAgg.sloPass ? 'verified' : 'error'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex justify-center">
                                                            <span className="text-slate-200 font-bold tracking-widest uppercase text-[10px]">Processing...</span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <Link
                                                        href={`/dashboard/runs/${run.id}`}
                                                        className="btn-premium px-4 py-2 text-[11px] hover:bg-primary hover:text-white hover:border-primary"
                                                    >
                                                        Details
                                                        <span className="material-symbols-outlined text-sm">visibility</span>
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
