import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { HINDSIGHT_LAUNCHES } from "./hindsight.ts";

// ---------- CORS ----------

const CORS_ALLOW_HEADERS =
  "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version";

// Comma-separated list of allowed origins, e.g.:
//   ALLOWED_ORIGINS=https://yourapp.com,https://www.yourapp.com
// When unset, only localhost origins are allowed (development fallback).
const ALLOWED_ORIGINS: string[] = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const LOCAL_ORIGIN_RE = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

function resolveOrigin(origin: string | null): string {
  if (!origin) return "null";
  if (ALLOWED_ORIGINS.length > 0) {
    return ALLOWED_ORIGINS.includes(origin) ? origin : "null";
  }
  // No allowlist configured — permit localhost for development only.
  return LOCAL_ORIGIN_RE.test(origin) ? origin : "null";
}

function corsHeaders(origin: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": resolveOrigin(origin),
    "Access-Control-Allow-Headers": CORS_ALLOW_HEADERS,
    "Vary": "Origin",
  };
}

// ---------- Rate limiting (token bucket, in-memory) ----------

const RATE_LIMIT_REQUESTS = Number(Deno.env.get("RATE_LIMIT_REQUESTS") ?? "10");
const RATE_LIMIT_WINDOW_MS = Number(Deno.env.get("RATE_LIMIT_WINDOW_MS") ?? "60000");

interface Bucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, Bucket>();

function getClientId(req: Request): string {
  // Best-effort client identifier from standard proxy headers.
  // Requests with no identifiable IP header share a single "unknown" bucket,
  // which is an acceptable trade-off for edge deployments where Supabase
  // infrastructure always injects IP headers for real traffic.
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  let bucket = buckets.get(clientId);
  if (!bucket) {
    buckets.set(clientId, { tokens: RATE_LIMIT_REQUESTS - 1, lastRefill: now });
    return true;
  }
  const elapsed = now - bucket.lastRefill;
  const windows = Math.floor(elapsed / RATE_LIMIT_WINDOW_MS);
  if (windows > 0) {
    bucket.tokens = Math.min(RATE_LIMIT_REQUESTS, bucket.tokens + windows * RATE_LIMIT_REQUESTS);
    // Advance lastRefill by exactly the consumed windows to preserve fractional credit.
    bucket.lastRefill += windows * RATE_LIMIT_WINDOW_MS;
  }
  if (bucket.tokens <= 0) return false;
  bucket.tokens -= 1;
  return true;
}

const AGENTS = [
  {
    id: "market",
    name: "Market Analyzer",
    icon: "M",
    system: `You are the Market Analyzer agent. Your job: analyze the market for the user's product idea.
Output (markdown, terse, scannable):
- **Market size** (rough $ estimate with reasoning)
- **Top 3 competitors** (name + one-line positioning)
- **Market gap** (one specific underserved segment)
- **Demand signals** (2–3 concrete indicators)
Keep under 180 words. No fluff. Use bullet points.`,
  },
  {
    id: "strategy",
    name: "Strategy Designer",
    icon: "S",
    system: `You are the Strategy Designer agent. You have HINDSIGHT from 50 past launches.
Use the hindsight to recommend a strategy. Output (markdown):
- **🔍 Hindsight applied** (cite 2–3 specific patterns from the data, with numbers)
- **✅ Recommended price** (with reasoning vs hindsight)
- **✅ Recommended positioning** (one outcome-led headline + why)
- **✅ Target persona** (specific, narrow — not "everyone")
Keep under 200 words. Be opinionated. Reference numbers from the hindsight data.`,
  },
  {
    id: "channel",
    name: "Channel Advisor",
    icon: "C",
    system: `You are the Channel Advisor agent. You have HINDSIGHT from 50 past launches.
Output (markdown):
- **📢 Best 3 channels** (with hindsight % / numbers for each)
- **❌ Avoid** (1–2 channels with hindsight reasoning)
- **🗓 Launch timing** (specific day/week recommendation)
- **🤝 Partnership angle** (one concrete idea)
Keep under 180 words. Cite numbers from hindsight.`,
  },
  {
    id: "risk",
    name: "Risk Manager",
    icon: "R",
    system: `You are the Risk Manager agent. You have HINDSIGHT from 50 past launches (82% failure patterns).
Output (markdown):
- **🚨 Top 3 risk patterns** (from hindsight, with %)
- **⚠️ This product's risk factors** (Low/Med/High, 3 items)
- **🛡 Mitigation playbook** (week 1–4, concrete actions + targets)
- **📊 Success metrics** (month 1 thresholds: success / on-track / pivot)
Keep under 220 words. Be direct. Use specific numbers.`,
  },
];

function sse(event: string, data: unknown) {
  return `data: ${JSON.stringify({ event, ...(data as object) })}\n\n`;
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const cors = corsHeaders(origin);

  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  // Rate limiting
  const clientId = getClientId(req);
  if (!checkRateLimit(clientId)) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please wait a moment and try again." }),
      { status: 429, headers: { ...cors, "Content-Type": "application/json", "Retry-After": "60" } },
    );
  }

  try {
    const { idea } = await req.json();
    if (!idea || typeof idea !== "string" || idea.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: "Please describe your product idea (at least 10 characters)." }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY is not configured." }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const send = (event: string, data: unknown) =>
          controller.enqueue(encoder.encode(sse(event, data)));

        const previousOutputs: Record<string, string> = {};

        try {
          for (const agent of AGENTS) {
            send("agent_start", { agentId: agent.id, name: agent.name });

            const contextBlocks = [
              `PRODUCT IDEA:\n${idea}`,
              `HINDSIGHT DATA:\n${HINDSIGHT_LAUNCHES}`,
            ];
            if (Object.keys(previousOutputs).length > 0) {
              contextBlocks.push(
                `PREVIOUS AGENT FINDINGS:\n${Object.entries(previousOutputs)
                  .map(([k, v]) => `--- ${k} ---\n${v}`)
                  .join("\n\n")}`,
              );
            }

           const resp = await fetch("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${OPENAI_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "gpt-4.1-mini",
    stream: true,
    messages: [
      { role: "system", content: agent.system },
      { role: "user", content: contextBlocks.join("\n\n") },
    ],
  }),
});

            if (!resp.ok) {
              if (resp.status === 429) {
                send("error", { message: "Rate limit reached. Please try again in a moment." });
                controller.close();
                return;
              }
              if (resp.status === 402) {
                send("error", {
                  message: "AI credits exhausted. Add credits in Settings → Workspace → Usage.",
                });
                controller.close();
                return;
              }
              const t = await resp.text();
              console.error("AI gateway error", resp.status, t);
              send("error", { message: `AI gateway error (${resp.status})` });
              controller.close();
              return;
            }

            const reader = resp.body!.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            let agentOutput = "";
            let done = false;

            while (!done) {
              const { value, done: rdDone } = await reader.read();
              if (rdDone) break;
              buffer += decoder.decode(value, { stream: true });

              let nl: number;
              while ((nl = buffer.indexOf("\n")) !== -1) {
                let line = buffer.slice(0, nl);
                buffer = buffer.slice(nl + 1);
                if (line.endsWith("\r")) line = line.slice(0, -1);
                if (!line.startsWith("data: ")) continue;
                const json = line.slice(6).trim();
                if (json === "[DONE]") {
                  done = true;
                  break;
                }
                try {
                  const parsed = JSON.parse(json);
                  const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
                  if (delta) {
                    agentOutput += delta;
                    send("delta", { agentId: agent.id, text: delta });
                  }
                } catch {
                  buffer = line + "\n" + buffer;
                  break;
                }
              }
            }

            previousOutputs[agent.name] = agentOutput;
            send("agent_done", { agentId: agent.id });
          }

          send("complete", {});
          controller.close();
        } catch (e) {
          console.error("stream error", e);
          send("error", { message: e instanceof Error ? e.message : "Unknown error" });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...cors,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
      },
    });
  } catch (e) {
    console.error("strategy error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
});
