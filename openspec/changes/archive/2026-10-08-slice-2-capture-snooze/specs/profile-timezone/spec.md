# Profile Timezone Specification

## Purpose

Store the browser's IANA zone once so "today" and per-day grouping are right for a real user (R16). Behavior numbers live in `docs/CONTRACT.md`. Scenario data: `docs/product/scenario-dataset.md`. Copy: `apps/web/src/messages.ts` only.

## Requirements

### Requirement: First-login zone sync

The web app MUST read the browser IANA zone and, only when the `/today` response reports timezone `UTC` and the browser zone differs, send it once to the API, then refetch `['today']`. It MUST NOT send it otherwise, MUST NOT show a picker, and MUST NOT block rendering. A sync failure MUST be silent and retried on the next page load.

#### Scenario: Fresh account

- GIVEN a profile still on `UTC` and a browser in `America/Mexico_City`
- WHEN the first `/today` response arrives
- THEN the zone is sent once and the page refetches in local-day terms (R1, R16)

#### Scenario: Already set

- GIVEN a profile on `America/Mexico_City` (demo seed) and a browser in another zone
- WHEN `/today` loads
- THEN no request is sent and the stored zone is unchanged

#### Scenario: Sync fails

- GIVEN the zone request returns 5xx or the network drops
- WHEN the page continues
- THEN no error is shown and the next load tries again

### Requirement: Zone endpoint

The API MUST accept a zone only while the stored profile timezone is `UTC`, for the token subject only (R15). The name MUST be a valid IANA zone. Invalid payload or unknown name MUST return `400`; a profile already on a non-`UTC` zone MUST NOT be changed, and the response MUST be a no-op success carrying the stored zone. A missing or invalid token returns `401`.

#### Scenario: Set once

- GIVEN a profile on `UTC`
- WHEN a valid zone is submitted
- THEN it is stored and returned

#### Scenario: Never overwritten

- GIVEN a profile on `America/New_York`
- WHEN another valid zone is submitted
- THEN the stored zone stays `America/New_York`

#### Scenario: Invalid name

- GIVEN a profile on `UTC`
- WHEN `Mars/Olympus`, an empty string or a non-string is submitted
- THEN the response is `400` and nothing is stored

#### Scenario: Unauthenticated

- GIVEN no valid token
- WHEN the endpoint is called
- THEN the response is `401`

### Requirement: DST correctness of the stored zone

Day windows and reminder math MUST honor the stored zone across DST (D1, D2, D3, D4).

#### Scenario: Window after sync

- GIVEN a profile synced to `America/New_York`
- WHEN `/today` is requested on the spring-forward and fall-back days
- THEN the windows equal D1 and D2
