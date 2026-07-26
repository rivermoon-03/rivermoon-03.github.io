/**
 * 홈 오른쪽 레일 — 활동 그래프 + 저장소(카테고리) 목록.
 *
 * 이 블로그는 글의 절반 이상이 백준 풀이라 "무엇을 얼마나 꾸준히 했는가"가
 * 목록보다 먼저 읽히는 편이 낫다. 그래서 GitHub 프로필의 구조를 그대로 빌린다:
 *   1. 기여 그래프 → 글을 쓴 날의 잔디
 *   2. 저장소 목록 → 카테고리. 펼치면 그 안의 글이 파일처럼 나온다
 *   3. 토픽 → 태그
 *
 * 전부 빌드 타임에 계산된다. 외부 API도, 클라이언트 JS도 쓰지 않는다.
 * 펼치기는 `<details>` 라 스크립트 없이 동작하고 키보드로도 열린다.
 */

import { html, each, when, raw } from '../../engine/html.js';
import { repoCard, topicList } from './repo.js';
import { formatDate, isoDate } from './format.js';

/** 잔디에 보여줄 기간. 레일 폭(약 19rem)에 셀이 뭉개지지 않고 들어가는 한계다. */
const WEEKS = 26;
const DAY_MS = 86_400_000;

/**
 * 하루 단위 계산은 전부 KST 달력 날짜(YYYY-MM-DD)를 키로 삼는다.
 * Date 객체의 로컬 시간에 기대면 빌드가 도는 러너의 타임존에 따라 잔디가
 * 하루씩 밀린다. 키를 UTC 자정으로 되돌려서 요일·덧셈만 계산한다.
 */
const dayKey = (date) => isoDate(date);
const fromKey = (key) => new Date(`${key}T00:00:00Z`);
const shiftDays = (date, days) => new Date(date.getTime() + days * DAY_MS);

/** 날짜별 글 수. */
function countByDay(posts) {
  const counts = new Map();
  for (const post of posts) {
    const key = dayKey(post.date);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/** 글을 쓴 날이 며칠이나 이어졌는지. 하루라도 비면 끊긴다. */
function longestStreak(counts) {
  const keys = [...counts.keys()].sort();
  let best = 0;
  let run = 0;
  let previous = null;

  for (const key of keys) {
    const day = fromKey(key);
    run = previous && day.getTime() - previous.getTime() === DAY_MS ? run + 1 : 1;
    previous = day;
    if (run > best) best = run;
  }
  return best;
}

/** 글 수 → 잔디 농도(0~3). GitHub 은 5단계지만 이 규모에선 4단계로 충분하다. */
function level(count) {
  if (!count) return 0;
  return Math.min(count, 3);
}

/**
 * 기여 그래프. 세로 7칸(일~토) × 가로 WEEKS 칸.
 *
 * 마지막 열이 이번 주가 되도록 토요일까지 채우고 거기서 거꾸로 센다.
 * 오늘 이후 칸은 GitHub 처럼 비워 둔다 — 0개인 날과 아직 오지 않은 날은 다르다.
 */
function activityPanel({ site }) {
  const counts = countByDay(site.posts);
  const today = fromKey(dayKey(site.buildTime ?? new Date()));
  const end = shiftDays(today, 6 - today.getUTCDay());
  const start = shiftDays(end, -(WEEKS * 7 - 1));

  const cells = [];
  const monthLabels = [];
  let windowTotal = 0;
  let lastMonth = -1;

  for (let week = 0; week < WEEKS; week += 1) {
    const columnStart = shiftDays(start, week * 7);
    const month = columnStart.getUTCMonth();
    // 달이 바뀌는 열에 이름표를 세운다. 마지막 두 열은 글자가 잘려서 건너뛴다.
    if (month !== lastMonth && week < WEEKS - 2) {
      monthLabels.push({ column: week + 1, label: `${month + 1}월` });
      lastMonth = month;
    }

    for (let weekday = 0; weekday < 7; weekday += 1) {
      const day = shiftDays(columnStart, weekday);
      const future = day.getTime() > today.getTime();
      const count = future ? 0 : (counts.get(dayKey(day)) ?? 0);
      windowTotal += count;
      cells.push({ day, count, future });
    }
  }

  const total = site.posts.length;
  const streak = longestStreak(counts);
  const summary = `지난 ${WEEKS}주 동안 쓴 글 ${windowTotal}개`;

  return html`<section class="rail-panel">
  <h2 class="rail-panel__title">활동</h2>

  <div class="grass" style="--grass-weeks: ${WEEKS}">
    <div class="grass__months" aria-hidden="true">
      ${each(
        monthLabels,
        (entry) => html`<span style="grid-column: ${entry.column}">${entry.label}</span>`
      )}
    </div>
    <div class="grass__grid" role="img" aria-label="${summary}">
      ${each(
        cells,
        (cell) =>
          html`<span
            class="grass__cell${cell.future ? ' grass__cell--future' : ''}"
            data-level="${level(cell.count)}"
            ${when(!cell.future, () => raw(`title="${formatDate(cell.day)} · 글 ${cell.count}개"`))}
          ></span>`
      )}
    </div>
  </div>

  <p class="grass__legend" aria-hidden="true">
    <span>적음</span>
    <span class="grass__cell" data-level="0"></span>
    <span class="grass__cell" data-level="1"></span>
    <span class="grass__cell" data-level="2"></span>
    <span class="grass__cell" data-level="3"></span>
    <span>많음</span>
  </p>

  <p class="rail-panel__note">
    ${summary}${when(windowTotal !== total, () => html` · 전체 ${total}개`)}${when(
      streak > 1,
      () => html` · 최장 ${streak}일 연속`
    )}
  </p>
</section>`;
}

/** 저장소 하나에 접어 넣을 글 수. 넘치면 카테고리 페이지로 보낸다. */
const FILES_PER_REPO = 6;

/**
 * 카테고리 = 저장소.
 *
 * 카드 자체는 `/categories/` 와 공유한다 (partials/repo.js). 여기서 정하는 건
 * 무엇을 몇 개까지 접어 넣을지뿐이다.
 */
function repoPanel({ site }) {
  const meta = site.config.categoryMeta ?? {};
  const owner = site.config.author?.github ?? site.config.author?.name ?? '';

  return html`<section class="rail-panel">
  <h2 class="rail-panel__title">
    저장소
    <a class="rail-panel__more" href="/categories/">전체 ${site.categories.length}</a>
  </h2>

  <ul class="repo-list">
    ${each(site.categories, (category, index) =>
      repoCard({
        entry: category,
        index,
        owner,
        description: meta[category.name]?.description ?? '',
        limit: FILES_PER_REPO,
      })
    )}
  </ul>
</section>`;
}

/** 태그 = 토픽. GitHub 프로필 아래쪽의 토픽 칩 줄에 해당한다. */
function topicPanel({ site }) {
  if (!site.tags.length) return '';

  return html`<section class="rail-panel">
  <h2 class="rail-panel__title">
    토픽
    <a class="rail-panel__more" href="/tags/">전체 ${site.tags.length}</a>
  </h2>
  ${topicList({ topics: site.tags })}
</section>`;
}

/**
 * 홈 본문 옆에 붙는 레일 전체.
 * @param {{site: any}} input
 */
export function homeRail({ site }) {
  return html`<div class="home-rail">
  ${activityPanel({ site })}
  ${repoPanel({ site })}
  ${topicPanel({ site })}
</div>`;
}
