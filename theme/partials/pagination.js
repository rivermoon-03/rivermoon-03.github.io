/**
 * 홈 페이지네이션.
 *
 * URL 규칙(1페이지는 `/`, 이후 `/pageN/`)은 엔진의 model.paginate 가 이미 계산해서
 * 넘겨준다. 여기서는 그리기만 한다.
 */

import { html, each, when } from '../../engine/html.js';

export function pagination({ page }) {
  if (page.total <= 1) return '';

  const numbers = Array.from({ length: page.total }, (_, i) => i + 1);

  return html`<nav class="pagination" aria-label="페이지 이동">
  ${when(
    page.prevUrl,
    () => html`<a class="pagination__step" href="${page.prevUrl}" rel="prev">이전</a>`
  )}
  <ol class="pagination__list">
    ${each(numbers, (n) => {
      const url = n === 1 ? page.url.replace(/page\d+\/$/u, '') : `/page${n}/`;
      const isCurrent = n === page.number;
      return html`<li>
        <a class="pagination__page${isCurrent ? ' is-current' : ''}"
           href="${n === 1 ? '/' : url}"${isCurrent ? ' aria-current="page"' : ''}>${n}</a>
      </li>`;
    })}
  </ol>
  ${when(
    page.nextUrl,
    () => html`<a class="pagination__step" href="${page.nextUrl}" rel="next">다음</a>`
  )}
</nav>`;
}
