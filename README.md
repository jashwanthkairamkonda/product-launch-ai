# LaunchProduct AI

LaunchProduct AI generates a launch plan for any product idea by combining:
- **CaseCode Flow** (structured step-by-step output flow), and
- **Hindsight** (a curated dataset of past launch patterns),
then running multiple **AI agents** to produce clear, actionable recommendations.

## Why this exists
Most launches fail because founders:
- target too broadly,
- price incorrectly,
- pick weak channels,
- and ship without a clear ICP or pre-launch plan.

This project helps you avoid common mistakes by applying hindsight patterns and producing a structured launch strategy.

## How it works (high level)
1. You submit a **product idea**.
2. The system loads:
   - **Hindsight dataset** (launch patterns, benchmarks, failure modes)
   - the **CaseCode flow** style prompts (consistent, scannable outputs)
3. Multiple AI agents run **sequentially**, each producing one piece of the plan.
4. Outputs are streamed back to the client in real time.

## Agents
The system uses multiple agents, each with a focused role:

- **Market Analyzer**  
  Estimates market size, competitors, market gap, and demand signals.

- **Strategy Designer**  
  Applies hindsight patterns to recommend pricing, positioning, and a narrow target persona.

- **Channel Advisor**  
  Picks the best channels, avoids bad ones, suggests launch timing, and a partnership angle.

- **Risk Manager**  
  Identifies top risks, flags product-specific risk factors, and provides a mitigation playbook with success metrics.

## Streaming output (SSE)
Agent outputs are streamed to the UI using Server-Sent Events (SSE). Typical events:
- `agent_start`
- `delta` (partial text chunks)
- `agent_done`
- `complete`
- `error`

## Repository structure
- `src/` — frontend
- `supabase/` — Supabase configuration and functions
- `supabase/functions/strategy/index.ts` — strategy generation function (SSE + multi-agent execution)

## Notes
- The strategy function validates the idea input before running agents.
- CORS is enabled to allow browser access.
- The hindsight dataset is embedded in the strategy function and is used as context for all agents.
