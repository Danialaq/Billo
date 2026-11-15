# Billo — snap a bill, get one tiny step

**Live:** https://billo-liart.vercel.app

Billo is a money coach for ADHD brains. You snap the bill you've been avoiding; AI reads who, how much and when; Billo's rule engine turns it into 1–3 two-minute steps, reminds you on the right day, and celebrates every win.

Built in 24 hours for **Business Cup 2.0** (Zimran × AIESEC, Nazarbayev University, Nov 14–15, 2026). Track: **Money**.

## The problem

- ~15.5M U.S. adults live with ADHD; over half were diagnosed as adults ([CDC via CHADD](https://chadd.org/about-adhd/general-prevalence-adults/)).
- The "ADHD tax" — late fees, forgotten subscriptions, impulse buys, overdrafts — is estimated at **$1,200–3,000 a year** ([ADDA](https://add.org/adhd-tax/)). ~40% of adults with ADHD paid an overdraft fee in a year vs. ~18% overall.
- Budget apps (YNAB, Monarch) need daily discipline; ADHD apps (Inflow, Tiimo) don't touch money. Nobody starts from the moment people actually freeze: a bill in their hand.

## What works in this build

| Flow | What happens |
|---|---|
| **Snap a bill** | Photo, PDF or screenshot → Google Gemini extracts payee, amount, due date, late fee and a one-line plain-English summary. Every field is editable; low confidence is flagged. |
| **Sample bills** | 5 realistic bills (power, parking ticket, subscription, doctor, phone). Samples are rendered to an image and go through the **same AI reading**; if the AI is busy, known values are used so the demo never breaks. |
| **1–3 tiny steps** | Deterministic rules (not AI) decide the steps: pay today, call for a fee waiver or payment plan (with the exact words), pick a pay day 2 days early (.ics reminder), keep-or-cancel for subscriptions, "ask for an itemized bill" for medical bills, turn on autopay. |
| **Today** | Daily check-in: the one most urgent step, streak, late fees avoided, what's coming up. |
| **Money-leak quiz** | 6 taps → personal yearly "ADHD tax" estimate with every assumption shown. |
| **Billo Plus** | Paywall ($9.99/mo or $59.99/yr, 7-day trial). Demo unlocks without payment. |

No account, no database, no bank links. Bills and progress live in `localStorage`. The photo goes to one tiny serverless function (`api/read.js`) that calls Gemini; the API key stays in a server environment variable and never reaches the page.

## Business model and the path to $100M ARR

**What we sell.** Billo Plus: $9.99/month or $59.99/year (7-day trial). Free plan: 3 bill scans a month. The funnel is web-to-app: short-video ad → "How much is your ADHD tax?" quiz → first free bill scan → money-leak map → paywall. The user gets value before being asked to pay.

**Proof people pay in this space.** YNAB ~$47M revenue (2025) with ~450k payers at $109/yr; Monarch Money 500k+ paying subscribers, $850M valuation (2025); Inflow (ADHD program, $96/yr) raised $16.7M; Shimmer ADHD coaching sells at $140–345/month. Nobody combines ADHD-first design with money: budget apps need discipline, ADHD apps skip money.

| Market | Size | Basis |
|---|---|---|
| TAM | 15.5M | U.S. adults with a current ADHD diagnosis (CDC) |
| SAM | ~7–8M | aged 25–45 with money trouble (assumption) |
| SOM, 5 years | 250–400k payers | 3–5% of SAM (assumption) → **$20–32M ARR** at ~$80/yr |

**Ladder to $100M ARR** (expanding outward from the niche, not away from it):

1. Own "ADHD money" in the U.S. — brand, ADHD creators, coaches and clinics as partners. $20–32M.
2. Couples and households — one partner with ADHD, shared bills, higher ARPU (~$120–130).
3. UK, Canada, Australia — same language, same ads.
4. Everyone budgets don't work for — no diagnosis needed.

**~800k payers × ~$125 average revenue ≈ $100M ARR.** For scale, that is less than 2× YNAB's paying base.

**Unit economics (targets for the first 60 days, not results yet).** LTV ≥ $80, CAC < $30 → LTV/CAC ≥ 2.7. Quiz → trial 8–12%, trial → paid 35%+. Cost to serve is low: no database, no bank links, one serverless function; AI cost per scan is a small fraction of a ~$5/month ARPU.

**Risks we are watching.** Retention in an audience that drops apps (we measure D7/D30 first), accuracy on real bill photos, and copycats — answered with brand, partnerships with the ADHD community, and data on what actually gets ADHD bills paid.

## Run locally

```bash
echo GEMINI_API_KEY=your-key > .env.local
python scripts/serve.py 5174
```

Open http://localhost:5174. `scripts/serve.py` serves the static files and the same `POST /api/read` endpoint as the Vercel function. Without a key, sample bills still work (known values) and uploads fall back to typing 3 fields.

## Deploy

Import the repo on Vercel (no build step), add the environment variable `GEMINI_API_KEY`, deploy.

Tests for the step engine and leak map:

```bash
npm test
```

## Structure

```
index.html
css/styles.css
js/
  app.js              hash router
  config.js           AI endpoint
  ai/gemini.js        photo/PDF → downscale → POST /api/read → cleaned fields
  engine/steps.js     bill → 1–3 steps, urgency, today queue, streak
  engine/leaks.js     quiz → money-leak map
  engine/dates.js, money.js, ics.js
  data/samples.js     sample bills rendered as SVG
  ui/                 views: home, scan, bill, today, quiz/leaks/plus
api/read.js           Vercel function: Gemini call with model fallback and timeouts (key from env)
scripts/serve.py      local server with the same /api/read endpoint
tests/engine.test.js  node --test
```

## Design decisions

- **AI reads, rules decide.** The model only extracts what's printed; it never invents advice. Same bill + same day = same steps.
- **Value before the funnel.** The first scan is free and instant; the quiz and paywall come after the user already got a result.
- **Never more than 3 steps, each under 5 minutes.** Built for executive dysfunction, not for spreadsheets.

Not financial advice.
