// Curated hindsight dataset derived from 50 past product launches (anonymized).
export const HINDSIGHT_LAUNCHES = `
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
