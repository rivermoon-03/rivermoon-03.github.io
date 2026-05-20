(function (global) {
  'use strict';

  // ============================================================
  // Network representation
  //
  // Each grid cell (r, c) with r,c in [0..N-1] gets two nodes:
  //   inNode(r,c)  = 2 * (r*N + c)
  //   outNode(r,c) = 2 * (r*N + c) + 1
  // Super source S, super sink T at the end.
  //
  // Edges (each forward edge has matching reverse with cap 0):
  //   inNode  --(cap 1)--> outNode                 (vertex capacity)
  //   outNode(a) --(cap 1)--> inNode(b) for each pair of 4-adjacent cells
  //   S       --(cap 1)--> inNode(start)           per start cell
  //   outNode(boundary) --(cap 1)--> T              per boundary cell
  // ============================================================

  const PRESETS = {
    easy3: {
      label: '쉬운 3 (모두 탈출)',
      N: 5,
      starts: [[3, 3], [2, 3], [4, 4]]   // (row, col), 1-indexed
    },
    tight4: {
      label: '꽉 찬 4 (모두 탈출 가능)',
      N: 4,
      starts: [[2, 2], [2, 3], [3, 2], [3, 3]]
    },
    stuck5: {
      label: '플러스 5 (1개 막힘)',
      N: 5,
      starts: [[3, 3], [2, 3], [4, 3], [3, 2], [3, 4]]
    }
  };

  function inNode(r, c, N) { return 2 * (r * N + c); }
  function outNode(r, c, N) { return 2 * (r * N + c) + 1; }

  function isBoundary(r, c, N) {
    return r === 0 || r === N - 1 || c === 0 || c === N - 1;
  }

  function inRange(r, c, N) {
    return r >= 0 && r < N && c >= 0 && c < N;
  }

  // Build a residual network. Each edge stored as {to, cap, flow, rev}
  // adj[u] = list of edge indices in `edges` for that node.
  function buildNetwork(N, starts /* 0-indexed [[r,c],...] */) {
    const V = 2 * N * N + 2;
    const S = 2 * N * N;
    const T = 2 * N * N + 1;
    const adj = Array.from({ length: V }, () => []);
    const edges = [];

    function addEdge(u, v, cap) {
      const eIdx = edges.length;
      edges.push({ to: v, cap, flow: 0, rev: eIdx + 1 });
      adj[u].push(eIdx);
      edges.push({ to: u, cap: 0, flow: 0, rev: eIdx });
      adj[v].push(eIdx + 1);
    }

    // Vertex capacity 1 for every cell
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        addEdge(inNode(r, c, N), outNode(r, c, N), 1);
      }
    }

    // Adjacency edges (both directions, each capacity 1)
    const DR = [-1, 1, 0, 0];
    const DC = [0, 0, -1, 1];
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        for (let k = 0; k < 4; k++) {
          const nr = r + DR[k];
          const nc = c + DC[k];
          if (!inRange(nr, nc, N)) continue;
          addEdge(outNode(r, c, N), inNode(nr, nc, N), 1);
        }
      }
    }

    // S → start_in for each start cell
    for (const [r, c] of starts) {
      addEdge(S, inNode(r, c, N), 1);
    }

    // boundary_out → T
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (isBoundary(r, c, N)) {
          addEdge(outNode(r, c, N), T, 1);
        }
      }
    }

    return { V, S, T, adj, edges, N };
  }

  // BFS to find augmenting path. Returns parent edge index per node, or null.
  function bfsAugment(net) {
    const { V, S, T, adj, edges } = net;
    const parentEdge = new Array(V).fill(-1);
    const visited = new Array(V).fill(false);
    visited[S] = true;
    const queue = [S];
    while (queue.length > 0) {
      const u = queue.shift();
      if (u === T) break;
      for (const eIdx of adj[u]) {
        const e = edges[eIdx];
        if (!visited[e.to] && e.cap - e.flow > 0) {
          visited[e.to] = true;
          parentEdge[e.to] = eIdx;
          queue.push(e.to);
        }
      }
    }
    if (!visited[T]) return null;
    return parentEdge;
  }

  // Trace path back from T → S as list of edge indices
  function tracePath(net, parentEdge) {
    const path = [];
    let cur = net.T;
    while (cur !== net.S) {
      const eIdx = parentEdge[cur];
      path.push(eIdx);
      cur = net.edges[net.edges[eIdx].rev].to;
    }
    return path.reverse();
  }

  function edmondsKarp(net) {
    let maxFlow = 0;
    const augmentingPaths = [];
    while (true) {
      const parentEdge = bfsAugment(net);
      if (!parentEdge) break;
      const path = tracePath(net, parentEdge);
      // bottleneck (since all caps are 1, bottleneck is always 1, but compute anyway)
      let bottleneck = Infinity;
      for (const eIdx of path) {
        const e = net.edges[eIdx];
        bottleneck = Math.min(bottleneck, e.cap - e.flow);
      }
      for (const eIdx of path) {
        net.edges[eIdx].flow += bottleneck;
        net.edges[net.edges[eIdx].rev].flow -= bottleneck;
      }
      augmentingPaths.push({ edgeIndices: path, units: bottleneck });
      maxFlow += bottleneck;
    }
    return { maxFlow, augmentingPaths };
  }

  // After max flow, decompose into per-source paths.
  // Returns array of paths, each path is list of [r, c] cells.
  // Method: for each S-outgoing edge with positive flow, walk forward through
  // forward edges with positive flow until reaching T, decrement flow as we go.
  function decomposePaths(net, starts) {
    const { S, T, adj, edges, N } = net;
    const paths = [];

    // Helper: node → cell info
    function nodeToCell(node) {
      if (node === S || node === T) return null;
      const idx = Math.floor(node / 2);
      return { r: Math.floor(idx / N), c: idx % N };
    }

    function findOutgoingFlow(u) {
      for (const eIdx of adj[u]) {
        const e = edges[eIdx];
        if (e.cap > 0 && e.flow > 0) {
          return eIdx;
        }
      }
      return -1;
    }

    while (true) {
      const eIdx = findOutgoingFlow(S);
      if (eIdx === -1) break;
      const cellsInPath = [];
      let cur = S;
      let nextEdge = eIdx;
      while (cur !== T) {
        const e = edges[nextEdge];
        const v = e.to;
        e.flow -= 1;
        edges[e.rev].flow += 1;
        const cellInfo = nodeToCell(v);
        if (cellInfo) {
          // Only add when entering an in-node (avoid duplicates for in/out pair)
          if (v % 2 === 0) cellsInPath.push([cellInfo.r, cellInfo.c]);
        }
        cur = v;
        if (cur === T) break;
        nextEdge = findOutgoingFlow(cur);
        if (nextEdge === -1) break;
      }
      paths.push(cellsInPath);
    }
    return paths;
  }

  // Convert augmenting path edges back to readable cell sequence
  function augPathToCells(net, edgeIndices) {
    const seq = [];
    let cur = net.S;
    seq.push({ kind: 'S' });
    for (const eIdx of edgeIndices) {
      const e = net.edges[eIdx];
      const to = e.to;
      if (to === net.T) {
        seq.push({ kind: 'T' });
      } else {
        const idx = Math.floor(to / 2);
        const r = Math.floor(idx / net.N);
        const c = idx % net.N;
        seq.push({ kind: to % 2 === 0 ? 'in' : 'out', r, c, isReverse: e.cap === 0 });
      }
      cur = to;
    }
    return seq;
  }

  function solve(N, starts /* 0-indexed */) {
    // copy starts (don't mutate)
    const net = buildNetwork(N, starts);
    const { maxFlow, augmentingPaths } = edmondsKarp(net);
    const decomposed = decomposePaths(net, starts);
    // For each starting cell, find which decomposed path begins at that cell.
    const pathByStart = starts.map(([r, c]) => {
      return decomposed.find((path) => path.length > 0 && path[0][0] === r && path[0][1] === c) || null;
    });
    // augmenting paths in readable form
    const augCells = augmentingPaths.map((ap) => augPathToCells(net, ap.edgeIndices));

    return {
      N,
      starts,
      maxFlow,
      total: starts.length,
      decomposed,
      pathByStart,
      augmentingPaths: augCells
    };
  }

  global.FLOW = {
    PRESETS,
    isBoundary,
    buildNetwork,
    edmondsKarp,
    decomposePaths,
    solve
  };
})(window);
