# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Items have a weight, 1 by default, and a pick selects each item with a chance of its weight divided by the list's total weight, still using the browser's cryptographic random source without bias.
- The weight is set while editing an item, with − and + buttons, the arrow keys, or by typing, from ×1 to the number of items in the list; a weight left above that number after removing items can only be lowered. Save applies the text and the weight together. Items with a weight other than 1 show a ×N badge.
- A "Show chances" switch on the list screen shows each item's chance as a whole percentage, "<1%" below 1%, or ">99%" above 99% while other items can still be picked. It is off by default and remembered in this browser.
- Share a list from its menu as a link. The link holds the list name and each item's text and weight, compressed and encoded on the device into the part of the address after "#", so no server stores or receives it. The dialog says that anyone with the link can see the list, uses the device's share sheet where there is one and copies the link otherwise, warns when a link over 2,000 characters may be cut by some messengers, says when a list is too long for a link that another device could open, and shows the link selected for copying by hand when copying fails.
- Opening a share link shows the list read-only in the reader's language, with its weights and chances, and Add this list, which saves a separate copy with new ids, opens it, and replaces the link in the address bar and in the history; a double click adds it once. Up to 100 lists still apply; a broken or cut-off link and a link from a newer version each get a message, and inside messenger in-app browsers such as KakaoTalk and LINE a notice suggests opening the link in the phone's browser.
- Saved data from a newer version of Argmax shows a message that lists can't be edited in this tab, with Reload and Copy data; the data is left unchanged and cannot be deleted from this tab.

### Changed

- Before the first pick, the desktop result box shows a dice icon and "Your pick appears here" instead of a dash.
- In an item's edit row, Cancel comes before Save and is a text button.
- With an empty list, the "Add an item to pick from." hint under Pick is read only by screen readers.
- The privacy policy says the "Show chances" setting is saved in this browser along with the language.
- The privacy policy says that share links are created on the device, contain the list itself, and never reach Argmax or Umami, that Argmax cannot remove a list from someone else's link, and that sharing and adding a shared list are counted as usage events without their content.
- The list menu has Rename, Share, and, set apart, Delete list.
- Saved data moves to schema version 2, which stores each item's weight. Lists saved by 0.1.0 load with weight 1 on every item and are written in the new format only with the next change.

### Security

- Names and items are limited to 1,600 UTF-16 code units in addition to 100 characters, so one character cannot carry thousands of combining marks: text over that limit keeps at most eight marks per character, which real scripts stay well below, and stacked marks are clipped so they cannot cover neighboring rows or buttons.
- Control characters, bidirectional formatting characters, and unpaired surrogates are removed from entered names and items, and line breaks and tabs become spaces; text made only of invisible characters counts as empty. Lists saved by 0.1.0 that contain them are cleaned the same way when loaded, items left empty are dropped, and the cleaned lists are saved with the next change; data that cleaning cannot make valid, such as a list name left empty, is reported as unreadable and left unchanged.
- The app validates lists before saving them and never writes data that it would reject when loading.
- Share links are untrusted input: links over 64 KB are rejected before decoding, decompression stops before 256 KB, the version and data must match strict patterns, bytes must be valid UTF-8 without a byte order mark, and the list must pass the stored-data rules; text that would need more than trimming and normalizing (control or bidirectional characters, marks stacked past the length cap) is rejected, not repaired. The compressed data reaches the decompressor in small pieces, so no browser expands a crafted link far past the cap. The shared list is shown as plain text that never becomes a link, the page title never contains it, phone number detection is off, and errors are logged without link content.

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
