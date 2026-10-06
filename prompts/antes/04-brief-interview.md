# 04 — Product brief interview (answers)

**Intent:** answer the AI's interview, one question at a time, to build
`docs/product/brief.md`.
**Outcome:** approved brief (see 05 for final adjustments).

## Q1 — Problem

> For me, a developer juggling between all the work. Last month I wrote a
> note that I needed to notify someone about changing the permissions from
> me to someone else, I wrote that note on my notes app in my Mac but didn't
> open the app again the whole day, the note went missing and the change
> didn't occur until the next 3 days.
>
> Why tools failed: notes and reminders live in separate apps, so the
> reminder lacks the context and the note lacks a due time. Keep and Notes
> have weak reminders; Todoist has strong reminders but notes are an
> afterthought; Notion is too heavy to capture something mid-call.

## Q2 — Persona

> Primary user: Jorge, senior developer at a consulting company, working on
> 3 client projects at once.
>
> Typical day: 4 meetings (2 standups, 1 client call, 1 review). Always open:
> VS Code, Teams, Slack, browser with ~20 tabs, GitHub, Claude Code. Switches
> context ~8 times a day. Notes are born mid-call or while reviewing PRs and
> must be captured in under 10 seconds or they're lost.
>
> Pain: ends the day with ~15 scattered notes across Apple Notes, Teams chats
> and sticky notes, without knowing which ones have a deadline.
>
> Success: capture in under 5 seconds, a morning view of only today's items
> with context, and zero missed follow-ups in a week.

## Q3 — Key moments (reviewing the AI's draft)

```
Mostly yes, with these fixes:

1. Reorder chronologically and fix the data:

   1. Mid-call capture (Tue 11:12). During the client call, Jorge presses
      the in-app shortcut, types "Notify Ana: move repo permissions from me
      to Luis", sets "today 17:00", and saves in under 5 s. He now has 15
      notes, and 3 of them have reminders due today.
   2. Reminder fires (Tue 17:00). The permissions reminder notifies Jorge
      with the note's full context. He marks it done in 1 click. 2 items
      remain for today, and he doesn't finish them.
   3. Morning view (Wed 9:05). The Today view shows only 4 items: 2 overdue
      (the 2 unfinished reminders from Tuesday, NOT the permissions note)
      and 2 due today. The other 11 notes stay out of the way.
   4. Project filter (Thu 14:30). Before the review, Jorge filters by the
      tag "Client B" and sees 5 notes, 1 with a reminder due at 15:00.

2. Definitions:
   - "Overdue" = due time passed and not done.
   - "Missed" = still not done 24 h after the due time (used in v2 metrics).

3. Scope decisions:
   - Tags: in scope for v1 (one level, no nesting).
   - Weekly summary: out of scope, moved to v2.
   - Capture: in-app keyboard shortcut (the tab must be focused). A global
     OS shortcut is out of scope for v1. Target stays under 5 s.
   - Reminders: browser notifications via Web Push, with a service worker
     and a backend scheduler. If notification permission is denied, the
     item still shows as due in the Today view. Record this as a
     constraint for the ADRs.

4. Important note to include in the brief:
   These moments are reference scenarios, not hardcoded behavior. They
   will be used as (1) realistic content for the design sheets, (2) a dev
   seed script, and (3) acceptance tests with an injected clock.
   CONTRACT.md must describe general rules (e.g. when an item is overdue),
   and these moments are the examples that prove those rules. The app is a
   complete, functional product and must work for any user and any data.

Continue with the next question.
```

## Q4 — Anti-references

```
Should NOT look or feel like:
- Purple/blue gradient "AI app" look, glassmorphism, sparkle icons.
- Generic SaaS dashboards: sidebar + cards + charts for everything.
- Notion: too many options before you can write a single line.
- Todoist/Asana: checkbox lists that feel like a corporate to-do manager.
- Empty minimalism with no personality (white + gray + one blue button).

SHOULD evoke (and what to borrow from each):
- LazyVim / terminal: keyboard-first, shortcuts visible on screen,
  dense but readable, instant response, monospace for times and metadata.
- Index card / pocket notebook: each note is a physical object with
  paper texture, a header line, and handwritten-feeling warmth.
- Desk calendar: "today" is a page you tear off; overdue items feel like
  something left on the desk from yesterday.
- Rewards demo (previous project): warm paper + ink + ONE accent color;
  one memorable visual signature reserved for a single concept.

Tone: calm, focused, a tool for a professional — not playful, not corporate.
Must support dark mode (I work in the terminal all day).
```

## Q5 — v1 scope (reviewing the AI's draft)

> Yes, keep snooze and search, use basic markdown
