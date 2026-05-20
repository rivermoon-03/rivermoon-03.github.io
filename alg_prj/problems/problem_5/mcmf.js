(function (global) {
  'use strict';

  const PRESETS = {
    identity3: {
      label: '쉬운 3×3 (대각선이 최저)',
      cost: [
        [1, 9, 9],
        [9, 2, 9],
        [9, 9, 3]
      ]
    },
    swap3: {
      label: '스왑 3×3 (역방향 잔여 활용)',
      cost: [
        [5, 1, 9],
        [9, 2, 9],
        [9, 9, 1]
      ]
    },
    tricky3: {
      label: '교차 3×3',
      cost: [
        [7, 4, 3],
        [6, 8, 5],
        [9, 4, 4]
      ]
    },
    classic4: {
      label: '4×4 (헝가리안 고전)',
      cost: [
        [4, 1, 3, 7],
        [5, 4, 2, 6],
        [3, 7, 5, 4],
        [6, 3, 4, 2]
      ]
    }
  };

  // Build the MCMF network for assignment of N workers to N tasks.
  // Nodes: workers 0..N-1, tasks N..2N-1, S = 2N, T = 2N+1.
  function buildNetwork(N, cost) {
    const V = 2 * N + 2;
    const S = 2 * N;
    const T = 2 * N + 1;
    const adj = Array.from({ length: V }, () => []);
    const edges = [];

    function addEdge(u, v, cap, c) {
      const idx = edges.length;
      edges.push({ to: v, cap, cost: c, flow: 0, rev: idx + 1, kind: 'forward' });
      adj[u].push(idx);
      edges.push({ to: u, cap: 0, cost: -c, flow: 0, rev: idx, kind: 'reverse' });
      adj[v].push(idx + 1);
    }

    for (let i = 0; i < N; i++) addEdge(S, i, 1, 0);
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        addEdge(i, N + j, 1, cost[i][j]);
      }
    }
    for (let j = 0; j < N; j++) addEdge(N + j, T, 1, 0);

    return { V, S, T, adj, edges, N };
  }

  // Shortest path (min cost) from S to T using SPFA on residual graph.
  function spfa(net) {
    const { V, S, T, adj, edges } = net;
    const dist = new Array(V).fill(Infinity);
    const inQueue = new Array(V).fill(false);
    const parentEdge = new Array(V).fill(-1);
    dist[S] = 0;
    const queue = [S];
    inQueue[S] = true;
    while (queue.length > 0) {
      const u = queue.shift();
      inQueue[u] = false;
      for (const eIdx of adj[u]) {
        const e = edges[eIdx];
        const residual = e.cap - e.flow;
        if (residual > 0 && dist[u] + e.cost < dist[e.to]) {
          dist[e.to] = dist[u] + e.cost;
          parentEdge[e.to] = eIdx;
          if (!inQueue[e.to]) {
            queue.push(e.to);
            inQueue[e.to] = true;
          }
        }
      }
    }
    if (dist[T] === Infinity) return null;
    return { dist, parentEdge };
  }

  // Read current assignment from edge flows.
  function readAssignment(net) {
    const { N, adj, edges } = net;
    const assign = new Array(N).fill(-1);
    for (let i = 0; i < N; i++) {
      for (const eIdx of adj[i]) {
        const e = edges[eIdx];
        if (e.kind === 'forward' && e.to >= N && e.to < 2 * N && e.flow === 1) {
          assign[i] = e.to - N;
          break;
        }
      }
    }
    return assign;
  }

  function nodeKind(node, N, S, T) {
    if (node === S) return { kind: 'S' };
    if (node === T) return { kind: 'T' };
    if (node < N) return { kind: 'W', idx: node };
    return { kind: 'T', idx: node - N };  // task index (we'll disambiguate by isTask flag)
  }

  // Returns a path description: list of {kind: 'S'|'W'|'task'|'T', idx?, isReverse}
  function describePath(net, parentEdge) {
    const { S, T, edges, N } = net;
    const arr = [];
    let cur = T;
    arr.push({ kind: 'T' });
    while (cur !== S) {
      const eIdx = parentEdge[cur];
      const e = edges[eIdx];
      const from = edges[e.rev].to;
      const isRev = e.kind === 'reverse';
      // describe `from`
      if (from === S) arr.push({ kind: 'S', isReverse: false });
      else if (from < N) arr.push({ kind: 'W', idx: from, isReverse: isRev });
      else if (from < 2 * N) arr.push({ kind: 'task', idx: from - N, isReverse: isRev });
      cur = from;
    }
    arr.reverse();
    return arr;
  }

  function solve(N, cost) {
    const net = buildNetwork(N, cost);
    const steps = [];
    let totalCost = 0;
    let totalFlow = 0;
    let iter = 0;

    // initial snapshot
    steps.push({
      kind: 'init',
      iteration: 0,
      assignment: readAssignment(net),
      totalCost: 0
    });

    while (true) {
      const sp = spfa(net);
      if (!sp) break;
      iter++;
      // Trace path
      const path = [];
      let cur = net.T;
      while (cur !== net.S) {
        const eIdx = sp.parentEdge[cur];
        path.push(eIdx);
        cur = net.edges[net.edges[eIdx].rev].to;
      }
      path.reverse();
      // Push 1 unit
      for (const eIdx of path) {
        net.edges[eIdx].flow += 1;
        net.edges[net.edges[eIdx].rev].flow -= 1;
      }
      const pathCost = sp.dist[net.T];
      totalCost += pathCost;
      totalFlow += 1;

      const desc = describePath(net, sp.parentEdge);

      steps.push({
        kind: 'augment',
        iteration: iter,
        pathDescription: desc,
        pathCost,
        cumulativeCost: totalCost,
        assignment: readAssignment(net)
      });
    }

    const finalAssign = readAssignment(net);

    return {
      N,
      cost,
      totalCost,
      flow: totalFlow,
      assignment: finalAssign,
      steps
    };
  }

  global.MCMF = {
    PRESETS,
    buildNetwork,
    spfa,
    solve
  };
})(window);
