/*
 * 읽기 보조 — 진행률 표시줄, 맨 위로 버튼, 헤딩 링크 복사.
 *
 * 셋 다 글 페이지에서만 의미가 있어서 본문(.post)이 없으면 아무것도 하지 않는다.
 * 필요한 DOM 은 여기서 만든다. 모든 페이지의 HTML 에 쓰지도 않을 요소를 심어둘
 * 이유가 없다.
 */
(function readingAids() {
  const article = document.querySelector('.post .prose');
  if (!article) return;

  /* ── 진행률 표시줄 ───────────────────────────────────────── */
  (function progressBar() {
    const bar = document.createElement('div');
    bar.className = 'read-progress';
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-label', '읽기 진행률');
    bar.setAttribute('aria-valuemin', '0');
    bar.setAttribute('aria-valuemax', '100');
    document.querySelector('.masthead')?.append(bar);

    let frame = null;

    function update() {
      frame = null;

      // 기준은 문서 전체가 아니라 본문이다. 헤더·푸터·관련글까지 포함해서 재면
      // 글을 다 읽었는데도 60% 로 보인다.
      const rect = article.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      // 화면보다 짧은 글은 진행률이라는 개념이 성립하지 않는다.
      if (total <= 0) {
        bar.style.setProperty('--progress', '0');
        return;
      }

      const passed = Math.min(Math.max(-rect.top, 0), total);
      const ratio = passed / total;
      bar.style.setProperty('--progress', String(ratio));
      bar.setAttribute('aria-valuenow', String(Math.round(ratio * 100)));
    }

    // scroll 은 초당 수십~수백 번 들어온다. 프레임당 한 번으로 묶는다.
    const schedule = () => {
      frame ??= requestAnimationFrame(update);
    };

    addEventListener('scroll', schedule, { passive: true });
    addEventListener('resize', schedule, { passive: true });
    update();
  })();

  /* ── 맨 위로 ─────────────────────────────────────────────── */
  (function backToTop() {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'to-top';
    button.setAttribute('aria-label', '맨 위로');
    button.innerHTML =
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 14 6-6 6 6"/></svg>';
    document.body.append(button);

    button.addEventListener('click', () => {
      // 움직임 축소 설정이면 스크롤 애니메이션도 멀미의 원인이 된다.
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    });

    let frame = null;
    const update = () => {
      frame = null;
      // 한 화면 넘게 내려갔을 때만 보인다. 그 전에는 위가 이미 보이므로 버튼이 방해다.
      button.classList.toggle('is-visible', window.scrollY > window.innerHeight * 0.8);
    };

    addEventListener(
      'scroll',
      () => {
        frame ??= requestAnimationFrame(update);
      },
      { passive: true }
    );
    update();
  })();

  /* ── 헤딩 링크 복사 ──────────────────────────────────────── */
  (function headingAnchors() {
    article.addEventListener('click', async (event) => {
      const anchor = event.target.closest('[data-anchor]');
      if (!anchor) return;

      // 기본 동작(해당 절로 이동)은 그대로 두고, 주소를 클립보드에도 넣는다.
      // 링크를 눌렀는데 이동을 막으면 오히려 당황스럽다.
      const url = new URL(anchor.getAttribute('href'), location.href).href;
      try {
        await navigator.clipboard.writeText(url);
        anchor.dataset.copied = '';
        setTimeout(() => delete anchor.dataset.copied, 1400);
      } catch {
        // 클립보드가 막혀 있어도 이동은 된다. 조용히 넘어간다.
      }
    });
  })();
})();
