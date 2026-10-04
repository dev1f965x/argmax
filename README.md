# Argmax

English | [한국어](README.ko.md)

[![License](https://img.shields.io/github/license/dev1f965x/argmax)](LICENSE)

Argmax is a web app for making picks: create a list, add items, and pick one at random with equal chance. It is in development toward its first release; see the [changelog](CHANGELOG.md).

## Development

Open the repository in its Dev Container. Node.js and pnpm are installed there.

```sh
pnpm install
pnpm dev
```

| Script | Purpose |
| --- | --- |
| `pnpm dev` | Start the dev server at http://127.0.0.1:5173 |
| `pnpm build` | Type-check, build to `dist/`, and write `dist/third-party-notices.txt` |
| `pnpm preview` | Serve the production build with the production security headers |
| `pnpm check` | Format check and lint (Biome), the design token check, and the dependency license check |
| `pnpm lint` | Lint only |
| `pnpm format` | Format files |
| `pnpm typecheck` | Type-check |
| `pnpm test` | Run unit and component tests (Vitest) |
| `pnpm test:watch` | Run unit and component tests in watch mode |
| `pnpm test:e2e` | Build and run end-to-end, accessibility, and security header tests (Playwright, axe-core) |
| `pnpm check:licenses` | Dependency license check only |

## Deployment

The app is deployed to Cloudflare Workers as static assets, configured in `wrangler.jsonc`. When Cloudflare Workers Builds is connected to this repository, a merge to `main` deploys to production at <https://argmax.dev1f965x.workers.dev>, and other branches get a Worker Preview (enabled by the `previews` block in `wrangler.jsonc`; Wrangler labels `wrangler preview` an open beta command) whose URL is posted on the pull request. Preview URLs are public. In previews, open the root URL and navigate in the app; direct links to app routes such as `/lists/...` return 404 there, unlike in production.

Workers Builds settings:

| Setting | Value |
| --- | --- |
| Build command | `pnpm build` |
| Deploy command | `npx wrangler deploy` |
| Non-production branch deploy command | `npx wrangler preview` |
| Build variable | `PNPM_VERSION=12.8.1` (the build image defaults to an older pnpm; keep it equal to `packageManager`) |

Node.js comes from `.node-version`. Production deploys do not wait for GitHub CI; the `main` ruleset makes CI pass before anything is merged.

To roll back, open the Worker's **Deployments** in the Cloudflare dashboard and roll back to an earlier version, or run `pnpm exec wrangler rollback` after `pnpm exec wrangler login`. The next merge to `main` deploys again over a rollback.

## Privacy

Argmax has no accounts and no cookies, and it never asks for or stores personal data. Lists and the language choice are saved only in the browser's local storage and are never sent anywhere. The hosting provider, Cloudflare, processes technical request data such as IP addresses to deliver and protect the site.

The production site sends usage data without names or account details to [Umami Cloud](https://umami.is) (United States, 6-month retention) to measure how Argmax is used: screen views, list creation, and picks, with first-visit flags computed from the creation times of lists stored in the browser, the browser language, the screen size, and the referring site without its path. According to Umami's open-source data model ([schema](https://github.com/umami-software/umami/blob/master/prisma/schema.prisma), checked 2026-10-04), Umami does not store IP addresses; it records the approximate location (country, region, city) derived from the IP address and the browser, operating system, and device type derived from the user agent. List names, items, and list ids are never sent; nothing is sent from development, tests, or previews, or when the browser sends Global Privacy Control or Do Not Track. The app calls Umami's event API directly, without Umami's script. The privacy page in the app has the full notice. Privacy requests that should not be public go to argmax.contact@proton.me.

## Services and terms

Terms were checked on 2026-10-04. Argmax is a non-commercial project; before any commercial use, the terms marked "not confirmed" must be checked again.

| Service | Use | Plan and limits | Commercial use | Terms |
| --- | --- | --- | --- | --- |
| Cloudflare Workers | Hosting and preview deployments | Free: static asset requests are free and unlimited; other limits block rather than bill; no payment method | Not confirmed | [Terms](https://www.cloudflare.com/terms/), [pricing](https://developers.cloudflare.com/workers/platform/pricing/) |
| Umami Cloud | Usage analytics | Hobby, $0: 100K events per month, 1 website, 6-month retention; per-event overage applies only to paid plans; no payment method | Not confirmed | [Terms](https://umami.is/terms), [privacy](https://umami.is/privacy) |
| GitHub | Repository, Actions, CodeQL, secret scanning, Dependabot alerts | Free for public repositories | Allowed | [Terms](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service) |
| Mend Renovate (GitHub App) | Dependency update pull requests | Free | Allowed | [Terms](https://www.mend.io/terms-of-service/), [privacy](https://www.mend.io/privacy-policy/) |
| Shields.io | License badge in this README | Free | Not confirmed (no terms published) | [Shields.io](https://shields.io/) |
| Dev Container image and Claude Code feature | Development environment | `mcr.microsoft.com/devcontainers/typescript-node` and `ghcr.io/anthropics/devcontainer-features/claude-code`, both MIT | Allowed | [Image license](https://github.com/devcontainers/images/blob/main/LICENSE), [feature repository](https://github.com/anthropics/devcontainer-features) |

## Feedback and security

Questions, bug reports, and requests go to [GitHub Issues](https://github.com/dev1f965x/argmax/issues). Report security issues privately as described in [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE). Third-party licenses are listed in `third-party-notices.txt`, generated with each build and linked from the app's footer.
