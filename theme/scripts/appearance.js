/*
 * 보기 설정 — 테마와 본문 서체.
 *
 * 첫 적용은 base.js 의 인라인 스크립트가 <head> 에서 이미 끝냈다 (FOUC 방지).
 * 여기서는 팝오버의 선택 상태를 맞추고, 누른 것을 저장하는 일만 한다.
 *
 * 저장 규칙이 둘 사이에 다르다:
 *   테마 — '시스템'을 고르면 저장을 **지운다.** 값을 남겨두면 나중에 기기 설정이
 *          바뀌어도 따라가지 못한다. 저장이 없다는 것 자체가 "시스템을 따른다"다.
 *   서체 — 시스템에 대응하는 설정이 없으므로 고른 값을 그대로 저장한다.
 */
(function appearance() {
  const root = document.documentElement;
  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

  /** localStorage 는 사생활 보호 모드에서 던진다. 전환 자체는 그래도 동작해야 한다. */
  function read(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function write(key, value) {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch {
      // 저장만 못 할 뿐이다.
    }
  }

  function applyTheme(choice) {
    write('theme', choice === 'system' ? null : choice);
    root.dataset.theme = choice === 'system' ? (darkQuery.matches ? 'dark' : 'light') : choice;
    sync();
  }

  function applyFont(choice) {
    write('font', choice);
    root.dataset.font = choice;
    sync();
  }

  /** 지금 무엇이 골라져 있는지 버튼에 표시한다. */
  function sync() {
    const theme = read('theme') ?? 'system';
    const font = root.dataset.font || 'serif';

    for (const button of document.querySelectorAll('[data-set-theme]')) {
      button.setAttribute('aria-pressed', String(button.dataset.setTheme === theme));
    }
    for (const button of document.querySelectorAll('[data-set-font]')) {
      button.setAttribute('aria-pressed', String(button.dataset.setFont === font));
    }
  }

  for (const button of document.querySelectorAll('[data-set-theme]')) {
    button.addEventListener('click', () => applyTheme(button.dataset.setTheme));
  }
  for (const button of document.querySelectorAll('[data-set-font]')) {
    button.addEventListener('click', () => applyFont(button.dataset.setFont));
  }

  // 사용자가 직접 고른 적이 없을 때만 시스템 설정 변화를 따라간다.
  darkQuery.addEventListener('change', (event) => {
    if (!read('theme')) root.dataset.theme = event.matches ? 'dark' : 'light';
  });

  sync();
})();
