/**
 * 리다이렉트 페이지.
 *
 * 정적 호스팅에는 301 을 낼 서버가 없다. 표준적인 대안이 이 세 가지를 한 페이지에
 * 담는 것이다:
 *   - `<link rel="canonical">` : 검색엔진에 "진짜 주소는 여기"라고 알린다.
 *     링크 가치가 새 주소로 넘어가는 건 사실상 이 태그가 한다.
 *   - `<meta http-equiv="refresh" content="0; url=...">` : JS 가 꺼져 있어도 이동한다.
 *   - `location.replace()` : 즉시 이동하면서 뒤로가기 히스토리를 더럽히지 않는다.
 *     (`location.href` 를 쓰면 뒤로가기가 리다이렉트 페이지로 돌아와 무한 왕복이 된다.)
 *
 * `noindex` 를 넣어 옛 주소 자체가 색인되는 것을 막는다.
 */

import { html, raw } from '../../engine/html.js';

export function redirect({ site, url, to }) {
  const absolute = `${site.config.url}${site.config.baseurl}${to}`;

  // `<script>` 안은 원시 텍스트라 HTML 엔티티가 디코딩되지 않는다.
  // 이스케이프된 `&quot;` 가 그대로 남으면 JS 문법 오류가 되므로 통째로 raw 로 넣는다.
  // JSON.stringify 로 따옴표를 처리하고, `</script>` 조기 종료만 따로 막는다.
  const script = raw(
    `location.replace(${JSON.stringify(to).replace(/</gu, '\\u003c')})`
  );

  return html`<!doctype html>
<html lang="${site.config.lang}">
<head>
<meta charset="utf-8">
<title>이동합니다 · ${site.config.title}</title>
<link rel="canonical" href="${absolute}">
<meta name="robots" content="noindex, follow">
<meta http-equiv="refresh" content="0; url=${to}">
<script>${script}</script>
</head>
<body>
<p>이 글은 <a href="${to}">${absolute}</a> 로 옮겼습니다.</p>
</body>
</html>
`;
}
