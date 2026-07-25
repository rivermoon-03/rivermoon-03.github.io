/**
 * 빌드 오케스트레이션. 전체 파이프라인이 여기서 한눈에 보인다.
 */

import { join } from 'node:path';
import { loadContent } from './load.js';
import { buildSite } from './model.js';
import { collectRoutes, renderRoutes } from './render.js';
import { cleanOutDir, writePage, copyPassthrough } from './emit.js';
import { buildThemeAssets } from './assets.js';
import { readLastModified } from './git.js';
import {
  renderSitemap,
  renderFeed,
  renderRobots,
  renderManifest,
  renderSearchIndex,
  renderServiceWorker,
} from './meta.js';

/**
 * 사이트를 통째로 빌드한다.
 *
 * @param {object} input
 * @param {string} input.rootDir 저장소 루트
 * @param {any} input.config site.config.js
 * @param {any} input.theme theme/index.js
 * @param {{drafts?: boolean, minify?: boolean, lastmod?: boolean, ads?: boolean,
 *          outDir?: string}} [input.options]
 * @returns {Promise<{site: any, routes: any[], stats: object}>}
 */
export async function build({ rootDir, config, theme, options = {} }) {
  const { drafts = false, minify = true, lastmod = true, ads = true } = options;
  /*
   * 개발 빌드는 배포 빌드와 다른 디렉토리에 쓴다.
   *
   * 같은 `_site` 를 공유하게 뒀더니, 개발 서버를 띄워둔 채로 `npm run build` 를
   * 한 번 돌리면 보고 있던 화면이 조용히 배포용 산출물로 바뀌었다. 배포 빌드는
   * 광고가 켜져 있어서 localhost 에서는 채워지지 않은 광고가 자리만 차지하고,
   * 그게 "제목과 본문 사이 여백이 왜 이렇게 넓지?"로 보인다.
   * 원인을 찾기 어려운 종류의 사고라 아예 갈라놓는다.
   */
  const outDir = join(rootDir, options.outDir ?? config.outDir);
  const started = performance.now();

  // 개발 중에는 광고를 끈다. AdSense 는 localhost 에서 광고를 채우지 못하면서도
  // 자리는 그대로 잡아두기 때문에, 모든 글 위에 빈 사각형이 남아 디자인 확인을 방해한다.
  if (!ads) {
    config = { ...config, adsense: { ...config.adsense, enabled: false } };
  }

  // 1. 소스 수집
  const content = loadContent(rootDir, config, { includeDrafts: drafts });

  // 2. git 기반 수정일 주입 — 모델을 만들기 전에 프론트매터에 얹는다.
  if (lastmod) {
    const modified = readLastModified(
      rootDir,
      content.posts.map((source) => source.sourcePath)
    );
    for (const source of content.posts) {
      const date = modified.get(source.sourcePath);
      if (date) source.data.last_modified_at = date;
    }
  }

  // 3. 모델 구축 (마크다운 렌더 포함)
  const site = await buildSite({ rootDir, config, content });

  // 4. 산출물 디렉토리 초기화
  cleanOutDir(outDir);

  // 5. 라우트 렌더
  const routes = collectRoutes(site);
  renderRoutes({ site, theme, outDir });

  // 6. 테마 자산
  const assetSizes = buildThemeAssets({ themeDir: join(rootDir, 'theme'), outDir, minify });

  // 7. 부수 산출물
  writePage(outDir, '/sitemap.xml', renderSitemap(site, routes));
  writePage(outDir, config.feed.path, renderFeed(site));
  writePage(outDir, '/robots.txt', renderRobots(site));
  writePage(outDir, config.search.indexPath, renderSearchIndex(site));
  if (config.pwa?.enabled) {
    writePage(outDir, '/manifest.webmanifest', renderManifest(site));
    // 서비스 워커는 반드시 루트에 있어야 사이트 전체를 스코프로 잡는다.
    writePage(outDir, '/sw.js', renderServiceWorker(site, assetSizes.hash));
  }

  // 8. 무변환 통과 자산 (알고리즘 과제·팀플 페이지·이미지·ads.txt)
  const passthrough = copyPassthrough(rootDir, outDir, config.passthrough);

  return {
    site,
    routes,
    stats: {
      posts: site.posts.length,
      pages: site.pages.length,
      routes: routes.length,
      categories: site.categories.length,
      tags: site.tags.length,
      assets: assetSizes,
      passthrough,
      durationMs: Math.round(performance.now() - started),
    },
  };
}
