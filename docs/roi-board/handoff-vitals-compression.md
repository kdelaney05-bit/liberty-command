# Vitals compression — the owner console hero

**What changed:** the first screen on login. `index.html` opened on THE PULSE — a
composite trace plus five full rails, each rail nearly as tall as the composite
above it. Six things competing to be read first, so none of them was. It is
replaced by one master heartbeat and a 2×2 of micro vitals, and the whole hero
fits a 390px phone with nothing scrolled.

Nothing the pulse card **measured** was dropped. Every rail's sub-vitals, brand
cuts, aging buckets and withheld-feed notes are carried whole into the four
expanded cards. What was deleted is the drawing code for a card that no longer
exists (`pulseTrace`, `pulseFlat`, `pulseDrill`, and their CSS).

---

## 1 · The shape

```
VITALS · THE BUSINESS            [CC LIVE] [QB]

┌──────────────────────────────────────────┐
│ THE BUSINESS                  in rhythm  │   ← the only large element
│ 94  OF 100 HEALTH                        │
│ ∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿  ●            │
│ BLENDED, WEEK BY WEEK  ╌╌ median of your │
│                           last 8 weeks   │
└──────────────────────────────────────────┘
┌───────────────┬───────────────┐
│ MKT      ∿∿∿  │ SLS      ∿∿∿  │              ← one compact row each,
├───────────────┼───────────────┤                 ~1/6 the master's height
│ PRD      ∿∿∿  │ MNY      ▊▁▁▊ │
└───────────────┴───────────────┘
```

At rest a micro vital says **nothing in words**: a three-letter tag, a tiny
rhythm trace, and a state colour. No metric label, no number. Tap it and its
full card opens inline — full trace, median reference, key strip, flags — one
open at a time. The master expands the same way.

Everything above uses the existing `rhythmBars()` / `ekgSpark()` EKG language
from #40/#41. No new drawing idiom was invented. Two additive changes to those
helpers, both guarded so no existing caller moves:

- `ekgSpark` skips the reference line entirely when no point carries a `t`.
  A vital whose median cannot be claimed yet must not get one pinned to zero.
- `rhythmBars` accepts `num` per item to restate what is **printed** on a bar
  (`$132K` instead of `131747`). It cannot change what is **drawn** — the
  height is always `v`.

**Widths.** The master, the 2×2 and the expanded cards cap at `--trace-max`
(560px) and stay left-aligned, so the instrument is pixel-identical from a
600px viewport upward. The prose keeps the full card width, same as everywhere
else on the page. Before the cap, a 1400px monitor stretched each tile into a
near-empty bar with a 64px spark stranded at the far right.

---

## 2 · The heat map

GREEN healthy · GOLD watch · RED problem, on the trace, the border and a soft
inner glow. Same treatment on all four.

**The scale is one-sided, and that is the break from the pulse card.** The old
rails banded on `|z|`, so a week 40% *above* the median lit up exactly like a
week 40% below it. A heat map is a goodness scale, not an unusualness scale.
Anything better than normal now scores zero badness.

Every vital reduces to one number called **badness** — 0 is healthy, and it
climbs as things get worse — measured in whatever unit suits that vital, with
its own `watch` and `problem` line on that scale.

---

## 3 · Where the states come from

| Vital | Reading | Reference | Grain |
|---|---|---|---|
| **MKT** | blended $ back per $1 | median of prior closed months **and** KD's $10 floor | closed months |
| **SLS** | signed $, last 7 days | median of the last 8 complete weeks | weeks |
| **PRD** | share of open backlog past 14 days | median of the same share over 8 weeks, in **points** | weeks |
| **MNY** | dollar-weighted mean age of open A/R | a fixed band KD sets | snapshot |

Three of these are not what the brief asked for word-for-word. Each departure is
a feed limit, named here rather than papered over:

**MARKETING is measured on CLOSED MONTHS, not on a trailing-8-week median.**
Spend is typed at month close — `marketing_spend` holds one grain per month, and
the month in progress has no row until the office keys it. A weekly ratio needs a
weekly denominator that does not exist. Spreading a monthly total across days
would put a smooth fake under a real numerator, which is the flattering number
this board has refused since the cost-ratio sub-vital was first held. Windsor's
daily `google_ads_daily` is **not** used: it is a pacing signal, demoted from all
money math by the 170/171 ruling after undercounting July by half.

The **$10 floor** rides alongside the median for the same reason days-out has a
hand-set target: a business that has spent a year at $6 back per $1 has a median
of $6, and scoring against that median alone would report a chronic problem as
perfectly healthy. The worse of the two shortfalls wins.

Revenue in that ratio is **this console's own walk of `jobs`** — the same figure
every money tile on the page counts — not the ROI board's `rpt_report_marketing_roi`.
The two still differ on July (~$70K, mostly Oasis). The hero reads the console's
instrument so the first screen and the tiles under it cannot disagree; the gap
stays open and stays named.

**PRODUCTION scores in percentage POINTS off its median, not percent of it.**
188 open jobs are over a year old and hold the stalled share permanently high, so
a relative band would be numb to a real move. Points stay readable at any level.
Those stale records stay **in** the arithmetic — dropping them would make the
number prettier and less true, and the level is not what is scored.

**MONEY is a fixed band, not a trailing median, and it has no weekly line.**
Receivables age in one direction, so a book that has always sat at 70 days would
score its own worst habit as normal. And the history is not there to build a
median from: QuickBooks hands us a balance with no date attached, so an invoice
paid last Tuesday is simply gone from today's snapshot. Rebuilding prior weeks
from the invoices still open now would drop every fast payer, flatter the past
and make creep read **low** — a false all-clear, which is worse than no line at
all. So MNY draws the open book's **age profile** instead of a trace: four real
amounts on a shared floor, heavy on the right exactly when the money is old. It
pictures the thing that decides its colour, which a borrowed invoiced-dollars
line would not.

PAYABLES has no table anywhere in the schema. It is not a fifth tile; it lives
inside MONEY's expanded card, still saying so.

---

## 4 · The master

**Health, 0–100.** 100 is every blended vital sitting at or better than healthy;
0 is every one of them at or past its problem line. Each vital's badness is
divided by its own `problem` line and clipped to 0–1, which makes them unit-free
and comparable; health is 100 minus their mean.

**It blends distances, not deviations — that is the fix.** The composite it
replaces averaged signed z-scores, so signings far down and backlog far up
cancelled into something that looked calm. It once read "in rhythm" in green with
red rails directly beneath it, and the card had to grow a sentence apologising
for its own arithmetic. A mean of distances cannot cancel.

The bands line up with the arithmetic that was already there: **75** is where the
blended vitals average one MAD out, **50** is two — the same green/amber/red
boundaries the pulse used, restated on a scale KD can read.

**One roster, stated.** Only vitals with a value in every weekly slot are in the
line, so it never quietly changes what it is a mean of partway along. Today that
is SALES and PRODUCTION. MARKETING (closed months) and MONEY (a snapshot) carry
their own tiles and are named under the master in words. They join automatically
the day their feeds carry a week-by-week history — no code change, just the
roster filter finding them.

---

## 5 · Withheld, not faked

A vital that cannot be measured draws a **flat grey hairline** and wears a chip
naming what is missing — never a calm green over nothing.

- `feed dark` — the feed is absent or unreadable.
- `spend loading` — `marketing_spend` is still in flight (it is fetched after
  first paint so a missing migration can never block the page). The two states
  are kept apart deliberately: a dead integration and a data-entry gap are
  different facts.

A **coloured** flat line means something else again: the state is known but there
is no history to draw a shape from. The card foot counts how many of the four
have a feed and names the ones that do not.

---

## 6 · Retuning — one block, `VIT`

Every threshold is in one commented block at the top of the script in
`index.html`. Nothing downstream holds a second copy.

```js
const VIT = {
  weeks: 8,
  master:     { watch: 75, problem: 50 },        // 0–100 health
  marketing:  { floor: 10, watch: 0.15, problem: 0.35 },   // fractional shortfall
  sales:      { watch: 0.15, problem: 0.35 },              // fractional shortfall
  production: { stallDays: 14, deepDays: 30, watch: 3, problem: 8 },  // points off median
  money:      { good: 30, watch: 45, problem: 60 },        // days of mean A/R age
  minMonths: 3,   // closed months required before MKT claims a median
};
```

Raise `money.good` to 35 and the MNY tile cools. Drop `sales.watch` to 0.10 and
SLS goes gold sooner. The master follows both without another edit.

---

## 7 · Verified

Rendered headless at true mobile metrics (Chrome via CDP — `--window-size` on
Windows clamps to ~500px and crops rather than laying out at 390). Fixtures feed
the **real** `buildVitals()` and `buildPulse()` with ~26 months of synthetic
jobs and 400 days of invoices, so the code paths under test are the shipped ones.

| State | Result |
|---|---|
| healthy, 390px | hero ends at **612px** — one screen, no scroll |
| healthy, 1400px | capped at 560px, left-aligned, identical to the phone |
| sales dead week | master **19/100** red with a visible dive; SLS red, PRD gold |
| spend book absent | MKT flat grey + `spend loading`, foot reads 3 of 4 |
| QuickBooks absent | MNY flat grey + `feed dark`, no fake green |
| every panel | trace, median reference, key strip and flags all present |

Screenshots in `docs/vitals/`.

---

## 8 · Open, and deliberately so

- **MARKETING never enters the master** until spend arrives at a weekly grain.
  The month in progress cannot be priced; nothing here pretends otherwise.
- **MONEY has no history** until a payment-date feed exists. Age creep
  week-over-week is not computable from a dated-less balance, and the biased
  reconstruction was refused rather than shipped with a caveat.
- **The revenue-instrument gap** (~$70K on July, mostly Oasis) between the jobs
  walk and `rpt_report_marketing_roi` is still open. The hero picks the console's
  instrument and says which one it picked.
