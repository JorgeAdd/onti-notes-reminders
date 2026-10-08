# Delta for demo-seed

## ADDED Requirements

### Requirement: Note bodies

The script MUST write the dataset's body examples (the notes with bodies in `docs/product/scenario-dataset.md`, including those for N1 and N8) as note bodies, so that C9 matches on body text in real data (R13). Notes without a dataset body MAY have none.

#### Scenario: Body search on seeded data (C9)

- GIVEN the script ran for Jorge
- WHEN he searches `staging`
- THEN the note whose body holds the staging URL is returned, as is the one whose title mentions staging

## MODIFIED Requirements

### Requirement: Idempotency

Re-running MUST NOT create duplicates; the account MUST end with exactly the dataset's 15 notes, their tags and their bodies. A re-run on a later day MUST re-anchor dates to that day and MUST restore dataset bodies that were changed or missing.
(Previously: ended with the dataset's 15 notes and tags only.)

#### Scenario: Re-run

- GIVEN the script already ran for the account
- WHEN it runs again
- THEN note count stays 15 and no tag is duplicated

#### Scenario: Body restored

- GIVEN a seeded body was blanked
- WHEN the script re-runs
- THEN the dataset body is back and the count is still 15
