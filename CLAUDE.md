# CLAUDE.md — Rules for working with AI on this project

Every rule has a reason. Rules are added only when they prevent a real
problem; new sections (UI, architecture, commands) are added in later
phases.

## Workflow rules

1. **Work in phases. Stop after each phase and wait for explicit approval.
   Never assume approval.**
   Why: the human owns the decisions. Small, approved steps keep the AI
   from building on top of an unreviewed assumption.

2. **Ask at most one question at a time, then stop.**
   Why: batched questions get partial answers, and partial answers become
   silent assumptions.

3. **Verify every sub-agent claim by reading the file.**
   Why: a sub-agent's summary is not evidence. "Done" means the file
   exists and contains what was claimed.

4. **Forward concrete data explicitly to every phase and sub-agent.**
   Why: sub-agents do not share this conversation. Exact numbers from
   `docs/product/brief.md` (15 notes, 4 items in Today, 09:05, ...) must be
   passed in the prompt, not paraphrased or assumed.

5. **Use conventional commits** (`feat:`, `fix:`, `docs:`, `chore:`,
   `test:`, `refactor:`, `ci:`).
   Why: a readable history shows how the project evolved, phase by phase.

6. **Ask before every push. Each approval covers only that specific
   push.** Local commits do not need approval.
   Why: the repository is public and part of the evaluation. Anything
   pushed is visible immediately. Local commits stay private and can
   still be fixed; approving one push never authorizes the next.

7. **Save every prompt in `prompts/`** under `antes/` (before
   implementation), `durante/` (during) or `despues/` (after), numbered
   and with a short intent header.
   Why: the prompts are a deliverable, as important as the code. They
   show how the work was thought through, not just what was produced.

## UI rules

Sources of truth: `docs/design/style-guide-decisions.md` (SG1–SG18),
`docs/design/tokens.css` and the boards in `docs/design/chosen/`.

8. **Use tokens only.** Components use the semantic layer (`--color-*`,
   `--text-*`, `--space-*`, `--motion-*`), never `--core-*` and never raw
   hex, px font sizes or durations.
   Why: light and dark mode only remap the semantic layer. A hardcoded
   value breaks one of the two themes silently.

9. **Vermilion (`--color-date`) is for the date block only.** Overdue is
   ink plus "late …", done is an ink strike, focus is an ink outline.
   Why: one accent with one meaning (SG2, SG3). The moment it marks a
   second thing, it stops meaning "today".

10. **Every animation has a reduced-motion fallback** that uses the
    `--motion-*` tokens: nothing travels, only opacity, ≤ 150 ms.
    Why: motion is part of the design (SG15), and so is the fallback
    (SG16). Animating with raw durations skips the fallback.

11. **Interactive targets are at least 44 × 44 px** (`--size-target`), and
    focus is always visible (`--focus-ring`).
    Why: the app is keyboard-first on desktop and touch-first on mobile;
    both need it (SG13).

12. **No hardcoded copy.** User-facing strings live in one messages module,
    including counts and relative times ("11 other notes", "late 15h05").
    Why: the copy is product logic. "Undated" vs "other" was a real bug
    caught in the design review; one place makes copy reviewable and
    testable.

13. **No internal IDs in the UI.** Seed IDs (N1…N15) exist only in the
    dataset, the seed and the tests.
    Why: they leaked into the design boards once (SG17).
