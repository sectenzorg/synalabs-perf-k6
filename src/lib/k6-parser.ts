export interface K6Summary {
    totalRequests: number;
    errorRate: number;
    p50Ms: number;
    p95Ms: number;
    p99Ms: number;
    avgRps: number;
    durationSec: number;
    statusCodes: Record<string, number>;
    topErrors: Array<{ msg: string; count: number }>;
    series: Array<{
        bucketTs: Date;
        rps: number;
        p95Ms: number;
        errorRate: number;
        activeVus: number;
    }>;
}

/**
 * Parse k6 JSON summary output (from --summary-export flag)
 */
export function parseK6Output(jsonOutput: string, rawStdout: string): K6Summary {
    let summary: K6Summary = {
        totalRequests: 0,
        errorRate: 0,
        p50Ms: 0,
        p95Ms: 0,
        p99Ms: 0,
        avgRps: 0,
        durationSec: 0,
        statusCodes: {},
        topErrors: [],
        series: [],
    };

    try {
        const data = JSON.parse(jsonOutput);
        const metrics = data.metrics || {};

        // Total requests
        summary.totalRequests = metrics.http_reqs?.values?.count ?? 0;

        // Duration
        summary.durationSec = (metrics.http_req_duration?.values?.avg ?? 0) / 1000;

        // Latency percentiles (k6 outputs in ms)
        summary.p50Ms = metrics.http_req_duration?.values?.["p(50)"] ?? 0;
        summary.p95Ms = metrics.http_req_duration?.values?.["p(95)"] ?? 0;
        summary.p99Ms = metrics.http_req_duration?.values?.["p(99)"] ?? 0;

        // Error rate
        summary.errorRate = metrics.http_req_failed?.values?.rate ?? 0;

        // RPS
        summary.avgRps = metrics.http_reqs?.values?.rate ?? 0;

        // Status codes from custom tags if available
        const statusPattern = /status=(\d{3})/g;
        const counts: Record<string, number> = {};
        let m;
        while ((m = statusPattern.exec(rawStdout)) !== null) {
            counts[m[1]] = (counts[m[1]] ?? 0) + 1;
        }
        if (Object.keys(counts).length > 0) {
            summary.statusCodes = counts;
        }
    } catch {
        // Fallback: parse text output
        summary = parseK6TextOutput(rawStdout);
    }

    // Parse series from stdout (k6 outputs progress lines)
    summary.series = parseSeriesFromStdout(rawStdout, summary.durationSec);

    return summary;
}

function parseK6TextOutput(stdout: string): K6Summary {
    const summary: K6Summary = {
        totalRequests: 0,
        errorRate: 0,
        p50Ms: 0,
        p95Ms: 0,
        p99Ms: 0,
        avgRps: 0,
        durationSec: 0,
        statusCodes: {},
        topErrors: [],
        series: [],
    };

    // http_reqs total
    const reqsMatch = stdout.match(/http_reqs\.*:\s+(\d+)\s+([\d.]+)\/s/);
    if (reqsMatch) {
        summary.totalRequests = parseInt(reqsMatch[1]);
        summary.avgRps = parseFloat(reqsMatch[2]);
    }

    // Duration percentiles - k6 format: avg=Xms min=Xms med=Xms max=Xms p(90)=Xms p(95)=Xms
    const durationMatch = stdout.match(
        /http_req_duration.*?avg=([\d.]+)ms.*?med=([\d.]+)ms.*?p\(90\)=([\d.]+)ms.*?p\(95\)=([\d.]+)ms/
    );
    if (durationMatch) {
        summary.p50Ms = parseFloat(durationMatch[2]);
        summary.p95Ms = parseFloat(durationMatch[4]);
    }

    // Alternative p99 extraction
    const p99Match = stdout.match(/p\(99\)=([\d.]+)ms/);
    if (p99Match) summary.p99Ms = parseFloat(p99Match[1]);

    // Error rate
    const failedMatch = stdout.match(/http_req_failed.*?(\d+\.\d+)%/);
    if (failedMatch) summary.errorRate = parseFloat(failedMatch[1]) / 100;

    // Duration
    const durationSecMatch = stdout.match(/running.*?(\d+)s/);
    if (durationSecMatch) summary.durationSec = parseInt(durationSecMatch[1]);

    // Extract status codes from response lines
    const status4xxMatch = stdout.match(/✗.*?status (\d{3})/g);
    if (status4xxMatch) {
        status4xxMatch.forEach((line) => {
            const code = line.match(/(\d{3})/)?.[1];
            if (code) summary.statusCodes[code] = (summary.statusCodes[code] ?? 0) + 1;
        });
    }

    return summary;
}

function parseSeriesFromStdout(
    stdout: string,
    totalDuration: number
): K6Summary["series"] {
    // k6 outputs progress every second: "default↑  1 looping VUs  1.0s / 30s"
    // We'll synthesize a simple series bucket from aggregated data
    const lines = stdout.split("\n");
    const series: K6Summary["series"] = [];
    const now = new Date();

    // Generate uniform series if we can't parse exact buckets
    const buckets = Math.max(Math.round(totalDuration / 5), 1);
    for (let i = 0; i < buckets; i++) {
        const ts = new Date(now.getTime() - (totalDuration - i * 5) * 1000);
        series.push({
            bucketTs: ts,
            rps: 0,
            p95Ms: 0,
            errorRate: 0,
            activeVus: 0,
        });
    }

    // Try to parse real bucket data from stdout metric lines
    lines.forEach((line) => {
        const bucketMatch = line.match(/^(\d+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
        if (bucketMatch) {
            const idx = parseInt(bucketMatch[1]);
            if (idx < series.length) {
                series[idx].rps = parseFloat(bucketMatch[2]);
                series[idx].p95Ms = parseFloat(bucketMatch[3]);
                series[idx].errorRate = parseFloat(bucketMatch[4]);
            }
        }
    });

    return series;
}
