# ASK-ANYTHING-CONTRACT.md — the interface contract (Phase 3)

The contract the ask-anything box consumes. Spec only — no frontend in this
pass, per the Phase 1 addendum's stop point.

Source of truth read for this contract: `kdelaney05-bit/trureview-mobile` at
`76d5a0a` — `REPORTING.md`, `docs/NUMBERS-TRUTH.md`,
`backend/migrations/159_reporting_layer_views.sql`, `backend/reports/*.sql`.
The field law is quoted from those files, never re-derived here.

**Status:** accepted by Kevin, 15 Aug, with four rulings — all folded in; see
§11. Transport settled by **migration 160** (applied live, PR #193): the ten
reports are SECURITY INVOKER RPCs over PostgREST — §2.4 and §4.

⚠️ **Rulings 1–3 each have a SQL half that is specified but NOT APPLIED
(§13)** — write access to `trureview-mobile` was denied this session. Since
160, that SQL now lives in **two** places (the report files *and* the RPC
bodies), so each patch is double-sited and the RPC half needs its own
migration. Until they land, this contract and the running code disagree.

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

### ⚠️ RULING (Kevin, 15 Aug) — do not re-narrow this

This scoping is **settled law, not a reading open to revision**. Kevin's
ruling, verbatim in substance: *the base-table rule as originally written was
overbroad; the restriction binds MODEL-AUTHORED SQL only; canned reports are
pre-vetted, parameterizable, never model-edited.*

Stated as three rules a future session must not soften:

1. **Model-authored SQL (Path B) may reach the six `rpt_*` views and nothing
   else.** No base tables, ever, for any reason, however well-justified the
   question.
2. **Canned reports (Path A) may read base tables** for fields the reporting
   layer does not carry — QB money, `fin_*` balances, job city, lead source.
   They are human-reviewed artifacts. Six of the ten do this today and are
   correct to.
3. **The model's only power over a canned report is its parameters.** Not its
   text, not its `WHERE` clause, not "just this once with one column added."
   A model-edited report is a Path B query wearing a report's provenance
   footer, which is the worst of both — an invented number carrying a trusted
   surface's credibility.

The reason the distinction survives is rule 3. Rules 1 and 2 describe *where*
data comes from; rule 3 is what stops Path B from laundering itself into Path
A. If a future session finds a canned report that "almost" answers a question,
the answer is a new reviewed report or a Path B query that says so — never an
edit.

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

**2.2 — Statement gate (the real rpt_*-only control).** *Applies if Path B
executes SQL. See §2.4 — since 160 the recommended Path B transport is
PostgREST reads, which makes most of this gate unreachable-by-construction
rather than enforced-by-inspection. Kept in force pending decision §12.1.*
Path B SQL is parsed before execution. Reject unless *all* hold:

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

### 2.4 — Transport (migration 160, applied live)

Path A no longer runs psql. Each report is a **SECURITY INVOKER function**
callable over PostgREST:

```
POST /rest/v1/rpc/rpt_report_<slug>      Authorization: Bearer <caller JWT>
  → 200 jsonb { report, sections: {<name>: [rows…]}, provenance }
```

Verified live 15 Aug: owner JWT 200, anon 401 (`revoke all … from public,
anon`), and `rep_scorecard(Eric, 1–14 Aug, union)` reconciles with Phase 4 to
the dollar — $63,736/13 cc + $116,429/9 rung = $180,165/22.

**This confirms §2.1 rather than replacing it.** The functions are
`language sql stable` with no `security definer`, so they are invoker by
default: the same reasoning that governs the views governs the RPCs, and the
caller's JWT is still what RLS reads. The owner passes `is_manager()`; a rep
credential gets own-only from the same call.

> ⚠️ **The grant is `authenticated, service_role`.** `service_role` has
> EXECUTE. The ask-anything box **must never hold it** — a service-role call
> returns the whole book to whoever asked, bypasses RLS, and pre-breaks 153.
> That the grant exists is not permission to use it.

#### What this does to Path B

Migration 160 settles Path A's transport and **leaves Path B's open.**
PostgREST cannot execute arbitrary SQL, so the §2.2 statement gate now has
nothing to gate unless a SQL-executing RPC is built — and building one would
reintroduce the exact risk §2 exists to prevent, on a surface that already
passed review.

**Recommendation: Path B is PostgREST reads against the six views**, e.g.
`GET /rest/v1/rpt_rep_day?select=…&day=gte.…`. This is strictly better than
the SQL parser it replaces:

- the allowlist becomes a **path check** — the relation is a URL segment, not
  something recovered from parsing SQL. §2.2's "parse it, don't regex it"
  caveat disappears because there is no SQL to parse.
- the REST grammar cannot express a base-table read, a `SECURITY DEFINER`
  call, DDL, or a second statement. Most of §2.2 becomes unreachable by
  construction rather than forbidden by inspection.
- `rpt_rep_day` / `rpt_brand_day` are already aggregated, so the common novel
  question is a filter and a group over them — inside what PostgREST does.

The cost is real and should be named: questions needing a join or an
aggregate shape PostgREST cannot express become unanswerable on Path B, and
must surface as `no_route` (§9) rather than being quietly escalated to SQL.
**That is the correct trade.** An unanswerable question is a known gap; an
arbitrary-SQL RPC is an unknown one.

If Kevin wants full SQL on Path B instead, §2.2 stands as written and needs a
`rpt_query(sql text)` RPC — which should be reviewed as its own workstream,
not folded into this contract. **Open decision, §12.**

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

**Called as RPCs** (migration 160), not psql. `win_start`/`win_end` are
**inclusive both ends, ET dates**. `brand` is a CC company id
(`1461`/`1563`/`1560`) or `''` for all. `rep` is an `rpt_reps.id` **uuid** —
`null` means all where the report allows it (**not** `''`; that is the psql
convention and it is a type error over the RPC). `include_rung` is the
confirmed-vs-union toggle.

### 4.1 — Slugs, signatures, sections

Every slug is prefixed `rpt_report_`. Defaults are the function's own, so an
omitted param takes them — **`include_rung` defaults to `true`, the house
union cut, at the transport layer.** A caller that wants the booked-only cut
must pass `false` explicitly.

| # | `POST /rest/v1/rpc/rpt_report_…` | signature | `sections` keys |
|---|---|---|---|
| 01 | `morning_card` | `()` | `card` |
| 02 | `todays_board` | `(brand text = '')` | `board` |
| 03 | `weekly_scorecard` | `(win_start date, win_end date, include_rung boolean = true)` | `brand_block`, `rep_closing`, `unassigned` |
| 04 | `rep_scorecard` | `(rep uuid, win_start date, win_end date, include_rung boolean = true)` | `production`, `appointments`, `cohort_close`, `origination` |
| 05 | `closing_momentum` | `(brand text = '', rep uuid = null, include_rung boolean = true)` | `series`, `rung_callout` |
| 06 | `month_close` | `(month_start date, include_rung boolean = true, breakeven_fencing numeric = 0, breakeven_protec numeric = 0, breakeven_oasis numeric = 0)` | `close` |
| 07 | `brand_pnl_bridge` | `(month_start date)` | `bridge` |
| 08 | `job_margin` | `(win_start date, win_end date, brand text = '')` | `jobs` |
| 09 | `pipeline_health` | `(brand text = '')` | `chase_list`, `rollup` |
| 10 | `marketing_roi` | `(win_start date, win_end date)` | `by_source`, `coverage` |

Only 04's `rep`, 03/08/10's window, and 06/07's `month_start` are required;
everything else has a default.

**Empty sections are `[]`, never `null`.** An empty array is a measured
absence — "nothing signed yesterday" — and must render as such. It is not a
failure and not a zero to be hidden.

`cohort_close` rows are ordered by an internal `days` key which is **stripped
from the output**; consume `label` and do not re-sort by it alphabetically.

The row shapes below are unchanged by 160 — the SQL inside each function is
the report file's SQL reshaped into jsonb, not re-derived.

### 4.2 — Row shapes per section

Params in this table are the psql `-v` names (`backend/reports/*.sql`, still
canonical for hand runs); the RPC equivalents are §4.1.

| # | report | params | sections and their columns |
|---|---|---|---|
| 01 | Morning Card | *none* | `blocks[block, who, source, units, dollars]` (blocks: `signed_yesterday`, `appts_today`, `unassigned`, `rung_open`) · provenance |
| 02 | Today's Board | `brand` | `[rep, rep_inside_sales, brand_name, appts_today, elapsed, upcoming, booked_today, next_appt_at]` · provenance |
| 03 | Weekly Scorecard | `win_start`, `win_end`, `include_rung` | per-brand `[brand_name, leads_projects_created, appts, appts_elapsed, units, revenue, of_which_rung, invoiced, collected, ar]` · per-rep `[rep, rep_inside_sales, departed, appts_elapsed, units, revenue, rung_units, rung_dollars]` · unassigned `[reason, day, amount, deal_label, brand_name, detail]` · provenance |
| 04 | Rep Scorecard | `rep` **(required)**, `grain` (`rep`\|`rollup`, default `rep`), `win_start`, `win_end`, `include_rung` | production `[rep_name, rep_rollup_name, rep_active_now, rep_inside_sales, source, units, dollars]` · appointments `[booked_in_window, on_calendar, elapsed]` · cohort close `[label, appts_in_cohort, closed, close_pct]` · origination split `[signed_on, amount, deal_label, rep_originating_name]` · provenance |
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

### `grain` on report 04 (ruling 3, Kevin 15 Aug)

House/Gio is a line Kevin reads regularly and it must not depend on the router
improvising a Path B query. Report 04 takes `grain`:

- `grain = 'rep'` (default) — filters `rep_id = :rep`. Unchanged behaviour.
- `grain = 'rollup'` — filters `rep_rollup_id = :rep`, folding Jessica Coley,
  Jessica Oasis, Nick Campana and Gerardo Costas into House/Gio.

**Safety property that makes this a low-risk change:** for every rep outside
the rollup set, `rollup_id = id`, so `grain='rollup'` returns figures
*identical* to `grain='rep'`. The parameter can only change an answer for the
four rolled-up reps and Gio. It does not disturb the Phase 4 reconciliation.

Origination comparison stays **raw** under both grains
(`rep_originating_id is distinct from rep_id`) — a close on a housemate's
appointment is still a real origination fact, and blurring it inside the house
line would hide exactly what ruling 4 of the addendum asked to expose.

### Reports that ignore the window on purpose

Report 01's `unassigned` and `rung_open` blocks carry **no window** — they are
every open row, by design (a nudge list). The answer must not narrate them as
"yesterday's". Same for report 09, which is all open builds, not a window.

---

## 5. Routing

### Router output (the only three shapes)

```json
{"route":"report","rpc":"rpt_report_rep_scorecard","params":{...},"confidence":0.0-1.0}
{"route":"view_query","view":"rpt_rep_day","query":"...","why_no_report":"..."}
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

**Rollup-grain questions resolve, they do not fall through** (ruling 3).
"How'd House do" → `report 04, {rep: <Gio's uuid>, grain: 'rollup', …}`. The
rep resolver maps `House`, `House / Gio`, and `Gio` to Gio Calderin's uuid;
`House`/`House / Gio` set `grain = 'rollup'`, a bare `Gio` sets
`grain = 'rep'` (his own line, $675 · 1 in the pinned window — the two are
different questions and the answer names which one it ran).

The four rolled-up reps — Jessica Coley, Jessica Oasis, Nick Campana, Gerardo
Costas — resolve to their **own** raw line under `grain='rep'` when named
directly. Raw identity is always kept; asking about Jessica Coley must not
silently return the House total.

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
  "route": {"kind":"report","rpc":"rpt_report_rep_scorecard","params":{…}}
         | {"kind":"view_query","view":"rpt_rep_day","query":"…"},
  "blocks": [ {"title":"…","section":"production","rows":[…]} ],
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

### Mapping the RPC response onto the envelope

`blocks` comes from `sections` — one block per key, in the order §4.1 lists
them (jsonb object key order is not guaranteed; do not iterate and hope).
`provenance` is copied across **unmodified**. `report` is the RPC's own label
and is what the block heading reads.

The envelope adds only the prose wrapper, the cut label, and the companion
lines. **Nothing in `sections` is recomputed, re-summed, re-sorted or
re-rounded on the way through.** A total that appears in the envelope but not
in the RPC response is an invented number no matter how correct its
arithmetic — that is the count-once-per-surface rule at the transport
boundary.

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
| QB money in a brand join (03/06) | `QB CC 1537 (legacy Liberty Roofing) is NOT in the brand join: N rows, $X excluded — counted out loud, never silently dropped` |
| report 04 at rollup grain | `grain: ROLLUP (House/Gio folds Jessica Coley, Jessica Oasis, Nick Campana, Gerardo Costas; raw identity kept in the layer)` |

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
| `gate_violation` | Path B query failed the §2.2 / §2.4 gate |
| `no_route` | no canned report fits **and** Path B's transport cannot express the question (§2.4). Say which half failed — a shape PostgREST can't reach is a different fact from a question the layer has no data for. |

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

**The three chips bypass the LLM entirely.** A chip is a direct RPC call —
`POST /rest/v1/rpc/rpt_report_<slug>` with the signed-in user's JWT. No
router, no model, no chance of invention. The model only ever sees free-typed
questions. This is the single highest-value property of the layout, and since
160 it is also the simplest thing to build: a chip is one fetch and a render,
with no server of our own in the path.

| chip | report | on tap |
|---|---|---|
| Morning Card | 01 | runs immediately — zero params |
| Weekly Scorecard | 03 | last **complete** week (Mon–Sun, ET), **`include_rung = true` — UNION, ruling 1**, toggle in the report header |
| Rep Scorecard | 04 | opens the inline rep picker first (`rep` is required); then last complete week, `include_rung = true` |

**Rep picker contents** (ruling 3): every rep in `rpt_reps`, plus a pinned
**House / Gio** entry at the top that runs `grain = 'rollup'`. Gio's own raw
line stays in the list separately. Departed reps stay in the picker — the
scorecard is a historical surface and `rep_active_now = false` is not an
erasure (Jared rule); they render with the `departed` flag.

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

## 11. Rulings of record (Kevin, 15 Aug)

Contract accepted with four rulings. All are binding; none may be re-opened by
a later session without Kevin.

| # | ruling | status |
|---|---|---|
| — | Base-table rule was overbroad. Restriction binds **model-authored SQL only**; canned reports are pre-vetted, parameterizable, never model-edited. | ✅ written into §1 as settled law |
| — | The GRANT approach is impossible under `security_invoker`. | ✅ §2, boundary is the statement gate + end-user JWT |
| 1 | **Weekly Scorecard chip: UNION.** Field law outranks a per-report comment. Report 03's header comment must be fixed so it no longer contradicts the house default. | ✅ contract (§4, §10); **160 makes union the RPC's own default** · ⚠️ comment fix **not applied** — §13 patch A |
| 2 | **CC 1537 in the QB brand join: exclusion correct, silence is not.** Surface excluded 1537 rows as a named provenance line with count and dollars. | ✅ contract (§7) · ⚠️ SQL **not applied**, both halves — §13 patches B, C, F1 |
| 3 | **Rollup-grain gap must resolve, not fall through.** House/Gio is read regularly and must not depend on router improvisation. | ✅ contract (§4, §5, §10) · ⚠️ SQL **not applied**, both halves — §13 patches D, F2 |
| 4 | **`billdu_accepted` rider stays a rider.** Do not resolve by deletion. | ✅ unchanged, §8 Rider 1 |
| — | **C7 resolved:** the ten reports are SECURITY INVOKER RPCs over PostgREST (migration 160, live, PR #193). | ✅ transport in §2.4, §4.1; Path B transport now open — §12.1 |

### Still-open observations (not ruled, not blocking)

- **`backend/reports/README.md` claims no report touches a base table.** Six
  do. Scoped in §1; the README line should still be corrected upstream so it
  isn't cited as a rule it cannot support (§13 patch E).
- **Origination is not history-proof.** The sync worker rewrites both
  `jobs.rep_id` and `cc_appointments.rep_id` from CC on every run, so
  `rep_originating_id` moves if the office edits CC in place. Already stated
  in REPORTING.md; the ask box must not describe origination as durable
  history. The fix is a `rep_first_seen` capture column — a worker change,
  outside this contract.

---

## 12. Open decisions before build

1. **Path B transport** (new, raised by 160 — §2.4). Recommendation:
   PostgREST reads against the six views, path-allowlisted. It makes the
   `rpt_*`-only guarantee structural instead of parsed, at the cost of
   novel questions needing joins PostgREST can't express, which then refuse
   as `no_route`. The alternative — a `rpt_query(sql text)` RPC — keeps §2.2
   as written but re-opens arbitrary SQL and should be its own reviewed
   workstream, not a line in this contract.
2. **Answer verbosity** — the envelope caps prose at 4 sentences. Confirm that
   is the right ceiling for the phone-width render.
3. **Path B visibility** — does a novel-question answer show the query it ran?
   Recommendation: yes, collapsed. It is the only way a wrong answer is
   diagnosable, and it makes the `rpt_*`-only guarantee visible rather than
   claimed.

*(The Weekly Scorecard default cut was decision 1 and is now ruling 1: union
— and since 160 it is also the RPC's own default.)*

---

## 13. Upstream changes required in `trureview-mobile` — SPECIFIED, NOT APPLIED

⚠️ **Rulings 1–3 have a SQL half that did not land in this session.** Write
access to `kdelaney05-bit/trureview-mobile` was denied by the environment
(the repo was attached read-only; the push-access request was blocked). The
patches are written out below so they can be applied mechanically, per
Kevin's "log it if you can't fix it in this pass."

Verified against `0f63999` (post-160): `backend/reports/*.sql` is **unchanged**
since `76d5a0a`, so none of patches A–E has landed.

Until they are applied: **the contract and the running code disagree.** Report
03 still prints a header comment claiming booked-only, reports 03/06 still
drop CC 1537 from the QB join silently, and `rpt_report_rep_scorecard` has no
`grain`, so the Rep Scorecard chip's House / Gio entry has nothing to call.

### ⚠️ Since 160, every report patch is DOUBLE-SITED

The report SQL now lives in two places:

1. `backend/reports/<nn>-<slug>.sql` — canonical for hand runs
2. the RPC body in `backend/migrations/160_reporting_rpcs.sql` — what the
   product actually calls

`backend/reports/README.md` states the rule directly: *"edit a report in BOTH
places or the two surfaces drift."* A patch applied to only one half is worse
than no patch, because the two surfaces then disagree while both claim the
same provenance footer — the precise failure this whole layer was built to
end.

**The RPC half needs its own migration — 161, numbered from the live head, not
from this document** (`schema_migrations` is unreliable; object presence is
the only trustworthy check, and there have been five collisions). Do not edit
160 in place: it is applied live and registered.

Translation notes when porting a patch from a report file to an RPC body:

- params are plain identifiers (`win_start`), not psql vars (`:'win_start'`)
- provenance is an expression inside `jsonb_build_object`, so a CTE value is
  reached with a scalar subquery — `(select n::text from x1537)`
- 160 deliberately fixes the doubled `%%` in 07/08/09 provenance (a psql
  escaping artifact) to a single `%`. Keep that; do not "restore" it.

### Patch A — ruling 1 · `backend/reports/03-weekly-scorecard.sql`, lines 3–5

Replace:

```sql
-- Goal: retire the manual sheet. Booked-only by default to match the sheet;
-- flip :include_rung to see the union cut — ALWAYS labeled either way.
```

with:

```sql
-- Goal: retire the manual sheet. HOUSE DEFAULT IS UNION (:include_rung=true,
-- rung IN, labeled 🔔) — Kevin's 10 Aug console ruling and the REPORTING.md
-- field law; the ask-anything Weekly Scorecard chip runs it that way (ruling 1,
-- 15 Aug). The office sheet's booked-only cut is :include_rung=false, one
-- toggle away — ALWAYS labeled either way.
```

### Patch B — ruling 2 · `03-weekly-scorecard.sql`, the closing provenance SELECT

The statement needs a CTE, so it changes shape:

```sql
with x1537 as (
  select count(*) n, coalesce(sum(total_amt),0) amt
  from qb_invoices
  where txn_date between :'win_start'::date and :'win_end'::date
    and not reporting_excluded
    and cc_company_id = '1537'
)
select 'feeds: rpt_brand_day/rpt_rep_day (cc_contract + billdu attributed invoices'
       || case when :include_rung then ' + rung 🔔' else '; rung EXCLUDED (booked-only cut)' end
       || ') · QB invoiced/collected/AR txn-dated, R-prefix excluded'
       || ' · QB CC 1537 (legacy Liberty Roofing) is NOT in the brand join: '
       || x1537.n || ' rows, ' || to_char(x1537.amt,'FM$999,999,990.00')
       || ' excluded — counted out loud, never silently dropped'
       || ' · window ' || :'win_start' || '→' || :'win_end' || ' inclusive, ET'
       || ' · leads = CC projects created (no separate lead object in sync)'
       || ' · appts_elapsed includes no-shows (CC logs no outcomes)'
       || ' · close rate NOT printed here: signings lag the appointment; see Rep Scorecard cohort windows'
       as provenance
from x1537;
```

Zero rows is a legitimate and useful result — `0 rows, $0.00` is the exclusion
counted out loud, which is the point of the ruling.

### Patch C — ruling 2 · `06-month-close.sql`, the closing provenance SELECT

```sql
with x1537 as (
  select count(*) n, coalesce(sum(total_amt),0) amt
  from qb_invoices
  where txn_date between :'month_start'::date
        and (:'month_start'::date + interval '1 month' - interval '1 day')::date
    and not reporting_excluded
    and cc_company_id = '1537'
)
select 'feeds: rpt_brand_day (signed) + qb_invoices (invoiced/collected, txn-dated, R-prefix excluded)'
       || ' · QB CC 1537 (legacy Liberty Roofing) is NOT in the brand join: '
       || x1537.n || ' rows, ' || to_char(x1537.amt,'FM$999,999,990.00')
       || ' excluded — counted out loud, never silently dropped'
       || ' · month ' || :'month_start' || ' vs prior month, ET · rung '
       || case when :include_rung then 'IN, labeled' else 'OUT (booked-only)' end
       || ' · breakeven figures are office inputs, not derived — absent reads absent'
       || ' · signed ≠ invoiced ≠ collected: three different clocks, never blended'
       as provenance
from x1537;
```

### Patch D — ruling 3 · `04-rep-scorecard.sql`, add `:grain`

New param, default `'rep'`. Chosen over an eleventh report because 04's stated
design is *"ONE report + rep picker"* — a rollup is a picker entry, not a
second report — and because it leaves the Phase 4 reconciliation untouched
(`rollup_id = id` for every rep outside the rollup set, so `grain='rollup'`
is numerically identical to `grain='rep'` for all of them).

Define once, conceptually, then apply at all four filter sites:

```sql
-- the grain switch, used in every statement below
(case when :'grain' = 'rollup' then rep_rollup_id else rep_id end) = :'rep'::uuid
```

**1 — production block.** The `select`/`group by` must change too: at rollup
grain several raw reps fold in, so per-rep identity columns would split the
line into several rows per source.

```sql
select
  case when :'grain'='rollup' then d.rep_rollup_name else d.rep_name end as rep_name,
  d.rep_rollup_name,
  bool_or(d.rep_active_now)   as rep_active_now,
  bool_or(d.rep_inside_sales) as rep_inside_sales,
  d.source, sum(d.units) units, sum(d.dollars) dollars
from rpt_rep_day d, wnd
where (case when :'grain'='rollup' then d.rep_rollup_id else d.rep_id end) = :'rep'::uuid
  and d.day between wnd.a and wnd.b
  and (d.confirmed or :include_rung)
group by 1,2,5 order by d.source;
```

**2 — appointments block:** replace `where rep_id = :'rep'::uuid` with the
grain switch (`rpt_appointments` carries `rep_rollup_id`).

**3 — cohort block:** replace `where a.rep_id = :'rep'::uuid` with the grain
switch on `a.`.

**4 — origination split:** replace `where rep_id = :'rep'::uuid` with the
grain switch, but **leave the comparison raw** —
`rep_originating_id is distinct from rep_id` stays as written. Folding it to
rollup grain would hide cross-rep origination inside the house line, which is
the exact distortion addendum ruling 4 asked to expose.

**5 — provenance:** append

```sql
|| ' · grain: ' || case when :'grain'='rollup'
     then 'ROLLUP (House/Gio folds Jessica Coley, Jessica Oasis, Nick Campana, Gerardo Costas; raw identity kept in the layer)'
     else 'raw rep' end
```

### Patch E — `backend/reports/README.md`

1. Add `grain` to the params table: `text` · `'rep'` (default) or `'rollup'` ·
   report 04 only · rollup folds House/Gio.
2. Correct *"No report touches a base table"* to the scoped form: no report
   derives **a signing** from anywhere but the `rpt_*` views; six read base
   tables for QB money, `fin_*`, job city and lead source, which the layer
   does not carry.
3. Note that the model may parameterise these reports and never edit them.

### Patch F — the RPC half, as migration 161

Patches B, C and D again, against the function bodies. Number from the live
head.

**F1 · `rpt_report_weekly_scorecard` and `rpt_report_month_close`** (ruling 2).
Add the `x1537` CTE to each body and reach it from the provenance expression
with scalar subqueries:

```sql
x1537 as (
  select count(*) n, coalesce(sum(total_amt),0) amt
  from qb_invoices
  where txn_date between win_start and win_end      -- month_close: month_start .. month end
    and not reporting_excluded
    and cc_company_id = '1537'
)
```

```sql
    || ' · QB CC 1537 (legacy Liberty Roofing) is NOT in the brand join: '
    || (select n::text from x1537) || ' rows, '
    || (select to_char(amt,'FM$999,999,990.00') from x1537)
    || ' excluded — counted out loud, never silently dropped'
```

**F2 · `rpt_report_rep_scorecard`** (ruling 3) — add `grain text default 'rep'`
and apply the §13-D grain switch at all four filter sites inside the body.

> ⚠️ **`CREATE OR REPLACE` will NOT do this.** A different argument list is a
> different function in PostgreSQL, so replacing with a 5-arg version
> **leaves the 4-arg one in place** — two overloads, and PostgREST resolves
> RPC overloads by the key set in the request body. A call omitting `grain`
> would still reach the old function and silently return raw-rep figures
> under a rollup heading. That is a wrong number wearing a correct
> provenance footer.
>
> Drop first, then create, then **re-grant** — `DROP FUNCTION` takes the
> grants with it:
>
> ```sql
> drop function if exists rpt_report_rep_scorecard(uuid,date,date,boolean);
> -- create or replace function rpt_report_rep_scorecard(
> --   rep uuid, win_start date, win_end date,
> --   include_rung boolean default true, grain text default 'rep') …
> revoke all on function rpt_report_rep_scorecard(uuid,date,date,boolean,text)
>   from public, anon;
> grant execute on function rpt_report_rep_scorecard(uuid,date,date,boolean,text)
>   to authenticated, service_role;
> ```
>
> Confirm afterwards that exactly one `rpt_report_rep_scorecard` remains:
> `select oid::regprocedure from pg_proc where proname = 'rpt_report_rep_scorecard';`

Patch A (a comment) and patch E (a README) have no RPC half.

### Verification once applied

- `psql -v grain="'rollup'" -v rep="'940ad537-cfbd-4129-a335-9d8a9bc7a013'"` —
  House / Gio returns Gio's own line **plus** the four rolled-up reps; a
  `grain='rep'` run on the same uuid returns Gio alone ($675 · 1 in the pinned
  1–14 Aug window, per the Phase 4 reconciliation).
- Any rep outside the rollup set must return **byte-identical** figures under
  both grains. If one does not, the patch is wrong.
- Reports 03 and 06 print the 1537 line whether or not any rows match.
- **Both halves agree.** For each patched report, the psql run and the RPC
  call must produce the same figures and the same provenance string. The
  Phase 4 anchor is the check that matters:
  `rpt_report_rep_scorecard(Eric, '2026-08-01', '2026-08-14', true)` must
  still read $180,165 · 22 after the `grain` change, on both halves.
- Anon still 401s on every slug, including the re-created 5-arg one.
