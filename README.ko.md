# Argmax

[English](README.md) | 한국어

[![License](https://img.shields.io/github/license/dev1f965x/argmax)](LICENSE)

Argmax는 무언가를 고를 때 쓰는 웹 앱입니다. 목록을 만들고 항목을 넣으면 그중 하나를 같은 확률로 무작위로 골라 줍니다. 첫 출시를 향해 개발 중이며, 진행 상황은 [변경 이력](CHANGELOG.md)에서 볼 수 있습니다.

## 개발

저장소를 Dev Container로 엽니다. Node.js와 pnpm은 컨테이너에 설치되어 있습니다.

```sh
pnpm install
pnpm dev
```

| 스크립트 | 용도 |
| --- | --- |
| `pnpm dev` | 개발 서버 실행(http://127.0.0.1:5173) |
| `pnpm build` | 타입 검사 후 `dist/`에 빌드 |
| `pnpm preview` | 프로덕션 빌드 미리 보기 |
| `pnpm check` | 포맷 검사, 린트(Biome), 디자인 토큰 검사 |
| `pnpm format` | 파일 포맷 |
| `pnpm typecheck` | 타입 검사 |
| `pnpm test` | 단위·컴포넌트 테스트 실행(Vitest) |
| `pnpm test:e2e` | 빌드 후 E2E·접근성 테스트 실행(Playwright, axe-core) |

## 배포

앱은 Cloudflare Workers에 정적 파일로 배포되며, 설정은 `wrangler.jsonc`에 있습니다. Cloudflare Workers Builds가 이 저장소에 연결되어 있으면, `main`에 머지할 때 <https://argmax.dev1f965x.workers.dev>에 운영 배포되고, 다른 브랜치는 Worker Preview(`wrangler.jsonc`의 `previews` 블록으로 켬. Wrangler는 `wrangler preview`를 오픈 베타 명령으로 표시함)로 배포되어 그 URL이 풀 리퀘스트에 달립니다. 미리보기 URL은 공개됩니다. 미리보기에서는 첫 화면에서 앱 안으로 이동해야 하며, `/lists/...` 같은 앱 경로로 바로 접속하면 운영과 달리 404가 납니다.

Workers Builds 설정:

| 항목 | 값 |
| --- | --- |
| 빌드 명령 | `pnpm build` |
| 배포 명령 | `npx wrangler deploy` |
| 운영 외 브랜치 배포 명령 | `npx wrangler preview` |
| 빌드 변수 | `PNPM_VERSION=12.8.1` (빌드 이미지의 기본 pnpm이 더 오래된 버전이므로 `packageManager`와 같게 유지) |

Node.js 버전은 `.node-version`을 따릅니다. 운영 배포는 GitHub CI를 기다리지 않으며, `main` 규칙셋이 머지 전에 CI 통과를 강제합니다.

롤백은 Cloudflare 대시보드에서 Worker의 **Deployments**를 열고 이전 버전으로 되돌리거나, `pnpm exec wrangler login` 후 `pnpm exec wrangler rollback`을 실행합니다. 롤백 뒤 `main`에 다시 머지하면 그 버전이 새로 배포됩니다.

## 개인정보

Argmax에는 계정과 쿠키가 없으며, 개인정보를 요청하거나 저장하지 않습니다. 목록과 선택한 언어는 브라우저의 로컬 저장소에만 저장되며 어디로도 전송되지 않습니다. 호스팅 업체인 Cloudflare는 사이트를 제공하고 보호하기 위해 IP 주소 같은 기술적인 요청 정보를 처리합니다.

운영 사이트는 사용 현황을 측정하기 위해 이름이나 계정 정보가 없는 사용 데이터를 [Umami Cloud](https://umami.is)(미국, 6개월 보관)로 보냅니다. 보내는 것은 화면 조회, 목록 생성, 뽑기와 첫 방문 여부, 브라우저 언어, 화면 크기, 링크한 사이트의 주소(경로 제외)입니다. Umami의 오픈소스 데이터 모델에 따르면 IP 주소는 저장하지 않고, IP 주소로 추정한 대략적인 위치(국가, 지역, 도시)와 User-Agent에서 알아낸 브라우저, 운영체제, 기기 종류를 기록합니다. 목록 이름, 항목, 목록 id는 보내지 않으며, 개발 환경, 테스트, 미리보기에서나 브라우저가 Global Privacy Control 또는 Do Not Track 신호를 보낼 때는 아무것도 보내지 않습니다. 앱은 Umami의 스크립트 없이 이벤트 API를 직접 호출합니다. 자세한 내용은 앱의 개인정보 페이지에 있습니다.

## 문의와 보안

문의, 버그 제보, 요청은 [GitHub 이슈](https://github.com/dev1f965x/argmax/issues)로 남겨 주세요. 보안 문제는 [SECURITY.md](SECURITY.md)에 안내된 방법으로 비공개 제보해 주세요.

## 라이선스

[MIT](LICENSE). 서드파티 라이선스는 빌드할 때마다 생성되는 `third-party-notices.txt`에 있으며, 앱 하단에서 볼 수 있습니다.
