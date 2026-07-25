/**
 * 일반 페이지 (`_tabs/about.md` 등).
 */

import { html, raw, when } from '../../engine/html.js';
import { base } from './base.js';
import { tocPanel } from '../partials/toc.js';

export function page({ site, url, page: entry }) {
  const showToc = entry.headings.length > 2;

  return base({
    site,
    url,
    bodyClass: 'page-static',
    aside: showToc ? tocPanel({ headings: entry.headings }) : null,
    meta: { title: entry.title },
    body: html`
      <article class="static-page">
        <h1 class="static-page__title">${entry.title}</h1>
        <div class="prose">${raw(entry.html)}</div>
      </article>
    `,
  });
}
