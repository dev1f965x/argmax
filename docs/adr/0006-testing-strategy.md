# 6. Testing strategy

Status: accepted
Date: 2026-09-23

## Context

The risky parts are the draw, which has to be even, and the topics, which have to survive
a restart and a stored file someone edited by hand. Neither needs a phone, a window, or a
click to be tested.

## Decision

- **Vitest and Testing Library** for the domain — the draw, the topics, the reading of
  what was stored — and for the window's states.
- **Playwright** against the real page for the flows that cross components: make a topic,
  fill it, pick, come back to it.
- The draw gets a statistical test: a thousand draws from three options leave each within
  a few percent of a third.
- Every one of them runs in CI on each pull request.

## Consequences

- The Rust shell has no logic of its own to test, and its one job — showing a window — is
  checked by hand before a release.
- The Android build is checked by hand on a phone, which is the only place it can be.
- A test that needs randomness hands the draw a source of its own, so nothing is flaky.
