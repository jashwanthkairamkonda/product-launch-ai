import { useState } from "react";
import { Loader2, Check, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const CHANNEL_OPTIONS = [
  "Product Hunt",
  "Reddit",
  "Twitter / X",
  "LinkedIn",
  "SEO",
  "Cold email",
  "Facebook / Meta ads",
  "Google ads",
  "Partnerships",
  "Community",
];

const DAY_OPTIONS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface OutcomeFormProps {
  seedIdea?: string;
}

export function OutcomeForm({ seedIdea }: OutcomeFormProps) {
  const [expanded, setExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [idea, setIdea] = useState(seedIdea ?? "");
  const [category, setCategory] = useState("");
  const [priceTier, setPriceTier] = useState("");
  const [positioningStyle, setPositioningStyle] = useState("");
  const [targetNiche, setTargetNiche] = useState("");
  const [channels, setChannels] = useState<string[]>([]);
  const [hadPrelaunchList, setHadPrelaunchList] = useState<"yes" | "no" | "">("");
  const [launchedDay, setLaunchedDay] = useState("");
  const [month1Signups, setMonth1Signups] = useState("");
  const [month1PayingUsers, setMonth1PayingUsers] = useState("");
  const [month1Mrr, setMonth1Mrr] = useState("");
  const [outcome, setOutcome] = useState<"success" | "on_track" | "pivot" | "">("");
  const [whatWorked, setWhatWorked] = useState("");
  const [whatFlopped, setWhatFlopped] = useState("");
  const [submitterEmail, setSubmitterEmail] = useState("");

  const toggleChannel = (c: string) =>
    setChannels((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  const toNum = (v: string): number | null => {
    const n = Number(v.replace(/[, ]/g, ""));
    return Number.isFinite(n) && v.trim() !== "" ? n : null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (idea.trim().length < 5) {
      setError("Please describe your product idea.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: insertError } = await (supabase as any).from("launches").insert({
        idea: idea.trim().slice(0, 500),
        category: category.trim().slice(0, 80) || null,
        price_tier: priceTier.trim().slice(0, 40) || null,
        positioning_style: positioningStyle.trim().slice(0, 40) || null,
        target_niche: targetNiche.trim().slice(0, 200) || null,
        channels,
        had_prelaunch_list:
          hadPrelaunchList === "yes" ? true : hadPrelaunchList === "no" ? false : null,
        launched_day: launchedDay || null,
        month1_signups: toNum(month1Signups),
        month1_paying_users: toNum(month1PayingUsers),
        month1_mrr: toNum(month1Mrr),
        outcome: outcome || null,
        what_worked: whatWorked.trim().slice(0, 1000) || null,
        what_flopped: whatFlopped.trim().slice(0, 1000) || null,
        submitter_email: submitterEmail.trim().slice(0, 200) || null,
        status: "pending",
      });
      if (insertError) throw insertError;
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-3xl border border-brand/20 bg-brand/5 p-8 text-center sm:p-12">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand text-paper">
          <Check className="h-6 w-6" />
        </div>
        <h3 className="font-serif text-3xl text-brand">Thank you.</h3>
        <p className="mx-auto mt-3 max-w-lg text-foreground/70">
          Your launch is queued for review. Once approved, it joins the hindsight database and
          helps shape every future strategy — including yours next time.
        </p>
      </div>
    );
  }

  if (!expanded) {
    return (
      <div className="rounded-3xl border border-accent/30 bg-gradient-to-br from-accent/10 to-brand/5 p-8 sm:p-12">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-accent/40 bg-card/60 px-3 py-1 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-accent-foreground" />
              <span className="font-mono text-xs uppercase tracking-wider text-accent-foreground/80">
                Feed the hindsight
              </span>
            </div>
            <h3 className="font-serif text-3xl text-brand sm:text-4xl">
              Come back after launch. Report what happened.
            </h3>
            <p className="mt-3 max-w-xl text-foreground/70">
              MRR, signups, what worked, what flopped. Your outcome makes the next founder&apos;s
              strategy sharper — and the hindsight compounds.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-accent px-5 py-3 font-semibold text-accent-foreground shadow-md shadow-accent/30 transition-all hover:shadow-lg hover:shadow-accent/40"
          >
            Report your outcome
          </button>
        </div>
      </div>
    );
  }

  const inputCls =
    "w-full rounded-xl border-2 border-border bg-card px-4 py-2.5 text-sm text-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";
  const labelCls = "mb-1.5 block font-mono text-xs uppercase tracking-wider text-muted-foreground";

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] sm:p-10"
    >
      <div className="mb-8">
        <p className="font-mono text-xs uppercase tracking-wider text-accent-foreground/80">
          Report a launch outcome
        </p>
        <h3 className="mt-1 font-serif text-3xl text-brand">Tell us what actually happened.</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          All fields optional except your product. Submissions are reviewed before joining the
          public hindsight database.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelCls}>Product / idea</label>
          <input
            className={inputCls}
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="SaaS tool for freelancers to manage invoices, $15/month"
            maxLength={500}
          />
        </div>
        <div>
          <label className={labelCls}>Category</label>
          <input
            className={inputCls}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="SaaS, dev tool, marketplace…"
            maxLength={80}
          />
        </div>
        <div>
          <label className={labelCls}>Price tier</label>
          <input
            className={inputCls}
            value={priceTier}
            onChange={(e) => setPriceTier(e.target.value)}
            placeholder="$9/mo, $29/mo, free…"
            maxLength={40}
          />
        </div>
        <div>
          <label className={labelCls}>Positioning style</label>
          <select
            className={inputCls}
            value={positioningStyle}
            onChange={(e) => setPositioningStyle(e.target.value)}
          >
            <option value="">—</option>
            <option value="outcome-led">Outcome-led</option>
            <option value="identity-led">Identity-led</option>
            <option value="feature-led">Feature-led</option>
            <option value="generic">Generic / all-in-one</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Target niche</label>
          <input
            className={inputCls}
            value={targetNiche}
            onChange={(e) => setTargetNiche(e.target.value)}
            placeholder="Solo freelance designers $50–100K"
            maxLength={200}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Channels used</label>
          <div className="flex flex-wrap gap-2">
            {CHANNEL_OPTIONS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => toggleChannel(c)}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  channels.includes(c)
                    ? "border-brand bg-brand text-paper"
                    : "border-border bg-card text-muted-foreground hover:border-brand/40 hover:text-brand"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={labelCls}>Pre-launch email list &gt; 500?</label>
          <div className="flex gap-2">
            {(["yes", "no"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setHadPrelaunchList(v)}
                className={`rounded-full border px-4 py-1.5 text-xs uppercase tracking-wider transition-colors ${
                  hadPrelaunchList === v
                    ? "border-brand bg-brand text-paper"
                    : "border-border bg-card text-muted-foreground hover:border-brand/40"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={labelCls}>Launched on</label>
          <select
            className={inputCls}
            value={launchedDay}
            onChange={(e) => setLaunchedDay(e.target.value)}
          >
            <option value="">—</option>
            {DAY_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Month 1 signups</label>
          <input
            className={inputCls}
            value={month1Signups}
            onChange={(e) => setMonth1Signups(e.target.value)}
            inputMode="numeric"
            placeholder="312"
          />
        </div>
        <div>
          <label className={labelCls}>Month 1 paying users</label>
          <input
            className={inputCls}
            value={month1PayingUsers}
            onChange={(e) => setMonth1PayingUsers(e.target.value)}
            inputMode="numeric"
            placeholder="42"
          />
        </div>
        <div>
          <label className={labelCls}>Month 1 MRR (USD)</label>
          <input
            className={inputCls}
            value={month1Mrr}
            onChange={(e) => setMonth1Mrr(e.target.value)}
            inputMode="numeric"
            placeholder="1250"
          />
        </div>
        <div>
          <label className={labelCls}>How would you call it?</label>
          <select
            className={inputCls}
            value={outcome}
            onChange={(e) => setOutcome(e.target.value as typeof outcome)}
          >
            <option value="">—</option>
            <option value="success">Success</option>
            <option value="on_track">On track</option>
            <option value="pivot">Pivot signal</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>What worked</label>
          <textarea
            rows={3}
            className={inputCls + " resize-none"}
            value={whatWorked}
            onChange={(e) => setWhatWorked(e.target.value)}
            placeholder="Product Hunt Tue launch drove 60% of signups; outcome-led headline doubled CTR."
            maxLength={1000}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>What flopped</label>
          <textarea
            rows={3}
            className={inputCls + " resize-none"}
            value={whatFlopped}
            onChange={(e) => setWhatFlopped(e.target.value)}
            placeholder="$50 Facebook ads lost — SaaS under $50/mo. Broad targeting killed conversion."
            maxLength={1000}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Your email (optional, if we can follow up)</label>
          <input
            className={inputCls}
            type="email"
            value={submitterEmail}
            onChange={(e) => setSubmitterEmail(e.target.value)}
            placeholder="you@company.com"
            maxLength={200}
          />
        </div>
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="mt-8 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting || idea.trim().length < 5}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 font-semibold text-accent-foreground shadow-md shadow-accent/30 transition-all hover:shadow-lg hover:shadow-accent/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Submitting
            </>
          ) : (
            <>Submit outcome</>
          )}
        </button>
      </div>
    </form>
  );
}
