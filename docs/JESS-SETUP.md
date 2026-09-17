# Jess: getting set up (one time, about 20 minutes)

You end up with the console's files on your computer and Claude sitting next
to them, so you can type "the Send button is hidden on the photo page" and
have it fixed and sent to Kevin for a one-tap approval.

## 1. A GitHub account

Go to https://github.com and click Sign up. The free plan is fine. Send Kevin
your username. He adds you to the liberty-command repo; accept the invitation
email GitHub sends you.

Watch: https://www.youtube.com/watch?v=7G2Y3TICWcA (create a GitHub account)

## 2. Git and GitHub Desktop

- Install Git for Windows from https://git-scm.com/download/win. Accept every
  default.
- Install GitHub Desktop from https://desktop.github.com and sign in with the
  account from step 1.
- In GitHub Desktop: File → Clone repository → pick
  `kdelaney05-bit/liberty-command` → Clone. Note the folder it lands in
  (`Documents\GitHub\liberty-command` by default).

Watch: https://www.youtube.com/watch?v=ibz-tSrnURQ (install Git on Windows 11)
Watch: https://www.youtube.com/watch?v=PoZNIbs_wx8 (clone with GitHub Desktop)

## 3. Claude

Install the Claude desktop app from https://claude.ai/download and sign in
with the seat Kevin gave you. Open the Code tab, choose Local, click Select
folder, and pick the folder from step 2.

Watch: https://www.youtube.com/watch?v=P7-0grEB7nk (the Claude desktop app, no terminal)
Official guide: https://code.claude.com/docs/en/desktop-quickstart

## 4. Your first fix

Type what you see, in plain words. For example:

> On the customer photo page the Send button doesn't show until I pick a
> picture, and it should.

Claude reads the rulebook, makes the change on a branch, shows you a preview,
and opens a pull request. Kevin gets it on his phone and approves. It is live
a couple of minutes later.

## The three rules

1. You cannot push to `main`. A pull request is the only door. That is on
   purpose, so nothing goes live by accident.
2. Commits and pull requests are public. No customer names in them, ever.
3. If Claude says the fix is in the database, the rep app, or the edge
   functions, that is Kevin's lane. Tell him; do not push on it.

## When something is stuck

Ask Claude "what does docs/HELPDESK.md say about this" first. Then Kevin.
