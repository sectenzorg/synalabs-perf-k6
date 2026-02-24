import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/middleware";
import { format } from "date-fns";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const run = await prisma.testRun.findUnique({
        where: { id },
        include: {
            target: true,
            plan: true,
            triggeredBy: { select: { username: true } },
            metricsAgg: true,
            insights: { orderBy: { createdAt: "asc" } },
        },
    });

    if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const m = run.metricsAgg;
    const statuses = m ? (m.statusCodes as Record<string, number>) : {};
    const topErrors = m ? (m.topErrors as Array<{ msg: string; count: number }>) : [];
    const insightsByLevel = {
        critical: run.insights.filter((i) => i.level === "critical"),
        warning: run.insights.filter((i) => i.level === "warning"),
        info: run.insights.filter((i) => i.level === "info"),
    };

    const statusRows = Object.entries(statuses)
        .sort(([, a], [, b]) => b - a)
        .map(
            ([code, count]) =>
                `<tr><td>${code}</td><td>${count}</td><td>${m ? ((count / m.totalRequests) * 100).toFixed(1) : 0}%</td></tr>`
        )
        .join("");

    const errorRows = topErrors
        .slice(0, 10)
        .map((e) => `<tr><td>${e.msg}</td><td>${e.count}</td></tr>`)
        .join("");

    const insightItems = run.insights
        .map((ins) => {
            const icon = ins.level === "critical" ? "🔴" : ins.level === "warning" ? "🟡" : "🟢";
            return `
      <div class="insight ${ins.level}">
        <strong>${icon} ${ins.message}</strong>
        ${ins.detail ? `<p>${ins.detail}</p>` : ""}
      </div>`;
        })
        .join("");

    const sloPassClass = m?.sloPass ? "pass" : "fail";
    const sloPassText = m?.sloPass ? "✅ PASS" : "❌ FAIL";

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Stress Test Report — ${run.target.name} — ${format(run.createdAt, "yyyy-MM-dd HH:mm")}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; padding: 2rem; }
    .header { background: linear-gradient(135deg, #1e40af, #7c3aed); padding: 2rem; border-radius: 12px; margin-bottom: 2rem; }
    .header h1 { font-size: 1.8rem; color: #fff; margin-bottom: 0.5rem; }
    .header .meta { color: #bfdbfe; font-size: 0.9rem; }
    .section { background: #1e293b; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; border: 1px solid #334155; }
    .section h2 { font-size: 1.2rem; color: #93c5fd; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid #334155; }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1rem; }
    .kpi { background: #0f172a; border-radius: 8px; padding: 1.2rem; text-align: center; border: 1px solid #334155; }
    .kpi .value { font-size: 2rem; font-weight: 700; color: #60a5fa; }
    .kpi .label { font-size: 0.8rem; color: #94a3b8; margin-top: 0.3rem; text-transform: uppercase; letter-spacing: 0.05em; }
    .slo-badge { display: inline-block; padding: 0.3rem 1rem; border-radius: 999px; font-weight: 700; font-size: 1.1rem; }
    .slo-badge.pass { background: #14532d; color: #4ade80; }
    .slo-badge.fail { background: #7f1d1d; color: #f87171; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 0.6rem 0.8rem; border-bottom: 1px solid #334155; font-size: 0.9rem; }
    th { color: #94a3b8; font-weight: 600; }
    td { color: #e2e8f0; }
    .insight { padding: 0.8rem 1rem; border-radius: 8px; margin-bottom: 0.8rem; border-left: 4px solid; }
    .insight.critical { background: rgba(239,68,68,0.1); border-color: #ef4444; }
    .insight.warning { background: rgba(251,191,36,0.1); border-color: #fbbf24; }
    .insight.info { background: rgba(96,165,250,0.1); border-color: #60a5fa; }
    .insight strong { display: block; margin-bottom: 0.3rem; }
    .insight p { font-size: 0.85rem; color: #94a3b8; }
    .config-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
    .config-item { display: flex; justify-content: space-between; padding: 0.4rem 0; border-bottom: 1px solid #1e293b; }
    .config-key { color: #94a3b8; }
    .config-val { color: #e2e8f0; font-weight: 500; }
    .footer { text-align: center; color: #475569; font-size: 0.8rem; margin-top: 2rem; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🚀 Stress Test Report</h1>
    <div class="meta">
      <strong>Target:</strong> ${run.target.name} (${run.target.baseUrl})  &nbsp;|&nbsp;
      <strong>Plan:</strong> ${run.plan.name}  &nbsp;|&nbsp;
      <strong>Run by:</strong> ${run.triggeredBy.username}  &nbsp;|&nbsp;
      <strong>Date:</strong> ${format(run.createdAt, "dd MMM yyyy HH:mm:ss")}
      ${run.label ? `&nbsp;|&nbsp;<strong>Label:</strong> ${run.label}` : ""}
    </div>
  </div>

  <div class="section">
    <h2>📊 KPI Summary</h2>
    <div class="kpi-grid">
      <div class="kpi"><div class="value">${m?.totalRequests?.toLocaleString() ?? "—"}</div><div class="label">Total Requests</div></div>
      <div class="kpi"><div class="value">${m ? (m.errorRate * 100).toFixed(2) + "%" : "—"}</div><div class="label">Error Rate</div></div>
      <div class="kpi"><div class="value">${m ? m.p50Ms.toFixed(0) + "ms" : "—"}</div><div class="label">p50 Latency</div></div>
      <div class="kpi"><div class="value">${m ? m.p95Ms.toFixed(0) + "ms" : "—"}</div><div class="label">p95 Latency</div></div>
      <div class="kpi"><div class="value">${m ? m.p99Ms.toFixed(0) + "ms" : "—"}</div><div class="label">p99 Latency</div></div>
      <div class="kpi"><div class="value">${m ? m.avgRps.toFixed(1) : "—"}</div><div class="label">Avg RPS</div></div>
      <div class="kpi"><div class="value">${m ? m.durationSec.toFixed(0) + "s" : "—"}</div><div class="label">Duration</div></div>
      <div class="kpi"><div class="value"><span class="slo-badge ${sloPassClass}">${sloPassText}</span></div><div class="label">SLO Gate</div></div>
    </div>
  </div>

  <div class="section">
    <h2>⚙️ Test Configuration</h2>
    <div class="config-grid">
      <div class="config-item"><span class="config-key">VUs</span><span class="config-val">${run.vusOverride ?? run.plan.vus}</span></div>
      <div class="config-item"><span class="config-key">Duration</span><span class="config-val">${run.durationOverride ?? run.plan.duration}s</span></div>
      <div class="config-item"><span class="config-key">Method</span><span class="config-val">${run.plan.method}</span></div>
      <div class="config-item"><span class="config-key">Path</span><span class="config-val">${run.plan.path}</span></div>
      <div class="config-item"><span class="config-key">Expected Status</span><span class="config-val">${run.plan.expectedStatus}</span></div>
      <div class="config-item"><span class="config-key">Environment</span><span class="config-val">${run.target.environment}</span></div>
      ${run.plan.sloP95Ms ? `<div class="config-item"><span class="config-key">SLO p95</span><span class="config-val">&lt; ${run.plan.sloP95Ms}ms</span></div>` : ""}
      ${run.plan.sloErrorPct != null ? `<div class="config-item"><span class="config-key">SLO Error</span><span class="config-val">&lt; ${run.plan.sloErrorPct}%</span></div>` : ""}
    </div>
  </div>

  <div class="section">
    <h2>💡 Insights & Recommendations</h2>
    ${insightItems || "<p>No insights generated.</p>"}
  </div>

  <div class="section">
    <h2>📋 Status Code Distribution</h2>
    <table>
      <tr><th>Status Code</th><th>Count</th><th>Percentage</th></tr>
      ${statusRows || "<tr><td colspan='3'>No data</td></tr>"}
    </table>
  </div>

  ${topErrors.length > 0
            ? `<div class="section">
    <h2>🚨 Top Errors</h2>
    <table>
      <tr><th>Error Message</th><th>Count</th></tr>
      ${errorRows}
    </table>
  </div>`
            : ""
        }

  <div class="footer">
    Generated by Synalabs Perf Dashboard · ${format(new Date(), "dd MMM yyyy HH:mm:ss")}
  </div>
</body>
</html>`;

    return new NextResponse(html, {
        headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Content-Disposition": `attachment; filename="report-${id.substring(0, 8)}.html"`,
        },
    });
}
