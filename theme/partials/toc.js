/**
 * 목차.
 *
 * 데스크톱에서는 본문 옆에 붙고, 좁은 화면에서는 본문 위 접이식으로 접힌다.
 * 스크롤 위치에 따른 활성 표시는 assets/js 의 IntersectionObserver 가 담당한다.
 */

import { html, each, when } from '../../engine/html.js';

function tocList(nodes) {
  return html`<ol class="toc__list">
    ${each(nodes, (node) => html`<li class="toc__item toc__item--h${node.depth}">
      <a class="toc__link" href="#${node.id}">${node.text}</a>
      ${when(node.children.length, () => tocList(node.children))}
    </li>`)}
  </ol>`;
}

export function tocPanel({ headings }) {
  if (!headings.length) return '';

  return html`<nav class="toc" aria-labelledby="toc-heading" data-toc>
  <h2 class="toc__heading" id="toc-heading">목차</h2>
  ${tocList(headings)}
</nav>`;
}

/** 모바일용 접이식 목차. 본문 위에 놓인다. */
export function tocInline({ headings }) {
  if (!headings.length) return '';

  return html`<details class="toc-inline">
  <summary class="toc-inline__summary">목차</summary>
  ${tocList(headings)}
</details>`;
}
