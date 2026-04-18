import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";

const EXAMPLES = [
  "SaaS tool for freelancers to manage invoices, $15/month",
  "AI meal-planner app for busy parents, $9/month",
  "Marketplace connecting indie game devs with playtesters",
];

interface IdeaInputProps {
  onSubmit: (idea: string) => void;
  isStreaming: boolean;
}

export function IdeaInput({ onSubmit, isStreaming }: IdeaInputProps) {
  const [value, setValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed.length < 10 || isStreaming) return;
    onSubmit(trimmed);
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="relative">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={isStreaming}
          placeholder="e.g., SaaS tool for freelancers to manage invoices, $15/month"
          rows={3}
          className="w-full resize-none rounded-2xl border-2 border-border bg-card px-5 py-4 pr-4 pb-16 text-base text-foreground shadow-[var(--shadow-soft)] placeholder:text-muted-foreground/70 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-60"
          aria-label="Describe your product idea"
        />
        <button
          type="submit"
          disabled={value.trim().length < 10 || isStreaming}
          className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 font-semibold text-accent-foreground shadow-md shadow-accent/30 transition-all hover:shadow-lg hover:shadow-accent/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isStreaming ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate Strategy
            </>
          )}
        </button>
      </form>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">Try:</span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            disabled={isStreaming}
            onClick={() => setValue(ex)}
            className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-brand/40 hover:text-brand disabled:opacity-50"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
