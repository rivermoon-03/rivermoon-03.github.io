/**
 * 목록에 쓰이는 포스트 항목.
 *
 * 카드 그리드 대신 세로 목록을 쓴다. 이 블로그의 글은 썸네일이 거의 없고
 * 제목·카테고리·날짜로 판별되므로, 카드로 감싸면 여백만 먹고 정보가 줄어든다.
 */

import { html, each, when } from '../../engine/html.js';
import { formatDate, isoDate, formatCount } from './format.js';

/**
 * 홈 목록용. 제목 + 발췌 + 메타.
 *
 * @param {{post: any, showExcerpt?: boolean}} input
 */
export function postCard({ post, showExcerpt = true }) {
  return html`<li class="post-item${post.pin ? ' post-item--pinned' : ''}">
  <a class="post-item__link" href="${post.url}">
    <h2 class="post-item__title">${post.title}</h2>
    ${when(showExcerpt && post.excerpt, () => html`<p class="post-item__excerpt">${post.excerpt}</p>`)}
  </a>
  <div class="post-item__meta">
    ${when(post.pin, () => html`<span class="badge badge--pin">고정</span>`)}
    ${each(post.categories, (name) => html`<span class="badge">${name}</span>`)}
    <time datetime="${isoDate(post.date)}">${formatDate(post.date)}</time>
    ${when(post.charCount, () => html`<span class="post-item__read">${formatCount(post.charCount)}자</span>`)}
  </div>
</li>`;
}

/**
 * 카테고리·태그·아카이브 목록용.
 *
 * 제목 아래에 본문 앞부분을 한두 줄 붙인다. 이 블로그는 제목이 "2231 - 분해합"
 * 처럼 문제 번호 위주라 제목만으로는 뭘 다뤘는지 알기 어렵다. 발췌가 있으면
 * 목록에서 바로 고를 수 있다. 두 줄에서 자른다 — 그 이상은 목록이 아니라 본문이 된다.
 *
 * @param {{post: any, showExcerpt?: boolean}} input
 */
export function postRow({ post, showExcerpt = true }) {
  return html`<li class="post-row">
  <a class="post-row__link" href="${post.url}">
    <span class="post-row__head">
      <span class="post-row__title">${post.title}</span>
      <time class="post-row__date" datetime="${isoDate(post.date)}">${formatDate(post.date)}</time>
    </span>
    ${when(
      showExcerpt && post.excerpt,
      () => html`<span class="post-row__excerpt">${post.excerpt}</span>`
    )}
  </a>
</li>`;
}
