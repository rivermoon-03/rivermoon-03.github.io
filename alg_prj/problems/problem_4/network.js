(function (global) {
  'use strict';

  // 20 points: 3 planted clusters + 3 bridges + 2 outliers
  // Designed so increasing r produces clear merging behavior.
  const POINTS = [
    // Cluster A around (10, 10, 10)
    { x: 10, y: 10, z: 10 },
    { x: 13, y: 11, z: 9 },
    { x: 8,  y: 12, z: 11 },
    { x: 9,  y: 8,  z: 13 },
    { x: 12, y: 8,  z: 8 },
    // Cluster B around (40, 40, 10)
    { x: 40, y: 40, z: 10 },
    { x: 43, y: 38, z: 11 },
    { x: 38, y: 42, z: 12 },
    { x: 41, y: 43, z: 9 },
    { x: 42, y: 39, z: 8 },
    // Cluster C around (25, 25, 40)
    { x: 25, y: 25, z: 40 },
    { x: 28, y: 23, z: 41 },
    { x: 22, y: 27, z: 39 },
    { x: 26, y: 28, z: 42 },
    { x: 23, y: 22, z: 38 },
    // Bridges
    { x: 25, y: 25, z: 20 },   // 15: between A-B plane and C
    { x: 18, y: 18, z: 25 },   // 16: A-C bridge
    { x: 35, y: 35, z: 25 },   // 17: B-C bridge
    // Outliers
    { x: 5,  y: 30, z: 22 },   // 18
    { x: 45, y: 15, z: 28 }    // 19
  ];

  function distance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  // Returns an array of edges sorted by distance (so Union-Find steps are deterministic and pedagogical).
  function buildEdges(points, r) {
    const edges = [];
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const d = distance(points[i], points[j]);
        if (d <= r) edges.push({ u: i, v: j, d });
      }
    }
    edges.sort((a, b) => a.d - b.d);
    return edges;
  }

  function makeUF(n) {
    const parent = Array.from({ length: n }, (_, i) => i);
    const rank = Array(n).fill(0);

    function find(x) {
      let root = x;
      while (parent[root] !== root) root = parent[root];
      // path compression
      let cur = x;
      while (parent[cur] !== root) {
        const next = parent[cur];
        parent[cur] = root;
        cur = next;
      }
      return root;
    }

    function union(a, b) {
      const ra = find(a);
      const rb = find(b);
      if (ra === rb) return false;
      if (rank[ra] < rank[rb]) parent[ra] = rb;
      else if (rank[ra] > rank[rb]) parent[rb] = ra;
      else { parent[rb] = ra; rank[ra]++; }
      return true;
    }

    return { parent, rank, find, union };
  }

  // Run UF on edges, return final parent array + step trace.
  function runUF(n, edges) {
    const uf = makeUF(n);
    const steps = [];
    for (const e of edges) {
      const ra = uf.find(e.u);
      const rb = uf.find(e.v);
      const merged = uf.union(e.u, e.v);
      steps.push({
        edge: e,
        rootU: ra,
        rootV: rb,
        merged,
        parent: uf.parent.slice()
      });
    }
    return { parent: uf.parent.slice(), steps };
  }

  // Returns array of components, each component is an array of node indices.
  // Components are sorted by their smallest index.
  function components(n, edges) {
    const uf = makeUF(n);
    for (const e of edges) uf.union(e.u, e.v);
    const groups = new Map();
    for (let i = 0; i < n; i++) {
      const root = uf.find(i);
      if (!groups.has(root)) groups.set(root, []);
      groups.get(root).push(i);
    }
    const result = Array.from(groups.values());
    result.forEach(g => g.sort((a, b) => a - b));
    result.sort((a, b) => a[0] - b[0]);
    return result;
  }

  global.NET = {
    POINTS,
    distance,
    buildEdges,
    makeUF,
    runUF,
    components
  };
})(window);
