#!/usr/bin/env node
/**
 * 커맨드라인 진입점.
 *
 *   node engine/cli.js build         산출물 생성
 *   node engine/cli.js verify-urls   기존 URL이 전부 살아있는지 검증
 *   node engine/cli.js dev           개발 서버
 */

import { existsSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from './build.js';
import { urlToFilePath } from './emit.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

const GREEN = '[32m';
const RED = '[31m';
const DIM = '[2m';
const RESET = '[0m';

async function loadProject() {
  const { default: config } = await import(join(ROOT, 'site.config.js'));
  const theme = await import(join(ROOT, 'theme/index.js'));
  return { config, theme };
}

function formatBytes(bytes) {
  return bytes < 1024 ? `${bytes}B` : `${(bytes / 1024).toFixed(1)}KB`;
}

/**
 * @param {{dev?: boolean} & Record<string, unknown>} options
 *   dev:true 면 초안 포함·압축 없음·광고 없음으로 만들고 배포용과 다른 디렉토리에 쓴다.
 */
async function commandBuild({ dev = false, ...rest } = {}) {
  const { config, theme } = await loadProject();

  const options = dev
    ? {
        drafts: true,
        minify: false,
        lastmod: false,
        ads: false,
        outDir: config.devOutDir ?? '.dev-site',
        ...rest,
      }
    : rest;

  const { stats } = await build({ rootDir: ROOT, config, theme, options });

  console.log(`${GREEN}✓${RESET} 빌드 완료 ${DIM}${stats.durationMs}ms${RESET}`);
  console.log(`  포스트 ${stats.posts} · 페이지 ${stats.pages} · 라우트 ${stats.routes}`);
  console.log(`  카테고리 ${stats.categories} · 태그 ${stats.tags}`);
  console.log(`  CSS ${formatBytes(stats.assets.css)} · JS ${formatBytes(stats.assets.js)}`);
  console.log(`  통과 자산 ${stats.passthrough.copied.length}개`);

  if (stats.passthrough.missing.length) {
    console.warn(`${RED}!${RESET} 통과 자산 누락: ${stats.passthrough.missing.join(', ')}`);
  }
  return 0;
}

/**
 * 전환 안전벨트.
 *
 * 라이브 사이트에 존재하던 URL이 새 산출물에도 전부 있는지 확인한다.
 * 하나라도 빠지면 0이 아닌 코드로 끝나므로 CI 가 배포를 막는다.
 * 이 검사가 있어서 "URL이 조용히 깨지는" 사고가 구조적으로 불가능해진다.
 */
async function commandVerifyUrls() {
  const { config, theme } = await loadProject();
  const outDir = join(ROOT, config.outDir);

  // 산출물이 없으면 먼저 만든다. CI 에서 build 다음에 부르지만, 단독 실행도 되게.
  if (!existsSync(outDir)) {
    await build({ rootDir: ROOT, config, theme });
  }

  const fixturePath = join(ROOT, 'engine/__fixtures__/live-urls.txt');
  const expected = readFileSync(fixturePath, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));

  const missing = expected.filter((url) => !existsSync(urlToFilePath(outDir, url)));

  if (missing.length) {
    console.error(`${RED}✗${RESET} 라이브 URL ${missing.length}/${expected.length}개가 산출물에 없다:`);
    for (const url of missing) console.error(`    ${url}`);
    console.error('\n  이대로 배포하면 해당 주소가 404가 된다. 라우팅을 고치기 전엔 배포 금지.');
    return 1;
  }

  console.log(`${GREEN}✓${RESET} 라이브 URL ${expected.length}/${expected.length}개 모두 존재`);
  return 0;
}

/**
 * 내부 링크 검증. Jekyll 시절 CI 에 있던 html-proofer 를 대신한다.
 *
 * 산출물의 모든 HTML을 훑어 사이트 내부 링크(href/src)가 실제 파일을 가리키는지
 * 확인한다. 외부 링크는 검사하지 않는다 — 남의 서버 사정으로 우리 배포가 막히면 안 된다.
 */
async function commandVerifyLinks() {
  const { config, theme } = await loadProject();
  const outDir = join(ROOT, config.outDir);

  if (!existsSync(outDir)) {
    await build({ rootDir: ROOT, config, theme });
  }

  const { readdirSync, statSync } = await import('node:fs');
  const htmlFiles = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.html')) htmlFiles.push(full);
    }
  };
  walk(outDir);

  /** @type {Map<string, Set<string>>} 끊긴 링크 → 그걸 담고 있는 페이지들 */
  const broken = new Map();
  let checked = 0;

  for (const file of htmlFiles) {
    const html = readFileSync(file, 'utf8');
    const source = `/${relative(outDir, file)}`;

    for (const match of html.matchAll(/(?:href|src)="([^"]+)"/gu)) {
      const target = match[1];
      // 외부·프로토콜·앵커·데이터 URL 은 검사 대상이 아니다.
      if (!target.startsWith('/') || target.startsWith('//')) continue;

      const pathOnly = decodeURIComponent(target.split(/[?#]/u)[0]);
      if (!pathOnly || pathOnly === '/') continue;
      checked += 1;

      const candidate = urlToFilePath(outDir, pathOnly);
      const exists = existsSync(candidate) && statSync(candidate).isFile();
      if (!exists) {
        if (!broken.has(pathOnly)) broken.set(pathOnly, new Set());
        broken.get(pathOnly).add(source);
      }
    }
  }

  if (broken.size) {
    console.error(`${RED}✗${RESET} 끊긴 내부 링크 ${broken.size}개:`);
    for (const [target, sources] of broken) {
      console.error(`    ${target}`);
      for (const source of [...sources].slice(0, 3)) console.error(`      ← ${source}`);
    }
    return 1;
  }

  console.log(
    `${GREEN}✓${RESET} 내부 링크 ${checked}개 이상 없음 ${DIM}(HTML ${htmlFiles.length}개)${RESET}`
  );
  return 0;
}

async function commandDev() {
  const { config } = await loadProject();
  const { startDevServer } = await import('./dev.js');
  await startDevServer({ rootDir: ROOT, outDirName: config.devOutDir ?? '.dev-site' });
  return 0;
}

const COMMANDS = {
  build: () => commandBuild({ drafts: false }),
  'build:dev': () => commandBuild({ dev: true }),
  'verify-urls': commandVerifyUrls,
  'verify-links': commandVerifyLinks,
  dev: commandDev,
};

const command = process.argv[2] ?? 'build';
const handler = COMMANDS[command];

if (!handler) {
  console.error(`알 수 없는 명령: ${command}`);
  console.error(`사용 가능: ${Object.keys(COMMANDS).join(', ')}`);
  process.exit(2);
}

try {
  process.exitCode = await handler();
} catch (error) {
  console.error(`${RED}✗${RESET} ${error.message}`);
  if (process.env.DEBUG) console.error(error.stack);
  process.exitCode = 1;
}
