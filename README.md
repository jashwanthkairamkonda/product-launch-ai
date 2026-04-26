# ProductLaunch AI

ProductLaunch AI generates a launch plan for any product idea by combining:
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
   - **Hindsight dataset** (launch patterns, benchmarks, failure modes) from `supabase/functions/strategy/hindsight.ts`
   - the **CaseCode flow** style prompts (consistent, scannable outputs)
3. Multiple AI agents run **sequentially**, each producing one piece of the plan.
4. Outputs are streamed back to the client in real time via Server-Sent Events (SSE).

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

## Configuration

### Environment variables

#### Supabase Edge Function (`supabase/functions/strategy/`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `OPENAI_API_KEY` | **Yes** | — | OpenAI API key used for all agent completions. |
| `ALLOWED_ORIGINS` | No | *(localhost only)* | Comma-separated list of allowed CORS origins, e.g. `https://yourapp.com,https://www.yourapp.com`. When unset, only `localhost` / `127.0.0.1` origins are permitted (development fallback). |
| `RATE_LIMIT_REQUESTS` | No | `10` | Maximum number of requests allowed per client per window. |
| `RATE_LIMIT_WINDOW_MS` | No | `60000` | Rate-limit window in milliseconds (default: 60 s). |

#### Frontend (`src/`)

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | **Yes** | Your Supabase project URL. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | **Yes** | Your Supabase anon/publishable key. |

### Deploying the Edge Function

```bash
# Set your secrets
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set ALLOWED_ORIGINS=https://yourapp.com

# Deploy
supabase functions deploy strategy
```

For local development the function is served by `supabase start` / `supabase functions serve`. No `ALLOWED_ORIGINS` configuration is needed because localhost origins are allowed by default.

## SSE API contract

### Endpoint

```
POST https://<project>.supabase.co/functions/v1/strategy
```

### Request

```http
Content-Type: application/json
Authorization: Bearer <supabase-anon-key>

{ "idea": "Your product idea description (min 10 characters)" }
```

### Response

`Content-Type: text/event-stream` — each event is a JSON-encoded `data:` line.

#### Event types

| `event` field | Additional fields | Description |
|---|---|---|
| `agent_start` | `agentId`, `name` | An agent has started processing. |
| `delta` | `agentId`, `text` | A partial text chunk from the current agent. |
| `agent_done` | `agentId` | The current agent has finished. |
| `complete` | — | All agents have finished; stream is closing. |
| `error` | `message` | A recoverable or fatal error occurred. |

#### Example stream

```
data: {"event":"agent_start","agentId":"market","name":"Market Analyzer"}

data: {"event":"delta","agentId":"market","text":"## Market size\n"}

data: {"event":"delta","agentId":"market","text":"Roughly $2B TAM…"}

data: {"event":"agent_done","agentId":"market"}

data: {"event":"agent_start","agentId":"strategy","name":"Strategy Designer"}

...

data: {"event":"complete"}
```

#### Example curl

```bash
curl -N -X POST \
  https://<project>.supabase.co/functions/v1/strategy \
  -H "Authorization: Bearer <anon-key>" \
  -H "Content-Type: application/json" \
  -d '{"idea": "SaaS invoicing tool for freelance designers, $12/mo"}'
```

### Error responses

| HTTP status | Meaning |
|---|---|
| 400 | `idea` missing or too short (< 10 chars). |
| 429 | Rate limit exceeded. Retry after the `Retry-After` header value (seconds). |
| 500 | Server-side error (e.g. missing `OPENAI_API_KEY`). |

## Repository structure
- `src/` — frontend (TanStack Router, React)
- `supabase/` — Supabase configuration and edge functions
- `supabase/functions/strategy/index.ts` — strategy generation function (CORS, rate limiting, SSE, multi-agent execution)
- `supabase/functions/strategy/hindsight.ts` — curated hindsight dataset (extracted module)

## Notes
- The strategy function validates the idea input before running agents.
- CORS is restricted to an explicit allowlist (`ALLOWED_ORIGINS`); wildcard `*` is never used.
- Rate limiting uses an in-memory token bucket keyed by client IP and is intentionally lightweight for edge deployments. Because each edge function instance maintains its own in-memory state, the limit is applied per-instance and is reset on cold starts. For stricter enforcement across a distributed deployment consider a shared store (e.g. Redis or Supabase KV).

