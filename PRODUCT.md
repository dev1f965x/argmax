# Product

<!-- impeccable:product-schema 1 -->

Derived from the Problem Brief and PRD, which are private planning documents and remain the source of truth. Update those first, then this file.

## Platform

web

## Users

Individuals and small groups making everyday picks: what to eat, who goes first, which task to do next. The typical moment is a few people together, one of them on a phone, wanting the choice settled quickly so they can move on. Desktop use is supported but secondary.

## Product Purpose

Argmax keeps lists of options in the browser and picks one at random. Success means a first-time visitor can create a list and get a pick without instructions (H1), and people reuse saved lists instead of retyping them (H2).

## Positioning

Differentiation from existing tools (Wheel of Names, Picker Wheel, random.org List Randomizer, Naver's roulette and ladder) is explicitly not a goal; they are references for expected behavior. What Argmax can truthfully claim: saved lists, an unbiased random pick (the browser's cryptographic random source, mapped to an item without modulo bias and covered by a distribution test; a quality property, not the product's theme), no account, and lists that never leave the browser.

## Operating Context

- Used in the moment of deciding, often while talking with others, so the path from opening a list to seeing a pick must be short and readable at a glance.
- Lists are created once and reused later.
- The UI is in English and Korean; the initial language follows the browser and can be switched.

## Capabilities and Constraints

- First release (0.1.0): create, rename, and delete lists; add, edit, and remove items; pick one item; English and Korean UI.
- Later: item weights; picking several items at once. Not in 0.1.0: accounts, syncing, pick history, monetization.
- Lists live only in this browser's `localStorage`. Clearing browser data or switching devices loses them, and the UI must say so where lists are created.
- Limits: names and items up to 100 characters, up to 1,000 items per list, up to 100 lists. Reaching a limit shows a message.
- Empty or whitespace-only names and items are rejected with a message. Duplicate items are allowed without a warning.
- Deleting a list asks for confirmation and cannot be undone.
- Storage that is unavailable, full, or holds invalid data is reported to the user; data is never silently lost or overwritten.
- Static single-page app (Vite, React, TypeScript, Tailwind CSS, shadcn/ui on Base UI), free hosting, no backend. Argmax stores no personal data; usage data without names or account details goes to Umami Cloud.

## Brand Commitments

Name: Argmax. Visual identity, mark, and tokens are in [DESIGN.md](DESIGN.md).

## Evidence on Hand

None. There are no users, testimonials, metrics, or case studies yet, and none may be invented.

## Product Principles

1. The pick is the point: every screen shortens the way to a pick.
2. Reuse over retyping: saved lists are easy to find and open.
3. Honest about storage: users always know their lists stay in this browser, and failures are never silent.
4. Works for everyone: keyboard, screen reader, 360 px phones, and both languages are part of done, not extras.

## Accessibility & Inclusion

WCAG 2.2 Level AA. Every action works with a keyboard and a screen reader, and the pick result is announced. Layout works from 360 px wide screens. Korean text needs line breaking that keeps words whole.
