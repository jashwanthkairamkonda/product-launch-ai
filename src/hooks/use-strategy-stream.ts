import { useCallback, useState } from "react";
import { AGENT_DEFINITIONS } from "@/lib/agents";
import type { AgentState } from "@/components/agent-card";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

function initialAgents(): AgentState[] {
  return AGENT_DEFINITIONS.map((a) => ({ ...a, output: "", status: "pending" }));
}

export function useStrategyStream() {
  const [agents, setAgents] = useState<AgentState[]>(initialAgents);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRun, setHasRun] = useState(false);

  const reset = useCallback(() => {
    setAgents(initialAgents());
    setError(null);
    setHasRun(false);
  }, []);

  const run = useCallback(async (idea: string) => {
    setAgents(initialAgents());
    setError(null);
    setIsStreaming(true);
    setHasRun(true);

    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/strategy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ idea }),
      });

      if (!resp.ok || !resp.body) {
        const text = await resp.text().catch(() => "");
        let msg = `Request failed (${resp.status})`;
        try {
          const j = JSON.parse(text);
          if (j.error) msg = j.error;
        } catch {
          /* ignore */
        }
        setError(msg);
        setIsStreaming(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
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
          if (!json) continue;
          try {
            const evt = JSON.parse(json);
            if (evt.event === "agent_start") {
              setAgents((prev) =>
                prev.map((a) => (a.id === evt.agentId ? { ...a, status: "running" } : a)),
              );
            } else if (evt.event === "delta") {
              setAgents((prev) =>
                prev.map((a) =>
                  a.id === evt.agentId ? { ...a, output: a.output + evt.text } : a,
                ),
              );
            } else if (evt.event === "agent_done") {
              setAgents((prev) =>
                prev.map((a) => (a.id === evt.agentId ? { ...a, status: "done" } : a)),
              );
            } else if (evt.event === "error") {
              setError(evt.message ?? "Something went wrong.");
              done = true;
              break;
            } else if (evt.event === "complete") {
              done = true;
              break;
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setIsStreaming(false);
    }
  }, []);

  return { agents, isStreaming, error, hasRun, run, reset };
}
