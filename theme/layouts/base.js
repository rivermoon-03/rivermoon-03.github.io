/**
 * 문서 껍데기. 모든 페이지가 이걸 통과한다.
 *
 * 가로 헤더 + 가운데 정렬 본문. 목차가 있는 페이지만 넓은 화면에서 오른쪽에
 * 인스펙터가 붙는다.
 *
 * head 안의 순서에 의도가 있다:
 *   1. 테마 판별 인라인 스크립트를 CSS보다 먼저 — 다크모드 깜빡임(FOUC)을 막는다.
 *   2. CSS 는 렌더 블로킹으로 두되 한 파일로 유지.
 *   3. 나머지 스크립트는 전부 defer.
 */

import { html, raw, when } from '../../engine/html.js';
import { head } from '../partials/head.js';
import { toolbar } from '../partials/toolbar.js';
import { siteFooter } from '../partials/footer.js';

/**
 * 저장된 선택 → 없으면 시스템 설정. CSS 보다 먼저 실행되어야 의미가 있어서 인라인이다.
 * 이 한 조각 때문에 다크모드에서 흰 화면이 번쩍이지 않는다.
 *
 * 서체도 여기서 정한다. 나중에 JS 로 바꾸면 한 문단이 고딕으로 그려졌다가 명조로
 * 다시 흐르는 게 보이는데, 글자가 움직이는 건 색이 번쩍이는 것보다 더 눈에 띈다.
 */
const APPEARANCE_BOOTSTRAP = `(function(){try{var r=document.documentElement,s=localStorage;var t=s.getItem('theme');r.dataset.theme=t||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');var f=s.getItem('font');if(f)r.dataset.font=f;}catch(e){}})()`;

/**
 * @param {object} input
 * @param {any} input.site
 * @param {string} input.url 현재 페이지 URL — 내비게이션 활성 표시에 쓴다
 * @param {object} input.meta head 에 넘길 메타 정보
 * @param {unknown} input.body 본문
 * @param {unknown} [input.aside] 본문 옆 인스펙터 (목차 등)
 * @param {string} [input.bodyClass]
 */
export function base({ site, url, meta, body, aside = null, bodyClass = '' }) {
  return html`<!doctype html>
<html lang="${site.config.lang}" data-theme="light" data-font="serif">
<head>
<script>${raw(APPEARANCE_BOOTSTRAP)}</script>
${head({ site, url, meta })}
</head>
<body${raw(bodyClass ? ` class="${bodyClass}"` : '')}>
<a class="skip-link" href="#main">본문으로 건너뛰기</a>

${toolbar({ site, url })}

<div class="canvas${raw(aside ? ' canvas--with-aside' : '')}">
  <main id="main" class="canvas__main">${body}</main>
  ${when(aside, () => html`<aside class="canvas__aside">${aside}</aside>`)}
</div>

${siteFooter({ site })}

<script src="/assets/js/app.js" defer></script>
</body>
</html>
`;
}
