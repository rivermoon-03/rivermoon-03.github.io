/**
 * 사이트 푸터.
 */

import { html, each } from '../../engine/html.js';
import { icons } from './icons.js';

export function siteFooter({ site }) {
  const year = site.buildTime.getFullYear();
  const { author } = site.config;

  const links = [
    { href: `https://github.com/${author.github}`, label: 'GitHub', icon: icons.github },
    { href: `mailto:${author.email}`, label: 'Email', icon: icons.mail },
    { href: site.config.feed.path, label: 'RSS', icon: icons.rss },
  ];

  return html`<footer class="site-footer">
  <div class="site-footer__inner">
    <p class="site-footer__copy">
      © ${year} <a href="${author.links[0]}">${author.name}</a>
    </p>
    <nav class="site-footer__links" aria-label="외부 링크">
      ${each(links, (link) => html`<a href="${link.href}">${link.icon()}<span>${link.label}</span></a>`)}
    </nav>
  </div>
</footer>`;
}
