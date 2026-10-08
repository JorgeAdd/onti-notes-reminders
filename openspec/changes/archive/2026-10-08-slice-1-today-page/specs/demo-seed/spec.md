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

### Requirement: Idempotency

Re-running MUST NOT create duplicates; the account MUST end with exactly the dataset's 15 notes and their tags. A re-run on a later day MUST re-anchor dates to that day.

#### Scenario: Re-run

- GIVEN the script already ran for the account
- WHEN it runs again
- THEN note count stays 15 and no tag is duplicated

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
