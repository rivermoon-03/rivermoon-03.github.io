/**
 * 분류 체계 레이아웃 — 카테고리/태그의 목록 페이지와 개별 페이지.
 *
 * 목록 페이지는 GitHub 프로필의 저장소 탭, 개별 페이지는 저장소의 Code 탭이다.
 * 조각은 전부 partials/repo.js 에 있고 여기서는 무엇을 넣을지만 정한다.
 */

import { html, each } from '../../engine/html.js';
import { base } from './base.js';
import { repoHead, repoBar, fileTable, latestBar, aboutPanel, repoCard, topicList } from '../partials/repo.js';
import { formatDate, formatCount } from '../partials/format.js';

/** `/categories/` — 카테고리를 저장소 카드로 늘어놓는다. */
export function categories({ site, url, page: entry }) {
  const meta = site.config.categoryMeta ?? {};
  const owner = site.config.author?.github ?? site.config.author?.name ?? '';

  return base({
    site,
    url,
    bodyClass: 'page-repo page-repo--wide',
    meta: { title: entry.title, description: `${site.config.title}의 카테고리 목록` },
    body: html`
      ${repoHead({ site, name: entry.title, badge: `${site.categories.length}개` })}
      ${repoBar({
        stats: [
          { icon: 'repo', count: site.categories.length, label: '카테고리' },
          { icon: 'hash', count: site.tags.length, label: '태그', url: '/tags/' },
          { icon: 'list', count: site.posts.length, label: '글', url: '/archives/' },
        ],
      })}

      <!-- 카드 격자는 GitHub 저장소 탭과 같다. 열 수는 폭에 맞춰 알아서 늘어난다. -->
      <ul class="repo-list repo-list--grid">
        ${each(site.categories, (category, index) =>
          repoCard({
            entry: category,
            index,
            owner,
            description: meta[category.name]?.description ?? '',
            // 목록 페이지는 자리가 넉넉하다. 카드 안에서 글을 다 볼 수 있게 둔다.
            limit: category.posts.length,
          })
        )}
      </ul>
    `,
  });
}

/** `/tags/` — 태그는 저장소가 아니라 토픽이다. GitHub 토픽 칩 그대로. */
export function tags({ site, url, page: entry }) {
  return base({
    site,
    url,
    bodyClass: 'page-repo page-repo--wide',
    meta: { title: entry.title, description: `${site.config.title}의 태그 목록` },
    body: html`
      ${repoHead({ site, name: entry.title, badge: `${site.tags.length}개` })}
      ${repoBar({
        stats: [
          { icon: 'hash', count: site.tags.length, label: '태그' },
          { icon: 'repo', count: site.categories.length, label: '카테고리', url: '/categories/' },
          { icon: 'list', count: site.posts.length, label: '글', url: '/archives/' },
        ],
      })}

      ${topicList({ topics: site.tags, size: 'lg' })}

      <!--
        칩만 두면 "눌러보기 전엔 뭐가 있는지 모르는" 화면이 된다. 태그마다 최근 글
        몇 개를 접어서 붙여 두면 목록 자체로 훑을 수 있다.
      -->
      ${each(
        site.tags,
        (tag) => html`<section class="topic-section" data-reveal>
        ${fileTable({
          posts: tag.posts.slice(0, 5),
          head: html`<span class="filetable__folder">#${tag.name}</span>
<a class="filetable__headcount" href="${tag.url}">글 ${formatCount(tag.count)}개 →</a>`,
        })}
      </section>`
      )}
    `,
  });
}

/** `/categories/<name>/` 또는 `/tags/<name>/`. 저장소의 Code 탭. */
function taxonomyDetail(kind) {
  const isCategory = kind === 'category';

  return ({ site, url, taxonomy }) => {
    const label = isCategory ? '카테고리' : '태그';
    const latest = taxonomy.posts[0];
    const oldest = taxonomy.posts[taxonomy.posts.length - 1];
    const chars = taxonomy.posts.reduce((sum, post) => sum + (post.charCount ?? 0), 0);

    const description = isCategory
      ? (site.config.categoryMeta?.[taxonomy.name]?.description ?? '')
      : `#${taxonomy.name} 태그가 붙은 글.`;

    /*
     * 이 묶음 안에서 같이 쓰인 다른 분류. GitHub About 의 토픽 자리다.
     * 카테고리 페이지에는 태그를, 태그 페이지에는 카테고리를 보여준다 —
     * 자기 자신을 다시 보여주면 눌러도 같은 곳으로 돌아온다.
     */
    const relatedNames = new Set();
    for (const post of taxonomy.posts) {
      for (const name of isCategory ? (post.tags ?? []) : post.categories) {
        if (name !== taxonomy.name) relatedNames.add(name);
      }
    }
    const pool = isCategory ? site.tags : site.categories;
    const related = pool.filter((item) => relatedNames.has(item.name));

    return base({
      site,
      url,
      bodyClass: 'page-repo',
      meta: {
        title: `${taxonomy.name}`,
        description: `${label} '${taxonomy.name}' 의 글 ${taxonomy.count}개`,
      },
      aside: aboutPanel({
        description,
        facts: [
          { icon: 'list', text: `글 ${formatCount(taxonomy.count)}개` },
          { icon: 'pen', text: `${formatCount(chars)}자` },
          {
            icon: 'history',
            text:
              latest === oldest
                ? formatDate(latest.date)
                : `${formatDate(oldest.date)} ~ ${formatDate(latest.date)}`,
          },
          { icon: 'rss', text: '구독', url: site.config.feed?.path ?? '/feed.xml' },
        ],
        topics: related,
      }),
      body: html`
        ${repoHead({ site, name: taxonomy.name, prefix: isCategory ? '' : '#', badge: label })}
        ${repoBar({
          stats: [
            { icon: 'list', count: taxonomy.count, label: '글' },
            ...(related.length
              ? [
                  {
                    icon: isCategory ? 'hash' : 'repo',
                    count: related.length,
                    label: isCategory ? '태그' : '카테고리',
                  },
                ]
              : []),
          ],
          actions: [
            { icon: 'history', label: '아카이브', url: '/archives/' },
            { icon: 'rss', label: '구독', url: site.config.feed?.path ?? '/feed.xml', primary: true },
          ],
        })}

        <!-- 함께 쓰인 분류는 About 의 토픽 자리에만 둔다. 본문에도 깔면 같은 칩이 두 번 나온다. -->
        ${fileTable({
          posts: taxonomy.posts,
          head: latestBar({ site, post: latest, count: taxonomy.count }),
        })}
      `,
    });
  };
}

export const category = taxonomyDetail('category');
export const tag = taxonomyDetail('tag');
