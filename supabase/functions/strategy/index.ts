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
    system: `You are the Strategy Designer agent. You have HINDSIGHT from past launches (both a curated dataset and LIVE user-submitted launches).
Use the hindsight to recommend a strategy. Output (markdown):
- **🔍 Hindsight applied** (cite 2–3 specific patterns from the data, with numbers; when a LIVE launch informs the call, mark it "(live)")
- **✅ Recommended price** (with reasoning vs hindsight)
- **✅ Recommended positioning** (one outcome-led headline + why)
- **✅ Target persona** (specific, narrow — not "everyone")
Keep under 200 words. Be opinionated. Reference numbers from the hindsight data.`,
  },
  {
    id: "channel",
    name: "Channel Advisor",
    icon: "C",
    system: `You are the Channel Advisor agent. You have HINDSIGHT from past launches (curated + LIVE user-submitted).
Output (markdown):
- **📢 Best 3 channels** (with hindsight % / numbers for each; mark "(live)" when live data informs it)
- **❌ Avoid** (1–2 channels with hindsight reasoning)
- **🗓 Launch timing** (specific day/week recommendation)
- **🤝 Partnership angle** (one concrete idea)
Keep under 180 words. Cite numbers from hindsight.`,
  },
  {
    id: "risk",
    name: "Risk Manager",
    icon: "R",
    system: `You are the Risk Manager agent. You have HINDSIGHT from past launches (curated + LIVE user-submitted; 82% share failure patterns).
Output (markdown):
- **🚨 Top 3 risk patterns** (from hindsight, with %; note "(live)" when a live-submitted pivot informs the risk)
- **⚠️ This product's risk factors** (Low/Med/High, 3 items)
- **🛡 Mitigation playbook** (week 1–4, concrete actions + targets)
- **📊 Success metrics** (month 1 thresholds: success / on-track / pivot)
Keep under 220 words. Be direct. Use specific numbers.`,
  },
];

function sse(event: string, data: unknown) {
  return `data: ${JSON.stringify({ event, ...(data as object) })}\n\n`;
}

interface LaunchRow {
  idea: string;
  category: string | null;
  price_tier: string | null;
  positioning_style: string | null;
  target_niche: string | null;
  channels: string[] | null;
  had_prelaunch_list: boolean | null;
  launched_day: string | null;
  month1_signups: number | null;
  month1_paying_users: number | null;
  month1_mrr: number | null;
  outcome: "success" | "on_track" | "pivot" | null;
  what_worked: string | null;
  what_flopped: string | null;
}

async function fetchLiveHindsight(): Promise<{ block: string; count: number }> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return { block: "", count: 0 };

  try {
    const resp = await fetch(
      `${url}/rest/v1/launches?status=eq.approved&select=idea,category,price_tier,positioning_style,target_niche,channels,had_prelaunch_list,launched_day,month1_signups,month1_paying_users,month1_mrr,outcome,what_worked,what_flopped&order=created_at.desc&limit=200`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } },
    );
    if (!resp.ok) return { block: "", count: 0 };
    const rows = (await resp.json()) as LaunchRow[];
    if (!Array.isArray(rows) || rows.length === 0) return { block: "", count: 0 };

    const total = rows.length;
    const outcomes = { success: 0, on_track: 0, pivot: 0 };
    const channelWins = new Map<string, { wins: number; total: number }>();
    const priceOutcome = new Map<string, { success: number; total: number }>();
    const positioning = new Map<string, { success: number; total: number }>();
    let listYesSuccess = 0,
      listYesTotal = 0,
      listNoSuccess = 0,
      listNoTotal = 0;
    const mrrs: number[] = [];
    const workedNotes: string[] = [];
    const floppedNotes: string[] = [];

    for (const r of rows) {
      if (r.outcome && r.outcome in outcomes) outcomes[r.outcome]++;
      const isWin = r.outcome === "success";
      for (const c of r.channels ?? []) {
        const cur = channelWins.get(c) ?? { wins: 0, total: 0 };
        cur.total++;
        if (isWin) cur.wins++;
        channelWins.set(c, cur);
      }
      if (r.price_tier) {
        const cur = priceOutcome.get(r.price_tier) ?? { success: 0, total: 0 };
        cur.total++;
        if (isWin) cur.success++;
        priceOutcome.set(r.price_tier, cur);
      }
      if (r.positioning_style) {
        const cur = positioning.get(r.positioning_style) ?? { success: 0, total: 0 };
        cur.total++;
        if (isWin) cur.success++;
        positioning.set(r.positioning_style, cur);
      }
      if (r.had_prelaunch_list === true) {
        listYesTotal++;
        if (isWin) listYesSuccess++;
      } else if (r.had_prelaunch_list === false) {
        listNoTotal++;
        if (isWin) listNoSuccess++;
      }
      if (typeof r.month1_mrr === "number") mrrs.push(r.month1_mrr);
      if (r.what_worked) workedNotes.push(`• (${r.category ?? "?"}) ${r.what_worked.slice(0, 180)}`);
      if (r.what_flopped) floppedNotes.push(`• (${r.category ?? "?"}) ${r.what_flopped.slice(0, 180)}`);
    }

    const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);
    const median = (arr: number[]) => {
      if (arr.length === 0) return 0;
      const s = [...arr].sort((a, b) => a - b);
      const m = Math.floor(s.length / 2);
      return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
    };

    const topChannels = [...channelWins.entries()]
      .filter(([, v]) => v.total >= 2)
      .sort((a, b) => pct(b[1].wins, b[1].total) - pct(a[1].wins, a[1].total))
      .slice(0, 5)
      .map(([c, v]) => `- ${c}: ${pct(v.wins, v.total)}% success rate (${v.wins}/${v.total})`)
      .join("\n");

    const priceLines = [...priceOutcome.entries()]
      .filter(([, v]) => v.total >= 2)
      .map(([k, v]) => `- ${k}: ${pct(v.success, v.total)}% success (${v.success}/${v.total})`)
      .join("\n");

    const posLines = [...positioning.entries()]
      .filter(([, v]) => v.total >= 2)
      .map(([k, v]) => `- ${k}: ${pct(v.success, v.total)}% success (${v.success}/${v.total})`)
      .join("\n");

    const listLine =
      listYesTotal + listNoTotal >= 2
        ? `- With pre-launch list >500: ${pct(listYesSuccess, listYesTotal)}% success (${listYesSuccess}/${listYesTotal})\n- Without: ${pct(listNoSuccess, listNoTotal)}% success (${listNoSuccess}/${listNoTotal})`
        : "";

    const block = `
LIVE HINDSIGHT DATABASE — ${total} founder-submitted launches (aggregated, real outcomes).

OUTCOME MIX:
- Success: ${outcomes.success} (${pct(outcomes.success, total)}%)
- On track: ${outcomes.on_track} (${pct(outcomes.on_track, total)}%)
- Pivot: ${outcomes.pivot} (${pct(outcomes.pivot, total)}%)
- Median month-1 MRR reported: $${median(mrrs)}

${topChannels ? `CHANNEL SUCCESS RATES (LIVE):\n${topChannels}\n` : ""}
${priceLines ? `PRICE TIER OUTCOMES (LIVE):\n${priceLines}\n` : ""}
${posLines ? `POSITIONING OUTCOMES (LIVE):\n${posLines}\n` : ""}
${listLine ? `PRE-LAUNCH LIST (LIVE):\n${listLine}\n` : ""}
${workedNotes.length ? `WHAT WORKED (verbatim, LIVE):\n${workedNotes.slice(0, 10).join("\n")}\n` : ""}
${floppedNotes.length ? `WHAT FLOPPED (verbatim, LIVE):\n${floppedNotes.slice(0, 10).join("\n")}\n` : ""}
`.trim();

    return { block, count: total };
  } catch (e) {
    console.error("live hindsight fetch failed", e);
    return { block: "", count: 0 };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);

  // Lightweight stats endpoint for the UI counter
  if (req.method === "GET" && url.searchParams.get("stats") === "1") {
    const { count } = await fetchLiveHindsight();
    return new Response(JSON.stringify({ liveCount: count, seedCount: 50 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

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

    const { block: liveBlock, count: liveCount } = await fetchLiveHindsight();

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const send = (event: string, data: unknown) =>
          controller.enqueue(encoder.encode(sse(event, data)));

        send("hindsight", { liveCount, seedCount: 50 });

        const previousOutputs: Record<string, string> = {};

        try {
          for (const agent of AGENTS) {
            send("agent_start", { agentId: agent.id, name: agent.name });

            const contextBlocks = [
              `PRODUCT IDEA:\n${idea}`,
              `CURATED HINDSIGHT DATA:\n${HINDSIGHT_LAUNCHES}`,
            ];
            if (liveBlock) contextBlocks.push(liveBlock);
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
