# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- App scaffold with Vite, React, TypeScript, Tailwind CSS, shadcn/ui on Base UI, and React Router.
- Visual design tokens, Pretendard typography, the logo mark, favicon, and Open Graph image.
- English and Korean UI with a header language switcher; the choice is remembered in the browser.
- Privacy page, security policy, security headers, and third-party license notices.
- Lists screen: create lists, see them with their item counts, and open each one. Lists are saved in this browser, with warnings when storage is blocked or full and a way to copy or delete saved data that cannot be read.
- List screen: add, edit, and remove items, with the 1,000-item and 100-character limits; every action works with a keyboard.
- Rename and delete a list from the List actions menu; deleting asks for confirmation, states how many items go with it, and returns to the Lists screen.
- Lists stay consistent across browser tabs: a change in one tab appears in the others, and no tab overwrites lists created in another.
- Pick an item at random with equal chance: a short cycle settles on the result, which is shown in full and announced to screen readers; with reduced motion the result appears at once.
- Not found page: unknown paths and list links say the page or list does not exist and link back to the Lists screen.
- Each screen has its own page title; after navigation, focus moves to the new screen's heading, new screens start at the top, and Back restores the scroll position.
- Anonymous usage counts through Umami Cloud on the production site: screen views, list creation, and picks, without list names or items, without cookies, and not when the browser sends Global Privacy Control or Do Not Track.

[Unreleased]: https://github.com/dev1f965x/argmax/commits/main
