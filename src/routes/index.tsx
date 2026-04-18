import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import heroImage from "@/assets/hero-synthesis.jpg";
import { IdeaInput } from "@/components/idea-input";
import { AgentCard } from "@/components/agent-card";
import { useStrategyStream } from "@/hooks/use-strategy-stream";
import { AGENT_DEFINITIONS } from "@/lib/agents";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "ProductLaunch AI — Your AI Co-Pilot for Flawless Launches" },
      {
        name: "description",
        content:
          "Four specialized AI agents analyze your product idea and design a complete go-to-market strategy — with hindsight from 50 past launches.",
      },
      { property: "og:title", content: "ProductLaunch AI — Strategy from Hindsight" },
      {
        property: "og:description",
        content:
          "Market sizing, pricing, channels, and risk — generated in seconds by 4 AI agents that learn from real launch data.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
});

function Index() {
  const { agents, isStreaming, error, hasRun, run } = useStrategyStream();
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hasRun && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [hasRun]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Subtle paper texture via gradient */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 opacity-60"
        style={{ background: "var(--gradient-warm)" }}
      />

      {/* Header */}
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 pt-8 lg:px-12">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-paper">
            <span className="font-serif text-xl leading-none">P</span>
          </div>
          <span className="font-serif text-2xl text-brand">ProductLaunch AI</span>
        </div>
        <nav className="hidden items-center gap-x-8 text-sm font-medium md:flex">
          <a href="#how" className="text-foreground/70 transition-colors hover:text-brand">
            How it works
          </a>
          <a href="#hindsight" className="text-foreground/70 transition-colors hover:text-brand">
            Hindsight
          </a>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 pt-12 pb-20 lg:px-12 lg:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                Hindsight from 50 past launches
              </span>
            </div>
            <h1 className="font-serif text-5xl leading-[1.05] text-brand sm:text-6xl lg:text-7xl">
              Your AI co-pilot for flawless product launches.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-foreground/80 sm:text-xl">
              Four specialized agents analyze your idea, design the strategy, pick the channels,
              and surface the risks — informed by what actually worked (and didn&apos;t) for past
              launches.
            </p>
            <div className="mt-10">
              <IdeaInput onSubmit={run} isStreaming={isStreaming} />
            </div>
          </div>
          <div className="relative order-first lg:order-last">
            <div className="relative aspect-square overflow-hidden rounded-3xl bg-gradient-to-tr from-brand/8 to-accent/15 p-3 shadow-[var(--shadow-lift)]">
              <img
                src={heroImage}
                alt="Four interlocking forms representing AI agents synthesizing a launch strategy"
                width={1024}
                height={1024}
                className="h-full w-full rounded-2xl object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Agent results / how it works */}
      <section
        id="how"
        ref={resultsRef}
        className="border-t border-border bg-[oklch(96%_0.015_85)]/60 py-20 lg:py-28"
      >
        <div className="mx-auto max-w-5xl px-6 lg:px-12">
          <div className="mb-12 text-center">
            <p className="font-mono text-xs uppercase tracking-wider text-accent-foreground/80">
              {hasRun ? "Live synthesis" : "How the agents work"}
            </p>
            <h2 className="mt-2 font-serif text-4xl text-brand sm:text-5xl">
              {hasRun ? "Your launch strategy" : "Four agents. One strategy."}
            </h2>
            {!hasRun && (
              <p className="mx-auto mt-4 max-w-2xl text-foreground/70">
                Each agent runs in sequence, building on the last. Strategy, Channel, and Risk
                cite specific patterns from past launches.
              </p>
            )}
          </div>

          {error && (
            <div className="mb-8 rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
              <strong className="font-semibold">Error:</strong> {error}
            </div>
          )}

          <div className="space-y-6">
            {(hasRun ? agents : AGENT_DEFINITIONS.map((a) => ({ ...a, output: "", status: "pending" as const }))).map(
              (agent, i) => (
                <AgentCard key={agent.id} agent={agent} index={i} />
              ),
            )}
          </div>

          {!hasRun && (
            <p className="mt-12 text-center text-sm text-muted-foreground">
              Drop an idea above to see the agents work.
            </p>
          )}
        </div>
      </section>

      {/* Hindsight callout */}
      <section id="hindsight" className="mx-auto max-w-5xl px-6 py-20 lg:px-12 lg:py-28">
        <div className="rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-soft)] sm:p-12">
          <div className="grid gap-8 sm:grid-cols-3">
            <div>
              <p className="font-serif text-5xl text-brand">82%</p>
              <p className="mt-2 text-sm text-muted-foreground">
                of failed launches share 3+ common patterns. We surface them before you ship.
              </p>
            </div>
            <div>
              <p className="font-serif text-5xl text-brand">23%</p>
              <p className="mt-2 text-sm text-muted-foreground">
                avg CTR for outcome-led positioning vs. 5% for feature-led copy.
              </p>
            </div>
            <div>
              <p className="font-serif text-5xl text-brand">8×</p>
              <p className="mt-2 text-sm text-muted-foreground">
                more likely to hit $1K MRR in month one with a 500+ pre-launch list.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-10">
        <div className="mx-auto max-w-7xl px-6 text-center text-sm text-muted-foreground lg:px-12">
          © {new Date().getFullYear()} ProductLaunch AI · Crafted with intelligence and artistry.
        </div>
      </footer>
    </div>
  );
}
