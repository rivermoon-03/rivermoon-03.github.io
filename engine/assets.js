/**
 * 테마 자산 번들링.
 *
 * 번들러를 쓰지 않는다. CSS는 정해진 순서로 이어붙이고, JS는 각 파일이 독립 IIFE라
 * 그냥 이어붙이면 된다. 이 규모에서 esbuild/rollup을 얹으면 설정과 의존성만 늘고
 * 얻는 게 없다. 검색도 외부 라이브러리 없이 직접 구현했다.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { writePage, copyPassthrough } from './emit.js';

/**
 * CSS 순서에는 의미가 있다. 뒤에 오는 파일이 앞을 덮어쓴다.
 * tokens 가 가장 먼저 와야 나머지가 변수를 쓸 수 있다.
 */
const STYLE_ORDER = [
  'tokens.css',
  'reset.css',
  'base.css',
  'glass.css',
  'layout.css',
  'components.css',
  'prose.css',
  'code.css',
  'search.css',
  'reading.css',
  // motion 은 마지막. 앞선 컴포넌트의 전환·변형을 덮어써야 한다.
  'motion.css',
];

/** JS 는 의존 관계가 없어 순서가 자유롭지만, 읽기 좋게 고정해둔다. */
const SCRIPT_ORDER = [
  'theme-toggle.js',
  'glass.js',
  'copy-code.js',
  'toc.js',
  'search.js',
  'motion.js',
  'reading.js',
  'lightbox.js',
  'shortcuts.js',
  'pwa.js',
];

/** 파일들을 구분 주석과 함께 이어붙인다. 존재하지 않는 파일은 건너뛴다. */
function concat(dir, files, comment) {
  const parts = [];
  for (const name of files) {
    const path = join(dir, name);
    if (!existsSync(path)) continue;
    parts.push(`${comment(name)}\n${readFileSync(path, 'utf8').trim()}`);
  }
  return `${parts.join('\n\n')}\n`;
}

/**
 * 개행과 들여쓰기만 걷어내는 아주 얕은 CSS 압축.
 * 문자열/URL 안의 내용을 건드리지 않도록 주석 제거만 하고 공백은 보수적으로 줄인다.
 */
function squeezeCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/\s*\n\s*/gu, '\n')
    .replace(/\n{2,}/gu, '\n')
    .trim();
}

/**
 * 테마의 CSS/JS/정적 자산을 산출물에 쓴다.
 *
 * @param {{themeDir: string, outDir: string, minify?: boolean}} input
 * @returns {{css: number, js: number, hash: string}}
 *   hash 는 서비스 워커 캐시 버전으로 쓴다 — 내용이 같으면 값도 같아야
 *   빌드마다 사용자 캐시가 불필요하게 날아가지 않는다.
 */
export function buildThemeAssets({ themeDir, outDir, minify = true }) {
  const css = concat(join(themeDir, 'styles'), STYLE_ORDER, (name) => `/* ── ${name} ── */`);
  const js = concat(join(themeDir, 'scripts'), SCRIPT_ORDER, (name) => `// ── ${name} ──`);

  const cssOut = minify ? squeezeCss(css) : css;

  writePage(outDir, '/assets/css/theme.css', cssOut);
  writePage(outDir, '/assets/js/app.js', js);

  // theme/assets/* (아이콘 등)를 /assets/ 아래로 그대로 옮긴다.
  const assetsDir = join(themeDir, 'assets');
  if (existsSync(assetsDir)) {
    for (const name of readdirSync(assetsDir)) {
      copyPassthrough(assetsDir, join(outDir, 'assets'), [name]);
    }
  }

  return {
    css: Buffer.byteLength(cssOut),
    js: Buffer.byteLength(js),
    hash: createHash('sha256').update(cssOut).update(js).digest('hex').slice(0, 12),
  };
}
