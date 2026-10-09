# Delta for Reminder Actions

## ADDED Requirements

### Requirement: "+1 h" from a notification (C15)

"+1 h" tapped in a push notification MUST apply the same math as the in-app "+1 h" (R7, C5): `due_at := now + 1 h` truncated to the minute, `snooze_count += 1`, `original_due_at` unchanged, `done_at` null. It MUST authenticate with the signed action token (`push-actions`, ADR-004) and MUST re-arm the notification (R10) for the new `due_at`. A second use of the same token MUST fail (`409`) because `due_at` changed, and the click MUST then open the app, which changes nothing because Today no longer shows that `due_at` (`push-actions`, open-the-app fallback). Done from a notification follows R9 and C3.

#### Scenario: C15 end to end [PR2]

- GIVEN Wed 10:05, N2 due 10:05, original Tue 18:00, count 1, notified for 10:05
- WHEN `POST /push-actions/snooze` runs with N2's token
- THEN due is 11:05, count 2, original Tue 18:00; the 11:05 reminder is claimable at 11:05 and not before

#### Scenario: Same result as in-app snooze [PR2]

- GIVEN the same note and instant
- WHEN `hour` is requested through the JWT route and through the token route on two copies
- THEN both notes end with identical `due_at`, `snooze_count` and `original_due_at`

#### Scenario: Second tap opens the app [PR2, PR3]

- GIVEN the first tap succeeded
- WHEN the same token is used again
- THEN the endpoint answers `409`, the service worker opens `/?action=snooze&note=<id>&due=<10:05>`, and the app runs no second snooze (Today shows due 11:05)

#### Scenario: DST (D3) [PR2]

- GIVEN a New York profile at Sun 8 Mar 2026 01:30 EST
- WHEN "+1 h" runs through the token route
- THEN due is 03:30 EDT (07:30Z)
