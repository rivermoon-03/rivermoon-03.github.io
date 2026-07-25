/**
 * 표시용 포맷 헬퍼.
 *
 * 사이트 타임존이 Asia/Seoul 로 고정이라 날짜는 항상 KST 기준으로 찍는다.
 * 빌드가 어느 타임존의 러너에서 돌든 결과가 같아야 한다 (빌드 결정성).
 */

const TIME_ZONE = 'Asia/Seoul';

const DATE_LONG = new Intl.DateTimeFormat('ko-KR', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

const DATE_SHORT = new Intl.DateTimeFormat('ko-KR', {
  timeZone: TIME_ZONE,
  month: 'long',
  day: 'numeric',
});

/** `2026년 2월 22일` */
export function formatDate(date) {
  return DATE_LONG.format(date);
}

/** `2월 22일` — 연도가 문맥상 자명한 목록에서 쓴다. */
export function formatDateShort(date) {
  return DATE_SHORT.format(date);
}

/** `<time datetime>` 속성용 ISO 날짜 (YYYY-MM-DD, KST 기준). */
export function isoDate(date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

const COUNT = new Intl.NumberFormat('ko-KR');

/**
 * 천 단위 구분이 들어간 숫자. `1234` → `1,234`
 * 글자 수처럼 네 자리를 넘기는 값은 구분 기호가 없으면 한눈에 안 읽힌다.
 */
export function formatCount(value) {
  return COUNT.format(value ?? 0);
}
