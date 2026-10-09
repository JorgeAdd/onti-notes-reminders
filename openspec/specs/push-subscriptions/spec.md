# Push-subscriptions Specification

## Purpose

Register, replace and remove a browser's push subscription. Routes require the JWT (rule 18, R15). Tests use Fastify inject with a fake repository, or `[pg]` for RLS. PR tags: `[PR2]` endpoints, `[PR3]` web.

## Requirements

### Requirement: Subscribe

`POST /push-subscriptions` MUST accept `{ endpoint, keys: { p256dh, auth } }` for the JWT subject only and store one row per endpoint with `failure_count` 0. Repeating it with the same endpoint MUST be idempotent. An invalid body MUST return `400`; a missing or invalid token `401`.

#### Scenario: Subscribe [PR2]

- GIVEN Jorge's valid JWT
- WHEN he posts a valid subscription
- THEN the row exists for his user and the response is success

#### Scenario: Repeat [PR2]

- GIVEN the same endpoint posted twice by Jorge
- WHEN both complete
- THEN one row exists

#### Scenario: Validation and auth [PR2]

- GIVEN a body without `keys.auth`, a non-https endpoint, and a request without a token
- WHEN each is posted
- THEN `400`, `400`, `401`

### Requirement: Endpoint owned by another user

If the endpoint belongs to another user (same browser, new sign-in), subscribe MUST reassign it to the caller and MUST NOT leak that the endpoint existed (R15). Per the ADR-001 amendment (2026-10-08), this is the one owner-role statement allowed besides the scheduler: a single upsert on the endpoint, run only after the JWT is verified, with the verified `sub` as the owner. The response MUST be identical whether or not the endpoint existed. Every other subscription query runs as `authenticated`.

#### Scenario: Browser changes account [PR2]

- GIVEN Ana's row for endpoint E
- WHEN Jorge posts E
- THEN E belongs to Jorge only, Ana has no row, and the response equals a first-time subscribe

#### Scenario: RLS holds `[pg]` [PR2]

- GIVEN the same swap on real Postgres
- WHEN Jorge subscribes E (the one owner-role upsert) and then each user reads as `authenticated`
- THEN the swap succeeds, Jorge reads his row, Ana reads none, and Ana cannot read or delete Jorge's row

### Requirement: Unsubscribe

`DELETE /push-subscriptions` with `{ endpoint }` MUST delete only the caller's row for it. An unknown or another user's endpoint MUST be a no-op success that changes nothing.

#### Scenario: Unsubscribe [PR2]

- GIVEN Jorge's row for E
- WHEN he deletes E
- THEN the row is gone

#### Scenario: Not yours [PR2]

- GIVEN Ana's row for E
- WHEN Jorge deletes E
- THEN success and Ana's row remains

### Requirement: Sign-out unsubscribes this browser

On sign-out the web MUST unsubscribe this browser from the push service and call the delete route before the session ends. Failures MUST NOT block sign-out.

#### Scenario: Sign-out [PR3]

- GIVEN a granted, subscribed browser
- WHEN Sign out is pressed
- THEN `unsubscribe()` and the delete call run, then the session ends

#### Scenario: Failure does not block [PR3]

- GIVEN the delete call rejects
- WHEN Sign out is pressed
- THEN the session still ends

#### Scenario: No subscription [PR3]

- GIVEN no subscription or no service worker support
- WHEN Sign out is pressed
- THEN no push call is made and the session ends

### Requirement: Pruning

A subscription deleted by a 404 or 410 (`push-scheduler`) MUST NOT be re-created except by an explicit new subscribe.

#### Scenario: Pruned stays gone [PR2]

- GIVEN a row pruned after a 410
- WHEN the next reminder is sent
- THEN no send targets that endpoint
