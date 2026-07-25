/**
 * 홈 — 포스트 목록 + 페이지네이션.
 */

import { html, each, when } from '../../engine/html.js';
import { base } from './base.js';
import { postCard } from '../partials/post-card.js';
import { pagination } from '../partials/pagination.js';

export function home({ site, url, page }) {
  const isFirst = page.number === 1;

  return base({
    site,
    url,
    bodyClass: 'page-home',
    meta: {
      description: site.config.description,
      // 2페이지부터는 제목에 페이지 번호를 넣어 중복 제목을 피한다.
      title: isFirst ? '' : `${page.number}페이지`,
    },
    body: html`
      ${when(
        isFirst,
        // 사이트 제목은 헤더에 이미 있다. 여기서 또 반복하면 첫 화면의 절반이
        // 같은 문장 두 개로 채워진다. 대신 태그라인을 크게 세우고 규모를 덧붙인다.
        () => html`<section class="hero">
          <h1 class="hero__title">${site.config.tagline}</h1>
          <p class="hero__stats">
            <span>글 ${site.posts.length}</span>
            <span>카테고리 ${site.categories.length}</span>
            <span>태그 ${site.tags.length}</span>
          </p>
        </section>`
      )}

      <ol class="post-list">
        ${each(page.posts, (post) => postCard({ post }))}
      </ol>

      ${pagination({ page })}
    `,
  });
}
