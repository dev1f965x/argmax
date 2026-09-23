# 2. One code base for the browser, Windows, and Android

Status: accepted
Date: 2026-09-23

## Context

The app is a list and a button. It is wanted on a phone, where the question usually comes
up; on a desktop, where the person already is; and as a page, so it can be tried without
installing anything.

## Options

- **Three native apps.** The best of each platform, and three of everything to maintain,
  for an app whose whole interface is a list and a button.
- **A web page only.** One build, instantly shareable, and no icon on a phone's home
  screen, no window of its own, nothing in the app list.
- **Tauri 2 around a web interface.** The same interface builds as a static page, as a
  Windows installer, and as an Android app. Tauri's Rust shell is only a shell here; the
  app itself never leaves the webview.

## Decision

Tauri 2. `npm run build` is the page, `tauri build` is the installer, and
`tauri android build` is the APK, from the same `src/`.

## Consequences

- Anything platform-specific has to be behind a check, and there is almost nothing: the
  app stores its data the same way in all three (ADR 5).
- The Android and Windows builds carry a webview each; on Android it is the system one, on
  Windows the WebView2 runtime the OS already has.
- The web build is what a person tries first, and the same build is what they install.
