/**
 * 아카이브 — 연/월 타임라인.
 */

import { html, each } from '../../engine/html.js';
import { base } from './base.js';
import { isoDate } from '../partials/format.js';

export function archives({ site, url, page: entry }) {
  const total = site.posts.length;

  return base({
    site,
    url,
    bodyClass: 'page-archives',
    meta: { title: entry.title, description: `${site.config.title}의 전체 글 ${total}개` },
    body: html`
      <header class="archive-header">
        <h1 class="section-title">${entry.title}</h1>
        <p class="archive-header__count">전체 ${total}개</p>
      </header>

      ${each(site.archives, (year) => html`<section class="archive-year" data-reveal>
        <h2 class="archive-year__label">
          ${year.year}
          <span class="archive-year__count">${year.count}</span>
        </h2>

        ${each(year.months, (month) => html`<div class="archive-month">
          <h3 class="archive-month__label">${month.label}</h3>
          <ul class="archive-month__list">
            ${each(month.posts, (post) => html`<li class="archive-item">
              <time class="archive-item__day" datetime="${isoDate(post.date)}">${post.date.getDate()}</time>
              <a class="archive-item__link" href="${post.url}">${post.title}</a>
            </li>`)}
          </ul>
        </div>`)}
      </section>`)}
    `,
  });
}
