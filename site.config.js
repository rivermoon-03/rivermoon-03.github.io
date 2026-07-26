/**
 * 사이트 설정. 기존 `_config.yml` 을 대체한다.
 *
 * Jekyll 시절과 달리 여기 있는 값은 전부 실제로 쓰인다.
 * 테마가 참조하는 값과 엔진이 참조하는 값을 분리해뒀다.
 */

export default {
  // ── 정체성 ────────────────────────────────────────────────
  title: 'RIVERMOON - Skits',
  tagline: '허접의 개발 일기',
  description: '허접 반, 개발 반',
  url: 'https://rivermoon-03.github.io',
  baseurl: '',
  lang: 'ko',
  timezone: 'Asia/Seoul',

  author: {
    name: 'rivermoon',
    email: 'broadlakeu@gmail.com',
    github: 'rivermoon-03',
    links: ['https://github.com/rivermoon-03'],
  },

  // ── 라우팅 ────────────────────────────────────────────────
  // 기존 URL을 그대로 유지한다. 손대면 SEO가 깨진다.
  permalinks: {
    post: '/posts/:title/',
    page: '/:title/',
    category: '/categories/:name/',
    tag: '/tags/:name/',
  },

  // 홈 페이지네이션. Jekyll 관행대로 1페이지는 `/`, 2페이지부터 `/pageN/`.
  pagination: {
    perPage: 10,
    firstPageUrl: '/',
    pageUrl: (n) => `/page${n}/`,
  },

  /**
   * 분류 이름(한글) → URL 조각(영문).
   *
   * 화면에 보이는 이름은 한글 그대로 두고 주소만 영문으로 만든다.
   * 여기 없는 이름은 이름 자체를 slugify 해서 쓴다.
   */
  taxonomySlugs: {
    백준: 'baekjoon',
    리뷰: 'review',
    잡담: 'talk',
    개발: 'dev',
    수업: 'class',
  },

  /**
   * 카테고리 설명. 홈 오른쪽 레일이 카테고리를 저장소 카드처럼 그릴 때 쓴다.
   *
   * 글에서 유추할 수 없는 유일한 값이라 여기 적는다. 없는 카테고리는 설명 줄만
   * 빠지고 나머지(글 수·갱신 날짜·색)는 그대로 나온다. 한 줄을 넘기지 않는 게 좋다.
   */
  categoryMeta: {
    백준: { description: '문제를 푼 과정. 틀린 시도와 그 이유까지.' },
    개발: { description: '공부하다 걸린 개념들.' },
    리뷰: { description: '부트캠프나 프로젝트를 끝내고 쓰는 회고.' },
    잡담: { description: '만든 것, 겪은 것.' },
    수업: { description: '수업에서 나온 것들.' },
  },

  /**
   * 옛 주소 → 새 주소. 리다이렉트 페이지가 생성된다.
   *
   * 포스트는 각 글의 front matter `redirect_from` 으로 관리하고, 여기에는
   * 분류처럼 글에 속하지 않는 주소만 적는다. Jekyll 시절 색인된 한글 주소들이라
   * 지우면 검색 유입이 그대로 끊긴다.
   */
  redirects: {
    '/categories/백준/': '/categories/baekjoon/',
    '/categories/리뷰/': '/categories/review/',
    '/categories/잡담/': '/categories/talk/',
    '/categories/개발/': '/categories/dev/',
    '/tags/백준/': '/tags/baekjoon/',
    '/tags/리뷰/': '/tags/review/',
    '/tags/잡담/': '/tags/talk/',
    '/tags/개발/': '/tags/dev/',
    '/tags/수업/': '/tags/class/',
  },

  // ── 콘텐츠 소스 ───────────────────────────────────────────
  content: {
    posts: '_posts',
    pages: '_tabs',
    drafts: '_drafts',
  },

  /**
   * 변환 없이 산출물로 그대로 복사할 경로.
   * 알고리즘 과제·팀플 페이지는 독립적인 정적 사이트라 엔진이 건드리면 안 된다.
   */
  passthrough: [
    'assets/images',
    'alg_prj',
    'team_prj_html',
    'ads.txt',
    '.nojekyll',
  ],

  outDir: '_site',
  // 개발 빌드 전용 디렉토리. `_site` 를 공유하면 배포 빌드를 한 번 돌리는 것만으로
  // 개발 서버가 보여주던 화면이 바뀌어 버린다 (광고 포함 여부 등이 달라진다).
  devOutDir: '.dev-site',

  // ── 마크다운 ──────────────────────────────────────────────
  markdown: {
    // Shiki 로 빌드 타임 하이라이팅. 클라이언트 JS 0KB.
    shiki: {
      themes: { light: 'github-light', dark: 'github-dark-default' },
      // 실제로 쓰이는 언어만 로드해서 빌드를 가볍게 유지한다.
      langs: ['python', 'c', 'java', 'javascript', 'typescript', 'bash', 'json', 'yaml', 'html', 'css', 'sql', 'diff'],
      // 언어 표기 오타 보정. `rooms`, `Python` 같은 값이 실제로 존재한다.
      aliases: { py: 'python', Python: 'python', 'c++': 'cpp', sh: 'bash', shell: 'bash' },
      fallbackLang: 'text',
    },
  },

  // ── 광고 ──────────────────────────────────────────────────
  // 기존 AdSense 설정을 그대로 이식. 변경하면 수익이 끊긴다.
  adsense: {
    enabled: true,
    client: 'ca-pub-7686749566506134',
    slots: { postTop: '9339273006' },
  },

  // ── 부가 기능 ─────────────────────────────────────────────
  feed: { path: '/feed.xml', limit: 20 },
  search: { indexPath: '/search-index.json' },
  comments: {
    provider: 'giscus',
    // giscus.app 에서 발급받은 값으로 채운다. 비어 있으면 댓글 영역이 렌더되지 않는다.
    giscus: {
      repo: '',
      repoId: '',
      category: '',
      categoryId: '',
      mapping: 'pathname',
      reactionsEnabled: '1',
    },
  },
  pwa: { enabled: true },
};
