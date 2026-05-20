(function (global) {
  'use strict';

  // Two preset graphs to demonstrate "has bridges" and "no bridges"
  const PRESETS = {
    withBridges: {
      label: '브리지 있는 그래프 (다리 2개)',
      text: '7\n1 2\n2 3\n3 1\n3 4\n4 5\n5 6\n6 4\n5 7\n-1 -1',
      // hand-positioned for clean visual: two triangles connected by bridge, plus a pendant
      positions: [
        { x: 120, y: 130 },   // 1
        { x: 60,  y: 250 },   // 2
        { x: 180, y: 250 },   // 3
        { x: 320, y: 250 },   // 4
        { x: 380, y: 130 },   // 5
        { x: 440, y: 250 },   // 6
        { x: 480, y: 50 }     // 7
      ]
    },
    noBridges: {
      label: '브리지 없는 그래프 (6-사이클)',
      text: '6\n1 2\n2 3\n3 4\n4 5\n5 6\n6 1\n-1 -1',
      positions: [
        { x: 270, y: 60 },    // 1
        { x: 400, y: 140 },   // 2
        { x: 400, y: 280 },   // 3
        { x: 270, y: 360 },   // 4
        { x: 140, y: 280 },   // 5
        { x: 140, y: 140 }    // 6
      ]
    }
  };

  function parseGraph(text) {
    const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length === 0) {
      return { error: '입력이 비어있습니다.' };
    }
    const n = parseInt(lines[0], 10);
    if (!Number.isInteger(n) || n < 1) {
      return { error: '첫 줄은 정점 개수 (1 이상의 정수)여야 합니다.' };
    }
    const edges = [];
    const seen = new Set();
    for (let li = 1; li < lines.length; li++) {
      const parts = lines[li].split(/\s+/);
      if (parts.length !== 2) {
        return { error: `${li + 1}번째 줄: 두 정수가 필요합니다. ("${lines[li]}")` };
      }
      const u = parseInt(parts[0], 10);
      const v = parseInt(parts[1], 10);
      if (!Number.isInteger(u) || !Number.isInteger(v)) {
        return { error: `${li + 1}번째 줄: 정수가 아닙니다.` };
      }
      if (u === -1 && v === -1) break;
      if (u < 1 || u > n || v < 1 || v > n) {
        return { error: `${li + 1}번째 줄: 정점 번호 ${u}, ${v}는 1~${n} 범위를 벗어남.` };
      }
      if (u === v) continue;
      const key = u < v ? `${u}-${v}` : `${v}-${u}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push([u - 1, v - 1]);
    }
    return { n, edges };
  }

  function buildAdj(n, edges) {
    const adj = Array.from({ length: n }, () => []);
    edges.forEach(([u, v], i) => {
      adj[u].push({ to: v, edgeIdx: i });
      adj[v].push({ to: u, edgeIdx: i });
    });
    return adj;
  }

  function findBridges(n, edges) {
    const adj = buildAdj(n, edges);
    const disc = new Array(n).fill(-1);
    const low = new Array(n).fill(-1);
    const parent = new Array(n).fill(-1);
    const steps = [];
    const bridges = [];
    let timer = 0;

    function lbl(i) { return i + 1; }

    function dfs(u, parentEdgeIdx) {
      disc[u] = low[u] = timer++;
      steps.push({
        kind: 'visit',
        u,
        disc: disc[u],
        low: low[u],
        reason: `정점 <code>${lbl(u)}</code> 첫 방문 → disc[${lbl(u)}] = low[${lbl(u)}] = <b>${disc[u]}</b>`
      });
      for (const { to: v, edgeIdx } of adj[u]) {
        if (edgeIdx === parentEdgeIdx) continue;
        if (disc[v] === -1) {
          parent[v] = u;
          steps.push({
            kind: 'tree-edge',
            u, v, edgeIdx,
            reason: `간선 (${lbl(u)}, ${lbl(v)}) → ${lbl(v)} 미방문 · <b>트리 에지</b>로 재귀 진입`
          });
          dfs(v, edgeIdx);
          const oldLow = low[u];
          const newLow = Math.min(low[u], low[v]);
          low[u] = newLow;
          if (newLow !== oldLow) {
            steps.push({
              kind: 'low-update',
              u, v,
              from: oldLow, to: newLow,
              reason: `${lbl(v)} 서브트리 처리 완료 → low[${lbl(u)}] = min(${oldLow}, low[${lbl(v)}]=${low[v]}) = <b>${newLow}</b>`
            });
          } else {
            steps.push({
              kind: 'low-update-nochange',
              u, v,
              from: oldLow, to: newLow,
              reason: `${lbl(v)} 서브트리 처리 완료 → low[${lbl(u)}] 그대로 ${oldLow} (low[${lbl(v)}]=${low[v]} ≥ low[${lbl(u)}])`
            });
          }
          if (disc[u] < low[v]) {
            bridges.push([u, v, edgeIdx]);
            steps.push({
              kind: 'bridge',
              u, v, edgeIdx,
              reason: `<b>★ 브리지 발견!</b> disc[${lbl(u)}]=${disc[u]} &lt; low[${lbl(v)}]=${low[v]} → 간선 (${lbl(u)}, ${lbl(v)}) 가 브리지`
            });
          } else {
            steps.push({
              kind: 'not-bridge',
              u, v, edgeIdx,
              reason: `disc[${lbl(u)}]=${disc[u]} ≥ low[${lbl(v)}]=${low[v]} → 간선 (${lbl(u)}, ${lbl(v)}) 는 브리지 아님 (${lbl(v)} 서브트리에서 ${lbl(u)} 이상으로 갈 수 있음)`
            });
          }
        } else {
          // back edge (v already visited, not the parent)
          const oldLow = low[u];
          const newLow = Math.min(low[u], disc[v]);
          low[u] = newLow;
          if (newLow !== oldLow) {
            steps.push({
              kind: 'back-edge',
              u, v, edgeIdx,
              from: oldLow, to: newLow,
              reason: `간선 (${lbl(u)}, ${lbl(v)}) → ${lbl(v)} 이미 방문 (백 에지) · low[${lbl(u)}] = min(${oldLow}, disc[${lbl(v)}]=${disc[v]}) = <b>${newLow}</b>`
            });
          } else {
            steps.push({
              kind: 'back-edge-nochange',
              u, v, edgeIdx,
              reason: `간선 (${lbl(u)}, ${lbl(v)}) 백 에지 · disc[${lbl(v)}]=${disc[v]} ≥ low[${lbl(u)}]=${low[u]} → 갱신 안 됨`
            });
          }
        }
      }
    }

    for (let i = 0; i < n; i++) {
      if (disc[i] === -1) {
        if (i > 0) {
          steps.push({
            kind: 'restart',
            u: i,
            reason: `정점 ${lbl(i)}는 아직 미방문 → 새 DFS 시작 (그래프가 분리되어 있는 경우)`
          });
        }
        dfs(i, -1);
      }
    }

    return { bridges, disc, low, parent, steps };
  }

  // Returns precomputed snapshots so the UI can render any step instantly.
  function buildSnapshots(n, edges, steps) {
    const snapshots = [];
    const disc = new Array(n).fill(-1);
    const low = new Array(n).fill(-1);
    const bridgesSet = new Set();
    snapshots.push({
      disc: disc.slice(),
      low: low.slice(),
      bridges: new Set(bridgesSet),
      currentEdge: null,
      currentNode: null
    });
    for (const step of steps) {
      let currentEdge = null;
      let currentNode = null;
      switch (step.kind) {
        case 'visit':
          disc[step.u] = step.disc;
          low[step.u] = step.low;
          currentNode = step.u;
          break;
        case 'tree-edge':
          currentEdge = step.edgeIdx;
          currentNode = step.v;
          break;
        case 'low-update':
        case 'low-update-nochange':
          low[step.u] = step.to;
          currentNode = step.u;
          break;
        case 'back-edge':
          low[step.u] = step.to;
          currentEdge = step.edgeIdx;
          currentNode = step.u;
          break;
        case 'back-edge-nochange':
          currentEdge = step.edgeIdx;
          currentNode = step.u;
          break;
        case 'bridge':
          bridgesSet.add(step.edgeIdx);
          currentEdge = step.edgeIdx;
          break;
        case 'not-bridge':
          currentEdge = step.edgeIdx;
          break;
        case 'restart':
          currentNode = step.u;
          break;
      }
      snapshots.push({
        disc: disc.slice(),
        low: low.slice(),
        bridges: new Set(bridgesSet),
        currentEdge,
        currentNode
      });
    }
    return snapshots;
  }

  // For "is edge (u, v) a bridge?" lookup (0-indexed)
  function checkEdge(n, edges, u, v) {
    const idx = edges.findIndex(([a, b]) => (a === u && b === v) || (a === v && b === u));
    if (idx === -1) return { exists: false };
    const { bridges } = findBridges(n, edges);
    const isB = bridges.some(([a, b]) => (a === u && b === v) || (a === v && b === u));
    return { exists: true, isBridge: isB, edgeIdx: idx };
  }

  function circularLayout(n, width, height) {
    const cx = width / 2, cy = height / 2;
    const r = Math.min(width, height) / 2 - 50;
    return Array.from({ length: n }, (_, i) => ({
      x: cx + r * Math.cos(2 * Math.PI * i / n - Math.PI / 2),
      y: cy + r * Math.sin(2 * Math.PI * i / n - Math.PI / 2)
    }));
  }

  // Simple force-directed layout using D3 (must be loaded externally)
  function forceLayout(n, edges, width, height) {
    if (!global.d3) return circularLayout(n, width, height);
    const nodes = Array.from({ length: n }, (_, i) => ({ id: i }));
    const links = edges.map(([u, v]) => ({ source: u, target: v }));
    const sim = global.d3.forceSimulation(nodes)
      .force('link', global.d3.forceLink(links).id((d) => d.id).distance(90))
      .force('charge', global.d3.forceManyBody().strength(-380))
      .force('center', global.d3.forceCenter(width / 2, height / 2))
      .force('collide', global.d3.forceCollide(32))
      .stop();
    for (let i = 0; i < 400; i++) sim.tick();
    // Clamp inside box with padding
    const pad = 40;
    return nodes.map((nd) => ({
      x: Math.max(pad, Math.min(width - pad, nd.x)),
      y: Math.max(pad, Math.min(height - pad, nd.y))
    }));
  }

  global.BRIDGE = {
    PRESETS,
    parseGraph,
    buildAdj,
    findBridges,
    buildSnapshots,
    checkEdge,
    circularLayout,
    forceLayout
  };
})(window);
