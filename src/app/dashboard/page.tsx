"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Stats {
    totalRuns: number;
    runningRuns: number;
    totalTargets: number;
    totalPlans: number;
    recentRuns: any[];
    passRate: number;
}

export default function DashboardHome() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const [runsRes, targetsRes, plansRes] = await Promise.all([
                    fetch("/api/runs?limit=5"),
                    fetch("/api/targets"),
                    fetch("/api/plans"),
                ]);
                const runsData = await runsRes.json();
                const targets = await targetsRes.json();
                const plans = await plansRes.json();

                const runs: any[] = runsData.runs ?? [];
                const allRunsRes = await fetch("/api/runs?limit=100");
                const allRunsData = await allRunsRes.json();
                const allRuns: any[] = allRunsData.runs ?? [];
                const doneRuns = allRuns.filter((r) => r.status === "DONE");
                const passRuns = doneRuns.filter((r) => r.metricsAgg?.sloPass);

                setStats({
                    totalRuns: runsData.total ?? 0,
                    runningRuns: allRuns.filter((r) => r.status === "RUNNING" || r.status === "QUEUED").length,
                    totalTargets: Array.isArray(targets) ? targets.length : 0,
                    totalPlans: Array.isArray(plans) ? plans.length : 0,
                    recentRuns: runs,
                    passRate: doneRuns.length > 0 ? (passRuns.length / doneRuns.length) * 100 : 0,
                });
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        load();
        const interval = setInterval(load, 10000);
        return () => clearInterval(interval);
    }, []);

    const statusClass: Record<string, string> = {
        RUNNING: "badge-running",
        DONE: "badge-done",
        FAILED: "badge-failed",
        QUEUED: "badge-queued",
        CANCELED: "badge-canceled",
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Dashboard</h1>
                    <p className="page-subtitle">Overview of your stress testing activity</p>
                </div>
                <Link href="/dashboard/runs" className="btn btn-primary">
                    🚀 New Run
                </Link>
            </div>

            {loading ? (
                <div className="flex-center" style={{ padding: "4rem" }}>
                    <div className="spinner" style={{ width: 36, height: 36 }} />
                </div>
            ) : (
                <>
                    {/* KPI Cards */}
                    <div className="kpi-grid">
                        <div className="kpi-card" style={{ "--accent-gradient": "linear-gradient(90deg, #3b82f6, #8b5cf6)" } as any}>
                            <div className="kpi-label">Total Runs</div>
                            <div className="kpi-value">{stats?.totalRuns ?? 0}</div>
                            <div className="kpi-sub">All time</div>
                        </div>
                        <div className="kpi-card" style={{ "--accent-gradient": "linear-gradient(90deg, #06b6d4, #3b82f6)" } as any}>
                            <div className="kpi-label">Active Now</div>
                            <div className="kpi-value" style={{ color: stats?.runningRuns ? "var(--accent-blue)" : "var(--text-primary)" }}>
                                {stats?.runningRuns ?? 0}
                            </div>
                            <div className="kpi-sub">Queued or running</div>
                        </div>
                        <div className="kpi-card" style={{ "--accent-gradient": "linear-gradient(90deg, #10b981, #06b6d4)" } as any}>
                            <div className="kpi-label">SLO Pass Rate</div>
                            <div className="kpi-value" style={{ color: (stats?.passRate ?? 0) >= 80 ? "var(--accent-green)" : "var(--accent-red)" }}>
                                {stats?.passRate.toFixed(0) ?? 0}%
                            </div>
                            <div className="kpi-sub">Of completed runs</div>
                        </div>
                        <div className="kpi-card" style={{ "--accent-gradient": "linear-gradient(90deg, #f59e0b, #f97316)" } as any}>
                            <div className="kpi-label">Targets</div>
                            <div className="kpi-value">{stats?.totalTargets ?? 0}</div>
                            <div className="kpi-sub">Registered domains</div>
                        </div>
                        <div className="kpi-card" style={{ "--accent-gradient": "linear-gradient(90deg, #8b5cf6, #ec4899)" } as any}>
                            <div className="kpi-label">Test Plans</div>
                            <div className="kpi-value">{stats?.totalPlans ?? 0}</div>
                            <div className="kpi-sub">Reusable templates</div>
                        </div>
                    </div>

                    {/* Recent Runs */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Recent Runs</h3>
                            <Link href="/dashboard/runs" className="btn btn-ghost btn-sm">
                                View all →
                            </Link>
                        </div>

                        {stats?.recentRuns.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon">🚀</div>
                                <h3>No runs yet</h3>
                                <p>Create a target and test plan to get started</p>
                            </div>
                        ) : (
                            <div className="table-wrapper">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Status</th>
                                            <th>Target</th>
                                            <th>Plan</th>
                                            <th>Label</th>
                                            <th>p95</th>
                                            <th>Error Rate</th>
                                            <th>SLO</th>
                                            <th>Started</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stats?.recentRuns.map((run) => (
                                            <tr key={run.id}>
                                                <td>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`status-dot dot-${run.status.toLowerCase()}`} />
                                                        <span className={`badge ${statusClass[run.status]}`}>{run.status}</span>
                                                    </div>
                                                </td>
                                                <td className="truncate" style={{ maxWidth: 140 }}>{run.target?.name}</td>
                                                <td className="truncate" style={{ maxWidth: 140 }}>{run.plan?.name}</td>
                                                <td>{run.label ? <span className="badge badge-dev">{run.label}</span> : <span className="text-muted">—</span>}</td>
                                                <td className="font-mono">
                                                    {run.metricsAgg ? `${run.metricsAgg.p95Ms.toFixed(0)}ms` : "—"}
                                                </td>
                                                <td className="font-mono">
                                                    {run.metricsAgg ? `${(run.metricsAgg.errorRate * 100).toFixed(2)}%` : "—"}
                                                </td>
                                                <td>
                                                    {run.metricsAgg != null ? (
                                                        <span className={`badge ${run.metricsAgg.sloPass ? "badge-pass" : "badge-fail"}`}>
                                                            {run.metricsAgg.sloPass ? "PASS" : "FAIL"}
                                                        </span>
                                                    ) : "—"}
                                                </td>
                                                <td className="text-muted text-sm">
                                                    {new Date(run.createdAt).toLocaleString()}
                                                </td>
                                                <td>
                                                    <Link href={`/dashboard/runs/${run.id}`} className="btn btn-ghost btn-sm">
                                                        Details →
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
