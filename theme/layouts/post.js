/**
 * 포스트 상세.
 */

import { html, raw, each, when } from '../../engine/html.js';
import { base } from './base.js';
import { tocPanel, tocInline } from '../partials/toc.js';
import { adSlot } from '../partials/ads.js';
import { comments } from '../partials/comments.js';
import { formatDate, isoDate, formatCount } from '../partials/format.js';
import { absoluteUrl } from '../partials/head.js';

/** 검색엔진용 구조화 데이터. */
function articleJsonLd({ site, post }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date.toISOString(),
    dateModified: (post.lastModified ?? post.date).toISOString(),
    author: { '@type': 'Person', name: site.config.author.name, url: site.config.author.links[0] },
    publisher: { '@type': 'Person', name: site.config.author.name },
    mainEntityOfPage: absoluteUrl(site, post.url),
    ...(post.image ? { image: absoluteUrl(site, post.image.path) } : {}),
    keywords: [...post.categories, ...post.tags].join(', '),
    inLanguage: 'ko-KR',
  };
}

function postNav({ post }) {
  if (!post.prev && !post.next) return '';

  return html`<nav class="post-nav" data-reveal aria-label="이전 다음 글">
  ${when(
    post.prev,
    () => html`<a class="post-nav__item post-nav__item--prev" href="${post.prev.url}">
      <span class="post-nav__label">이전 글</span>
      <span class="post-nav__title">${post.prev.title}</span>
    </a>`
  )}
  ${when(
    post.next,
    () => html`<a class="post-nav__item post-nav__item--next" href="${post.next.url}">
      <span class="post-nav__label">다음 글</span>
      <span class="post-nav__title">${post.next.title}</span>
    </a>`
  )}
</nav>`;
}

function relatedPosts({ post }) {
  if (!post.related.length) return '';

  return html`<section class="related" data-reveal aria-labelledby="related-heading">
  <h2 class="related__heading" id="related-heading">관련 글</h2>
  <ul class="related__list">
    ${each(post.related, (item) => html`<li><a href="${item.url}">${item.title}</a></li>`)}
  </ul>
</section>`;
}

export function post({ site, url, post: entry }) {
  const showToc = entry.toc && entry.headings.length > 0;

  return base({
    site,
    url,
    bodyClass: 'page-post',
    aside: showToc ? tocPanel({ headings: entry.headings }) : null,
    meta: {
      title: entry.title,
      description: entry.excerpt,
      type: 'article',
      image: entry.image?.path ?? null,
      publishedAt: entry.date,
      modifiedAt: entry.lastModified,
      jsonLd: articleJsonLd({ site, post: entry }),
    },
    body: html`
      <article class="post">
        <header class="post__header">
          <div class="post__categories">
            ${each(entry.categoryRefs, (ref) => html`<a class="badge" href="${ref.url}">${ref.name}</a>`)}
          </div>
          <h1 class="post__title">${entry.title}</h1>
          <div class="post__meta">
            <time datetime="${isoDate(entry.date)}">${formatDate(entry.date)}</time>
            <span class="post__read">${formatCount(entry.charCount)}자</span>
            ${when(
              entry.lastModified,
              () => html`<span class="post__updated">${formatDate(entry.lastModified)} 수정</span>`
            )}
          </div>
        </header>

        ${when(showToc, () => tocInline({ headings: entry.headings }))}
        ${adSlot({ site, slot: 'postTop' })}

        <div class="prose">${raw(entry.html)}</div>

        ${when(
          entry.tagRefs.length,
          () => html`<div class="post__tags">
            ${each(entry.tagRefs, (ref) => html`<a class="tag" href="${ref.url}">#${ref.name}</a>`)}
          </div>`
        )}
      </article>

      ${postNav({ post: entry })}
      ${relatedPosts({ post: entry })}
      ${comments({ site })}
    `,
  });
}
