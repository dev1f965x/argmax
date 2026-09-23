# 5. Keep everything on the device

Status: accepted
Date: 2026-09-23

## Context

The app holds a handful of lists a person wrote for themselves. It runs in a browser tab,
a desktop window, and a phone app, and the same code has to store them in all three.

## Options

- **An account and a server.** Topics follow the person between devices, and the app grows
  a backend, a login, a privacy policy, and a bill.
- **A file through Tauri's store plugin.** Right for the two installed builds, absent in
  the browser, so the web build would need a second implementation.
- **`localStorage`.** Present in all three, synchronous, and enough for a few kilobytes of
  text.

## Decision

`localStorage`, under one key, read defensively so that anything unreadable falls back to
an empty list rather than an empty screen.

## Consequences

- No account, no sync, no server, and nothing to leak: the privacy line in the product
  definition holds without qualification.
- Topics do not follow the person from the phone to the desktop, which is the price.
- Clearing the browser's site data clears the topics of the web build; the installed builds
  keep theirs with the app.
