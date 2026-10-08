# Delta for demo-seed

Dev/demo script that loads `docs/product/scenario-dataset.md` into one account. IDs N1-N15 exist only in the script and tests.

## ADDED Requirements

### Requirement: Explicit target

The script MUST require an explicit target account and MUST refuse to run, changing nothing, when it is missing or does not resolve to exactly one user.

#### Scenario: No target

- GIVEN no target argument
- WHEN the script runs
- THEN it exits non-zero with a usage message and writes no data

### Requirement: Relative dates

The script MUST place all 15 notes, tags and reminders so that the current local day in the target account's timezone (R16) plays Wed 7 of C4; other days shift by the same offset. Relative offsets between reminders MUST match the dataset. The current date comes from the Clock port or the script's single time source.

#### Scenario: Run on any day

- GIVEN today is Mon 12 Jan in the account's timezone
- WHEN the script runs
- THEN 2 items are carried from the previous local day, 2 are due today, 1 is due tomorrow, N1 is done on the previous day, and 11 notes are not on today's page at 09:05

### Requirement: Note bodies

The script MUST write the dataset's body examples (the notes with bodies in `docs/product/scenario-dataset.md`, including those for N1 and N8) as note bodies, so that C9 matches on body text in real data (R13). Notes without a dataset body MAY have none.

#### Scenario: Body search on seeded data (C9)

- GIVEN the script ran for Jorge
- WHEN he searches `staging`
- THEN the note whose body holds the staging URL is returned, as is the one whose title mentions staging

### Requirement: Idempotency

Re-running MUST NOT create duplicates; the account MUST end with exactly the dataset's 15 notes, their tags and their bodies. A re-run on a later day MUST re-anchor dates to that day and MUST restore dataset bodies that were changed or missing.

#### Scenario: Re-run

- GIVEN the script already ran for the account
- WHEN it runs again
- THEN note count stays 15 and no tag is duplicated

#### Scenario: Body restored

- GIVEN a seeded body was blanked
- WHEN the script re-runs
- THEN the dataset body is back and the count is still 15

### Requirement: User scope

All reads and writes MUST be restricted to the target user. No other user's rows MAY be read, changed or deleted, including by cleanup.

#### Scenario: Other users untouched

- GIVEN Ana has notes
- WHEN the script runs for Jorge
- THEN Ana's data is identical afterward

### Requirement: Report

The script MUST print what it created, updated and left unchanged (notes, tags, anchor date, timezone, target account).

#### Scenario: First and repeat run

- GIVEN a first run, then a repeat
- WHEN each finishes
- THEN the first reports 15 created, the second reports 0 created

## Out of scope

Bulk multi-account seeding, production use, schema changes, UI.
