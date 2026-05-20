(function () {
  'use strict';

  const COLOR_HEX = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
    '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16',
    '#0ea5e9', '#dc2626', '#059669', '#d97706',
    '#7c3aed', '#0891b2', '#db2777', '#65a30d',
    '#94a3b8', '#94a3b8', '#94a3b8', '#94a3b8'
  ];
  const COLOR_NUM = COLOR_HEX.map((h) => parseInt(h.slice(1), 16));

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  function findRoot(parent, x) {
    while (parent[x] !== x) x = parent[x];
    return x;
  }

  function rootIndexMap(parent) {
    const map = new Map();
    let next = 0;
    const idx = new Array(parent.length);
    for (let i = 0; i < parent.length; i++) {
      const r = findRoot(parent, i);
      if (!map.has(r)) map.set(r, next++);
      idx[i] = map.get(r);
    }
    return idx;
  }

  // ============================================================
  // Three.js viewer
  // ============================================================
  function makeLabelSprite(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 96;
    canvas.height = 48;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 1.5;
    const r = 8;
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(96 - r, 0);
    ctx.arcTo(96, 0, 96, r, r);
    ctx.lineTo(96, 48 - r);
    ctx.arcTo(96, 48, 96 - r, 48, r);
    ctx.lineTo(r, 48);
    ctx.arcTo(0, 48, 0, 48 - r, r);
    ctx.lineTo(0, r);
    ctx.arcTo(0, 0, r, 0, r);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 26px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 48, 26);
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const material = new THREE.SpriteMaterial({ map: texture, depthWrite: false });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(4, 2, 1);
    return sprite;
  }

  function setupViewer3D(container, opts) {
    opts = opts || {};
    const wrap = container.querySelector('.three-canvas-wrap');
    const W = opts.width || 720;
    const H = opts.height || 460;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xfafafa);

    scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const dir = new THREE.DirectionalLight(0xffffff, 0.45);
    dir.position.set(40, 60, 40);
    scene.add(dir);

    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 1000);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    wrap.appendChild(renderer.domElement);

    // Ground grid
    const grid = new THREE.GridHelper(50, 10, 0xd1d5db, 0xeef2f7);
    grid.position.set(25, 0, 25);
    scene.add(grid);

    // Axes hint (subtle)
    const axes = new THREE.AxesHelper(8);
    axes.position.set(0, 0, 0);
    scene.add(axes);

    const points = NET.POINTS;
    const N = points.length;

    // Centroid for camera lookAt
    let cx = 0, cy = 0, cz = 0;
    for (const p of points) { cx += p.x; cy += p.y; cz += p.z; }
    cx /= N; cy /= N; cz /= N;
    const center = new THREE.Vector3(cx, cy, cz);

    // Spheres
    const sphereGeo = new THREE.SphereGeometry(0.85, 18, 14);
    const spheres = points.map((p) => {
      const mat = new THREE.MeshLambertMaterial({ color: 0x3b82f6 });
      const m = new THREE.Mesh(sphereGeo, mat);
      m.position.set(p.x, p.y, p.z);
      scene.add(m);
      return m;
    });

    // Labels
    if (opts.labels) {
      points.forEach((p, i) => {
        const sprite = makeLabelSprite(String(i));
        sprite.position.set(p.x, p.y + 2.2, p.z);
        scene.add(sprite);
      });
    }

    // Edges
    let edgeLines = null;
    function setEdges(edges, colors) {
      if (edgeLines) {
        scene.remove(edgeLines);
        edgeLines.geometry.dispose();
        edgeLines.material.dispose();
        edgeLines = null;
      }
      if (!edges || !edges.length) return;
      const positions = new Float32Array(edges.length * 6);
      const colorArr = new Float32Array(edges.length * 6);
      edges.forEach((e, idx) => {
        const a = points[e.u], b = points[e.v];
        positions.set([a.x, a.y, a.z, b.x, b.y, b.z], idx * 6);
        const c = new THREE.Color(colors[idx]);
        colorArr.set([c.r, c.g, c.b, c.r, c.g, c.b], idx * 6);
      });
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(colorArr, 3));
      const mat = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.55
      });
      edgeLines = new THREE.LineSegments(geo, mat);
      scene.add(edgeLines);
    }

    function setSphereColors(colors) {
      spheres.forEach((s, i) => s.material.color.setHex(colors[i]));
    }

    // Orbit state
    const orbit = {
      yaw: opts.initialYaw !== undefined ? opts.initialYaw : 0.7,
      pitch: opts.initialPitch !== undefined ? opts.initialPitch : 0.35,
      distance: opts.initialDistance || 78
    };

    function updateCamera() {
      const px = center.x + orbit.distance * Math.cos(orbit.pitch) * Math.sin(orbit.yaw);
      const py = center.y + orbit.distance * Math.sin(orbit.pitch);
      const pz = center.z + orbit.distance * Math.cos(orbit.pitch) * Math.cos(orbit.yaw);
      camera.position.set(px, py, pz);
      camera.lookAt(center);
    }
    updateCamera();

    // Mouse drag rotate
    let dragging = false, lastX = 0, lastY = 0;
    wrap.addEventListener('mousedown', (e) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    });
    window.addEventListener('mouseup', () => { dragging = false; });
    window.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      orbit.yaw -= dx * 0.005;
      orbit.pitch += dy * 0.005;
      orbit.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, orbit.pitch));
      updateCamera();
    });
    // Touch support (single finger drag)
    wrap.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        dragging = true;
        lastX = e.touches[0].clientX;
        lastY = e.touches[0].clientY;
      }
    }, { passive: true });
    wrap.addEventListener('touchmove', (e) => {
      if (!dragging || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - lastX;
      const dy = e.touches[0].clientY - lastY;
      lastX = e.touches[0].clientX;
      lastY = e.touches[0].clientY;
      orbit.yaw -= dx * 0.005;
      orbit.pitch += dy * 0.005;
      orbit.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, orbit.pitch));
      updateCamera();
    }, { passive: true });
    wrap.addEventListener('touchend', () => { dragging = false; });

    wrap.addEventListener('wheel', (e) => {
      e.preventDefault();
      orbit.distance *= e.deltaY > 0 ? 1.1 : 0.9;
      orbit.distance = Math.max(25, Math.min(200, orbit.distance));
      updateCamera();
    }, { passive: false });

    let autoRotate = !!opts.autoRotate;

    function animate() {
      if (autoRotate && !dragging) {
        orbit.yaw += 0.0025;
        updateCamera();
      }
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }
    animate();

    return {
      scene, camera, renderer,
      setEdges, setSphereColors,
      setAutoRotate(v) { autoRotate = !!v; }
    };
  }

  // ============================================================
  // Main viewer + r slider (cell 6)
  // ============================================================
  function setupMainViewer() {
    const container = document.getElementById('viewer-main');
    if (!container) return;

    const viewer = setupViewer3D(container, {
      width: 720,
      height: 460,
      labels: true,
      initialYaw: 0.6,
      initialPitch: 0.4,
      initialDistance: 85
    });

    const slider = document.getElementById('main-r-slider');
    const rDisplay = document.getElementById('main-r-value');
    const statEdges = document.getElementById('stat-edges');
    const statComp = document.getElementById('stat-components');
    const statLargest = document.getElementById('stat-largest');
    const listRoot = document.getElementById('components-list');

    function update(r) {
      rDisplay.textContent = r.toFixed(1);
      const edges = NET.buildEdges(NET.POINTS, r);
      const result = NET.runUF(NET.POINTS.length, edges);
      const parent = result.parent;
      const compIdx = rootIndexMap(parent);

      // sphere colors
      const sphereColors = compIdx.map((ci) => COLOR_NUM[ci % COLOR_NUM.length]);
      viewer.setSphereColors(sphereColors);

      // edge colors: by component
      const edgeColors = edges.map((e) => COLOR_NUM[compIdx[e.u] % COLOR_NUM.length]);
      viewer.setEdges(edges, edgeColors);

      // stats
      const comps = NET.components(NET.POINTS.length, edges);
      statEdges.textContent = edges.length;
      statComp.textContent = comps.length;
      statLargest.textContent = comps.reduce((m, c) => Math.max(m, c.length), 0);

      // list
      listRoot.innerHTML = '';
      comps.forEach((comp, idx) => {
        const ci = compIdx[comp[0]];
        const color = COLOR_HEX[ci % COLOR_HEX.length];
        const div = document.createElement('div');
        div.className = 'comp-item';
        div.style.borderLeftColor = color;
        div.innerHTML = `
          <span class="comp-label" style="color:${color};">컴포넌트 ${idx + 1}</span>
          <span class="comp-members">{ ${comp.join(', ')} }</span>
          <span class="comp-size">${comp.length}개</span>
        `;
        listRoot.appendChild(div);
      });
    }

    slider.addEventListener('input', () => update(parseFloat(slider.value)));
    update(parseFloat(slider.value));
  }

  // ============================================================
  // Intro viewer (cell 1)
  // ============================================================
  function setupIntroViewer() {
    const container = document.getElementById('viewer-intro');
    if (!container) return;
    const viewer = setupViewer3D(container, {
      width: 600,
      height: 360,
      labels: false,
      autoRotate: true,
      initialYaw: 0.3,
      initialPitch: 0.3,
      initialDistance: 80
    });
    // Color all spheres uniformly (just points, no components yet)
    viewer.setSphereColors(NET.POINTS.map(() => 0x6b7280));
    viewer.setEdges([], []);
  }

  // ============================================================
  // UF Stepper (cell 5)
  // ============================================================
  function setupUFStepper() {
    const slider = document.getElementById('uf-r-slider');
    const rDisplay = document.getElementById('uf-r-value');
    const progress = document.getElementById('uf-progress');
    const btnNext = document.getElementById('uf-next');
    const btnPrev = document.getElementById('uf-prev');
    const btnReset = document.getElementById('uf-reset');
    const btnSkip = document.getElementById('uf-skip');
    const graphSvg = document.getElementById('uf-graph-svg');
    const forestSvg = document.getElementById('uf-forest-svg');
    const narration = document.getElementById('uf-narration');

    const N = NET.POINTS.length;

    // XY projection bounds: x in [5, 45], y in [8, 43]
    // SVG viewBox: 0 0 480 360
    const PAD = 28;
    const SVG_W = 480, SVG_H = 360;
    function projectX(x) { return PAD + (x - 0) * (SVG_W - 2 * PAD) / 50; }
    function projectY(y) { return SVG_H - PAD - (y - 0) * (SVG_H - 2 * PAD) / 50; }

    let currentR = parseFloat(slider.value);
    let edges = NET.buildEdges(NET.POINTS, currentR);
    let step = 0;
    let parent = Array.from({ length: N }, (_, i) => i);
    let rank = Array(N).fill(0);

    function reapplyToStep(target) {
      parent = Array.from({ length: N }, (_, i) => i);
      rank = Array(N).fill(0);
      for (let i = 0; i < target; i++) ufUnion(edges[i].u, edges[i].v);
      step = target;
    }
    function ufFind(x) {
      while (parent[x] !== x) {
        parent[x] = parent[parent[x]];
        x = parent[x];
      }
      return x;
    }
    function ufUnion(a, b) {
      const ra = ufFind(a), rb = ufFind(b);
      if (ra === rb) return { merged: false, rootA: ra, rootB: rb };
      if (rank[ra] < rank[rb]) parent[ra] = rb;
      else if (rank[ra] > rank[rb]) parent[rb] = ra;
      else { parent[rb] = ra; rank[ra]++; }
      return { merged: true, rootA: ra, rootB: rb };
    }

    function onRChange() {
      currentR = parseFloat(slider.value);
      rDisplay.textContent = currentR.toFixed(1);
      edges = NET.buildEdges(NET.POINTS, currentR);
      reapplyToStep(0);
      render();
      setNarration(null);
    }

    function next() {
      if (step >= edges.length) return;
      const e = edges[step];
      const result = ufUnion(e.u, e.v);
      step++;
      render();
      const dStr = e.d.toFixed(2);
      if (result.merged) {
        setNarration(`간선 (${e.u}, ${e.v}) 거리 ${dStr} · find(${e.u})=${result.rootA}, find(${e.v})=${result.rootB} · 다른 루트 → <b>합침</b>`);
      } else {
        setNarration(`간선 (${e.u}, ${e.v}) 거리 ${dStr} · find(${e.u})=find(${e.v})=${result.rootA} · 같은 루트 → 이미 같은 컴포넌트 (사이클)`);
      }
    }
    function prev() {
      if (step === 0) return;
      reapplyToStep(step - 1);
      render();
      setNarration(step === 0 ? null : null);
    }
    function reset() {
      reapplyToStep(0);
      render();
      setNarration(null);
    }
    function skip() {
      reapplyToStep(edges.length);
      render();
      const compCount = new Set(parent.map((_, i) => ufFind(i))).size;
      setNarration(`완료. ${edges.length}개 간선 모두 처리 → <b>${compCount}개</b> 컴포넌트로 분리.`);
    }

    function setNarration(html) {
      narration.innerHTML = html || '<span class="narration-empty">Next를 눌러 첫 간선을 합쳐보세요.</span>';
    }

    function render() {
      progress.textContent = `${step} / ${edges.length}`;
      btnPrev.disabled = step === 0;
      btnNext.disabled = step === edges.length;
      btnSkip.disabled = step === edges.length;

      // Compute component color for each node based on current parent
      const compIdx = rootIndexMap(parent);

      // ---- Graph SVG (left) ----
      let html = '';
      // applied edges
      for (let i = 0; i < step; i++) {
        const e = edges[i];
        const a = NET.POINTS[e.u], b = NET.POINTS[e.v];
        const x1 = projectX(a.x), y1 = projectY(a.y);
        const x2 = projectX(b.x), y2 = projectY(b.y);
        const cur = (i === step - 1) ? ' is-current' : '';
        const color = COLOR_HEX[compIdx[e.u] % COLOR_HEX.length];
        html += `<line class="uf-edge${cur}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${cur ? '#ef4444' : color}" opacity="0.75"/>`;
      }
      // nodes
      for (let i = 0; i < N; i++) {
        const p = NET.POINTS[i];
        const x = projectX(p.x), y = projectY(p.y);
        const color = COLOR_HEX[compIdx[i] % COLOR_HEX.length];
        html += `<g class="uf-node"><circle cx="${x}" cy="${y}" r="9" fill="${color}" stroke="white" stroke-width="1.5"/><text x="${x}" y="${y + 3}" text-anchor="middle" font-family="JetBrains Mono" font-size="9" font-weight="700" fill="white">${i}</text></g>`;
      }
      graphSvg.innerHTML = html;

      // ---- Forest SVG (right) ----
      forestSvg.innerHTML = renderForest(parent, compIdx);
    }

    slider.addEventListener('input', onRChange);
    btnNext.addEventListener('click', next);
    btnPrev.addEventListener('click', prev);
    btnReset.addEventListener('click', reset);
    btnSkip.addEventListener('click', skip);

    rDisplay.textContent = currentR.toFixed(1);
    render();
    setNarration(null);
  }

  // ============================================================
  // Forest layout
  // ============================================================
  function renderForest(parent, compIdx) {
    const N = parent.length;
    const childrenOf = Array.from({ length: N }, () => []);
    const roots = [];
    for (let i = 0; i < N; i++) {
      if (parent[i] === i) roots.push(i);
      else childrenOf[parent[i]].push(i);
    }

    // sort children for deterministic layout
    for (const ch of childrenOf) ch.sort((a, b) => a - b);
    roots.sort((a, b) => a - b);

    // count leaves in subtree to allocate horizontal slots
    const leafCount = new Array(N).fill(1);
    function computeLeafCount(node) {
      if (childrenOf[node].length === 0) {
        leafCount[node] = 1;
        return 1;
      }
      let sum = 0;
      for (const c of childrenOf[node]) sum += computeLeafCount(c);
      leafCount[node] = sum;
      return sum;
    }
    for (const r of roots) computeLeafCount(r);

    // max depth per tree
    function maxDepth(node) {
      if (childrenOf[node].length === 0) return 0;
      let m = 0;
      for (const c of childrenOf[node]) m = Math.max(m, 1 + maxDepth(c));
      return m;
    }

    const NODE_R = 8;
    const SLOT_W = 22;
    const LEVEL_H = 30;
    const TREE_GAP = 14;
    const PAD = 12;

    // Layout: place each tree side by side
    const layout = new Array(N);
    let cursor = PAD;
    let maxDepthAll = 0;
    for (const r of roots) {
      const tw = leafCount[r] * SLOT_W;
      const td = maxDepth(r);
      maxDepthAll = Math.max(maxDepthAll, td);
      placeSubtree(r, cursor + tw / 2, 0, cursor, cursor + tw);
      cursor += tw + TREE_GAP;
    }
    const totalW = cursor + PAD;
    const totalH = PAD + (maxDepthAll + 1) * LEVEL_H + PAD;

    function placeSubtree(node, x, depth, xMin, xMax) {
      layout[node] = { x, y: PAD + depth * LEVEL_H };
      const ch = childrenOf[node];
      if (ch.length === 0) return;
      // distribute children across [xMin, xMax]
      let used = xMin;
      for (const c of ch) {
        const w = leafCount[c] * SLOT_W;
        placeSubtree(c, used + w / 2, depth + 1, used, used + w);
        used += w;
      }
    }

    // SVG content
    let html = '';
    // edges first
    for (let i = 0; i < N; i++) {
      if (parent[i] === i) continue;
      const a = layout[i], b = layout[parent[i]];
      if (!a || !b) continue;
      html += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#cbd5e1" stroke-width="1.5"/>`;
    }
    // nodes
    for (let i = 0; i < N; i++) {
      const p = layout[i];
      if (!p) continue;
      const color = COLOR_HEX[compIdx[i] % COLOR_HEX.length];
      const isRoot = parent[i] === i;
      const strokeW = isRoot ? 2.5 : 1.5;
      html += `<g><circle cx="${p.x}" cy="${p.y}" r="${NODE_R}" fill="${color}" stroke="${isRoot ? '#1f2937' : 'white'}" stroke-width="${strokeW}"/><text x="${p.x}" y="${p.y + 3}" text-anchor="middle" font-family="JetBrains Mono" font-size="8.5" font-weight="700" fill="white">${i}</text></g>`;
    }

    // Set viewBox of the SVG dynamically
    const svg = document.getElementById('uf-forest-svg');
    if (svg) svg.setAttribute('viewBox', `0 0 ${totalW} ${Math.max(totalH, 200)}`);
    return html;
  }

  // ============================================================
  // Init
  // ============================================================
  ready(() => {
    if (!window.NET) {
      console.error('NET module not loaded');
      return;
    }
    if (!window.THREE) {
      console.error('Three.js not loaded');
      return;
    }
    setupIntroViewer();
    setupMainViewer();
    setupUFStepper();
  });
})();
