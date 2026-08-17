# Travis Janke — inherited leads, July 2026

41 Contractors Cloud projects that sit in Travis Janke's book but were never his
work. Jared Heideman ran the appointment on each one in July 2026; each was
still unsigned when Jared left and the book was handed over.

The brief that commissioned this listed a companion file of PIDs. No such file
existed in the repo, so this list was **derived from the fallback rule in the
brief**, run against live Contractors Cloud data on 17 Aug 2026:

> `rep_primary_name = "Travis Janke"` **AND** `first_contract_at IS NULL`
> **AND** the appointment was run by Jared in July

In this schema that is:

```sql
select j.cc_project_id
from jobs j
where j.rep_id = '<travis>'          -- bc2e7d6f-80ec-436e-835a-57c3f848c92d
  and not j.reporting_excluded
  and j.contract_signed_at is null   -- first_contract_at IS NULL
  and exists (
    select 1 from cc_appointments a
    where a.cc_project_id = j.cc_project_id
      and a.rep_id = '<jared>'       -- 9435b2d4-fa8a-4dbf-a5de-db8575d274f3
      and (a.starts_at at time zone 'America/New_York') >= '2026-07-01'
      and (a.starts_at at time zone 'America/New_York') <  '2026-08-01')
order by 1;
```

It returns exactly **41** rows, matching the count in the brief.

## The PIDs

```
2007931  2052834  2066666  2066726  2067124  2067220  2067306
2067693  2067992  2068178  2068188  2068346  2068639  2069819
2070030  2070102  2070123  2070477  2071106  2071873  2071911
2071977  2071986  2072307  2072625  2073665  2073847  2073923
2073997  2074330  2074673  2074949  2074966  2075435  2075592
2075794  2075844  2076337  2076422  2077220  2078149
```

## This list is not what the board reads

The console does **not** carry these PIDs. Hard-coding a name and 41 ids into a
dashboard means the next departure gets no flag at all, and this one goes stale
the moment a file closes. `mkInherited()` in `index.html` re-derives the set on
every render from the general rule the 41 are an instance of:

> a lead is **inherited** for the rep who holds it if, in the month being read,
> the file is still unsigned, an appointment on it was run by a **different**
> rep, and that rep has since left the roster.

No name appears in that function. Run against July 2026 it returns these same
41 projects and names Jared Heideman as the donor, which is the check that the
rule and this list agree. It also turns up 1 project on Jake Facebook's office
account, which is real and reads honestly wherever that desk appears.

This file exists so the derivation is auditable and so the ids can be pulled
into a CRM cleanup. It is a record, not an input.

## 41 held, 29 in July's cohort

The rep board excludes **29**, not 41. The other 12 carry a lead date before
July, so they were never in July's lead denominator and subtracting them would
credit Travis with a denominator the board never charged him for. Both numbers
are printed on the board.

| | leads | units | close |
|---|---|---|---|
| raw | 38 | 4 | **11%** |
| adjusted (−29 inherited) | 9 | 4 | **44%** |

At 9 leads the adjusted denominator is under the board's own thin floor of 10,
and the board says so on its face: read it as a direction, not a rate.
