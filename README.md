# Argmax

English | [한국어](README.ko.md)

[![License](https://img.shields.io/github/license/dev1f965x/argmax)](LICENSE)

Argmax is a web app for making picks. Create a list, add items, and let it pick one at random.

## Development

Open the repository in its Dev Container. Node.js and pnpm are installed there.

```sh
pnpm install
pnpm dev
```

| Script | Purpose |
| --- | --- |
| `pnpm dev` | Start the dev server at http://localhost:5173 |
| `pnpm build` | Type-check and build to `dist/` |
| `pnpm preview` | Serve the production build |
| `pnpm check` | Format check and lint (Biome) |
| `pnpm format` | Format files |
| `pnpm typecheck` | Type-check |
| `pnpm test` | Run unit and component tests (Vitest) |
| `pnpm test:e2e` | Build and run end-to-end and accessibility tests (Playwright, axe-core) |

## Privacy

Argmax does not collect personal data. There are no accounts, cookies, analytics, or tracking. Lists and the language choice are saved only in the browser's local storage and are never sent anywhere. The hosting provider, Cloudflare, processes technical request data such as IP addresses to deliver and protect the site.

## Feedback and security

Questions, bug reports, and requests go to [GitHub Issues](https://github.com/dev1f965x/argmax/issues). Report security issues privately as described in [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE). Third-party licenses are listed in `third-party-notices.txt`, generated with each build and linked from the app's footer.
