# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Items have a weight, 1 by default, and a pick selects each item with a chance of its weight divided by the list's total weight, still using the browser's cryptographic random source without bias.
- Saved data from a newer version of Argmax shows a message that lists can't be edited in this tab, with Reload and Copy data; the data is left unchanged and cannot be deleted from this tab.

### Changed

- Saved data moves to schema version 2, which stores each item's weight. Lists saved by 0.1.0 load with weight 1 on every item and are written in the new format only with the next change.

### Security

- Names and items are limited to 1,600 UTF-16 code units in addition to 100 characters, so one character cannot carry thousands of combining marks: text over that limit keeps at most eight marks per character, which real scripts stay well below, and stacked marks are clipped so they cannot cover neighboring rows or buttons.
- Control characters, bidirectional formatting characters, and unpaired surrogates are removed from entered names and items, and line breaks and tabs become spaces; text made only of invisible characters counts as empty. Lists saved by 0.1.0 that contain them are cleaned the same way when loaded, items left empty are dropped, and the cleaned lists are saved with the next change; data that cleaning cannot make valid, such as a list name left empty, is reported as unreadable and left unchanged.
- The app validates lists before saving them and never writes data that it would reject when loading.

## [0.1.0] - 2026-10-05

First release.

### Added

- Lists: create lists, see them with their item counts, and open each one; a new list opens with the cursor in its item field. Up to 100 lists.
- Items: add, edit, and remove items, up to 1,000 per list and 100 characters each; Undo after a removal; duplicates are allowed.
- Rename and delete a list from its actions menu; deleting asks for confirmation, states how many items go with it, and returns to Lists.
- Pick an item at random: names cycle briefly and settle on the result, which is announced to screen readers; with reduced motion the result appears at once.
- Lists are saved only in this browser and stay in step across open tabs; storage that is blocked, full, or holds data that cannot be read is reported, with a way to copy or delete unreadable data.
- English and Korean UI, following the browser's language, with a switch in the header that is remembered.
- Keyboard and screen reader support, checked with automated axe scans against WCAG 2.2 AA and an NVDA pass; page titles per screen, focus moved to each new screen, and layouts from 360 px phones to desktops.
- Privacy policy, security policy, security headers, and third-party license notices; a Feedback link to GitHub Issues with bug report and feature request templates.
- Usage data without names or account details sent to Umami Cloud from the production site (screen views, list creation, and picks, with the browser language, screen size, and referring site), without list names or items, without cookies, and not when the browser sends Global Privacy Control or Do Not Track.

[Unreleased]: https://github.com/dev1f965x/argmax/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/dev1f965x/argmax/releases/tag/v0.1.0
