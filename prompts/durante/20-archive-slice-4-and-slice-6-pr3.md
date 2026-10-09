# 20 — Archive slice 4 and build slice 6 PR3

**Intent:** after #21 and #22 merged, resolve #22's conflicts, then archive
slice 4 and build slice 6 PR3 (web) in parallel.
**Outcome:** #22 needed a merge of main (CONTRACT todo line removed, the
push-routes harness gained updateNote and deleteNote, Engram manifest union).
Slice 4 archived at `openspec/changes/archive/2026-10-09-slice-4-note-editing/`
with both manual smokes recorded as pending; main specs gained note-view,
note-editing, markdown-rendering and undated-list. Slice 6 PR3 started on
`feat/slice-6-web-push-web`.

## Prompts

> Yes, amend SG20 and push both

> 21 merged, can you check 22 conflicts?

> Do it

> Done 22 is merged

> Record them as pending right now and start in the next parallel steps
