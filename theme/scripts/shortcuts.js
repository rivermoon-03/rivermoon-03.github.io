/*
 * 키보드 단축키.
 *
 * 검색(⌘K, /)은 search.js 가 이미 처리한다. 여기서는 이동 계열을 맡는다.
 *
 * `g` 를 누른 뒤 다음 키로 목적지를 고르는 방식(g h, g a …)을 쓴다. Gmail·GitHub 등이
 * 오래 쓴 관습이라 배우면 다른 곳에서도 그대로 통하고, 단일 키를 통째로 점유하지
 * 않아서 평소 타이핑을 방해하지 않는다.
 */
(function shortcuts() {
  const DESTINATIONS = {
    h: { url: '/', label: '홈' },
    a: { url: '/archives/', label: '아카이브' },
    c: { url: '/categories/', label: '카테고리' },
    t: { url: '/tags/', label: '태그' },
    b: { url: '/about/', label: '소개' },
  };

  /** 입력 중에는 어떤 단축키도 가로채면 안 된다. */
  function isTyping() {
    const el = document.activeElement;
    if (!el) return false;
    return el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/u.test(el.tagName);
  }

  let awaitingSecondKey = false;
  let timer = null;

  function armPrefix() {
    awaitingSecondKey = true;
    clearTimeout(timer);
    // 1초 안에 다음 키가 없으면 취소. 계속 걸려 있으면 나중에 누른 'h' 가
    // 엉뚱하게 이동을 일으킨다.
    timer = setTimeout(() => {
      awaitingSecondKey = false;
    }, 1000);
  }

  document.addEventListener('keydown', (event) => {
    if (isTyping() || event.metaKey || event.ctrlKey || event.altKey) return;

    const key = event.key.toLowerCase();

    if (awaitingSecondKey) {
      awaitingSecondKey = false;
      clearTimeout(timer);
      const destination = DESTINATIONS[key];
      if (destination) {
        event.preventDefault();
        location.href = destination.url;
      }
      return;
    }

    if (key === 'g') {
      armPrefix();
      return;
    }

    if (key === '?') {
      event.preventDefault();
      openHelp();
    }
  });

  /* ── 도움말 ──────────────────────────────────────────────── */
  let dialog = null;

  function openHelp() {
    dialog ??= buildHelp();
    if (!dialog.open) dialog.showModal();
  }

  function buildHelp() {
    const rows = [
      ['⌘K / Ctrl K', '검색 열기'],
      ['/', '검색 열기'],
      ...Object.entries(DESTINATIONS).map(([key, d]) => [`g ${key}`, `${d.label}(으)로 이동`]),
      ['?', '이 도움말'],
      ['Esc', '닫기'],
    ];

    const element = document.createElement('dialog');
    element.className = 'shortcuts glass glass--floating';
    element.innerHTML = `
      <h2 class="shortcuts__title">키보드 단축키</h2>
      <dl class="shortcuts__list">
        ${rows
          .map(
            ([key, label]) =>
              `<div class="shortcuts__row"><dt><kbd>${key}</kbd></dt><dd>${label}</dd></div>`
          )
          .join('')}
      </dl>`;
    document.body.append(element);

    element.addEventListener('click', (event) => {
      if (event.target === element) element.close();
    });
    return element;
  }
})();
