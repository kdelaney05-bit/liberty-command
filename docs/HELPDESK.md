# Help desk — one answer per question

The rule: every question about the console gets answered here once. Claude
reads this file before answering. If the answer is here, that is the answer.
If it is not, Claude answers, then adds the entry in the same session. Kevin
edits any entry he disagrees with; this file wins over anyone's memory.

Entries are short: the question as it was asked, the answer, the date.
This file is public. No customer names, ever.

## Getting around

**Q: Where is the live console?**
A: https://kdelaney05-bit.github.io/liberty-command/ — sign in with your
console login. (17 Sep 2026)

**Q: How do I see the phone layout from a desktop?**
A: https://kdelaney05-bit.github.io/liberty-command/preview.html wraps the
live page in a phone-sized frame. (17 Sep 2026)

**Q: A change went live but my open tab didn't update.**
A: `const BUILD` in `index.html` and `version.json` have to be bumped
together, or open tabs never self-reload. Hard-refresh with Ctrl+Shift+R to
be sure. (17 Sep 2026)

## Making a change

**Q: How do I get a fix made?**
A: Open the Claude desktop app on the liberty-command folder and describe it
in plain words: which screen, what you expected, what happened. Claude makes
the change on a branch, shows you a preview, and opens a pull request. Kevin
approves it from his phone and it is live a couple of minutes later.
(17 Sep 2026)

**Q: How do I see a change before it goes live?**
A: Ask Claude to preview it. It serves the folder locally and opens it in
its browser pane. Nothing is live until the pull request is merged.
(17 Sep 2026)

**Q: Can I push straight to main?**
A: No. `main` is locked; a pull request is the only door. Kevin's account is
the one exception. (17 Sep 2026)

## Not in this lane

**Q: A customer's file has the wrong information, but the screen itself is fine.**
A: That is data, not the console. The console only shows what the database
holds. Fix it in the customer file, or tell Kevin. (17 Sep 2026)

**Q: A number on a tile looks wrong.**
A: Every figure carries a source badge (LIVE · CC, LIVE · QB, LIVE · APP).
The console never invents a figure or adds figures across sources. If the
source is wrong, the fix is in that system or in the database views, which
is Kevin's lane. Write it up and stop. (17 Sep 2026)
