# 17 — Install the grill-me skill

**Intent:** add Matt Pocock's `/grill-me` skill to stress-test plans before
building them.
**Outcome:** `grill-me` and `grilling` installed at user level
(`~/.claude/skills/`, not in the repo). `grilling` was adapted to one
question per round, because the original asks the whole frontier at once
and that conflicts with CLAUDE.md rule 2.

## Prompt

> Can we use /grill-me? please install this

> yes, adapt it to one question per round
