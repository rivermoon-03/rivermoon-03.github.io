/**
 * 콘텐츠 수집과 프론트매터 파싱.
 *
 * 여기서는 파일을 읽어 구조화하기만 한다. URL 계산은 slug.js, 마크다운 변환은
 * markdown.js, 관계 계산은 model.js 담당이다.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { parse as parseYaml } from 'yaml';

/** `---` 로 감싼 YAML 프론트매터와 본문을 분리한다. */
const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/u;

/**
 * @param {string} raw 파일 전체 내용
 * @returns {{ data: Record<string, unknown>, body: string }}
 */
export function splitFrontMatter(raw) {
  // BOM 이 있으면 정규식이 어긋난다.
  const text = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  const match = FRONT_MATTER.exec(text);
  if (!match) return { data: {}, body: text };

  const data = parseYaml(match[1]) ?? {};
  return {
    data: typeof data === 'object' && !Array.isArray(data) ? data : {},
    body: text.slice(match[0].length),
  };
}

/**
 * 프론트매터의 날짜를 Date 로 정규화한다.
 *
 * 이 저장소에는 세 가지 형태가 섞여 있다:
 *   date: 2026-02-03 00:00:00 +0900      (따옴표 없음)
 *   date: "2026-03-20 17:27:37 +0900"    (따옴표 있음)
 *   date: 2026-02-04 17:00:00 +0900
 * YAML 파서가 어떤 건 Date 로, 어떤 건 문자열로 돌려주므로 양쪽 다 받는다.
 *
 * @param {unknown} value
 * @param {string | null} fallbackFromFilename `YYYY-M-D`
 * @returns {Date | null}
 */
export function normalizeDate(value, fallbackFromFilename = null) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  if (typeof value === 'string') {
    const text = value.trim();
    // `2026-03-20 17:27:37 +0900` → `2026-03-20T17:27:37+09:00`
    const iso = text
      .replace(/^(\d{4}-\d{2}-\d{2})[ T]/u, '$1T')
      .replace(/\s*([+-])(\d{2}):?(\d{2})$/u, '$1$2:$3');
    const parsed = new Date(iso);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  if (fallbackFromFilename) {
    // 파일명 날짜는 타임존이 없다. 사이트 기준(KST)으로 자정 취급.
    const [y, m, d] = fallbackFromFilename.split('-').map(Number);
    const parsed = new Date(
      `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T00:00:00+09:00`
    );
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  return null;
}

/** 프론트매터의 스칼라/배열 혼용 필드를 항상 배열로 만든다. */
export function toArray(value) {
  if (value === null || value === undefined) return [];
  const list = Array.isArray(value) ? value : [value];
  return list
    .map((item) => (typeof item === 'string' ? item.trim() : item))
    .filter((item) => typeof item === 'string' && item.length > 0);
}

/**
 * 디렉토리를 재귀 순회하며 조건에 맞는 파일의 저장소 상대 경로를 모은다.
 *
 * @param {string} rootDir 저장소 루트 절대 경로
 * @param {string} subDir 루트 기준 상대 경로
 * @param {(name: string) => boolean} [accept]
 * @returns {string[]} 저장소 상대 경로 (POSIX 구분자)
 */
export function walk(rootDir, subDir, accept = (name) => name.endsWith('.md')) {
  const absolute = join(rootDir, subDir);

  let stats;
  try {
    stats = statSync(absolute);
  } catch {
    return []; // 없는 디렉토리는 조용히 건너뛴다 (_drafts 등).
  }
  if (!stats.isDirectory()) return [];

  const found = [];
  const visit = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name)
    )) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (accept(entry.name)) found.push(relative(rootDir, full).split(sep).join('/'));
    }
  };
  visit(absolute);
  return found;
}

/**
 * 마크다운 파일 하나를 읽어 프론트매터와 본문으로 만든다.
 *
 * @param {string} rootDir
 * @param {string} sourcePath 저장소 상대 경로
 * @returns {{ sourcePath: string, data: Record<string, unknown>, body: string }}
 */
export function readContentFile(rootDir, sourcePath) {
  const raw = readFileSync(join(rootDir, sourcePath), 'utf8');
  const { data, body } = splitFrontMatter(raw);
  return { sourcePath, data, body };
}

/**
 * 포스트와 페이지 소스를 전부 읽어들인다.
 *
 * @param {string} rootDir
 * @param {import('../site.config.js').default} config
 * @param {{ includeDrafts?: boolean }} [options]
 */
export function loadContent(rootDir, config, { includeDrafts = false } = {}) {
  const posts = walk(rootDir, config.content.posts).map((p) => readContentFile(rootDir, p));
  const pages = walk(rootDir, config.content.pages).map((p) => readContentFile(rootDir, p));
  const drafts = includeDrafts
    ? walk(rootDir, config.content.drafts).map((p) => readContentFile(rootDir, p))
    : [];

  return { posts, pages, drafts };
}
