/*
 * 유리 표면의 스페큘러 하이라이트.
 *
 * macOS 에서 창을 움직이면 유리 위의 반사광이 따라 흐른다. 웹에서 그걸 흉내 내려면
 * 포인터 좌표가 필요하므로, 요소 기준 좌표를 CSS 변수(--mx/--my)로 넘겨준다.
 * 실제로 빛을 그리는 건 CSS 쪽(.glass--specular::before)이다.
 *
 * 다크 모드에서만 동작한다. 라이트 모드에서는 CSS 가 이 효과를 감추므로
 * (밝은 표면 위의 흰 하이라이트는 빛이 아니라 얼룩으로 보인다) 좌표를 계산할
 * 이유도 없다. 그래서 그릴 필요가 없는 상태면 이벤트 처리 자체를 건너뛴다.
 *
 * 성능 주의:
 *   - pointermove 는 초당 수백 번 들어온다. 그대로 스타일을 쓰면 매 이벤트마다
 *     레이아웃이 무효화되므로 requestAnimationFrame 으로 프레임당 한 번만 반영한다.
 *   - 포인터가 없는 기기(터치)와 움직임 축소 설정에서는 아예 붙이지 않는다.
 */
(function specularHighlight() {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const surfaces = document.querySelectorAll('.glass--specular');
  if (!surfaces.length) return;

  const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

  /** CSS 의 표시 조건과 같은 판단. 테마 토글에 즉시 따라붙어야 해서 매번 읽는다. */
  function isDark() {
    const theme = document.documentElement.dataset.theme;
    return theme === 'dark' || (theme !== 'light' && systemDark.matches);
  }

  let frame = null;
  /** @type {{el: Element, x: number, y: number} | null} */
  let pending = null;

  function flush() {
    frame = null;
    if (!pending) return;
    pending.el.style.setProperty('--mx', `${pending.x}px`);
    pending.el.style.setProperty('--my', `${pending.y}px`);
    pending = null;
  }

  for (const surface of surfaces) {
    surface.addEventListener('pointermove', (event) => {
      if (!isDark()) return;
      const rect = surface.getBoundingClientRect();
      pending = { el: surface, x: event.clientX - rect.left, y: event.clientY - rect.top };
      frame ??= requestAnimationFrame(flush);
    });

    // 떠날 때 좌표를 화면 밖으로 돌려놔야 다음에 들어올 때 이전 위치에서
    // 빛이 튀어나오지 않는다.
    surface.addEventListener('pointerleave', () => {
      surface.style.removeProperty('--mx');
      surface.style.removeProperty('--my');
    });
  }
})();
