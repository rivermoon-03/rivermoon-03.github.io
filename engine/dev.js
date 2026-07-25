/**
 * 개발 서버.
 *
 * 이걸 만드는 게 이번 이전(移轉)의 실질적 동기 중 하나였다. 기존 Jekyll 구성은
 * 로컬에 Ruby 가 없어 `bundle exec jekyll serve` 가 아예 실행되지 않았고,
 * 결과를 CI 배포 후에야 확인할 수 있었다.
 *
 * 의존성 없이 node 내장 모듈만 쓴다. 라이브리로드는 SSE 한 줄로 끝난다.
 */

import { createServer } from 'node:http';
import { watch } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { join, extname } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const PORT = Number(process.env.PORT ?? 4321);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

/** 변경을 알리면 브라우저가 새로고침한다. 개발 빌드에만 주입된다. */
const LIVE_RELOAD = `<script>
(function(){var s=new EventSource('/__reload');s.onmessage=function(){location.reload()};})()
</script>`;

/** 감시할 경로. 이 밖의 변경은 무시한다. */
const WATCHED = ['_posts', '_tabs', '_drafts', 'theme', 'engine', 'site.config.js'];

export async function startDevServer({ rootDir, outDirName = '.dev-site' }) {
  const outDir = join(rootDir, outDirName);
  /** @type {Set<import('node:http').ServerResponse>} */
  const clients = new Set();
  let building = false;
  let pending = false;

  /**
   * 빌드는 자식 프로세스에서 돌린다.
   *
   * 같은 프로세스 안에서 `import(...?v=stamp)` 로 캐시를 비우려 해봤지만,
   * 쿼리는 진입 모듈에만 붙고 그 안의 정적 import 는 기존 URL 그대로 해석되어
   * 캐시된 구버전이 계속 쓰인다 (테마 레이아웃을 고쳐도 반영되지 않음).
   * 프로세스를 새로 띄우면 모듈 레지스트리가 통째로 비므로 이 문제가 사라지고,
   * 덤으로 빌드가 터져도 개발 서버는 살아남는다.
   */
  async function rebuild(reason) {
    if (building) {
      pending = true;
      return;
    }
    building = true;

    const started = performance.now();
    try {
      const { stdout } = await run('node', [join(rootDir, 'engine/cli.js'), 'build:dev'], {
        cwd: rootDir,
      });
      const routes = /라우트 (\d+)/u.exec(stdout)?.[1] ?? '?';
      console.log(
        `  ${reason} → 재빌드 ${Math.round(performance.now() - started)}ms (라우트 ${routes})`
      );
      for (const client of clients) client.write('data: reload\n\n');
    } catch (error) {
      console.error(`  빌드 실패:\n${error.stdout ?? ''}${error.stderr ?? error.message}`);
    } finally {
      building = false;
      if (pending) {
        pending = false;
        await rebuild('대기 중이던 변경');
      }
    }
  }

  await rebuild('최초 빌드');

  // 저장 한 번에 이벤트가 여러 번 오는 에디터가 많다. 짧게 모아서 한 번만 빌드.
  let timer = null;
  const schedule = (label) => {
    clearTimeout(timer);
    timer = setTimeout(() => rebuild(label), 60);
  };

  for (const target of WATCHED) {
    try {
      watch(join(rootDir, target), { recursive: true }, (_event, filename) => {
        if (filename?.startsWith('.')) return;
        schedule(filename ?? target);
      });
    } catch {
      // 없는 디렉토리(_drafts 등)는 건너뛴다.
    }
  }

  const server = createServer(async (request, response) => {
    const url = new URL(request.url, `http://localhost:${PORT}`);

    if (url.pathname === '/__reload') {
      response.writeHead(200, {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache',
        connection: 'keep-alive',
      });
      response.write(': connected\n\n');
      clients.add(response);
      request.on('close', () => clients.delete(response));
      return;
    }

    const pathname = decodeURIComponent(url.pathname);
    // GitHub Pages 와 같은 규칙: `/foo/` → `/foo/index.html`
    const candidates = pathname.endsWith('/')
      ? [join(outDir, pathname, 'index.html')]
      : [join(outDir, pathname), join(outDir, pathname, 'index.html')];

    for (const candidate of candidates) {
      try {
        const info = await stat(candidate);
        if (!info.isFile()) continue;

        const type = MIME[extname(candidate)] ?? 'application/octet-stream';
        let body = await readFile(candidate);
        if (type.startsWith('text/html')) {
          body = Buffer.from(String(body).replace('</body>', `${LIVE_RELOAD}</body>`));
        }

        response.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' });
        response.end(body);
        return;
      } catch {
        // 다음 후보로
      }
    }

    // 실제 배포와 같은 404 페이지를 보여준다.
    try {
      const notFound = await readFile(join(outDir, '404.html'));
      response.writeHead(404, { 'content-type': MIME['.html'] });
      response.end(String(notFound).replace('</body>', `${LIVE_RELOAD}</body>`));
    } catch {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('404');
    }
  });

  server.listen(PORT, () => {
    console.log(`\n  개발 서버  http://localhost:${PORT}`);
    console.log(`  파일을 저장하면 자동으로 새로고침됩니다. 종료는 Ctrl+C\n`);
  });
}
