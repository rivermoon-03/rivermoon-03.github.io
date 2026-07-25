# 자체 블로그 엔진 + 테마 — 조사 및 설계

작성일: 2026-07-25
대상 사이트: https://rivermoon-03.github.io

---

## 1. 현황 조사

### 1.1 지금 뭘로 돌아가고 있나

**Jekyll + Chirpy 테마 (gem 설치 방식)** 입니다. 정확히는 `chirpy-starter` 템플릿에서 시작한 저장소입니다.

| 항목 | 값 |
|---|---|
| 엔진 | Jekyll (Ruby) |
| 테마 | `jekyll-theme-chirpy` ~> 7.4.1 (RubyGem) |
| 빌드/배포 | GitHub Actions (`.github/workflows/pages-deploy.yml`) |
| Ruby | 3.3 (CI에서만) |
| 마크다운 | kramdown |
| 하이라이팅 | Rouge (빌드 타임) |
| Pages 소스 | GitHub Actions (`configure-pages` → `upload-pages-artifact` → `deploy-pages`) |

**중요한 발견:** 배포가 이미 GitHub Actions 커스텀 워크플로 방식입니다. 레거시 "branch 소스 + GitHub이 Jekyll 빌드" 방식이 **아닙니다**. 즉 `_site` 결과물만 tar로 올리면 되므로, **빌드 도구는 완전히 자유**입니다. 이게 이 프로젝트의 가장 중요한 전제입니다.

### 1.2 저장소가 실제로 소유한 것 vs gem이 소유한 것

테마가 gem이라 저장소에 있는 파일은 "오버라이드" 몇 개뿐입니다. 나머지 레이아웃·스타일·JS는 전부 gem 안에 숨어 있어 손댈 수 없습니다. 이게 "시스템이 맘에 안 든다"의 구조적 원인입니다.

저장소가 실제로 가진 것 (전체 94 파일 중 테마 관련):

```
_config.yml                    # 사이트 설정 (대부분 Chirpy 전용 키)
_layouts/post.html             # post 레이아웃 통째로 복사 후 광고 include 1줄 추가
_includes/head/custom.html     # → adsense.html 로드
_includes/head/adsense.html    # AdSense 스크립트
_includes/adsense.html         # 재사용 광고 유닛
_includes/post-ad-top.html     # 포스트 상단 광고 (slot 9339273006)
_includes/post-ad-bottom.html
_includes/favicons.html        # 빈 파일 — 파비콘 끄려고 오버라이드
_data/contact.yml, share.yml   # Chirpy 데이터 파일 복사본
_plugins/posts-lastmod-hook.rb # git log로 last_modified_at 주입
assets/css/style.scss          # Pretendard 폰트 + 다크모드 블랙/옐로우 커스텀
_tabs/{about,archives,categories,tags}.md
index.html                     # layout: home 만 있는 껍데기
```

여기서 읽히는 것:
- **커스터마이징 의도는 이미 있음** — 블랙(#000) + 옐로우(#f5cb42) 다크 테마, Pretendard 폰트, 파비콘 제거.
- 하지만 **CSS 변수 오버라이드로만** 가능해서, `!important` 남발과 `.content img { filter: none !important }` 같은 땜빵이 생겼습니다. 레이아웃 구조 자체는 못 바꿉니다.
- `_layouts/post.html`은 광고 한 줄 넣으려고 200줄짜리 파일을 통째로 복사했습니다. 테마 업데이트 시 이게 그대로 뒤처집니다.

### 1.3 콘텐츠 인벤토리

포스트 **21개**, 4개 카테고리:

| 카테고리 | 개수 |
|---|---|
| 백준 | 14 |
| 리뷰 | 3 |
| 잡담 | 3 |
| 개발 | 1 |

프론트매터 스키마는 매우 단순하고 일관적입니다:

```yaml
title: "..."        # 문자열 (일부는 따옴표 없음)
date: "2026-03-20 17:27:37 +0900"   # 일부는 따옴표 있음/없음 혼재
categories: [백준]   # 항상 단일 원소
tags: [백준]         # 대부분 카테고리와 동일. 한 건은 tags: [.] (오타)
toc: true           # 대부분 있음
```

마크다운 문법 사용 실태 (마이그레이션 난이도 직결):

- 코드펜스: `python` 13, `c` 4, `Python` 3(대문자), `rooms` 1(오타 — 언어 아님)
- 수식(`$$`): **없음**
- Mermaid: **없음**
- kramdown IAL(`{: .prompt-tip }`): `_tabs/about.md`의 기본 플레이스홀더에만 존재. **포스트에는 없음**
- 인라인 HTML: 4개 파일에서 `<br>`, `<img>` 정도

**결론: 콘텐츠 마이그레이션 난이도는 낮습니다.** kramdown 고유 기능에 묶여 있지 않습니다. 다만 `Python`(대문자) 과 `rooms` 는 하이라이터가 언어를 못 찾을 때 죽지 않도록 fallback이 필요합니다.

### 1.4 반드시 보존해야 하는 URL 표면

라이브 sitemap 기준 총 46개 URL. 카테고리 폴더(`_posts/백준/...`)는 URL에 영향을 주지 않고, 오직 `permalink: /posts/:title/` 규칙만 적용됩니다.

```
/                                   홈 (10개씩 페이지네이션)
/page2/, /page3/                    페이지네이션 — 1이 아니라 2부터 시작
/posts/<slug>/                      포스트 21개
/categories/, /categories/<name>/   4개
/tags/, /tags/<name>/               5개 (수업, 잡담, 리뷰, 백준, 개발)
/archives/
/about/
/feed.xml, /sitemap.xml, /robots.txt
/alg_prj/**                         정적 서브프로젝트 (그대로 통과)
/team_prj_html/**                   정적 서브프로젝트 (그대로 통과)
```

**한글 슬러그가 URL의 다수를 차지합니다.** 예:
```
/posts/%EB%B0%B1%EC%A4%80-2745-%EC%A7%84%EB%B2%95-%EB%B3%80%ED%99%98/
= /posts/백준-2745-진법-변환/
```
Jekyll `:title`은 **파일명에서 날짜를 뗀 나머지를 slugify** 한 값입니다. `2026-02-22-백준-2745---진법-변환.md` → `백준-2745-진법-변환`. 연속 하이픈이 하나로 접히고, 한글은 보존됩니다. 이 slugify 규칙을 **정확히 재현**하지 않으면 21개 포스트 전부 404가 납니다.

### 1.5 정리 대상 (기술 부채)

- `.gitmodules`에 `assets/lib` 서브모듈이 선언돼 있지만 실제 gitlink가 없음 → 죽은 설정. 워크플로에서도 `submodules:` 가 주석 처리돼 있음.
- 로컬에 **Ruby가 설치돼 있지 않음** (`bundle` 명령 없음). 즉 지금 로컬 프리뷰가 불가능하고, CI에서만 빌드 결과를 확인할 수 있는 상태입니다.
- `.nojekyll` 이 루트에 있는데, Actions 배포에서는 무의미합니다 (아티팩트가 그대로 서빙됨). 있어도 해롭진 않음.
- `_tabs/about.md` 가 아직 템플릿 기본 문구 그대로입니다.
- `scripts/new-post.sh` 는 `_posts/` **루트**에 파일을 만드는데, 실제 포스트는 카테고리 하위 폴더에 정리돼 있어 스크립트와 관행이 어긋나 있습니다.

---

## 2. 제약 조건 (GitHub Pages)

조사 결과, 커스텀 엔진에 실질적으로 걸리는 제약은 생각보다 적습니다.

### 2.1 하드 제약

| 제약 | 내용 | 영향 |
|---|---|---|
| 정적 파일만 | 서버 사이드 실행 없음 | 검색·댓글은 클라이언트 사이드 or 외부 서비스 |
| 아티팩트 형식 | gzip tar 단일 파일, 심볼릭/하드 링크 불가 | 빌드 산출물에 심링크 금지 |
| 아티팩트 크기 | 공식 1GB (10분 배포 타임아웃), 절대 상한 10GB | 무관 (현재 수 MB) |
| 커스텀 404 | `/404.html` 만 인식 | 404 페이지를 직접 생성해야 함 |
| 디렉토리 인덱스 | `/foo/` → `/foo/index.html` | 트레일링 슬래시 URL이면 디렉토리+index.html로 출력 |
| 대소문자 | 서버가 대소문자 구분 | 슬러그 소문자 정규화 필요 |

### 2.2 제약이 **아닌** 것 (자유로운 부분)

- **빌드 언어/툴 자유** — Actions에서 빌드하므로 Ruby일 필요가 전혀 없습니다.
- `github-pages` gem의 플러그인 화이트리스트 — **적용 안 됨**. 레거시 방식에만 해당.
- 빌드 시간 — Actions job 한도(6시간) 안이면 됨. 포스트 21개면 수 초.

### 2.3 외부 의존 요구사항

- **Google AdSense**: `ads.txt`가 루트에 서빙되어야 하고, `pub-7686749566506134` 스크립트가 모든 페이지 `<head>`에 있어야 합니다. 포스트 상단 광고 slot `9339273006`. 새 엔진에서 반드시 유지.
- **SEO**: 기존 URL 유지가 최우선. 추가로 `sitemap.xml`, `robots.txt`, canonical, Open Graph, JSON-LD.
- **RSS**: `/feed.xml` (Chirpy는 Atom 형식).

---

## 3. 요구사항

### 3.1 기능 요구사항 (F)

우선순위: **P0** = 이게 없으면 전환 불가 / **P1** = 현행 대비 후퇴 / **P2** = 있으면 좋음

#### 콘텐츠 & 라우팅

| ID | 요구사항 | 우선 |
|---|---|---|
| F-01 | `_posts/**/*.md` 를 재귀적으로 수집 (카테고리 하위 폴더 유지) | P0 |
| F-02 | YAML 프론트매터 파싱: title, date, categories, tags, toc, pin, image, description | P0 |
| F-03 | **Jekyll 호환 slugify**로 `/posts/:title/` 생성 — 한글 보존, 기존 21개 URL 100% 일치 | P0 |
| F-04 | 홈 페이지네이션 10개/페이지, `/page2/` 부터 (`/page1/` 없음) | P0 |
| F-05 | `/categories/`, `/categories/<name>/` 생성 | P0 |
| F-06 | `/tags/`, `/tags/<name>/` 생성 | P0 |
| F-07 | `/archives/` — 연/월 그룹핑 | P0 |
| F-08 | `_tabs/*.md` → 커스텀 페이지 (`/about/` 등) | P0 |
| F-09 | `alg_prj/`, `team_prj_html/`, `assets/images/` 등 정적 자산 **무변환 통과** | P0 |
| F-10 | `ads.txt`, `.nojekyll`, `CNAME` 등 루트 패스스루 | P0 |
| F-11 | 고정글(pin) 지원 — 홈 상단 고정 | P2 |
| F-12 | 초안(`_drafts/`) — dev에서만 렌더 | P2 |
| F-13 | 시리즈/연재 그룹 (테커 회고 P1~P3 같은 케이스) | P2 |

#### 마크다운 렌더링

| ID | 요구사항 | 우선 |
|---|---|---|
| F-20 | GFM: 표, 취소선, 태스크리스트, 자동링크 | P0 |
| F-21 | 코드 하이라이팅 — python/c 필수, **미지원 언어에서 죽지 않기** (`rooms` 케이스) | P0 |
| F-22 | 인라인 HTML 통과 (`<br>`, `<img>`) | P0 |
| F-23 | 헤딩 자동 앵커 id + TOC 추출 | P0 |
| F-24 | 각주 | P1 |
| F-25 | 이미지: 지연 로딩, width/height 자동 주입(CLS 방지), 캡션 | P1 |
| F-26 | 코드 블록 복사 버튼 + 언어 라벨 | P1 |
| F-27 | 콜아웃/프롬프트 블록 (`> [!NOTE]` GFM alert 문법 권장) | P2 |
| F-28 | Mermaid 다이어그램 | P2 |
| F-29 | 수식 (KaTeX) | P2 |
| F-30 | 읽는 시간 계산 — **한글 기준** (영어 단어 수 기준이면 부정확) | P1 |

#### 사이트 기능

| ID | 요구사항 | 우선 |
|---|---|---|
| F-40 | 다크/라이트 토글 + 시스템 설정 추종, FOUC 없음 | P0 |
| F-41 | AdSense — head 스크립트 + 포스트 상단 슬롯 | P0 |
| F-42 | `sitemap.xml`, `robots.txt`, `/feed.xml` (Atom) | P0 |
| F-43 | `/404.html` | P0 |
| F-44 | SEO 메타: canonical, OG, Twitter Card, JSON-LD BlogPosting | P1 |
| F-45 | **한글 대응 클라이언트 검색** (아래 4.5 참고) | P1 |
| F-46 | 댓글 (giscus 권장 — GitHub Discussions 기반, 무료, 다크모드 연동) | P1 |
| F-47 | 관련 글 / 이전·다음 글 | P1 |
| F-48 | 공유 버튼 | P2 |
| F-49 | PWA / 오프라인 캐시 | P2 |
| F-50 | 조회수 (goatcounter 등) | P2 |

### 3.2 비기능 요구사항 (NF)

| ID | 요구사항 | 목표치 |
|---|---|---|
| NF-01 | **로컬 개발 가능** — Ruby 없이. 현재 최대 불편 | `npm i && npm run dev` |
| NF-02 | 개발 서버 핫리로드 | 파일 저장 → 1초 내 반영 |
| NF-03 | 빌드 시간 | 포스트 100개 기준 < 10초 |
| NF-04 | Lighthouse | 성능/접근성/SEO 각 95+ |
| NF-05 | 클라이언트 JS 총량 | < 30KB gzip (검색 인덱스 제외) |
| NF-06 | 빌드 결정성 | 같은 입력 → 같은 출력 (diff 검증 가능) |
| NF-07 | 링크 검증 | 빌드 시 내부 링크 깨짐 감지 (현행 html-proofer 대체) |
| NF-08 | 접근성 | 키보드 내비게이션, 랜드마크, 대비 4.5:1 |
| NF-09 | 테마 교체 가능성 | 엔진 코드 수정 없이 테마 디렉토리만 교체 |
| NF-10 | 의존성 최소화 | 직접 의존 10개 내외 |

### 3.3 마이그레이션 요구사항 (M)

| ID | 요구사항 |
|---|---|
| M-01 | **URL 회귀 테스트**: 기존 sitemap 46개 URL이 새 빌드 산출물에 전부 존재하는지 자동 검증 |
| M-02 | 포스트 원본(`.md`) 무수정 원칙 — 프론트매터 변환이 필요하면 일회성 마이그레이션 스크립트로 |
| M-03 | 롤백 가능 — 기존 Jekyll 설정을 브랜치에 보존, 워크플로만 되돌리면 복구 |
| M-04 | 점진 전환 — 새 엔진 산출물을 PR 프리뷰로 먼저 육안 확인 후 스위치 |
| M-05 | `last_modified_at` git 히스토리 기반 주입 로직 이식 (`_plugins/posts-lastmod-hook.rb`) |

---

## 4. 설계

### 4.1 아키텍처 개요

**핵심 원칙: 엔진과 테마의 완전 분리.** Chirpy에서 겪은 문제(레이아웃 하나 고치려고 200줄 복사)의 근본 원인이 이거였습니다.

```
┌─────────────────────────────────────────────────────┐
│  content/          (사용자 데이터 — 엔진이 모르는 영역)  │
│  _posts/, _tabs/, assets/, alg_prj/, site.config.js │
└──────────────────────┬──────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│  engine/           (@blog/core — 재사용 가능)         │
│                                                     │
│  1. load    파일 수집 → 프론트매터 파싱               │
│  2. model   Site 객체 구축 (posts/categories/tags)   │
│  3. render  markdown → HTML (unified 파이프라인)     │
│  4. route   URL 결정 (Jekyll 호환 slugify)           │
│  5. emit    테마 템플릿 호출 → _site/ 출력            │
│  6. assets  CSS/JS 번들, 정적 파일 복사               │
│  7. meta    sitemap / feed / robots / search-index   │
└──────────────────────┬──────────────────────────────┘
                       ↓ (테마 계약 인터페이스)
┌─────────────────────────────────────────────────────┐
│  theme/            (교체 가능 — 여기가 디자인 작업 영역) │
│  templates/  layouts/  styles/  scripts/            │
└──────────────────────┬──────────────────────────────┘
                       ↓
                    _site/  →  GitHub Actions  →  Pages
```

### 4.2 데이터 모델

엔진이 테마에 넘기는 계약. 이게 안정적이면 테마를 몇 번이든 다시 만들 수 있습니다.

```ts
Site {
  config: SiteConfig          // site.config.js 전체
  posts: Post[]               // 최신순 정렬
  pages: Page[]               // _tabs/ 유래
  categories: Taxonomy[]
  tags: Taxonomy[]
  archives: { year, months: { month, posts }[] }[]
  buildTime: Date
}

Post {
  // 식별
  slug: string                // "백준-2745-진법-변환"
  url: string                 // "/posts/백준-2745-진법-변환/"
  sourcePath: string          // "_posts/백준/2026-02-22-....md"

  // 프론트매터
  title, description?, date, lastModified?
  categories: string[], tags: string[]
  pin: boolean, toc: boolean, image?: { path, alt, lqip? }

  // 렌더 결과
  html: string
  excerpt: string             // 첫 문단 (한글 기준 요약)
  toc: TocNode[]              // { depth, id, text, children }
  readingTime: number         // 분 (한글 350자/분 + 영어 200단어/분 혼합 계산)
  wordCount: number

  // 관계
  prev?: PostRef, next?: PostRef
  related: PostRef[]          // 카테고리/태그 겹침 점수 기준
}

Taxonomy { name, slug, url, posts: PostRef[], count }
```

### 4.3 라우팅 — 가장 위험한 부분

**Jekyll slugify 재현이 F-03의 핵심이고, 여기서 틀리면 SEO가 통째로 날아갑니다.**

Jekyll의 기본 `slugify` (mode: `default`) 규칙:
1. 파일명에서 `YYYY-MM-DD-` 접두사 제거
2. 확장자 제거
3. 소문자 변환
4. **ASCII 영숫자·하이픈이 아닌 문자**를 하이픈으로 치환 — 단 유니코드 문자(한글)는 **보존**
5. 연속 하이픈 → 하나로 축약
6. 앞뒤 하이픈 제거

검증 케이스 (실제 라이브 URL과 대조 완료):

| 파일명 | 기대 슬러그 |
|---|---|
| `2026-02-22-백준-2745---진법-변환.md` | `백준-2745-진법-변환` |
| `2026-03-20-Path-Paramater-Query-Parameter의-차이.md` | `Path-Paramater-Query-Parameter의-차이` ← **대소문자 보존됨!** |
| `2026-03-05-코드만-10831번---공-바꾸기.md` | `코드만-10831번-공-바꾸기` |
| `2026-02-04-baekjoon-2566.md` | `baekjoon-2566` |

주의: `Path-Paramater-...` 케이스에서 **대문자가 살아 있습니다.** Jekyll의 `:title` 플레이스홀더는 slugify를 거치지만 lowercase는 적용하지 않는 경로가 있습니다. → **구현 전에 21개 전부에 대해 실제 URL과 1:1 대조하는 픽스처 테스트를 먼저 작성**하고, 추측이 아니라 관측된 동작에 맞춥니다.

출력 형태: `/posts/<slug>/` → `_site/posts/<slug>/index.html` (디렉토리 + index.html).

### 4.4 마크다운 파이프라인

**선택: unified / remark / rehype.**

조사 결과 remark(unified)가 AST 기반이라 커스텀 변환(이미지 크기 주입, 헤딩 앵커, TOC 추출, 콜아웃)을 플러그인으로 깔끔하게 붙일 수 있습니다. markdown-it이 더 빠르고 다운로드 수는 많지만, 우리가 필요한 건 속도가 아니라 **AST 조작**입니다 (포스트 21개에 속도는 무의미).

```
remark-parse
  → remark-gfm            표/취소선/태스크리스트/자동링크 (F-20)
  → remark-frontmatter    프론트매터 분리
  → [custom] callouts     > [!NOTE] → 콜아웃 (F-27)
  → remark-rehype         (allowDangerousHtml: true — F-22 인라인 HTML)
  → rehype-raw            원시 HTML 파싱
  → rehype-slug           헤딩 id (F-23)
  → [custom] toc-extract  TOC 트리 수집
  → [custom] image-meta   로컬 이미지 실제 크기 읽어 width/height 주입 (F-25, CLS 방지)
  → rehype-shiki          코드 하이라이팅 (F-21)
  → [custom] code-wrap    복사 버튼 + 언어 라벨 (F-26)
  → rehype-stringify
```

**하이라이팅: Shiki.** 빌드 타임에 인라인 스타일로 완성된 HTML을 뱉으므로 **클라이언트 JS 0KB** (NF-05에 직접 기여). VS Code와 동일한 TextMate 문법이라 정확도도 최고. Rouge에서 옮겨오는 것도 자연스럽습니다.

단, 두 가지 방어가 필수:
- **미지원 언어 fallback** — `rooms` 같은 값에서 throw하지 말고 plaintext로 (F-21)
- **언어 별칭 정규화** — `Python` → `python`
- 다크/라이트 양쪽: Shiki `dual themes` 로 CSS 변수 기반 출력 (F-40 토글과 연동)

로드 언어를 python/c/js/ts/bash/json/yaml/html/css 정도로 제한하면 빌드도 빠릅니다.

### 4.5 검색 설계 (F-45) — 한글 문제

조사에서 가장 중요한 발견: **일반 검색 라이브러리는 영어 중심이라 한글에서 제대로 안 됩니다.** 기본 토크나이저가 공백/구두점으로 자르는데, 한국어는 교착어라 "백준을", "백준에서", "백준의"가 전부 다른 토큰이 됩니다.

세 가지 선택지:

| 방식 | 장점 | 단점 |
|---|---|---|
| **A. 문자 n-gram (bigram) 색인** | 형태소 분석기 불필요, 한글에서 잘 동작, 순수 JS | 인덱스 크기 증가 (2~3배) |
| B. Fuse.js 퍼지 매칭 | 구현 간단, 인덱스 불필요 | 문서 수 늘면 느려짐, 랭킹 품질 낮음 |
| C. FlexSearch + 커스텀 tokenizer | 가장 빠름 | 설정 복잡, 한글 튜닝 직접 |

**권장: A — bigram 색인 + MiniSearch.** MiniSearch는 커스텀 `tokenize` 함수를 받으므로, 한글 구간은 bigram으로, ASCII 구간은 단어로 자르는 하이브리드 토크나이저를 넣으면 됩니다.

```js
// 한글은 2-gram, 영문/숫자는 단어 단위
function tokenizeKo(text) {
  const tokens = []
  for (const chunk of text.match(/[가-힣]+|[a-zA-Z0-9_]+/g) ?? []) {
    if (/[가-힣]/.test(chunk)) {
      tokens.push(chunk)                                  // 원형도 포함
      for (let i = 0; i < chunk.length - 1; i++)
        tokens.push(chunk.slice(i, i + 2))                // bigram
    } else {
      tokens.push(chunk.toLowerCase())
    }
  }
  return tokens
}
```

인덱스는 빌드 타임에 `/search-index.json` 으로 생성하고, 검색창을 처음 열 때 lazy fetch합니다 (초기 로딩에 영향 없음). 포스트 21개면 인덱스는 수십 KB 수준. 본문 전체 대신 제목+요약+헤딩만 색인하면 더 줄일 수 있습니다.

### 4.6 테마 계층 설계

Chirpy의 실패 지점을 정확히 뒤집는 게 목표입니다.

**원칙 1 — 템플릿은 JS 함수.** Liquid 같은 별도 템플릿 언어 대신 순수 함수 (또는 JSX/Preact SSR). 타입 추론, 에디터 자동완성, 디버깅이 전부 그냥 됩니다. 별도 문법 학습 없음.

```js
// theme/layouts/post.js
export default function PostLayout({ site, post }) {
  return base({ site, page: post, body: html`
    <article>
      ${postHeader({ post })}
      ${site.config.ads.enabled ? adSlot('top') : ''}
      <div class="content">${post.html}</div>
      ${postFooter({ post })}
    </article>
  `, aside: post.toc.length ? tocPanel({ toc: post.toc }) : null })
}
```

**원칙 2 — 슬롯/파셜 오버라이드.** 광고 하나 넣으려고 레이아웃을 통째로 복사하는 일이 없도록, 레이아웃에 명시적 훅을 둡니다:
```js
// site.config.js
slots: {
  'post:before-content': adSlot('9339273006'),
  'head:end': adsenseScript('ca-pub-7686749566506134'),
}
```

**원칙 3 — 디자인 토큰 단일 소스.** 색·간격·타이포를 `theme/tokens.js` 한 곳에서 정의하고 CSS 커스텀 프로퍼티로 방출. `!important` 가 필요 없어집니다.

```js
export const tokens = {
  color: {
    light: { bg: '#ffffff', fg: '#18181b', accent: '#...', ... },
    dark:  { bg: '#000000', fg: '#e0e0e0', accent: '#f5cb42', ... },  // 현재 취향 계승
  },
  font: { sans: "'Pretendard Variable', ...", mono: '...' },
  space: { ... }, radius: { ... },
}
```

**원칙 4 — CSS는 손으로.** Tailwind/Bootstrap 없이 CSS 커스텀 프로퍼티 + 최신 CSS(nesting, `:has`, container queries, `color-mix`)로 작성. Chirpy가 Bootstrap을 끌고 오면서 생긴 무게와 오버라이드 지옥을 처음부터 회피합니다. 총 CSS 15KB 이내 목표.

**폰트:** 현재 Pretendard를 jsDelivr CDN에서 로드 중입니다. → **셀프 호스팅 + dynamic subset** 으로 전환 권장 (렌더 블로킹 제거, CDN 장애 무관, `font-display: swap`).

### 4.7 디렉토리 구조 (제안)

```
.
├── site.config.js              # 사이트 설정 (기존 _config.yml 대체)
├── package.json
│
├── _posts/                     # 그대로 유지 ✅ 원본 무수정
├── _tabs/                      # 그대로 유지 ✅
├── assets/images/              # 그대로 유지 ✅
├── alg_prj/                    # 그대로 통과 ✅
├── team_prj_html/              # 그대로 통과 ✅
├── ads.txt                     # 그대로 통과 ✅
│
├── engine/
│   ├── index.js                # build(config) 진입점
│   ├── load.js                 # 파일 수집 + 프론트매터
│   ├── slug.js                 # ★ Jekyll 호환 slugify
│   ├── model.js                # Site 객체 구축
│   ├── markdown.js             # unified 파이프라인
│   ├── render.js               # 테마 호출 + 파일 방출
│   ├── assets.js               # CSS/JS 번들 + 정적 복사
│   ├── meta.js                 # sitemap / feed / robots
│   ├── search.js               # 검색 인덱스 생성
│   ├── dev.js                  # 개발 서버 + 핫리로드
│   └── __tests__/
│       ├── slug.test.js        # ★ 21개 실제 URL 픽스처
│       └── urls.test.js        # ★ sitemap 46개 회귀 검증
│
├── theme/
│   ├── tokens.js
│   ├── layouts/     home, post, page, archives, taxonomy, 404
│   ├── partials/    header, footer, toc, post-card, pagination, search, comments
│   ├── styles/      reset, base, typography, layout, code, components
│   └── scripts/     theme-toggle, search, toc-scroll, copy-code  (각각 독립 모듈)
│
├── docs/blog-engine/           # 이 문서 (빌드에서 제외)
└── .github/workflows/deploy.yml
```

### 4.8 빌드 & 배포

```yaml
- uses: actions/checkout@v4
  with: { fetch-depth: 0 }          # last_modified_at용 git 히스토리 (M-05)
- uses: actions/setup-node@v4
  with: { node-version: 24, cache: npm }
- run: npm ci
- run: npm run build                # → _site/
- run: npm run verify:urls          # ★ M-01 URL 회귀 검증 — 실패 시 배포 중단
- uses: actions/upload-pages-artifact@v3
- uses: actions/deploy-pages@v4
```

`verify:urls`가 이 설계의 안전벨트입니다. 기존 sitemap 46개 URL을 픽스처로 커밋해두고, 빌드 산출물에 해당 파일이 존재하는지 확인합니다. 하나라도 없으면 CI 실패 → **URL이 조용히 깨지는 사고가 구조적으로 불가능**해집니다.

### 4.9 기술 선택 요약

| 영역 | 선택 | 근거 |
|---|---|---|
| 런타임 | **Node.js 24+** | 로컬에 이미 Node 26 설치됨. Ruby는 미설치 (NF-01 직결) |
| 언어 | JS + JSDoc 타입 (또는 TS) | 빌드 스텝 최소화 |
| 마크다운 | **unified/remark/rehype** | AST 조작 필요 (TOC·이미지 메타·콜아웃) |
| 하이라이팅 | **Shiki** (dual theme) | 빌드 타임, 클라이언트 JS 0KB, VS Code 동일 정확도 |
| 템플릿 | 순수 JS 태그 템플릿 (또는 Preact SSR) | 별도 문법 없음, 디버깅 용이 |
| CSS | 순수 CSS + 커스텀 프로퍼티 | 프레임워크 무게/오버라이드 회피 |
| 검색 | **MiniSearch + 한글 bigram 토크나이저** | 한국어 검색 품질 (4.5) |
| 댓글 | **giscus** | GitHub Discussions 기반, 무료, 정적 사이트 친화 |
| 번들러 | esbuild | 속도, 설정 최소 |
| 테스트 | node:test (내장) | 의존성 추가 없음 |

---

## 5. 리스크

| 리스크 | 영향 | 완화 |
|---|---|---|
| **한글 슬러그 규칙 불일치** | 21개 포스트 전부 404 → SEO/AdSense 수익 손실 | 픽스처 테스트를 **구현보다 먼저** 작성. CI 게이트(M-01) |
| 페이지네이션 오프바이원 (`/page2/`부터) | `/page2/` 404 | 픽스처에 포함 |
| AdSense 정책 위반 (마크업 변경으로 광고 미표시) | 수익 중단 | head 스크립트와 slot ID를 그대로 이식, 전환 후 AdSense 콘솔 확인 |
| 직접 만든 엔진의 유지보수 부담 | 장기적으로 방치 | 엔진을 작게 유지(파일당 200줄 이내), 테스트로 방어 |
| 기능 누락 (검색/PWA/댓글) | 현행 대비 후퇴 | P0 먼저 전환 → P1 순차 추가. 3.1 표를 체크리스트로 |
| RSS 구독자 이탈 | 피드 URL/형식 변경 시 | `/feed.xml` 경로와 Atom 형식 유지 |

---

## 6. 단계별 로드맵

| 단계 | 내용 | 완료 기준 |
|---|---|---|
| **0. 안전망** | 기존 sitemap 46 URL 픽스처 커밋, `slug.test.js` 작성 | 테스트가 (아직 없는 구현에 대해) 실패 |
| **1. 엔진 코어** | load → slug → model → markdown → render 최소 경로 | 21개 포스트가 올바른 경로에 HTML로 출력 |
| **2. 라우트 완성** | 페이지네이션·카테고리·태그·아카이브·탭·404 | `verify:urls` 46/46 통과 |
| **3. 메타** | sitemap, feed, robots, SEO 태그, AdSense 슬롯 | 기존 산출물과 diff 비교 |
| **4. 테마 v1** | 토큰 → 레이아웃 → 컴포넌트, 다크/라이트 | 로컬 프리뷰에서 디자인 확정 |
| **5. 개발 경험** | dev 서버, 핫리로드, `new-post` 스크립트 개선 | `npm run dev` 로 즉시 작업 가능 |
| **6. 전환** | 워크플로 교체, 배포, 실 URL 검증 | 라이브 46 URL 200 응답 |
| **7. 부가 기능** | 검색, 댓글, 관련글, PWA | P1 항목 소진 |

---

## 7. 확정된 결정 (2026-07-25)

| 항목 | 결정 |
|---|---|
| **범위** | **전 단계 (P0 + 검색 + 댓글 + PWA)**. 단, 단계를 나눠 순차 진행 |
| **템플릿** | **순수 JS 태그 템플릿** (`html\`...\``). 의존성 0, 빌드 스텝 없음 |
| **디자인** | **전면 재설계**. 아래 참고 |

### 7.1 디자인 방향 — Chirpy에서 버릴 것

불만 사항이 특정 부분이 아니라 전반이므로, 부분 수정이 아니라 백지에서 다시 그립니다.

- **좌측 고정 사이드바 폐기.** Chirpy의 `사이드바 + 본문 + 우측 TOC` 3단 구조를 버립니다.
- **타이포그래피와 정보 밀도 재설계.** 읽는 경험이 1순위. 본문 폭·행간·계층 대비를 직접 잡습니다.
- **독자적 색·톤.** 현재의 블랙(#000) + 옐로우(#f5cb42)는 방향으로 참고하되, 토큰 시스템 위에서 다시 설계합니다.
- **코드블록 강화.** 포스트의 다수가 백준 풀이입니다. 코드가 1급 콘텐츠라는 전제로 복사 버튼·언어 라벨·가독성을 설계합니다.
- **틀에 박힌 레이아웃 탈피.** 포스트 목록/아카이브/카테고리를 블로그 템플릿 기본형이 아닌 형태로.

### 7.2 확정된 slugify 사양

Jekyll 소스(`lib/jekyll/utils.rb`, `lib/jekyll/drops/url_drop.rb`)로 검증 완료. `engine/slug.js`에 이식했고 `engine/__tests__/slug.test.js`가 라이브 URL 21개와 1:1 대조합니다.

```
permalink `:title`  =  Utils.slugify(rawSlug, mode: "pretty", cased: true)

  rawSlug          = 파일명에서 `YYYY-M-D-` 접두사와 확장자를 뗀 원본
  mode "pretty"    = /[^\p{M}\p{L}\p{Nd}._~!$&'()+,;=@]+/gu → "-"
  cased: true      = 대소문자 보존 (★ /posts/Path-Paramater-... 가 여기 의존)
  후처리           = 앞뒤 하이픈 1개 제거
```

카테고리·태그는 `mode: "default"` + 소문자(`/[^\p{M}\p{L}\p{Nd}]+/gu`)를 씁니다.

### 7.3 구현 결과 (2026-07-25 기준)

로드맵 0~7단계 구현 완료. 남은 것은 **배포(push)뿐**이며, 이는 사용자 판단에 맡긴다.

| 지표 | 목표 (NF) | 실측 |
|---|---|---|
| 빌드 시간 | < 10초 | **0.34초** (포스트 21개) |
| CSS | — | 26.9KB → **gzip 5.2KB** |
| 클라이언트 JS | < 30KB gzip | **gzip 5.0KB** |
| 검색 인덱스 | — | 7.4KB → **gzip 2.8KB** (첫 검색 시 지연 로딩) |
| 직접 의존성 | 10개 내외 | **11개** (unified 계열 8 + shiki 2 + yaml) |
| 로컬 개발 | Ruby 없이 | `npm run dev` — 재빌드 0.6초, 라이브리로드 |
| URL 보존 | 45/45 | **45/45** |
| 내부 링크 | 깨짐 0 | **628개 검사, 0** |
| 단위 테스트 | — | **46/46** |

구현 중 확정한 설계 판단 몇 가지:

- **번들러를 두지 않았다.** CSS는 정해진 순서로 이어붙이고, JS는 각 파일이 독립
  IIFE라 그냥 이어붙인다. 검색도 외부 라이브러리 없이 직접 구현했으므로
  esbuild/rollup이 할 일이 남지 않았다.
- **개발 서버는 빌드를 자식 프로세스에서 돌린다.** 같은 프로세스에서
  `import(...?v=stamp)` 로 캐시를 비우려 했으나, 쿼리는 진입 모듈에만 붙고 그
  안의 정적 import 는 캐시된 구버전을 계속 쓴다 (테마 레이아웃을 고쳐도
  반영되지 않음). 프로세스를 새로 띄우면 해결되고, 빌드가 터져도 서버가 산다.
- **메타 정보용 폰트를 따로 뒀다** (`--font-meta`). 폰트 폴백이 글자 단위로
  일어나는 성질을 이용해 라틴/숫자는 고정폭, 한글은 Pretendard 로 떨어지게 했다.
  메타 전체를 모노스페이스로 두면 "이전 글", "2026년 3월" 같은 한글이 강제로
  벌어져 흩어져 보인다.
- **본문 h1 을 렌더 단계에서 한 단계 내린다.** 글 상당수가 `# 코드 작성` 처럼
  h1 으로 본문을 시작해서 페이지에 h1 이 둘씩 생기고 그 제목들이 목차에서
  빠지고 있었다. 원본은 건드리지 않고 교정한다. rehype-slug 는 텍스트로 id 를
  만들므로 앵커는 유지된다. 결과: 목차가 생긴 글 18/21.
- **광고 슬롯을 `overflow: hidden` 으로 가뒀다.** 광고 iframe 폭은 우리가 정할
  수 없고, 삐져나오면 모바일에서 페이지 전체에 가로 스크롤이 생긴다.
- **PWA 아이콘은 SVG 한 장** (`sizes: "any"`). 래스터를 크기별로 커밋하면
  저장소만 무거워진다.

### 7.4 조사 중 발견한 기존 사이트 버그

`_posts/백준/2026-02-22-백준-2745---진법-변환.md` 의 `tags: [.]` 오타 때문에 slugify 결과가 빈 문자열이 되어, 라이브 sitemap에 `/tags/` 가 **두 번** 등장합니다 (46개 중 unique 45개). 현행 동작을 테스트에 기록해뒀고, 새 엔진은 빈 슬러그가 나오는 분류를 조용히 건너뜁니다 (`engine/model.js`). 원본 오타 수정은 사용자 판단에 맡깁니다.

## 8. 슬러그 영문화 (2026-07-25 결정)

### 8.1 무엇을 바꿨나

포스트 슬러그와 분류 URL을 전부 영문으로 통일했습니다. 그런데 이건 **1~7단계 내내
지켜온 "기존 URL 보존"을 정면으로 거스르는 변경**입니다. 색인된 주소 21개가 전부 바뀌니까요.

그래서 옛 주소를 지우는 대신 **리다이렉트 페이지로 남겼습니다.** 결과적으로
`verify:urls` 안전망은 그대로 유효합니다 — 라이브 URL 45개가 여전히 전부 응답합니다.

정적 호스팅에는 301 을 낼 서버가 없으므로 리다이렉트 페이지는 세 가지를 함께 담습니다:

| 수단 | 역할 |
|---|---|
| `<link rel="canonical">` | 검색엔진에 진짜 주소를 알린다. 링크 가치는 사실상 이게 넘긴다 |
| `<meta http-equiv="refresh">` | JS 가 꺼져 있어도 이동한다 |
| `location.replace()` | 즉시 이동하되 뒤로가기 히스토리를 더럽히지 않는다 |

추가로 `noindex, follow` 를 넣어 옛 주소 자체가 색인되지 않게 하고, sitemap 에서도 제외합니다.

> 구현 함정 하나: 리다이렉트 스크립트를 템플릿에 넣을 때 URL 문자열이 HTML 이스케이프되어
> `location.replace(&quot;...&quot;)` 가 나왔습니다. `<script>` 안은 원시 텍스트라 엔티티가
> 디코딩되지 않으므로 그대로 JS 문법 오류가 됩니다. 빌드는 성공하고 페이지도 200 이라
> 조용히 깨지는 부류입니다 — 산출물의 스크립트를 실제로 파싱해 확인했습니다.

### 8.2 슬러그 대응표

| 옛 주소 | 새 주소 |
|---|---|
| `/posts/Path-Paramater-Query-Parameter의-차이/` | `/posts/path-parameter-vs-query-parameter/` |
| `/posts/post-2-techeer/` | `/posts/techeer-bootcamp-retrospective-1/` |
| `/posts/post-3-techeer/` | `/posts/techeer-bootcamp-retrospective-2/` |
| `/posts/post-4-techeer/` | `/posts/techeer-bootcamp-retrospective-3/` |
| `/posts/baekjoon-2566/` | `/posts/baekjoon-2566-max-value/` |
| `/posts/baekjoon-2738/` | `/posts/baekjoon-2738-matrix-addition/` |
| `/posts/백준-2745-진법-변환/` | `/posts/baekjoon-2745-base-conversion/` |
| `/posts/백준-2292-벌집/` | `/posts/baekjoon-2292-beehive/` |
| `/posts/2231-분해합/` | `/posts/baekjoon-2231-decomposition-sum/` |
| `/posts/2869-달팽이는-올라가고-싶다/` | `/posts/baekjoon-2869-snail-climbing/` |
| `/posts/코드만-10831번-공-바꾸기/` | `/posts/baekjoon-10831-swap-balls/` |
| `/posts/19532번-수학은-비대면강의입니다/` | `/posts/baekjoon-19532-linear-equations/` |
| `/posts/30802번-웰컴-키트-python/` | `/posts/baekjoon-30802-welcome-kit/` |
| `/posts/백준-15829번-hashing-python/` | `/posts/baekjoon-15829-hashing/` |
| `/posts/백준-1259번-팰린드롬수-python/` | `/posts/baekjoon-1259-palindrome/` |
| `/posts/백준-11723-집합-java/` | `/posts/baekjoon-11723-set/` |
| `/posts/백준-1129-소수-구하기/` | `/posts/baekjoon-1129-prime-numbers/` |
| `/posts/백준-11866-요세푸스-문제-0-python/` | `/posts/baekjoon-11866-josephus/` |
| `/posts/네트워크-프로그래밍-소켓-만들고-tcp-통신하기-1/` | `/posts/network-programming-socket-tcp-1/` |
| `/posts/hello-world/`, `/posts/whos-ram/` | 그대로 (이미 영문) |

분류는 화면 이름은 한글, 주소만 영문입니다 (`site.config.js` 의 `taxonomySlugs`):

```
백준 → baekjoon   리뷰 → review   잡담 → talk   개발 → dev   수업 → class
```

명명 규칙: 백준 문제는 `baekjoon-<번호>-<영문 문제명>`, 나머지는 내용을 설명하는 kebab-case.
번호를 앞에 두면 목록에서 정렬·검색이 쉽고, 문제명이 붙어 있어 주소만 봐도 무슨 글인지 압니다.

### 8.3 앞으로 슬러그를 바꿀 때

1. 파일명을 바꾼다.
2. 그 글의 front matter 에 `redirect_from:` 으로 **옛 주소를 반드시 남긴다**.
3. `npm test` — 라이브 URL 회귀 + ASCII 슬러그 규칙이 검사된다.
4. `npm run verify:urls` / `verify:links`.

테스트의 불변식이 이번에 바뀌었습니다:

- (전) 모든 글의 주소가 라이브 sitemap 에 있어야 한다
- (후) **라이브의 모든 주소가 "지금 글의 주소"이거나 "리다이렉트로 덮여" 있어야 한다**

지켜야 할 건 "글이 그 주소에 있다"가 아니라 "그 주소로 들어온 사람이 길을 잃지 않는다"입니다.
`engine/__tests__/slug.test.js` 가 리다이렉트 출발지와 현재 글 주소의 충돌, 슬러그 중복,
한글 슬러그 재유입까지 함께 막습니다.

---

## 9. macOS 디자인 패스 (2026-07-25)

### 9.1 조사한 것

Apple 의 Figma 파일이나 이미지 에셋을 그대로 가져오지 않았습니다. 공개된 자료로
**디자인 언어를 파악한 뒤 컴포넌트는 직접 구현**했습니다.

macOS 26 "Tahoe" 가 Liquid Glass 를 도입했고, 2026 업데이트에서 상당 부분이 조정됐습니다.
초기 발표본이 아니라 **조정된 쪽**을 따라간 이유는 조정 내용이 대부분 가독성 문제의 수정이기 때문입니다.

| 2026 업데이트에서 바뀐 것 | 우리 구현에 반영한 방식 |
|---|---|
| 사이드바가 floating → **edge-to-edge**, 불필요한 그림자 제거 | 붙어 있는 유리(헤더)는 바깥 그림자 없이 경계선 1px 로만 분리 (`.glass--bar`) |
| 모서리가 **덜 둥글게** | `--radius` 9px 기준의 절제된 계단. 중첩 시 안쪽이 더 작은 동심 구조 |
| **어두운 가장자리 + 밝은 스페큘러**로 깊이 확보 | `inset 0 1px 0 highlight` + `inset 0 -1px 0 edge` 두 줄이 이 역할 |
| 툴바 높이 통일로 가독성 향상 | `--toolbar-height` 토큰 하나로 전 페이지 고정 |
| **반투명도 사용자 조절 슬라이더** 추가 | `prefers-reduced-transparency` 를 존중해 유리를 불투명 판으로 전환 |

마지막 항목이 장식이 아니라 필수인 이유: 반투명 위의 글자는 뒤에 무엇이 오느냐에 따라
대비가 매번 달라집니다. 밝은 이미지 위에서는 4.5:1 이 그냥 무너집니다. Apple 도 베타를
거치며 불투명도를 계속 올렸고 결국 사용자 조절 슬라이더를 넣었습니다.

### 9.2 구현한 것

**레이아웃 — 사이드바는 만들었다가 걷어냈습니다.**

한 번 macOS 소스 리스트 형태의 사이드바(색 아이콘, 접기, 모바일 서랍)를 구현했지만,
써 보고 되돌렸습니다. 지금은 가로 헤더 하나입니다.

```
┌────────────────────────────────────────┐
│  헤더 (유리, 고정 높이, sticky)          │
├──────────────────────────┬─────────────┤
│  본문                     │ 인스펙터(목차) │
├──────────────────────────┴─────────────┤
│  푸터                                   │
└────────────────────────────────────────┘
```

**macOS 에서 가져온 것은 형태가 아니라 재질과 반응입니다.** 사이드바라는 형태를
빼도 유리·모션·컨트롤 반응은 그대로 남습니다 — 실제로 그렇게 정리했습니다.

본문 폭은 헤더보다 좁게(52rem) 잡되 **가운데가 아니라 왼쪽 정렬**입니다. 가운데로
몰면 헤더 로고와 본문 시작점이 어긋나 흐트러져 보이고, 목록에서 날짜가 제목에서
지나치게 멀어집니다.

**Liquid Glass 재질** (`theme/styles/glass.css`) — Apple 이 말하는 세 겹을 CSS 세 겹에 대응:

```
조명(illumination)   → 반투명 틴트 + backdrop-filter: blur + saturate
하이라이트(highlight) → 상단 inset 하이라이트 + 포인터 추적 스페큘러
그림자(shadow)        → 하단 inset 어두운 테두리 + 바깥 그림자
```

진짜 굴절(refraction)은 SVG 변위 필터나 WebGL 이 필요합니다. 스크롤할 때마다 배경을
다시 샘플링해야 해서 저사양 기기에서 프레임이 떨어지고, 글을 읽는 게 목적인 블로그에
줄 이득이 없어 포기했습니다. 실제로 화면에서 "유리처럼" 보이게 하는 건 대부분
가장자리 처리이지 굴절이 아닙니다.

**포인터 추적 스페큘러는 다크 모드 전용입니다.** 흰 하이라이트를 밝은 종이색 위에
얹으면 빛이 아니라 얼룩으로 보입니다. CSS 가 라이트에서 숨기고, JS 도 그릴 필요가
없는 상태면 `pointermove` 처리를 건너뜁니다 (초당 수백 번 들어오는 이벤트라 rAF 로
프레임당 한 번만 반영).

**모션** (`theme/styles/motion.css`, `theme/scripts/motion.js`) — 규칙 세 가지로 굴립니다.

1. **짧고 정확하게.** Apple 이 반복하는 말이 "간결함 + 정확함"입니다. 본문 등장 220ms,
   목록 항목 260ms, 계단식 지연은 30ms씩 **6번째에서 멈춥니다**. 지연이 누적되면
   긴 목록의 마지막 항목이 눈에 띄게 늦어져 "굼뜨다"로 바뀝니다.
2. **`transform` 과 `opacity` 만.** 이 둘은 컴포지터에서 처리되어 레이아웃·페인트를
   다시 돌리지 않습니다. width·top·margin 을 움직이면 매 프레임 레이아웃이 재계산되어
   저사양 기기에서 바로 끊깁니다.
3. **이동은 `--motion-rise` 변수를 통해서만.** Reduce Motion 에서 이 값을 0 으로
   만들면 모든 "떠오르기"가 자동으로 "디졸브"가 됩니다.

3번이 접근성 장치입니다. 흔히 쓰는 `animation-duration: 0.01ms !important` 전면 차단은
**쓰지 않습니다**. Apple 지침은 애니메이션을 지우기보다 이동을 디졸브로 바꾸라고
합니다 — 상태가 바뀌었다는 사실까지 같이 사라지면 안 되기 때문입니다.

들어간 것: 본문·목록 계단식 등장, 스크롤 등장, 페이지 전환(View Transitions),
테마 아이콘 회전 교체, 복사 버튼 팝, 검색 결과 계단식, 목차 활성 표시 미끄러짐,
컨트롤 누름 `scale(0.94)`.

**페이지 전환은 교차 문서 View Transitions** 로 처리합니다. Chrome 126+/Safari 18.2+
에서 동작하고 Firefox 는 진행 중이라, 지원하지 않는 브라우저는 규칙을 무시하고
평범하게 이동합니다 — 분기 없이 얹어두면 되는 점진적 향상입니다. 헤더에는
`view-transition-name` 을 붙여 전환에서 제외했습니다. 페이지가 바뀔 때 헤더까지
깜빡이면 "앱 안에서 화면이 바뀐다"가 아니라 "문서가 통째로 갈렸다"로 읽힙니다.
목록에서 누른 글의 제목은 다음 페이지 제목으로 이어집니다 (`motion.js` 가 클릭
직전에 이름을 붙였다 뗍니다 — 한 문서에 같은 이름이 둘 이상이면 전환이 취소됩니다).

**두 가지 안전장치**가 있습니다. 모션에서 가장 흔한 사고가 "콘텐츠가 안 보이는 것"이라서요.

- 스크롤 등장의 숨김 규칙은 `html.js-motion` 아래에만 있습니다. 이 클래스는 JS 가
  옵저버를 걸기 직전에 붙이므로, JS 가 꺼져 있거나 실패하면 아무것도 숨겨지지 않습니다.
- 등장 애니메이션의 fill-mode 는 `both` 가 아니라 **`backwards`** 입니다. `both` 는
  끝난 뒤에도 마지막 프레임을 붙잡는데, 창이 가려지거나 백그라운드 탭이면 브라우저가
  애니메이션 시작을 미루므로 그동안 콘텐츠가 계속 안 보입니다. 실제로 개발 중에
  이 상태(`playState: running`, `currentTime: 0`)를 관측했습니다.

**폰트** — macOS 가 SF Pro 하나로 UI 를 끌고 가고 SF Mono 는 코드에만 쓰는 방식을 따라
Pretendard 하나로 통일했습니다. 이전에는 메타 정보를 고정폭 폰트로 돌렸는데 한글이
강제로 벌어져 "이전 글", "2026년 3월"이 흩어져 보였습니다. 숫자 정렬은 폰트를 바꾸는
대신 `font-variant-numeric: tabular-nums` 로 해결합니다.

**색 토큰을 `light-dark()` 로 정리.** 예전에는 같은 변수 묶음을 `:root` /
`[data-theme='dark']` / `@media (prefers-color-scheme)` 세 곳에 복붙해야 했고 한 곳만
고치면 조용히 어긋났습니다. 이제 한 줄에 두 값을 적고 `color-scheme` 세 줄이 선택합니다.

### 9.3 편의 기능

블로그를 직접 돌아다니며 찾은 것들입니다.

| 기능 | 왜 |
|---|---|
| **읽기 진행률** | 헤더 아래 2px 선. 기준은 문서 전체가 아니라 **본문**이다 — 푸터·관련글까지 포함해 재면 글을 다 읽었는데 60%로 보인다 |
| **맨 위로** | 한 화면 넘게 내려갔을 때만 나타난다. 그 전에는 위가 이미 보여서 버튼이 방해다 |
| **헤딩 앵커** | 호버하면 `#`이 나타나고, 누르면 그 절의 주소가 클립보드에 들어간다. 이동은 막지 않는다 |
| **이미지 확대** | 스크린샷 글씨가 본문 폭에서는 안 읽힌다. `<dialog>` 라 Esc·포커스 가두기가 공짜 |
| **외부 링크 표시** | `↗` 표식 + `rel="noopener noreferrer"` |
| **코드 줄 번호** | CSS 카운터로. `user-select: none` 이라 복사할 때 번호가 안 딸려간다 |
| **키보드 단축키** | `g h` 홈, `g a` 아카이브 … `?` 도움말. Gmail·GitHub 관습이라 배우면 다른 데서도 통한다 |

### 9.4 돌아다니다 찾은 버그

- **소개 페이지에 kramdown 잔재.** `{: .filepath }`, `{: .prompt-tip }` 이 글자 그대로
  노출되고 있었습니다. Jekyll 문법이라 지금 파이프라인이 해석하지 못합니다.
  옛 글을 손대지 않아도 되도록 렌더 단계에서 걷어냅니다 — 단, `code`/`pre` 안은
  건드리지 않고 줄 끝/단독 줄에 있는 것만 지웁니다(kramdown 이 IAL 을 쓰는 위치).
- **발췌가 "문제 링크"만 나옴.** 여러 글이 링크 한 줄로 시작해서 목록에 그 링크
  텍스트만 떴습니다. 링크가 60% 이상을 차지하거나 너무 짧은 문단은 건너뛰고
  실제 문장이 있는 첫 문단을 찾도록 고쳤습니다.
- **검색을 열면 스크롤이 맨 위로 튐.** `.glass` 가 `position: relative` 를 갖고 있었고,
  이게 모달 `<dialog>` 의 UA 기본값 `position: fixed` 를 덮어써서 다이얼로그가 문서
  흐름 안으로 들어갔습니다. 검색을 닫으면 읽던 자리를 잃는 문제였습니다.
  `.glass` 에서 position 을 빼고, 그 자리에 재발 방지 주석을 남겼습니다.
- **개발 빌드와 배포 빌드가 같은 `_site` 를 공유.** 개발 서버를 띄워둔 채
  `npm run build` 를 한 번 돌리면 보고 있던 화면이 조용히 배포용(광고 포함)으로
  바뀌었습니다. 개발은 `.dev-site` 로 분리했습니다.

### 9.5 분류 목록의 발췌

카테고리·태그 페이지의 각 글 제목 아래에 본문 앞부분을 **두 줄까지** 붙였습니다.
이 블로그는 제목이 "2231 - 분해합"처럼 문제 번호 위주라 제목만으로는 내용을 알기
어렵습니다. 두 줄에서 자르는 이유는 그 이상이면 목록이 아니라 본문이 되기 때문입니다.

이를 위해 엔진의 `toRef()` (포스트를 목록용으로 축약하는 함수)에 `excerpt` 와
`readingTime` 을 추가했습니다. 없으면 테마가 목록을 그리다 말고 원본 포스트를
되찾아야 합니다.

---

## 10. 아직 남은 것 (사용자 결정 필요)

1. **배포.** 커밋·push 하지 않았습니다. push 하는 순간 라이브 사이트가 새 엔진으로 바뀝니다.
2. **giscus 댓글 설정.** `site.config.js` 의 `comments.giscus` 가 비어 있습니다.
   giscus.app 에서 저장소를 등록하고 `repo`/`repoId`/`category`/`categoryId` 를 채우면
   댓글 영역이 렌더됩니다. 비어 있는 동안에는 아무것도 표시되지 않습니다.
3. **Google Search Console 재색인 요청.** 리다이렉트가 있어도 검색엔진이 새 주소를
   반영하는 데 시간이 걸립니다. 배포 후 새 sitemap 을 제출하면 빨라집니다.
4. **본문 첫 h1 중복.** 여러 글이 포스트 제목과 거의 같은 문장으로 본문을 시작합니다
   (예: 제목 "백준 2566 - 최댓값" / 본문 첫 줄 "# 2566번 - 최댓값").
   엔진이 레벨은 교정했지만 문장 중복은 남아 있습니다. 원본 수정이 필요한 영역입니다.
5. **Pretendard 셀프 호스팅.** 지금은 jsDelivr 동적 서브셋 CDN 을 씁니다.
   렌더 블로킹과 외부 의존을 없애려면 폰트를 저장소에 넣어야 하는데, 그만한 무게를
   감수할지는 취향 문제입니다.

### 정리 완료 (2026-07-25)

- Jekyll 잔재 삭제: `Gemfile`, `_config.yml`, `_plugins/`, `_includes/`, `_layouts/`,
  `_data/`, `assets/css/`, 루트 `index.html`, `.devcontainer/`, `.gitmodules`(죽은 서브모듈),
  `scripts/*.sh`. `.vscode/` 의 Jekyll 태스크도 npm 기준으로 다시 썼습니다.
  모두 git 히스토리에 남아 있어 되돌릴 수 있습니다.
- `tags: [.]` 오타를 `tags: [백준]` 으로 수정. 라이브 sitemap 에 `/tags/` 가 두 번
  등장하던 문제가 사라집니다.
