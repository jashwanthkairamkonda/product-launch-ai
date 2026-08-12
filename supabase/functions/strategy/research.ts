// Live web research via the Firecrawl connector (gateway-backed).
const GATEWAY = "https://connector-gateway.lovable.dev/firecrawl/v2";

export interface ResearchSource {
  title: string;
  url: string;
}

export interface WebResearch {
  block: string;
  sources: ResearchSource[];
}

interface SearchResult {
  url?: string;
  title?: string;
  description?: string;
  markdown?: string;
}

async function search(
  query: string,
  lovableKey: string,
  firecrawlKey: string,
  limit: number,
): Promise<SearchResult[]> {
  const resp = await fetch(`${GATEWAY}/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": firecrawlKey,
    },
    body: JSON.stringify({
      query,
      limit,
      tbs: "qdr:y",
      scrapeOptions: { formats: ["markdown"] },
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    console.error(`Firecrawl search failed [${resp.status}]: ${body}`);
    return [];
  }

  const json = (await resp.json()) as { data?: SearchResult[]; web?: SearchResult[] };
  return json.data ?? json.web ?? [];
}

export async function fetchWebResearch(idea: string): Promise<WebResearch> {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!lovableKey || !firecrawlKey) return { block: "", sources: [] };

  const topic = idea.slice(0, 160);
  const queries = [
    `${topic} competitors pricing comparison`,
    `${topic} market size growth trends`,
  ];

  try {
    const batches = await Promise.all(
      queries.map((q) => search(q, lovableKey, firecrawlKey, 4)),
    );

    const seen = new Set<string>();
    const sources: ResearchSource[] = [];
    const chunks: string[] = [];

    batches.flat().forEach((r) => {
      if (!r.url || seen.has(r.url)) return;
      seen.add(r.url);
      sources.push({ title: r.title ?? r.url, url: r.url });
      const body = (r.markdown ?? r.description ?? "").replace(/\s+/g, " ").slice(0, 1200);
      if (body) chunks.push(`SOURCE: ${r.title ?? r.url} (${r.url})\n${body}`);
    });

    if (chunks.length === 0) return { block: "", sources };

    const block = `
LIVE WEB RESEARCH — fetched just now from the open web (last 12 months).
Use these for current competitors, real prices, market size figures and recent trends.
Cite the source name inline when you use a fact, e.g. "(per TechCrunch)".

${chunks.slice(0, 8).join("\n\n")}
`.trim();

    return { block, sources };
  } catch (e) {
    console.error("web research failed", e);
    return { block: "", sources: [] };
  }
}
