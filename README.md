# RIVERMOON - Skits

<https://rivermoon-03.github.io>

자체 제작 정적 블로그 엔진과 테마로 돌아간다. Jekyll/Chirpy 에서 이전했다.
설계 배경과 요구사항은 [docs/blog-engine/00-research-and-design.md](docs/blog-engine/00-research-and-design.md) 참고.

## 빠르게 시작하기

```bash
npm install
npm run dev      # http://localhost:4321 — 저장하면 자동 새로고침
```

Ruby 는 필요 없다. Node 22 이상이면 된다.

## 명령어

| 명령 | 하는 일 |
|---|---|
| `npm run dev` | 개발 서버 + 라이브리로드. 초안(`_drafts/`)도 보이고 광고는 꺼진다 |
| `npm run build` | `_site/` 에 배포용 산출물 생성 |
| `npm test` | 엔진 단위 테스트 (slugify 회귀 포함) |
| `npm run verify:urls` | **기존 URL 45개가 살아있는지 검증** — 실패하면 배포 금지 |
| `npm run verify:links` | 산출물의 내부 링크 검사 (html-proofer 대체) |
| `npm run new -- 백준 "제목"` | 새 글 만들기 (카테고리 폴더에 생성, URL 미리보기) |

## 글 쓰기

```bash
npm run new -- 백준 "2751번 - 수 정렬하기 2"
```

`_posts/<카테고리>/YYYY-MM-DD-<제목>.md` 가 만들어진다.

> **파일명이 곧 영구 주소다.** `/posts/:title/` 의 `:title` 은 파일명에서 날짜를
> 뗀 부분으로 결정된다. 규칙은 `engine/slug.js` 에 있고 `engine/__tests__/slug.test.js` 가 지킨다.

**슬러그는 영문 kebab-case 로 쓴다.** 백준 문제는 `baekjoon-<번호>-<영문 문제명>`.
한글 파일명이 들어오면 테스트가 잡는다.

발행한 뒤 파일명을 바꿔야 한다면 **옛 주소를 반드시 남긴다**:

```yaml
redirect_from:
  - /posts/옛-주소/
```

엔진이 그 주소에 리다이렉트 페이지(canonical + meta refresh + `location.replace`)를 만든다.
이걸 빠뜨리면 기존 링크와 검색 유입이 그대로 죽는다.

카테고리·태그는 화면에는 한글, 주소는 영문으로 나간다. 새 분류를 만들면
`site.config.js` 의 `taxonomySlugs` 에 매핑을 추가한다.

프론트매터:

```yaml
---
title: "제목"
date: 2026-07-25 10:00:00 +0900
categories: [백준]      # 하나만 쓴다
tags: [백준]
toc: true               # 기본값 true
pin: false              # 홈 상단 고정
---
```

## 구조

```
_posts/          글 (카테고리별 하위 폴더)
_tabs/           고정 페이지 (소개/카테고리/태그/아카이브)
assets/images/   이미지
alg_prj/         알고리즘 과제 페이지 — 엔진이 건드리지 않고 그대로 배포
team_prj_html/   팀플 문서 페이지 — 위와 동일
site.config.js   사이트 설정 (Jekyll 의 _config.yml 을 대체)

engine/          블로그 엔진. 테마를 몰라도 되고, 테마도 엔진 내부를 몰라도 된다
theme/           디자인. layouts/ partials/ styles/ scripts/
```

엔진과 테마의 계약은 `theme/index.js` 가 내보내는 레이아웃 함수 목록과
`engine/model.js` 의 Site/Post 객체 모양이 전부다. 이 둘만 맞추면 테마를
통째로 갈아끼울 수 있다.

### 보기 설정

우상단 조절기 버튼에 테마(라이트·다크·시스템)와 본문 서체(명조·고딕)가 들어 있다.
선택은 `localStorage` 에 남고, `theme/layouts/base.js` 의 인라인 스크립트가 CSS 보다
먼저 읽어 적용한다 — 나중에 적용하면 화면이 번쩍이거나 글이 한 번 다시 흐른다.

기본은 **명조**(본명조 + Source Serif)다. 다만 명조는 **읽는 것에만** 쓴다.

| 무엇 | 서체 |
|---|---|
| 본문 · 글 제목 | 명조 |
| 헤더 · 배지 · 버튼 | Pretendard |
| 날짜 · 글자 수 · 코드 | 모노스페이스 |

셋을 섞는 게 목적이다. 서체가 다르면 무엇이 읽을 것이고 무엇이 누를 것인지가
읽기 전에 갈린다. 대상 목록은 `theme/styles/base.css` 한 곳에 모아 뒀다 —
컴포넌트마다 흩어 놓으면 새 화면을 만들 때 빠뜨리고, 같은 페이지에서 제목만
고딕인 글이 생긴다.

명조 파일은 Google Fonts 에서 온다. 고딕을 고른 독자에게도 링크는 걸리지만
받는 건 몇 KB 짜리 `@font-face` 선언뿐이고, 글꼴 파일은 그 글자가 실제로 명조로
그려질 때만 내려온다.

## 배포

`main` 에 push 하면 GitHub Actions 가 빌드해서 Pages 에 올린다
(`.github/workflows/deploy.yml`).

배포 전에 CI 가 순서대로 막아선다:

1. `npm test` — slugify 규칙 회귀
2. `npm run verify:urls` — 기존 라이브 URL 45개 전부 존재하는지
3. `npm run verify:links` — 내부 링크 깨짐

2번이 이 저장소에서 가장 중요한 검사다. 기준 목록(`engine/__fixtures__/live-urls.txt`)은
Jekyll 시절 라이브 sitemap 에서 뽑은 것이고, 슬러그를 영문으로 바꾼 지금은
**리다이렉트가 그 주소들을 덮고 있는지**를 확인한다. 하나라도 빠지면 색인된 글이
404가 되고 검색 유입과 AdSense 수익이 같이 사라진다.

## 라이선스

[MIT](LICENSE)
