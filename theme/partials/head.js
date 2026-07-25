/**
 * <head> 내용물. SEO 메타와 AdSense 로딩을 담당한다.
 */

import { html, raw, when } from '../../engine/html.js';

/** 사이트 내 경로를 절대 URL로. OG/canonical 은 상대경로를 쓰면 안 된다. */
export function absoluteUrl(site, path) {
  const base = `${site.config.url}${site.config.baseurl}`;
  if (!path) return base;
  if (/^https?:\/\//u.test(path)) return path;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * @param {object} input
 * @param {any} input.site
 * @param {string} input.url
 * @param {{title?: string, description?: string, type?: string, image?: string | null,
 *          publishedAt?: Date | null, modifiedAt?: Date | null, noindex?: boolean,
 *          jsonLd?: object | null}} input.meta
 */
export function head({ site, url, meta }) {
  const { config } = site;

  const pageTitle = meta.title ? `${meta.title} · ${config.title}` : config.title;
  const description = meta.description || config.description;
  const canonical = absoluteUrl(site, url === '/404.html' ? '/' : url);
  const image = meta.image ? absoluteUrl(site, meta.image) : null;

  return html`<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${pageTitle}</title>
<meta name="description" content="${description}">
<link rel="canonical" href="${canonical}">
${when(meta.noindex, () => html`<meta name="robots" content="noindex">`)}

<meta property="og:site_name" content="${config.title}">
<meta property="og:type" content="${meta.type ?? 'website'}">
<meta property="og:title" content="${meta.title ?? config.title}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${canonical}">
<meta property="og:locale" content="ko_KR">
${when(image, () => html`<meta property="og:image" content="${image}">`)}
<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">
${when(meta.publishedAt, () => html`<meta property="article:published_time" content="${meta.publishedAt.toISOString()}">`)}
${when(meta.modifiedAt, () => html`<meta property="article:modified_time" content="${meta.modifiedAt.toISOString()}">`)}

<link rel="alternate" type="application/atom+xml" title="${config.title}" href="${config.feed.path}">
${raw(`
<!-- Pretendard 동적 서브셋: 한글 폰트 전체(수 MB)를 받지 않고 쓰인 글자만 받는다. -->
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
`)}
<link rel="stylesheet" href="/assets/css/theme.css">
${when(config.pwa?.enabled, () => html`<link rel="manifest" href="/manifest.webmanifest">`)}

${when(meta.jsonLd, () => html`<script type="application/ld+json">${raw(JSON.stringify(meta.jsonLd))}</script>`)}

${when(
  config.adsense?.enabled && config.adsense.client,
  () => html`<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${config.adsense.client}" crossorigin="anonymous"></script>`
)}`;
}
