// Fails when UI strings use patterns that CONTENT.md bans.
import { readFileSync } from "node:fs";

const rules = {
  "src/i18n/en.ts": [
    /\b(?:seamless|effortless|successfully|simply|just|easily|powerful|robust|leverage|please|oops|above|below)\b/i,
    /!/,
    /['"]/, // Apostrophes and quotes are curly (’ “ ”).
  ],
  "src/i18n/ko.ts": [
    /해당|[을를] 통해|에 대한|성공적으로|정상적으로|손쉽게|간편하게|다양한|효율적으로|가능합니다|되어집니다|해요/,
    /!/,
    /['"]/,
  ],
};

const problems = [];
for (const [file, patterns] of Object.entries(rules)) {
  readFileSync(new URL(`../${file}`, import.meta.url), "utf8")
    .split("\n")
    .forEach((line, index) => {
      if (/^\s*\/\//.test(line)) return;
      // Only string literals are UI text; imports, types, and comments are not.
      // Escaped quotes are unescaped first, so a straight quote inside a
      // literal is still found.
      const text = [
        ...line.matchAll(/"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|`([^`]*)`/g),
      ]
        .map((match) =>
          (match[1] ?? match[2] ?? match[3]).replace(/\\(.)/g, "$1"),
        )
        .join(" ");
      for (const pattern of patterns) {
        const found = text.match(pattern);
        if (found) problems.push(`${file}:${index + 1}  ${found[0]}`);
      }
    });
}

if (problems.length > 0) {
  console.error("Banned patterns in UI text (see CONTENT.md):");
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}
console.log("Content: no banned patterns in UI text.");
