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
                    <div className="size-12 rounded-full border-4 border-slate-200"></div>
                    <div className="absolute top-0 left-0 size-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 sm:space-y-8 animate-in">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mb-1">Run History</h1>
                    <p className="text-slate-500 text-sm font-medium">Analyze and compare your performance test results.</p>
                </div>
                <Link href="/dashboard/plans" className="btn-primary group text-xs">
                    <span className="material-symbols-outlined group-hover:rotate-90 transition-transform text-lg">add</span>
                    New Performance Run
                </Link>
            </div>

            <div className="grid gap-4 sm:gap-6">
                {runs.length === 0 ? (
                    <div className="card-premium p-12 sm:p-20 flex flex-col items-center justify-center text-center">
                        <div className="size-16 sm:size-20 bg-slate-50 rounded-full flex items-center justify-center mb-5">
                            <span className="material-symbols-outlined text-3xl sm:text-4xl text-slate-300">history</span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">No runs found</h3>
                        <p className="text-slate-500 text-sm max-w-xs mx-auto mb-6">You haven&apos;t executed any performance tests yet. Start by creating a test plan.</p>
                        <Link href="/dashboard/plans" className="btn-primary text-xs">Go to Test Plans</Link>
                    </div>
                ) : (
                    <>
                        {/* Mobile: Card layout */}
                        <div className="sm:hidden space-y-3">
                            {runs.map((run) => (
                                <Link key={run.id} href={`/dashboard/runs/${run.id}`} className="card-premium p-4 flex flex-col gap-3 active:scale-[0.99] transition-transform">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${run.status === 'DONE' ? 'bg-green-50 text-green-600 border border-green-100' :
                                                run.status === 'RUNNING' ? 'bg-blue-50 text-blue-600 border border-blue-100 animate-pulse' :
                                                    run.status === 'FAILED' ? 'bg-red-50 text-red-600 border border-red-100' :
                                                        'bg-slate-100 text-slate-600 border border-slate-200'
                                                }`}>
                                                {run.status === 'RUNNING' && <span className="size-1.5 rounded-full bg-blue-500 animate-ping" />}
                                                {run.status}
                                            </span>
                                        </div>
                                        <span className="text-[11px] text-slate-400 font-medium">
                                            {new Date(run.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">{run.target.name} → {run.plan.name}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold uppercase border border-slate-200">
                                                {run.target.environment}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-medium">
                                                {run.plan.vus} VUs · {run.plan.duration}s
                                            </span>
                                        </div>
                                    </div>
                                    {run.metricsAgg && (
                                        <div className="flex items-center gap-4 pt-2 border-t border-slate-100">
                                            <div className="flex items-center gap-1">
                                                <span className="text-[10px] text-slate-400 font-medium">p95</span>
                                                <span className={`text-sm font-mono font-bold ${run.metricsAgg.sloPass ? 'text-slate-900' : 'text-red-500'}`}>
                                                    {run.metricsAgg.p95Ms.toFixed(0)}ms
                                                </span>
                                            </div>
                                            <span className={`material-symbols-outlined text-lg ${run.metricsAgg.sloPass ? 'text-green-500' : 'text-red-500'}`}>
                                                {run.metricsAgg.sloPass ? 'check_circle' : 'cancel'}
                                            </span>
                                        </div>
                                    )}
                                </Link>
                            ))}
                        </div>

                        {/* Desktop: Table layout */}
                        <div className="hidden sm:block card-premium overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[700px]">
                                    <thead>
                                        <tr className="bg-slate-50/50 border-b border-slate-100">
                                            <th className="px-5 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Test Run</th>
                                            <th className="px-5 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Target & Plan</th>
                                            <th className="px-5 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                                            <th className="px-5 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">Result</th>
                                            <th className="px-5 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100/60">
                                        {runs.map((run) => (
                                            <tr key={run.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-5 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-semibold text-slate-900 mb-0.5">#{run.id.slice(0, 8)}</span>
                                                        <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                                                            <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                                                            {new Date(run.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-1.5 font-semibold text-sm text-slate-800">
                                                            {run.target.name}
                                                            <span className="material-symbols-outlined text-slate-300 text-[14px]">arrow_forward</span>
                                                            {run.plan.name}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border border-slate-200">
                                                                {run.target.environment}
                                                            </span>
                                                            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                                                                {run.plan.vus} VUs · {run.plan.duration}s
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${run.status === 'DONE' ? 'bg-green-50 text-green-600 border border-green-100' :
                                                        run.status === 'RUNNING' ? 'bg-blue-50 text-blue-600 border border-blue-100 animate-pulse' :
                                                            run.status === 'FAILED' ? 'bg-red-50 text-red-600 border border-red-100' :
                                                                'bg-slate-100 text-slate-600 border border-slate-200'
                                                        }`}>
                                                        {run.status === 'RUNNING' && <span className="size-1.5 rounded-full bg-blue-500 animate-ping" />}
                                                        {run.status}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    {run.metricsAgg ? (
                                                        <div className="flex items-center justify-center gap-4">
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-0.5">p95</span>
                                                                <span className={`text-sm font-mono font-bold ${run.metricsAgg.sloPass ? 'text-slate-900' : 'text-red-500'}`}>
                                                                    {run.metricsAgg.p95Ms.toFixed(0)}<small className="text-[10px] font-medium ml-0.5">ms</small>
                                                                </span>
                                                            </div>
                                                            <div className="w-px h-6 bg-slate-100" />
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-0.5">SLO</span>
                                                                <span className={`material-symbols-outlined text-lg ${run.metricsAgg.sloPass ? 'text-green-500' : 'text-red-500'}`}>
                                                                    {run.metricsAgg.sloPass ? 'check_circle' : 'cancel'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex justify-center">
                                                            <span className="text-slate-300 font-bold">—</span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    <Link
                                                        href={`/dashboard/runs/${run.id}`}
                                                        className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:text-primary-dark transition-colors px-2.5 py-1.5 rounded-lg hover:bg-primary/5"
                                                    >
                                                        Details
                                                        <span className="material-symbols-outlined text-[18px]">chevron_right</span>
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
