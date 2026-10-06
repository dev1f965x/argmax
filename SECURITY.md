# Security policy

## Reporting a vulnerability

Report security issues privately through GitHub's private vulnerability reporting: open the repository's **Security** tab and select **Report a vulnerability**, or go to <https://github.com/dev1f965x/argmax/security/advisories/new>.

Do not open a public issue for a security problem. Include the affected page or file, steps to reproduce, and the impact you expect.

Argmax is maintained by one person, so reports are handled on a best-effort basis. You will get a reply in the advisory once the report has been reviewed.

## Supported versions

Fixes go to the `main` branch and the deployed site.

## Dependency checks

CI fails when a production dependency has a known high or critical vulnerability (`pnpm audit --prod`). GitHub secret scanning with push protection, Dependabot alerts, and CodeQL are enabled for the repository, and Renovate opens update pull requests.

Accepted advisory: [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) (high, `braces`), reached only through the development tool `shadcn` (through `fast-glob` and `ts-morph`). It has no patched version for that path, the tool runs only when components are added on a developer's machine, and nothing from it ships in the site. Reviewed 2026-10-04; revisit when a patched release is available.

## Scope

Argmax is a static web app with no backend and no accounts. Lists are stored in the browser's local storage only. A share link carries a list in its URL fragment, and the app reads it as untrusted input. Relevant reports include cross-site scripting, crafted share links that run code, hang the page, or store data the app then rejects, ways to read or alter another visitor's stored lists, and weaknesses in the security headers or dependencies.

## Other requests

For questions, bug reports, and any other request, including requests about the project name, open an issue at <https://github.com/dev1f965x/argmax/issues>.
