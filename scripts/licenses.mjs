// Fails when a dependency's license is not on the allow list, and with
// --write <file> writes the third-party notices for production dependencies.
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

// Permissive licenses, plus OFL-1.1 for fonts. Production code ships to users.
const production = new Set([
  "MIT",
  "MIT-0",
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "ISC",
  "0BSD",
  "BlueOak-1.0.0",
  "CC0-1.0",
  "OFL-1.1",
]);
// Build and test tools never ship. MPL-2.0 is file-level copyleft (axe-core, lightningcss);
// Python-2.0 and CC-BY-4.0 cover tooling and data (argparse, caniuse-lite). LGPL-3.0-or-later is
// libvips, a prebuilt binary that Wrangler's local runtime loads through sharp. None is modified or bundled.
const development = new Set([
  ...production,
  "MPL-2.0",
  "Python-2.0",
  "CC-BY-4.0",
  "LGPL-3.0-or-later",
]);

// Build-time packages whose code still ships: Tailwind's preflight and utilities,
// shadcn's CSS keyframes, and Vite's module preload polyfill end up in dist/.
const shippedBuildTools = ["tailwindcss", "shadcn", "vite"];

// Packages published without a license file. Texts come from the package's tagged source release.
const vendoredLicenses = { pretendard: "licenses/pretendard.txt" };

function list(scope) {
  const args = [
    "licenses",
    "list",
    "--json",
    ...(scope === "production" ? ["--prod"] : []),
  ];
  return JSON.parse(execFileSync("pnpm", args, { encoding: "utf8" }));
}

// SPDX expression: any alternative of an OR, and every part of an AND, must be allowed.
// Nested expressions are rejected for manual review rather than parsed loosely.
function isAllowed(expression, allowed) {
  if (/[()]/.test(expression)) return false;
  return expression
    .split(/\s+OR\s+/)
    .some((alternative) =>
      alternative.split(/\s+AND\s+/).every((id) => allowed.has(id.trim())),
    );
}

function violations(byLicense, allowed) {
  return Object.entries(byLicense)
    .filter(([license]) => !isAllowed(license, allowed))
    .flatMap(([license, packages]) =>
      packages.map((p) => `${p.name}@${p.versions.join(",")}: ${license}`),
    );
}

function licenseText(name, packagePath) {
  const vendored = vendoredLicenses[name];
  if (vendored) return readFileSync(vendored, "utf8").trim();
  const file = readdirSync(packagePath).find((entry) =>
    /^(licen[cs]e|copying|ofl)(\.|$)/i.test(entry),
  );
  if (!file)
    throw new Error(
      `No license file for ${name}; add it to vendoredLicenses in scripts/licenses.mjs`,
    );
  return readFileSync(join(packagePath, file), "utf8").trim();
}

function notices(byLicense) {
  const sections = Object.entries(byLicense)
    .flatMap(([license, packages]) => packages.map((p) => ({ ...p, license })))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(
      (p) =>
        `${p.name} ${p.versions.join(", ")}\nLicense: ${p.license}${p.homepage ? `\nSource: ${p.homepage}` : ""}\n\n${licenseText(p.name, p.paths[0])}`,
    );
  return `Third-party software in Argmax\n\nArgmax includes the following open source software.\n\n${sections.join(`\n\n${"-".repeat(72)}\n\n`)}\n`;
}

const allLicenses = list("all");
const productionLicenses = list("production");
for (const [license, packages] of Object.entries(allLicenses)) {
  const shipped = packages.filter((p) => shippedBuildTools.includes(p.name));
  if (shipped.length > 0) {
    productionLicenses[license] = [
      ...(productionLicenses[license] ?? []),
      ...shipped,
    ];
  }
}
for (const name of shippedBuildTools) {
  if (
    !Object.values(productionLicenses)
      .flat()
      .some((p) => p.name === name)
  ) {
    throw new Error(
      `${name} is listed in shippedBuildTools but is not installed`,
    );
  }
}
const problems = [
  ...violations(productionLicenses, production),
  ...violations(allLicenses, development),
];
if (problems.length > 0) {
  console.error(
    `Licenses not on the allow list (scripts/licenses.mjs):\n${[...new Set(problems)].join("\n")}`,
  );
  process.exit(1);
}
console.log("Licenses: all dependencies are on the allow list.");

const writeIndex = process.argv.indexOf("--write");
if (writeIndex !== -1) {
  const target = process.argv[writeIndex + 1];
  if (!target) throw new Error("--write needs a file path");
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, notices(productionLicenses));
  console.log(`Wrote ${target}`);
}
