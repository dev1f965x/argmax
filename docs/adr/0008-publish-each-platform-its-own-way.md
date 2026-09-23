# 8. Publish each platform its own way

Status: accepted
Date: 2026-09-23

## Context

One code base produces three things: a static page, a Windows installer, and an APK. Each
reaches people differently, and only one of them can update itself in place.

## Decision

- **Web** — the page deploys to GitHub Pages on every push to `main`, so a link always
  opens the current version.
- **Windows** — a tag builds a signed NSIS installer and drafts a release; installed copies
  update themselves through Tauri's updater, as in the other apps here.
- **Android** — the same tag builds an APK, signed with a keystore kept outside the
  repository, and attaches it to the release. There is no in-app update: an APK installed
  by hand is replaced by hand, and the app says which version it is.

## Consequences

- The page is both the trial and the fallback; nothing has to be installed to use the app.
- Losing the Android keystore means no installed copy can be upgraded in place, so it is
  backed up with the other keys.
- A release is one tag and three artefacts, and its notes say which is which.
