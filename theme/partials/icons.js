/**
 * 아이콘.
 *
 * 아이콘 폰트나 외부 라이브러리를 쓰지 않는다. 여기서 필요한 건 몇 개뿐이고,
 * 인라인 SVG 면 색을 currentColor 로 물려받아 테마 전환에 공짜로 따라온다.
 */

import { html, raw } from '../../engine/html.js';

/** 획 기반 아이콘 공통 껍데기. 크기·색은 CSS 가 정한다. */
function stroke(path, { size = 16 } = {}) {
  return html`<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" stroke-width="1.75"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${raw(path)}</svg>`;
}

export const icons = {
  search: () => stroke('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  sun: () => stroke('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/>'),
  moon: () => stroke('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8"/>'),
  /*
   * 보기 설정. 톱니바퀴 대신 조절기(sliders)를 쓴다 — 톱니바퀴는 "시스템 설정"의
   * 관용어라 계정이나 저장 같은 걸 기대하게 만든다. 여기서 바꾸는 건 보이는 방식뿐이다.
   */
  sliders: () =>
    stroke('<path d="M4 6h8M16 6h4M4 12h2M10 12h10M4 18h8M16 18h4"/><circle cx="14" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="14" cy="18" r="2"/>'),
  rss: () => stroke('<path d="M5 19a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" fill="currentColor"/><path d="M5 12a7 7 0 0 1 7 7"/><path d="M5 5a14 14 0 0 1 14 14"/>'),
  mail: () => stroke('<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="m4 8 7.3 5a1.5 1.5 0 0 0 1.4 0L20 8"/>'),
  /* 홈 사이드 레일 — 카테고리를 저장소처럼 보여주는 데 쓴다. */
  repo: () =>
    stroke('<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v14H6.5A2.5 2.5 0 0 0 4 19.5z"/><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20v4H6.5A2.5 2.5 0 0 1 4 19.5z"/>'),
  file: () => stroke('<path d="M14 3H7.5A1.5 1.5 0 0 0 6 4.5v15A1.5 1.5 0 0 0 7.5 21h9a1.5 1.5 0 0 0 1.5-1.5V7z"/><path d="M14 3v4h4"/>'),
  chevron: () => stroke('<path d="m9 6 6 6-6 6"/>'),
  folder: () => stroke('<path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4l2 2.5h7A1.5 1.5 0 0 1 19 10v7.5A1.5 1.5 0 0 1 17.5 19h-13A1.5 1.5 0 0 1 3 17.5z"/>'),
  list: () => stroke('<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>'),
  hash: () => stroke('<path d="M5 9h14M5 15h14M10 4 8 20M16 4l-2 16"/>'),
  history: () => stroke('<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"/><path d="M3 4v4h4"/><path d="M12 8v4.5l3 1.8"/>'),
  pen: () => stroke('<path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17z"/><path d="M14.5 6.5 17.5 9.5"/>'),
  github: () =>
    html`<svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z"/>
    </svg>`,
};
