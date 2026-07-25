/**
 * 404. GitHub Pages 는 루트의 `/404.html` 만 인식한다.
 */

import { html, each } from '../../engine/html.js';
import { base } from './base.js';

export function notFound({ site, url }) {
  const recent = site.posts.slice(0, 5);

  return base({
    site,
    url,
    bodyClass: 'page-404',
    meta: { title: '페이지를 찾을 수 없음', noindex: true },
    body: html`
      <section class="not-found">
        <p class="not-found__code">404</p>
        <h1 class="not-found__title">여기엔 아무것도 없습니다</h1>
        <p class="not-found__hint">주소가 바뀌었거나 글이 지워졌을 수 있어요.</p>
        <p><a class="button" href="/">홈으로</a></p>
      </section>

      <section class="not-found__recent">
        <h2 class="section-title">최근 글</h2>
        <ul class="post-rows">
          ${each(recent, (post) => html`<li class="post-row"><a href="${post.url}">${post.title}</a></li>`)}
        </ul>
      </section>
    `,
  });
}
