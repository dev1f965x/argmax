# argmax — product definition

## Problem

"점심 뭐 먹지." The list is short and the stakes are low, but the deciding still takes ten
minutes. Writing the options down does not settle it; what is missing is the last step.

## Who it is for

Anyone who repeats the same small decision, alone or with people who answer "아무거나".
What is wanted is one answer, not a list to weigh.

## 1.0.0 scope

A topic holds the options; the app picks one.

- **Topics.** A topic is one recurring question — 점심 메뉴, 주말 게임 — and holds the
  options for it. They can be created, renamed, reordered by use, and deleted.
- **Options.** Text, added one line at a time, removed with one tap. A topic can hold as
  many as fit; nothing is weighted, and nothing is ranked.
- **The pick.** One button. The app chooses one option, shows it large, and offers to pick
  again. The draw is uniform: every option has exactly the same chance every time.
- **It remembers.** Topics, options, and the last pick survive a restart, on the device and
  nowhere else.
- **Three places, one app.** A page in the browser, a window on Windows, an app on Android,
  from one code base.

## Acceptance criteria

- With a topic of three options, pressing 고르기 shows exactly one of them, and pressing it
  again can show the same one.
- Over many picks, no option is favoured: a thousand draws from three options leave each
  within a few percent of a third.
- An empty topic explains what it needs instead of offering a pick.
- A topic deleted by mistake can be brought back until the next pick, or the app closes.
- Topics and options are still there after a restart, an update, and a reboot.
- Nothing about them leaves the device: no account, no sync, no analytics.
- The window works from a phone's width up to a desktop window, with no horizontal scroll.
- The pick reads as a decision rather than a lottery animation: it takes under a second.

## Non-goals

- No weights, no ranking, no tournaments, no "pick 2 of 5". Those are a different app, and
  they are how a picker becomes a spreadsheet.
- No accounts, no sharing a topic with a friend, no sync between the phone and the desktop.
- No ads, no telemetry, no network calls at all beyond checking for a desktop update.

## Non-functional requirements

- Opening to a usable list is immediate: everything is local.
- The whole interface is usable with a keyboard, and every state reads as text.
- Nothing about the player leaves the device (ADR 5).
- The web build is a static page that works offline once loaded.

## Roadmap

| Version | Adds |
|---|---|
| 1.0.0 | Topics, options, a uniform pick, on web, Windows, and Android |
| 1.1.0 | A history of what was picked, and an option to avoid repeating the last one |
| later | Weights, if using it proves they are wanted |
