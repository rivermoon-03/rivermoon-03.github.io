/*
 * 모션 보조.
 *
 * 두 가지를 한다:
 *   1. 스크롤해서 화면에 들어오는 요소를 나타나게 한다.
 *   2. 목록에서 누른 글의 제목이 다음 페이지 제목으로 이어지도록 이름을 붙인다.
 *
 * 실제 움직임은 전부 CSS 가 그린다. JS 는 "언제"만 알려준다.
 */
(function motion() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ── 스크롤 등장 ─────────────────────────────────────────── */
  (function scrollReveal() {
    const targets = document.querySelectorAll('[data-reveal]');
    if (!targets.length) return;

    // 움직임 축소 설정이면 숨기지 않는다. 클래스를 안 붙이면 CSS 도 안 숨긴다.
    if (reduced.matches || !('IntersectionObserver' in window)) return;

    // 이 클래스가 붙어야 CSS 가 대상을 숨긴다. JS 가 여기까지 왔다는 뜻이므로,
    // 아래 옵저버가 반드시 다시 보이게 해줄 수 있다는 보장이 선 뒤에 붙인다.
    document.documentElement.classList.add('js-motion');

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-revealed');
          // 한 번 나타난 것은 다시 감시하지 않는다. 스크롤을 되감을 때마다
          // 사라졌다 나타나면 읽는 흐름이 끊기고, 관찰 비용도 계속 든다.
          observer.unobserve(entry.target);
        }
      },
      // 화면에 완전히 들어오기 전에 시작해야 "이미 자리에 있던" 느낌이 난다.
      { rootMargin: '0px 0px -12% 0px', threshold: 0.05 }
    );

    for (const target of targets) observer.observe(target);
  })();

  /* ── 제목 이어지기 (View Transitions) ────────────────────── */
  (function morphTitle() {
    if (!document.startViewTransition && !CSS.supports('view-transition-name: none')) return;

    document.addEventListener(
      'click',
      (event) => {
        const link = event.target.closest('a[href^="/posts/"]');
        if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;

        const title = link.querySelector('.post-row__title, .post-item__title');
        if (!title) return;

        /*
         * 한 문서 안에 같은 view-transition-name 이 둘 이상 있으면 전환이 통째로
         * 취소된다. 목록에는 제목이 여러 개이므로, 누른 것 하나에만 잠깐 붙였다가
         * 뗀다. 뒤로가기로 돌아왔을 때 이름이 남아 있으면 다음 클릭이 죽는다.
         */
        title.style.viewTransitionName = 'post-title';

        const clear = () => {
          title.style.viewTransitionName = '';
        };
        window.addEventListener('pageswap', clear, { once: true });
        window.addEventListener('pagehide', clear, { once: true });
        // 전환이 아예 시작되지 않는 경우(같은 페이지 링크 등)의 안전망.
        setTimeout(clear, 1000);
      },
      { capture: true }
    );
  })();
})();
