import * as THREE from 'three';
import { ISLANDS, WORLD_CONFIG } from './config.js';
import { VoxelWorld } from './world.js';
import { syntheticBlockEntries } from './benchmark-data.js';

const $ = selector => document.querySelector(selector);
const runButton = $('#run-benchmark');
const stressToggle = $('#include-stress');
const resultsBody = $('#results');
const status = $('#status');
const canvas = $('#benchmark-canvas');
let report = null;
let isRunning = false;

function nextFrame() {
  return new Promise(resolve => requestAnimationFrame(resolve));
}

function median(values) {
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}

function addResult(result) {
  const row = document.createElement('tr');
  for (const [index, value] of [result.name, result.blocks.toLocaleString('zh-TW'), `${result.ms.toFixed(1)} ms`, result.detail].entries()) {
    const cell = document.createElement(index === 0 ? 'th' : 'td');
    if (index === 0) cell.scope = 'row';
    cell.textContent = value;
    row.append(cell);
  }
  resultsBody.append(row);
}

function setStatus(message) {
  status.textContent = message;
}

function createRenderer(scene) {
  try {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
    renderer.setSize(640, 360, false);
    scene.add(new THREE.HemisphereLight('#e9f2dc', '#54775a', 2));
    const sunlight = new THREE.DirectionalLight('#ffe2a8', 2.1);
    sunlight.position.set(-28, 48, 20);
    scene.add(sunlight);
    return renderer;
  } catch (error) {
    console.warn('WebGL preview unavailable:', error);
    return null;
  }
}

function populateSyntheticBlocks(world, count, layout) {
  for (const [key, type] of syntheticBlockEntries(count, layout, WORLD_CONFIG.chunkSize)) {
    if (world.blocks.has(key)) throw new Error(`Synthetic workload overlaps existing block ${key}`);
    world.blocks.set(key, type);
  }
}

function resetToBase(world, baseBlocks) {
  world.blocks = new Map(baseBlocks);
  world.reindexColumns();
  world.rebuildAll();
}

function renderFor(renderer, scene, camera, durationMs = 3000) {
  return new Promise((resolve, reject) => {
    let frames = 0;
    const start = performance.now();
    let animationFrame = 0;
    const finish = result => {
      cancelAnimationFrame(animationFrame);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      resolve(result);
    };
    const fail = error => {
      cancelAnimationFrame(animationFrame);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      reject(error);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') finish({ ms: performance.now() - start, fps: null, suspended: true });
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    function frame(now) {
      if (document.visibilityState !== 'visible') return finish({ ms: now - start, fps: null, suspended: true });
      try {
        renderer.render(scene, camera);
      } catch (error) {
        fail(error);
        return;
      }
      frames++;
      if (now - start < durationMs) animationFrame = requestAnimationFrame(frame);
      else finish({ ms: now - start, fps: frames * 1000 / (now - start), suspended: false });
    }
    animationFrame = requestAnimationFrame(frame);
  });
}

async function runBenchmark() {
  if (isRunning) return;
  isRunning = true;
  runButton.setAttribute('aria-disabled', 'true');
  const includeStress = stressToggle.checked;
  $('#copy-report').disabled = true;
  resultsBody.replaceChildren();
  report = null;
  const entries = [];
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#9acdc9');
  scene.fog = new THREE.Fog('#9acdc9', 48, WORLD_CONFIG.viewDistance);
  const camera = new THREE.PerspectiveCamera(73, 16 / 9, 0.1, 180);
  let world, renderer;

  try {
    world = new VoxelWorld(scene);
    renderer = createRenderer(scene);
    await nextFrame();
    const generationSamples = [];
    for (let trial = 0; trial < 4; trial++) {
      if (trial > 0) {
        world.chunkIndex.clear();
        world.rebuildAll();
        world.blocks.clear();
        world.topHeights.clear();
      }
      setStatus(trial === 0 ? '暖機：產生初始島嶼與街角…' : `量測初始世界生成（${trial}/3）…`);
      await nextFrame();
      const generationStart = performance.now();
      for (const island of ISLANDS) world.generateIsland(island);
      world.seedTaiwanStreet();
      world.reindexColumns();
      world.rebuildAll();
      const elapsed = performance.now() - generationStart;
      if (trial > 0) generationSamples.push(elapsed);
    }
    const generationMs = median(generationSamples);
    const generationEntry = {
      name: '初始世界生成與網格（3 次中位數）',
      blocks: world.getBlockCount(),
      ms: generationMs,
      detail: `${world.chunks.size} 區塊；${Math.min(...generationSamples).toFixed(1)}–${Math.max(...generationSamples).toFixed(1)} ms`,
    };
    addResult(generationEntry);
    entries.push(generationEntry);
    const baseBlocks = new Map(world.blocks);

    setStatus('量測局部區塊重建…');
    await nextFrame();
    const spawn = world.getSpawnPoint('main');
    const chunkX = Math.floor(spawn.x / WORLD_CONFIG.chunkSize);
    const chunkZ = Math.floor(spawn.z / WORLD_CONFIG.chunkSize);
    const rebuildSamples = [];
    for (let run = 0; run < 13; run++) {
      const start = performance.now();
      world.rebuildChunk(chunkX, chunkZ);
      const elapsed = performance.now() - start;
      if (run >= 3) rebuildSamples.push(elapsed);
    }
    const rebuildMs = median(rebuildSamples);
    addResult({ name: '單一區塊重建中位數（10 次）', blocks: world.getBlockCount(), ms: rebuildMs, detail: `區塊 ${chunkX},${chunkZ}` });
    entries.push({ name: '單一區塊重建中位數（10 次）', blocks: world.getBlockCount(), ms: rebuildMs, detail: `區塊 ${chunkX},${chunkZ}` });

    const workloads = [{ count: 5000, layout: 'distributed', name: '加 5,000 個分散方塊' }];
    if (includeStress) workloads.push({ count: 20000, layout: 'distributed', name: '加 20,000 個分散方塊' });
    workloads.push({ count: 2000, layout: 'single-chunk', name: '單一區塊加 2,000 個分層方塊' });
    for (const workload of workloads) {
      resetToBase(world, baseBlocks);
      populateSyntheticBlocks(world, workload.count, workload.layout);
      world.reindexColumns();
      setStatus(`${workload.name}並重建世界網格…`);
      await nextFrame();
      const start = performance.now();
      world.rebuildAll();
      const elapsed = performance.now() - start;
      const entry = { name: workload.name, blocks: world.getBlockCount(), ms: elapsed, detail: `${world.chunks.size} 個區塊` };
      addResult(entry);
      entries.push(entry);
    }

    resetToBase(world, baseBlocks);
    let fpsResult = null;
    if (renderer) {
      camera.position.set(spawn.x + 12, spawn.y + 8, spawn.z + 16);
      camera.lookAt(spawn.x, spawn.y + 2, spawn.z);
      setStatus('渲染初始世界 3 秒，統計畫面更新…');
      await nextFrame();
      fpsResult = await renderFor(renderer, scene, camera);
      const fpsEntry = {
        name: '初始世界畫面更新（3 秒）',
        blocks: world.getBlockCount(),
        ms: fpsResult.ms,
        detail: fpsResult.suspended ? '頁面切至背景，量測略過' : `${fpsResult.fps.toFixed(1)} FPS`,
      };
      addResult(fpsEntry);
      entries.push(fpsEntry);
    } else {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 4;
      cell.className = 'muted';
      cell.textContent = '此瀏覽器無法建立 WebGL context，略過畫面更新量測。';
      row.append(cell);
      resultsBody.append(row);
    }

    const memory = performance.memory?.usedJSHeapSize;
    const environment = {
      userAgent: navigator.userAgent,
      viewport: `${window.innerWidth}×${window.innerHeight}`,
      devicePixelRatio: window.devicePixelRatio || 1,
      rendererPixelRatio: renderer ? renderer.getPixelRatio() : null,
      deviceMemoryGB: navigator.deviceMemory ?? null,
      jsHeapUsedMB: memory ? Number((memory / 1024 / 1024).toFixed(1)) : null,
      jsHeapSource: memory ? 'performance.memory（若瀏覽器支援）' : null,
      webgl: Boolean(renderer),
      pageVisibility: document.visibilityState,
      fps: fpsResult?.fps === null ? null : fpsResult ? Number(fpsResult.fps.toFixed(1)) : null,
    };
    $('#environment').textContent = JSON.stringify(environment, null, 2);
    report = { createdAt: new Date().toISOString(), environment, results: entries };
    $('#report-text').textContent = JSON.stringify(report, null, 2);
    $('#copy-report').disabled = false;
    setStatus(fpsResult?.suspended
      ? '生成與重建量測完成；分頁曾切至背景，畫面更新數據已略過。'
      : '量測完成。可複製結果，再於另一台裝置以相同設定重跑。');
  } catch (error) {
    console.error('Benchmark failed:', error);
    setStatus(`量測中斷：${error.message || error}`);
    if (entries.length) {
      report = {
        createdAt: new Date().toISOString(),
        complete: false,
        error: error.message || String(error),
        environment: {
          userAgent: navigator.userAgent,
          viewport: `${window.innerWidth}×${window.innerHeight}`,
          devicePixelRatio: window.devicePixelRatio || 1,
          pageVisibility: document.visibilityState,
        },
        results: entries,
      };
      $('#report-text').textContent = JSON.stringify(report, null, 2);
      $('#copy-report').disabled = false;
    }
  } finally {
    if (world) {
      for (const mesh of world.chunks.values()) {
        scene.remove(mesh);
        mesh.geometry.dispose();
      }
      world.chunks.clear();
      world.ocean.geometry.dispose();
      world.ocean.material.dispose();
      world.colorMaterial.dispose();
    }
    renderer?.dispose();
    runButton.setAttribute('aria-disabled', 'false');
    isRunning = false;
  }
}

runButton.addEventListener('click', () => {
  if (!isRunning) runBenchmark();
});
$('#copy-report').addEventListener('click', async () => {
  if (!report) return;
  try {
    await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    setStatus('量測報告已複製。');
  } catch {
    setStatus('無法使用剪貼簿；請展開下方文字報告並手動複製。');
  }
});
