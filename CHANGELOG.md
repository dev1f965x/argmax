# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-10-06

### Added

- Weights: while editing an item, give it a weight from ×1 up to the number of items in the list. An item with weight ×3 is three times as likely to be picked as one with ×1. Items with a weight other than 1 show a ×N badge.
- A "Show chances" switch on the list screen shows each item's chance of being picked as a percentage. It is off by default and remembered in this browser.
- Share a list as a link from its menu. The link holds the list name, items, and weights in the part after "#", built on the device, so no server stores or receives the list; anyone with the link can see it. The device's share sheet is used where there is one; otherwise the link is copied.
- Opening a share link shows the list read-only, with its weights and chances, and Add this list saves a separate copy in this browser. A broken link and a link that needs a newer version each say what to do, and in messenger in-app browsers such as KakaoTalk and LINE a notice suggests opening the link in the phone's browser.
- If lists were saved by a newer version of Argmax, a tab still running an older version says it can't edit them, leaves them unchanged, and offers Reload and Copy data.

### Changed

- The list menu has Rename, Share, and, set apart, Delete list.
- Before the first pick, the desktop result box shows a dice icon and "Your pick appears here" instead of a dash.
- In an item's edit row, Cancel comes before Save.
- With an empty list, the hint under Pick is read only by screen readers.
- Lists saved by 0.1.0 open with every item at weight ×1.
- The privacy policy covers share links and the "Show chances" setting, and counts sharing and adding a shared list as usage events, without their content.

### Security

- Control characters, bidirectional formatting characters, and other invalid characters are removed from names and items, line breaks and tabs become spaces, and text made only of invisible characters counts as empty. Lists saved by 0.1.0 are cleaned the same way when they load; data that cannot be cleaned is reported as unreadable and left unchanged.
- Text stacked with combining marks is cut back to eight marks per character once it passes a length cap, and such marks can no longer draw over neighboring rows or buttons.
- Lists are checked before they are saved, so the app never writes data it would refuse to load.
- Share links are treated as untrusted input: links that are too large, malformed, or contain text that would need more than trimming are rejected rather than repaired, decompression has a size cap, and the shared list is shown only as plain text, never as a link or in the page title.

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

[Unreleased]: https://github.com/dev1f965x/argmax/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/dev1f965x/argmax/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/dev1f965x/argmax/releases/tag/v0.1.0
