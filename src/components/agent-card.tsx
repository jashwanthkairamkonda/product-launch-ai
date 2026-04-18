import ReactMarkdown from "react-markdown";
import { Check, Loader2 } from "lucide-react";

export type AgentStatus = "pending" | "running" | "done";

export interface AgentState {
  id: string;
  name: string;
  icon: string;
  blurb: string;
  output: string;
  status: AgentStatus;
}

const ACCENTS: Record<string, { bg: string; text: string; ring: string }> = {
  market: { bg: "bg-brand/8", text: "text-brand", ring: "ring-brand/20" },
  strategy: { bg: "bg-accent/15", text: "text-[oklch(45%_0.13_70)]", ring: "ring-accent/30" },
  channel: { bg: "bg-brand/8", text: "text-brand", ring: "ring-brand/20" },
  risk: { bg: "bg-accent/15", text: "text-[oklch(45%_0.13_70)]", ring: "ring-accent/30" },
};

export function AgentCard({ agent, index }: { agent: AgentState; index: number }) {
  const accent = ACCENTS[agent.id] ?? ACCENTS.market;
  const isPending = agent.status === "pending";
  const isRunning = agent.status === "running";
  const isDone = agent.status === "done";

  return (
    <article
      className={`relative rounded-2xl border bg-card p-6 transition-all duration-500 sm:p-8 ${
        isPending
          ? "border-border opacity-50"
          : isRunning
            ? "border-brand/40 shadow-[var(--shadow-lift)] ring-1 ring-brand/10"
            : "border-border shadow-[var(--shadow-soft)]"
      }`}
    >
      <header className="mb-5 flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${accent.bg} ring-1 ${accent.ring}`}
          >
            <span className={`font-serif text-3xl ${accent.text}`}>{agent.icon}</span>
          </div>
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Agent 0{index + 1}
            </p>
            <h3 className="font-serif text-2xl text-foreground">{agent.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{agent.blurb}</p>
          </div>
        </div>
        <div className="shrink-0">
          {isPending && (
            <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground/70">
              Queued
            </span>
          )}
          {isRunning && (
            <span className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1 font-mono text-xs uppercase tracking-wider text-brand">
              <Loader2 className="h-3 w-3 animate-spin" />
              Thinking
            </span>
          )}
          {isDone && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1 font-mono text-xs uppercase tracking-wider text-brand">
              <Check className="h-3 w-3" />
              Done
            </span>
          )}
        </div>
      </header>

      {(isRunning || isDone) && (
        <div className="prose prose-sm max-w-none text-foreground prose-headings:font-serif prose-headings:text-foreground prose-strong:text-foreground prose-strong:font-semibold prose-ul:my-2 prose-li:my-0.5 prose-p:my-2">
          <ReactMarkdown>{agent.output || ""}</ReactMarkdown>
          {isRunning && (
            <span
              aria-hidden
              className="ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 animate-pulse bg-brand"
            />
          )}
        </div>
      )}
    </article>
  );
}
