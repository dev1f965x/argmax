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
| `pnpm build` | Type-check and build to `dist/` |
| `pnpm preview` | Serve the production build |
| `pnpm check` | Format check, lint (Biome), and design token check |
| `pnpm format` | Format files |
| `pnpm typecheck` | Type-check |
| `pnpm test` | Run unit and component tests (Vitest) |
| `pnpm test:e2e` | Build and run end-to-end and accessibility tests (Playwright, axe-core) |

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

Argmax does not collect personal data. There are no accounts, cookies, analytics, or tracking. Lists and the language choice are saved only in the browser's local storage and are never sent anywhere. The hosting provider, Cloudflare, processes technical request data such as IP addresses to deliver and protect the site.

## Feedback and security

Questions, bug reports, and requests go to [GitHub Issues](https://github.com/dev1f965x/argmax/issues). Report security issues privately as described in [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE). Third-party licenses are listed in `third-party-notices.txt`, generated with each build and linked from the app's footer.
