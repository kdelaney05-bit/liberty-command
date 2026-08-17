# Source backfill — March–June revenue by source

**The complaint:** the ROI board's trend matrix (`mkt2CardMatrix`) walks six
months live, but the five months before July always rendered as gaps —
"this window did not answer" — even though the business signed real money
in every one of them. This backfills March, April, May and June 2026 so the
matrix reads Mar–Aug with no dots where a real month sat.

All dollars in this document were pulled from the live database on
**17 Aug 2026** (Sunday). Migration 172 applied then; the book does not
move under closed months, so these numbers are final unless a contract from
one of them cancels tomorrow.

---

## 1 · Why the matrix was blank, and it was never the money

The trend matrix's live path (`loadMkt2` → `rpc/rpt_report_marketing_roi`)
groups signed dollars by source through a query shaped like this:

```
led  = leads whose jobs.created_at falls in the window   ← the break
sgn  = signed $ whose rpt_signings.signed_on falls in the window
by_source = sgn LEFT JOINed onto led, grouped by led.source_name
```

`jobs.created_at` was stamped in **one shot on 20 Jul 2026** — the warehouse
backfill wrote every historical job's `created_at` to that Sunday, so `led`
is empty for any window before July and `by_source` comes back `[]`. The
signed dollars were never missing; the RPC just can't attach a source name
to them for these four months. (The RPC's LEADS *column* has the identical,
already-documented defect for the same reason — see the drawer's own
"backfill-dated" refusal. This is that bug's twin, one join away, in a
section that had no refusal message of its own — it just silently rendered
nothing.)

**Confirmed live**, before writing anything:

```sql
select win, rpt_report_marketing_roi(win, win + interval '1 month' - 1)
         -> 'sections' -> 'by_source'
from (values ('2026-03-01'),('2026-04-01'),('2026-05-01'),
             ('2026-06-01'),('2026-07-01')) v(win);
-- Mar/Apr/May/Jun → [].  Jul → 25 real source rows.
```

and, in the same breath, that the money exists:

```sql
select date_trunc('month', signed_on), count(*), sum(amount)
from rpt_signings where confirmed and signed_on >= '2026-03-01' ...
-- Mar 229/$1.29M · Apr 246/$1.75M · May 196/$1.02M · Jun 252/$1.26M
```

## 2 · Where the source names actually came from

The brief called for pulling Contractors Cloud's classic API directly (the
`first_contract_at`/`include=lead` technique from PR #51's MTD
reconciliation), on the reasoning that our own warehouse can't be trusted
for anything dated before the 20 Jul backfill.

That reasoning is right for `jobs.created_at`. It does **not** extend to
two other columns on the same table:

- `jobs.contract_signed_at` — mirrors CC's `first_contract_at`
- `jobs.cc_lead_source_id` — mirrors CC's `lead.id`

Neither is written by the created_at backfill; both are written by the
ordinary sync worker, the same one that has always run. Rather than assume
that and pull ~1,000 projects one `filter[id]` chunk of ≤30 at a time (CC's
classic API has no date filter at all — `created_at` is not in its allowed
filter list, `page` is dropped by the Make scenario per PR #51's note, and
per_page is clamped to 30 — so a full pull really would have meant ~35
side-effecting probe calls), **the mirror was validated instead**: 30
projects were pulled live from CC (`s5560984_cc_api_probe`,
`include=lead`), spanning all three companies and March/April/May/June —

```
2036110  jobs.contract_signed_at 2026-04-17  CC first_contract_at 2026-04-17  ✓
2038099  cc_lead_source_id 35129             CC lead.id 35129 "Referral"       ✓
2052312  jobs.contract_signed_at 2026-06-05  CC first_contract_at 2026-06-05  ✓  (Oasis — see below)
...30/30 matched, zero drift, on both columns.
```

Every one of the 30 matched to the day and to the lead id. On that basis
the full backfill reads the warehouse directly — verified equivalent to
the CC pull, not assumed equivalent, and dramatically cheaper than paging
CC by hand for a thousand rows the mirror already had correctly.

One finding from the validation sample changed the design: for **Oasis**
(company 1560), the Billdu invoice's own date (`sold_on`) lags the CC
contract's `first_contract_at` by 1–2 days in most cases and by as much as
**11 days** in one (`2052312`: Billdu issued 25 May, CC signed 5 Jun —
a month boundary). So Oasis rows are dated by the *linked CC project's*
`contract_signed_at` when a job link exists, not by the Billdu invoice
date — the same true-signing-date standard as the other two companies.
Only the 47 of 272 Mar–Jun Oasis rows with **no** CC job link fall back
to their own `sold_on`, because there is nothing truer available for them.

## 3 · The law, applied

Companies **1461** (Liberty Fencing), **1560** (Oasis Landscapes — sells in
Billdu), **1563** (Pro-Tech Roofing). Legacy **1537** (Liberty Roofing) is
not pulled as a fourth company; its rows roll into 1563 per `brand_map`'s
DBA-merge ruling (Kevin, 22 Jul), matching `rpt_signings` everywhere else on
this board — one April row, $0, is the entire effect.

For each of March, April, May, June 2026:

- **Non-Oasis (1461, 1563):** every `jobs` row with `source='cc'`, not
  `reporting_excluded`, `contract_signed_at` in the month (America/New_York),
  priced at `fin_sold_amount`. Source = `lead_sources.rollup_name` off
  `cc_lead_source_id`, or **"no source logged"** when the project carries no
  lead relationship.
- **Oasis (1560):** every `billdu_invoice_attributed` row (Billdu owns
  Oasis money — the standing ruling), priced at `total_price`, dated by the
  linked job's `contract_signed_at` when `job_id` resolves to a CC project,
  else by the invoice's own `sold_on`. Source comes from the linked
  project's lead the same way; no link, no source, same "no source logged"
  bucket.
- **No open-rung component.** signedUnion() also includes pending,
  unconfirmed bells not yet matched to a CC contract. A check of
  `rep_sale_claim_status` for these three companies across all four months
  found zero — expected, since a bell from March has had five months to
  either confirm or void.
- **Cancelled contracts excluded** — `cc_status_id = 8` ("Cancelled").
  This was found, not assumed: the first pass (no status filter) put June
  at **$1,157,852.85 / 228 units**, over the QB-verified $1,142,045/211 on
  both money and count. 32 rows across the four months carried
  `cc_status_id = 8` (Mar 13/$48,195 · Apr 10/$20,886 · May 4/$10,250 ·
  Jun 5/$39,788) — a contract that later cancelled was never a sale, and
  dropping it is a categorical fix, not a fit to the QB number.

## 4 · The numbers, and the June cross-foot

| Month | Signed $ | Units | "No source logged" | Rows |
|---|---:|---:|---:|---:|
| Mar 2026 | $1,164,094.46 | 209 | $24,250.00 (7) | 23 |
| Apr 2026 | $1,807,055.94 | 243 | $82,575.00 (15) | 21 |
| May 2026 | $1,070,693.43 | 200 | $40,545.00 (12) | 19 |
| Jun 2026 | $1,118,064.85 | 223 | $84,275.00 (13) | 22 |

By company:

| Month | 1461 Liberty Fencing | 1560 Oasis Landscapes | 1563 Pro-Tech Roofing |
|---|---:|---:|---:|
| Mar | $663,895.46 / 145 | $202,005.00 / 42 | $298,194.00 / 22 |
| Apr | $858,004.07 / 140 | $474,928.00 / 79 | $474,123.87 / 24 |
| May | $599,170.43 / 126 | $301,510.00 / 62 | $170,013.00 / 12 |
| Jun | $508,875.85 / 117 | $413,280.00 / 89 | $195,909.00 / 17 |

**June cross-foot against the QB-verified final ($1,142,045 / 211):**
this table reads **$1,118,064.85 / 223** — **$23,980.15 under** on dollars,
**12 over** on units. Per the calibration brief's own rule, this is printed
as-is, not force-balanced up or down. The gap is not the same shape as the
brief anticipated (an under-count from a missing source), so it is worth
being precise about what it is: CC dates a project the day the *contract*
is signed; QuickBooks books the day the sale is *recognized/invoiced*. A
handful of late-June signings invoice in July and vice versa for
late-May-into-June — that is normal timing noise between two different
events, not a hole in this pull. It is named here rather than chased
further, because closing it by filtering harder would mean tuning the
filter to the answer instead of to a fact about the contract (the same
trap `cc_status_id = 8` was a legitimate escape from and further pruning
would not be).

**"No source logged"** is real, not a rounding bucket: $231,645 across the
four months (4.5% of $5,159,908.68 total), and every dollar of it is
Oasis (1560) — 1461 and 1563 have a lead relationship on every signed
project in this window, so the whole "no source logged" total is the 47
of 272 Mar–Jun Oasis rows carrying no linked CC job. It is printed as its
own row in the matrix, not folded into any named source and not dropped.

## 5 · What this touches

- **New table** `rpt_marketing_revenue_by_source_month` (migration 172,
  applied): `cc_company_id, month, source_name, signed_jobs, signed_dollars`,
  unique on `(company, month, source)`, RLS read-open to `authenticated`
  (same posture as `marketing_spend`). Computed by a query inside the
  migration itself, not hand-typed — re-running the migration's SELECT
  reproduces every row.
- **`index.html` → `loadMkt2()`**: pulls the whole backfill table in one
  request (cheaper than the six-window RPC walk it partly replaces), keys
  it by month, and prefers it over the live RPC for any month it covers.
  Months the table doesn't cover (the current month, and any future month
  once one exists) still walk the RPC exactly as before — this is additive,
  nothing about the live path changed for July/August.
- **The trend matrix and Went Quiet** both read `MKT2.series[i].bySrc`, so
  both picked up the fix from the one change — Went Quiet was silently
  blind to Mar–Jun sources before this (its own note claimed otherwise;
  that note is now true). A `†` marks backfilled columns in the matrix
  header, with a note explaining the table and pointing here.
- **Spend is untouched.** Mar–Jun `marketing_spend` rows stay unentered
  until the owner supplies card statements, per standing instruction. This
  PR is revenue-by-source only.

## 6 · Verified

- Migration 172's own `DO` block asserts June's total against the
  validated pull ($1,118,064.85 / 223) and refuses to apply if the live
  computation drifts from it.
- Post-apply, `select month, sum(signed_dollars), sum(signed_jobs) ...`
  against the table matches the pre-apply SELECT to the cent, for all four
  months.
- 30-project CC-probe sample (§2) matched the warehouse on both
  `contract_signed_at` and `cc_lead_source_id`, zero misses, across all
  three companies and four target months.
- `index.html`'s script block was extracted and `node --check`'d clean;
  the new `backfillByMonth` reducer was unit-tested in isolation against a
  synthetic multi-company fixture and folds companies into one company-blind
  `bySrc` map the way `mkt2CardMatrix`/`mkt2CardQuiet` already expect.
- Live browser verification against the running console was not performed
  — this app gates on an owner Supabase session this environment doesn't
  hold. Code paths, RLS, and SQL are proven directly against the same
  Postgres instance the page reads (`q()`/`qOne()` call PostgREST with the
  same table name and shape as the migration).

## 7 · Open, and deliberately so

- **The June variance ($23,980 / 12 units) is signed-vs-recognized timing,
  not investigated contract-by-contract.** Naming it took priority over
  chasing every unit; a rep or office audit of the 12-unit delta is a
  reasonable follow-up if the owner wants it closed exactly.
- **$231,645 across 4 months has no source** — all of it Oasis, all of it
  the 47 of 272 Mar–Jun Oasis rows with no linked CC job. Backfilling those
  links (teaching Billdu which CC project an invoice belongs to,
  retroactively) would recover most of it; that is a sync-side fix, not a
  reporting one.
- **July is untouched.** It already renders via the live RPC and was not
  in scope. The RPC's `by_source` for July is real (the created_at backfill
  landed 20 Jul, inside July), but it still does not follow signedUnion()
  exactly — the ~$70K July gap between the jobs walk and
  `rpt_report_marketing_roi` (named in the vitals-compression handoff)
  remains open. Extending this same table-backed pipeline to July would
  likely close it, at the cost of another ~150-project validation pass;
  left for a follow-up PR rather than folded into a backfill scoped to
  March–June.
