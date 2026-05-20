(function () {
  'use strict';

  let state = {
    N: 3,
    cost: [
      [5, 1, 9],
      [9, 2, 9],
      [9, 9, 1]
    ],
    result: null,
    step: 0
  };

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  // ============================================================
  // Cost matrix table
  // ============================================================
  function renderCostMatrix() {
    const tbl = document.getElementById('cost-matrix');
    if (!tbl) return;
    const N = state.N;
    const assignment = currentAssignment();
    const currentStep = state.result && state.step > 0 ? state.result.steps[state.step] : null;
    const highlightPair = currentStepWorkerTaskPair(currentStep);

    let html = '<thead><tr><th></th>';
    for (let j = 0; j < N; j++) html += `<th>T<sub>${j + 1}</sub></th>`;
    html += '</tr></thead><tbody>';

    for (let i = 0; i < N; i++) {
      html += `<tr><th class="row-head">W<sub>${i + 1}</sub></th>`;
      for (let j = 0; j < N; j++) {
        const isAssigned = assignment && assignment[i] === j;
        const isCurrent = highlightPair && highlightPair[0] === i && highlightPair[1] === j;
        const cls = ['cell'];
        if (isAssigned) cls.push('assigned');
        if (isCurrent) cls.push('current');
        html += `<td class="${cls.join(' ')}"><input type="number" data-r="${i}" data-c="${j}" value="${state.cost[i][j]}" min="0" step="1"/></td>`;
      }
      html += '</tr>';
    }
    html += '</tbody>';
    tbl.innerHTML = html;

    tbl.querySelectorAll('input').forEach((inp) => {
      inp.addEventListener('change', (e) => {
        const r = parseInt(inp.dataset.r, 10);
        const c = parseInt(inp.dataset.c, 10);
        const v = parseInt(inp.value, 10);
        if (Number.isInteger(v) && v >= 0) {
          state.cost[r][c] = v;
          state.result = null;
          state.step = 0;
          renderAll();
        }
      });
    });
  }

  function currentAssignment() {
    if (!state.result) return null;
    return state.result.steps[state.step].assignment;
  }

  function currentStepWorkerTaskPair(step) {
    if (!step || step.kind !== 'augment') return null;
    // find the W → task edge segment in pathDescription
    for (let i = 0; i < step.pathDescription.length; i++) {
      const node = step.pathDescription[i];
      const next = step.pathDescription[i + 1];
      if (node && next && node.kind === 'W' && next.kind === 'task' && !next.isReverse) {
        return [node.idx, next.idx];
      }
    }
    return null;
  }

  // ============================================================
  // Bipartite graph
  // ============================================================
  function renderBipartite() {
    const svg = document.getElementById('bipartite-svg');
    if (!svg) return;
    const N = state.N;
    const W = 620;
    const H = 360;
    const LEFT_X = 100;
    const RIGHT_X = 520;
    const S_X = 30;
    const T_X = 590;
    const padY = 30;
    const stepY = (H - padY * 2) / Math.max(1, N - 1);
    const workerY = (i) => N === 1 ? H / 2 : padY + i * stepY;
    const taskY = (j) => N === 1 ? H / 2 : padY + j * stepY;

    const assignment = currentAssignment();
    const currentStep = state.result && state.step > 0 ? state.result.steps[state.step] : null;
    const highlightPair = currentStepWorkerTaskPair(currentStep);

    // Collect current-step path edges (W→task or task→W reverse)
    const currentEdges = []; // {from: 'W'|'task', fromIdx, to, toIdx, reverse}
    if (currentStep && currentStep.kind === 'augment') {
      const desc = currentStep.pathDescription;
      for (let i = 0; i < desc.length - 1; i++) {
        const a = desc[i], b = desc[i + 1];
        if ((a.kind === 'W' && b.kind === 'task') || (a.kind === 'task' && b.kind === 'W')) {
          currentEdges.push({
            from: a.kind, fromIdx: a.idx,
            to: b.kind, toIdx: b.idx,
            reverse: b.isReverse || a.isReverse
          });
        }
      }
    }

    let html = '';

    // background edges (all W → T pairs)
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const x1 = LEFT_X + 20, y1 = workerY(i);
        const x2 = RIGHT_X - 20, y2 = taskY(j);
        html += `<path class="bg-edge" d="M ${x1} ${y1} L ${x2} ${y2}"/>`;
      }
    }

    // assigned edges (final-or-current state)
    if (assignment) {
      for (let i = 0; i < N; i++) {
        const j = assignment[i];
        if (j < 0) continue;
        const x1 = LEFT_X + 20, y1 = workerY(i);
        const x2 = RIGHT_X - 20, y2 = taskY(j);
        html += `<path class="assigned-edge" d="M ${x1} ${y1} L ${x2} ${y2}"/>`;
      }
    }

    // current step edges (orange) on top
    for (const ce of currentEdges) {
      const wi = ce.from === 'W' ? ce.fromIdx : ce.toIdx;
      const ti = ce.from === 'task' ? ce.fromIdx : ce.toIdx;
      const x1 = LEFT_X + 20, y1 = workerY(wi);
      const x2 = RIGHT_X - 20, y2 = taskY(ti);
      const cls = ce.reverse ? 'current-edge reverse' : 'current-edge';
      html += `<path class="${cls}" d="M ${x1} ${y1} L ${x2} ${y2}"/>`;
    }

    // S → W edges (subtle, but emphasized if current step starts at this W)
    const currentWorker = currentStep && currentStep.kind === 'augment'
      ? findFirstWorker(currentStep.pathDescription) : -1;
    for (let i = 0; i < N; i++) {
      const cls = i === currentWorker ? 'current-edge' : 'bg-edge';
      html += `<path class="${cls}" d="M ${S_X + 18} ${H / 2} L ${LEFT_X - 18} ${workerY(i)}"/>`;
    }

    // task → T edges
    const currentTask = currentStep && currentStep.kind === 'augment'
      ? findLastTask(currentStep.pathDescription) : -1;
    for (let j = 0; j < N; j++) {
      const cls = j === currentTask ? 'current-edge' : 'bg-edge';
      html += `<path class="${cls}" d="M ${RIGHT_X + 18} ${taskY(j)} L ${T_X - 18} ${H / 2}"/>`;
    }

    // S node
    html += `<g class="endpoint"><circle cx="${S_X}" cy="${H / 2}" r="18"/><text x="${S_X}" y="${H / 2 + 5}">S</text></g>`;
    // T node
    html += `<g class="endpoint"><circle cx="${T_X}" cy="${H / 2}" r="18"/><text x="${T_X}" y="${H / 2 + 5}">T</text></g>`;

    // worker nodes
    for (let i = 0; i < N; i++) {
      const cls = i === currentWorker ? 'worker current' : 'worker';
      html += `<g class="${cls}"><circle cx="${LEFT_X}" cy="${workerY(i)}" r="20"/><text x="${LEFT_X}" y="${workerY(i) + 5}">W${i + 1}</text></g>`;
    }
    // task nodes
    for (let j = 0; j < N; j++) {
      const cls = j === currentTask ? 'task current' : 'task';
      html += `<g class="${cls}"><circle cx="${RIGHT_X}" cy="${taskY(j)}" r="20"/><text x="${RIGHT_X}" y="${taskY(j) + 5}">T${j + 1}</text></g>`;
    }

    svg.innerHTML = html;
  }

  function findFirstWorker(desc) {
    for (const node of desc) {
      if (node.kind === 'W' && !node.isReverse) return node.idx;
    }
    return -1;
  }
  function findLastTask(desc) {
    for (let i = desc.length - 1; i >= 0; i--) {
      if (desc[i].kind === 'task' && !desc[i].isReverse) return desc[i].idx;
    }
    return -1;
  }

  // ============================================================
  // Result panel
  // ============================================================
  function renderResult() {
    const wrap = document.getElementById('mcmf-result');
    const totalEl = document.getElementById('total-cost');
    const list = document.getElementById('assignment-list');
    if (!state.result) {
      wrap.style.display = 'none';
      return;
    }
    wrap.style.display = '';
    const final = state.result.steps[state.step];
    totalEl.textContent = (state.step === 0 ? 0 : state.result.steps[state.step].cumulativeCost ?? state.result.totalCost);
    list.innerHTML = '';
    final.assignment.forEach((t, i) => {
      const tag = document.createElement('span');
      if (t === -1) {
        tag.className = 'assignment-tag unassigned';
        tag.textContent = `W${i + 1} → ?`;
      } else {
        tag.className = 'assignment-tag';
        tag.textContent = `W${i + 1} → T${t + 1}`;
      }
      list.appendChild(tag);
    });
  }

  // ============================================================
  // Step controls
  // ============================================================
  function setNarration(html) {
    const n = document.getElementById('mcmf-narration');
    if (!n) return;
    n.innerHTML = html || '<span class="narration-empty">실행 후 Next로 진행하세요.</span>';
  }

  function describeStep(step) {
    if (!step || step.kind !== 'augment') return null;
    const segs = step.pathDescription.map((p) => {
      if (p.kind === 'S') return 'S';
      if (p.kind === 'T') return 'T';
      if (p.kind === 'W') return `W${p.idx + 1}${p.isReverse ? '<span class="rev">(역)</span>' : ''}`;
      return `T${p.idx + 1}${p.isReverse ? '<span class="rev">(역)</span>' : ''}`;
    });
    const hasRev = step.pathDescription.some((p) => p.isReverse);
    let html = `<b>반복 ${step.iteration}:</b> SPFA 최단 경로 발견 — <code>${segs.join(' → ')}</code> · 비용 <b>+${step.pathCost}</b>, 누적 <b>${step.cumulativeCost}</b>.`;
    if (hasRev) html += ` <span class="rev">역방향 잔여 간선 사용</span> → 이전 배정 일부가 스왑됨.`;
    return html;
  }

  function syncProgress() {
    const total = state.result ? state.result.steps.length - 1 : 0;
    document.getElementById('mcmf-progress').textContent = `${state.step} / ${total}`;
    document.getElementById('mcmf-prev').disabled = state.step === 0;
    document.getElementById('mcmf-next').disabled = state.step >= total;
    document.getElementById('mcmf-skip').disabled = state.step >= total;
  }

  function renderAll() {
    renderCostMatrix();
    renderBipartite();
    renderResult();
    syncProgress();
  }

  function stepNext() {
    if (!state.result) return;
    if (state.step >= state.result.steps.length - 1) return;
    state.step++;
    setNarration(describeStep(state.result.steps[state.step]));
    renderAll();
  }
  function stepPrev() {
    if (state.step === 0) return;
    state.step--;
    setNarration(state.step === 0 ? null : describeStep(state.result.steps[state.step]));
    renderAll();
  }
  function stepReset() {
    state.step = 0;
    setNarration(null);
    renderAll();
  }
  function stepSkip() {
    if (!state.result) return;
    state.step = state.result.steps.length - 1;
    const final = state.result.steps[state.step];
    setNarration(`완료. <b>${state.result.flow}</b>번 반복 후 최소 총 비용 <b>${state.result.totalCost}</b>.`);
    renderAll();
  }

  function runSolver() {
    state.result = window.MCMF.solve(state.N, state.cost);
    state.step = 0;
    setNarration(null);
    renderAll();
  }

  // ============================================================
  // Size + presets
  // ============================================================
  function setN(n) {
    if (n === state.N) return;
    state.N = n;
    // Build a default cost matrix of size n × n
    state.cost = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => i === j ? 1 : 9)
    );
    state.result = null;
    state.step = 0;
    document.querySelectorAll('#size-radio button').forEach((b) => {
      b.classList.toggle('is-active', parseInt(b.dataset.n, 10) === n);
    });
    setNarration(null);
    renderAll();
  }

  function loadPreset(key) {
    const preset = window.MCMF.PRESETS[key];
    if (!preset) return;
    state.N = preset.cost.length;
    state.cost = preset.cost.map((row) => row.slice());
    state.result = null;
    state.step = 0;
    document.querySelectorAll('#size-radio button').forEach((b) => {
      b.classList.toggle('is-active', parseInt(b.dataset.n, 10) === state.N);
    });
    setNarration(null);
    renderAll();
  }

  function init() {
    if (!window.MCMF) {
      console.error('MCMF module not loaded');
      return;
    }

    document.querySelectorAll('#size-radio button').forEach((b) => {
      b.addEventListener('click', () => setN(parseInt(b.dataset.n, 10)));
    });
    document.getElementById('preset-identity').addEventListener('click', () => loadPreset('identity3'));
    document.getElementById('preset-swap').addEventListener('click', () => loadPreset('swap3'));
    document.getElementById('preset-tricky').addEventListener('click', () => loadPreset('tricky3'));
    document.getElementById('preset-classic').addEventListener('click', () => loadPreset('classic4'));
    document.getElementById('run-mcmf').addEventListener('click', runSolver);

    document.getElementById('mcmf-next').addEventListener('click', stepNext);
    document.getElementById('mcmf-prev').addEventListener('click', stepPrev);
    document.getElementById('mcmf-reset').addEventListener('click', stepReset);
    document.getElementById('mcmf-skip').addEventListener('click', stepSkip);

    window.STEP_CONTROLS = { next: stepNext, prev: stepPrev, reset: stepReset, skip: stepSkip };

    // Initial — load swap preset and run
    loadPreset('swap3');
    runSolver();
  }

  ready(init);
})();
