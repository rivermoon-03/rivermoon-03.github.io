/*
 * 목차 현재 위치 표시.
 *
 * scroll 이벤트로 매번 위치를 계산하면 스크롤이 끊긴다. IntersectionObserver 로
 * 헤딩이 화면 상단 밴드를 지날 때만 갱신한다.
 */
(function tocHighlight() {
  const toc = document.querySelector('[data-toc]');
  if (!toc) return;

  const links = new Map();
  for (const link of toc.querySelectorAll('.toc__link')) {
    const id = decodeURIComponent(link.getAttribute('href').slice(1));
    if (id) links.set(id, link);
  }
  if (!links.size) return;

  const headings = [...links.keys()]
    .map((id) => document.getElementById(id))
    .filter(Boolean);
  if (!headings.length) return;

  let activeId = null;

  function setActive(id) {
    if (id === activeId) return;
    if (activeId) links.get(activeId)?.classList.remove('is-active');
    activeId = id;
    const link = links.get(id);
    if (!link) return;

    link.classList.add('is-active');
    // 목차가 길면 활성 항목이 스크롤 밖으로 나간다. 보이는 범위로 끌어온다.
    link.scrollIntoView({ block: 'nearest' });
  }

  // 화면 상단 20% 지점을 기준선으로 삼는다.
  const observer = new IntersectionObserver(
    () => {
      const line = window.innerHeight * 0.2;
      // 기준선을 이미 지난 헤딩 중 가장 아래 것이 "현재 절"이다.
      let current = headings[0];
      for (const heading of headings) {
        if (heading.getBoundingClientRect().top <= line) current = heading;
        else break;
      }
      setActive(current.id);
    },
    { rootMargin: '-20% 0px -70% 0px', threshold: 0 }
  );

  for (const heading of headings) observer.observe(heading);
})();
