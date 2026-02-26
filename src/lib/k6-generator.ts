import { Target, TestPlan } from "@prisma/client";

interface RunOverride {
    vus?: number;
    duration?: number;
    envVars?: Record<string, string>;
}

export function generateK6Script(
    target: Target,
    plan: TestPlan,
    override: RunOverride = {}
): string {
    const vus = override.vus ?? plan.vus;
    const duration = override.duration ?? plan.duration;
    const envVars: Record<string, string> = {
        ...(plan.envVars as Record<string, string>),
        ...(override.envVars ?? {}),
    };

    const headers: Record<string, string> = {
        ...(target.defaultHeaders as Record<string, string>),
        ...(plan.headers as Record<string, string>),
    };

    // Auth header injection
    if (target.authType === "BEARER" && target.authValue) {
        headers["Authorization"] = `Bearer ${target.authValue}`;
    } else if (target.authType === "BASIC" && target.authValue) {
        const b64 = Buffer.from(target.authValue).toString("base64");
        headers["Authorization"] = `Basic ${b64}`;
    } else if (target.authType === "API_KEY" && target.authKey && target.authValue) {
        headers[target.authKey] = target.authValue;
    }

    // Build thresholds
    const thresholds: string[] = [];
    if (plan.sloP95Ms) {
        thresholds.push(`  'http_req_duration': ['p(95)<${plan.sloP95Ms}'],`);
    }
    if (plan.sloErrorPct !== null && plan.sloErrorPct !== undefined) {
        thresholds.push(`  'http_req_failed': ['rate<${plan.sloErrorPct / 100}'],`);
    }

    // Stages or simple VU config
    let scenarioConfig: string;
    if (plan.rampUpStages && Array.isArray(plan.rampUpStages) && (plan.rampUpStages as any[]).length > 0) {
        const stages = (plan.rampUpStages as Array<{ duration: string; target: number }>)
            .map((s) => `    { duration: '${s.duration}', target: ${s.target} },`)
            .join("\n");
        scenarioConfig = `  stages: [\n${stages}\n  ],`;
    } else {
        scenarioConfig = `  vus: ${vus},\n  duration: '${duration}s',`;
    }

    // Body for POST/PUT
    let bodyCode = "null";
    if (plan.body && ["POST", "PUT", "PATCH"].includes(plan.method)) {
        let processedBody = plan.body;
        for (const [key, val] of Object.entries(envVars)) {
            processedBody = processedBody.replace(new RegExp(`{{${key}}}`, "g"), val);
        }
        bodyCode = `JSON.stringify(${processedBody})`;
        headers["Content-Type"] = "application/json";
    }

    const headersStr = JSON.stringify(headers, null, 4);
    const url = `${target.baseUrl}${plan.path}`;
    const methodLower = plan.method.toLowerCase();

    const envVarDeclarations = Object.entries(envVars)
        .map(([k, v]) => `const ${k} = __ENV.${k} || '${v}';`)
        .join("\n");

    return `import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Environment variables
${envVarDeclarations}

// Custom metrics
const errorRate = new Rate('custom_errors');
const reqDuration = new Trend('req_duration');

export const options = {
  ${scenarioConfig}
  thresholds: {
${thresholds.join("\n") || "    // no thresholds set"}
  },
};

const BASE_URL = '${url}';
const HEADERS = ${headersStr};

export default function () {
  const res = http.${methodLower}(BASE_URL, ${bodyCode}, { headers: HEADERS, timeout: '${target.timeoutMs}ms' });
  
  const ok = check(res, {
    'status ${plan.expectedStatus}': (r) => r.status === ${plan.expectedStatus},
    'response time < 5s': (r) => r.timings.duration < 5000,
  });

  errorRate.add(!ok);
  reqDuration.add(res.timings.duration);

  sleep(0.1);
}
`;
}
