# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-10-05

First release.

### Added

- Lists: create lists, see them with their item counts, and open each one; a new list opens with the cursor in its item field. Up to 100 lists.
- Items: add, edit, and remove items, up to 1,000 per list and 100 characters each; Undo after a removal; duplicates are allowed.
- Rename and delete a list from its actions menu; deleting asks for confirmation, states how many items go with it, and returns to Lists.
- Pick an item at random with equal chance, using the browser's cryptographic random source: names cycle briefly and settle on the result, which is announced to screen readers; with reduced motion the result appears at once.
- Lists are saved only in this browser and stay in step across open tabs; storage that is blocked, full, or holds data that cannot be read is reported, with a way to copy or delete unreadable data.
- English and Korean UI, following the browser's language, with a switch in the header that is remembered.
- Keyboard and screen reader support (WCAG 2.2 AA), page titles per screen, focus moved to each new screen, and layouts from 360 px phones to desktops.
- Privacy policy, security policy, security headers, and third-party license notices; a Feedback link to GitHub Issues with bug report and feature request templates.
- Usage counts sent to Umami Cloud from the production site (screen views, list creation, and picks), without list names or items, without cookies, and not when the browser sends Global Privacy Control or Do Not Track.

[Unreleased]: https://github.com/dev1f965x/argmax/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/dev1f965x/argmax/releases/tag/v0.1.0
