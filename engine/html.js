/**
 * 템플릿 엔진. 태그드 템플릿 리터럴 하나가 전부다.
 *
 * 설계 의도: 별도 템플릿 언어(Liquid 같은)를 두지 않는다. 테마는 그냥 JS 함수이고,
 * 에디터 자동완성·타입 추론·스택 트레이스가 전부 공짜로 따라온다.
 *
 * 안전 규칙 하나만 기억하면 된다:
 *   `${값}` 은 **항상 이스케이프된다.**
 *   이스케이프를 건너뛰려면 명시적으로 `raw(...)` 로 감싸야 한다.
 * 마크다운에서 나온 본문 HTML처럼 이미 신뢰할 수 있는 것만 raw 를 쓴다.
 */

/** raw 로 표시된 문자열. 이 타입만 이스케이프를 건너뛴다. */
class RawHtml {
  /** @param {string} value */
  constructor(value) {
    this.value = value;
  }
  toString() {
    return this.value;
  }
}

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/**
 * HTML 특수문자를 이스케이프한다.
 * @param {unknown} value
 * @returns {string}
 */
export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/gu, (char) => ESCAPES[char]);
}

/**
 * 이미 안전한 HTML 임을 선언한다. 신뢰할 수 없는 입력에 쓰면 XSS 가 된다.
 * @param {unknown} value
 * @returns {RawHtml}
 */
export function raw(value) {
  return new RawHtml(value === null || value === undefined ? '' : String(value));
}

/** 값 하나를 템플릿에 넣을 문자열로 바꾼다. */
function interpolate(value) {
  if (value === null || value === undefined || value === false || value === true) return '';
  if (value instanceof RawHtml) return value.value;
  if (Array.isArray(value)) return value.map(interpolate).join('');
  return escapeHtml(value);
}

/**
 * HTML 템플릿 리터럴.
 *
 * @example
 *   html`<h1>${post.title}</h1>${raw(post.html)}`
 *
 * @param {TemplateStringsArray} strings
 * @param {...unknown} values
 * @returns {RawHtml} 중첩해서 쓸 수 있도록 raw 로 돌려준다
 */
export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i += 1) {
    out += interpolate(values[i]) + strings[i + 1];
  }
  return new RawHtml(out);
}

/**
 * 조건부 렌더. `cond && html\`...\`` 은 false 를 흘려보내지만
 * 의도를 드러내려면 이쪽이 읽기 좋다.
 *
 * @template T
 * @param {unknown} condition
 * @param {() => T} render
 */
export function when(condition, render) {
  return condition ? render() : '';
}

/**
 * 목록 렌더.
 *
 * @template T
 * @param {Iterable<T>} items
 * @param {(item: T, index: number) => unknown} render
 */
export function each(items, render) {
  return [...items].map(render);
}

/**
 * 속성 객체를 HTML 속성 문자열로 만든다.
 * false/null/undefined 인 속성은 아예 출력하지 않고, true 는 값 없는 속성이 된다.
 *
 * @param {Record<string, unknown>} attributes
 */
export function attrs(attributes) {
  const parts = [];
  for (const [key, value] of Object.entries(attributes)) {
    if (value === false || value === null || value === undefined) continue;
    if (value === true) parts.push(key);
    else parts.push(`${key}="${escapeHtml(value)}"`);
  }
  return new RawHtml(parts.length ? ` ${parts.join(' ')}` : '');
}
