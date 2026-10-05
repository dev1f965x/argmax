# Content guide

Rules for every word Argmax shows: UI strings in `src/i18n/`, page titles, `index.html` meta and Open Graph text, and the product description in the READMEs. Visual rules are in [DESIGN.md](DESIGN.md); product context is in [PRODUCT.md](PRODUCT.md).

English follows the [Microsoft Writing Style Guide](https://learn.microsoft.com/en-us/style-guide/welcome/); where this file is silent, that guide decides. Korean follows the rules below and the standard spelling and spacing rules of the National Institute of Korean Language.

## Voice

Plain, brief, and calm. The UI says what to do and what happened; it does not explain itself, sell itself, or talk like a chat assistant.

- Lead with the action or the fact. One idea per sentence.
- Address the reader as "you" in English and leave the subject out in Korean where it is clear.
- No exclamation marks, emoji, or jokes.
- Say what the app does, not what it is: "Lists are saved only in this browser", not "Argmax is a private list keeper".

## Terminology

Use these words and no synonyms. A new product noun or verb is added here before it appears in the UI.

| Concept | English | Korean | Notes |
| --- | --- | --- | --- |
| A named collection of options | list | 목록 | |
| One option in a list | item | 항목 | Not "entry", "option", or "choice" |
| Choosing one item at random | pick (verb), Pick (button) | 뽑기 | Korean uses the noun form for the button and "뽑다" in sentences |
| The chosen item | picked item; label "Picked" | 뽑힌 항목 | Not "winner" or "result" in sentences |
| Making a list | create | 만들다, 만들기 | Not "add a list" |
| Putting an item in a list | add | 추가하다, 추가 | |
| Changing an item's text | edit | 수정하다, 수정 | |
| Changing a list's name | rename | 이름 바꾸기 | |
| Taking an item out of a list | remove | 삭제하다, 삭제 | English separates remove (item) from delete (list); Korean uses 삭제 for both |
| Erasing a list or stored data | delete | 삭제하다, 삭제 | |
| Where lists are kept | this browser | 이 브라우저 | "local storage" only on the privacy policy |
| The stored state as a whole | saved data | 저장된 데이터 | |

Product name: Argmax, always in Latin letters, in both languages.

## Patterns

### Buttons and labels

- Verb first, sentence case, no trailing punctuation: "Create", "Delete list", "Pick again".
- Korean buttons use the noun form: "만들기", "목록 삭제", "다시 뽑기".
- A button that confirms a destructive action repeats the verb from the title ("Delete list"), never "OK" or "Confirm".
- Field labels are nouns: "New list name", "새 목록 이름". The placeholder repeats the label (DESIGN.md explains when a label is visually hidden).
- An icon-only button names its action and its object: "Edit “Ramen”".
- A button named in a sentence is written as it appears, without quotes: "select Copy data", "데이터 복사를 누르세요".

### Empty states

A short title that states the situation, then one sentence that names the next action. Do not repeat what a field or a disabled button already says.

- Lists, no lists yet: "No lists yet" / "Create your first list, for example “Lunch”." (아직 목록이 없습니다 / 첫 목록을 만드세요. 예: “점심 메뉴”)
- An empty list shows nothing extra: the count reads "0 items" and Pick states its reason.

### Notes with details

A note that must stay short gives the essential fact in one line and puts the rest in a popover opened by hovering or tapping the line.

- "Lists are saved only in this browser." → "Clearing browser data deletes them, and other devices don’t show them." / "목록은 이 브라우저에만 저장됩니다." → "브라우저 데이터를 지우면 삭제되며, 다른 기기에서는 보이지 않습니다."

### Errors and warnings

Say what happened, then what to do. No blame, no apology, no "Oops".

- "Enter a list name."
- "Couldn’t save the change. Reload the page and try again."
- Storage warnings put the consequence in the title ("Lists can’t be saved") and the cause and remedy in the body.

### Confirmations

The title is a question that names the object; the body states what else is affected and that it can't be undone.

- Title: "Delete “Lunch”?"
- Body: "This also deletes 3 items. You can’t undo this." / "항목 3개도 함께 삭제됩니다. 되돌릴 수 없습니다."

### Undo

Removing an item is one step and can be undone instead of confirmed. The result appears in a snackbar at the bottom of the screen with an Undo button and stays until the user’s next change in this list, with no timer, so keyboard and screen reader users can reach it.

- "Removed “Ramen”." + "Undo" / "“라멘” 항목을 삭제했습니다." + "되돌리기"
- After Undo: "Restored “Ramen”." / "“라멘” 항목을 되돌렸습니다."

### Limits

State the limit as a fact, then how to make room.

- "This list has 1,000 items, the maximum. Remove an item to add another."

### Announcements for screen readers

Past tense, name the object, end with a period (except the label form below). In Korean, when a particle would follow user text whose last syllable is unknown, use the form "label: “text”" instead of guessing 을/를 or 로/으로.

- "Added “Ramen”." / "“라멘” 항목을 추가했습니다."
- "Picked “Ramen”." / "뽑힌 항목: “라멘”"

### Numbers, quotes, and punctuation

- Numbers use the locale's grouping: "1,000".
- User text and example names are in curly double quotes: “Lunch”.
- English uses the curly apostrophe (’) in contractions and possessives. Contractions are fine ("can’t", "doesn’t").
- Sentences end with a period; titles, labels, and buttons do not.

## Korean

- Sentences use 합니다체 throughout: "저장됩니다", "삭제하세요". No 해요체, no mixing. One exception: a confirmation dialog's title asks with "-ㄹ까요?" ("“점심 메뉴” 목록을 삭제할까요?"), the usual form in Korean products; "-하시겠습니까?" reads stiff.
- Requests use "-하세요", not "-해 주세요" or "-하시기 바랍니다", except in the privacy policy's contact sentence, where "남겨 주세요" is the conventional form.
- Word spacing and line breaks follow the standard rules; the UI sets `word-break: keep-all`.

Banned, because they read as translation or as an AI answer:

- Chat-like explanations: "~해 드릴게요", "~하실 수 있어요", "도움이 되었으면 좋겠습니다"
- "~을 통해", "~에 대한", "해당", "~하는 것이 가능합니다", "~되어집니다", "~에 있어서"
- "성공적으로", "정상적으로" (say what happened instead)
- Vague modifiers: "손쉽게", "간편하게", "다양한", "효율적으로", "스마트하게"
- Exclamation marks, emoji, and "^^"

## English

Banned, for the same reasons:

- Hype and filler: "seamless", "effortless", "simply", "just", "easily", "powerful", "robust", "leverage", "unlock"
- "successfully" ("Saved" says it already), "please" in instructions, "Oops", "Uh-oh"
- Exclamation marks and emoji
- Directional words that assume a layout: "above", "below", "on the right"
- Title case in UI text; use sentence case

## Meta and store text

- `index.html` description and Open Graph text: one sentence on what the app does, under 160 characters, in English (the static HTML has one language).
- The README product description matches the meta description in substance.

## Checking

- Every new or changed string is checked against this file before review.
- The Korean and English versions say the same thing; neither is a loose paraphrase.
- `pnpm check` fails on the banned words, exclamation marks, and straight quotes in UI strings (`scripts/check-content.mjs`). Keep that script and this file in step.
