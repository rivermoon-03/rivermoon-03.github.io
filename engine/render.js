/**
 * 라우팅과 렌더.
 *
 * "어떤 URL이 존재하는가"를 결정하는 곳은 여기 한 군데뿐이다.
 * 테마는 각 라우트에 대응하는 레이아웃 함수를 내보내기만 하면 된다.
 */

import { writePage } from './emit.js';

/**
 * Jekyll 시절 `_tabs/*.md` 의 `layout:` 값 → 테마 레이아웃 이름.
 * 이 파일들은 프론트매터만 있고 본문이 비어 있는 껍데기다.
 */
const TAB_LAYOUTS = {
  categories: 'categories',
  tags: 'tags',
  archives: 'archives',
  page: 'page',
};

/**
 * 사이트에 존재해야 할 모든 라우트를 만든다.
 * 파일을 쓰지 않고 목록만 돌려주므로 테스트에서 URL 집합만 뽑아볼 수 있다.
 *
 * @param {any} site buildSite 결과
 * @returns {{url: string, layout: string, props: any}[]}
 */
export function collectRoutes(site) {
  const routes = [];

  // 홈 + 페이지네이션. 1페이지는 `/`, 2페이지부터 `/pageN/`.
  for (const page of site.pagination) {
    routes.push({ url: page.url, layout: 'home', props: { page } });
  }

  for (const post of site.posts) {
    routes.push({ url: post.url, layout: 'post', props: { post } });
  }

  // _tabs 유래 페이지. layout 값에 따라 목록형 레이아웃으로 분기한다.
  for (const page of site.pages) {
    routes.push({
      url: page.url,
      layout: TAB_LAYOUTS[page.layout] ?? 'page',
      props: { page },
    });
  }

  for (const category of site.categories) {
    routes.push({ url: category.url, layout: 'category', props: { taxonomy: category } });
  }

  for (const tag of site.tags) {
    routes.push({ url: tag.url, layout: 'tag', props: { taxonomy: tag } });
  }

  routes.push({ url: '/404.html', layout: 'notFound', props: {} });

  // 리다이렉트. 글에 붙은 `redirect_from` 과 설정의 `redirects` 를 합친다.
  // sitemap 에는 넣지 않는다 (아래 isRedirect 로 걸러낸다).
  for (const post of site.posts) {
    for (const from of post.redirectFrom) {
      routes.push({ url: from, layout: 'redirect', isRedirect: true, props: { to: post.url } });
    }
  }
  for (const [from, to] of Object.entries(site.config.redirects ?? {})) {
    routes.push({ url: from, layout: 'redirect', isRedirect: true, props: { to } });
  }

  // 같은 주소가 두 번 나오면 나중 것이 앞의 것을 덮어써 조용히 사라진다.
  // 리다이렉트가 실제 글 주소를 가리는 사고를 여기서 잡는다.
  const seen = new Map();
  for (const route of routes) {
    if (seen.has(route.url)) {
      throw new Error(
        `라우트가 겹친다: ${route.url} (${seen.get(route.url)} vs ${route.layout})`
      );
    }
    seen.set(route.url, route.layout);
  }

  return routes;
}

/**
 * 라우트를 실제 파일로 떨어뜨린다.
 *
 * @param {{site: any, theme: any, outDir: string}} input
 * @returns {{url: string, path: string}[]}
 */
export function renderRoutes({ site, theme, outDir }) {
  const written = [];

  for (const route of collectRoutes(site)) {
    const layout = theme[route.layout];
    if (typeof layout !== 'function') {
      throw new Error(`테마에 '${route.layout}' 레이아웃이 없다 (${route.url})`);
    }

    const output = layout({ site, url: route.url, ...route.props });
    written.push({ url: route.url, path: writePage(outDir, route.url, output) });
  }

  return written;
}
