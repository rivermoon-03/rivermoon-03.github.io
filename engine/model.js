/**
 * Site 모델 구축.
 *
 * 여기서 나오는 객체가 엔진과 테마 사이의 계약이다. 테마는 이 모양만 알면 되고,
 * 엔진 내부 구현은 몰라도 된다. 이 계약이 안정적이어야 테마를 몇 번이든 다시 만들 수 있다.
 */

import { parseSourcePath, permalinkTitle, taxonomySlug } from './slug.js';
import { normalizeDate, toArray } from './load.js';
import { createProcessor, renderMarkdown } from './markdown.js';

/** 한국어 UI 에서 쓰는 월 이름. */
const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

/**
 * 포스트를 참조로 축약한다. 관련글/분류 목록에 본문 HTML 전체를 실어 나를 이유가 없다.
 * 다만 발췌·읽는 시간은 목록에서 바로 쓰이므로 포함한다 — 이게 빠져 있으면
 * 테마가 목록을 그리다 말고 원본 포스트를 되찾아야 한다.
 */
function toRef(post) {
  return {
    slug: post.slug,
    url: post.url,
    title: post.title,
    date: post.date,
    categories: post.categories,
    // 태그도 함께 넘긴다. 분류 페이지가 "이 묶음 안에서 같이 쓰인 분류"를 세려면
    // 참조만 보고 알 수 있어야 한다 — 없으면 테마가 원본 포스트를 되찾아야 한다.
    tags: post.tags,
    excerpt: post.excerpt,
    charCount: post.charCount,
  };
}

/**
 * 마크다운 소스 하나를 Post 로 만든다.
 *
 * @param {{sourcePath: string, data: Record<string, any>, body: string}} source
 * @param {any} processor
 * @param {any} config
 */
async function buildPost(source, processor, config) {
  const { rawSlug, dateFromFilename } = parseSourcePath(source.sourcePath);
  const slug = permalinkTitle(rawSlug);
  const rendered = await renderMarkdown(processor, source.body);

  const date = normalizeDate(source.data.date, dateFromFilename);
  if (!date) {
    throw new Error(`${source.sourcePath}: 날짜를 읽을 수 없다 (front matter의 date 확인)`);
  }

  const image = source.data.image
    ? typeof source.data.image === 'string'
      ? { path: source.data.image, alt: '' }
      : { path: source.data.image.path, alt: source.data.image.alt ?? '' }
    : null;

  return {
    slug,
    url: `/posts/${slug}/`,
    sourcePath: source.sourcePath,

    title: String(source.data.title ?? rawSlug),
    description: source.data.description ? String(source.data.description) : '',
    date,
    lastModified: normalizeDate(source.data.last_modified_at) ?? null,
    categories: toArray(source.data.categories),
    tags: toArray(source.data.tags),
    pin: source.data.pin === true,
    toc: source.data.toc !== false,
    image,
    // 파일명을 바꾸기 전의 주소들. 이미 색인·공유된 링크가 죽지 않도록
    // 여기 적힌 주소마다 리다이렉트 페이지를 만든다.
    redirectFrom: toArray(source.data.redirect_from),

    html: rendered.html,
    excerpt: source.data.description ? String(source.data.description) : rendered.excerpt,
    headings: rendered.toc,
    charCount: rendered.charCount,

    prev: null,
    next: null,
    related: [],
  };
}

/**
 * `_tabs/*.md` 하나를 Page 로 만든다.
 */
async function buildPage(source, processor, config) {
  const { rawSlug } = parseSourcePath(source.sourcePath);
  const slug = permalinkTitle(rawSlug);
  const rendered = await renderMarkdown(processor, source.body);

  return {
    slug,
    url: `/${slug}/`,
    sourcePath: source.sourcePath,
    title: String(source.data.title ?? slug),
    // `layout: archives` 처럼 Jekyll 시절 레이아웃 지정이 남아 있다.
    // 엔진은 이걸 "이 페이지는 특수 레이아웃" 신호로 그대로 쓴다.
    layout: source.data.layout ? String(source.data.layout) : 'page',
    order: Number(source.data.order ?? 999),
    icon: source.data.icon ? String(source.data.icon) : '',
    html: rendered.html,
    headings: rendered.toc,
  };
}

/**
 * 이름 목록에서 분류 체계를 만든다.
 *
 * @param {any[]} posts
 * @param {'categories' | 'tags'} field
 * @param {string} basePath `/categories` 또는 `/tags`
 * @param {Record<string, string>} [slugMap] 이름 → URL 조각. 화면 이름은 한글,
 *   주소는 영문으로 가르는 장치. 없으면 이름을 그대로 slugify 한다.
 */
function buildTaxonomy(posts, field, basePath, slugMap = {}) {
  /** @type {Map<string, {name: string, slug: string, url: string, posts: any[]}>} */
  const byName = new Map();

  for (const post of posts) {
    for (const name of post[field]) {
      const slug = slugMap[name] ?? taxonomySlug(name);
      // 슬러그가 비면 URL을 만들 수 없다. (기존 `tags: [.]` 오타가 이 경우다.)
      if (!slug) continue;

      if (!byName.has(name)) {
        byName.set(name, { name, slug, url: `${basePath}/${slug}/`, posts: [] });
      }
      byName.get(name).posts.push(toRef(post));
    }
  }

  return [...byName.values()]
    .map((entry) => ({ ...entry, count: entry.posts.length }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ko'));
}

/** 연도 → 월 → 포스트 로 묶는다. */
function buildArchives(posts) {
  /** @type {Map<number, Map<number, any[]>>} */
  const byYear = new Map();

  for (const post of posts) {
    const year = post.date.getFullYear();
    const month = post.date.getMonth();
    if (!byYear.has(year)) byYear.set(year, new Map());
    const months = byYear.get(year);
    if (!months.has(month)) months.set(month, []);
    months.get(month).push(toRef(post));
  }

  return [...byYear.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, months]) => ({
      year,
      count: [...months.values()].reduce((sum, list) => sum + list.length, 0),
      months: [...months.entries()]
        .sort((a, b) => b[0] - a[0])
        .map(([month, list]) => ({ month: month + 1, label: MONTHS[month], posts: list })),
    }));
}

/**
 * 카테고리·태그 겹침 점수로 관련 글을 고른다.
 * 카테고리 일치에 더 큰 가중치를 준다 — 이 블로그는 카테고리가 곧 주제다.
 */
function attachRelated(posts, limit = 4) {
  for (const post of posts) {
    const scored = [];
    for (const other of posts) {
      if (other.slug === post.slug) continue;

      const sharedCategories = other.categories.filter((c) => post.categories.includes(c)).length;
      const sharedTags = other.tags.filter((t) => post.tags.includes(t)).length;
      const score = sharedCategories * 3 + sharedTags;
      if (score > 0) scored.push({ post: other, score });
    }

    post.related = scored
      .sort((a, b) => b.score - a.score || b.post.date - a.post.date)
      .slice(0, limit)
      .map((entry) => toRef(entry.post));
  }
}

/**
 * 홈 목록을 페이지 단위로 자른다.
 * 1페이지는 `/`, 2페이지부터 `/pageN/` — Jekyll 시절 URL을 그대로 유지한다.
 */
export function paginate(posts, { perPage, firstPageUrl, pageUrl }) {
  const total = Math.max(1, Math.ceil(posts.length / perPage));

  return Array.from({ length: total }, (_, index) => {
    const number = index + 1;
    return {
      number,
      total,
      url: number === 1 ? firstPageUrl : pageUrl(number),
      posts: posts.slice(index * perPage, (index + 1) * perPage),
      prevUrl: number === 1 ? null : number === 2 ? firstPageUrl : pageUrl(number - 1),
      nextUrl: number === total ? null : pageUrl(number + 1),
    };
  });
}

/**
 * 로드된 소스로부터 Site 전체를 구축한다.
 *
 * @param {{ rootDir: string, config: any, content: {posts: any[], pages: any[], drafts: any[]} }} input
 */
export async function buildSite({ rootDir, config, content }) {
  const processor = await createProcessor({ rootDir, config });

  const posts = [];
  for (const source of [...content.posts, ...content.drafts]) {
    posts.push(await buildPost(source, processor, config));
  }
  // 최신순. 같은 날짜면 파일 경로로 안정 정렬해서 빌드가 결정적이도록 한다.
  posts.sort((a, b) => b.date - a.date || a.sourcePath.localeCompare(b.sourcePath));

  // 고정글을 앞으로 올린 목록. 원본 시간순은 prev/next 계산에 그대로 쓴다.
  const listed = [...posts].sort((a, b) => Number(b.pin) - Number(a.pin));

  for (let i = 0; i < posts.length; i += 1) {
    posts[i].next = i > 0 ? toRef(posts[i - 1]) : null; // 더 최신 글
    posts[i].prev = i < posts.length - 1 ? toRef(posts[i + 1]) : null; // 더 오래된 글
  }
  attachRelated(posts);

  const pages = [];
  for (const source of content.pages) {
    pages.push(await buildPage(source, processor, config));
  }
  pages.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'ko'));

  const slugMap = config.taxonomySlugs ?? {};
  const categories = buildTaxonomy(posts, 'categories', '/categories', slugMap);
  const tags = buildTaxonomy(posts, 'tags', '/tags', slugMap);

  // 테마가 이름만 들고 URL을 다시 조립하지 않도록 참조를 붙여준다.
  // slugify 규칙이 한 군데(engine)에만 존재해야 URL이 어긋나지 않는다.
  const urlByName = (list) => new Map(list.map((entry) => [entry.name, entry.url]));
  const categoryUrls = urlByName(categories);
  const tagUrls = urlByName(tags);
  for (const post of posts) {
    post.categoryRefs = post.categories
      .map((name) => ({ name, url: categoryUrls.get(name) }))
      .filter((ref) => ref.url);
    post.tagRefs = post.tags
      .map((name) => ({ name, url: tagUrls.get(name) }))
      .filter((ref) => ref.url);
  }

  return {
    config,
    posts,
    listed,
    pages,
    categories,
    tags,
    archives: buildArchives(posts),
    pagination: paginate(listed, config.pagination),
    buildTime: new Date(),
  };
}
