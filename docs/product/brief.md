# Product Brief — Notes & Reminders

## 1. Problem

A developer juggling several projects captures follow-ups mid-call or
mid-review. Those notes have no due time, so they get buried; the
reminders they set elsewhere have no context.

Real example: a note saying "notify someone to move permissions from me to
someone else" was written in Apple Notes, the app was never reopened that
day, and the change happened 3 days late.

Why current tools fail:
- Notes and reminders live in separate apps: the reminder lacks the
  context, and the note lacks a due time.
- Apple Notes and Google Keep have weak reminders.
- Todoist has strong reminders, but notes are an afterthought.
- Notion is too heavy to capture something mid-call.

Core idea: a note and its reminder are ONE object.

## 2. Persona

**Jorge**, senior developer at a consulting company, working on 3 client
projects at once.

- Typical day: 4 meetings (2 standups, 1 client call, 1 review).
- Always open: VS Code, Teams, Slack, browser with ~20 tabs, GitHub,
  Claude Code.
- Switches context ~8 times a day.
- Notes are born mid-call or while reviewing PRs. If capture takes more
  than 10 s, the note is lost.
- Pain: ends the day with ~15 scattered notes across Apple Notes, Teams
  chats and sticky notes, without knowing which ones have a deadline.

Success for Jorge:
- Capture in under 5 s (shortcut pressed → saved).
- A morning view of only today's items, with their context.
- Every reminder is either done or snoozed by the end of its day.

## 3. Key moments

> These moments are reference scenarios, not hardcoded behavior. They are
> used as (1) realistic content for the design sheets, (2) a dev seed
> script, and (3) acceptance tests with an injected clock. CONTRACT.md
> describes general rules (e.g. when an item is overdue), and these moments
> are the examples that prove those rules. The app is a complete,
> functional product and must work for any user and any data.

Assumption: no notes are created between Tue 11:12 and Wed 9:05.

1. **Mid-call capture — Tue 11:12.** During the client call, Jorge presses
   the in-app shortcut, types "Notify Ana: move repo permissions from me to
   Luis", sets "today 17:00", and saves in under 5 s. He now has
   **15 notes**, and **3** of them have reminders due today.
2. **Reminder fires — Tue 17:00.** The permissions reminder notifies Jorge
   with the note's full context. He marks it done in **1 click**.
   **2 items** remain for today, and he doesn't finish them.
3. **Morning view — Wed 9:05.** The Today view shows only **4 items**:
   **2 overdue** (the 2 unfinished reminders from Tuesday, NOT the
   permissions note) and **2 due today**. The other **11 notes** stay out
   of the way (they include the completed permissions note).
4. **Project filter — Thu 14:30.** Before the review, Jorge filters by the
   tag **"Client B"** and sees **5 notes**, **1** with a reminder due at
   **15:00**.

### Definitions
- **Overdue:** the due time has passed and the item is not done.
- **Missed:** still not done 24 h after the due time (used in v2 metrics).

## 4. Anti-references and references

### Must NOT look or feel like
- The purple/blue gradient "AI app" look, glassmorphism, sparkle icons.
- Generic SaaS dashboards: sidebar + cards + charts for everything.
- Notion: too many options before you can write a single line.
- Todoist/Asana: checkbox lists that feel like a corporate to-do manager.
- Empty minimalism with no personality (white + gray + one blue button).

### Should evoke
- **LazyVim / terminal:** keyboard-first, shortcuts visible on screen,
  dense but readable, instant response, monospace for times and metadata.
- **Index card / pocket notebook:** each note is a physical object with
  paper texture, a header line, and handwritten-feeling warmth.
- **Desk calendar:** "today" is a page you tear off; overdue items feel
  like something left on the desk from yesterday.
- **Rewards demo (an existing project of mine):** this app's visual
  language is based on it: warm paper + ink + ONE accent color; one
  memorable visual signature reserved for a single concept.

### Tone
Calm, focused, a tool for a professional. Not playful, not corporate.
Dark mode is required. Open design tension: what "paper" looks like in
dark mode (to resolve in Phase 3).

## 5. v1 scope

### In scope
- Email sign-up, login and logout (Supabase Auth).
- Notes: create, edit, delete. Body in basic markdown (bold, italic,
  lists, links, inline code, code blocks). Rendered markdown is always
  sanitized: no raw HTML is ever rendered.
- Optional reminder (due date/time) on any note.
- Mark done / undo.
- Snooze, presets only: +1 h, or tomorrow 9:00. Snoozing moves `due_at`;
  `original_due_at` and `snooze_count` are kept so v2 "missed" metrics
  stay honest.
- Today view: overdue + due today only.
- All notes view, with tag filter and text search.
- Tags: one level, no nesting.
- Quick capture with an in-app keyboard shortcut (tab focused), under 5 s.
- Keyboard shortcuts visible on screen.
- Web Push notifications (service worker + backend scheduler).
- Light and dark mode.
- Responsive layout (usable in a phone browser).

### Constraints for the ADRs and CONTRACT.md
- **Notifications:** reminders need a backend scheduler and a service
  worker for Web Push. If notification permission is denied, the item
  still shows as due in the Today view. Notifications are an extra
  channel, never the only one.
- **Markdown safety:** rendered markdown is always sanitized (no raw
  HTML). This is a CONTRACT rule.
- **Snooze:** moves `due_at`, preserves `original_due_at`, increments
  `snooze_count`. The formal rule goes in CONTRACT.md (Phase 4).
- **Time and timezones:**
  - All timestamps are stored in UTC (`timestamptz`).
  - The user's IANA timezone (e.g. `America/Mexico_City`) is stored in
    their profile.
  - "Today" and "overdue" boundaries are computed in the user's timezone.
  - The scheduler fires at the UTC instant of `due_at`.
  - DST transitions are covered by tests.
  - Details go in the ADRs (Phase 4).

### Out of scope
- Weekly summary and "missed" metrics (v2).
- Global OS shortcut.
- Nested tags.
- Recurring reminders.
- Sharing and collaboration.
- Attachments and images.
- Rich text editor (basic markdown only).
- Native mobile apps and offline mode.
- OAuth providers (Google/GitHub login).
- Email and SMS notifications.
