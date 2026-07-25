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
  rss: () => stroke('<path d="M5 19a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" fill="currentColor"/><path d="M5 12a7 7 0 0 1 7 7"/><path d="M5 5a14 14 0 0 1 14 14"/>'),
  mail: () => stroke('<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="m4 8 7.3 5a1.5 1.5 0 0 0 1.4 0L20 8"/>'),
  github: () =>
    html`<svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z"/>
    </svg>`,
};
