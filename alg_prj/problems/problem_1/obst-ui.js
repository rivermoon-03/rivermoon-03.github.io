(function () {
  'use strict';

  const P = [null, 0.04, 0.03, 0.05, 0.03, 0.15, 0.15, 0.05];
  const Q = [0.15, 0.04, 0.04, 0.03, 0.05, 0.04, 0.10, 0.05];

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(() => {
    if (!window.OBST) {
      console.error('OBST module not loaded');
      return;
    }

    const result = window.OBST.buildOBST(P, Q);
    const { n, W, C, R, steps } = result;

    console.log('[OBST] n =', n, 'C[0][n] =', C[0][n], 'R[0][n] =', R[0][n], 'steps =', steps.length);

    // ---------- Cell 6: tables + controls ----------
    const tableW = document.getElementById('table-W');
    const tableC = document.getElementById('table-C');
    const tableR = document.getElementById('table-R');
    const narration = document.getElementById('obst-narration');
    const progress = document.getElementById('progress-text');
    const btnNext = document.getElementById('btn-next');
    const btnPrev = document.getElementById('btn-prev');
    const btnReset = document.getElementById('btn-reset');
    const btnSkip = document.getElementById('btn-skip');

    function buildEmptyTable(table, kind) {
      let html = '<thead><tr><th></th>';
      for (let j = 0; j <= n; j++) html += `<th>${j}</th>`;
      html += '</tr></thead><tbody>';
      for (let i = 0; i <= n; i++) {
        html += `<tr><th>${i}</th>`;
        for (let j = 0; j <= n; j++) {
          if (j < i) {
            html += '<td class="faint">·</td>';
          } else {
            html += `<td class="empty" data-kind="${kind}" data-i="${i}" data-j="${j}"></td>`;
          }
        }
        html += '</tr>';
      }
      html += '</tbody>';
      table.innerHTML = html;
    }

    buildEmptyTable(tableW, 'W');
    buildEmptyTable(tableC, 'C');
    buildEmptyTable(tableR, 'R');

    function cell(table, i, j) {
      return table.querySelector(`td[data-i="${i}"][data-j="${j}"]`);
    }

    function applyStep(step, pulse) {
      if (step.kind === 'W') {
        const c = cell(tableW, step.i, step.j);
        if (!c) return;
        c.textContent = step.value.toFixed(2);
        c.classList.remove('empty');
        c.classList.add('filled');
        if (pulse) flashPulse(c);
      } else if (step.kind === 'C') {
        const cc = cell(tableC, step.i, step.j);
        const cr = cell(tableR, step.i, step.j);
        if (cc) {
          cc.textContent = step.value.toFixed(2);
          cc.classList.remove('empty');
          cc.classList.add('filled');
          if (pulse) flashPulse(cc);
        }
        if (cr) {
          cr.textContent = step.bestK;
          cr.classList.remove('empty');
          cr.classList.add('filled', 'is-best-k');
          if (pulse) flashPulse(cr);
        }
      }
    }

    function unapplyStep(step) {
      if (step.kind === 'W') {
        const c = cell(tableW, step.i, step.j);
        if (!c) return;
        c.textContent = '';
        c.classList.remove('filled', 'is-pulsing');
        c.classList.add('empty');
      } else if (step.kind === 'C') {
        const cc = cell(tableC, step.i, step.j);
        const cr = cell(tableR, step.i, step.j);
        if (cc) {
          cc.textContent = '';
          cc.classList.remove('filled', 'is-pulsing');
          cc.classList.add('empty');
        }
        if (cr) {
          cr.textContent = '';
          cr.classList.remove('filled', 'is-best-k', 'is-pulsing');
          cr.classList.add('empty');
        }
      }
    }

    function flashPulse(td) {
      td.classList.remove('is-pulsing');
      // force reflow
      void td.offsetWidth;
      td.classList.add('is-pulsing');
    }

    let cursor = 0; // number of steps applied (0..steps.length)

    function updateProgress() {
      progress.textContent = `${cursor} / ${steps.length}`;
      btnPrev.disabled = cursor === 0;
      btnNext.disabled = cursor === steps.length;
      btnSkip.disabled = cursor === steps.length;
    }

    function setNarration(stepOrNull, isFinal) {
      if (isFinal) {
        narration.innerHTML = `완료. 모든 칸이 채워졌다. 최종 결과: <code>C[0][${n}] = ${C[0][n].toFixed(2)}</code>, 루트는 키 <b>${R[0][n]}</b>.`;
        return;
      }
      if (!stepOrNull) {
        narration.innerHTML = '<span class="narration-empty">Next를 눌러 첫 칸을 채워보세요.</span>';
        return;
      }
      narration.innerHTML = stepOrNull.reason;
    }

    function next() {
      if (cursor >= steps.length) return;
      const step = steps[cursor];
      applyStep(step, true);
      cursor++;
      updateProgress();
      setNarration(step, cursor === steps.length);
    }

    function prev() {
      if (cursor === 0) return;
      cursor--;
      const step = steps[cursor];
      unapplyStep(step);
      updateProgress();
      setNarration(cursor === 0 ? null : steps[cursor - 1], false);
    }

    function reset() {
      while (cursor > 0) {
        cursor--;
        unapplyStep(steps[cursor]);
      }
      updateProgress();
      setNarration(null, false);
    }

    function skip() {
      while (cursor < steps.length) {
        applyStep(steps[cursor], false);
        cursor++;
      }
      updateProgress();
      setNarration(null, true);
    }

    btnNext.addEventListener('click', next);
    btnPrev.addEventListener('click', prev);
    btnReset.addEventListener('click', reset);
    btnSkip.addEventListener('click', skip);

    // expose for keyboard shortcuts in notebook.js
    window.STEP_CONTROLS = window.OBST_CONTROLS = { next, prev, reset, skip };

    updateProgress();
    setNarration(null, false);

    // ---------- Cell 7: D3 tree + search demo ----------
    const tree = window.OBST.buildTree(R, 0, n);

    const infoCost = document.getElementById('info-cost');
    const infoRoot = document.getElementById('info-root');
    const infoTarget = document.getElementById('info-target');
    const infoComparisons = document.getElementById('info-comparisons');
    infoCost.textContent = C[0][n].toFixed(2);
    infoRoot.textContent = 'k' + R[0][n];

    const svg = d3.select('#obst-tree');
    const svgWidth = +svg.attr('width');
    const svgHeight = +svg.attr('height');
    const margin = { top: 40, right: 40, bottom: 40, left: 40 };
    const innerW = svgWidth - margin.left - margin.right;
    const innerH = svgHeight - margin.top - margin.bottom;

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const root = d3.hierarchy(tree, (d) => {
      if (d.type === 'dummy') return null;
      return [d.left, d.right];
    });

    const layout = d3.tree().size([innerW, innerH]);
    layout(root);

    // links
    g.selectAll('.tree-link')
      .data(root.links())
      .enter()
      .append('path')
      .attr('class', 'tree-link')
      .attr('data-source-id', (d) => nodeId(d.source.data))
      .attr('data-target-id', (d) => nodeId(d.target.data))
      .attr('d', d3.linkVertical()
        .x((d) => d.x)
        .y((d) => d.y));

    // nodes
    const nodeSel = g.selectAll('.tree-node')
      .data(root.descendants())
      .enter()
      .append('g')
      .attr('class', (d) => d.data.type === 'dummy' ? 'tree-node tree-node-dummy' : 'tree-node tree-node-key')
      .attr('data-node-id', (d) => nodeId(d.data))
      .attr('transform', (d) => `translate(${d.x},${d.y})`);

    nodeSel.filter((d) => d.data.type === 'key')
      .append('circle')
      .attr('r', 18)
      .on('click', (event, d) => {
        showSearchPath(d.data.key);
      });

    nodeSel.filter((d) => d.data.type === 'key')
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 5)
      .text((d) => 'k' + d.data.key);

    nodeSel.filter((d) => d.data.type === 'dummy')
      .append('rect')
      .attr('x', -14)
      .attr('y', -14)
      .attr('width', 28)
      .attr('height', 28)
      .attr('rx', 3);

    nodeSel.filter((d) => d.data.type === 'dummy')
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 4)
      .text((d) => 'd' + d.data.index);

    function nodeId(data) {
      if (data.type === 'dummy') return 'd' + data.index;
      return 'k' + data.key;
    }

    function clearPath() {
      svg.selectAll('.tree-link').classed('is-path', false);
      svg.selectAll('.tree-node').classed('is-path', false).classed('is-target', false);
    }

    function showSearchPath(targetKey) {
      clearPath();
      const path = window.OBST.findPath(tree, targetKey);
      const ids = path.map(nodeId);
      // mark nodes
      ids.forEach((id, idx) => {
        const node = svg.select(`.tree-node[data-node-id="${id}"]`);
        node.classed('is-path', true);
        if (idx === ids.length - 1) node.classed('is-target', true);
      });
      // mark links between consecutive ids
      for (let i = 0; i < ids.length - 1; i++) {
        svg.select(`.tree-link[data-source-id="${ids[i]}"][data-target-id="${ids[i + 1]}"]`)
          .classed('is-path', true);
      }
      infoTarget.textContent = 'k' + targetKey;
      infoComparisons.textContent = path.filter((p) => p.type === 'key').length;
    }

    // key buttons
    const keyButtonsRoot = document.getElementById('key-buttons');
    for (let k = 1; k <= n; k++) {
      const b = document.createElement('button');
      b.className = 'btn';
      b.textContent = 'k' + k;
      b.addEventListener('click', () => showSearchPath(k));
      keyButtonsRoot.appendChild(b);
    }

    // also: clicking the SVG background clears the path
    svg.on('click', (event) => {
      if (event.target === svg.node()) {
        clearPath();
        infoTarget.textContent = '—';
        infoComparisons.textContent = '—';
      }
    });
  });
})();
