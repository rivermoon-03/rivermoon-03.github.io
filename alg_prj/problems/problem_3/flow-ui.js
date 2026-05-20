(function () {
  'use strict';

  const PATH_COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316'
  ];

  let state = {
    N: 5,
    starts: [],   // [[r, c], ...] 0-indexed
    result: null  // FLOW.solve(...) output
  };

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  function startsHas(r, c) {
    return state.starts.some(([rr, cc]) => rr === r && cc === c);
  }

  function toggleStart(r, c) {
    const i = state.starts.findIndex(([rr, cc]) => rr === r && cc === c);
    if (i >= 0) state.starts.splice(i, 1);
    else state.starts.push([r, c]);
    state.result = null;
    renderMainGrid();
    renderStepGrid();
    clearResult();
    setNarration(null);
    syncProgress();
  }

  // ============================================================
  // Grid rendering
  // ============================================================
  function gridGeometry(N) {
    const SVG = 460;
    const pad = 20;
    const cellSize = Math.floor((SVG - pad * 2) / N);
    const totalW = cellSize * N;
    const offset = (SVG - totalW) / 2;
    return { SVG, pad, cellSize, offset };
  }

  function cellCenter(r, c, geom) {
    return {
      x: geom.offset + c * geom.cellSize + geom.cellSize / 2,
      y: geom.offset + r * geom.cellSize + geom.cellSize / 2
    };
  }

  function renderGridBase(svgId, paths /* {cells, color}[] */, augPath /* cells or null */) {
    const svg = document.getElementById(svgId);
    if (!svg) return;
    const N = state.N;
    const geom = gridGeometry(N);
    const interactive = svgId === 'flow-grid';
    let html = '';

    // Cell rects
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const isB = window.FLOW.isBoundary(r, c, N);
        const isS = startsHas(r, c);
        const cls = ['cell-rect'];
        if (isB) cls.push('boundary');
        if (isS) cls.push('start');
        const x = geom.offset + c * geom.cellSize;
        const y = geom.offset + r * geom.cellSize;
        html += `<rect class="${cls.join(' ')}" data-r="${r}" data-c="${c}" x="${x}" y="${y}" width="${geom.cellSize}" height="${geom.cellSize}" rx="3"/>`;
      }
    }

    // labels
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const ctr = cellCenter(r, c, geom);
        const isS = startsHas(r, c);
        const cls = isS ? 'cell-label start' : 'cell-label';
        const lbl = `${r + 1},${c + 1}`;
        const yOff = isS ? -geom.cellSize / 2 + 14 : 0;
        html += `<text class="${cls}" x="${ctr.x}" y="${ctr.y + yOff + 4}">${lbl}</text>`;
      }
    }

    // start dots
    for (const [r, c] of state.starts) {
      const ctr = cellCenter(r, c, geom);
      html += `<circle class="cell-start-dot" cx="${ctr.x}" cy="${ctr.y + 4}" r="8"/>`;
    }

    // Result paths
    if (paths) {
      paths.forEach((path, idx) => {
        if (!path.cells || path.cells.length === 0) return;
        const points = path.cells.map(([r, c]) => {
          const ctr = cellCenter(r, c, geom);
          return `${ctr.x.toFixed(1)},${ctr.y.toFixed(1)}`;
        });
        // Append a point onto the boundary (extending past the last cell)
        const last = path.cells[path.cells.length - 1];
        const [lr, lc] = last;
        let exitX, exitY;
        const lastCtr = cellCenter(lr, lc, geom);
        if (lr === 0) { exitX = lastCtr.x; exitY = lastCtr.y - geom.cellSize / 2 - 6; }
        else if (lr === N - 1) { exitX = lastCtr.x; exitY = lastCtr.y + geom.cellSize / 2 + 6; }
        else if (lc === 0) { exitX = lastCtr.x - geom.cellSize / 2 - 6; exitY = lastCtr.y; }
        else if (lc === N - 1) { exitX = lastCtr.x + geom.cellSize / 2 + 6; exitY = lastCtr.y; }
        else { exitX = lastCtr.x; exitY = lastCtr.y; }
        points.push(`${exitX.toFixed(1)},${exitY.toFixed(1)}`);
        html += `<polyline class="path-line" points="${points.join(' ')}" stroke="${path.color}"/>`;
      });
    }

    // Augmenting path overlay (cells)
    if (augPath && augPath.length > 0) {
      const points = augPath.map(([r, c]) => {
        const ctr = cellCenter(r, c, geom);
        return `${ctr.x.toFixed(1)},${ctr.y.toFixed(1)}`;
      });
      html += `<polyline class="path-aug" points="${points.join(' ')}"/>`;
    }

    svg.innerHTML = html;

    if (interactive) {
      svg.querySelectorAll('.cell-rect').forEach((rect) => {
        rect.addEventListener('click', () => {
          const r = parseInt(rect.dataset.r, 10);
          const c = parseInt(rect.dataset.c, 10);
          toggleStart(r, c);
        });
      });
    }
  }

  function renderMainGrid() {
    const paths = state.result
      ? state.result.pathByStart.map((p, i) => p
          ? { cells: p, color: PATH_COLORS[i % PATH_COLORS.length] }
          : { cells: null }
        )
      : null;
    renderGridBase('flow-grid', paths, null);
  }

  function renderStepGrid() {
    const cells = currentAugCells();
    renderGridBase('flow-grid-step', null, cells);
  }

  // ============================================================
  // Solver
  // ============================================================
  function runSolver() {
    if (state.starts.length === 0) {
      clearResult();
      setNarration('<span class="rev">출발점이 없습니다.</span> 격자 셀을 클릭하거나 프리셋을 사용하세요.');
      stepIndex = 0;
      syncProgress();
      return;
    }
    state.result = window.FLOW.solve(state.N, state.starts.slice());
    showResult();
    renderMainGrid();
    stepIndex = 0;
    renderStepGrid();
    setNarration(null);
    syncProgress();
  }

  function showResult() {
    const wrap = document.getElementById('flow-result');
    const big = document.getElementById('flow-bignum');
    const verdict = document.getElementById('flow-verdict');
    const list = document.getElementById('path-list');
    if (!state.result) return;
    wrap.style.display = '';
    const { maxFlow, total } = state.result;
    big.textContent = `${maxFlow} / ${total}`;
    big.classList.toggle('failed', maxFlow < total);
    if (maxFlow === total) {
      verdict.innerHTML = `<b>전원 탈출 성공.</b> ${total}명 모두 서로 겹치지 않는 경로로 경계까지.`;
    } else {
      const stuck = total - maxFlow;
      verdict.innerHTML = `<b>${stuck}명 탈출 불가.</b> 다른 경로들과 충돌하여 모두를 동시에 보낼 수 없습니다.`;
    }
    // Path list
    list.innerHTML = '';
    state.result.pathByStart.forEach((p, i) => {
      const [sr, sc] = state.starts[i];
      const item = document.createElement('div');
      const color = PATH_COLORS[i % PATH_COLORS.length];
      if (p) {
        item.className = 'path-item';
        item.style.borderLeftColor = color;
        const cells = p.map(([r, c]) => `(${r + 1},${c + 1})`).join(' → ');
        item.innerHTML = `<span class="path-from" style="color:${color};">출발 (${sr + 1},${sc + 1})</span><span class="path-arrow">↦</span><span>${cells}</span>`;
      } else {
        item.className = 'path-item stuck';
        item.innerHTML = `<span class="path-from">출발 (${sr + 1},${sc + 1})</span><span class="path-arrow">⊘</span><span>탈출 경로 없음</span>`;
      }
      list.appendChild(item);
    });
  }

  function clearResult() {
    const wrap = document.getElementById('flow-result');
    if (wrap) wrap.style.display = 'none';
    const list = document.getElementById('path-list');
    if (list) list.innerHTML = '';
    state.result = null;
    renderMainGrid();
  }

  // ============================================================
  // Step playback (cell 6)
  // ============================================================
  let stepIndex = 0;

  function currentAugCells() {
    if (!state.result || stepIndex === 0) return null;
    // get the (stepIndex - 1)-th augmenting path and extract grid cells
    const aug = state.result.augmentingPaths[stepIndex - 1];
    if (!aug) return null;
    const cells = [];
    for (const node of aug) {
      if (node.kind === 'in') cells.push([node.r, node.c]);
    }
    return cells;
  }

  function syncProgress() {
    const total = state.result ? state.result.augmentingPaths.length : 0;
    document.getElementById('aug-progress').textContent = `${stepIndex} / ${total}`;
    document.getElementById('aug-prev').disabled = stepIndex === 0;
    document.getElementById('aug-next').disabled = stepIndex >= total;
    document.getElementById('aug-skip').disabled = stepIndex >= total;
  }

  function setNarration(html) {
    const n = document.getElementById('aug-narration');
    if (!n) return;
    n.innerHTML = html || '<span class="narration-empty">셀 5에서 계산하면 여기서 단계별로 재생됩니다.</span>';
  }

  function augReason(index) {
    if (!state.result) return null;
    const aug = state.result.augmentingPaths[index];
    if (!aug) return null;
    const cells = aug.filter((n) => n.kind === 'in').map((n) => `(${n.r + 1},${n.c + 1})`).join(' → ');
    const hasRev = aug.some((n) => n.isReverse);
    let html = `반복 ${index + 1}: BFS로 증가 경로 발견 — <code>S → ${cells} → T</code>. 1단위 흘려보냄.`;
    if (hasRev) html += ` <span class="rev">역방향 잔여 간선 사용</span> — 이전 단계의 일부를 "되돌리며" 더 나은 조합으로 재배치.`;
    return html;
  }

  function stepNext() {
    if (!state.result) return;
    if (stepIndex >= state.result.augmentingPaths.length) return;
    stepIndex++;
    renderStepGrid();
    setNarration(augReason(stepIndex - 1));
    syncProgress();
  }
  function stepPrev() {
    if (stepIndex === 0) return;
    stepIndex--;
    renderStepGrid();
    setNarration(stepIndex === 0 ? null : augReason(stepIndex - 1));
    syncProgress();
  }
  function stepReset() {
    stepIndex = 0;
    renderStepGrid();
    setNarration(null);
    syncProgress();
  }
  function stepSkip() {
    if (!state.result) return;
    stepIndex = state.result.augmentingPaths.length;
    renderStepGrid();
    setNarration(`완료. 증가 경로 <b>${state.result.augmentingPaths.length}</b>개 발견 → 최대 유량 = ${state.result.maxFlow}.`);
    syncProgress();
  }

  // ============================================================
  // Wiring
  // ============================================================
  function setN(n) {
    state.N = n;
    document.querySelectorAll('#size-radio button').forEach((b) => {
      b.classList.toggle('is-active', parseInt(b.dataset.n, 10) === n);
    });
    state.starts = [];
    state.result = null;
    stepIndex = 0;
    renderMainGrid();
    renderStepGrid();
    clearResult();
    setNarration(null);
    syncProgress();
  }

  function loadPreset(key) {
    const preset = window.FLOW.PRESETS[key];
    if (!preset) return;
    state.N = preset.N;
    state.starts = preset.starts.map(([r, c]) => [r - 1, c - 1]);
    document.querySelectorAll('#size-radio button').forEach((b) => {
      b.classList.toggle('is-active', parseInt(b.dataset.n, 10) === preset.N);
    });
    state.result = null;
    stepIndex = 0;
    renderMainGrid();
    renderStepGrid();
    clearResult();
    setNarration(null);
    syncProgress();
  }

  function init() {
    if (!window.FLOW) {
      console.error('FLOW module not loaded');
      return;
    }

    // size radio
    document.querySelectorAll('#size-radio button').forEach((b) => {
      b.addEventListener('click', () => setN(parseInt(b.dataset.n, 10)));
    });
    document.getElementById('preset-easy').addEventListener('click', () => loadPreset('easy3'));
    document.getElementById('preset-tight').addEventListener('click', () => loadPreset('tight4'));
    document.getElementById('preset-stuck').addEventListener('click', () => loadPreset('stuck5'));
    document.getElementById('clear-starts').addEventListener('click', () => {
      state.starts = [];
      state.result = null;
      stepIndex = 0;
      renderMainGrid();
      renderStepGrid();
      clearResult();
      setNarration(null);
      syncProgress();
    });
    document.getElementById('run-solver').addEventListener('click', runSolver);

    // step controls
    document.getElementById('aug-next').addEventListener('click', stepNext);
    document.getElementById('aug-prev').addEventListener('click', stepPrev);
    document.getElementById('aug-reset').addEventListener('click', stepReset);
    document.getElementById('aug-skip').addEventListener('click', stepSkip);

    // Keyboard shortcuts via notebook.js
    window.STEP_CONTROLS = { next: stepNext, prev: stepPrev, reset: stepReset, skip: stepSkip };

    // Initial preset
    loadPreset('easy3');
    runSolver();
  }

  ready(init);
})();
