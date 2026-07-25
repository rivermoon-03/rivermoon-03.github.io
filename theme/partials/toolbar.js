/**
 * 상단 헤더.
 *
 * 사이드바 없이 가로 헤더 하나로 간다. 본문이 쓸 수 있는 가로 폭이 늘고
 * 모바일에서 구조가 단순해진다.
 *
 * macOS 툴바에서 가져온 것은 형태가 아니라 재질과 반응이다: 유리(반투명 + 채도 상승),
 * 고정 높이, 누르면 살짝 들어가는 컨트롤, 다크 모드에서 포인터를 따라 도는 스페큘러.
 */

import { html, raw, each } from '../../engine/html.js';
import { icons } from './icons.js';

export function toolbar({ site, url }) {
  return html`<header class="masthead glass glass--bar glass--specular">
  <div class="masthead__inner">
    <a class="masthead__brand" href="/">
      <span class="masthead__title">${site.config.title}</span>
      <span class="masthead__tagline">${site.config.tagline}</span>
    </a>

    <nav class="masthead__nav" aria-label="주요 메뉴">
      ${each(site.pages, (page) => {
        const isCurrent = url === page.url;
        return html`<a
          class="nav-pill${isCurrent ? ' is-current' : ''}"
          href="${page.url}"${isCurrent ? ' aria-current="page"' : ''}>${page.title}</a>`;
      })}
    </nav>

    <div class="masthead__actions">
      <button type="button" class="tool-button tool-button--search" data-search-open aria-label="검색">
        ${icons.search()}
        <span class="tool-button__label">검색</span>
        <span class="tool-button__hint">${raw('&#8984;K')}</span>
      </button>

      <button type="button" class="tool-button" data-theme-toggle aria-label="테마 전환">
        <span class="theme-icon theme-icon--sun">${icons.sun()}</span>
        <span class="theme-icon theme-icon--moon">${icons.moon()}</span>
      </button>
    </div>
  </div>
</header>`;
}
