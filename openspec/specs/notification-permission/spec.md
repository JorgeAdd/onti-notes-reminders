# Notification-permission Specification

## Purpose

An opt-in control for notifications, placed in the date column under the theme control and in the mobile bar. Web PR only (`[PR3]`), added after slice 4 merges. Tests: vitest + jsdom with stubbed `Notification`, `navigator.serviceWorker` and `PushManager`. Copy: `apps/web/src/messages.ts` (`notifications` key). Delivery is an extra channel; Today is never affected (R10, C7).

## Requirements

### Requirement: States

The control MUST show one of four states: `default` (offers to enable), `granted` (on, offers to turn off), `denied` (explains), `unsupported` (explains; no action). It MUST be hidden when `VITE_VAPID_PUBLIC_KEY` is absent.

#### Scenario: Each state [PR3]

- GIVEN `Notification.permission` is `default`, `granted` and `denied`, and a run without `Notification`
- WHEN the control renders
- THEN it shows the enable, on, denied and unsupported states respectively

#### Scenario: Hidden without key [PR3]

- GIVEN no `VITE_VAPID_PUBLIC_KEY`
- WHEN the date column renders
- THEN no notification control is present

### Requirement: Never prompts on load

The permission prompt MUST appear only after the user activates the enable control. Mount, sign-in and registration MUST NOT call `Notification.requestPermission`.

#### Scenario: No prompt on load [PR3]

- GIVEN `default` permission and a spy on `requestPermission`
- WHEN the app mounts and a user signs in
- THEN the spy is never called

#### Scenario: Enable [PR3]

- GIVEN `default` and `requestPermission` resolving `granted`
- WHEN the user activates the control
- THEN the browser subscribes with the public key, the subscribe route is called, and the state is `granted`

#### Scenario: User declines the prompt [PR3]

- GIVEN `requestPermission` resolves `denied`
- WHEN the user activates the control
- THEN the state is `denied` and no subscribe call is made

#### Scenario: Subscribe call fails [PR3]

- GIVEN permission is granted but the subscribe route rejects
- WHEN the user activates the control
- THEN one error line from messages is shown and nothing throws

### Requirement: Turn off

In `granted`, activating the control MUST unsubscribe this browser and call the delete route, then return to the offer state.

#### Scenario: Turn off [PR3]

- GIVEN `granted` and a subscription
- WHEN the user turns it off
- THEN `unsubscribe()` and the delete call run and the control offers to enable again

### Requirement: Denied copy

The denied copy MUST state that items still appear in Today (C7) and how to re-enable in browser settings.

#### Scenario: Denied copy [PR3]

- GIVEN `denied`
- WHEN the control renders
- THEN the text equals the `messages.ts` entry that mentions Today

### Requirement: Placement

The control MUST render in the date column below the theme control and in the mobile bar, only where the theme control's host enables it. It MUST NOT render on the sign-in card.

#### Scenario: Desktop [PR3]

- GIVEN a signed-in user on Today
- WHEN the date column renders
- THEN the control follows the theme control in the same column

#### Scenario: Mobile [PR3]

- GIVEN a narrow viewport
- WHEN the mobile bar renders
- THEN the control is reachable there

#### Scenario: Sign-in card [PR3]

- GIVEN a signed-out visitor
- WHEN the card renders
- THEN no notification control is present

### Requirement: Registration and updates

The app MUST register `/sw.js` on load when supported, MUST call `registration.update()`, and `vercel.json` MUST serve `/sw.js` with `Cache-Control: no-cache`. `sw.js` MUST call `skipWaiting` and `clients.claim`. A manifest and placeholder icons MUST exist for iOS 16.4+ (best effort).

#### Scenario: Registration [PR3]

- GIVEN a stubbed `serviceWorker.register`
- WHEN the app mounts
- THEN `/sw.js` is registered and `update()` is called

#### Scenario: Unsupported browser [PR3]

- GIVEN no `serviceWorker` in `navigator`
- WHEN the app mounts
- THEN nothing throws and the control shows `unsupported`

#### Scenario: Static assets `[static]` [PR3]

- GIVEN `vercel.json` and `public/`
- WHEN parsed
- THEN a `/sw.js` no-cache header, `manifest.webmanifest` and its icon files exist

#### Scenario: iOS home-screen install `[manual]`

- GIVEN iOS 16.4+ with the app added to the home screen
- WHEN notifications are enabled
- THEN a push arrives; missing action buttons are acceptable

### Requirement: Styling and copy

The control MUST use semantic tokens only, MUST NOT use `--color-date` (rule 9), MUST have targets of at least `--size-target` (44 px) with `--focus-ring` (SG13, rule 11), and MUST NOT animate. All copy MUST live in `messages.ts` with no internal IDs.

#### Scenario: CSS scan `[static]` [PR3]

- GIVEN the control's CSS Module
- WHEN scanned
- THEN no `--core-*`, raw values or `--color-date`; targets use `--size-target`; `--focus-ring` on focus-visible

#### Scenario: Copy from messages [PR3]

- GIVEN the rendered control in each state
- WHEN text and accessible names are compared
- THEN they equal `messages.ts` entries and no hardcoded string exists in the source
