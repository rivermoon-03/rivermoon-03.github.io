#!/usr/bin/env node
/**
 * 새 글 만들기.
 *
 *   npm run new -- 백준 "2751번 - 수 정렬하기 2"
 *   npm run new                       (대화형)
 *
 * 기존 bash 스크립트는 `_posts/` 루트에 파일을 만들었는데, 실제 글은 전부
 * `_posts/<카테고리>/` 아래 정리돼 있어 관행과 어긋났다. 여기서는 카테고리
 * 하위 폴더에 만든다.
 *
 * 그리고 만들어질 URL을 미리 보여준다. 파일명이 곧 영구 주소이기 때문에
 * (engine/slug.js), 나중에 파일명을 바꾸면 링크가 깨진다. 만들 때 확인하는 게 낫다.
 */

import { writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

import { postUrl } from '../engine/slug.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const POSTS_DIR = join(ROOT, '_posts');

/** 이미 쓰이고 있는 카테고리를 디렉토리에서 읽는다. 목록을 코드에 박아두지 않는다. */
function existingCategories() {
  return readdirSync(POSTS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, 'ko'));
}

/**
 * 제목 → 파일명 조각.
 * Jekyll 시절 파일명 관행(공백은 하이픈, 한글 유지)을 따른다. 실제 URL 계산은
 * engine/slug.js 가 하므로 여기서는 파일명으로 쓸 수 없는 문자만 걸러낸다.
 */
function toFilenameSlug(title) {
  return title
    .trim()
    .replace(/[/\\:*?"<>|]/gu, '') // 파일 시스템이 싫어하는 문자
    .replace(/\s+/gu, '-')
    .replace(/-{2,}/gu, '-')
    .replace(/^-|-$/gu, '');
}

/** KST 기준 `YYYY-MM-DD` 와 `HH:MM:SS +0900`. */
function nowInSeoul() {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date());

  const [date, time] = parts.split(' ');
  return { date, time: `${time} +0900` };
}

async function main() {
  const categories = existingCategories();
  let [category, title] = process.argv.slice(2);

  if (!category || !title) {
    const rl = createInterface({ input: stdin, output: stdout });
    try {
      if (!category) {
        console.log(`\n카테고리: ${categories.join(', ')}`);
        category = (await rl.question('카테고리> ')).trim();
      }
      if (!title) title = (await rl.question('제목> ')).trim();
    } finally {
      rl.close();
    }
  }

  if (!category || !title) {
    console.error('카테고리와 제목이 모두 필요하다.');
    process.exit(1);
  }

  if (!categories.includes(category)) {
    console.log(`\n! '${category}' 는 새 카테고리다. (기존: ${categories.join(', ')})`);
  }

  const { date, time } = nowInSeoul();
  const filename = `${date}-${toFilenameSlug(title)}.md`;
  const relativePath = `_posts/${category}/${filename}`;
  const fullPath = join(ROOT, relativePath);

  if (existsSync(fullPath)) {
    console.error(`이미 있는 파일이다: ${relativePath}`);
    process.exit(1);
  }

  const body = `---
title: "${title.replace(/"/gu, '\\"')}"
date: ${date} ${time}
categories: [${category}]
tags: [${category}]
toc: true
---

`;

  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, body, 'utf8');

  console.log(`\n  ✓ ${relativePath}`);
  console.log(`    URL  ${postUrl(relativePath)}`);
  console.log(`\n  파일명이 곧 영구 주소다. 발행 후에 파일명을 바꾸면 링크가 깨진다.\n`);
}

await main();
