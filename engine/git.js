/**
 * git 히스토리에서 마지막 수정 시각을 읽는다.
 *
 * Jekyll 시절 `_plugins/posts-lastmod-hook.rb` 가 하던 일을 옮긴 것이다.
 * 커밋이 2개 이상인 파일만 "수정됨"으로 본다 — 최초 작성 커밋 하나뿐이면
 * 발행일과 같은 값이라 표시할 이유가 없다.
 *
 * 주의: CI 에서 `fetch-depth: 0` 이 아니면 히스토리가 얕아 결과가 부정확해진다.
 */

import { execFileSync } from 'node:child_process';

/** 파일 하나당 git 을 두 번 부르면 느리므로, 한 번에 전부 읽는다. */
export function readLastModified(rootDir, paths) {
  /** @type {Map<string, Date>} */
  const result = new Map();
  if (!paths.length) return result;

  for (const path of paths) {
    try {
      // `--follow` 는 이름이 바뀐 파일도 추적하지만 느리다. 이 저장소엔 불필요.
      const log = execFileSync(
        'git',
        ['log', '--pretty=format:%aI', '--', path],
        { cwd: rootDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
      )
        .split('\n')
        .filter(Boolean);

      if (log.length > 1) {
        const date = new Date(log[0]);
        if (!Number.isNaN(date.getTime())) result.set(path, date);
      }
    } catch {
      // git 이 없거나 저장소가 아니면 조용히 넘어간다. 빌드를 막을 이유는 없다.
    }
  }

  return result;
}
