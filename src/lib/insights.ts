interface RunMetrics {
    totalRequests: number;
    errorRate: number;
    p50Ms: number;
    p95Ms: number;
    p99Ms: number;
    avgRps: number;
    durationSec: number;
    statusCodes: Record<string, number>;
    topErrors: Array<{ msg: string; count: number }>;
}

interface BaselineMetrics {
    p95Ms: number;
    errorRate: number;
    avgRps: number;
}

export interface Insight {
    level: "info" | "warning" | "critical";
    category: "slo" | "error_signature" | "degradation" | "regression";
    message: string;
    detail?: string;
}

interface SloConfig {
    sloP95Ms?: number | null;
    sloErrorPct?: number | null;
    sloMinRps?: number | null;
}

export function generateInsights(
    metrics: RunMetrics,
    slo: SloConfig,
    baseline?: BaselineMetrics | null
): Insight[] {
    const insights: Insight[] = [];

    // 1. SLO Gate
    let sloPass = true;
    const sloIssues: string[] = [];

    if (slo.sloP95Ms && metrics.p95Ms > slo.sloP95Ms) {
        sloPass = false;
        sloIssues.push(`p95 ${metrics.p95Ms.toFixed(0)}ms > SLO ${slo.sloP95Ms}ms`);
    }
    if (slo.sloErrorPct !== null && slo.sloErrorPct !== undefined && metrics.errorRate * 100 > slo.sloErrorPct) {
        sloPass = false;
        sloIssues.push(`error rate ${(metrics.errorRate * 100).toFixed(2)}% > SLO ${slo.sloErrorPct}%`);
    }
    if (slo.sloMinRps && metrics.avgRps < slo.sloMinRps) {
        sloPass = false;
        sloIssues.push(`avg RPS ${metrics.avgRps.toFixed(1)} < SLO ${slo.sloMinRps}`);
    }

    insights.push({
        level: sloPass ? "info" : "critical",
        category: "slo",
        message: sloPass ? "✅ SLO Gate: PASS — all thresholds met" : "❌ SLO Gate: FAIL — thresholds violated",
        detail: sloIssues.length > 0 ? sloIssues.join("; ") : undefined,
    });

    // 2. Error signature detection
    const total = metrics.totalRequests || 1;
    const errorCount429 = metrics.statusCodes["429"] ?? 0;
    const errorCount503 = metrics.statusCodes["503"] ?? 0;
    const errorCount502 = metrics.statusCodes["502"] ?? 0;
    const timeoutCount = metrics.topErrors
        .filter((e) => /timeout/i.test(e.msg))
        .reduce((acc, e) => acc + e.count, 0);

    const rate429 = errorCount429 / total;
    const rate503502 = (errorCount503 + errorCount502) / total;
    const rateTimeout = timeoutCount / total;

    if (rate429 > 0.05) {
        insights.push({
            level: "warning",
            category: "error_signature",
            message: "⚠️ Rate Limiting Detected — dominant HTTP 429 responses",
            detail: `${(rate429 * 100).toFixed(1)}% of requests returned 429. Likely gateway/API rate limit is being hit. Consider reducing VUs or adding request delays.`,
        });
    }

    if (rate503502 > 0.05) {
        insights.push({
            level: "critical",
            category: "error_signature",
            message: "🔴 Upstream Overload — dominant 502/503 responses",
            detail: `${(rate503502 * 100).toFixed(1)}% of requests returned 502/503. Indicates the upstream server is unhealthy or overloaded.`,
        });
    }

    if (rateTimeout > 0.03) {
        insights.push({
            level: "warning",
            category: "error_signature",
            message: "⏱️ Timeout Issues — significant timeout errors detected",
            detail: `${(rateTimeout * 100).toFixed(1)}% of requests timed out. Check dependency health, network latency, and timeout configuration.`,
        });
    }

    // 3. Degradation hints — high p95 vs RPS ratio
    if (metrics.p95Ms > 2000 && metrics.avgRps > 10) {
        insights.push({
            level: "warning",
            category: "degradation",
            message: "📈 Possible Saturation — high latency under load",
            detail: `p95 latency ${metrics.p95Ms.toFixed(0)}ms is high at ${metrics.avgRps.toFixed(1)} RPS. Possible bottleneck in DB pool, CPU, or connection limits.`,
        });
    } else if (metrics.p95Ms > 1000) {
        insights.push({
            level: "info",
            category: "degradation",
            message: "🟡 Elevated Latency — p95 exceeds 1 second",
            detail: `p95 latency is ${metrics.p95Ms.toFixed(0)}ms. Monitor under higher load to confirm saturation risk.`,
        });
    } else {
        insights.push({
            level: "info",
            category: "degradation",
            message: "✅ Latency Profile Normal — no saturation signals detected",
            detail: `p95=${metrics.p95Ms.toFixed(0)}ms at ${metrics.avgRps.toFixed(1)} avg RPS is within acceptable range.`,
        });
    }

    // 4. Regression vs baseline
    if (baseline) {
        const p95Delta = ((metrics.p95Ms - baseline.p95Ms) / (baseline.p95Ms || 1)) * 100;
        const errDelta = ((metrics.errorRate - baseline.errorRate) / (baseline.errorRate || 0.001)) * 100;

        if (p95Delta > 20) {
            insights.push({
                level: "critical",
                category: "regression",
                message: `🚨 Regression — p95 latency increased ${p95Delta.toFixed(1)}% vs baseline`,
                detail: `Baseline p95: ${baseline.p95Ms.toFixed(0)}ms → Current: ${metrics.p95Ms.toFixed(0)}ms. Investigate recent changes.`,
            });
        } else if (p95Delta > 0) {
            insights.push({
                level: "info",
                category: "regression",
                message: `📊 Compared to baseline: p95 +${p95Delta.toFixed(1)}% (within threshold)`,
                detail: `Baseline p95: ${baseline.p95Ms.toFixed(0)}ms → Current: ${metrics.p95Ms.toFixed(0)}ms`,
            });
        } else {
            insights.push({
                level: "info",
                category: "regression",
                message: `✅ No regression — p95 improved ${Math.abs(p95Delta).toFixed(1)}% vs baseline`,
                detail: `Baseline p95: ${baseline.p95Ms.toFixed(0)}ms → Current: ${metrics.p95Ms.toFixed(0)}ms`,
            });
        }

        if (errDelta > 50) {
            insights.push({
                level: "warning",
                category: "regression",
                message: `⚠️ Error rate regression — increased ${errDelta.toFixed(1)}% vs baseline`,
                detail: `Baseline error rate: ${(baseline.errorRate * 100).toFixed(2)}% → Current: ${(metrics.errorRate * 100).toFixed(2)}%`,
            });
        }
    }

    // 5. Overall health summary if no issues found
    if (insights.filter((i) => i.level === "warning" || i.level === "critical").length === 0) {
        insights.push({
            level: "info",
            category: "slo",
            message: "💚 System appears healthy — no anomalies detected",
            detail: `Total ${metrics.totalRequests} requests, ${(metrics.errorRate * 100).toFixed(2)}% error rate, avg ${metrics.avgRps.toFixed(1)} RPS.`,
        });
    }

    return insights;
}

export function evaluateSloPass(metrics: RunMetrics, slo: SloConfig): boolean {
    if (slo.sloP95Ms && metrics.p95Ms > slo.sloP95Ms) return false;
    if (slo.sloErrorPct !== null && slo.sloErrorPct !== undefined && metrics.errorRate * 100 > slo.sloErrorPct) return false;
    if (slo.sloMinRps && metrics.avgRps < slo.sloMinRps) return false;
    return true;
}
