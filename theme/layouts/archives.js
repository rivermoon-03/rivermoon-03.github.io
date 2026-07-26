/**
 * 아카이브 — 연도를 디렉토리처럼 훑는 화면.
 *
 * 카테고리·태그 페이지와 같은 저장소 뷰를 쓰되, 목록 상자를 연도마다 하나씩 둔다.
 * GitHub 에서 폴더를 하나씩 열어 둔 상태와 같은 모양이다.
 */

import { html, each } from '../../engine/html.js';
import { base } from './base.js';
import { repoHead, repoBar, fileTable, folderBar, aboutPanel } from '../partials/repo.js';
import { formatDate, formatCount } from '../partials/format.js';

export function archives({ site, url, page: entry }) {
  const total = site.posts.length;
  const latest = site.posts[0];
  const oldest = site.posts[site.posts.length - 1];
  const chars = site.posts.reduce((sum, post) => sum + (post.charCount ?? 0), 0);

  return base({
    site,
    url,
    bodyClass: 'page-repo',
    meta: { title: entry.title, description: `${site.config.title}의 전체 글 ${total}개` },
    aside: aboutPanel({
      description: `${site.config.title}에 쓴 글 전부.`,
      facts: [
        { icon: 'list', text: `글 ${formatCount(total)}개` },
        { icon: 'pen', text: `${formatCount(chars)}자` },
        { icon: 'history', text: `${formatDate(oldest.date)} ~ ${formatDate(latest.date)}` },
        { icon: 'rss', text: '구독', url: site.config.feed?.path ?? '/feed.xml' },
      ],
      // 연도별 바로가기. 한 해뿐이면 바로가기가 아니라 장식이므로 내지 않는다.
      topics:
        site.archives.length > 1
          ? site.archives.map((year) => ({
              name: `${year.year}`,
              url: `#year-${year.year}`,
              count: year.count,
            }))
          : [],
    }),
    body: html`
      ${repoHead({ site, name: entry.title, badge: `${formatCount(total)}개` })}
      ${repoBar({
        stats: [
          { icon: 'folder', count: site.archives.length, label: '연도' },
          { icon: 'repo', count: site.categories.length, label: '카테고리', url: '/categories/' },
          { icon: 'hash', count: site.tags.length, label: '태그', url: '/tags/' },
        ],
        actions: [{ icon: 'rss', label: '구독', url: site.config.feed?.path ?? '/feed.xml', primary: true }],
      })}

      <!--
        상자를 달 단위로 쪼갠다. 연도 하나에 다 몰아넣으면 글이 쌓일수록 끝없는
        표 하나가 되고, 어디가 어느 달인지 날짜를 읽어야만 알 수 있다.
      -->
      ${each(site.archives, (year) => html`<section id="year-${year.year}">
        ${each(year.months, (month) => html`<div class="archive-folder" data-reveal>
          ${fileTable({
            posts: month.posts,
            head: folderBar({ path: [`${year.year}`, month.label], count: month.posts.length }),
          })}
        </div>`)}
      </section>`)}
    `,
  });
}
