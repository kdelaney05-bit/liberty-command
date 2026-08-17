# Marketing spend ledger — the closed months

> **June and July 2026 are CLOSED. Future sessions read this file and the
> `marketing_spend` table. Never re-derive closed months.**

Keyed from card statements by calendar month. This file and the table agree;
if anything else on the console disagrees with them, the other thing is stale.

---

## June 2026 — $68,792.00 · 18 rows · migration 176

| Source | 1461 Fencing | 1560 Oasis | 1563 Pro-Tec | Total |
|---|---:|---:|---:|---:|
| Google Ads | 25,851 | 12,192 | 8,271 | **46,314** |
| Saving Safari | 5,000 | — | 5,000 | **10,000** |
| Angi | 3,939 | — | 2,100 | **6,039** |
| Liam / Gate Digital | 1,000 | 1,000 | 1,000 | **3,000** |
| Referral bonuses | 500 | 500 | 500 | **1,500** |
| Thumbtack | 794 | — | 254 | **1,048** |
| Next Level ⚑3 | 297 | 297 | 297 | **891** |
| **TOTAL** | **37,381** | **13,989** | **17,422** | **68,792** |

Google all-in (ads + management) — **$49,314**.

## July 2026 — $68,672.00 · 16 rows · migrations 170/171, corrected by 175

| Source | 1461 Fencing | 1560 Oasis | 1563 Pro-Tec | Total |
|---|---:|---:|---:|---:|
| Google Ads | 23,064 | 16,522 | 8,408 | **47,994** |
| Saving Safari | 5,000 | 2,000 | 2,500 | **9,500** |
| Angi | 4,187 | — | 2,100 | **6,287** |
| Liam / Gate Digital | 1,000 | 1,000 | 1,000 | **3,000** |
| Referral bonuses | 500 | — | 500 | **1,000** |
| Next Level ⚑3 | 297 | 297 | 297 | **891** |
| **TOTAL** | **34,048** | **19,819** | **14,805** | **68,672** |

Google all-in (ads + management) — **$50,994**.

**July was corrected on 17 Aug 2026 (migration 175).** Six tooling vendors left
the book as fixed operating expenses, not marketing: Marlie AI 99 · CallFire
185 · Mailchimp 135 · Zapier 60 · GoDaddy 56 · Canva 28 — **$563 out**, taking
July from $69,235 to $68,672. Any figure quoting $69,235 or the brand columns
$34,555 / $19,819 / $14,861 predates that correction. The static boards under
`docs/roi-board/` and two comment citations in `index.html` still carry the old
numbers **on purpose** — they are dated artifacts recording what was approved,
not live reads.

---

## Provenance notes

**Google Ads** — card statement truth (ruling, migration 170): Chase Ink
1552/1571 + Amex Gold. June is keyed by calendar month; Liam bills by calendar
month.

**Saving Safari** — per-brand rules differ and are not interchangeable:

- **1461 Fencing** — cash.
- **1560 Oasis** — *absent by design in June.* Oasis is bartering a
  ~$15–25K landscaping credit. It becomes **$4,500/mo cash when the barter
  exhausts**. July carries an imputed barter figure of $2,000 for 1560, which
  will not reconcile against QuickBooks (flag 6) — that is expected, not a
  defect.
- **1563 Pro-Tec** — ACH, QB-confirmed. **June was the final full month.**
  Turned off after June; **July $2,500 trailing**; **Aug onward zero**, pending
  a pay-per-lead arrangement.

**Angi** — two vendor lines, one source: the Angi line (1461) and the
HomeAdvisor line (1563).

**Liam / Gate Digital** — flat, $1,000 per brand per month. Folded into Google
all-in as management cost; keeps its own row in the ledger.

**Referral bonuses** — estimate `~`, occasional not programmatic. Never a card
charge.

**Next Level** — website hosting for all three sites. Marketing infrastructure,
so it stays in the book, but it matches no CC lead source and therefore prices
no source (⚑3).

**Thumbtack** — card statement, calendar month. Matches the `Thumbtack` rollup,
so it does price that source.

---

## Field laws

**1 · The card that pays is not the brand.** One Chase Ink or Amex card clears
spend for all three companies. `brand` records which company the spend belongs
to, never which card settled it. Do not infer brand from the card.

**2 · Liam billed is not card timing.** Liam invoices by calendar month; card
statement cycles do not close on the 1st. A Liam invoice and a statement-cycle
total are not expected to agree, and forcing them to would put the book on a
cycle boundary instead of a calendar month. Everything here is calendar month.

**3 · Windsor is pacing only.** `google_ads_daily` was demoted by 170/171 and
must never be keyed as spend. For scale: June Windsor $12,336.93 against the
card's $46,314; July Windsor $25,175.23 against $47,994. It runs roughly half
to a quarter of truth and the ratio is not stable.

**4 · `source_name` is a join key, not a label.** It must match the
`lead_sources.rollup_name` the ROI board groups on, or the source prices
nothing and its MoM arrow never lights:

| Key it as | Not as | Why |
|---|---|---|
| `Angi` | `Angi/HomeAdvisor` | rollup is `Angi` (163); HomeAdvisor goes in the note |
| `Liam / Gate Digital` | `Gate Digital` | `mkGoogleCard()` looks up this literal for Google all-in |
| `Google Ads` | `Google` | spend says `Google Ads`, the lead source says `Google`; the code maps them |

**5 · ⚑3 rows cut both ways.** A note containing `⚑3` is excluded from
per-source pricing (`mkSpendOf`) but **included** in ledger and brand totals
(`mkBrandSpend`). That asymmetry is why parking opex under ⚑3 inflated the
headline while moving no cost-per-unit — the thing migration 175 fixed. Since
175, Next Level is the only ⚑3 vendor.

**6 · Tooling is not marketing.** SaaS and fixed subscriptions do not go in this
book at all. Do not reach for ⚑3 to park them.

**7 · Brand grain is enforced.** `PRIMARY KEY (source_name, month, brand)`,
`brand IN ('1461','1560','1563','all')`, and the `marketing_spend_one_grain`
constraint trigger forbids an `'all'` row coexisting with brand rows for the
same source and month. It fires on INSERT and UPDATE only, never DELETE. Both
closed months are at brand grain, so a monthly total keyed as `'all'` will be
**rejected**, not merged.

---

## Not in this book

- **Cost per lead before Aug 2026** — `rpt_report_marketing_roi` dates a lead by
  `jobs.created_at` and the warehouse was loaded in one shot on 20 Jul 2026, so
  July reads 4,282 Google leads against a true 253. `MK_LEADS_FROM = '2026-08'`
  refuses the column for earlier months. Not a spend problem.
- **August 2026** — not keyed. Saving Safari is expected at zero (see above),
  and the Windsor figure for August covers only 1–16 Aug, so it is not even a
  full-month pacing read.
