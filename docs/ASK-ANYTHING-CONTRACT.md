# ASK-ANYTHING-CONTRACT.md — the interface contract (Phase 3)

The contract the ask-anything box consumes. Spec only — no frontend in this
pass, per the Phase 1 addendum's stop point.

Source of truth read for this contract: `kdelaney05-bit/trureview-mobile` at
`76d5a0a` — `REPORTING.md`, `docs/NUMBERS-TRUTH.md`,
`backend/migrations/159_reporting_layer_views.sql`, `backend/reports/*.sql`.
The field law is quoted from those files, never re-derived here.

---

## 0. The one-instrument rule

The chat box and the dashboard must never disagree inside the same product.
That is not a style preference — it is the entire reason the `rpt_*` layer
exists (the 15 Aug Eric Payne split, $180K vs $63,736, both correct).

The failure mode this contract exists to prevent: a model with base-table
access invents a fresh definition of "signed" per question. It will do this
plausibly and silently. So the definition of a signing is not something the
tool is allowed to express — it is something the tool is only allowed to
*read*, from `rpt_signings` and nowhere else.

---

## 1. Two paths, in strict order

### Path A — canned reports (ALWAYS TRIED FIRST)

The ten queries in `backend/reports/`. The model does not author these. It
picks one and fills its params. "How'd Ron do last week" →
`report 04, {rep: <Ron's uuid>, win_start: 2026-08-03, win_end: 2026-08-09,
include_rung: true}`. Nothing about that answer is composed by the model
except the prose wrapper.

### Path B — view query (FALLTHROUGH ONLY)

Free-form SQL the model composes, for genuinely novel questions no report
covers. `rpt_*`-only, hard-gated (§2).

**Routing is not a preference, it is an ordering.** If a report covers the
question, Path B is unavailable for it — even if the model believes it could
write a better query. A report that is "close enough" beats a bespoke query
that is "exactly right", because the report is the thing the dashboard also
renders.

### ⚠️ Scope correction on "may only reach rpt_*"

`backend/reports/README.md` states *"No report touches a base table."*
**That is not accurate as written.** Six of the ten do:

| report | base tables it reads | why it must |
|---|---|---|
| 03 Weekly Scorecard | `qb_invoices`, `jobs`, | QB invoiced/collected/AR and lead counts |
| 06 Month Close | `qb_invoices` | invoiced/collected |
| 07 Brand P&L Bridge | `qb_invoices`, `jobs` | `fin_revenue_amount` / `fin_received_amount` |
| 08 Job Margin | `jobs`, `cc_appointments` | `fin_*`, `completed_at`, job city |
| 09 Pipeline Health | `jobs` | `completed_at` open-build proxy |
| 10 Marketing ROI | `jobs`, `lead_sources` | `cc_lead_source_id` |

These are not defects. The `rpt_*` layer carries the **signing** definition;
it does not carry QB money, `fin_*` balances, job city, or lead source, and
those fields have to come from somewhere. What matters is that in all six,
*what counts as a signing* still comes only from `rpt_signings` /
`rpt_brand_day` / `rpt_rep_day`.

So the rule is scoped precisely:

> **The rpt_*-only restriction binds Path B — model-authored SQL.** The
> canned reports are pre-vetted, human-reviewed SQL that already encode the
> field law; they may read base tables for fields the reporting layer does
> not carry. The model may never edit a canned report, only parameterise it.

Reading the restriction any other way would forbid six of the ten reports and
delete QB money from the product. The invention risk lives in Path B, and
that is where the gate goes.

---

## 2. The reachability boundary — and why GRANTs cannot enforce it

**The obvious enforcement does not work.** The instinct is a dedicated DB role
with `SELECT` on the six views and `REVOKE ALL` on base tables. That breaks
every view.

Every `rpt_*` view is `security_invoker = true` (migration 159, non-negotiable
per REPORTING.md §Security). An invoker view reads its base tables **as the
caller**. Strip base-table `SELECT` from the ask-anything role and all six
views return permission errors, not filtered rows. The property that makes
the layer safe under RLS — and that makes a regenerated 153 land for free — is
exactly the property that makes grant-level view-only isolation impossible.

### What the boundary actually is

Three things, none of them a prompt instruction:

**2.1 — Identity: the end user's own JWT.** The tool executes as the signed-in
user, never a service role. RLS on `jobs`, `cc_appointments`, `reps`,
`rep_sale_claims`, `billdu_documents`, `billdu_user_map`,
`attribution_defaults`, `lead_sources`, `rep_book_transfers` decides what
comes back. The owner passes `is_manager()`; a plain rep sees own-only. A
service role here would bypass RLS and pre-break org isolation the day 153
lands.

**2.2 — Statement gate (the real rpt_*-only control).** Path B SQL is parsed
before execution. Reject unless *all* hold:

- exactly one statement; no `;` outside string literals
- the statement begins with `SELECT` or `WITH`
- every referenced relation resolves into the allowlist:
  `rpt_signings`, `rpt_appointments`, `rpt_rep_day`, `rpt_brand_day`,
  `rpt_unassigned`, `rpt_reps`
- no schema qualifier other than `public`
- no reference to `pg_*`, `information_schema`, `app_private`,
  `signal_definitions`, `model_constants`
- no function calls outside an allowlist of pure builtins
  (`sum`, `count`, `avg`, `min`, `max`, `round`, `coalesce`, `nullif`,
  `to_char`, `date_trunc`, `filter`, cast forms). **No `SECURITY DEFINER`
  functions** — `pipeline_value()`, `team_scoreboard_*()` and friends are
  reachable by name and would route around the layer.
- no `INTO`, no DDL/DML keyword anywhere at statement level

Parse it, don't regex it. A regex gate on SQL is a suggestion.

**2.3 — Execution envelope.** `BEGIN; SET TRANSACTION READ ONLY;`
`statement_timeout = 5s`, `LIMIT 5000` injected if absent, result truncation
reported on the face if it fires (a truncated table is a silently wrong
answer otherwise).

A gate failure is a **refusal with a named reason**, surfaced to the user —
never a silent retry against something else, and never a fallback to a
guessed number.

---

## 3. The view surface

Exact columns. The model may reference nothing outside this list.

### `rpt_reps` — grain: rep
`id` · `name` · `initials` · `role` · `sells` · `rep_active_now` ·
`cc_default_company_id` · `rollup_id` · `rollup_name` · `inside_sales` ·
`placement_pending`

### `rpt_signings` — grain: one signing event
`source` (`cc_contract`|`billdu_accepted`|`rung_pending`) · `confirmed` ·
`signed_on` (ET date) · `signed_at` · `rep_id` · `rep_name` ·
`rep_active_now` · `rep_rollup_id` · `rep_rollup_name` · `rep_inside_sales` ·
`rep_originating_id` · `rep_originating_name` · `brand_cc_id` (**raw**) ·
`brand_rollup_cc_id` · `brand_name` · `amount` · `project_id` ·
`cc_project_id` · `deal_label` · `source_detail`

### `rpt_appointments` — grain: appointment
`cc_appointment_id` · `project_id` · `cc_project_id` · `customer_id` ·
`rep_id` · `rep_name` · `rep_active_now` · `rep_rollup_id` ·
`rep_rollup_name` · `rep_inside_sales` · `brand_cc_id` (**raw**) ·
`brand_rollup_cc_id` · `brand_name` · `starts_at` · `ends_at` · `booked_at` ·
`starts_on` · `booked_on` · `elapsed` · `is_internal` · `has_rep`

### `rpt_rep_day` — grain: rep × day × brand × source
`rep_id` · `rep_name` · `rep_active_now` · `rep_rollup_id` ·
`rep_rollup_name` · `rep_inside_sales` · `day` · `brand_cc_id`
(**pre-rolled**) · `brand_name` · `source` · `confirmed` · `units` · `dollars`

### `rpt_brand_day` — grain: brand × day × source
`brand_cc_id` (**pre-rolled**) · `brand_name` · `day` · `source` ·
`confirmed` · `units` · `dollars`

### `rpt_unassigned` — grain: anomaly row
`reason` (`signing_no_rep`|`signing_unknown_rep`|`duplicate_invoice_same_job`)
· `source` · `day` · `amount` · `project_id` · `cc_project_id` ·
`deal_label` · `brand_cc_id` · `brand_name` · `detail`

### ⚠️ The brand-column trap (enforce in the gate)

`brand_cc_id` means two different things depending on the view:

- in `rpt_signings` / `rpt_appointments` it is **raw** — a `1537` row is still
  `1537`, and `WHERE brand_cc_id = '1563'` silently drops legacy Liberty
  Roofing volume that the field law says folds into Pro-Tec;
- in `rpt_rep_day` / `rpt_brand_day` it is **already rolled**.

> **Rule: brand filters on `rpt_signings` / `rpt_appointments` MUST use
> `brand_rollup_cc_id`. On `rpt_rep_day` / `rpt_brand_day` they MUST use
> `brand_cc_id`.** The gate rejects `brand_cc_id` appearing in a `WHERE` on
> the two event-grain views.

---

## 4. The report surface

Params follow the psql `-v` convention in `backend/reports/README.md`.
`win_start`/`win_end` are **inclusive both ends, ET dates**. `brand` is a CC
company id (`1461`/`1563`/`1560`) or `''` for all. `rep` is a `reps.id` uuid
or `''`. `include_rung` is the confirmed-vs-union toggle.

| # | report | params | result blocks (in order) |
|---|---|---|---|
| 01 | Morning Card | *none* | `blocks[block, who, source, units, dollars]` (blocks: `signed_yesterday`, `appts_today`, `unassigned`, `rung_open`) · provenance |
| 02 | Today's Board | `brand` | `[rep, rep_inside_sales, brand_name, appts_today, elapsed, upcoming, booked_today, next_appt_at]` · provenance |
| 03 | Weekly Scorecard | `win_start`, `win_end`, `include_rung` | per-brand `[brand_name, leads_projects_created, appts, appts_elapsed, units, revenue, of_which_rung, invoiced, collected, ar]` · per-rep `[rep, rep_inside_sales, departed, appts_elapsed, units, revenue, rung_units, rung_dollars]` · unassigned `[reason, day, amount, deal_label, brand_name, detail]` · provenance |
| 04 | Rep Scorecard | `rep` **(required)**, `win_start`, `win_end`, `include_rung` | production `[rep_name, rep_rollup_name, rep_active_now, rep_inside_sales, source, units, dollars]` · appointments `[booked_in_window, on_calendar, elapsed]` · cohort close `[label, appts_in_cohort, closed, close_pct]` · origination split `[signed_on, amount, deal_label, rep_originating_name]` · provenance |
| 05 | Closing Momentum | `brand`, `rep`, `include_rung` | buckets `[bucket, rep, brand_name, units_booked, dollars_booked]` · rung callout `[rep, rung_units, rung_dollars]` · provenance |
| 06 | Month Close | `month_start`, `include_rung`, `breakeven_fencing`, `breakeven_protec`, `breakeven_oasis` | `[brand_name, units, signed, of_which_rung, signed_prev, vs_prior_pct, invoiced, collected, breakeven, vs_breakeven]` · provenance |
| 07 | Brand P&L Bridge | `month_start` | `[brand_name, cc_signed, cc_revenue_booked, cc_received, qb_invoiced, qb_collected, signed_not_yet_invoiced]` · provenance |
| 08 | Job Margin | `win_start`, `win_end`, `brand` | `[brand_name, rep, deal_label, city, signed_on, sold, revenue_booked, received, balance, gross_margin, completed, flag]` · provenance |
| 09 | Pipeline Health | `brand` | detail `[brand_name, rep, deal_label, signed_on, age_days, bucket, backlog_dollars, received, balance]` · rollup `[brand_name, stalled_30, stalled_14, backlog_dollars]` · provenance |
| 10 | Marketing ROI | `win_start`, `win_end` | `[source_name, category, leads, signed_jobs, signed_dollars, spend, gross_profit, roi]` · coverage `[signed_jobs_total, with_source, coverage_pct]` · provenance |

### Param law

**A param that is not in a report's signature may not be synthesised.**
Report 05 has no window — its four trailing 30-day buckets are fixed by the
rhythm law. "Closing momentum last quarter" therefore runs 05 as-is and the
answer *states the fixed window*, or refuses. It never grows a `win_start`.

Reports with no `include_rung` are that way by law, not by omission: 07/08/09
are booked-only (`WHERE confirmed`), 10 is confirmed-only. The toggle is not
offered on them and the answer says which cut it is.

### Reports that ignore the window on purpose

Report 01's `unassigned` and `rung_open` blocks carry **no window** — they are
every open row, by design (a nudge list). The answer must not narrate them as
"yesterday's". Same for report 09, which is all open builds, not a window.

---

## 5. Routing

### Router output (the only three shapes)

```json
{"route":"report","report_id":"04","params":{...},"confidence":0.0-1.0}
{"route":"view_query","sql":"...","why_no_report":"..."}
{"route":"refuse","reason_code":"...","message":"..."}
```

`view_query` **must** carry `why_no_report` naming which reports were
considered and what they lack. A fallthrough with no justification is a
router bug, and it is the exact shape of the failure this contract exists to
prevent — so it is rejected, not logged.

### Routing table

| the question sounds like | route |
|---|---|
| "what happened yesterday", "morning", "what's on today" | 01 |
| "who's out today", "today's appointments", "board" | 02 |
| "this week", "last week", "the scorecard", "weekly" | 03 |
| "how'd \<rep\> do", "\<rep\>'s numbers", "close rate for \<rep\>" | 04 |
| "trending", "momentum", "last 30 vs prior", "are we speeding up" | 05 |
| "month", "vs last month", "did we clear breakeven" | 06 |
| "margin by brand", "CC vs QuickBooks", "the wedge" | 07 |
| "margin by job", "which jobs", "collections lagging" | 08 |
| "backlog", "what's still open", "stalled" | 09 |
| "lead source", "marketing", "ROI", "where are leads coming from" | 10 |
| anything genuinely novel | Path B |

### Resolvers

**Rep name → uuid.** Resolve against `rpt_reps` (`name`, `initials`) —
case-insensitive, first-name match allowed. On ambiguity **ask, never pick**:
"Jessica" hits Jessica Coley *and* Jessica Oasis. On no match, refuse with the
roster, do not guess a spelling.

⚠️ **Report 04's `rep` is a raw `reps.id`, not a `rollup_id`.** There is no
canned rep scorecard for an aggregate line. "How'd House do" cannot be served
by 04 with a substituted uuid — that would answer a different question under
the same heading. Route it to Path B over `rpt_rep_day` grouped by
`rep_rollup_id`, and say the line is a rollup.

**Window phrases → dates (ET, inclusive both ends).** Weeks are
**Monday-start (ISO)** — the house convention, confirmed by migration 074's
`date_trunc('week')` note ("matching the app, the console, and
console_rep_week") and migrations 069/121/131/143.

| phrase | resolution |
|---|---|
| today | `d` → `d` |
| yesterday | `d-1` → `d-1` |
| this week | most recent Monday → `d` |
| last week | previous Monday → that Sunday (a **complete** week) |
| last 7 / 30 days | `d-6` → `d` / `d-29` → `d` |
| this month / last month | calendar month, ET |
| a bare month name | first → last of that month |

A phrase not in this table is **asked about, not guessed**. "Recently" is not
a window.

**Brand.** `fencing|liberty fencing` → `1461`; `pro-tec|protec|roofing` →
`1563`; `oasis|landscap*` → `1560`. `1537` is never a valid filter value — it
folds to `1563` by law. Unrecognised → `''` (all) with the scope said on the
face.

**Toggle.** Defaults to `include_rung = true` — the house default, union,
rung IN, labeled 🔔 (REPORTING.md field law; Kevin's 10 Aug console ruling).
"Booked", "confirmed", "the office cut", "verified only" → `false`.
See §11 conflict 3 on report 03.

---

## 6. Response envelope

```json
{
  "answer": "prose, ≤4 sentences, every figure adjacent to its cut label",
  "cut": "union" | "booked-only" | "n/a",
  "route": {"kind":"report","id":"04","params":{…}}
         | {"kind":"view_query","sql":"…"},
  "blocks": [ {"title":"…","columns":[…],"rows":[[…]]} ],
  "companion_lines": ["$67,267 unattributed · 3 jobs"],
  "truncated": false,
  "provenance": "…verbatim…"
}
```

Hard rules on the envelope:

- **No money figure may render without its cut label.** Not "Eric did $180K" —
  "Eric did $180,165 · union (🔔 rung IN)". The 15 Aug split is the whole
  reason this field exists.
- **`companion_lines` is populated from `rpt_unassigned` whenever confirmed
  money renders** and the window carries unassigned rows. Ruling 3: never a
  silent bump.
- `provenance` is a string, not a struct, and is rendered **verbatim** — see
  §7.
- `truncated: true` must appear in `answer`, not only in the envelope.

---

## 7. Provenance

**Path A:** the report's own trailing `provenance` SELECT, printed
**verbatim**. Not summarised, not re-worded, not shortened to fit. It is the
same line the exported HTML report carries, which is what makes the chat
answer and the report the same artifact.

**Path B:** composed, but in the same five-slot shape, so a chat answer is
never distinguishable from a report answer by the shape of its footer:

```
feeds: <views read> (<source classes folded>)
 · window <start>→<end> inclusive, ET
 · rung <IN 🔔 | OUT (booked-only)>
 · exclusions: reporting_excluded, CC 1537 folded to Pro-Tec
 · <caveats>
```

### Mandatory caveat library (attached by what the query touched)

| trigger | clause, verbatim |
|---|---|
| `rpt_appointments.elapsed` | `appts_elapsed includes no-shows (CC logs no outcomes)` |
| any close rate | `close rates are COHORT rates (signing counts in its appointment's window, project-matched, 14d maturity); Billdu signings carry no CC appointment and are OUT` |
| any time series | `series is booked-only (rhythm law); rung shown as labeled 🔔 callout on the newest bucket only` |
| `source = 'billdu_accepted'` | `billdu_accepted rides the ATTRIBUTED-INVOICE feed (Kevin 30 Jul), not raw is_accepted; source_detail carries per-row truth` |
| `source = 'rung_pending'` | `rung sales have no age gate (145 removed the clock)` |
| any historical rep figure | `historical rows never filtered by active (Jared rule)` |
| `rpt_unassigned` non-empty | `$X unattributed · N jobs — visible companion line, never absorbed` |
| any pre-1 Jul 2026 money | `CC money before 1 Jul 2026 is inflation-suspect up to ~28%` |
| lead source touched | `lead source does not attach to signed jobs yet (~3wk lag); coverage stated, below full coverage the answer is unknown, not assumed` |

A Path B answer that renders money with an empty caveat set is a bug, not a
clean result.

---

## 8. System prompt composition

The field law is **embedded verbatim**, not paraphrased and not summarised.

**Block A** — `REPORTING.md` § *"The field law (encoded in the views — do not
re-derive)"*, complete.

**Block B** — `docs/NUMBERS-TRUTH.md` §§ *The one rule* · *Signing* ·
*Appointments* · *Reps* · *Brands and exclusions* · *Dedupe and money hygiene*
· *Reporting surfaces*, complete.

**Block C** — §3 of this document (the view surface), §4 (report surface), the
refusal contract (§9).

### Drift pin

Blocks A and B are extracted at build time and their SHA-256 committed
alongside. CI fails if the embedded text and the source files diverge. A
system prompt that has quietly drifted from the field law is worse than one
that never carried it, because it still claims to.

### Conflict riders (added, never edits to A or B)

NUMBERS-TRUTH says *"if code contradicts anything here, flag it — do not
silently follow the code."* So conflicts are carried, not resolved by
deletion:

> **Rider 1 — `billdu_accepted`.** Block B describes this feed as Billdu
> `is_accepted`. Migration 159 and REPORTING.md establish that the enum value
> is the spec's name but the underlying feed is **attributed invoices**
> (Kevin, 30 Jul, 096). In the pinned 1–14 Aug window raw acceptances read
> $202,885/33; attributed invoices read $217,095/39, and the invoice feed is
> what reconciles with both the console and the office scorecard.
> `source_detail` carries per-row truth as `billdu_invoice:<basis>`. **Answer
> from the invoice feed; state the naming divergence whenever the Billdu feed
> is material to the answer.**

> **Rider 2 — the stale clock.** Any comment anywhere claiming rung sales
> pull at "5 business days" is stale; 145 removed the clock. One such comment
> survives at `console/index.html:7176`; the code below it is correct.

---

## 9. Refusals

Refuse with a named `reason_code`, one sentence, and the nearest thing that
*can* be answered. Never a partial number as consolation.

| reason_code | trigger |
|---|---|
| `base_table_requested` | the field isn't in the layer — name the view that is closest, or say the feed does not exist |
| `commission_or_pay` | **hard.** Pay is a stricter class: own-only, RLS on a table, never a view (privacy constitution, 24 Jul). No commission column crosses this layer. |
| `platform_ip` | `signal_definitions` / `model_constants` — sealed, `authenticated` SELECT is false on both |
| `no_live_source` | spend, ROI, gross margin, CC job cost, appointment outcomes. **Absent reads absent. Never estimated.** |
| `year_over_year` | the rhythm law forbids YoY series; offer the four trailing 30-day buckets |
| `ambiguous_rep` / `ambiguous_window` | ask; do not pick |
| `gate_violation` | Path B SQL failed §2.2 |

Two standing behaviours from the field law, not user-triggered:

- **Never lead with A/R or A/P.** Surface only on explicit request, or as a
  single one-line cash flag if materially at risk.
- **No failure language on rep-facing surfaces** — "Dark", "Cooling", "F" are
  prohibited there. Owner-facing may use them. The queries emit neutral
  column names; this copy layer owns the words.

And one arithmetic guard: **count-once-per-surface.** `rpt_rep_day` rows are
additive across `source`, but must never be added to a figure that already
folds one of those classes (the PR #55 lesson). The model may not sum a
union total and a rung total into a third number.

---

## 10. Chip layout

```
┌──────────────────────────────────────────────┐
│  Ask anything about the numbers…          →  │   ← ask box, top, full width
└──────────────────────────────────────────────┘
  ( Morning Card ) ( Weekly Scorecard ) ( Rep Scorecard )
  more reports ▾
```

**The three chips bypass the LLM entirely.** A chip is a direct, deterministic
report invocation — no router, no model, no chance of invention. The model
only ever sees free-typed questions. This is the single highest-value
property of the layout, and it is why the three most-used reports are chips
rather than suggested prompts.

| chip | report | on tap |
|---|---|---|
| Morning Card | 01 | runs immediately — zero params |
| Weekly Scorecard | 03 | last **complete** week (Mon–Sun, ET), `include_rung = true`, toggle in the report header |
| Rep Scorecard | 04 | opens the inline rep picker first (`rep` is required); then last complete week, `include_rung = true` |

**"more reports ▾"** expands to the other seven, grouped by cadence as
REPORTING.md lists them:

- **Daily** — Today's Board (02)
- **Weekly** — Closing Momentum (05)
- **Monthly** — Month Close (06) · Brand P&L Bridge (07) · Job Margin (08)
- **On-demand** — Pipeline Health (09) · Marketing ROI (10)

Rendering rules that bind every chip result:

- the provenance footer prints verbatim, always, never behind a disclosure
- the confirmed/union toggle sits in the report header on every money surface,
  default union, cut always labeled
- the unassigned companion line renders wherever confirmed money renders
- reps with `rep_active_now = false` still render on historical boards
  (`departed` flag, Jared rule) and are filtered only on forward-looking ones
- Travis Janke renders flagged inside-sales, in the closer list, measured
  separately (the Travis Ruler)
- Haakon Endreson renders on his own line, `placement_pending` — no ruling, do
  not guess

---

## 11. Conflicts found while reading — flagged, not fixed

Phase 3 is contract only, so none of these were changed. All are in
`trureview-mobile`.

1. **`backend/reports/README.md` claims no report touches a base table.** Six
   do. Resolved in §1 by scoping the rule to Path B; the README line should be
   corrected at cutover so it doesn't get cited as a rule it can't support.

2. **`billdu_accepted`: NUMBERS-TRUTH vs migration 159.** Carried as Rider 1
   (§8), not silently resolved, per NUMBERS-TRUTH's own instruction.

3. **Report 03's default cut contradicts the house default.** Its header says
   *"Booked-only by default to match the sheet"*; `backend/reports/README.md`
   and REPORTING.md set the house default to `include_rung = true` (union).
   **This contract takes union** — REPORTING.md's field law outranks a
   per-report comment, and the chip is a console surface, not the office
   sheet. The booked-only cut stays one labeled toggle away. **Kevin's call to
   confirm**, since it changes what the Weekly Scorecard chip shows on first
   tap.

4. **QB rows carrying CC 1537 drop out of reports 03 and 06 silently.** The
   join is `qb.cc_company_id = <rolled brand_cc_id>`, so a `1537` QB invoice
   matches nothing. Defensible under "1537 excluded from all active
   aggregations" — but it is a *silent* drop, and the field law says
   exclusions are counted out loud. Worth a row count, not necessarily a fix.

5. **No canned report answers a rollup-grain rep question** (§5). Not a
   defect, but it means "how'd House do" always falls through to Path B.

6. **Origination is not history-proof.** The sync worker rewrites both
   `jobs.rep_id` and `cc_appointments.rep_id` from CC on every run, so
   `rep_originating_id` moves if the office edits CC in place. Already stated
   in REPORTING.md; the ask box must not describe origination as durable
   history. A `rep_first_seen` capture column is the fix, and it is a worker
   change.

---

## 12. Open decisions before build

1. **Weekly Scorecard chip default cut** — union (recommended, per §11.3) or
   booked-only to match the office sheet?
2. **Answer verbosity** — the envelope caps prose at 4 sentences. Confirm that
   is the right ceiling for the phone-width render.
3. **Path B visibility** — does a novel-question answer show the SQL it ran?
   Recommendation: yes, collapsed. It is the only way a wrong answer is
   diagnosable, and it makes the rpt_*-only guarantee visible rather than
   claimed.
