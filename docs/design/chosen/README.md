# Chosen design — Day page, keyboard-driven

The direction picked in Phase 3: a hybrid of the "Day Page" (tear-off desk
calendar) and "Ledger" (terminal command layer) explorations. The page is
what you see; the command layer is how you act.

- Source: designed in Claude Design from the prompt in
  `prompts/antes/13-claude-design-prompt.md`.
- Decisions: `../style-guide-decisions.md` (SG1–SG18).
- Tokens: `apps/web/src/styles/tokens.css`.
- Data: every board uses `../../product/scenario-dataset.md`.

## Boards

| File                            | Board                                                          |
| ------------------------------- | -------------------------------------------------------------- |
| `00-system-keys-and-motion.png` | Concept, palette, keymap, rules, motion table                  |
| `01-moment-1-light-desktop.png` | Tue 11:12 · capture in the command bar                         |
| `02-moment-2-light-desktop.png` | Tue 17:00 · notification, done in 1 click                      |
| `03-moment-3-light-desktop.png` | Wed 09:05 · Today (2 still open + 2 due) with snooze which-key |
| `04-moment-4-light-desktop.png` | Thu 14:30 · #client-b filter                                   |
| `05-moment-3-light-mobile.png`  | Wed 09:05 · mobile, action sheet for the focused item          |
| `06-moment-1-light-mobile.png`  | Tue 11:12 · mobile capture with presets                        |
| `07`–`12`                       | The same moments in dark mode                                  |

## Corrections applied to the exported boards

The PNGs were exported from the design file after three verified fixes
(Phase 3 review):

1. "N undated notes on the back of the pad" → "N other notes on the back
   of the pad". The notes off today's page are not all undated (N1 and N6
   have dates).
2. Internal IDs (N1…N10) removed from the UI. They only exist in the
   dataset, the seed and the tests.
3. Placeholder `notes.app` in the notification replaced by the product
   name "Notes + Reminders".
