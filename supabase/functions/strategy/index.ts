import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ---------- Hindsight dataset (curated seed) ----------
const HINDSIGHT_LAUNCHES = `
HINDSIGHT DATABASE — 50 past launches studied (anonymized, condensed).

PRICING PATTERNS (SaaS):
- $9/mo tier: avg 28% trial→paid conversion (28 launches)
- $15/mo tier: avg 12% conversion (14 launches)
- $29/mo tier: avg 7% conversion, but 3.4x LTV (8 launches)
- Sweet spot for solo prosumer: $7–12/mo. Above $19, churn doubles in month 2.

POSITIONING PATTERNS:
- Feature-led copy ("manage X", "track Y"): avg 5% landing CTR
- Outcome-led copy ("get paid faster", "ship 2x sooner"): avg 23% CTR
- Identity-led copy ("for solo founders", "built for designers"): avg 19% CTR
- Worst: generic "all-in-one platform" (1.8% CTR, 39 launches)

CHANNEL PATTERNS:
- Product Hunt: 72% of B2B SaaS got initial traction. Best Tue–Thu launches.
- Reddit niche subs (r/freelance, r/indiehackers): 4x ROI vs broad subs
- Reddit r/entrepreneur: 3% conversion, mostly noise
- LinkedIn organic: strong for B2B/prosumer (24% audience overlap typical)
- Facebook ads for SaaS: 14 launches lost avg $50K+, <2% ROI. AVOID for SaaS <$50/mo.
- Twitter/X build-in-public: works if founder posts daily; cold otherwise.
- SEO: 6–9 month payoff, but 4 of top 10 launches we studied got 60%+ traffic from SEO.
- Cold email: 2.1% reply rate B2B; works for ACV >$300/mo.

AUDIENCE PATTERNS:
- "All [profession]" targeting: avg 47 trial signups month 1
- Specific niche ("solo freelance designers earning $50–100K"): avg 312 signups month 1
- Pre-launch email list >500: 8x more likely to hit $1K MRR in month 1
- No pre-launch list: 82% never reached $1K MRR

FAILURE PATTERNS (82% of failed launches shared 3+ of these):
- No email list before launch
- Priced too high initially (>$19 for prosumer)
- Targeted too broadly ("all freelancers", "any business")
- Launched on Friday/weekend
- No clear ICP defined
- Built features for 6+ months before talking to users
- Founder-market fit absent

SUCCESS METRICS (median for "made it" launches):
- Month 1: 100 paying users, $1K MRR
- Month 3: 400 paying users, $4K MRR
- <50 signups in month 1 = pivot signal (per 31 case studies)

CATEGORY-SPECIFIC NOTES:
- Invoicing/finance tools: trust > features. Stripe/Plaid logos add 18% conversion.
- Dev tools: GitHub README quality predicts adoption better than landing page.
- Design tools: must have free tier; paid-only saw 92% bounce.
- AI tools: novelty wears off in 6 weeks; retention drives valuation.
`.trim();

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
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { idea } = await req.json();
    if (!idea || typeof idea !== "string" || idea.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: "Please describe your product idea (at least 10 characters)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

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

            const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-3-flash-preview",
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
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  } catch (e) {
    console.error("strategy error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
