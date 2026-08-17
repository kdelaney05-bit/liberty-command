# MTD reconciliation — one signed rule, every section

**The complaint:** August MTD signed printed three different truths. The owner
read **~$551K** on the hero, **~$484K** on sales-by-rep, and remembered
**~$635K** from days earlier. All three numbers are real, all three are
explained below to the dollar, and after this change the board can only print
one.

All dollars in this document were pulled live on **17 Aug 2026** (Sunday,
~05:20 UTC). The book moves daily; the *arithmetic* is what this handoff
pins down.

---

## 1 · The reconciliation table

Every place the console computes signed dollars for a window, before this fix:

| Section | Basis (query) | Roster rule | Exclusions applied | Aug 1–17 printed |
|---|---|---|---|---|
| **Hero snapshot** + **"Month so far" Signed MTD** + **brand tiles** + **signed mix** | client `slice()`: `jobs` walk + `billdu_invoice_attributed` + `rep_sale_claim_status` | none — money is money | `reporting_excluded`; Oasis CC rows out (Billdu owns Oasis, 096); bells suppressed only by the **rep-matched** DB confirmer | **$697,337** — of which **$67,267 counted twice** |
| **Sales by rep** | `slice().reps` | rep from `jobs.rep_id` / Billdu `rep_id` / bell `rep_id` | same, **plus**: a CC contract with `rep_id null` silently belongs to no row | **$630,070** |
| **Quota fleet** | its **own** walk of `jobs` + `billduAdd` + `rungAdd` | `reps.active` only | **none of the union guards** — Oasis counted from CC *and* Billdu | per-rep inflated (Oasis CC = **$183,047** double-credited across its sellers) |
| **Weekly / daily / monthly trend charts** | their **own** walks of `jobs` + `billduAdd` + `rungAdd` | — | **no Oasis-CC exclusion** | August bar ≈ **$880K** — chart contradicted its own headline |
| **Vitals SLS / master health** | CC-only weekly walk of `jobs` | — | no Billdu, no rung; Oasis at its drifted CC amounts | a fourth weekly truth |
| **ROI board (marketing drawer)** | `rpt_report_marketing_roi` (DB, migration 160/165) | — | confirmed signings only, no rung layer | **$551,858** |
| **CC probe** (the referee) | `classic-api…/projects?filter[id]=…`, `first_contract_at` Aug 1–17, companies 1461/1560/1563 | — | CC's own book | **$507,110** across **82** projects |

### Where the owner's three numbers came from

- **$551K / $484K (what he sees now):** a render with **no rung layer at
  all**. $551,008 = CC-non-Oasis $327,263 + Billdu $223,745, *exactly*; and
  $483,741 = that minus the $67,267 of no-rep CC contracts — both match his
  reading to the thousand. The deployed `origin/main` **has** the rung fold,
  and both claim feeds answer correctly under Kevin's own JWT (verified with
  `request.jwt.claims` simulation — `rep_sale_claim_status` returns all 17
  pending bells, `my_commission_summary` returns rows). So the render he is
  looking at is a **stale build on the device** — the same class as the
  17 Aug blank-board report (PR #46 postmortem: device/cache, not data).
  A hard refresh lands him on the fixed build.
- **~$635K (what he remembers):** the honest union of a few days earlier —
  today that figure is **$630,070** (union minus the double-count). His memory
  was right; the board was double-counting and then a stale build subtracted
  the bells.

### The three root-cause candidates, ruled on

1. **Departed/active-rep filters in hero + sales-by-rep** — *not present.*
   `slice()` has no roster filter; PR #49's period-roster law held. Jared
   Heideman's two August bells ($4,973 + $4,000) were in both sections all
   along. The one surviving active-filter on a money surface was the **quota
   fleet's carrier list** — fixed (departed producers now ride along in
   windows they signed, tagged `departed`; departed sellers are no longer
   listed at $0 as a "floor miss").
2. **Jared's signings dropped/double-counted after reassignment** — *no.*
   His bells were intact. The double-count was **Eric Payne's**: three bells
   (Pestik $49,467, Bailey $16,000, Wilrowski $1,800) whose CC bookings the
   office keyed **with no rep on the record**. The DB confirmer
   (`cc_counts_claim`) matches bells **by rep**, so a rep-less booking can
   never silence its bell: the deal sat in the money twice — once as an
   unowned CC contract, once as Eric's open bell.
3. **One section stale while another live** — *yes, but between builds, not
   feeds.* Within one render the sections disagree only by the structural
   wedges above; the $551K-vs-$630K wedge is a build without the rung layer.

Also checked because the brief named them: **legacy 1537** rolls into 1563
everywhere and has zero August rows; an **R-prefix exclusion does not exist
anywhere in the console** (grep across the codebase — the `PRO…` job numbers
are display text only, never filtered on).

### One more thing the probe caught

CC project **2080960** ("Morgan, Brian — 29262", $3,200, Fencing, signed
Aug 6) was **deleted in Contractors Cloud** after our Aug 6 sync — the API no
longer returns it, and the sync never learns deletions. It has been marked
`reporting_excluded` with the reason stated, so it now shows on the Flags
card as an exclusion instead of hiding inside every total. A backend sweep
that reconciles `deleted_at` is the durable fix and stays open.

---

## 2 · The law, applied

`slice()` was already the instrument; the defects were the surfaces that
didn't read it, and one dedupe the DB couldn't do. Changes in `index.html`:

1. **`bellMatch` — the rep-blind bell↔CC match.** A pending bell is spent
   when a non-Oasis CC contract agrees with it on customer name (token-set:
   "PESTIK, RAYMOND" ≡ "Raymond Pestik") within 14 days, on exact dollars or
   on a contract carrying **no rep** (the class the DB confirmer is
   structurally blind to). And the match runs both ways: a rep-less CC
   contract **inherits the bell's rep**, so Pestik lands once, under Eric,
   instead of splitting into "unowned" + a bell. Oasis CC rows are never
   matched against — they are out of the money, and spending a bell on one
   would drop the dollars entirely.
2. **`signedUnion(a,b)`** — the one reducer: CC non-Oasis (bell-deduped,
   bell-attributed) + Billdu invoices + open rung. The weekly / daily /
   monthly trend series now read it (each had its own walk, and each had
   forgotten the Oasis-CC exclusion — ~$183K of August chart that
   contradicted the headline). The vitals SLS trace reads it too.
3. **The quota fleet reads `slice().reps`** — its private walk credited an
   Oasis seller with every deal from both books. Carriers: active sellers
   carry the floor; departed reps appear only in windows holding their
   signings, tagged, per the period-roster law.
4. **`__norep` pseudo-row in sales-by-rep** — deals with no seller anywhere
   on the record ride as one visible dimmed row ("No rep on record"), on the
   first screen, so the rep list **cross-foots with the hero by
   construction** instead of running silently under it.

## 3 · The number, after

As of the probe hour, every MTD-signed surface prints **$626,870**:

```
CC contracts, non-Oasis, bell-deduped     $324,063   (56 contracts)
Billdu invoices (all of Oasis)            $223,745   (38 invoices)
Open rung bells, net of matches            $79,062   (14 bells)
                                          ────────
BOARD TOTAL — hero = Σreps = Σbrands      $626,870
```

**Probe cross-check:** the CC-booked dollars on the board — $324,063 plus the
Oasis CC book of $183,047 that Billdu supersedes — equal the direct CC pull
**exactly**: $507,110 across 82 projects (`first_contract_at` Aug 1–17,
companies 1461/1560/1563; 1537 had no rows). The two labeled layers above
CC's book are Billdu-over-CC on Oasis (+$40,698 — invoice truth vs drifted
CC amounts) and the open rung (+$79,062) — each stated on the face of the
board, never blended silently.

**Still open, and named:** `rpt_report_marketing_roi` reads $551,858 —
$4,050 above CC-probe + Billdu-over-CC ($547,808). Same family as the July
revenue-instrument gap; the ROI board says which instrument it reads. And the
DB confirmer's rep-blindness is fixed client-side only — a migration teaching
`cc_counts_claim` the same rep-blind match for rep-less contracts would close
it at the source.

## 4 · Verified

A node harness runs the **real** page script under a stubbed DOM and feeds
the **real** `buildData()` a fixture — it stays OUT of the tree per the
`.gitignore` law (this repo is public and the fixture mirrors real deals; a
`*-harness.js` in the tree is a data snapshot waiting for a `git add -A`).
The fixture is
shaped like the live August book — the Pestik trio, a genuinely unowned
contract, drifted Oasis CC rows beside their Billdu invoices, a departed
rep's bell, a confirmed bell.

| Check | main | this branch |
|---|---|---|
| hero = union arithmetic | **FAIL** (+$67,267) | PASS |
| Σ sales-by-rep = hero | **FAIL** (−$23,000) | PASS |
| Σ brand tiles = hero | **FAIL** | PASS |
| rung net of matched bells | **FAIL** (+$67,267) | PASS |
| Pestik-class deals land under their seller, once | PASS | PASS |
| departed rep keeps his window rows | PASS | PASS |
| no-rep pseudo-row carries the gap visibly | **FAIL** (absent) | PASS |
| quota rep = union, never CC+Billdu | **FAIL** (2.8× over) | PASS |
| monthly trend bar = hero | **FAIL** (+$183K Oasis double) | PASS |
| vitals SLS series populated from union | PASS | PASS |

Page boots clean to the login gate (no console errors) served statically.
Live totals cannot render without an owner session; the SQL in §1 is the
live-data proof, reproducible verbatim.
