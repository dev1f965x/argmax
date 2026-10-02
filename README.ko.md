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

## 라이선스

[MIT](LICENSE)
