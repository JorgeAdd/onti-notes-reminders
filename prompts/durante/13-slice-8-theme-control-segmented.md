# 13 — Slice 8 smoke finding: segmented theme control

**Intent:** fix the theme control wrapping in the 200 px date column found
in the slice 8 manual smoke (System and Light on one row, Dark alone, Sign
out a different width).
**Outcome:** `ab02add`. A three-column segmented grid with one outer border
and inner dividers, label-size text so "System" fits a 50 px segment, a
focus ring lifted above the joined edges, and Sign out full width one
`--space-sm` below. Checked with headless screenshots at 1280 and 375 px,
light and dark, Today and the sign-in card.

## Prompt

> Manual smoke finding (slice 8): in the 200 px date column (--size-date-col), the ThemeControl wraps: System and Light on one row, Dark alone on the next, then Sign out with a different width. It looks broken.
>
> Fix in ThemeControl.module.css (and DateColumn if needed):
>
> - Make the radiogroup a segmented control: display: grid; grid-template-columns: repeat(3, 1fr); width: 100%; gap: 0.
> - Join the segments: one outer border, inner dividers only (no doubled borders), border radius only on the outer corners.
> - Reduce the horizontal padding of .face so the labels fit in one row at 200 px; keep min-height var(--size-target) (rule 11). Each segment stays ≥ 44 px wide.
> - Make Sign out full width of the column, with a consistent gap (one space token) above it.
> - Keep: role="radiogroup", the visible focus ring (it must not be clipped by the joined borders; use outline-offset or z-index on focus), selected = ink on ink (SG2), tokens only (rule 8).
> - Check the sign-in card too: the same component must look right there.
>
> Strict TDD where it's testable (e.g. the group renders one row of 3 options in order); then verify manually at desktop width and 375 px, in light and dark. Commit as fix(web): ... and do not push without asking.
