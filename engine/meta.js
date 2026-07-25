/**
 * 부수 산출물 — sitemap, Atom 피드, robots.txt, PWA 매니페스트, 검색 인덱스.
 *
 * 피드 경로(`/feed.xml`)와 형식(Atom)은 기존 Jekyll 사이트와 동일하게 유지한다.
 * 구독자의 리더가 이미 이 URL을 물고 있다.
 */

import { escapeHtml } from './html.js';

/** XML 텍스트 노드용 이스케이프. */
const xml = (value) => escapeHtml(value ?? '');

/** 사이트 내 경로 → 절대 URL. */
function absolute(config, path) {
  return `${config.url}${config.baseurl}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * sitemap.xml.
 * 404 는 넣지 않는다. 나머지는 렌더된 라우트를 그대로 따라간다.
 *
 * @param {any} site
 * @param {{url: string}[]} routes
 */
export function renderSitemap(site, routes) {
  const { config } = site;
  const lastmodByUrl = new Map(
    site.posts.map((post) => [post.url, (post.lastModified ?? post.date).toISOString()])
  );

  const entries = routes
    // 404 와 리다이렉트는 색인 대상이 아니다. 리다이렉트 페이지는 noindex 이기도 하다.
    .filter((route) => route.url !== '/404.html' && !route.isRedirect)
    .map((route) => {
      const lastmod = lastmodByUrl.get(route.url);
      return [
        '  <url>',
        `    <loc>${xml(absolute(config, route.url))}</loc>`,
        lastmod ? `    <lastmod>${lastmod}</lastmod>` : '',
        '  </url>',
      ]
        .filter(Boolean)
        .join('\n');
    });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>
`;
}

/**
 * Atom 피드. Chirpy 도 Atom 이었으므로 형식을 맞춘다.
 */
export function renderFeed(site) {
  const { config } = site;
  const posts = site.posts.slice(0, config.feed.limit);
  const updated = (posts[0]?.lastModified ?? posts[0]?.date ?? site.buildTime).toISOString();

  const entries = posts
    .map((post) => {
      const url = absolute(config, post.url);
      return `  <entry>
    <title>${xml(post.title)}</title>
    <link href="${xml(url)}"/>
    <id>${xml(url)}</id>
    <published>${post.date.toISOString()}</published>
    <updated>${(post.lastModified ?? post.date).toISOString()}</updated>
    <summary>${xml(post.excerpt)}</summary>
${post.categories.map((name) => `    <category term="${xml(name)}"/>`).join('\n')}
    <author><name>${xml(config.author.name)}</name></author>
  </entry>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="${xml(config.lang)}">
  <title>${xml(config.title)}</title>
  <subtitle>${xml(config.description)}</subtitle>
  <link href="${xml(absolute(config, config.feed.path))}" rel="self"/>
  <link href="${xml(absolute(config, '/'))}"/>
  <id>${xml(absolute(config, '/'))}</id>
  <updated>${updated}</updated>
  <author><name>${xml(config.author.name)}</name></author>
${entries}
</feed>
`;
}

/** robots.txt — 전체 허용 + 사이트맵 위치. */
export function renderRobots(site) {
  return `User-agent: *
Allow: /

Sitemap: ${absolute(site.config, '/sitemap.xml')}
`;
}

/**
 * PWA 매니페스트.
 *
 * 아이콘은 SVG 한 장(`sizes: "any"`)으로 끝낸다. 래스터 아이콘을 크기별로
 * 만들어 커밋하면 저장소만 무거워지고, 이 사이트의 로고는 도형 몇 개라
 * 벡터로 충분하다.
 */
export function renderManifest(site) {
  const { config } = site;
  return `${JSON.stringify(
    {
      name: config.title,
      short_name: config.title.split(' ')[0],
      description: config.description,
      start_url: '/',
      scope: '/',
      display: 'standalone',
      lang: config.lang,
      background_color: '#000000',
      theme_color: '#000000',
      icons: [
        { src: '/assets/icon.svg', sizes: 'any', type: 'image/svg+xml' },
        { src: '/assets/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
      ],
    },
    null,
    2
  )}\n`;
}

/**
 * 서비스 워커.
 *
 * 전략을 둘로 나눈다:
 *   - HTML: 네트워크 우선. 글이 수정되면 바로 보여야 한다. 오프라인이면 캐시.
 *   - 자산(CSS/JS/이미지/폰트): 캐시 우선. 파일명이 바뀌지 않으므로 버전으로 무효화한다.
 *
 * `version` 이 바뀌면 이전 캐시를 통째로 버린다. 빌드마다 값이 달라지도록
 * 산출물 크기·개수에서 뽑은 값을 넣는다 (타임스탬프를 쓰면 내용이 같아도
 * 매번 캐시가 날아가고 빌드 결정성도 깨진다).
 *
 * @param {any} site
 * @param {string} version
 */
export function renderServiceWorker(site, version) {
  const precache = ['/', site.config.feed.path, '/assets/css/theme.css', '/assets/js/app.js', '/404.html'];

  return `/* 자동 생성 파일 — engine/meta.js 에서 만든다. 직접 수정하지 말 것. */
const VERSION = ${JSON.stringify(version)};
const CACHE = 'rivermoon-' + VERSION;
const PRECACHE = ${JSON.stringify(precache)};

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).catch(() => {}));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isDocument = request.mode === 'navigate' || request.destination === 'document';

  if (isDocument) {
    // 네트워크 우선 — 새 글/수정이 즉시 반영되어야 한다.
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
          return response;
        })
        .catch(() => caches.match(request).then((hit) => hit || caches.match('/404.html')))
    );
    return;
  }

  // 자산은 캐시 우선.
  event.respondWith(
    caches.match(request).then((hit) => {
      if (hit) return hit;
      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
        }
        return response;
      });
    })
  );
});
`;
}

/**
 * 클라이언트 검색 인덱스.
 *
 * 본문 전체를 실으면 인덱스가 커지므로 제목·요약·헤딩·분류만 담는다.
 * 한국어 토큰화는 클라이언트(assets/js/search.js)에서 bigram 으로 처리한다.
 */
export function renderSearchIndex(site) {
  const documents = site.posts.map((post) => ({
    id: post.url,
    title: post.title,
    excerpt: post.excerpt,
    headings: post.headings.flatMap(function flatten(node) {
      return [node.text, ...node.children.flatMap(flatten)];
    }),
    categories: post.categories,
    tags: post.tags,
    date: post.date.toISOString().slice(0, 10),
  }));

  return `${JSON.stringify({ generated: site.buildTime.toISOString(), documents })}\n`;
}
