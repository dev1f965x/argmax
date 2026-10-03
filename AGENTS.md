# AGENTS.md

Guidance for coding agents working in this repository. Humans should start with [README.md](README.md).

## Project

Argmax is a static single-page web app that keeps lists in the browser and picks one item at random with equal chance. There is no backend. Product context is in [PRODUCT.md](PRODUCT.md); visual design rules and tokens are in [DESIGN.md](DESIGN.md).

## Setup

Work inside the Dev Container (`.devcontainer/`). It installs Node.js 24, pnpm, dependencies, and the Playwright browsers.

```sh
pnpm install
pnpm dev        # http://127.0.0.1:5173
```

## Commands

| Command | What it does |
| --- | --- |
| `pnpm check` | Biome format check and lint, the design token check, and the dependency license check |
| `pnpm lint` | Biome lint only |
| `pnpm format` | Format files with Biome |
| `pnpm typecheck` | TypeScript project build check (`tsc -b`) |
| `pnpm test` | Unit and component tests (Vitest, Testing Library) |
| `pnpm test:watch` | Unit and component tests in watch mode |
| `pnpm test:e2e` | Production build, then end-to-end, accessibility, and security header tests (Playwright, axe-core) |
| `pnpm build` | Type check, production build to `dist/`, and `dist/third-party-notices.txt` |
| `pnpm preview` | Serve `dist/` with the production security headers |
| `pnpm check:licenses` | Dependency license check only |

Run `check`, `typecheck`, `test`, `build`, and `test:e2e` before handing off any change. After a dependency change, run all of them even if the change looks unrelated.

CI (`.github/workflows/ci.yml`) runs the same commands on every pull request; both jobs are required checks for `main`. CI takes the Node.js major version from `.node-version` and pnpm from `packageManager`; the Dev Container image follows the same Node.js major version, so patch versions can differ until the container is rebuilt. Renovate (`renovate.json`) proposes dependency updates. Cloudflare Workers Builds deploys `main` to production without waiting for CI, so CI must pass before merging; deployment settings are in README.md.

## Structure

| Path | Contents |
| --- | --- |
| `src/main.tsx` | Entry point |
| `src/routes/` | Route components and the root layout |
| `src/router.tsx` | Route table (React Router, data mode) |
| `src/components/` | App components; `ui/` holds shadcn/ui components generated on Base UI, changed only to apply DESIGN.md |
| `src/i18n/` | i18next setup, English and Korean resources, locale detection |
| `src/lib/` | Framework-independent logic and constants |
| `src/test/` | Vitest setup |
| `src/index.css` | Design tokens and the Tailwind and shadcn/ui theme |
| `public/` | Static files served as is, including `_headers` with the security headers |
| `licenses/` | License texts for packages published without one |
| `e2e/` | Playwright tests against the production build |
| `scripts/` | Design token and license checks, and the notices generator |

## Conventions

- TypeScript strict mode with `noUncheckedIndexedAccess`; no `any` and no suppression comments.
- Use design tokens only. `pnpm check` fails on raw colors or arbitrary Tailwind values in TypeScript files under `src/`, except `src/components/ui/` and tests.
- New dependencies must have a license on the allow list in `scripts/licenses.mjs`; do not extend the list without recording why.
- Keep the content security policy in `public/_headers` strict; no inline scripts or styles and no third-party origins without a recorded reason.
- Every UI string goes through i18next. Add the English key in `src/i18n/en.ts`; the Korean resources must have the same keys or the type check fails.
- A link styled as a button is `<Link className={buttonVariants()}>`, not `Button` with `render`, which adds `role="button"`.
- UI changes are checked with screenshots at 360 px and desktop widths, in English and Korean, and must pass the axe checks.
- Comments explain why, not what.

## Git and pull requests

- Branch: `<type>/ARG-<n>-<short-description>`. Commits follow Conventional Commits and end with a `Refs: ARG-<n>` paragraph.
- `main` changes only through squash-merged pull requests.
- Do not push, open pull requests, or merge; the owner does that.
