/*
 * 코드블록 복사 버튼.
 *
 * 버튼마다 리스너를 달지 않고 문서에 하나만 위임한다. 한 글에 코드블록이
 * 10개 넘게 들어가는 경우가 흔해서 이쪽이 가볍다.
 */
(function copyCode() {
  document.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-copy]');
    if (!button) return;

    const block = button.closest('.code-block');
    const code = block?.querySelector('pre code');
    if (!code) return;

    // innerText 를 쓰면 줄바꿈이 보이는 대로 들어온다. textContent 는 안 그렇다.
    const text = code.innerText;

    try {
      await navigator.clipboard.writeText(text);
      button.dataset.copied = '';
      button.textContent = '복사됨';
    } catch {
      button.textContent = '복사 실패';
    }

    setTimeout(() => {
      delete button.dataset.copied;
      button.textContent = '복사';
    }, 1600);
  });
})();
