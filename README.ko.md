# Argmax

[English](README.md) | 한국어

[![License](https://img.shields.io/github/license/dev1f965x/argmax)](LICENSE)

Argmax는 무언가를 고를 때 쓰는 웹 앱입니다. 목록을 만들고 항목을 넣으면 그중 하나를 무작위로 골라 줍니다.

## 개발

저장소를 Dev Container로 엽니다. Node.js와 pnpm은 컨테이너에 설치되어 있습니다.

```sh
pnpm install
pnpm dev
```

| 스크립트 | 용도 |
| --- | --- |
| `pnpm dev` | 개발 서버 실행(http://localhost:5173) |
| `pnpm build` | 타입 검사 후 `dist/`에 빌드 |
| `pnpm preview` | 프로덕션 빌드 미리 보기 |
| `pnpm check` | 포맷 검사와 린트(Biome) |
| `pnpm format` | 파일 포맷 |
| `pnpm typecheck` | 타입 검사 |
| `pnpm test` | 단위·컴포넌트 테스트 실행(Vitest) |
| `pnpm test:e2e` | 빌드 후 E2E·접근성 테스트 실행(Playwright, axe-core) |

## 개인정보

Argmax는 개인정보를 수집하지 않습니다. 계정, 쿠키, 분석 도구, 추적 기술이 없습니다. 목록과 선택한 언어는 브라우저의 로컬 저장소에만 저장되며 어디로도 전송되지 않습니다. 호스팅 업체인 Cloudflare는 사이트를 제공하고 보호하기 위해 IP 주소 같은 기술적인 요청 정보를 처리합니다.

## 문의와 보안

문의, 버그 제보, 요청은 [GitHub 이슈](https://github.com/dev1f965x/argmax/issues)로 남겨 주세요. 보안 문제는 [SECURITY.md](SECURITY.md)에 안내된 방법으로 비공개 제보해 주세요.

## 라이선스

[MIT](LICENSE). 서드파티 라이선스는 빌드할 때마다 생성되는 `third-party-notices.txt`에 있으며, 앱 하단에서 볼 수 있습니다.
