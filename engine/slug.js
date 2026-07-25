/**
 * Jekyll 호환 slugify 및 파일명 → 슬러그 변환.
 *
 * 기존 사이트의 URL을 한 글자도 바꾸지 않고 이전하기 위한 모듈이다.
 * Jekyll 소스(lib/jekyll/utils.rb, lib/jekyll/drops/url_drop.rb)의 동작을
 * 그대로 옮긴 것이므로, 여기 있는 규칙은 취향이 아니라 사양이다.
 * 수정하기 전에 engine/__tests__/slug.test.js 를 먼저 볼 것.
 */

/** Jekyll Utils::SLUGIFY_*_REGEXP 이식. Ruby의 유니코드 속성을 그대로 옮겼다. */
const REPLACEABLE = {
  raw: /\s+/gu,
  default: /[^\p{M}\p{L}\p{Nd}]+/gu,
  pretty: /[^\p{M}\p{L}\p{Nd}._~!$&'()+,;=@]+/gu,
  ascii: /[^A-Za-z0-9]+/gu,
};

/**
 * Jekyll `Utils.slugify` 이식.
 *
 * @param {string | null | undefined} string
 * @param {{ mode?: keyof typeof REPLACEABLE, cased?: boolean }} [options]
 *   mode 기본값 'default'. cased=true 면 대소문자를 보존한다.
 * @returns {string | null}
 */
export function slugify(string, { mode = 'default', cased = false } = {}) {
  if (string === null || string === undefined) return null;

  const replaceable = REPLACEABLE[mode];
  // 알 수 없는 모드는 Jekyll과 동일하게 통째로 통과시킨다.
  if (!replaceable) return cased ? string : string.toLowerCase();

  let slug = string.replace(replaceable, '-');
  slug = slug.replace(/^-|-$/gu, '');
  return cased ? slug : slug.toLowerCase();
}

/** `_posts/백준/2026-02-22-제목.md` 형태에서 날짜와 슬러그를 뜯어낸다. */
const DATE_FILENAME_MATCHER = /^(?:.+\/)*(\d{2,4}-\d{1,2}-\d{1,2})-(.*)(\.[^.]+)$/u;
/** 날짜 접두사가 없는 문서(_tabs 등)용. */
const SLUGGED_FILENAME_MATCHER = /^(?:.+\/)*(.*)(\.[^.]+)$/u;

/**
 * 소스 경로에서 Jekyll의 `page.slug`(= 원본 파일명 조각)와 날짜를 뽑는다.
 *
 * 주의: 여기서 나오는 rawSlug 는 아직 slugify 되지 않은 원본이다.
 * Jekyll도 `data["slug"]` 에 가공하지 않은 값을 넣고, URL을 만들 때 비로소
 * slugify 를 적용한다. 이 2단계를 합치면 안 된다.
 *
 * @param {string} sourcePath 저장소 루트 기준 상대 경로
 * @returns {{ rawSlug: string, dateFromFilename: string | null, ext: string }}
 */
export function parseSourcePath(sourcePath) {
  const normalized = sourcePath.replace(/\\/gu, '/');

  const dated = DATE_FILENAME_MATCHER.exec(normalized);
  if (dated) {
    return { rawSlug: dated[2], dateFromFilename: dated[1], ext: dated[3] };
  }

  const slugged = SLUGGED_FILENAME_MATCHER.exec(normalized);
  if (slugged) {
    return { rawSlug: slugged[1], dateFromFilename: null, ext: slugged[2] };
  }

  return { rawSlug: normalized, dateFromFilename: null, ext: '' };
}

/**
 * Jekyll 퍼머링크의 `:title` 치환값.
 *
 * `UrlDrop#title` 은 mode 'pretty' + cased:true 를 쓴다. 즉 **대소문자가 보존되고**
 * `._~!$&'()+,;=@` 도 살아남는다. 이 사이트에는 `/posts/Path-Paramater-...` 처럼
 * 대문자가 들어간 URL이 실제로 존재하므로, 여기서 소문자로 내리면 404가 난다.
 *
 * @param {string} rawSlug parseSourcePath 가 돌려준 값
 * @returns {string}
 */
export function permalinkTitle(rawSlug) {
  return slugify(rawSlug, { mode: 'pretty', cased: true }) ?? '';
}

/**
 * 카테고리/태그 이름 → URL 조각.
 * Chirpy 레이아웃이 쓰던 `{{ name | slugify }}` 와 동일하게 default 모드 + 소문자.
 *
 * @param {string} name
 * @returns {string}
 */
export function taxonomySlug(name) {
  return slugify(name, { mode: 'default' }) ?? '';
}

/**
 * 포스트 소스 경로 → 사이트 내 URL 경로.
 * 퍼머링크 규칙은 `_config.yml` 의 `/posts/:title/` 를 그대로 따른다.
 *
 * @param {string} sourcePath
 * @returns {string} 예: `/posts/백준-2745-진법-변환/`
 */
export function postUrl(sourcePath) {
  const { rawSlug } = parseSourcePath(sourcePath);
  return `/posts/${permalinkTitle(rawSlug)}/`;
}
