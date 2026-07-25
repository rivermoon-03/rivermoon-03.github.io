/**
 * 마크다운 → HTML 파이프라인.
 *
 * unified(remark/rehype)를 쓰는 이유는 속도가 아니라 AST 조작이다.
 * TOC 수집, 이미지 크기 주입, 코드블록 감싸기가 전부 AST 단계에서 이뤄진다.
 * 하이라이팅은 Shiki 로 빌드 타임에 끝내므로 클라이언트에 JS를 보내지 않는다.
 */

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import rehypeShiki from '@shikijs/rehype';
import { toString as hastToString } from 'hast-util-to-string';
import { imageSize } from './image-size.js';

const HEADINGS = new Set(['h2', 'h3', 'h4']);

/**
 * 본문에 h1 이 있으면 모든 헤딩을 한 단계씩 내린다.
 *
 * 이 저장소의 글 상당수가 본문을 `# 코드 작성` 처럼 h1 으로 시작한다. 그러면
 *   - 페이지에 h1 이 둘(포스트 제목 + 본문)이 되어 문서 구조가 깨지고,
 *   - h2~h4 만 수집하는 목차에서 그 제목들이 통째로 빠진다.
 *
 * 원본 마크다운은 건드리지 않고 렌더 단계에서만 교정한다. rehype-slug 는 레벨이
 * 아니라 텍스트로 id 를 만들기 때문에, 단계를 내려도 앵커(#...)는 그대로 유지된다.
 * h1 이 없는 글(이미 `##` 로 시작하는 글)은 손대지 않는다.
 */
function rehypeDemoteHeadings() {
  const LEVELS = ['h1', 'h2', 'h3', 'h4', 'h5'];

  return (tree) => {
    let hasH1 = false;
    const headings = [];

    const visit = (node) => {
      if (node.type === 'element' && LEVELS.includes(node.tagName)) {
        if (node.tagName === 'h1') hasH1 = true;
        headings.push(node);
      }
      for (const child of node.children ?? []) visit(child);
    };
    visit(tree);

    if (!hasH1) return;
    for (const node of headings) {
      node.tagName = LEVELS[LEVELS.indexOf(node.tagName) + 1] ?? 'h6';
    }
  };
}

/**
 * 헤딩을 훑어 중첩 TOC 트리를 만든다. rehype-slug 뒤에 와야 id가 채워져 있다.
 * 결과는 `file.data.toc` 에 담는다.
 */
function rehypeCollectToc() {
  return (tree, file) => {
    /** @type {{depth: number, id: string, text: string, children: any[]}[]} */
    const flat = [];

    const visit = (node) => {
      if (node.type === 'element' && HEADINGS.has(node.tagName)) {
        const text = hastToString(node).trim();
        if (text && node.properties?.id) {
          flat.push({ depth: Number(node.tagName.slice(1)), id: String(node.properties.id), text, children: [] });
        }
      }
      for (const child of node.children ?? []) visit(child);
    };
    visit(tree);

    // 평면 목록을 깊이 기준으로 중첩시킨다.
    const roots = [];
    const stack = [];
    for (const item of flat) {
      while (stack.length && stack.at(-1).depth >= item.depth) stack.pop();
      if (stack.length) stack.at(-1).children.push(item);
      else roots.push(item);
      stack.push(item);
    }

    file.data.toc = roots;
  };
}

/**
 * 첫 문단을 요약으로 뽑는다.
 *
 * 그냥 "첫 문단"을 쓰면 이 블로그에서는 자주 쓸모없는 값이 나온다. 여러 글이
 * `[문제 링크](...)` 나 `-> 백준 링크` 처럼 링크 한 줄로 시작하기 때문이다.
 * 목록에 "문제 링크"만 뜨면 발췌를 보여주는 의미가 없다. 그래서
 *   - 링크가 대부분을 차지하는 문단,
 *   - 너무 짧아서 정보가 없는 문단
 * 은 건너뛰고 실제 문장이 있는 첫 문단을 찾는다. 끝까지 못 찾으면 처음 것이라도 쓴다.
 */
function rehypeExtractExcerpt({ maxLength = 160, minLength = 16 } = {}) {
  return (tree, file) => {
    /** @type {string[]} */
    const candidates = [];
    let fallback = '';

    const visit = (node) => {
      if (node.type === 'element' && node.tagName === 'p') {
        const text = hastToString(node).replace(/\s+/gu, ' ').trim();
        if (text) {
          if (!fallback) fallback = text;

          const linkText = (node.children ?? [])
            .filter((child) => child.type === 'element' && child.tagName === 'a')
            .map((child) => hastToString(child))
            .join('');

          const mostlyLink = linkText.length >= text.length * 0.6;
          if (!mostlyLink && text.length >= minLength) candidates.push(text);
        }
      }
      for (const child of node.children ?? []) visit(child);
    };
    visit(tree);

    const chosen = candidates[0] ?? fallback;
    file.data.excerpt =
      chosen.length > maxLength ? `${chosen.slice(0, maxLength).trimEnd()}…` : chosen;
  };
}

/**
 * kramdown 의 IAL(`{: .prompt-tip }`) 잔재를 걷어낸다.
 *
 * Jekyll 시절 문법이라 지금 파이프라인은 그냥 글자로 출력한다. 실제로 소개 페이지에
 * `{: .filepath }` 가 그대로 노출되고 있었다. 옛 글을 손대지 않고도 깨끗하게
 * 보이도록 렌더 단계에서 지운다.
 *
 * 오탐을 막는 장치가 둘 있다:
 *   - `code`/`pre` 안은 건드리지 않는다. 코드에 있는 중괄호는 코드다.
 *   - 줄 끝이나 단독 줄에 있는 것만 지운다. kramdown 이 IAL 을 쓰는 위치가 거기다.
 */
function rehypeStripKramdownIal() {
  const IAL = /\{:\s*[.#][^{}]*\}\s*$/gmu;
  const SKIP = new Set(['code', 'pre', 'kbd', 'samp']);

  return (tree) => {
    const visit = (node) => {
      if (node.type === 'element' && SKIP.has(node.tagName)) return;

      for (const child of node.children ?? []) {
        if (child.type === 'text') child.value = child.value.replace(IAL, '');
        else visit(child);
      }
    };
    visit(tree);
  };
}

/**
 * 헤딩에 앵커 링크를 붙인다.
 *
 * 특정 절의 주소를 다른 사람에게 보낼 때 필요하다. 평소에는 보이지 않다가
 * 헤딩에 마우스를 올리면 나타난다 — 항상 보이면 제목마다 기호가 붙어 시끄럽다.
 * rehype-slug 로 id 가 붙은 뒤에 와야 한다.
 */
function rehypeHeadingAnchors() {
  const HEADING = /^h[2-4]$/u;

  return (tree) => {
    const visit = (node) => {
      if (node.type === 'element' && HEADING.test(node.tagName) && node.properties?.id) {
        const id = String(node.properties.id);
        node.children.push({
          type: 'element',
          tagName: 'a',
          properties: {
            class: 'heading-anchor',
            href: `#${id}`,
            'aria-label': '이 절의 링크',
            'data-anchor': '',
          },
          children: [{ type: 'text', value: '#' }],
        });
      }
      for (const child of node.children ?? []) visit(child);
    };
    visit(tree);
  };
}

/**
 * 외부 링크에 안전 속성과 표식을 붙인다.
 *
 * `rel="noopener"` 는 새 탭으로 열릴 때 원본 창을 조작당하지 않게 하는 최소한의
 * 방어다. 새 탭 여부와 무관하게 붙여도 해가 없어서 일괄 적용한다.
 * 표식(↗)은 CSS 가 그리고, 여기서는 판별만 해서 속성으로 남긴다.
 */
function rehypeExternalLinks({ siteUrl }) {
  let host = '';
  try {
    host = new URL(siteUrl).host;
  } catch {
    host = '';
  }

  return (tree) => {
    const visit = (node) => {
      if (node.type === 'element' && node.tagName === 'a') {
        const href = String(node.properties?.href ?? '');
        if (/^https?:\/\//u.test(href) && !(host && href.includes(host))) {
          node.properties.rel = 'noopener noreferrer';
          node.properties['data-external'] = '';
        }
      }
      for (const child of node.children ?? []) visit(child);
    };
    visit(tree);
  };
}

/**
 * 로컬 이미지에 width/height 를 주입하고 지연 로딩을 켠다.
 * 레이아웃 시프트(CLS)를 없애기 위한 것으로, Lighthouse 점수에 직접 영향을 준다.
 *
 * @param {{ rootDir: string }} options
 */
function rehypeImageMeta({ rootDir }) {
  return (tree) => {
    const visit = (node) => {
      if (node.type === 'element' && node.tagName === 'img') {
        const props = node.properties ?? (node.properties = {});
        props.loading ??= 'lazy';
        props.decoding ??= 'async';

        const src = typeof props.src === 'string' ? props.src : '';
        if (src.startsWith('/') && !props.width && !props.height) {
          const size = imageSize(rootDir, src);
          if (size) {
            props.width = size.width;
            props.height = size.height;
          }
        }
      }
      for (const child of node.children ?? []) visit(child);
    };
    visit(tree);
  };
}

/**
 * Shiki 가 만든 `<pre>` 를 감싸 언어 라벨과 복사 버튼을 붙인다.
 * 이 블로그는 백준 풀이가 대부분이라 코드블록이 사실상 1급 콘텐츠다.
 */
function rehypeCodeBlockChrome({ aliases = {} } = {}) {
  /** 표기 흔들림(`Python`, `py`)을 라벨 하나로 모은다. */
  const normalizeLang = (raw) => {
    const value = String(raw ?? '').trim();
    if (!value) return '';
    return (aliases[value] ?? aliases[value.toLowerCase()] ?? value).toLowerCase();
  };

  return (tree) => {
    const visit = (node) => {
      const children = node.children ?? [];
      for (let i = 0; i < children.length; i += 1) {
        const child = children[i];
        if (child.type === 'element' && child.tagName === 'pre' && child.properties?.class?.includes?.('shiki')) {
          const lang = normalizeLang(child.properties?.['data-language']);
          children[i] = {
            type: 'element',
            tagName: 'figure',
            properties: { class: 'code-block', 'data-lang': lang || null },
            children: [
              {
                type: 'element',
                tagName: 'figcaption',
                properties: { class: 'code-block__bar' },
                children: [
                  {
                    type: 'element',
                    tagName: 'span',
                    properties: { class: 'code-block__lang' },
                    children: [{ type: 'text', value: lang || 'text' }],
                  },
                  {
                    type: 'element',
                    tagName: 'button',
                    properties: {
                      type: 'button',
                      class: 'code-block__copy',
                      'data-copy': '',
                      'aria-label': '코드 복사',
                    },
                    children: [{ type: 'text', value: '복사' }],
                  },
                ],
              },
              child,
            ],
          };
          continue;
        }
        visit(child);
      }
    };
    visit(tree);
  };
}

/**
 * 마크다운 프로세서를 만든다. Shiki 엔진 초기화 비용이 있으므로
 * 빌드 한 번에 하나만 만들어 모든 문서에 재사용한다.
 *
 * @param {{ rootDir: string, config: any }} options
 */
export async function createProcessor({ rootDir, config }) {
  const shiki = config.markdown.shiki;

  return unified()
    .use(remarkParse)
    .use(remarkGfm)
    // 포스트 안에 <br>, <img> 같은 원시 HTML이 실제로 들어 있다.
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    // 목차·발췌에 `{: .foo }` 가 섞여 들어가지 않도록 가장 먼저 걷어낸다.
    .use(rehypeStripKramdownIal)
    // 목차 수집(rehypeCollectToc)보다 먼저 와야 교정된 레벨이 목차에 반영된다.
    .use(rehypeDemoteHeadings)
    .use(rehypeSlug)
    // 목차는 앵커 링크가 붙기 전에 수집해야 제목 끝에 '#' 이 딸려가지 않는다.
    .use(rehypeCollectToc)
    .use(rehypeExtractExcerpt)
    .use(rehypeCollectText)
    .use(rehypeHeadingAnchors)
    .use(rehypeExternalLinks, { siteUrl: config.url })
    .use(rehypeImageMeta, { rootDir })
    .use(rehypeShiki, {
      themes: shiki.themes,
      langs: shiki.langs,
      langAlias: shiki.aliases,
      // ```rooms 같은 오타가 실제로 있다. 여기서 throw 하면 빌드가 통째로 죽는다.
      fallbackLanguage: shiki.fallbackLang,
      defaultColor: false, // CSS 변수로 라이트/다크 양쪽 출력
      transformers: [
        {
          // Shiki 는 언어를 클래스에만 남긴다. 라벨로 쓰려면 속성으로 꺼내야 한다.
          name: 'language-attr',
          pre(node) {
            node.properties['data-language'] = this.options.lang;
          },
        },
      ],
    })
    .use(rehypeCodeBlockChrome, { aliases: shiki.aliases })
    .use(rehypeStringify, { allowDangerousHtml: true });
}

/**
 * 렌더된 본문의 순수 텍스트를 file.data 에 담아둔다. 글자 수 계산에 쓴다.
 *
 * 마크다운 원문에서 세지 않는 이유: `**`, `[]()`, `#` 같은 기호가 그대로 섞여
 * 실제로 읽는 글자보다 부풀려진다. 렌더가 끝난 뒤 텍스트만 뽑으면 화면에 보이는
 * 그대로가 된다.
 */
function rehypeCollectText() {
  return (tree, file) => {
    file.data.plainText = hastToString(tree);
  };
}

/**
 * 문서 하나를 렌더한다.
 *
 * @param {Awaited<ReturnType<typeof createProcessor>>} processor
 * @param {string} body 프론트매터를 제거한 마크다운
 * @returns {Promise<{ html: string, toc: any[], excerpt: string, charCount: number }>}
 */
export async function renderMarkdown(processor, body) {
  const file = await processor.process(body);
  const plainText = file.data.plainText ?? '';

  return {
    html: String(file),
    toc: file.data.toc ?? [],
    excerpt: file.data.excerpt ?? '',
    // 공백을 뺀 글자 수. 띄어쓰기를 포함하면 같은 분량의 한글 글과 영문 글이
    // 크게 달라 보여서 비교가 어렵다.
    charCount: plainText.replace(/\s/gu, '').length,
  };
}
