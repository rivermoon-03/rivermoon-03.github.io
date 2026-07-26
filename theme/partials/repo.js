/**
 * 저장소 뷰 — GitHub 의 저장소 화면을 블로그에 옮긴 조각들.
 *
 * 카테고리·태그·아카이브는 결국 "글 묶음 하나를 열어 안을 훑는다"는 같은 일이다.
 * GitHub 의 Code 탭이 정확히 그 일을 하는 화면이라, 구조를 그대로 빌린다:
 *
 *   저장소 이름 + 배지            →  분류 이름 + 종류
 *   Branches / Tags 카운터        →  글 수 / 태그 수
 *   Code 버튼                     →  구독(RSS)
 *   최신 커밋 바                  →  가장 최근 글
 *   파일 목록 (이름·커밋·시각)     →  글 목록 (제목·발췌·날짜)
 *   About 사이드바                →  이 묶음에 대한 요약
 *
 * 시각 표기만 GitHub 과 다르게 간다. "8 months ago" 같은 상대 시각은 빌드 시점에
 * 굳어서 다음 배포까지 계속 틀린 값을 보여준다. 날짜를 그대로 쓴다.
 */

import { html, each, when } from '../../engine/html.js';
import { icons } from './icons.js';
import { formatDate, isoDate, formatCount } from './format.js';

/* ── 저장소 머리 ──────────────────────────────────────────── */

/**
 * `rivermoon-03 / 백준  [카테고리]`
 *
 * @param {{site: any, name: string, badge?: string, prefix?: string}} input
 */
export function repoHead({ site, name, badge = '', prefix = '' }) {
  const owner = site.config.author?.github ?? site.config.author?.name ?? '';

  return html`<header class="repo-head">
  ${icons.repo()}
  <h1 class="repo-head__title">
    ${when(owner, () => html`<a class="repo-head__owner" href="/">${owner}</a><span class="repo-head__slash">/</span>`)}
    <span class="repo-head__name">${prefix}${name}</span>
  </h1>
  ${when(badge, () => html`<span class="repo-head__badge">${badge}</span>`)}
</header>`;
}

/**
 * 머리 아래 도구 줄. 왼쪽은 숫자, 오른쪽은 버튼.
 *
 * GitHub 은 "2 Branches" 처럼 수를 앞에 두지만 한국어는 "글 14개" 라 순서가 반대다.
 * 순서를 억지로 맞추면 "14 글" 이 되어 아무도 그렇게 읽지 않는 문장이 된다.
 *
 * @param {{stats: Array<{icon: string, count: number|string, label: string, unit?: string, url?: string}>,
 *          actions?: Array<{icon: string, label: string, url: string, primary?: boolean}>}} input
 */
export function repoBar({ stats, actions = [] }) {
  return html`<div class="repo-bar">
  <div class="repo-bar__stats">
    ${each(stats, (stat) => {
      const inner = html`${icons[stat.icon]()}<span>${stat.label}</span><strong>${formatCount(stat.count)}${stat.unit ?? '개'}</strong>`;
      return stat.url
        ? html`<a class="repo-bar__stat" href="${stat.url}">${inner}</a>`
        : html`<span class="repo-bar__stat">${inner}</span>`;
    })}
  </div>
  ${when(
    actions.length,
    () => html`<div class="repo-bar__actions">
    ${each(
      actions,
      (action) => html`<a class="repo-btn${action.primary ? ' repo-btn--primary' : ''}" href="${action.url}">
      ${icons[action.icon]()}${action.label}
    </a>`
    )}
  </div>`
  )}
</div>`;
}

/* ── 파일 목록 ────────────────────────────────────────────── */

/**
 * 글 한 줄. GitHub 파일 행의 세 칸 — 이름 / 마지막 커밋 / 시각 — 에 대응한다.
 * 발췌가 커밋 메시지 자리에 들어가서, 제목만으로 판별이 안 되는 글도 목록에서 고를 수 있다.
 */
function fileRow({ post, icon = 'file' }) {
  return html`<li class="filerow">
  <a class="filerow__name" href="${post.url}">
    ${icons[icon]()}<span>${post.title}</span>
  </a>
  <span class="filerow__note">${post.excerpt ?? ''}</span>
  <time class="filerow__time" datetime="${isoDate(post.date)}">${formatDate(post.date)}</time>
</li>`;
}

/**
 * 테두리로 묶인 목록 상자.
 *
 * `head` 는 GitHub 의 최신 커밋 바 자리다. 넘기지 않으면 상자가 목록으로만 시작한다.
 *
 * @param {{posts: any[], head?: unknown, empty?: string}} input
 */
export function fileTable({ posts, head = null, empty = '아직 글이 없다.' }) {
  return html`<div class="filetable">
  ${when(head, () => html`<div class="filetable__head">${head}</div>`)}
  ${posts.length
    ? html`<ul class="filetable__body">${each(posts, (post) => fileRow({ post }))}</ul>`
    : html`<p class="filetable__empty">${empty}</p>`}
</div>`;
}

/**
 * 최신 커밋 바.
 *
 * GitHub 은 여기에 마지막 커밋 메시지를 넣지만, 그대로 옮기면 바로 아래 첫 행과
 * 같은 제목이 두 번 찍힌다 (목록이 최신순이므로 항상 그렇다). 제목 대신 "이 묶음이
 * 언제까지 자랐는지"를 넣는다 — 자리와 정보 밀도는 같고 중복만 없다.
 */
export function latestBar({ site, post, count }) {
  return html`<span class="filetable__author">${site.config.author?.name ?? ''}</span>
<span class="filetable__latest">마지막 글</span>
<time class="filetable__headtime" datetime="${isoDate(post.date)}">${formatDate(post.date)}</time>
<span class="filetable__headcount">${icons.history()}글 ${formatCount(count)}개</span>`;
}

/**
 * 폴더 머리 줄. `2026 / 3월` 처럼 경로로 적어서 디렉토리를 훑는 느낌을 낸다.
 *
 * @param {{path: string[], count: number}} input
 */
export function folderBar({ path, count }) {
  return html`<span class="filetable__folder">
  ${icons.folder()}
  ${each(path, (part, index) =>
    index === 0
      ? html`<span>${part}</span>`
      : html`<span class="filetable__sep">/</span><span>${part}</span>`
  )}
</span>
<span class="filetable__headcount">글 ${formatCount(count)}개</span>`;
}

/* ── About 사이드바 ───────────────────────────────────────── */

/**
 * GitHub 의 About 패널. 설명 + 아이콘 붙은 사실 목록 + 토픽.
 *
 * @param {{description?: string, facts?: Array<{icon: string, text: string, url?: string}>,
 *          topics?: Array<{name: string, url: string, count?: number}>, extra?: unknown}} input
 */
export function aboutPanel({ description = '', facts = [], topics = [], extra = null }) {
  return html`<div class="about">
  <section class="rail-panel">
    <h2 class="rail-panel__title">About</h2>
    ${when(description, () => html`<p class="about__desc">${description}</p>`)}
    <ul class="about__facts">
      ${each(facts, (fact) => {
        const inner = html`${icons[fact.icon]()}<span>${fact.text}</span>`;
        return fact.url
          ? html`<li><a href="${fact.url}">${inner}</a></li>`
          : html`<li>${inner}</li>`;
      })}
    </ul>
  </section>

  ${when(
    topics.length,
    () => html`<section class="rail-panel">
    <h2 class="rail-panel__title">토픽</h2>
    ${topicList({ topics })}
  </section>`
  )}

  ${extra}
</div>`;
}

/** 토픽 칩 목록. 홈 레일과 About 이 같은 것을 쓴다. */
export function topicList({ topics, size = '' }) {
  return html`<ul class="topic-list${size ? ` topic-list--${size}` : ''}">
  ${each(
    topics,
    (topic) => html`<li>
    <a class="topic" href="${topic.url}">
      <span class="topic__name">${topic.name}</span>
      ${when(topic.count, () => html`<span class="topic__count">${formatCount(topic.count)}</span>`)}
    </a>
  </li>`
  )}
</ul>`;
}

/* ── 저장소 카드 ──────────────────────────────────────────── */

/** 카드 안에 접어 넣을 글 수의 기본값. 홈 레일처럼 좁은 자리를 기준으로 잡았다. */
const CARD_FILES = 6;

/**
 * 저장소 카드 하나. 홈 레일과 `/categories/` 가 같은 것을 쓴다.
 *
 * @param {{entry: any, index?: number, description?: string, owner?: string,
 *          limit?: number, icon?: string}} input
 */
export function repoCard({ entry, index = 0, description = '', owner = '', limit = CARD_FILES, icon = 'repo' }) {
  const files = entry.posts.slice(0, limit);
  const rest = entry.posts.length - files.length;

  return html`<li class="repo" style="--repo-dot: var(--repo-dot-${(index % 5) + 1})">
  <div class="repo__head">
    ${icons[icon]()}
    <a class="repo__name" href="${entry.url}">
      ${when(owner, () => html`<span class="repo__owner">${owner} /</span>`)}
      <strong>${entry.name}</strong>
    </a>
    <span class="repo__count" title="글 ${entry.count}개">${entry.count}</span>
  </div>

  ${when(description, () => html`<p class="repo__desc">${description}</p>`)}

  <!--
    GitHub 이라면 여기에 언어 이름이 붙지만, 점 옆에 분류 이름을 또 쓰면 바로 위
    제목과 같은 글자가 두 번 나온다. 색만 남기고 정보는 날짜에 맡긴다.
  -->
  <p class="repo__meta">
    <span class="repo__dot" aria-hidden="true"></span>
    <time datetime="${isoDate(entry.posts[0].date)}">${formatDate(entry.posts[0].date)} 갱신</time>
  </p>

  <details class="repo__files">
    <summary class="repo__toggle">
      ${icons.chevron()}
      <span>글 ${entry.count}개</span>
    </summary>
    <ul class="repo__tree">
      ${each(
        files,
        (post) => html`<li class="repo__file">
        <a href="${post.url}" title="${post.title}">
          ${icons.file()}
          <span class="repo__file-name">${post.title}</span>
        </a>
        <time datetime="${isoDate(post.date)}">${isoDate(post.date).slice(5)}</time>
      </li>`
      )}
      ${when(
        rest > 0,
        () => html`<li class="repo__file repo__file--more">
        <a href="${entry.url}">나머지 ${rest}개 보기 →</a>
      </li>`
      )}
    </ul>
  </details>
</li>`;
}
