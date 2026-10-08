# durante/08 — Slice roadmap and boundary check

**Intent:** summarize the slices, plan the next ones and fix their boundaries
before exploring slice 2.
**Outcome:** no roadmap existed; only slices 2, 3 and 7 were named in slice 1
artifacts. `docs/roadmap.md` added. A boundary check against CONTRACT.md and
the schema found two overlaps (capture already creates notes; the tag filter
R12 lives on the day page) and an ordering bug: `profiles.timezone` defaults
to `UTC`, so capture and snooze would compute wrong instants until slice 7.
Timezone moved to the start of slice 2; slice 4 became note editing, slice 5
all notes and search.

## Prompts

> Hey, wanted to check the project slices, can you give me a summary?

> Can you describe the next slices ?

> Yes

> Should we run a full investigation for the slice proposals?

> Ok go

> Yes do that

> Commit first and then continue with slice 2
