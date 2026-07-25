/**
 * slugify 회귀 테스트.
 *
 * 이 테스트가 이 프로젝트에서 가장 중요하다. 기존 사이트는 한글 슬러그 URL로
 * 색인되어 있고, 규칙이 한 글자라도 어긋나면 포스트 21개가 통째로 404가 난다.
 * 기대값은 추측이 아니라 라이브 sitemap.xml 에서 뽑은 것이다.
 * (engine/__fixtures__/live-urls.txt)
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { slugify, parseSourcePath, permalinkTitle, taxonomySlug, postUrl } from '../slug.js';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

/** 라이브 URL 픽스처를 경로 Set 으로 읽는다. */
function loadLiveUrls() {
  const raw = readFileSync(join(ROOT, 'engine/__fixtures__/live-urls.txt'), 'utf8');
  return new Set(
    raw
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
  );
}

/** _posts 아래 모든 마크다운 파일의 저장소 상대 경로. */
function findPostFiles() {
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.md')) out.push(relative(ROOT, full));
    }
  };
  walk(join(ROOT, '_posts'));
  return out.sort();
}

describe('slugify — Jekyll Utils.slugify 이식', () => {
  test('default 모드는 비영숫자를 하이픈으로 바꾸고 소문자로 내린다', () => {
    assert.equal(slugify('Hello World'), 'hello-world');
    assert.equal(slugify('Foo   Bar'), 'foo-bar');
    assert.equal(slugify('UPPER'), 'upper');
  });

  test('연속된 구분자는 하이픈 하나로 접힌다', () => {
    assert.equal(slugify('a---b'), 'a-b');
    assert.equal(slugify('a - . - b'), 'a-b');
  });

  test('앞뒤 하이픈은 제거된다', () => {
    assert.equal(slugify('---hello---'), 'hello');
    assert.equal(slugify('...trailing.'), 'trailing');
  });

  test('한글은 alnum 으로 취급되어 보존된다', () => {
    assert.equal(slugify('백준 2745 진법 변환'), '백준-2745-진법-변환');
    assert.equal(slugify('달팽이는 올라가고 싶다'), '달팽이는-올라가고-싶다');
  });

  test('pretty 모드는 ._~!$&\'()+,;=@ 를 살려둔다', () => {
    assert.equal(slugify('a.b_c~d', { mode: 'pretty' }), 'a.b_c~d');
    assert.equal(slugify('a.b_c~d', { mode: 'default' }), 'a-b-c-d');
  });

  test('cased:true 는 대소문자를 보존한다 — 이 사이트의 URL이 실제로 의존한다', () => {
    assert.equal(slugify('Path-Paramater', { mode: 'pretty', cased: true }), 'Path-Paramater');
    assert.equal(slugify('Path-Paramater', { mode: 'pretty' }), 'path-paramater');
  });

  test('ascii 모드는 한글을 전부 날린다 (우리는 쓰지 않지만 동작은 맞춰둔다)', () => {
    assert.equal(slugify('백준-2745', { mode: 'ascii' }), '2745');
  });

  test('raw 모드는 공백만 바꾼다', () => {
    assert.equal(slugify('a b.c', { mode: 'raw' }), 'a-b.c');
  });

  test('null/undefined 는 null 을 돌려준다', () => {
    assert.equal(slugify(null), null);
    assert.equal(slugify(undefined), null);
  });

  test('알 수 없는 모드는 원본을 통과시킨다', () => {
    assert.equal(slugify('A B', { mode: 'nope' }), 'a b');
    assert.equal(slugify('A B', { mode: 'nope', cased: true }), 'A B');
  });
});

describe('parseSourcePath — 파일명에서 날짜와 원본 슬러그 분리', () => {
  test('날짜 접두사가 있는 포스트', () => {
    assert.deepEqual(parseSourcePath('_posts/백준/2026-02-22-백준-2745---진법-변환.md'), {
      rawSlug: '백준-2745---진법-변환',
      dateFromFilename: '2026-02-22',
      ext: '.md',
    });
  });

  test('한 자리 월/일도 허용한다', () => {
    assert.equal(parseSourcePath('_posts/2026-3-5-foo.md').dateFromFilename, '2026-3-5');
  });

  test('날짜 없는 문서(_tabs)', () => {
    assert.deepEqual(parseSourcePath('_tabs/about.md'), {
      rawSlug: 'about',
      dateFromFilename: null,
      ext: '.md',
    });
  });

  test('제목에 점이 있어도 마지막 확장자만 떼어낸다', () => {
    const { rawSlug, ext } = parseSourcePath('_posts/2026-03-06-19532번---수학은-비대면강의입니다.md');
    assert.equal(rawSlug, '19532번---수학은-비대면강의입니다');
    assert.equal(ext, '.md');
  });
});

describe('permalinkTitle — 실제 파일명 → 라이브 슬러그', () => {
  // 기대값은 전부 라이브 사이트에서 관측한 것이다. 바꾸지 말 것.
  const CASES = [
    ['2026-02-22-백준-2745---진법-변환.md', '백준-2745-진법-변환'],
    ['2026-03-05-코드만-10831번---공-바꾸기.md', '코드만-10831번-공-바꾸기'],
    ['2026-03-06-19532번---수학은-비대면강의입니다.md', '19532번-수학은-비대면강의입니다'],
    ['2026-03-14-백준---15829번---hashing---python.md', '백준-15829번-hashing-python'],
    ['2026-02-04-baekjoon-2566.md', 'baekjoon-2566'],
    // ↓ 대문자 보존. cased:true 를 빼면 여기서 깨진다.
    ['2026-03-20-Path-Paramater-Query-Parameter의-차이.md', 'Path-Paramater-Query-Parameter의-차이'],
    ['2026-03-14-네트워크-프로그래밍---소켓-만들고-tcp-통신하기-1.md', '네트워크-프로그래밍-소켓-만들고-tcp-통신하기-1'],
  ];

  for (const [filename, expected] of CASES) {
    test(`${filename} → ${expected}`, () => {
      assert.equal(permalinkTitle(parseSourcePath(`_posts/x/${filename}`).rawSlug), expected);
    });
  }
});

describe('taxonomySlug', () => {
  test('한글 카테고리/태그는 그대로 유지된다', () => {
    assert.equal(taxonomySlug('백준'), '백준');
    assert.equal(taxonomySlug('잡담'), '잡담');
    assert.equal(taxonomySlug('수업'), '수업');
  });

  test('점 하나짜리 태그는 빈 슬러그가 된다 — 기존 사이트의 알려진 버그', () => {
    // _posts/백준/2026-02-22-백준-2745---진법-변환.md 의 `tags: [.]` 오타 때문에
    // 라이브 sitemap 에 `/tags/` 가 두 번 등장한다. 지금은 현행 동작을 그대로 기록해두고,
    // 데이터 정리는 별도 단계에서 한다.
    assert.equal(taxonomySlug('.'), '');
  });
});

/**
 * 글의 front matter 에 적힌 `redirect_from` 목록을 읽는다.
 * YAML 파서를 끌어오지 않고 필요한 만큼만 훑는다 — 이 테스트는 엔진과
 * 독립적으로 실패해야 의미가 있다.
 */
function readRedirectFrom(file) {
  const text = readFileSync(join(ROOT, file), 'utf8');
  const frontMatter = /^---\r?\n([\s\S]*?)\r?\n---/u.exec(text)?.[1] ?? '';
  const block = /^redirect_from:\s*\n((?:\s*-\s*\S+\n?)+)/mu.exec(frontMatter)?.[1];
  if (!block) return [];
  return [...block.matchAll(/-\s*(\S+)/gu)].map((m) => m[1]);
}

describe('회귀: 전환 전 라이브 URL이 하나도 죽지 않는다', () => {
  const liveUrls = loadLiveUrls();
  const postFiles = findPostFiles();

  // 슬러그를 영문으로 바꾸면서 글의 주소가 바뀌었다. 그래서 불변식이 달라졌다:
  //   (전) 모든 글의 주소가 라이브 sitemap 에 있어야 한다
  //   (후) 라이브의 모든 주소가 "지금 글의 주소" 이거나 "리다이렉트로 덮여" 있어야 한다
  // 지켜야 할 건 "글이 그 주소에 있다"가 아니라 "그 주소로 들어온 사람이 길을 잃지 않는다"다.
  const currentUrls = new Set(postFiles.map(postUrl));
  const redirectSources = new Set(postFiles.flatMap(readRedirectFrom));

  test('_posts 에서 마크다운을 실제로 찾았다', () => {
    assert.ok(postFiles.length >= 21, `포스트를 ${postFiles.length}개만 찾음`);
  });

  for (const url of [...liveUrls].filter((u) => u.startsWith('/posts/'))) {
    test(`${url} 이 살아있다`, () => {
      assert.ok(
        currentUrls.has(url) || redirectSources.has(url),
        `${url} 을 가리키는 글도 리다이렉트도 없다. 이대로 배포하면 404가 난다.`
      );
    });
  }

  test('리다이렉트 출발지가 현재 글 주소와 겹치지 않는다', () => {
    // 겹치면 리다이렉트가 실제 글을 가려 무한 루프나 유실이 된다.
    const collisions = [...redirectSources].filter((url) => currentUrls.has(url));
    assert.deepEqual(collisions, [], `리다이렉트가 실제 글 주소를 가린다: ${collisions.join(', ')}`);
  });

  test('모든 글의 슬러그는 서로 다르다', () => {
    assert.equal(currentUrls.size, postFiles.length, '슬러그가 겹치는 글이 있다');
  });

  test('새 슬러그는 전부 ASCII 다', () => {
    // 영문 슬러그로 통일하기로 한 결정을 여기서 지킨다. 새 글이 한글 파일명으로
    // 들어오면 이 테스트가 잡는다.
    const nonAscii = [...currentUrls].filter((url) => !/^[\x20-\x7e]+$/u.test(url));
    assert.deepEqual(nonAscii, [], `한글이 남은 슬러그: ${nonAscii.join(', ')}`);
  });
});
