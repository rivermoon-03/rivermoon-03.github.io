/*
 * 라이트/다크 전환.
 *
 * 초기 적용은 base.js 의 인라인 스크립트가 <head> 에서 이미 끝냈다 (FOUC 방지).
 * 여기서는 토글 버튼과 시스템 설정 변경만 처리한다.
 */
(function themeToggle() {
  const root = document.documentElement;
  const query = window.matchMedia('(prefers-color-scheme: dark)');

  function current() {
    return root.dataset.theme || (query.matches ? 'dark' : 'light');
  }

  function apply(theme) {
    root.dataset.theme = theme;
    try {
      localStorage.setItem('theme', theme);
    } catch {
      // 사생활 보호 모드 등에서 저장이 막혀도 전환 자체는 동작해야 한다.
    }
  }

  for (const button of document.querySelectorAll('[data-theme-toggle]')) {
    button.addEventListener('click', () => {
      apply(current() === 'dark' ? 'light' : 'dark');
    });
  }

  // 사용자가 직접 고른 적이 없을 때만 시스템 설정 변화를 따라간다.
  query.addEventListener('change', (event) => {
    let stored = null;
    try {
      stored = localStorage.getItem('theme');
    } catch {
      stored = null;
    }
    if (!stored) root.dataset.theme = event.matches ? 'dark' : 'light';
  });
})();
