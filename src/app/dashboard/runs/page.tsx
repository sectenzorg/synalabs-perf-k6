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
        <div className="space-y-8 animate-in pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-1 font-display">Run History</h1>
                    <p className="text-slate-500 text-sm font-medium">A chronological log of all performance test executions and results.</p>
                </div>
            </div>

            <div className="space-y-6">
                {runs.length === 0 ? (
                    <div className="card-premium py-24 flex flex-col items-center justify-center text-center px-6 bg-white border-slate-100">
                        <div className="size-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-6 border border-slate-100 text-slate-200">
                            <span className="material-symbols-outlined text-3xl">history</span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">No history found</h3>
                        <p className="text-sm text-slate-500 max-w-sm mx-auto mb-8 font-medium">You haven't executed any performance test plans yet.</p>
                        <Link href="/dashboard/plans" className="btn-primary">View Test Plans</Link>
                    </div>
                ) : (
                    <>
                        {/* Mobile: Card layout */}
                        <div className="sm:hidden space-y-4">
                            {runs.map((run) => (
                                <Link key={run.id} href={`/dashboard/runs/${run.id}`} className="card-premium p-6 flex flex-col gap-4 bg-white border-slate-100 hover:border-sky-200 transition-all active:scale-[0.98]">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${run.status === 'DONE' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                run.status === 'RUNNING' ? 'bg-sky-50 text-sky-600 border-sky-100 animate-pulse' :
                                                    run.status === 'FAILED' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                        'bg-slate-50 text-slate-500 border-slate-100'
                                                }`}>
                                                {run.status}
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                            {new Date(run.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold text-slate-900 leading-tight">{run.target.name}</p>
                                        <p className="text-[11px] font-medium text-slate-500">{run.plan.name}</p>
                                    </div>
                                    {run.metricsAgg && (
                                        <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">p95</span>
                                                <span className={`text-lg font-bold tracking-tight ${run.metricsAgg.sloPass ? 'text-slate-900' : 'text-rose-600'}`}>
                                                    {run.metricsAgg.p95Ms.toFixed(0)}ms
                                                </span>
                                            </div>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Fail</span>
                                                <span className="text-lg font-bold tracking-tight text-slate-900">
                                                    {(run.metricsAgg.errorRate * 100).toFixed(1)}%
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </Link>
                            ))}
                        </div>

                        {/* Desktop: Table layout */}
                        <div className="hidden sm:block card-premium overflow-hidden border-slate-100 bg-white shadow-xl shadow-slate-200/20">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Created</th>
                                        <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Target & Plan</th>
                                        <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                                        <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">p95 Latency</th>
                                        <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Error Rate</th>
                                        <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Details</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {runs.map((run) => (
                                        <tr key={run.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-900">
                                                        {new Date(run.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                    </span>
                                                    <span className="text-[11px] font-medium text-slate-400">
                                                        {new Date(run.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-900">{run.target.name}</span>
                                                    <span className="text-[11px] font-medium text-slate-500">{run.plan.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${run.status === 'DONE' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                    run.status === 'RUNNING' ? 'bg-sky-50 text-sky-600 border-sky-100 animate-pulse' :
                                                        run.status === 'FAILED' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                            'bg-slate-50 text-slate-500 border-slate-100'
                                                    }`}>
                                                    {run.status}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                {run.metricsAgg ? (
                                                    <span className={`text-sm font-bold tracking-tight ${run.metricsAgg.sloPass ? 'text-slate-900' : 'text-rose-600'}`}>
                                                        {run.metricsAgg.p95Ms.toFixed(0)}ms
                                                    </span>
                                                ) : <span className="text-slate-200">—</span>}
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                {run.metricsAgg ? (
                                                    <span className="text-sm font-bold text-slate-900">
                                                        {(run.metricsAgg.errorRate * 100).toFixed(2)}%
                                                    </span>
                                                ) : <span className="text-slate-200">—</span>}
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <Link href={`/dashboard/runs/${run.id}`} className="size-9 inline-flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 group-hover:text-sky-600 group-hover:bg-sky-50 transition-all border border-slate-100">
                                                    <span className="material-symbols-outlined text-lg">insights</span>
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
