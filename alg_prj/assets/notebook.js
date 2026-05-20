(function () {
  'use strict';

  function initStepper() {
    const stepperRoot = document.querySelector('.stepper-inner');
    if (!stepperRoot) return;

    const cells = Array.from(document.querySelectorAll('.cell'));
    if (cells.length === 0) return;

    const dots = cells.map((cell, idx) => {
      const title = cell.dataset.short || `${idx}`;
      const num = cell.dataset.num || `${idx}`;
      const btn = document.createElement('button');
      btn.className = 'stepper-dot';
      btn.innerHTML = `<span class="dot-num">${num}</span><span class="dot-label">${title}</span>`;
      btn.addEventListener('click', () => {
        cell.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      stepperRoot.appendChild(btn);
      return btn;
    });

    const visited = new Set();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const idx = cells.indexOf(entry.target);
          if (idx < 0) return;
          dots.forEach((d, i) => {
            d.classList.toggle('is-active', i === idx);
            if (i <= idx) visited.add(i);
            d.classList.toggle('is-visited', visited.has(i) && i !== idx);
          });
        });
      },
      { rootMargin: '-40% 0px -55% 0px', threshold: 0 }
    );
    cells.forEach((c) => observer.observe(c));
  }

  function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'h' || e.key === 'H') {
        toggleFloatPanel();
        return;
      }
      const ctrl = window.STEP_CONTROLS || window.OBST_CONTROLS;
      if (!ctrl) return;
      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          ctrl.next();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          ctrl.prev();
          break;
        case 'r':
        case 'R':
          ctrl.reset();
          break;
        case 'e':
        case 'E':
          ctrl.skip();
          break;
      }
    });
  }

  function setFloatPanelHidden(hidden) {
    const panel = document.getElementById('float-panel');
    const handle = document.getElementById('float-show');
    if (!panel || !handle) return;
    panel.classList.toggle('is-hidden', hidden);
    handle.classList.toggle('is-visible', hidden);
  }

  function toggleFloatPanel() {
    const panel = document.getElementById('float-panel');
    if (!panel) return;
    setFloatPanelHidden(!panel.classList.contains('is-hidden'));
  }

  function initFloatPanel() {
    const closeBtn = document.getElementById('float-close');
    const showBtn = document.getElementById('float-show');
    if (closeBtn) closeBtn.addEventListener('click', () => setFloatPanelHidden(true));
    if (showBtn) showBtn.addEventListener('click', () => setFloatPanelHidden(false));
  }

  function renderKatexAll() {
    if (!window.renderMathInElement) return;
    window.renderMathInElement(document.body, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false },
        { left: '\\[', right: '\\]', display: true },
        { left: '\\(', right: '\\)', display: false }
      ],
      throwOnError: false
    });
  }

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(() => {
    initStepper();
    initFloatPanel();
    initKeyboardShortcuts();
    renderKatexAll();
  });
})();
