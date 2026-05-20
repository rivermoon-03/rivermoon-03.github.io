# 문제 1 — 최적 이진 탐색 트리(OBST) 페이지 디자인

작성일: 2026-05-20

## 1. 목적

알고리즘 초보(이진 탐색 트리·동적 계획법 모두 처음인 사람)부터 따라올 수 있는 OBST 인터랙티브 학습 페이지. 본인 학습용 + 공유용 형식 혼합. 노트북 스타일 셀 9개로 구성하고, 핵심 W·C·R 테이블 채우기를 사용자 조작으로 단계별 시각화한다.

## 2. 산출물

- `problem_1.html` — 콘텐츠 + 셀 마크업
- `problems/problem_1/obst.js` — DP 계산 + 단계 기록 + 트리 구성
- `problems/problem_1/obst-ui.js` — D3 트리, 테이블 렌더링, 컨트롤 핸들러
- 공통: `assets/base.css`, `assets/notebook.css`, `assets/notebook.js`
- 진입점: `index.html` (문제 1~5 허브)

## 3. 비기능 요구

- 라이트 모드 고정, 한국어(전문용어 영어 병기), 데스크톱 우선.
- 더블클릭으로 `file://` 열기 가능 — ES 모듈/번들러 없음, 일반 `<script>`.
- 외부 의존성은 CDN: D3 v7, KaTeX, Pretendard, JetBrains Mono.
- 페이지 로드 후 즉시 인터랙션 가능, 무거운 애니메이션 없음.

## 4. 셀 구성 (9개)

| # | 셀 제목 | 다루는 것 | 분량 |
|---|---|---|---|
| 0 | 이 페이지에서 뭘 할 거예요 | 최종 결과 미리보기 + "사전 지식 없어도 OK" | 반 화면 |
| 1 | 이진 탐색 트리(BST)란? | 노드/왼쪽<루트<오른쪽 규칙, 작은 BST에서 키 1개 찾는 애니메이션 | 반 화면 |
| 2 | 탐색 비용은 어떻게 셀까? | "루트에서 몇 번 비교"=비용. 자주 찾는 키는 위로 → 기대 비용 정의 | 반 화면 |
| 3 | 문제 정의 + 입력 데이터 | p_i, q_i 의미, 더미 노드, 과제 데이터 표 | 반 화면 |
| 4 | DP 워밍업: 피보나치 → OBST | fib 중복 호출 → 메모화 → OBST에 같은 아이디어 | 1 화면 |
| 5 | 점화식 유도 (W, C, R) | KaTeX 점화식, 의사코드, 코드 토글 | 1 화면 |
| 6 | 단계별 테이블 채우기 | Next/Prev/Reset/Skip, 칸마다 한 줄 설명 | 1.5 화면 |
| 7 | 최종 OBST 시각화 + 검색 데모 | D3 트리, 노드 클릭 = 검색 경로 하이라이트 | 1 화면 |
| 8 | 정리 | 총 기대 비용, O(n³), Knuth O(n²) 한 줄 | 반 화면 |

## 5. 데이터 모델

```js
// 입력 (고정값)
const P = [null, 0.04, 0.03, 0.05, 0.03, 0.15, 0.15, 0.05];
const Q = [0.15, 0.04, 0.04, 0.03, 0.05, 0.04, 0.10, 0.05];

// obst.js: buildOBST(P, Q) → 결과 객체
type Result = {
  n: number,
  W: number[][],   // (n+1) × (n+1)
  C: number[][],
  R: number[][],
  steps: Step[]
}

type Step =
  | { kind: 'W', i: number, j: number, value: number, reason: string }
  | { kind: 'C', i: number, j: number, value: number, bestK: number, reason: string }
```

- 페이지 로드 시 `buildOBST(P, Q)`를 1회 실행. 결과는 전역 변수 또는 IIFE 클로저에 보관.
- `steps[]`는 W·C·R 칸을 채워나가는 순서대로 push. W는 d=0..n 대각선 순, C는 d=1..n 대각선 순.
- 각 Step의 `reason`은 "i=2, j=5: k=4 일 때 최소 비용 0.87" 같은 한국어 한 줄.

## 6. 단계별 테이블 UI (셀 6)

- 화면 좌측: W 표, 중앙: C 표, 우측: R 표 (3-column grid). 데스크톱 전제.
- 표 헤더 i / j 라벨. 셀 안 텍스트는 비어있다가 step 적용 시 노란 펄스 1회 + 값 fade-in.
- 표 아래 컨트롤 바: `[← Prev] [Next →] [⟲ Reset] [⇥ Skip to end]` + 진행도 텍스트 `12 / 36`.
- 컨트롤 바 옆 사이드패널: 현재 step의 `reason` + 강조 위치.
- 키보드 단축키: `→` Next, `←` Prev, `R` Reset, `E` Skip — `notebook.js`가 등록.
- R 표에서 선택된 k는 굵게.

## 7. 트리 시각화 (셀 7)

- R 테이블로부터 재귀적으로 트리 구조 생성:
  ```
  buildTree(i, j):
    if i == j: return { dummy: i }
    k = R[i][j]
    return { key: k, left: buildTree(i, k-1), right: buildTree(k, j) }
  ```
- D3 v7 `d3.tree()` 레이아웃으로 좌표 계산 → SVG `<g>`/`<circle>`/`<rect>`/`<path>`.
- 키 노드 = 원 + 키 번호, 더미 노드 = 사각형 + 회색 + 인덱스.
- 노드 클릭 시 "이 키를 찾는 경로" 빨강 하이라이트 + 비교 횟수 표시.
- 트리 위에 총 기대 비용 `C[0][n] = …` 한 줄.

## 8. 공통 자산

### `assets/base.css`
- CSS 변수: `--bg`, `--card`, `--text`, `--text-muted`, `--accent`, `--pulse`, `--dummy`.
- Pretendard, JetBrains Mono `@import url(...)` 또는 `<link>`.
- reset + body 기본.

### `assets/notebook.css`
- 상단 스테퍼(`.stepper`): sticky, 9개 점, 현재/완료/미완료 상태.
- 셀 카드(`.cell`): 흰 배경 + 좌측 컬러 라인. variant: `.cell--concept`, `.cell--derivation`, `.cell--run`, `.cell--result`.
- 코드 블록 + 토글, 표 격자, 펄스 애니메이션 keyframe.

### `assets/notebook.js`
- 스테퍼 초기화: 셀 id 수집 → 점 생성, 스크롤 시 현재 활성 셀 표시 (IntersectionObserver).
- 키보드 단축키 등록 (Next/Prev/Reset/Skip은 현재 표시 중인 셀 6 컨트롤에 위임).
- 코드 접기/펴기 토글 helper.

## 9. 페이지 흐름 (problem_1.html)

```html
<head>
  CDN 링크: Pretendard, JetBrains Mono, D3, KaTeX
  <link href="assets/base.css">
  <link href="assets/notebook.css">
</head>
<body>
  <nav class="stepper"></nav>     <!-- notebook.js가 채움 -->
  <main>
    <section class="cell cell--concept" id="cell-0">...</section>
    <section class="cell cell--concept" id="cell-1">...</section>
    ...
    <section class="cell cell--run" id="cell-6">
      <div class="obst-tables">
        <table id="table-W"></table>
        <table id="table-C"></table>
        <table id="table-R"></table>
      </div>
      <div class="obst-controls">...</div>
      <div class="obst-narration"></div>
    </section>
    <section class="cell cell--result" id="cell-7">
      <svg id="obst-tree"></svg>
    </section>
    <section class="cell" id="cell-8">...</section>
  </main>

  <script src="assets/notebook.js"></script>
  <script src="problems/problem_1/obst.js"></script>
  <script src="problems/problem_1/obst-ui.js"></script>
</body>
```

## 10. 구현 순서

1. `assets/base.css`, `assets/notebook.css` 토큰·셀·표·스테퍼 기본 스타일.
2. `assets/notebook.js` 스테퍼·키보드·코드 토글.
3. `problems/problem_1/obst.js`의 `buildOBST` (W/C/R + steps).
4. `problem_1.html` 셀 0~5 콘텐츠 작성.
5. `problems/problem_1/obst-ui.js` — 셀 6 표 렌더링 + 컨트롤 + 사이드패널.
6. 셀 7 D3 트리 + 검색 경로 데모.
7. 셀 8 정리 + 점검.
8. `index.html` 문제 1~5 링크 허브 (1번만 활성, 나머지는 placeholder).

## 11. 비범위 (이 작업에서 안 함)

- 다크 모드, 모바일 반응형, 입력값 변경, p/q 슬라이더, 자동 재생, 비교 자료(다른 트리와의 차이).
- 문제 2~5 페이지 콘텐츠는 별도 작업. 이번엔 `problem_2~5.html`은 그대로 빈 파일로 둠.

## 12. 검증

- `buildOBST` 결과의 `C[0][7]`이 손계산 또는 알려진 OBST 결과와 일치하는지 콘솔 로그로 확인.
- W·C·R 표가 끝까지 채워지면 Skip 결과와 일치.
- D3 트리 구조가 R 테이블과 일치 (시각 검사).
