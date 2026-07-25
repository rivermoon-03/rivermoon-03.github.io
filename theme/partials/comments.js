/**
 * 댓글 (giscus).
 *
 * GitHub Discussions 를 저장소로 쓰기 때문에 정적 사이트에 서버 없이 붙는다.
 * site.config.js 의 giscus 값이 비어 있으면 아무것도 렌더하지 않는다 —
 * 설정 전에 빈 위젯이 노출되는 것보다 낫다.
 */

import { html, when } from '../../engine/html.js';

export function comments({ site }) {
  const config = site.config.comments;
  if (config?.provider !== 'giscus') return '';

  const giscus = config.giscus ?? {};
  return when(
    giscus.repo && giscus.repoId && giscus.categoryId,
    () => html`<section class="comments" data-reveal aria-label="댓글">
  <h2 class="comments__heading">댓글</h2>
  <script src="https://giscus.app/client.js"
          data-repo="${giscus.repo}"
          data-repo-id="${giscus.repoId}"
          data-category="${giscus.category}"
          data-category-id="${giscus.categoryId}"
          data-mapping="${giscus.mapping ?? 'pathname'}"
          data-reactions-enabled="${giscus.reactionsEnabled ?? '1'}"
          data-emit-metadata="0"
          data-input-position="bottom"
          data-lang="ko"
          data-theme="preferred_color_scheme"
          crossorigin="anonymous"
          async></script>
</section>`
  );
}
