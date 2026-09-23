# 7. Use Biome for lint and format

Status: accepted
Date: 2026-09-23

## Decision

Biome formats and lints the TypeScript and CSS, with one configuration and one command in
CI. Rust is formatted by `cargo fmt` and linted by Clippy, denying warnings.

## Consequences

- One tool instead of ESLint and Prettier, and a check that finishes in seconds.
- Biome's rule set is narrower than ESLint's; nothing here needs what it lacks.
