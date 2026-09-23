# 4. Draw uniformly, from the browser's own random source

Status: accepted
Date: 2026-09-23

## Context

The app's entire promise is one honest pick. A draw that leans, even slightly, is the one
bug nobody would report and everybody would feel — "이거 항상 첫 번째만 나와".

## Options

- **`Math.random()` with a modulo.** Two lines, and biased: the remainder favours the
  first options whenever the range does not divide evenly.
- **`Math.random()` scaled by the length.** Unbiased enough for a list of five, and its
  quality is left to the engine.
- **`crypto.getRandomValues`, with the biased tail thrown away.** The same source a
  password generator uses, present in every browser and webview this app runs in.

## Decision

`crypto.getRandomValues`, taking a 32-bit number and rejecting the values that would make
the remainder uneven, so every option has exactly the same chance.

## Consequences

- The pick is uniform, and a test can assert it over a thousand draws.
- The draw is a pure function of a random source, so tests hand it a fixed one.
- Nothing about the pick depends on the platform.
