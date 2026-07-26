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

      <button type="button" class="tool-button" popovertarget="appearance"
              aria-label="보기 설정">${icons.sliders()}</button>
    </div>
  </div>

  ${appearanceMenu()}
</header>`;
}

/**
 * 보기 설정 — 테마와 본문 서체.
 *
 * `popover` 속성을 쓴다. 바깥을 누르면 닫히고, Esc 가 먹히고, 포커스가 갇히지 않는
 * 동작을 브라우저가 이미 갖고 있다. 직접 만들면 그 셋 중 하나는 반드시 빠뜨린다.
 *
 * 테마에 '시스템'을 넣은 이유: 예전 토글은 라이트/다크 둘뿐이라 한 번 누르고 나면
 * 시스템 설정으로 되돌릴 방법이 없었다. 저녁에 어두워지는 기기를 쓰는 사람에게는
 * 그게 원래 기본값이다.
 */
function appearanceMenu() {
  const option = (attribute, value, label) =>
    html`<button type="button" class="seg__option" ${raw(attribute)}="${value}"
        aria-pressed="false">${label}</button>`;

  return html`<div class="appearance glass glass--floating" id="appearance" popover>
  <div class="appearance__group">
    <p class="appearance__label" id="appearance-theme">테마</p>
    <div class="seg" role="group" aria-labelledby="appearance-theme">
      ${option('data-set-theme', 'light', '라이트')}
      ${option('data-set-theme', 'dark', '다크')}
      ${option('data-set-theme', 'system', '시스템')}
    </div>
  </div>

  <div class="appearance__group">
    <p class="appearance__label" id="appearance-font">본문 서체</p>
    <div class="seg" role="group" aria-labelledby="appearance-font">
      ${option('data-set-font', 'serif', '명조')}
      ${option('data-set-font', 'sans', '고딕')}
    </div>
    <p class="appearance__note">본문과 글 제목에만 적용됩니다.</p>
  </div>
</div>`;
}
