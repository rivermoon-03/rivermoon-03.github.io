/*
 * 이미지 확대.
 *
 * 본문 이미지는 글 폭에 맞춰 줄어들어 있어서, 스크린샷의 글씨가 안 읽히는 경우가 많다.
 * 눌러서 원래 크기로 보게 한다.
 *
 * `<dialog>` 를 쓰는 이유: 포커스 가두기, Esc 로 닫기, 뒤 배경 비활성화가 전부
 * 브라우저 기본 동작으로 따라온다. 직접 만들면 이 셋을 다 놓치기 쉽다.
 */
(function lightbox() {
  const images = document.querySelectorAll('.prose img');
  if (!images.length) return;

  let dialog = null;
  let figure = null;

  function ensureDialog() {
    if (dialog) return dialog;

    dialog = document.createElement('dialog');
    dialog.className = 'lightbox';
    dialog.innerHTML = `
      <button type="button" class="lightbox__close" aria-label="닫기">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18"/>
        </svg>
      </button>
      <figure class="lightbox__figure"><img alt=""><figcaption></figcaption></figure>`;
    document.body.append(dialog);
    figure = dialog.querySelector('.lightbox__figure');

    dialog.querySelector('.lightbox__close').addEventListener('click', () => dialog.close());
    // 이미지 바깥(배경)을 누르면 닫힌다.
    dialog.addEventListener('click', (event) => {
      if (!event.target.closest('.lightbox__figure')) dialog.close();
    });

    return dialog;
  }

  function open(image) {
    const box = ensureDialog();
    const target = box.querySelector('img');
    const caption = box.querySelector('figcaption');

    target.src = image.currentSrc || image.src;
    target.alt = image.alt || '';
    // 원본 비율을 유지해 열리는 순간 크기가 튀지 않게 한다.
    if (image.naturalWidth) {
      target.width = image.naturalWidth;
      target.height = image.naturalHeight;
    }

    caption.textContent = image.alt || '';
    caption.hidden = !image.alt;

    box.showModal();
  }

  for (const image of images) {
    // 링크로 감싸인 이미지는 건드리지 않는다. 누르면 그 링크로 가야 한다.
    if (image.closest('a')) continue;

    image.classList.add('is-zoomable');
    image.addEventListener('click', () => open(image));

    // 마우스 없이도 열 수 있어야 한다.
    image.tabIndex = 0;
    image.setAttribute('role', 'button');
    image.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        open(image);
      }
    });
  }
})();
