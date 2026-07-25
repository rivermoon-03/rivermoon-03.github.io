/*
 * 서비스 워커 등록.
 *
 * localhost 에서는 등록하지 않는다. 개발 중에 워커가 낀 캐시를 물고 있으면
 * 라이브리로드가 헛돌아 "고쳤는데 안 바뀐다"로 시간을 태우게 된다.
 */
(function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // 등록 실패는 치명적이지 않다. 사이트는 그냥 온라인 전용으로 동작한다.
    });
  });
})();
