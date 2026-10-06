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

6. **Never push without asking.**
   Why: the repository is public and part of the evaluation. Anything
   pushed is visible immediately.

7. **Save every prompt in `prompts/`** under `antes/` (before
   implementation), `durante/` (during) or `despues/` (after), numbered
   and with a short intent header.
   Why: the prompts are a deliverable, as important as the code. They
   show how the work was thought through, not just what was produced.
