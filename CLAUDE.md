# CLAUDE.md — liberty-command (the owner console, GitHub Pages)

⚠️ THIS REPO IS PUBLIC. Nothing in it may carry a customer's name, a rep's
pay, a ruling verbatim, or a credential — git history keeps every clone.

Kevin's rulebook for every screen and decision is `docs/GOSPELS.md` in
`kdelaney05-bit/4-touch-autopilot-central-command` (20 rules, his words). Read it.

Before you talk to Kevin or touch the console, read his memory bank:
`kdelaney05-bit/kd` (private) — `laws/LAWS.md` for every business ruling,
the newest `journal/` entry for how he thinks. The long-form engineering law
book is `kdelaney05-bit/trureview-mobile/CLAUDE.md` (private); the console's
own laws (the rhythm law, the tops of mountains, count once per surface,
the actuals law with a source badge on every figure) are in there in full.

Push to `main` = deploy. Bump `const BUILD` in `index.html` and
`version.json` together, or open tabs never self-reload. The mirror of
`index.html` lives in trureview-mobile's `console/` — keep the two byte-equal;
reconcile, never clobber.

## When Jess is driving (added 17 Sep 2026)

Jess edits the console every day and is a collaborator on this repo only —
not on trureview-mobile, not on the database, not on the edge functions.
Her lane is the console's pages: `index.html`, `c.html`, `e.html`, `n.html`,
`w.html`, `file.html`, `invite.html`, `no-quote.html`, `phone.html`.

- Read `docs/HELPDESK.md` before answering her. If her question is in it,
  that is the answer. If it is not, answer it, then add the entry.
- Never push to `main`. Work on a branch named `jess/<what>`, commit, push
  the branch, and open a pull request for Kevin to approve (`gh pr create`
  if gh is installed; otherwise give her the compare link to click).
  `main` is protected: a direct push from her account is refused.
- Bump `const BUILD` and `version.json` together in the PR, same as always.
- Commit messages and PR titles are public. No customer's name, no rep's
  pay, no address, no phone number. Say "the photo page", not whose job.
- Kevin's ship reconciles the mirror in trureview-mobile after the merge.
  Jess's Claude never touches the mirror.
- Database, edge functions, Supabase keys, the rep app: not her lane. If a
  fix needs them, say so in the PR and stop.
