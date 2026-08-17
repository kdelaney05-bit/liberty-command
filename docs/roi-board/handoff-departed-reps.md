# Handoff — departed reps, and what a roster filter was deleting

17 Aug 2026 · branch `claude/roi-board-departed-reps`

## The bug in one line

Every rep board on this console built its roster from `reps.active && reps.sells`
— a question about who works here **today**, asked of boards whose entire
subject is what already **happened**. When someone leaves, both flags flip, and
their history goes with them.

Jared Heideman closed **26 jobs for $137,116** in July 2026 — the fourth-largest
book that month. He left. On the July board he was gone from *Who closes what*
entirely and buried behind "Show all" on *Sales by rep*. His Google column is
the strongest on the grid, and the grid exists to decide who gets the next
Google lead.

## The rule that replaced it

> **Presence in the period's data puts a row on a board. The roster only
> supplies the name and the departed tag.**

`mktSellers` now takes every Contractors Cloud seller the roster has *ever*
carried and tags each with whether they are still here:

```js
mktSellers: reps.filter(r => r.sells || r.role === 'sales')
  .map(r => ({ id: String(r.id), name: r.name || '—', gone: !r.active }))
```

`sells || role === 'sales'` keeps migration 098's actual law — a non-selling
manager still has no closing rate to read and still lands no row. The `role`
clause is load-bearing: `sells` is flipped off at departure alongside `active`,
so the flag alone can no longer recognise a seller who has left.

Departed rows are tagged **departed** in gold wherever they appear, so nobody
reads a closed book as a live desk to route work to.

## What shipped

| # | Fix | Where |
|---|---|---|
| 1 | Grid columns stopped being clipped | `.mkg` CSS |
| 2 | Departed reps keep their rows | `mktSellers`, `mkGridData`, `cardReps` |
| 3 | Source ledger compressed to active sources | `cardSourceRow`, `mkEverPaid` |
| 4 | Google spend law + both figures on the pacing chip | `mkPaceChip` |
| 5 | July rep board, live, with the inherited-lead flag | `mkt2CardRepBoard`, `mkInherited` |

### 1 · The clipping was not a missing scroller

`.mkg-wrap` already had `overflow-x: auto`. The table never overflowed it. A
table laid out `auto` inside a narrower box does not overflow — it **squeezes**,
because its min-content width (the longest single word in a header) sits far
below its preferred width. Measured at 1050px before the fix:

```
wrapClient=965  tableScroll=965  scrollable=false
columns=149,60,61,61,60,60,61,63,60,61,60,60,60,60   (designed: 78)
header height=38px  (wrapped to 2–3 lines)
```

`width: max-content` makes the table take its preferred width, which overflows
the wrapper and finally hands it the scroll. After:

```
wrapClient=965  tableScroll=1195  scrollable=true  hiddenPx=230
columns=149,78,78,78,78,78,78,78,78,78,78,78,78,78
header height=28px
rep column: position=sticky, left=43 unscrolled AND scrolled fully right
```

At 390px the phone transposition still takes over below 700px — one block per
rep, every source present, page does not scroll sideways (`scrollWidth ==
clientWidth`). **The transposition was left in place.** The brief asked for the
scroll container tested at 390px; below 700px there is no table to scroll, and
replacing a working design that drops nothing seemed worse than keeping it. If
you want the scrolling grid on phones instead, it is a one-line breakpoint
change — flag it and it is done.

### 3 · "not entered" now means something

The list rendered all 25 sources the RPC returns for July under two separators.
Sixteen said nothing at all: no cost, no revenue, only a backfill-dated lead
count the board already refuses to print.

- **Visible** = a cost in the book this month **or** a signed dollar this month.
  July: Saving Safari, Google, Angi, Referral, Previous Customer, Ref-Self-Gen,
  Website, Facebook, Slug A Bug — 9 rows, exactly the set the brief named.
- **Folded** = one row, `› 16 inactive sources`, opening on tap. Folded, never
  dropped: the count is on its face and the leads travel with it.
- Rows tightened to single-line. The whole visible ledger is ~490px tall at
  1050px and fits one phone screen.

The `$0 · EARNED` badge is decided by **evidence, not another ruling to keep in
sync**. `mkEverPaid()` asks whether the office has ever keyed a real cost for
that source in any month — that is what proves a cost exists to be typed.
⚑3 tooling rows do not count, so a Marlie AI vendor line does not make "Marlie
AI" a paid channel.

The consequence is the point: **"not entered" now appears only against a source
the book proves costs money whose month nobody has keyed.** That is a list worth
chasing. Before, Website / Facebook / Ref-Self-Gen / Slug A Bug wore it forever
and it read as wallpaper. Tapping an earned badge still opens the input, so a
channel that starts costing money can be priced from the same place.

### 4 · Google spend law — audited, and the fork is now visible

Confirmed by reading every spend path: `mkSpendOf`, `mkSpendSplit`,
`mkBrandSpend`, `mkGoogleCard` and `mkBookTotal` all take rows from `MKT.spend`
(typed `marketing_spend` — the card). `MKT.ads` (`google_ads_daily`) is
referenced by `mkWindsorPacing` alone, which feeds the pacing chip and the
footer's freshness line. **There is no third path.** Typed wins, and nothing on
either board is priced from Windsor.

What was missing was the disagreement. The chip now carries both figures:

```
windsor $25K · card $48K · windsor lags cards      ← July 2026, live
windsor $47K · tracks card                         ← inside the 5% band
windsor $60K · card $48K · windsor over cards      ← overshoot names itself
windsor pacing $25K                                ← no card month keyed
windsor silent · last 2026-07-20                   ← feed delivered nothing
windsor never delivered
```

5% tolerance so rounding and late-posting days do not cry wolf.

### 5 · The rep board is no longer withheld

The old refusal pointed at *Who closes what* and said a month-sliced answer
would be noisier. **That reasoning was about rep × SOURCE cells**, where a month
really does leave n=2 — and it still holds, which is why *Who closes Google
leads* stays refused. It was never true of rep **totals**: July gives Eric 110
leads, Mike 88, Travis 38. Those are denominators.

Leads date on `cc_raw->>'project_created_at'` — the clock this console already
calls the only honest lead date in the database — not on the RPC's leads column
(`jobs.created_at`, the 20 Jul backfill). That is what lets a monthly rep board
exist while the leads column two sections up is still refused.

## Numbers in the brief that live data does not support

Neither of these was fudged on the page. The board computes from its own feeds
and prints what it computes.

**Jared, July: the brief says 22 signed / $121,234.** Contractors Cloud says
**26 / $137,116**, and so does the approved standalone board
(`marketing-board-v2-approved.html` line 624: *"Fencing 26 · 25 lds → 26 units ·
$5,274 tkt"*, `$137K`). Two independent instruments agree against the brief. The
board shows 26 / $137,116. If 22 / $121,234 came from a filter nobody has
written down, that filter needs naming before it goes on a screen.

**Travis, July: the brief says raw 8%.** The board reads **11%**. The
denominator is not in dispute — 38 leads on both instruments, the approved
board's probe walk and `project_created_at` agreeing exactly. The numerator is:
the approved board counted 3 units, live counts 4. The extra is project
**1942773**, a July-2025 lead signed 15 Jul 2026 for $8,190 — outside the
2,500-project window the probe walk sampled. 4/38 is 11%; 3/38 is 8%. Live is
right and the probe walk was short a row.

## Still open

- **The revenue-instrument gap.** Probe walk $1,248,081 vs the RPC's July read.
  Angi prices 7x here against the approved board's 4.35x for the same reason.
  Pre-existing, documented at the top of the board, untouched by this work.
- **`cc_appointments.cc_result_id`** is still not an outcome log (83 of 9,627).
  *Appointments ran* stays empty and says so.
- **Leads before Aug 2026** remain backfill-dated in the RPC. The rep board
  routes around it via `project_created_at`; the CPL column and the leads column
  on board 1 still refuse, correctly.
- **Jake Facebook's 1 inherited project.** `mkInherited()` finds it. It is an
  office account, not a seller row, so it does not surface on the rep board.
  Real, harmless, noted so it is not a surprise later.

## Where this branch sits

`index.html` in the OneDrive checkout had ~750 lines of uncommitted work in it
when this started — the **VITALS HERO** login-screen rebuild, unrelated to the
marketing board. Per your call these fixes were kept out of it entirely. That
work has since landed on its own as `1067d16` on `claude/marketing-board-v2`.

This branch is cut from **`fb35f81`**, which is already in `main`, so it carries
these five fixes and nothing else. `1067d16` and this branch both touch
`index.html` but in disjoint regions — the vitals hero sits in the pulse/render
half of the file, everything here is in the marketing drawer and the ROI board.

```
git worktree add -b claude/roi-board-departed-reps \
  /c/Users/kdela/AppData/Local/Temp/claude/liberty-wt fb35f81
```

The worktree was not stylistic. Twice during this session `index.html` in the
synced folder reverted mid-edit to a copy carrying the vitals work, taking
in-progress changes with it — a parallel editor and OneDrive both write to that
path. Editing outside the synced folder is the reason this commit is clean. If
you run two sessions against this repo again, pause OneDrive sync or work in a
worktree.

---

# Addendum — the overcorrection, corrected

17 Aug 2026 · branch `claude/roi-board-period-roster`

## The rule, third try

The roster law has now been wrong in both directions. `active && sells` asked
who works here **today** and deleted Jared's July book. The fix — every seller
the roster has ever carried — swung past the target: *Who closes what*
rendered every rep in company history. Gerardo Costas, Nick Campana, Mike
Teixeira, Daniel Chase — desks cold for months, seated as rows on the board
that decides who gets the **next** lead.

> **A rep is on the grid IFF they signed ≥1 job in the selected period.**
> Not "active user", not "exists in history". Zero production in the window
> is no row, departed or not; one signing seats a departed rep beside the
> live ones, tagged **departed** as before.

Signings date on `contract_signed_at` (`j.d`) — the same clock as every unit
and dollar on the rep board — and the roster follows the drawer's month
selector. The **cells stay all-time**: a month-sliced rep × source cell is
n=2, and that refusal was never about the roster. The month picks who is in
the room; the book stays whole. A month with no signer renders a withheld
card naming the rule, never an empty grid.

The monthly **Rep board** (board 10) is untouched: it was already built from
the period's data, and its lead-or-signing presence rule is its own — a rep
who took 38 leads and signed nothing is that board's finding, not this
grid's.

## The phone stops transposing

The transposition (one block per rep, sources down) was honest at 5 rows and
absurd at a full roster — a four-screen vertical scroll. Deleted, CSS and
all, per the standing practice of removing drawing code for surfaces that no
longer exist. Every width now renders the **same heat map**:

- **Top 8 by signed $ in the period**; the rest behind one counted
  `› N more reps` row in the sticky name column — pure-DOM toggle
  (`mkGridMore`), same disclosure grammar as the source ledger's fold, so
  opening it cannot lose the browsed month or the scroll position.
- Below 700px, columns narrow to the month's **active sources** —
  `mkPeriodSrc()` re-asks the source ledger's own law (a cost in the book
  this month OR a signed dollar this month). Hidden columns are counted and
  named in the note; if the ROI feed has not answered, or the rule would
  blank every column, nothing hides.
- Phone cells tighten to 54px and drop the per-cell `no outcome logged` line;
  the card's withheld block still states that fact once, in full. Desktop
  cells are untouched.

Ranking by period signed $ replaced roster order on both widths — the fold
has to cut somewhere, and "biggest book first" is the only cut that means
anything. Desktop layout is otherwise unchanged; the underlying query and
the period selector are untouched.

## The brief's numbers, again

The brief seating this rule said Jared, July: **22 signed / $121,234**. Both
instruments still say **26 / $137,116** (see "Numbers in the brief that live
data does not support" above — nothing has changed since). The rule is
satisfied either way — ≥1 signing seats him — and the board prints what it
computes. If 22/$121,234 encodes a filter, it still needs naming before it
goes on a screen.

## Verified

Real `mkGridData()` / `cardRepGrid()` / `mkGridMore()` exercised in the
shipped `index.html` over CDP with a 14-seller fixture (10 July signers, 3
long-departed ghosts, 1 active rep with zero July signings), true device
metrics — `--window-size` under 500px still crops on Windows.

| Check | 1400px | 390px |
|---|---|---|
| Rows rendered | 8 + `› 2 more reps` | same |
| Jared present, tagged departed | yes | yes |
| Ghosts (Gerardo/Nick/Daniel/Tim-active) | absent | absent |
| Order | signed $ desc, Jared 2nd | same |
| Period-inactive columns (Yard Sign, Porch) | visible | hidden, named in note |
| Per-cell ran line | visible | hidden, withheld block carries it |
| Page scrolls sideways | no | no — grid scrolls inside `.mkg-wrap` |
| Fold toggle | 2 rows revealed | 2 rows revealed |
| Month with no signer | — | withheld card names the rule |

Screenshots: `grid-period-roster-390.png`, `grid-period-roster-1400-open.png`
beside this file. Built in a worktree outside the OneDrive-synced folder, for
the reason the previous section documents.
