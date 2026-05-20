(function (global) {
  'use strict';

  function round4(x) {
    return Math.round(x * 10000) / 10000;
  }

  function buildOBST(P, Q) {
    const n = Q.length - 1;
    const W = Array.from({ length: n + 1 }, () => Array(n + 1).fill(0));
    const C = Array.from({ length: n + 1 }, () => Array(n + 1).fill(0));
    const R = Array.from({ length: n + 1 }, () => Array(n + 1).fill(0));
    const steps = [];

    for (let i = 0; i <= n; i++) {
      W[i][i] = Q[i];
      steps.push({
        kind: 'W',
        i, j: i,
        value: round4(Q[i]),
        reason: `W[${i}][${i}] = q<sub>${i}</sub> = ${Q[i]}  (빈 부분 트리의 실패 확률)`
      });
    }

    for (let d = 1; d <= n; d++) {
      for (let i = 0; i + d <= n; i++) {
        const j = i + d;
        W[i][j] = round4(W[i][j - 1] + P[j] + Q[j]);
        steps.push({
          kind: 'W',
          i, j,
          value: W[i][j],
          reason: `W[${i}][${j}] = W[${i}][${j - 1}] + p<sub>${j}</sub> + q<sub>${j}</sub> = ${round4(W[i][j - 1])} + ${P[j]} + ${Q[j]} = <b>${W[i][j]}</b>`
        });

        let bestCost = Infinity;
        let bestK = i + 1;
        const candidates = [];
        for (let k = i + 1; k <= j; k++) {
          const cost = C[i][k - 1] + C[k][j] + W[i][j];
          candidates.push({ k, cost: round4(cost) });
          if (cost < bestCost) {
            bestCost = cost;
            bestK = k;
          }
        }
        C[i][j] = round4(bestCost);
        R[i][j] = bestK;

        const candStr = candidates
          .map(c => `k=${c.k}→${c.cost.toFixed(2)}`)
          .join(', ');
        steps.push({
          kind: 'C',
          i, j,
          value: C[i][j],
          bestK,
          candidates,
          reason: `C[${i}][${j}] = min { ${candStr} } = <b>${C[i][j]}</b>, R[${i}][${j}] = <b>${bestK}</b>`
        });
      }
    }

    return { n, W, C, R, steps };
  }

  function buildTree(R, i, j) {
    if (i === j) return { type: 'dummy', index: i };
    const k = R[i][j];
    return {
      type: 'key',
      key: k,
      left: buildTree(R, i, k - 1),
      right: buildTree(R, k, j)
    };
  }

  function findPath(tree, targetKey) {
    const path = [];
    function walk(node) {
      if (!node) return false;
      if (node.type === 'dummy') {
        path.push(node);
        return false;
      }
      path.push(node);
      if (node.key === targetKey) return true;
      if (targetKey < node.key) return walk(node.left);
      return walk(node.right);
    }
    walk(tree);
    return path;
  }

  global.OBST = {
    buildOBST,
    buildTree,
    findPath,
    round4
  };
})(window);
