# 19 — Slices 4 and 6: PR2 apply and verify

**Intent:** build slice 4 PR2 (write side) and slice 6 PR2 (endpoints) in
parallel, stacked on the PR1 branches, then verify them after PR1s merged.
**Outcome:** #19 and #20 merged; #20 first needed a merge of main
(CONTRACT tables, lockfile, Engram manifest). Slice 4 PR2: 9 commits, R20
proven, verify PASS WITH WARNINGS (SG20 wording vs the backlog entry is
documentation drift). Slice 6 PR2: 4 commits, C3 from the notification and C15
proven, verify PASS WITH WARNINGS. Both branches merged main; the ledgers were
reset again by the maintainer. One sub-agent inherited the wrong cwd and
stopped until told which checkout to use.

## Prompts

> Go for it

> Merged 19, 20 now has issues

> Push

> 20 is merged

> Yes do it
