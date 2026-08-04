# Liberty Command Console

Owner dashboard for Liberty Fencing, Liberty Roofing, Oasis Landscapes and
Pro-Tec Roofing. Static page, hosted on GitHub Pages, sign-in required.

## Why this repository is public and still safe

**No business data is stored here.** This repository contains a page, a
stylesheet, an icon and a manifest. There is no data snapshot, no exported
report, no customer or employee record, and no figure of any kind baked into
the markup. Every number the dashboard shows is fetched at view time.

**The key in `index.html` is a publishable key.** It is meant to be public. It
identifies the Supabase project; it authorises nothing on its own. Holding it
does not grant access to any row.

**Access is decided by the database, not by this page.** Reads are made with the
signed-in user's own token, and PostgreSQL row-level security decides what that
user may see. Someone who opens this page without signing in gets:

- `401 permission denied` on every `console_*` view
- zero rows from every underlying table

Hiding the dashboard behind a secret URL would not be security. Putting the
decision in the database is.

## What is deliberately not here

- No `console-data.json` or any other data file
- No service-role / secret key — CI would be the wrong place for one and so is a
  browser
- No API credentials for Contractors Cloud, QuickBooks or CompanyCam

## Add to Home Screen

Open the page on a phone, sign in, then Share → Add to Home Screen. It opens
standalone, without browser chrome.

## Honesty rules the page follows

These are load-bearing, not decoration:

- Every figure carries its source — `LIVE · CC` (Contractors Cloud),
  `LIVE · QB` (QuickBooks), `LIVE · APP` (the rep app).
- Contract value signed (CC) and invoiced (QB) are never added together. They
  measure different events in different systems.
- Anything that cannot be read is stated as withheld, with the reason. A blank
  is never presented as a zero, because "no data" and "no money" are different
  facts.
- Targets that nobody set are badged as seeded, so a typed number never wears a
  measured number's badge.
- Excluded records are counted out loud rather than quietly dropped.

## Looking at it as a phone, from a desktop

`preview.html` puts the live page inside a phone-sized frame so the mobile
layout can be worked on without picking up a phone:

**https://kdelaney05-bit.github.io/liberty-command/preview.html**

It is an iframe, not a mock. Media queries read the viewport of the document
they live in, and an iframe has its own — so a frame set to 393px makes the
console evaluate every breakpoint exactly the way an iPhone does. The zoom
control scales with a CSS transform, which does not change the layout viewport,
so a preview shrunk to fit a laptop is still a truthful 393px render.

Same origin, so the sign-in carries into the frame: real numbers, real feeds.
Device presets, rotate, a `+ desktop` toggle for the two renders side by side,
and a readout of which of the console's three layout bands (under 900px, 900px,
1300px) the current width lands in. `r` rotates, `d` toggles the desktop, `f`
refits.

Edit `index.html`, push, then hit **↻ reload** in the bar.
