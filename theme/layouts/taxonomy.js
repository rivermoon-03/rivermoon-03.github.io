/**
 * 분류 체계 레이아웃 — 카테고리/태그의 목록 페이지와 개별 페이지.
 *
 * Chirpy 는 카테고리를 아코디언 카드로 쌓아 보여줬는데, 이 블로그는 카테고리가
 * 4개뿐이라 그 구조가 과하다. 한눈에 다 보이는 평면 목록으로 간다.
 */

import { html, each, attrs } from '../../engine/html.js';
import { base } from './base.js';
import { postRow } from '../partials/post-card.js';

/**
 * 분류 항목 하나를 보여주는 칩.
 * weighted 면 글 개수를 CSS 변수로 넘겨 태그 클라우드에서 크기 차이를 준다.
 */
function taxonomyChip(entry, { weighted = false } = {}) {
  return html`<li><a
    class="chip${weighted ? ' chip--weighted' : ''}"
    href="${entry.url}"${attrs({ style: weighted ? `--weight:${entry.count}` : false })}>
    <span class="chip__name">${entry.name}</span>
    <span class="chip__count">${entry.count}</span>
  </a></li>`;
}

/** `/categories/` — 카테고리 전체와 각 카테고리의 글 목록. */
export function categories({ site, url, page: entry }) {
  return base({
    site,
    url,
    bodyClass: 'page-taxonomy',
    meta: { title: entry.title, description: `${site.config.title}의 카테고리 목록` },
    body: html`
      <h1 class="section-title">${entry.title}</h1>
      <ul class="chip-list">${each(site.categories, (item) => taxonomyChip(item))}</ul>

      ${each(site.categories, (category) => html`<section class="taxonomy-group" data-reveal>
        <h2 class="taxonomy-group__title">
          <a href="${category.url}">${category.name}</a>
          <span class="taxonomy-group__count">${category.count}</span>
        </h2>
        <ul class="post-rows">${each(category.posts, (post) => postRow({ post }))}</ul>
      </section>`)}
    `,
  });
}

/** `/tags/` — 태그 클라우드. */
export function tags({ site, url, page: entry }) {
  return base({
    site,
    url,
    bodyClass: 'page-taxonomy',
    meta: { title: entry.title, description: `${site.config.title}의 태그 목록` },
    body: html`
      <h1 class="section-title">${entry.title}</h1>
      <ul class="chip-list chip-list--cloud">
        ${each(site.tags, (item) => taxonomyChip(item, { weighted: true }))}
      </ul>
    `,
  });
}

/** `/categories/<name>/` 또는 `/tags/<name>/`. */
function taxonomyDetail(kind) {
  return ({ site, url, taxonomy }) =>
    base({
      site,
      url,
      bodyClass: 'page-taxonomy-detail',
      meta: {
        title: `${taxonomy.name}`,
        description: `${kind === 'category' ? '카테고리' : '태그'} '${taxonomy.name}' 의 글 ${taxonomy.count}개`,
      },
      body: html`
        <header class="taxonomy-header">
          <p class="taxonomy-header__kind">${kind === 'category' ? '카테고리' : '태그'}</p>
          <h1 class="section-title">${kind === 'category' ? '' : '#'}${taxonomy.name}</h1>
          <p class="taxonomy-header__count">글 ${taxonomy.count}개</p>
        </header>
        <ul class="post-rows">${each(taxonomy.posts, (post) => postRow({ post }))}</ul>
      `,
    });
}

export const category = taxonomyDetail('category');
export const tag = taxonomyDetail('tag');
