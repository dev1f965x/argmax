---
name: Argmax
description: Keep lists in your browser and pick one at random.
colors:
  background: "oklch(0.995 0.003 168)"
  surface: "oklch(0.975 0.006 168)"
  surface-2: "oklch(0.955 0.008 168)"
  border: "oklch(0.91 0.01 168)"
  input: "oklch(0.64 0.012 168)"
  foreground: "oklch(0.22 0.015 168)"
  muted-foreground: "oklch(0.48 0.015 168)"
  subtle-foreground: "oklch(0.55 0.013 168)"
  primary: "oklch(0.5 0.088 168)"
  primary-hover: "oklch(0.44 0.08 168)"
  primary-foreground: "oklch(1 0 0)"
  brand-soft: "oklch(0.95 0.028 168)"
  brand-strong: "oklch(0.4 0.07 168)"
  destructive: "oklch(0.53 0.18 27)"
  destructive-soft: "oklch(0.962 0.018 27)"
  warning: "oklch(0.5 0.095 70)"
  warning-soft: "oklch(0.965 0.035 85)"
  popover: "oklch(1 0 0)"
typography:
  body:
    fontFamily: "Pretendard Variable, Pretendard, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  small:
    fontFamily: "Pretendard Variable, Pretendard, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  title:
    fontFamily: "Pretendard Variable, Pretendard, system-ui, sans-serif"
    fontSize: "1.625rem"
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: "-0.015em"
  result:
    fontFamily: "Pretendard Variable, Pretendard, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: "-0.015em"
  result-lg:
    fontFamily: "Pretendard Variable, Pretendard, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.015em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "14px"
  2xl: "18px"
spacing:
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  6: "24px"
  8: "32px"
  12: "48px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.lg}"
    height: "44px"
    padding: "0 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-pick:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.xl}"
    height: "54px"
    width: "100%"
  input:
    backgroundColor: "{colors.popover}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    height: "44px"
    padding: "0 14px"
  pick-result:
    backgroundColor: "{colors.brand-soft}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
    typography: "{typography.result}"
  banner-warning:
    backgroundColor: "{colors.warning-soft}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
  banner-error:
    backgroundColor: "{colors.destructive-soft}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
---

# Argmax design system

Source of truth for tokens is `src/index.css`; this file explains them. Change both together. Product context is in `PRODUCT.md`; screen structure and states come from the private wireframes ("Wireframes: First Release"); UI text follows [CONTENT.md](CONTENT.md).

## Overview

Personality: calm, quick, light. Argmax is a tool people open in the middle of a conversation to settle a small decision, usually on a phone. The interface stays quiet so the pick result stands out.

References and what each contributes:

| Product | What to take |
| --- | --- |
| Toss | Korean typography, one large action per screen |
| Things 3 | Calm list layouts, light-weight add and edit interactions, color used sparingly |
| Linear | Restrained neutrals, precise spacing and borders, keyboard-first details |
| Apple Reminders | Familiar mobile list editing and empty states |

The layout follows common list apps; the brand shows in the green, the mark, and the pick moment.

## Colors

Tinted neutrals plus one brand hue (green, hue 168 in OKLCH) and semantic colors. All neutrals carry a trace of the brand hue so the page does not read as default gray.

- `primary` is for the main action on a screen and for focus rings. It is not used for decoration.
- `brand-soft` is behind the pick result, with the "Picked" label in `brand-strong`; nothing else carries a large tinted area.
- `destructive` is for errors and destructive actions; `warning` for recoverable problems such as storage being unavailable.
- `input` is the border of form controls; `border` is for dividers only.

Contrast on `background` (WCAG 2.2): `foreground` 17.0:1, `muted-foreground` 6.4:1, `subtle-foreground` 4.8:1 (placeholders), `primary` 5.7:1, `destructive` 5.7:1. White on `primary` is 5.7:1. `input` against `background` is 3.3:1, which meets the 3:1 rule for control boundaries. `border` (1.3:1) is decorative only and never the sole boundary of a control.

## Typography

One family: Pretendard Variable, self-hosted from the `pretendard` package with its dynamic subset, so the browser downloads only the Hangul ranges a page uses.

- Body 16 px, line height 1.6, tuned for Hangul. Small text 14 px.
- Titles 26 px bold, line height 1.35, tracking -0.015em.
- Pick result 22 px on mobile and 28 px on desktop, bold, shown in full and never truncated.
- Korean text uses `word-break: keep-all` so words are not split across lines.
- Weights: 400 body, 500 secondary emphasis, 600 labels and buttons, 700 titles and the result.

Pretendard's Latin glyphs are derived from Inter, which is otherwise avoided (see Don'ts). Pretendard is kept because one family keeps Hangul and Latin consistent in mixed text, and the brand is carried by color, the mark, and layout rather than the typeface.

## Layout

- Content width 960 px with 16 px side padding. The Lists screen keeps the same left edge and limits its column to 640 px.
- List screen: one column on mobile with a fixed pick bar at the bottom; from 768 px, two columns with a 320 px sticky pick panel on the right. The bar publishes its height as `--pick-bar-height`, and the layout reserves that space so the last items are never covered. On mobile this screen leaves out the site footer: links between the items and the bar would read as part of the list, and the Lists screen keeps them.
- Snackbar: a short message with one action (Undo after removing an item). On mobile it sits above the pick bar, at most 640 px wide; on desktop at the bottom right, 320 px wide, under the pick panel's column, where it cannot meet the list or the footer links.
- The snackbar overlays the page and never moves it. On mobile the list screen keeps 96 px free below the list for it; on desktop it needs no room, so the footer has the same height on every screen. Its message is at most two lines, so that room always suffices. It publishes `--snackbar-height` for keyboard focus scrolling only.
- The snackbar stays until the user does something else in the list (a change, a pick, the menu, editing a row); it has no timer.
- Focus moves after an action (a removal, a save) do not scroll the page for touch and mouse users; for keyboard users (`:focus-visible`) the focused control is scrolled into view above the fixed bars.
- Pick panel: the result sits above the Pick button on every width. On desktop the box has a fixed height of 160 px; a longer result steps down from 28 to 22, 18, and 16 px until it fits, again whenever its width changes, and scrolls inside only beyond that (100 characters without spaces); and before the first pick an empty `surface` box with a muted "Picked" label and a dash (hidden from screen readers) holds its place, so the button never moves; the phone bar shows the result only after a pick, to stay small. Below 480 px of height (a phone in landscape) the bar is compact: label and result on one line, a 44 px button.
- Lists screen: under the name field, an info icon and one short line say where lists are kept; the details (clearing browser data, other devices) open in a popover on hover with a pointer and on tap or Enter, since phones have no hover. With no lists, a `surface` card states it and names the first step.
- Popover: `bg-popover`, `shadow-overlay`, and a `border` ring, named by its trigger. The storage note's popover is at most 288 px wide and aligned to the start of the note.
- Back link: list screens and the privacy policy start with "All lists"; the not-found page offers a button-styled link back instead.
- Spacing follows the 4 px Tailwind scale. Groups use 8 to 12 px, sections 24 to 32 px, and there is more space above a heading than below it.
- Touch targets are at least 44 px.
- Single-field forms that add something (a new list, a new item) use the placeholder as the visible prompt and a visually hidden label, following the approved wireframes and the reference apps; the screen title gives the context once the user types. Forms with more than one field use visible labels.

## Elevation & Depth

Flat by default: separation comes from dividers and tinted surfaces, not shadows.

- `shadow-segment`: the selected segment of the language switch.
- `shadow-overlay`: menus, popovers, and the snackbar.
- `shadow-dialog`: dialogs, with a dark scrim behind.

## Shapes

- Controls (inputs, buttons): `rounded-lg` (10 px).
- Larger surfaces (pick result, banners, the snackbar, dialogs, the Pick button): `rounded-xl` (14 px).
- Small elements (menu items, icon buttons): `rounded-md` or `rounded-sm`.

## Components

- Components come from shadcn/ui on Base UI and use only the tokens above. App components may not use raw colors or arbitrary values; `pnpm check` enforces this with `scripts/check-design-tokens.mjs`. Generated files in `src/components/ui` are excluded from that check and changed only to apply this file: 44 px buttons, inputs, and menu items, 16 px semibold button text, `primary-hover`, `input` borders on outline buttons, a solid destructive button, the dialog scrim, shadow, 20 px bold title, and one right-aligned row of buttons at every width, the menu shadow, width, and a `primary` focus ring on items, the disabled input surface, and the popover shadow and ring. Review those edits when regenerating a component.
- Disabled controls use `surface` or `surface-2` with `subtle-foreground` text, so they read as unavailable at a glance.
- User text (list names, items, the pick result) is a block element of its own, so right-to-left text cannot reorder the labels around it, and it uses `overflow-clip`, so a character stacked with combining marks cannot draw over neighboring rows or controls. The line height leaves room for descenders and Hangul, which the clip does not cut.
- Icons: Lucide only, 20 px in rows and buttons, 16 to 18 px inline, stroke width 2.
- Mark and wordmark: `src/components/wordmark.tsx`. Three dots, one raised and green: the argument that maximizes. Favicon, Apple touch icon, and Open Graph image in `public/` use the same mark.

### Motion

- One authored moment: when the user picks, item names cycle quickly for about 600 ms and settle on the result with an ease-out (`ease-out-expo`). With `prefers-reduced-motion: reduce`, the result appears immediately.
- The cycle uses ten steps with growing gaps (30 to 100 ms), an approximation of the ease-out: a literal expo curve would need steps shorter than a frame and a long stall at the end. Cycling names are muted and kept to one line so the panel does not jump; the result then takes the foreground color with a 150 ms `ease-out-expo` transition. In the phone bar the result area is capped at 40% of the viewport height and scrolls beyond that.
- Everything else changes instantly or with a short fade (about 150 ms). No entrance animations on page load and no hover motion on rows.

### Dark mode

Not in 0.1.0. Argmax is used mostly in daylight with other people, the light palette was tuned and checked for contrast, and supporting a second theme would double visual QA for little benefit at this stage. `color-scheme: light` is set so browser controls match. Revisit if users ask for it.

## Do's and Don'ts

Do:

- Keep one primary action per screen and make the pick result the most prominent thing after a pick.
- Follow [CONTENT.md](CONTENT.md) for UI text.
- Check every screen at 360 px and 1280 px, in English and Korean, before calling it done.

Don't:

- Inter as a separate face, or any second display font.
- Purple-to-blue or any decorative gradients, gradient text, glassmorphism.
- Borders and shadows on every card, nested cards, or identical card grids.
- Emoji or Unicode glyphs as icons.
- All-caps eyebrow labels above headings, or arrows appended to button text.
- Truncating the pick result.
