/**
 * 산출물 쓰기.
 *
 * GitHub Pages 는 `/foo/` 요청을 `/foo/index.html` 로 서빙하므로,
 * 트레일링 슬래시 URL은 전부 디렉토리 + index.html 로 떨어뜨린다.
 * 아티팩트에 심볼릭 링크가 있으면 Pages 배포가 거부하므로 절대 만들지 않는다.
 */

import { mkdirSync, writeFileSync, rmSync, cpSync, existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * 사이트 URL 경로를 산출물 파일 경로로 바꾼다.
 *
 * @param {string} outDir
 * @param {string} url `/posts/foo/` 또는 `/404.html`
 * @returns {string}
 */
export function urlToFilePath(outDir, url) {
  const clean = url.replace(/^\//u, '');
  // 확장자로 끝나면 그 파일 그대로, 아니면 디렉토리 인덱스.
  const isFile = /\.[a-z0-9]+$/iu.test(clean);
  return join(outDir, isFile ? clean : join(clean, 'index.html'));
}

/** 산출물 디렉토리를 비운다. */
export function cleanOutDir(outDir) {
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
}

/**
 * 텍스트 파일 하나를 쓴다.
 *
 * @param {string} outDir
 * @param {string} url
 * @param {unknown} content html`` 결과나 문자열
 */
export function writePage(outDir, url, content) {
  const target = urlToFilePath(outDir, url);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, String(content), 'utf8');
  return target;
}

/**
 * 변환 없이 그대로 복사할 파일/디렉토리를 옮긴다.
 * 알고리즘 과제·팀플 페이지처럼 독립적인 정적 사이트가 여기 해당한다.
 *
 * @param {string} rootDir
 * @param {string} outDir
 * @param {string[]} entries 저장소 상대 경로
 * @returns {{copied: string[], missing: string[]}}
 */
export function copyPassthrough(rootDir, outDir, entries) {
  const copied = [];
  const missing = [];

  for (const entry of entries) {
    const from = join(rootDir, entry);
    if (!existsSync(from)) {
      missing.push(entry);
      continue;
    }

    const to = join(outDir, entry);
    mkdirSync(dirname(to), { recursive: true });
    // dereference: 심볼릭 링크가 있으면 실제 파일로 풀어서 복사한다.
    // Pages 아티팩트는 링크를 허용하지 않는다.
    cpSync(from, to, {
      recursive: statSync(from).isDirectory(),
      dereference: true,
    });
    copied.push(entry);
  }

  return { copied, missing };
}
