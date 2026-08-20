-- 183_streak_unique_and_weekly.sql · DRAFT — not applied yet.
-- Applied via the Supabase MCP once Kevin approves the rep-card rendering;
-- kept in the repo so the PR shows the server half of the change.
--
-- Kevin, 20 Aug: "The streak should be measured off unique 10 touches per
-- day. I don't want to count the same customer back and forth. Needs to be
-- extra effort. In streak declare 10 per day is company goal."
--
-- 1) touch_streaks(): a day on standard now means TEN DIFFERENT CUSTOMERS
--    touched — count(distinct customer_id), so the same customer texted five
--    times is one, not five. A touch with no customer file attached still
--    counts as one (it cannot be a repeat of anything). The goal is the flat
--    company 10 for everyone; rep_targets.daily_touch_goal no longer varies
--    the streak bar. Return shape unchanged — the console and the app's own
--    streak ring read the same rule from the same function.
--    ⚠ The app's on-device ring computes locally: until the app adopts the
--    unique-customer rule, a rep's phone ring and the board can disagree on
--    a back-and-forth day. Board (this function) is the official count.
--
-- 2) touch_weekly(): the four COMPLETE Mon-started weeks before this one,
--    per active selling rep — total touches, unique customers, and days on
--    the 10-unique standard (working days only). Feeds the rep-card dials'
--    perspective strips ("where they were the prior 1-4 weeks").

create or replace function public.touch_streaks()
 returns table(rep_id uuid, name text, initials text, goal integer, streak integer, week_hits integer, week_days integer)
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
  with et as (select (now() at time zone 'America/New_York')::date as today),
  g as (
    select r.id, r.name, r.initials, 10 as goal   -- company goal, flat (Kevin 20 Aug)
    from reps r
    where r.active and r.sells),
  days as (
    select d::date as day
    from et, generate_series(et.today - 90, et.today, interval '1 day') d
    where extract(isodow from d) between 1 and 5),
  counts as (
    select t.rep_id, (t.occurred_at at time zone 'America/New_York')::date as day,
      count(distinct coalesce(t.customer_id, t.id)) as n   -- unique customers, not raw touches
    from app_private.touches t
    where t.source_kind <> 'app_sample'
      and t.occurred_at >= now() - interval '95 days'
    group by 1, 2),
  hit as (
    select g.id as rep, g.goal, d.day, coalesce(c.n, 0) >= g.goal as hit
    from g cross join days d
    left join counts c on c.rep_id = g.id and c.day = d.day),
  seq as (
    select h.rep, h.hit,
      row_number() over (partition by h.rep order by h.day desc) as rn
    from hit h, et
    where h.day < et.today or (h.day = et.today and h.hit)),
  firstmiss as (
    select rep, min(rn) as fm from seq where not hit group by rep)
  select g.id, g.name, g.initials, g.goal,
    coalesce(f.fm - 1,
      (select count(*) from seq s where s.rep = g.id))::int,
    (select count(*) from hit h, et
      where h.rep = g.id and h.hit
        and h.day >= date_trunc('week', et.today)::date)::int,
    (select count(*) from days d, et
      where d.day >= date_trunc('week', et.today)::date and d.day <= et.today)::int
  from g left join firstmiss f on f.rep = g.id
  order by 5 desc, g.name;
$function$;

create or replace function public.touch_weekly()
 returns table(rep_id uuid, touches int[], uniq int[], hits int[])
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
  with et as (select date_trunc('week', (now() at time zone 'America/New_York')::date)::date as w0),
  weeks as (
    -- the four complete weeks before this one, oldest first
    select n as idx, (et.w0 - (4 - n) * 7)::date as ws
    from et, generate_series(0, 3) n),
  g as (select r.id from reps r where r.active and r.sells),
  tt as (
    select t.rep_id,
      (t.occurred_at at time zone 'America/New_York')::date as day,
      coalesce(t.customer_id, t.id) as cust
    from app_private.touches t
    where t.source_kind <> 'app_sample'
      and t.occurred_at >= now() - interval '40 days'),
  daily as (
    select rep_id, day, count(*) as n, count(distinct cust) as u
    from tt group by 1, 2),
  per as (
    select g.id as rep, w.idx, w.ws,
      coalesce(sum(d.n), 0)::int as touches,
      (select count(distinct t2.cust) from tt t2
        where t2.rep_id = g.id and t2.day >= w.ws and t2.day < w.ws + 7)::int as uniq,
      count(*) filter (where d.u >= 10 and extract(isodow from d.day) between 1 and 5)::int as hits
    from g cross join weeks w
    left join daily d on d.rep_id = g.id and d.day >= w.ws and d.day < w.ws + 7
    group by 1, 2, 3)
  select rep,
    array_agg(touches order by idx),
    array_agg(uniq order by idx),
    array_agg(hits order by idx)
  from per group by rep;
$function$;
