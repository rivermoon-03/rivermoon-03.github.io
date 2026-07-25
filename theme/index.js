/**
 * 테마 진입점 — 엔진과의 계약.
 *
 * 엔진(engine/render.js)은 라우트마다 여기 있는 이름의 함수를 찾아 호출한다.
 * 이 목록만 맞추면 테마를 통째로 갈아끼울 수 있다.
 *
 * 각 레이아웃은 `{ site, url, ...props }` 를 받아 완성된 HTML 문자열을 돌려준다.
 */

export { home } from './layouts/home.js';
export { post } from './layouts/post.js';
export { page } from './layouts/page.js';
export { categories, tags, category, tag } from './layouts/taxonomy.js';
export { archives } from './layouts/archives.js';
export { notFound } from './layouts/not-found.js';
export { redirect } from './layouts/redirect.js';
