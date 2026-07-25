/*
 * 한국어 검색.
 *
 * 왜 직접 만들었나:
 *   일반 검색 라이브러리(lunr, MiniSearch 등)의 기본 토크나이저는 영어를 전제한다.
 *   공백/구두점으로만 자르기 때문에 교착어인 한국어에서는 "백준을", "백준에서",
 *   "백준의" 가 전부 다른 토큰이 되어 검색이 사실상 동작하지 않는다.
 *   해결책은 형태소 분석기(무겁다)이거나 문자 n-gram 이다. 후자를 택했다.
 *
 *   한글 구간은 2-gram 으로, 영문/숫자 구간은 단어로 자른다. "백준" 을 치면
 *   "백준을" 이 만든 bigram("백준", "준을") 중 "백준" 이 걸린다.
 *
 * 인덱스는 검색창을 처음 열 때만 받아온다. 초기 로딩에는 아무 영향이 없다.
 */
(function search() {
  const INDEX_URL = '/search-index.json';
  const MAX_RESULTS = 12;

  /** 한글은 bigram, ASCII 는 단어 단위로 자른다. */
  function tokenize(text) {
    const tokens = [];
    for (const chunk of String(text).match(/[가-힣]+|[a-zA-Z0-9_]+/gu) ?? []) {
      if (/[가-힣]/u.test(chunk)) {
        tokens.push(chunk); // 원형도 넣어야 정확히 일치할 때 점수가 높다
        for (let i = 0; i < chunk.length - 1; i += 1) tokens.push(chunk.slice(i, i + 2));
      } else {
        tokens.push(chunk.toLowerCase());
      }
    }
    return tokens;
  }

  /* 필드별 가중치. 제목에 있는 말이 본문 요약에 있는 말보다 훨씬 중요하다. */
  const FIELDS = [
    ['title', 8],
    ['tags', 4],
    ['categories', 4],
    ['headings', 3],
    ['excerpt', 1],
  ];

  let indexPromise = null;
  let dialog = null;
  let input = null;
  let resultsEl = null;
  let activeIndex = 0;
  let currentResults = [];

  /** 문서들에서 역색인을 만든다. 문서 20여 개 규모라 즉시 끝난다. */
  function buildIndex(documents) {
    /** token -> Map(docIndex -> weight) */
    const postings = new Map();

    documents.forEach((doc, docIndex) => {
      for (const [field, weight] of FIELDS) {
        const value = doc[field];
        const text = Array.isArray(value) ? value.join(' ') : (value ?? '');
        for (const token of tokenize(text)) {
          if (!postings.has(token)) postings.set(token, new Map());
          const docs = postings.get(token);
          docs.set(docIndex, (docs.get(docIndex) ?? 0) + weight);
        }
      }
    });

    return { documents, postings };
  }

  function loadIndex() {
    indexPromise ??= fetch(INDEX_URL)
      .then((response) => {
        if (!response.ok) throw new Error(`검색 인덱스를 받지 못했다 (${response.status})`);
        return response.json();
      })
      .then((data) => buildIndex(data.documents));
    return indexPromise;
  }

  function query(index, text) {
    const tokens = tokenize(text);
    if (!tokens.length) return [];

    const total = index.documents.length;
    /** docIndex -> score */
    const scores = new Map();

    for (const token of tokens) {
      const docs = index.postings.get(token);
      if (!docs) continue;

      // 흔한 토큰의 영향력을 낮춘다 (idf). 안 그러면 조사 파편이 점수를 지배한다.
      const idf = Math.log(1 + total / docs.size);
      for (const [docIndex, weight] of docs) {
        scores.set(docIndex, (scores.get(docIndex) ?? 0) + weight * idf);
      }
    }

    return [...scores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_RESULTS)
      .map(([docIndex]) => index.documents[docIndex]);
  }

  /* ── UI ────────────────────────────────────────────────── */

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/gu, (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]
    );
  }

  /** 검색어에 등장한 조각을 결과에서 강조한다. */
  function highlight(text, terms) {
    let out = escapeHtml(text);
    for (const term of terms) {
      if (term.length < 1) continue;
      out = out.replace(
        new RegExp(term.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'), 'giu'),
        (match) => `<mark>${match}</mark>`
      );
    }
    return out;
  }

  function render(results, terms) {
    currentResults = results;
    activeIndex = 0;

    if (!results.length) {
      resultsEl.innerHTML = `<li class="search-dialog__empty">${
        input.value.trim() ? '결과가 없습니다' : '제목, 태그, 소제목에서 찾습니다'
      }</li>`;
      return;
    }

    resultsEl.innerHTML = results
      .map(
        (doc, i) => `<li class="search-result${i === 0 ? ' is-active' : ''}">
          <a class="search-result__link" href="${escapeHtml(doc.id)}">
            <div class="search-result__title">${highlight(doc.title, terms)}</div>
            ${doc.excerpt ? `<div class="search-result__excerpt">${highlight(doc.excerpt, terms)}</div>` : ''}
            <div class="search-result__meta">
              <span>${escapeHtml(doc.categories.join(', '))}</span>
              <span>${escapeHtml(doc.date)}</span>
            </div>
          </a>
        </li>`
      )
      .join('');
  }

  function setActive(next) {
    const items = resultsEl.querySelectorAll('.search-result');
    if (!items.length) return;

    items[activeIndex]?.classList.remove('is-active');
    activeIndex = (next + items.length) % items.length;
    items[activeIndex].classList.add('is-active');
    items[activeIndex].scrollIntoView({ block: 'nearest' });
  }

  function createDialog() {
    dialog = document.createElement('dialog');
    // Spotlight 처럼 떠 있는 유리판. 배경 위에 얹히므로 floating 변형을 쓴다.
    dialog.className = 'search-dialog glass glass--floating';
    dialog.innerHTML = `
      <input class="search-dialog__input" type="search" placeholder="검색어를 입력하세요"
             aria-label="검색어" autocomplete="off" spellcheck="false">
      <ul class="search-dialog__results"></ul>
      <div class="search-dialog__footer">
        <span>↑↓ 이동</span><span>↵ 열기</span><span>esc 닫기</span>
      </div>`;
    document.body.append(dialog);

    input = dialog.querySelector('.search-dialog__input');
    resultsEl = dialog.querySelector('.search-dialog__results');

    input.addEventListener('input', async () => {
      const text = input.value.trim();
      const index = await loadIndex();
      render(text ? query(index, text) : [], tokenize(text));
    });

    dialog.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActive(activeIndex + 1);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActive(activeIndex - 1);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        const link = resultsEl.querySelectorAll('.search-result__link')[activeIndex];
        if (link) window.location.href = link.href;
      }
    });

    // 바깥 클릭으로 닫기 — dialog 자체가 backdrop 클릭 타깃이 된다.
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });

    return dialog;
  }

  async function open() {
    if (!dialog) createDialog();
    if (!dialog.open) dialog.showModal();

    /*
     * `preventScroll: true` 가 없으면 포커스를 받을 때 브라우저가 그 요소를 화면에
     * 보이게 하려고 문서를 스크롤한다. 검색창은 top layer 에 떠 있어서 스크롤할
     * 이유가 없는데도 문서가 맨 위로 튀어, 검색을 닫으면 읽던 자리를 잃는다.
     */
    input.focus({ preventScroll: true });
    input.select();

    try {
      const index = await loadIndex();
      if (!currentResults.length && !input.value) render([], []);
      else if (input.value) render(query(index, input.value.trim()), tokenize(input.value));
    } catch (error) {
      resultsEl.innerHTML = `<li class="search-dialog__empty">${escapeHtml(error.message)}</li>`;
    }
  }

  for (const button of document.querySelectorAll('[data-search-open]')) {
    button.addEventListener('click', open);
  }

  document.addEventListener('keydown', (event) => {
    // ⌘K / Ctrl+K 로 열고, `/` 는 입력 중이 아닐 때만.
    const isShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
    const isSlash =
      event.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/u.test(document.activeElement?.tagName ?? '');

    if (isShortcut || isSlash) {
      event.preventDefault();
      open();
    }
  });
})();
