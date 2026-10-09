# Markdown-rendering Specification

## Purpose

Safe rendering of note bodies in the note view (R14, C10; ADR-002). Tests are vitest + jsdom unless labeled `[build]` or `[manual]`. All tags are `[PR1]`.

## Requirements

### Requirement: Basic subset [PR1]

Bodies MUST render bold, italic, lists, links, inline code and code blocks (R14). Other markdown syntax MAY render as plain text.

#### Scenario: Subset

- GIVEN a body with `**b**`, `*i*`, a list, `` `c` `` and a fenced block
- WHEN rendered
- THEN strong, em, list, inline code and a code block elements exist

### Requirement: Raw HTML is text [PR1]

Raw HTML MUST never create elements; it MUST show as literal text (R14, C10). No script MUST run.

#### Scenario: Image tag (C10)

- GIVEN a body `<img src=x onerror=alert(1)>`
- WHEN rendered
- THEN the literal text shows, no `img` element exists and no handler runs

### Requirement: Link allowlist [PR1]

Links MUST be `http`, `https` or `mailto` only and MUST carry `rel="noopener noreferrer"` (R14). Any other scheme (for example `javascript:`, `data:`, `irc:`) MUST NOT become a link; its text stays visible. Image syntax MUST NOT create an `img` element.

#### Scenario: Allowed and blocked

- GIVEN links with `https:`, `mailto:`, `javascript:` and `irc:` targets
- WHEN rendered
- THEN the first two are anchors with the rel value; the others are not anchors

#### Scenario: Image syntax

- GIVEN a body `![alt](https://example.com/a.png)`
- WHEN rendered
- THEN no `img` element exists

### Requirement: Lazy loading [PR1]

The renderer MUST load on demand when the note view opens (ADR-002), never in the main bundle. While it loads, or if loading fails, the body MUST show as plain text; nothing may throw.

#### Scenario: Fallback

- GIVEN the renderer chunk is pending, then fails
- WHEN the view shows a body
- THEN the body reads as plain text in both cases

#### Scenario: Main chunk `[build]`

- GIVEN `npm run build`
- WHEN output sizes are compared with main before the change
- THEN the main chunk stays within the bundle budget and a separate markdown chunk exists

### Requirement: Excerpt stripping [PR1]

A shared pure helper MUST turn a markdown body into plain text without markers (emphasis, list bullets, backticks, link syntax keeps the link text). It MUST be pure and deterministic, and raw HTML MUST pass through as text.

#### Scenario: Strip

- GIVEN `**Deploy** the [runbook](https://x.y) now`
- WHEN stripped
- THEN `Deploy the runbook now`
