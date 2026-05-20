(function () {
  'use strict';

  const SVG_W = 600;
  const SVG_H = 400;

  let state = {
    n: 0,
    edges: [],
    positions: [],
    result: null,
    snapshots: null,
    step: 0
  };

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  function showError(msg) {
    const div = document.getElementById('parse-error');
    if (!div) return;
    div.textContent = '오류 — ' + msg;
    div.style.display = 'block';
  }
  function hideError() {
    const div = document.getElementById('parse-error');
    if (div) div.style.display = 'none';
  }

  function loadFromText(text, presetPositions) {
    const parsed = BRIDGE.parseGraph(text);
    if (parsed.error) {
      showError(parsed.error);
      return false;
    }
    hideError();
    const { n, edges } = parsed;
    let positions;
    if (presetPositions && presetPositions.length === n) {
      positions = presetPositions.map((p) => ({ x: p.x, y: p.y }));
    } else {
      positions = BRIDGE.forceLayout(n, edges, SVG_W, SVG_H);
    }
    const result = BRIDGE.findBridges(n, edges);
    const snapshots = BRIDGE.buildSnapshots(n, edges, result.steps);
    state = { n, edges, positions, result, snapshots, step: 0 };
    updateBridgeList();
    syncCheckEdgeBounds();
    clearCheckResult();
    renderGraph();
    setNarration(null);
    updateProgress();
    return true;
  }

  function renderGraph() {
    const svg = document.getElementById('bridge-graph');
    if (!svg) return;
    if (!state.n) {
      svg.innerHTML = '<text x="300" y="200" text-anchor="middle" fill="#9ca3af" font-family="Pretendard" font-size="14">그래프 생성 버튼을 누르세요</text>';
      return;
    }
    const snap = state.snapshots[state.step];
    const finalParent = state.result.parent;

    let html = '';
    // Edges
    for (let i = 0; i < state.edges.length; i++) {
      const [u, v] = state.edges[i];
      const a = state.positions[u];
      const b = state.positions[v];
      const isTree = finalParent[u] === v || finalParent[v] === u;
      const isBridge = snap.bridges.has(i);
      const isCurrent = snap.currentEdge === i;
      let cls = 'edge';
      if (!isTree && !isBridge) cls += ' back';
      if (isBridge) cls += ' bridge';
      if (isCurrent) cls += ' current';
      html += `<line class="${cls}" x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}"/>`;
    }

    // Nodes
    for (let i = 0; i < state.n; i++) {
      const p = state.positions[i];
      const visited = snap.disc[i] !== -1;
      const isCurrent = snap.currentNode === i;
      let cls = 'node';
      if (visited) cls += ' visited';
      if (isCurrent) cls += ' current';
      html += `<g class="${cls}" transform="translate(${p.x.toFixed(1)},${p.y.toFixed(1)})">`;
      html += '<circle r="20"/>';
      html += `<text class="label" dy="5">${i + 1}</text>`;
      if (visited) {
        html += `<text class="dl-label" dy="-30">${snap.disc[i]}/${snap.low[i]}</text>`;
      }
      html += '</g>';
    }
    svg.innerHTML = html;
  }

  function setNarration(html) {
    const n = document.getElementById('dfs-narration');
    if (!n) return;
    n.innerHTML = html || '<span class="narration-empty">Next를 눌러 첫 스텝을 진행하세요.</span>';
  }

  function updateProgress() {
    const total = state.snapshots ? state.snapshots.length - 1 : 0;
    document.getElementById('dfs-progress').textContent = `${state.step} / ${total}`;
    document.getElementById('dfs-prev').disabled = state.step === 0;
    document.getElementById('dfs-next').disabled = state.step >= total;
    document.getElementById('dfs-skip').disabled = state.step >= total;
  }

  function stepNext() {
    if (!state.snapshots) return;
    if (state.step >= state.snapshots.length - 1) return;
    state.step++;
    renderGraph();
    setNarration(state.result.steps[state.step - 1].reason);
    updateProgress();
  }
  function stepPrev() {
    if (state.step === 0) return;
    state.step--;
    renderGraph();
    setNarration(state.step === 0 ? null : state.result.steps[state.step - 1].reason);
    updateProgress();
  }
  function stepReset() {
    if (!state.snapshots) return;
    state.step = 0;
    renderGraph();
    setNarration(null);
    updateProgress();
  }
  function stepSkip() {
    if (!state.snapshots) return;
    state.step = state.snapshots.length - 1;
    renderGraph();
    const bridges = state.result.bridges;
    setNarration(`DFS 완료. <b>${bridges.length}개</b>의 브리지 발견${bridges.length ? ' — 빨강 굵은 간선' : ''}.`);
    updateProgress();
  }

  function updateBridgeList() {
    const list = document.getElementById('bridge-list');
    if (!list) return;
    list.innerHTML = '';
    if (!state.result || state.result.bridges.length === 0) {
      const span = document.createElement('span');
      span.className = 'bridge-tag empty';
      span.textContent = '브리지 없음 (사이클로만 구성됨)';
      list.appendChild(span);
      return;
    }
    state.result.bridges.forEach(([u, v]) => {
      const tag = document.createElement('span');
      tag.className = 'bridge-tag';
      tag.textContent = `(${u + 1}, ${v + 1})`;
      list.appendChild(tag);
    });
  }

  function syncCheckEdgeBounds() {
    const uIn = document.getElementById('check-u');
    const vIn = document.getElementById('check-v');
    if (uIn) uIn.max = state.n;
    if (vIn) vIn.max = state.n;
  }

  function clearCheckResult() {
    const out = document.getElementById('check-result');
    if (out) { out.textContent = ''; out.className = 'check-result'; }
  }

  function checkEdgeUI() {
    const out = document.getElementById('check-result');
    if (!state.n) {
      out.textContent = '먼저 그래프 생성';
      out.className = 'check-result not-found';
      return;
    }
    const u = parseInt(document.getElementById('check-u').value, 10) - 1;
    const v = parseInt(document.getElementById('check-v').value, 10) - 1;
    if (!Number.isInteger(u) || !Number.isInteger(v) ||
        u < 0 || v < 0 || u >= state.n || v >= state.n || u === v) {
      out.textContent = '정점 번호 범위 벗어남';
      out.className = 'check-result not-found';
      return;
    }
    const r = BRIDGE.checkEdge(state.n, state.edges, u, v);
    if (!r.exists) {
      out.textContent = `간선 (${u + 1}, ${v + 1}) 없음`;
      out.className = 'check-result not-found';
    } else if (r.isBridge) {
      out.textContent = `예 — 브리지`;
      out.className = 'check-result yes';
    } else {
      out.textContent = `아니오 — 브리지 아님`;
      out.className = 'check-result no';
    }
  }

  function init() {
    if (!window.BRIDGE) {
      console.error('BRIDGE module not loaded');
      return;
    }

    const ta = document.getElementById('graph-input');

    document.getElementById('parse-btn').addEventListener('click', () => {
      loadFromText(ta.value);
    });
    document.getElementById('preset-bridges').addEventListener('click', () => {
      const p = BRIDGE.PRESETS.withBridges;
      ta.value = p.text;
      loadFromText(p.text, p.positions);
    });
    document.getElementById('preset-no-bridges').addEventListener('click', () => {
      const p = BRIDGE.PRESETS.noBridges;
      ta.value = p.text;
      loadFromText(p.text, p.positions);
    });

    document.getElementById('dfs-next').addEventListener('click', stepNext);
    document.getElementById('dfs-prev').addEventListener('click', stepPrev);
    document.getElementById('dfs-reset').addEventListener('click', stepReset);
    document.getElementById('dfs-skip').addEventListener('click', stepSkip);

    document.getElementById('check-btn').addEventListener('click', checkEdgeUI);

    // Keyboard shortcuts via notebook.js
    window.STEP_CONTROLS = { next: stepNext, prev: stepPrev, reset: stepReset, skip: stepSkip };

    // Initial load — use the textarea content (default = preset withBridges)
    loadFromText(ta.value, BRIDGE.PRESETS.withBridges.positions);
  }

  ready(init);
})();
