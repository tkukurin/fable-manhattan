<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Procedural Manhattan Alive</title>
  <style>
    html, body {
      margin: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #0f1420;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    #app {
      position: fixed;
      inset: 0;
    }
    canvas {
      display: block;
    }
    #hud {
      position: fixed;
      right: 12px;
      top: 12px;
      width: 260px;
      color: rgba(255, 246, 225, 0.94);
      background: rgba(8, 11, 16, 0.42);
      border: 1px solid rgba(255, 233, 190, 0.18);
      box-shadow: 0 18px 50px rgba(0,0,0,0.28);
      backdrop-filter: blur(10px);
      border-radius: 14px;
      padding: 10px;
      opacity: 0.42;
      transition: opacity 180ms ease, transform 180ms ease;
      user-select: none;
    }
    #hud:hover { opacity: 0.95; }
    body.photo #hud { display: none; }
    .row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      margin-bottom: 7px;
    }
    .row.three { grid-template-columns: 1fr 1fr 1fr; }
    .row.one { grid-template-columns: 1fr; }
    button, select, input[type="range"] {
      width: 100%;
      border: 1px solid rgba(255,255,255,0.13);
      border-radius: 9px;
      color: #fff6df;
      background: rgba(255,255,255,0.07);
      font-size: 11px;
      line-height: 1.2;
      padding: 7px 8px;
      outline: none;
    }
    button { cursor: pointer; }
    button:hover, select:hover { background: rgba(255,255,255,0.13); }
    .label {
      display: grid;
      grid-template-columns: 66px 1fr;
      gap: 8px;
      align-items: center;
      font-size: 11px;
      color: rgba(255, 246, 225, 0.78);
      margin: 6px 0;
    }
    input[type="range"] { padding: 0; accent-color: #ffc36d; }
    #meter {
      position: fixed;
      left: 12px;
      bottom: 10px;
      color: rgba(255, 246, 225, 0.62);
      font-size: 11px;
      letter-spacing: 0.02em;
      background: rgba(8, 11, 16, 0.28);
      border-radius: 999px;
      padding: 6px 10px;
      pointer-events: none;
    }
    body.photo #meter { display: none; }
  </style>

  <script type="importmap">
  {
    "imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
      "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
    }
  }
  </script>
</head>
<body>
  <div id="app"></div>
  <div id="hud" aria-label="compact controls">
    <div class="row three">
      <button data-preset="hero">Hero</button>
      <button data-preset="downtown">Harbor</button>
      <button data-preset="midtown">Midtown</button>
    </div>
    <div class="row three">
      <button data-preset="park">Park</button>
      <button data-preset="bridges">Bridges</button>
      <button data-preset="gwb">GWB</button>
    </div>
    <div class="row">
      <select id="lightMode" title="light">
        <option value="golden">golden hour</option>
        <option value="noon">clear noon</option>
        <option value="dusk">dusk ignition</option>
      </select>
      <select id="quality" title="quality">
        <option value="high">high quality</option>
        <option value="medium">medium quality</option>
        <option value="low">laptop saver</option>
      </select>
    </div>
    <label class="label"><span>streets</span><input id="trafficDensity" type="range" min="0" max="1" step="0.01" value="0.82"></label>
    <label class="label"><span>rivers</span><input id="riverDensity" type="range" min="0" max="1" step="0.01" value="0.78"></label>
    <div class="row one"><button id="photoMode">photo mode</button></div>
  </div>
  <div id="meter">procedural Manhattan: one mesh-city, nested LOD, live traffic</div>

<script type="module">
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const app = document.getElementById('app');
const meter = document.getElementById('meter');

const MANHATTAN_LENGTH = 2185; // 1 world unit ~= 10 meters
const WORLD_SEED = 91357;
const Y_ROAD = 0.055;
const Y_PARK = 0.065;
const Y_WATER = -0.025;
const SUN_SHADOW_ANGLE = Math.atan2(0.95, 0.32);

const clock = new THREE.Clock();
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8eb5da);
scene.fog = new THREE.FogExp2(0xbfd0df, 0.00044);

const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.25, 9000);
camera.position.set(-1450, 1120, -850);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
app.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(-8, 0, 1065);
controls.enableDamping = true;
controls.dampingFactor = 0.075;
controls.screenSpacePanning = false;
controls.minDistance = 15;
controls.maxDistance = 3600;
controls.maxPolarAngle = Math.PI * 0.49;
controls.zoomSpeed = 0.82;
controls.panSpeed = 0.75;
controls.rotateSpeed = 0.47;
controls.update();

const sharedUniforms = {
  uTime: { value: 0 },
  uDusk: { value: 0 },
  uDuskWave: { value: 0 },
  uGlitter: { value: 1 },
  uMode: { value: 0 }
};

const hemi = new THREE.HemisphereLight(0xe8f3ff, 0x4b3828, 1.25);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffbc6d, 3.4);
sun.position.set(-1180, 620, -380);
scene.add(sun);
const fill = new THREE.DirectionalLight(0x6f9ed7, 0.52);
fill.position.set(720, 900, 1320);
scene.add(fill);

const root = new THREE.Group();
scene.add(root);

function mulberry32(seed) {
  let t = seed >>> 0;
  return function rand() {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(WORLD_SEED);
function rnd(min, max) { return min + (max - min) * rand(); }
function rint(min, max) { return Math.floor(rnd(min, max + 1)); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function smoothstep(a, b, x) {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}
function lerp(a, b, t) { return a + (b - a) * t; }
function hash01(x, z) {
  const s = Math.sin(x * 127.1 + z * 311.7 + WORLD_SEED * 0.071) * 43758.5453;
  return s - Math.floor(s);
}
function pick(arr) { return arr[Math.floor(rand() * arr.length)]; }

const widthAnchors = [
  [0, 10], [40, 28], [90, 58], [160, 76], [260, 96], [420, 124], [620, 136],
  [820, 128], [1040, 122], [1260, 119], [1500, 117], [1740, 111], [1950, 96], [2185, 68]
];
function islandWidthAt(z) {
  z = clamp(z, 0, MANHATTAN_LENGTH);
  for (let i = 0; i < widthAnchors.length - 1; i++) {
    const a = widthAnchors[i], b = widthAnchors[i + 1];
    if (z >= a[0] && z <= b[0]) {
      const t = (z - a[0]) / (b[0] - a[0]);
      const wiggle = 4.0 * Math.sin(z * 0.010) + 2.5 * Math.sin(z * 0.027);
      return lerp(a[1], b[1], smoothstep(0, 1, t)) + wiggle;
    }
  }
  return 70;
}
function islandCenterAt(z) {
  return -9 + 15 * Math.sin((z / MANHATTAN_LENGTH) * Math.PI * 0.86) - 7 * Math.sin(z * 0.0042);
}
function westEdgeAt(z) { return islandCenterAt(z) - islandWidthAt(z); }
function eastEdgeAt(z) { return islandCenterAt(z) + islandWidthAt(z); }
function insideIsland(x, z, margin = 0) {
  if (z < 2 + margin || z > MANHATTAN_LENGTH - margin) return false;
  const c = islandCenterAt(z);
  return Math.abs(x - c) < islandWidthAt(z) - margin;
}
function gridAngleAt(z) {
  if (z < 520) return THREE.MathUtils.degToRad(17 - 30 * smoothstep(40, 520, z));
  if (z < 680) return THREE.MathUtils.degToRad(-13 * (1 - smoothstep(520, 680, z)));
  return 0;
}
function inCentralPark(x, z) { return x > -52 && x < 48 && z > 850 && z < 1267; }
function inParkPocket(x, z) {
  if (inCentralPark(x, z)) return true;
  if (z < 80 && Math.abs(x - islandCenterAt(z)) < islandWidthAt(z) - 8) return true; // Battery
  if (Math.abs(x + 25) < 16 && Math.abs(z - 610) < 15) return true; // Washington Square
  if (Math.abs(x + 8) < 13 && Math.abs(z - 705) < 18) return true; // Madison Square
  if (Math.abs(x + 12) < 12 && Math.abs(z - 815) < 10) return true; // Bryant Park
  if (Math.abs(x - 1) < 11 && Math.abs(z - 760) < 11) return true; // Herald / plaza pocket
  if (z > 1320 && z < 1435 && Math.abs(x - 5) < 18) return true; // Morningside-ish green
  if (z > 1740 && z < 1890 && x < -30 && x > -92) return true; // Trinity cemetery / Heights
  if (z > 1940 && x > -60 && x < 55) return true; // Inwood ridge green
  const west = westEdgeAt(z);
  if (z > 820 && z < 2020 && x < west + 16) return true; // Riverside strip
  return false;
}
function nearShore(x, z, margin = 11) {
  return x < westEdgeAt(z) + margin || x > eastEdgeAt(z) - margin;
}

function makeStripGeometry(points, width, y = Y_ROAD) {
  const pos = [];
  const idx = [];
  let v = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1];
    const dx = b.x - a.x, dz = b.z - a.z;
    const len = Math.hypot(dx, dz) || 1;
    const nx = -dz / len * width * 0.5, nz = dx / len * width * 0.5;
    pos.push(a.x + nx, y, a.z + nz, a.x - nx, y, a.z - nz, b.x - nx, y, b.z - nz, b.x + nx, y, b.z + nz);
    idx.push(v, v + 1, v + 2, v, v + 2, v + 3);
    v += 4;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
class QuadBuilder {
  constructor(y = Y_ROAD) {
    this.y = y;
    this.pos = [];
    this.idx = [];
    this.v = 0;
  }
  addStrip(x1, z1, x2, z2, width) {
    const dx = x2 - x1, dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    if (len < 0.001) return;
    const nx = -dz / len * width * 0.5, nz = dx / len * width * 0.5;
    this.pos.push(x1 + nx, this.y, z1 + nz, x1 - nx, this.y, z1 - nz, x2 - nx, this.y, z2 - nz, x2 + nx, this.y, z2 + nz);
    this.idx.push(this.v, this.v + 1, this.v + 2, this.v, this.v + 2, this.v + 3);
    this.v += 4;
  }
  addRect(cx, z, w, d) {
    this.pos.push(cx - w/2, this.y, z - d/2, cx + w/2, this.y, z - d/2, cx + w/2, this.y, z + d/2, cx - w/2, this.y, z + d/2);
    this.idx.push(this.v, this.v + 1, this.v + 2, this.v, this.v + 2, this.v + 3);
    this.v += 4;
  }
  build(material, name) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setIndex(this.idx);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, material);
    m.name = name || 'quad-mesh';
    return m;
  }
}

function makeWindowMaterial(base, metalness, roughness) {
  const mat = new THREE.MeshStandardMaterial({
    color: base,
    metalness,
    roughness,
    vertexColors: true
  });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = sharedUniforms.uTime;
    shader.uniforms.uDusk = sharedUniforms.uDusk;
    shader.uniforms.uDuskWave = sharedUniforms.uDuskWave;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWorldPos;\nvarying vec3 vWorldNormal;')
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n#ifdef USE_INSTANCING\n  vWorldNormal = normalize(mat3(modelMatrix * instanceMatrix) * objectNormal);\n#else\n  vWorldNormal = normalize(mat3(modelMatrix) * objectNormal);\n#endif')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n#ifdef USE_INSTANCING\n  vWorldPos = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;\n#else\n  vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;\n#endif');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uTime;
uniform float uDusk;
uniform float uDuskWave;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;
float cityHash(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}`)
      .replace('#include <dithering_fragment>', `
float verticalFace = 1.0 - smoothstep(0.48, 0.92, abs(vWorldNormal.y));
float axisPick = step(abs(vWorldNormal.x), abs(vWorldNormal.z));
float facadeCoord = mix(vWorldPos.z, vWorldPos.x, axisPick);
float floorCoord = max(0.0, vWorldPos.y);
vec2 cell = floor(vec2(facadeCoord * 0.38, floorCoord * 0.72));
vec2 f = fract(vec2(facadeCoord * 0.38, floorCoord * 0.72));
float inWindow = step(0.12, f.x) * step(f.x, 0.86) * step(0.17, f.y) * step(f.y, 0.76);
float stripe = smoothstep(0.45, 0.95, sin((facadeCoord + floorCoord * 0.23) * 0.33 + uTime * 0.08) * 0.5 + 0.5);
float rnd = cityHash(vec3(cell, floor(vWorldPos.z * 0.041 + vWorldPos.x * 0.053)));
float duskOn = smoothstep(rnd * 1.18, rnd * 1.18 + 0.16, uDuskWave);
vec3 warmWindow = vec3(1.0, 0.58, 0.24) * (0.62 + rnd * 0.82);
vec3 coolMirror = vec3(0.55, 0.78, 1.0) * 0.10 + vec3(1.0, 0.60, 0.24) * 0.20 * stripe;
gl_FragColor.rgb += verticalFace * inWindow * coolMirror * (1.0 - uDusk * 0.7);
gl_FragColor.rgb += verticalFace * inWindow * warmWindow * duskOn * uDusk * 1.28;
#include <dithering_fragment>`);
    mat.userData.shader = shader;
  };
  return mat;
}

const mat = {
  island: new THREE.MeshStandardMaterial({ color: 0x6f6d58, roughness: 0.86, metalness: 0.0 }),
  road: new THREE.MeshStandardMaterial({ color: 0x22252a, roughness: 0.94, metalness: 0.0 }),
  highway: new THREE.MeshStandardMaterial({ color: 0x303238, roughness: 0.86, metalness: 0.0 }),
  park: new THREE.MeshStandardMaterial({ color: 0x1f6a37, roughness: 0.92 }),
  meadow: new THREE.MeshStandardMaterial({ color: 0x428c3c, roughness: 0.95 }),
  path: new THREE.MeshStandardMaterial({ color: 0xc2a36b, roughness: 0.88 }),
  pier: new THREE.MeshStandardMaterial({ color: 0x796956, roughness: 0.94 }),
  roof: new THREE.MeshStandardMaterial({ color: 0x3b3f42, roughness: 0.82 }),
  brick: makeWindowMaterial(0x9c5a45, 0.03, 0.72),
  masonry: makeWindowMaterial(0xb09373, 0.02, 0.66),
  stone: makeWindowMaterial(0xc7b89c, 0.04, 0.58),
  glass: makeWindowMaterial(0x495c68, 0.42, 0.28),
  darkGlass: makeWindowMaterial(0x17202d, 0.65, 0.18),
  terracotta: makeWindowMaterial(0xd7c4a8, 0.08, 0.46),
  neighbor: new THREE.MeshStandardMaterial({ color: 0x7e8990, roughness: 0.88, transparent: true, opacity: 0.36 }),
  shadow: new THREE.MeshBasicMaterial({ color: 0x14100d, transparent: true, opacity: 0.075, depthWrite: false }),
  bridge: new THREE.MeshStandardMaterial({ color: 0x6f7377, roughness: 0.55, metalness: 0.18 }),
  bridgeCable: new THREE.LineBasicMaterial({ color: 0xc9c4b5, transparent: true, opacity: 0.68 }),
  spire: new THREE.MeshStandardMaterial({ color: 0xd8d3c4, roughness: 0.38, metalness: 0.42 }),
  bridgeLight: new THREE.MeshBasicMaterial({ color: 0xffcf76, transparent: true, opacity: 0.0 }),
  statue: new THREE.MeshStandardMaterial({ color: 0x4c9b83, roughness: 0.78, metalness: 0.05 }),
  waterTower: new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.82 }),
  hvac: new THREE.MeshStandardMaterial({ color: 0x737a7e, roughness: 0.62, metalness: 0.2 }),
  car: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, metalness: 0.12, vertexColors: true }),
  boat: new THREE.MeshStandardMaterial({ color: 0xf1ead8, roughness: 0.45, metalness: 0.05, vertexColors: true }),
  wake: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.23, depthWrite: false }),
  steam: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18, depthWrite: false }),
  cloudShadow: new THREE.MeshBasicMaterial({ color: 0x111827, transparent: true, opacity: 0.055, depthWrite: false })
};

const waterMaterial = new THREE.ShaderMaterial({
  transparent: false,
  depthWrite: true,
  uniforms: {
    uTime: sharedUniforms.uTime,
    uGlitter: sharedUniforms.uGlitter,
    uDusk: sharedUniforms.uDusk
  },
  vertexShader: `
varying vec3 vPos;
void main() {
  vPos = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
  fragmentShader: `
precision highp float;
varying vec3 vPos;
uniform float uTime;
uniform float uGlitter;
uniform float uDusk;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
void main() {
  float w1 = sin(vPos.x * 0.078 + uTime * 0.55) * sin(vPos.z * 0.034 - uTime * 0.38);
  float w2 = sin((vPos.x + vPos.z) * 0.021 + uTime * 0.19);
  float grains = hash(floor(vPos.xz * 1.1 + uTime * 3.0));
  float glitter = pow(max(0.0, w1 * 0.58 + w2 * 0.22 + grains * 0.38), 6.0) * uGlitter;
  float longSun = pow(max(0.0, sin((vPos.x * 0.25 - vPos.z * 0.036) + uTime * 0.18)), 18.0) * uGlitter;
  vec3 deep = mix(vec3(0.025, 0.105, 0.145), vec3(0.04, 0.07, 0.11), uDusk);
  vec3 gold = vec3(1.0, 0.61, 0.22);
  vec3 color = deep + vec3(0.02, 0.09, 0.13) * (w1 + w2);
  color += gold * (glitter * 0.78 + longSun * 0.42) * (1.0 - uDusk * 0.38);
  color += vec3(0.72, 0.87, 1.0) * glitter * 0.15;
  gl_FragColor = vec4(color, 1.0);
}`
});

function makeIslandMesh() {
  const west = [];
  const east = [];
  for (let z = 0; z <= MANHATTAN_LENGTH; z += 12) {
    west.push(new THREE.Vector2(westEdgeAt(z), z));
    east.push(new THREE.Vector2(eastEdgeAt(z), z));
  }
  east.reverse();
  const shape = new THREE.Shape([...west, ...east]);
  const geo = new THREE.ShapeGeometry(shape, 12);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, mat.island);
  mesh.name = 'complete-tapered-manhattan-island';
  root.add(mesh);
}
makeIslandMesh();

function addWaterAndShores() {
  const water = new THREE.Mesh(new THREE.PlaneGeometry(1850, 3100, 1, 1), waterMaterial);
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, Y_WATER, 1060);
  water.name = 'hudson-east-rivers-and-harbor';
  root.add(water);

  const nj = makeNeighborBlocks('new-jersey', -520, -255, 40, 2140, 22, 34, 2.0, 9.0, 0x78868a);
  const bq = makeNeighborBlocks('brooklyn-queens', 250, 620, -60, 2000, 20, 30, 1.5, 10.0, 0x747e84);
  root.add(nj, bq);

  const liberty = new THREE.Group();
  liberty.name = 'tiny-statue-of-liberty-harbor-hint';
  addBox(liberty, -335, 0, -175, 8, 3, 8, mat.stone, 0);
  const statueBase = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3.0, 7.0, 6), mat.statue);
  statueBase.position.set(-335, 7.1, -175);
  liberty.add(statueBase);
  const torch = new THREE.Mesh(new THREE.ConeGeometry(1.3, 4.5, 8), mat.statue);
  torch.position.set(-334.2, 13.0, -174.2);
  liberty.add(torch);
  root.add(liberty);
}

function makeNeighborBlocks(name, x0, x1, z0, z1, sx, sz, hmin, hmax, color) {
  const group = new THREE.Group();
  group.name = name;
  const material = mat.neighbor.clone();
  material.color.setHex(color);
  const geom = new THREE.BoxGeometry(1, 1, 1);
  const items = [];
  for (let x = x0; x < x1; x += sx) {
    for (let z = z0; z < z1; z += sz) {
      if (rand() < 0.23) continue;
      const w = rnd(7, sx * 0.78), d = rnd(10, sz * 0.78), h = rnd(hmin, hmax) * (rand() < 0.08 ? rnd(1.8, 3.5) : 1);
      items.push({ x: x + rnd(-2, 2), z: z + rnd(-2, 2), w, d, h });
    }
  }
  const mesh = new THREE.InstancedMesh(geom, material, items.length);
  const m = new THREE.Matrix4();
  for (let i = 0; i < items.length; i++) {
    const b = items[i];
    m.compose(new THREE.Vector3(b.x, b.h / 2, b.z), new THREE.Quaternion(), new THREE.Vector3(b.w, b.h, b.d));
    mesh.setMatrixAt(i, m);
  }
  group.add(mesh);
  return group;
}

function addGroundParksAndCentralPark() {
  const parkGroup = new THREE.Group();
  parkGroup.name = 'central-park-complete-subworld-and-green-pockets';
  root.add(parkGroup);

  addGroundRect(parkGroup, -2, 1058, 100, 417, mat.park, Y_PARK, 'central-park-rectangle');
  addGroundRect(parkGroup, -24, 610, 33, 31, mat.park, Y_PARK, 'washington-square');
  addGroundRect(parkGroup, -8, 705, 29, 38, mat.park, Y_PARK, 'madison-square');
  addGroundRect(parkGroup, -12, 815, 25, 21, mat.park, Y_PARK, 'bryant-park');
  addGroundRect(parkGroup, 5, 1375, 40, 80, mat.park, Y_PARK, 'morningside-green');
  addGroundRect(parkGroup, -62, 1815, 68, 126, mat.park, Y_PARK, 'trinity-cemetery');
  addGroundRect(parkGroup, -1, 2035, 120, 245, mat.park, Y_PARK, 'inwood-ridge-green');

  const riverside = new QuadBuilder(Y_PARK + 0.005);
  for (let z = 820; z <= 2030; z += 22) {
    const west = westEdgeAt(z);
    riverside.addStrip(west + 6, z, west + 6, z + 18, 13);
  }
  parkGroup.add(riverside.build(mat.park, 'riverside-park-strip'));

  addEllipse(parkGroup, 0, 1160, 34, 58, waterMaterial, 0.085, 'jackie-onassis-reservoir');
  addEllipse(parkGroup, -19, 1010, 20, 27, waterMaterial, 0.087, 'the-lake');
  addEllipse(parkGroup, 26, 884, 17, 23, waterMaterial, 0.087, 'central-park-pond');
  addEllipse(parkGroup, 22, 1240, 18, 20, waterMaterial, 0.087, 'harlem-meer');
  addEllipse(parkGroup, 7, 1096, 12, 15, waterMaterial, 0.087, 'conservatory-water');

  addGroundRect(parkGroup, -16, 940, 44, 62, mat.meadow, 0.089, 'sheep-meadow');
  addGroundRect(parkGroup, -9, 1085, 45, 42, mat.meadow, 0.089, 'great-lawn');
  addGroundRect(parkGroup, 18, 980, 26, 36, mat.meadow, 0.091, 'ballfields');

  const path = new QuadBuilder(0.103);
  const loops = [
    [{x:-38,z:868},{x:-42,z:980},{x:-35,z:1120},{x:-25,z:1248}],
    [{x:38,z:870},{x:35,z:1000},{x:42,z:1150},{x:34,z:1258}],
    [{x:-36,z:900},{x:-10,z:950},{x:18,z:930},{x:36,z:900}],
    [{x:-28,z:1070},{x:4,z:1122},{x:31,z:1120},{x:38,z:1185}],
    [{x:-44,z:1238},{x:-18,z:1200},{x:12,z:1215},{x:39,z:1248}],
    [{x:-46,z:850},{x:-8,z:1058},{x:42,z:1262}],
    [{x:42,z:850},{x:5,z:1040},{x:-42,z:1260}]
  ];
  for (const pts of loops) for (let i = 0; i < pts.length - 1; i++) path.addStrip(pts[i].x, pts[i].z, pts[i+1].x, pts[i+1].z, 2.0);
  parkGroup.add(path.build(mat.path, 'central-park-loop-and-walking-paths'));

  const ballMat = new THREE.MeshBasicMaterial({ color: 0xd0bd86, transparent: true, opacity: 0.72, depthWrite: false });
  for (let i = 0; i < 9; i++) {
    const c = new THREE.Mesh(new THREE.RingGeometry(3.5, 3.8, 32), ballMat);
    c.rotation.x = -Math.PI / 2;
    c.position.set(8 + (i % 3) * 10, 0.115, 950 + Math.floor(i / 3) * 12);
    parkGroup.add(c);
  }
}
function addGroundRect(group, x, z, w, d, material, y, name) {
  const geo = new THREE.PlaneGeometry(w, d);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  mesh.name = name || 'ground-rect';
  group.add(mesh);
  return mesh;
}
function addEllipse(group, x, z, rx, rz, material, y, name) {
  const geo = new THREE.CircleGeometry(1, 64);
  geo.scale(rx, rz, 1);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  mesh.name = name || 'ellipse';
  group.add(mesh);
  return mesh;
}
addWaterAndShores();
addGroundParksAndCentralPark();

function buildRoadsAndPiers() {
  const road = new QuadBuilder(Y_ROAD + 0.012);
  const highway = new QuadBuilder(Y_ROAD + 0.018);

  for (let x = -124; x <= 126; x += 22) {
    let active = false;
    let start = 0;
    for (let z = 70; z <= 2055; z += 10) {
      const ok = insideIsland(x, z, 10) && !inCentralPark(x, z);
      if (ok && !active) { active = true; start = z; }
      if ((!ok || z >= 2055) && active) {
        const end = ok ? z : z - 10;
        if (end - start > 14) road.addStrip(x, start, x, end, Math.abs(x) < 4 ? 3.6 : 2.6);
        active = false;
      }
    }
  }
  for (let z = 88; z < 2040; z += (z < 600 ? 13 : 8)) {
    if (z > 850 && z < 1267) continue;
    const w = westEdgeAt(z) + 9;
    const e = eastEdgeAt(z) - 9;
    if (e - w > 24) road.addStrip(w, z, e, z, z > 600 ? 1.75 : 2.05);
  }

  const diagonalRoads = [
    [[-48, 250], [-28, 520], [0, 820], [23, 1110], [42, 1500], [38, 1780]], // Broadway
    [[-70, 390], [-42, 570], [-20, 720]],
    [[45, 360], [16, 540], [-8, 650]],
    [[-18, 62], [36, 242], [76, 420]],
    [[-75, 160], [-18, 330], [28, 470]]
  ];
  for (const line of diagonalRoads) {
    for (let i = 0; i < line.length - 1; i++) road.addStrip(line[i][0], line[i][1], line[i+1][0], line[i+1][1], i === 0 ? 3.8 : 3.3);
  }

  const westHighway = [];
  const eastHighway = [];
  for (let z = 60; z <= 2035; z += 28) {
    westHighway.push({ x: westEdgeAt(z) + 6.5, z });
    eastHighway.push({ x: eastEdgeAt(z) - 6.3, z });
  }
  for (let i = 0; i < westHighway.length - 1; i++) highway.addStrip(westHighway[i].x, westHighway[i].z, westHighway[i+1].x, westHighway[i+1].z, 5.8);
  for (let i = 0; i < eastHighway.length - 1; i++) highway.addStrip(eastHighway[i].x, eastHighway[i].z, eastHighway[i+1].x, eastHighway[i+1].z, 5.4);

  root.add(road.build(mat.road, 'true-street-grid-avenues-cross-streets-broadway'));
  root.add(highway.build(mat.highway, 'west-side-highway-and-fdr-drive'));

  const pierGroup = new THREE.Group();
  pierGroup.name = 'weathered-piers-all-around-the-island';
  for (let z = 100; z < 1620; z += rnd(36, 72)) {
    const side = rand() < 0.63 ? -1 : 1;
    const edge = side < 0 ? westEdgeAt(z) : eastEdgeAt(z);
    const len = rnd(15, side < 0 ? 55 : 34);
    const w = rnd(7, 15);
    addBox(pierGroup, edge + side * len * 0.5, 0, z + rnd(-4, 4), len, 1.2, w, mat.pier, 0);
  }
  for (let z = 1710; z < 2010; z += 62) {
    const edge = westEdgeAt(z);
    addBox(pierGroup, edge - 22, 0, z, 44, 1.0, rnd(8, 14), mat.pier, 0);
  }
  root.add(pierGroup);
}
buildRoadsAndPiers();

const buildingData = [];
const archetypes = {
  brick: [], masonry: [], stone: [], glass: [], darkGlass: [], terracotta: []
};
const penthouseData = [];
const shadowData = [];
const waterTowerData = [];
const hvacData = [];
const avenueXs = [];
for (let x = -124; x <= 126; x += 22) avenueXs.push(x);

function districtAt(x, z) {
  if (z < 360) return 'downtown';
  if (z < 560) return 'lower-east-village';
  if (z < 735) return 'village-flatiron-chelsea';
  if (z < 1120) return 'midtown';
  if (z < 1285) return Math.abs(x) < 60 ? 'central-park-edge' : 'upper';
  if (z < 1720) return 'harlem';
  if (z < 1950) return 'washington-heights';
  return 'inwood';
}
function buildingHeight(x, z, w, d) {
  const dist = districtAt(x, z);
  const h0 = hash01(x * 4.17, z * 2.91);
  const h1 = hash01(x * 1.89 + 77, z * 3.41 - 9);
  if (dist === 'downtown') {
    const core = smoothstep(110, 300, z) * (1.0 - smoothstep(300, 430, z)) * (1.0 - smoothstep(42, 108, Math.abs(x + 22)));
    return lerp(3.5, 17.0, h0) + Math.pow(h1, 5.0) * 45 * core + Math.pow(h0, 12.0) * 22;
  }
  if (dist === 'midtown') {
    const core = (1.0 - smoothstep(80, 150, Math.abs(x - 2))) * smoothstep(730, 850, z) * (1.0 - smoothstep(1080, 1180, z));
    const row57 = Math.exp(-Math.pow((z - 1015) / 72, 2)) * (1.0 - smoothstep(74, 126, Math.abs(x)));
    return lerp(5.0, 24.0, h0) + Math.pow(h1, 3.3) * 43 * core + Math.pow(h0, 5.2) * 34 * row57;
  }
  if (dist === 'central-park-edge') {
    const edge = Math.max(smoothstep(37, 62, Math.abs(x)), smoothstep(44, 78, Math.abs(x)));
    return lerp(8.0, 21.0, h0) + Math.pow(h1, 4.0) * 22 * edge;
  }
  if (dist === 'upper') return lerp(4.0, 15.0, h0) + Math.pow(h1, 6.0) * 9;
  if (dist === 'harlem') return lerp(3.0, 13.5, h0) + (h1 > 0.92 ? 10 : 0);
  if (dist === 'washington-heights') return lerp(3.0, 11.0, h0) + (nearShore(x, z, 20) ? 5 * h1 : 0);
  if (dist === 'inwood') return lerp(2.3, 7.0, h0);
  if (dist === 'village-flatiron-chelsea') return lerp(3.0, 12.0, h0) + (h1 > 0.88 ? 7 : 0);
  return lerp(2.5, 8.0, h0);
}
function styleFor(x, z, h) {
  const d = districtAt(x, z);
  const r = hash01(x + 11, z - 29);
  if (h > 31) return r < 0.65 ? 'darkGlass' : 'glass';
  if (d === 'downtown' || d === 'midtown') {
    if (h > 17 && r < 0.68) return r < 0.34 ? 'glass' : 'darkGlass';
    if (r < 0.26) return 'stone';
    if (r < 0.52) return 'terracotta';
    return 'masonry';
  }
  if (d === 'harlem' || d === 'washington-heights' || d === 'inwood') return r < 0.55 ? 'brick' : (r < 0.80 ? 'masonry' : 'stone');
  if (d === 'central-park-edge' || d === 'upper') return r < 0.44 ? 'stone' : (r < 0.72 ? 'masonry' : 'brick');
  return r < 0.56 ? 'brick' : (r < 0.80 ? 'masonry' : 'terracotta');
}
function baseColorFor(style, x, z, h) {
  const color = new THREE.Color();
  const jitter = 0.78 + hash01(x * 6.2, z * 4.8) * 0.44;
  if (style === 'brick') color.setRGB(0.58 * jitter, 0.27 * jitter, 0.19 * jitter);
  else if (style === 'masonry') color.setRGB(0.62 * jitter, 0.51 * jitter, 0.39 * jitter);
  else if (style === 'stone') color.setRGB(0.76 * jitter, 0.71 * jitter, 0.62 * jitter);
  else if (style === 'terracotta') color.setRGB(0.78 * jitter, 0.68 * jitter, 0.55 * jitter);
  else if (style === 'glass') color.setRGB(0.36 * jitter, 0.45 * jitter, 0.50 * jitter);
  else color.setRGB(0.11 * jitter, 0.14 * jitter, 0.19 * jitter);
  if (h > 26 && style.includes('Glass')) color.offsetHSL(0, 0.05, 0.04);
  return color;
}
function addBuildingInstance(x, z, w, d, h, rot = 0, forceStyle = null) {
  if (!insideIsland(x, z, 8) || inParkPocket(x, z)) return;
  if (w < 2.0 || d < 2.0 || h < 1.0) return;
  const style = forceStyle || styleFor(x, z, h);
  const data = { x, z, w, d, h, rot, style };
  buildingData.push(data);
  archetypes[style].push(data);
  const r = hash01(x * 2.1 + 12, z * 2.3 - 7);
  if (h > 8 && r > 0.52) {
    penthouseData.push({ x: x + rnd(-w * 0.18, w * 0.18), z: z + rnd(-d * 0.18, d * 0.18), w: w * rnd(0.22, 0.52), d: d * rnd(0.22, 0.52), h: rnd(0.8, Math.min(3.5, h * 0.12)), y: h, rot });
  }
  if (h > 10 && r > 0.70) {
    hvacData.push({ x: x + rnd(-w * 0.25, w * 0.25), z: z + rnd(-d * 0.25, d * 0.25), w: rnd(1.2, 3.4), d: rnd(1.0, 3.0), h: rnd(0.45, 1.2), y: h, rot: rand() * Math.PI });
  }
  if (h > 4 && h < 24 && r > 0.74 && waterTowerData.length < 1600) {
    const n = r > 0.955 && w * d > 130 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      waterTowerData.push({ x: x + rnd(-w * 0.26, w * 0.26), z: z + rnd(-d * 0.26, d * 0.26), y: h + 1.55, s: rnd(0.75, 1.34), rot: rand() * Math.PI });
    }
  }
  if (h > 14 && shadowData.length < 2200) shadowData.push({ x, z, w, d, h, rot });
}

function generateBuildings() {
  for (let zi = 75; zi < 2045; zi += 8) {
    if (zi > 850 && zi < 1267) continue;
    const west = westEdgeAt(zi) + 12;
    const east = eastEdgeAt(zi) - 12;
    const localAvenues = avenueXs.filter(x => x > west && x < east);
    if (localAvenues.length < 2) continue;
    for (let ai = 0; ai < localAvenues.length - 1; ai++) {
      const x0 = localAvenues[ai] + 2.1;
      const x1 = localAvenues[ai + 1] - 2.1;
      const z0 = zi + 1.2;
      const z1 = zi + 6.1;
      const cx = (x0 + x1) * 0.5;
      const cz = (z0 + z1) * 0.5;
      if (!insideIsland(cx, cz, 10) || inParkPocket(cx, cz)) continue;
      const district = districtAt(cx, cz);
      const lots = district === 'midtown' || district === 'downtown' ? rint(1, 3) : rint(2, 5);
      let cursor = x0;
      for (let l = 0; l < lots; l++) {
        const remain = x1 - cursor;
        const lotW = l === lots - 1 ? remain : remain / (lots - l) * rnd(0.72, 1.24);
        const w = Math.max(2.6, lotW - rnd(0.4, 1.6));
        const d = Math.max(2.8, (z1 - z0) - rnd(0.25, 1.2));
        const x = cursor + lotW * 0.5 + rnd(-0.28, 0.28);
        const z = cz + rnd(-0.16, 0.16);
        const h = buildingHeight(x, z, w, d);
        addBuildingInstance(x, z, w, d, h, 0);
        cursor += lotW;
      }
    }
  }

  // Lower Manhattan and the Village: extra rotated, tight blocks below the clean grid.
  for (let z = 60; z < 680; z += 10) {
    const w0 = westEdgeAt(z) + 10;
    const e0 = eastEdgeAt(z) - 10;
    for (let x = w0; x < e0; x += rnd(8, 15)) {
      if (rand() < 0.23) continue;
      const bw = rnd(3.2, 10.5);
      const bd = rnd(4.0, 11.5);
      const bx = x + rnd(2.0, 6.5);
      const bz = z + rnd(1.2, 8.5);
      if (!insideIsland(bx, bz, 11) || inParkPocket(bx, bz)) continue;
      const h = buildingHeight(bx, bz, bw, bd) * rnd(0.85, 1.18);
      addBuildingInstance(bx, bz, bw, bd, h, gridAngleAt(bz) * rnd(0.45, 1.05));
    }
  }

  // Stuyvesant-style superblocks and uptown project tower rhythms.
  for (let z = 620; z < 1540; z += 115) {
    const side = rand() < 0.55 ? 1 : -1;
    const x = side > 0 ? eastEdgeAt(z) - rnd(32, 55) : westEdgeAt(z) + rnd(32, 55);
    if (inCentralPark(x, z)) continue;
    for (let i = 0; i < 5; i++) {
      const bx = x + rnd(-14, 14);
      const bz = z + rnd(-34, 34);
      if (insideIsland(bx, bz, 18) && !inParkPocket(bx, bz)) addBuildingInstance(bx, bz, rnd(6, 9), rnd(14, 22), rnd(12, 22), rand() * Math.PI, 'brick');
    }
  }
}
generateBuildings();

const buildingMeshes = [];
function instantiateBuildings() {
  const geom = new THREE.BoxGeometry(1, 1, 1, 1, 1, 1);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  Object.keys(archetypes).forEach(style => {
    const arr = archetypes[style];
    const mesh = new THREE.InstancedMesh(geom, mat[style], arr.length);
    mesh.name = 'instanced-' + style + '-buildings';
    for (let i = 0; i < arr.length; i++) {
      const b = arr[i];
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), b.rot || 0);
      scale.set(b.w, b.h, b.d);
      m.compose(new THREE.Vector3(b.x, b.h / 2, b.z), q, scale);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, baseColorFor(style, b.x, b.z, b.h));
    }
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    root.add(mesh);
    buildingMeshes.push(mesh);
  });
}
instantiateBuildings();

function instantiateFarDistrictMassing() {
  const data = [];
  for (let z = 110; z < 1990; z += 46) {
    if (z > 850 && z < 1267) continue;
    for (let x = westEdgeAt(z) + 25; x < eastEdgeAt(z) - 25; x += 38) {
      if (!insideIsland(x, z, 22) || inParkPocket(x, z)) continue;
      const h = buildingHeight(x, z, 26, 28) * 0.72 + 3;
      data.push({ x, z, w: rnd(18, 32), d: rnd(25, 42), h });
    }
  }
  const geom = new THREE.BoxGeometry(1, 1, 1);
  const fm = makeWindowMaterial(0x6a6860, 0.08, 0.68);
  fm.transparent = true;
  fm.opacity = 0.16;
  const mesh = new THREE.InstancedMesh(geom, fm, data.length);
  const mx = new THREE.Matrix4();
  for (let i = 0; i < data.length; i++) {
    const b = data[i];
    mx.compose(new THREE.Vector3(b.x, b.h / 2, b.z), new THREE.Quaternion(), new THREE.Vector3(b.w, b.h, b.d));
    mesh.setMatrixAt(i, mx);
    mesh.setColorAt(i, new THREE.Color(0x827867));
  }
  mesh.name = 'far-merged-district-massing-lod';
  root.add(mesh);
  return mesh;
}
const farMassing = instantiateFarDistrictMassing();

function instantiateRoofsAndDetails() {
  const box = new THREE.BoxGeometry(1, 1, 1);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const penthouses = new THREE.InstancedMesh(box, mat.roof, penthouseData.length);
  for (let i = 0; i < penthouseData.length; i++) {
    const p = penthouseData[i];
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.rot || 0);
    s.set(p.w, p.h, p.d);
    m.compose(new THREE.Vector3(p.x, p.y + p.h / 2 + 0.06, p.z), q, s);
    penthouses.setMatrixAt(i, m);
  }
  penthouses.name = 'instanced-roof-penthouses-lod';
  root.add(penthouses);

  const hvac = new THREE.InstancedMesh(box, mat.hvac, hvacData.length);
  for (let i = 0; i < hvacData.length; i++) {
    const h = hvacData[i];
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), h.rot || 0);
    s.set(h.w, h.h, h.d);
    m.compose(new THREE.Vector3(h.x, h.y + h.h / 2 + 0.08, h.z), q, s);
    hvac.setMatrixAt(i, m);
  }
  hvac.name = 'instanced-rooftop-hvac-lod';
  root.add(hvac);

  const tankGeo = new THREE.CylinderGeometry(1, 1, 1, 12, 1);
  const tanks = new THREE.InstancedMesh(tankGeo, mat.waterTower, waterTowerData.length);
  const legGeo = new THREE.BoxGeometry(1, 1, 1);
  const legs = new THREE.InstancedMesh(legGeo, mat.waterTower, waterTowerData.length * 4);
  for (let i = 0; i < waterTowerData.length; i++) {
    const t = waterTowerData[i];
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), t.rot);
    s.set(t.s, 1.35 * t.s, t.s);
    m.compose(new THREE.Vector3(t.x, t.y, t.z), q, s);
    tanks.setMatrixAt(i, m);
    const offsets = [[-0.55,-0.55],[0.55,-0.55],[-0.55,0.55],[0.55,0.55]];
    for (let j = 0; j < 4; j++) {
      const ox = offsets[j][0] * t.s, oz = offsets[j][1] * t.s;
      s.set(0.16 * t.s, 1.85 * t.s, 0.16 * t.s);
      m.compose(new THREE.Vector3(t.x + ox, t.y - 1.15 * t.s, t.z + oz), q, s);
      legs.setMatrixAt(i * 4 + j, m);
    }
  }
  tanks.name = 'instanced-rooftop-water-tanks';
  legs.name = 'instanced-water-tower-legs';
  root.add(tanks, legs);

  const shadowGeo = new THREE.PlaneGeometry(1, 1);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadows = new THREE.InstancedMesh(shadowGeo, mat.shadow, shadowData.length);
  for (let i = 0; i < shadowData.length; i++) {
    const b = shadowData[i];
    const len = clamp(b.h * 4.7, 24, 210);
    const width = Math.max(b.w, b.d) * 0.92;
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), SUN_SHADOW_ANGLE);
    s.set(width, 1, len);
    const dx = Math.sin(SUN_SHADOW_ANGLE) * len * 0.5;
    const dz = Math.cos(SUN_SHADOW_ANGLE) * len * 0.5;
    m.compose(new THREE.Vector3(b.x + dx, 0.071, b.z + dz), q, s);
    shadows.setMatrixAt(i, m);
  }
  shadows.name = 'fake-long-golden-hour-building-shadows';
  root.add(shadows);
  return { penthouses, hvac, tanks, legs, shadows };
}
const roofLOD = instantiateRoofsAndDetails();

function addBox(group, x, y, z, w, h, d, material, rot = 0, name = '') {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y + h / 2, z);
  mesh.rotation.y = rot;
  mesh.name = name;
  group.add(mesh);
  return mesh;
}
function makeTriPrism(points, h, material) {
  const verts = [
    points[0].x, 0, points[0].z, points[1].x, 0, points[1].z, points[2].x, 0, points[2].z,
    points[0].x, h, points[0].z, points[1].x, h, points[1].z, points[2].x, h, points[2].z
  ];
  const idx = [0,1,2, 3,5,4, 0,3,4, 0,4,1, 1,4,5, 1,5,2, 2,5,3, 2,3,0];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return new THREE.Mesh(g, material);
}
function addLandmarks() {
  const lm = new THREE.Group();
  lm.name = 'true-silhouette-landmarks';
  root.add(lm);

  const wtc = new THREE.Mesh(new THREE.CylinderGeometry(5.7, 8.5, 54, 4, 1), mat.darkGlass);
  wtc.position.set(-42, 27, 230);
  wtc.rotation.y = Math.PI / 4;
  lm.add(wtc);
  const wtcSpire = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.42, 19, 8), mat.spire);
  wtcSpire.position.set(-42, 65, 230);
  lm.add(wtcSpire);
  addBox(lm, -48, 0, 215, 18, 9, 16, mat.glass, 0, 'world-trade-center-podium');

  addBox(lm, -13, 0, 788, 21, 14, 17, mat.stone, 0, 'empire-state-base');
  addBox(lm, -13, 14, 788, 14, 18, 12, mat.terracotta, 0, 'empire-state-main-shaft');
  addBox(lm, -13, 32, 788, 8.5, 8, 7, mat.terracotta, 0, 'empire-state-crown');
  const esbSpire = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.8, 11, 10), mat.spire);
  esbSpire.position.set(-13, 45.5, 788);
  lm.add(esbSpire);

  addBox(lm, 25, 0, 850, 15, 17, 12, mat.glass, 0, 'chrysler-base');
  addBox(lm, 25, 17, 850, 9, 10, 8, mat.terracotta, 0, 'chrysler-neck');
  const chrysTop = new THREE.Mesh(new THREE.ConeGeometry(5.4, 8, 12), mat.glass);
  chrysTop.position.set(25, 31, 850);
  lm.add(chrysTop);
  const chrysSpire = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.35, 11, 8), mat.spire);
  chrysSpire.position.set(25, 40, 850);
  lm.add(chrysSpire);

  const flatiron = makeTriPrism([{x:-31,z:680},{x:-8,z:694},{x:-22,z:653}], 10.5, mat.terracotta);
  flatiron.name = 'flatiron-wedge';
  lm.add(flatiron);

  addBox(lm, 21, 0, 862, 28, 6.2, 25, mat.stone, 0, 'grand-central-low-mass');
  addBox(lm, 23, 6.2, 862, 11, 4, 9, mat.terracotta, 0, 'grand-central-clock-block');

  addBox(lm, 121, 0, 900, 7.5, 18, 49, mat.glass, 0, 'un-secretariat-east-river-slab');
  addBox(lm, 53, 0, 1072, 14, 5.2, 134, mat.stone, 0, 'metropolitan-museum-park-edge');

  addBox(lm, -49, 0, 777, 26, 6, 23, mat.stone, 0.18, 'madison-square-garden-block');
  const msgRing = new THREE.Mesh(new THREE.CylinderGeometry(15, 15, 5.4, 48), mat.terracotta);
  msgRing.position.set(-49, 6.2, 777);
  lm.add(msgRing);

  const supertalls = [
    [-32, 1005, 7, 62, 7, 'darkGlass'], [-8, 1030, 8, 46, 8, 'glass'], [15, 1016, 5.8, 58, 5.8, 'darkGlass'],
    [35, 985, 8, 43, 9, 'glass'], [-55, 942, 8, 39, 8, 'darkGlass'], [3, 905, 10, 43, 10, 'glass'],
    [42, 1088, 6, 45, 6, 'glass'], [-20, 1088, 7, 48, 7, 'darkGlass']
  ];
  for (const [x,z,w,h,d,style] of supertalls) {
    addBox(lm, x, 0, z, w, h, d, mat[style], 0, 'midtown-supertall');
    if (h > 46) addBox(lm, x, h, z, w * 0.42, 5, d * 0.42, mat[style], 0, 'supertall-crown');
  }

  const tombGeo = new THREE.BoxGeometry(0.8, 0.45, 1.2);
  const tombs = new THREE.InstancedMesh(tombGeo, mat.stone, 220);
  const mx = new THREE.Matrix4();
  for (let i = 0; i < 220; i++) {
    const x = rnd(-89, -36), z = rnd(1765, 1870);
    if (!insideIsland(x, z, 8)) continue;
    mx.compose(new THREE.Vector3(x, 0.34, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), rnd(-0.2,0.2)), new THREE.Vector3(1, 1, 1));
    tombs.setMatrixAt(i, mx);
  }
  lm.add(tombs);
}
addLandmarks();

function addBridgeLights(points, count, group) {
  const geo = new THREE.SphereGeometry(0.45, 8, 4);
  const mesh = new THREE.InstancedMesh(geo, mat.bridgeLight, count);
  const mx = new THREE.Matrix4();
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : i / (count - 1);
    let seg = Math.min(points.length - 2, Math.floor(t * (points.length - 1)));
    const localT = t * (points.length - 1) - seg;
    const a = points[seg], b = points[seg + 1];
    const x = lerp(a.x, b.x, localT), z = lerp(a.z, b.z, localT), y = lerp(a.y || 5, b.y || 5, localT);
    mx.compose(new THREE.Vector3(x, y + 0.7, z), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
    mesh.setMatrixAt(i, mx);
  }
  group.add(mesh);
  bridgeLightMeshes.push(mesh);
}
const bridgeLightMeshes = [];
function addBridge(name, p0, p1, towerT = [0.25, 0.72], height = 28, width = 4.5) {
  const group = new THREE.Group();
  group.name = name;
  const dx = p1.x - p0.x, dz = p1.z - p0.z;
  const len = Math.hypot(dx, dz);
  const angle = Math.atan2(dx, dz);
  addBox(group, (p0.x+p1.x)/2, 5.0, (p0.z+p1.z)/2, width, 1.2, len, mat.bridge, angle, name + '-deck');
  for (const t of towerT) {
    const x = lerp(p0.x, p1.x, t), z = lerp(p0.z, p1.z, t);
    addBox(group, x - Math.cos(angle) * 3.2, 3.0, z + Math.sin(angle) * 3.2, 2.2, height, 2.2, mat.bridge, angle, name + '-tower-a');
    addBox(group, x + Math.cos(angle) * 3.2, 3.0, z - Math.sin(angle) * 3.2, 2.2, height, 2.2, mat.bridge, angle, name + '-tower-b');
  }
  const cablePts = [];
  for (let i = 0; i <= 42; i++) {
    const t = i / 42;
    const x = lerp(p0.x, p1.x, t);
    const z = lerp(p0.z, p1.z, t);
    const y = 12 + Math.sin(Math.PI * t) * height * 0.68;
    cablePts.push(new THREE.Vector3(x, y, z));
  }
  const cable = new THREE.Line(new THREE.BufferGeometry().setFromPoints(cablePts), mat.bridgeCable);
  group.add(cable);
  addBridgeLights(cablePts, Math.max(20, Math.floor(len / 8)), group);
  root.add(group);
}
function addBridges() {
  addBridge('brooklyn-bridge', {x:eastEdgeAt(285)-1,z:285}, {x:315,z:230}, [0.30,0.62], 22, 4.6);
  addBridge('manhattan-bridge', {x:eastEdgeAt(325)-1,z:325}, {x:318,z:335}, [0.26,0.70], 24, 4.4);
  addBridge('williamsburg-bridge', {x:eastEdgeAt(465)-1,z:465}, {x:335,z:510}, [0.24,0.76], 25, 4.4);
  addBridge('queensboro-bridge', {x:eastEdgeAt(858)-1,z:858}, {x:360,z:895}, [0.18,0.58,0.83], 21, 5.4);
  addBridge('triborough-rfk-bridge', {x:eastEdgeAt(1335)-1,z:1335}, {x:330,z:1465}, [0.34,0.76], 22, 4.6);
  addBridge('george-washington-bridge', {x:westEdgeAt(2025)+2,z:2025}, {x:-455,z:2040}, [0.19,0.82], 42, 6.8);
  addBridge('henry-hudson-bridge', {x:westEdgeAt(2130)+2,z:2130}, {x:-175,z:2180}, [0.3,0.75], 18, 4.0);
}
addBridges();

function createTrees() {
  const trunkGeo = new THREE.CylinderGeometry(0.18, 0.28, 1.4, 6);
  const crownGeo = new THREE.IcosahedronGeometry(1, 1);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4b2f1c, roughness: 0.9 });
  const crownMat = new THREE.MeshStandardMaterial({ color: 0x1b7134, roughness: 0.96, vertexColors: true });
  const positions = [];
  for (let i = 0; i < 2350; i++) {
    const x = rnd(-48, 44), z = rnd(858, 1258);
    const reservoir = Math.hypot((x - 0) / 34, (z - 1160) / 58) < 1.1;
    const lake = Math.hypot((x + 19) / 22, (z - 1010) / 29) < 1.1;
    if (!reservoir && !lake) positions.push({x, z, s: rnd(0.8, 2.2)});
  }
  for (let i = 0; i < 950; i++) {
    const z = rnd(730, 2020);
    const side = rand() < 0.58 ? -1 : 1;
    const x = side < 0 ? westEdgeAt(z) + rnd(8, 22) : eastEdgeAt(z) - rnd(8, 18);
    if (insideIsland(x, z, 4) && !inCentralPark(x, z)) positions.push({x, z, s: rnd(0.65, 1.45)});
  }
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, positions.length);
  const crowns = new THREE.InstancedMesh(crownGeo, crownMat, positions.length);
  const mx = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  for (let i = 0; i < positions.length; i++) {
    const p = positions[i];
    mx.compose(new THREE.Vector3(p.x, 0.75, p.z), q, new THREE.Vector3(p.s, p.s, p.s));
    trunks.setMatrixAt(i, mx);
    mx.compose(new THREE.Vector3(p.x, 2.0 * p.s, p.z), q, new THREE.Vector3(p.s * 1.5, p.s * 1.05, p.s * 1.5));
    crowns.setMatrixAt(i, mx);
    const c = new THREE.Color(0x1a6d33);
    c.offsetHSL(rnd(-0.05, 0.04), rnd(-0.08, 0.11), rnd(-0.06, 0.08));
    crowns.setColorAt(i, c);
  }
  root.add(trunks, crowns);
}
createTrees();

const cars = [];
let carMesh, headlightMesh;
function createTraffic() {
  const routes = [];
  for (const x of avenueXs) {
    for (let z0 = 80; z0 < 2000; z0 += 220) {
      const z1 = Math.min(2050, z0 + 210);
      const mid = (z0 + z1) / 2;
      if (insideIsland(x, mid, 12) && !inCentralPark(x, mid)) routes.push({a:new THREE.Vector2(x, z0), b:new THREE.Vector2(x, z1), avenue:true});
    }
  }
  for (let z = 96; z < 2020; z += 40) {
    if (z > 850 && z < 1267) continue;
    const w = westEdgeAt(z) + 12, e = eastEdgeAt(z) - 12;
    routes.push({a:new THREE.Vector2(w, z), b:new THREE.Vector2(e, z), avenue:false});
  }
  for (let z = 80; z < 2020; z += 150) {
    const w0 = westEdgeAt(z) + 6, w1 = westEdgeAt(Math.min(z+140, 2020)) + 6;
    const e0 = eastEdgeAt(z) - 6, e1 = eastEdgeAt(Math.min(z+140, 2020)) - 6;
    routes.push({a:new THREE.Vector2(w0,z), b:new THREE.Vector2(w1,Math.min(z+140,2020)), highway:true});
    routes.push({a:new THREE.Vector2(e0,z), b:new THREE.Vector2(e1,Math.min(z+140,2020)), highway:true});
  }
  routes.push({a:new THREE.Vector2(-48,250), b:new THREE.Vector2(42,1500), avenue:true, broadway:true});

  for (const route of routes) {
    const dx = route.b.x - route.a.x, dz = route.b.y - route.a.y;
    const len = Math.hypot(dx, dz);
    const count = Math.max(2, Math.floor(len / (route.highway ? 13 : route.avenue ? 18 : 28)));
    for (let i = 0; i < count; i++) {
      const taxi = rand() < (route.avenue ? 0.48 : 0.28);
      const brake = rand() < 0.14;
      cars.push({ route, t: rand(), speed: rnd(route.highway ? 0.018 : 0.010, route.highway ? 0.045 : 0.030), lane: rnd(-1.5, 1.5), dir: rand() < 0.5 ? 1 : -1, taxi, brake });
    }
  }
  const carGeo = new THREE.BoxGeometry(1.05, 0.45, 2.0);
  carMesh = new THREE.InstancedMesh(carGeo, mat.car, cars.length);
  carMesh.name = 'instanced-moving-taxis-cars-brake-ripples';
  const lightGeo = new THREE.BoxGeometry(0.26, 0.18, 0.52);
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xffe7b2, transparent: true, opacity: 0.75 });
  headlightMesh = new THREE.InstancedMesh(lightGeo, lightMat, cars.length);
  for (let i = 0; i < cars.length; i++) {
    const c = new THREE.Color(cars[i].taxi ? 0xffc400 : cars[i].brake ? 0xff2b20 : pick([0xe9edf0,0x0b1017,0x85919c,0xffffff]));
    carMesh.setColorAt(i, c);
  }
  root.add(carMesh, headlightMesh);
}
createTraffic();

const boats = [];
let boatMesh, wakeMesh;
function createBoats() {
  const routes = [];
  for (let z = -120; z < 2200; z += 380) {
    routes.push({a:new THREE.Vector2(-205 + rnd(-18,18), z), b:new THREE.Vector2(-185 + rnd(-20,20), z + 360), ferry:false, river:'hudson'});
    routes.push({a:new THREE.Vector2(205 + rnd(-20,22), z + 20), b:new THREE.Vector2(225 + rnd(-22,24), z + 360), ferry:false, river:'east'});
  }
  const ferries = [170, 300, 520, 820, 1120, 1450, 1820];
  for (const z of ferries) {
    routes.push({a:new THREE.Vector2(westEdgeAt(z)-105, z+rnd(-15,15)), b:new THREE.Vector2(westEdgeAt(z)-3, z+rnd(-7,7)), ferry:true});
    routes.push({a:new THREE.Vector2(eastEdgeAt(z)+4, z+rnd(-7,7)), b:new THREE.Vector2(eastEdgeAt(z)+115, z+rnd(-18,18)), ferry:true});
  }
  routes.push({a:new THREE.Vector2(-350,-230), b:new THREE.Vector2(210,120), ferry:false, harbor:true});
  routes.push({a:new THREE.Vector2(270,-60), b:new THREE.Vector2(-210,185), ferry:false, harbor:true});

  for (const r of routes) {
    const dx = r.b.x - r.a.x, dz = r.b.y - r.a.y;
    const len = Math.hypot(dx, dz);
    const count = Math.max(2, Math.floor(len / (r.ferry ? 70 : 105)));
    for (let i = 0; i < count; i++) {
      boats.push({ route:r, t:rand(), speed:r.ferry ? rnd(0.006,0.016) : rnd(0.003,0.011), size:r.ferry ? rnd(2.2,4.0) : rnd(1.2,3.2), dir: rand() < 0.5 ? 1 : -1, color: rand() < 0.55 ? 0xf2efe4 : (rand() < 0.5 ? 0x7d2b1e : 0x263f56) });
    }
  }
  const geo = new THREE.BoxGeometry(1.4, 0.75, 5.0);
  boatMesh = new THREE.InstancedMesh(geo, mat.boat, boats.length);
  for (let i = 0; i < boats.length; i++) boatMesh.setColorAt(i, new THREE.Color(boats[i].color));
  const wakeGeo = new THREE.PlaneGeometry(1, 1);
  wakeGeo.rotateX(-Math.PI / 2);
  wakeMesh = new THREE.InstancedMesh(wakeGeo, mat.wake, boats.length);
  root.add(boatMesh, wakeMesh);
}
createBoats();

const helicopters = [];
function createHelicopters() {
  const group = new THREE.Group();
  group.name = 'shoreline-helicopters';
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1b1d22, roughness: 0.4, metalness: 0.25 });
  const rotorMat = new THREE.MeshBasicMaterial({ color: 0xe7edf3, transparent: true, opacity: 0.48, depthWrite: false });
  for (let i = 0; i < 9; i++) {
    const h = new THREE.Group();
    addBox(h, 0, 0, 0, 2.2, 0.7, 5.0, bodyMat, 0);
    addBox(h, 0, 0.8, 0, 7.0, 0.05, 0.4, rotorMat, 0);
    addBox(h, 0, 0.8, 0, 0.4, 0.05, 7.0, rotorMat, 0);
    group.add(h);
    helicopters.push({ mesh:h, phase:rand(), radius:rnd(150, 270), height:rnd(70, 115), speed:rnd(0.018,0.042), side:rand() < 0.5 ? -1 : 1 });
  }
  root.add(group);
}
createHelicopters();

let birdPoints;
function createBirdsAndContrails() {
  const birdGeo = new THREE.BufferGeometry();
  const pos = new Float32Array(140 * 3);
  for (let i = 0; i < 140; i++) {
    pos[i*3] = rnd(-65,65);
    pos[i*3+1] = rnd(9,38);
    pos[i*3+2] = rnd(850,1260);
  }
  birdGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  birdPoints = new THREE.Points(birdGeo, new THREE.PointsMaterial({ color:0x161716, size:1.05, transparent:true, opacity:0.75 }));
  birdPoints.name = 'birds-over-central-park';
  root.add(birdPoints);

  const trailMat = new THREE.LineBasicMaterial({ color:0xffffff, transparent:true, opacity:0.28 });
  const trailPts = [new THREE.Vector3(410, 240, 1550), new THREE.Vector3(160, 260, 1280), new THREE.Vector3(-30, 282, 1060)];
  root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(trailPts), trailMat));
  const jet = new THREE.Mesh(new THREE.ConeGeometry(3, 11, 4), new THREE.MeshBasicMaterial({color:0xe7edf3, transparent:true, opacity:0.58}));
  jet.name = 'distant-jet-on-approach';
  jet.rotation.x = Math.PI / 2;
  jet.position.copy(trailPts[0]);
  root.add(jet);
}
createBirdsAndContrails();

const cloudShadows = [];
function createCloudShadows() {
  for (let i = 0; i < 7; i++) {
    const geo = new THREE.CircleGeometry(1, 48);
    geo.scale(rnd(80, 190), rnd(25, 62), 1);
    geo.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geo, mat.cloudShadow);
    mesh.position.set(rnd(-150, 160), 0.125, rnd(100, 2100));
    mesh.rotation.y = rnd(-0.6, 0.6);
    cloudShadows.push({mesh, phase:rand(), speed:rnd(1.5,4.0)});
    root.add(mesh);
  }
}
createCloudShadows();

let steamMeshes = [];
function createSteam() {
  const group = new THREE.Group();
  group.name = 'street-grate-steam-lod';
  const geo = new THREE.CylinderGeometry(0.8, 1.8, 5.5, 12, 1, true);
  for (let i = 0; i < 48; i++) {
    const z = rnd(680, 1120);
    const x = rnd(westEdgeAt(z)+15, eastEdgeAt(z)-15);
    if (inCentralPark(x,z) || !insideIsland(x,z,10)) continue;
    const mesh = new THREE.Mesh(geo, mat.steam.clone());
    mesh.position.set(x, 2.8, z);
    mesh.scale.set(rnd(0.6,1.3), rnd(0.5,1.8), rnd(0.6,1.3));
    mesh.userData.phase = rand() * Math.PI * 2;
    steamMeshes.push(mesh);
    group.add(mesh);
  }
  root.add(group);
}
createSteam();

const nearDetail = new THREE.Group();
nearDetail.name = 'bespoke-near-camera-detailed-blocks';
root.add(nearDetail);
let lastDetailCenter = new THREE.Vector3(9999, 0, 9999);
function disposeGroup(group) {
  while (group.children.length) {
    const obj = group.children.pop();
    obj.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material && !Object.values(mat).includes(child.material)) {
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose && m.dispose());
        else child.material.dispose && child.material.dispose();
      }
    });
  }
}
function rebuildNearDetail() {
  const c = controls.target;
  if (camera.position.y > 125) {
    if (nearDetail.children.length) disposeGroup(nearDetail);
    return;
  }
  if (lastDetailCenter.distanceTo(c) < 34 && nearDetail.children.length) return;
  lastDetailCenter.copy(c);
  disposeGroup(nearDetail);
  const candidates = [];
  for (const b of buildingData) {
    const d2 = (b.x - c.x) * (b.x - c.x) + (b.z - c.z) * (b.z - c.z);
    if (d2 < 85 * 85 && b.h > 3) candidates.push({b, d2});
  }
  candidates.sort((a,b) => a.d2 - b.d2);
  const corniceMat = new THREE.MeshStandardMaterial({ color:0xdec8a5, roughness:0.72 });
  const fireMat = new THREE.MeshStandardMaterial({ color:0x1b2025, roughness:0.52, metalness:0.2 });
  const awningMats = [0x3f6e9e, 0x9a2e27, 0x2e7946, 0xc5973b].map(hex => new THREE.MeshStandardMaterial({ color:hex, roughness:0.78 }));
  const ventMat = mat.hvac;
  const max = Math.min(candidates.length, 90);
  for (let i = 0; i < max; i++) {
    const b = candidates[i].b;
    addBox(nearDetail, b.x, b.h + 0.03, b.z, b.w * 1.04, 0.28, b.d * 1.04, corniceMat, b.rot, 'near-cornice');
    if (hash01(b.x * 9, b.z * 5) > 0.36 && b.h > 5) {
      const side = hash01(b.x, b.z) > 0.5 ? 1 : -1;
      const levels = Math.min(9, Math.floor(b.h / 2.2));
      for (let j = 1; j < levels; j++) {
        const yy = 1.6 + j * (b.h - 2.4) / levels;
        addBox(nearDetail, b.x + side * (b.w * 0.5 + 0.18), yy, b.z + rnd(-b.d*0.22,b.d*0.22), 0.22, 0.09, Math.min(4.5,b.d*0.38), fireMat, b.rot, 'fire-escape-balcony');
        addBox(nearDetail, b.x + side * (b.w * 0.5 + 0.25), yy + 0.45, b.z, 0.12, 0.9, 0.12, fireMat, b.rot, 'fire-escape-ladder');
      }
    }
    if (b.h < 16) {
      const count = Math.max(1, Math.floor(b.w / 5));
      for (let j = 0; j < count; j++) {
        const xx = b.x - b.w * 0.35 + j * b.w * 0.7 / Math.max(1, count - 1);
        addBox(nearDetail, xx, 1.1, b.z - b.d * 0.52, Math.min(3.5, b.w/count), 0.45, 0.7, pick(awningMats), b.rot, 'street-awning');
      }
    }
    if (hash01(b.x - 7, b.z + 3) > 0.42) {
      for (let j = 0; j < rint(1,3); j++) addBox(nearDetail, b.x + rnd(-b.w*.28,b.w*.28), b.h + 0.08, b.z + rnd(-b.d*.28,b.d*.28), rnd(.6,1.8), rnd(.4,1.1), rnd(.6,1.8), ventMat, rnd(0, Math.PI), 'near-hvac');
    }
  }

  const streetMat = new THREE.MeshBasicMaterial({ color: 0xffd86e, transparent:true, opacity:0.34 });
  for (let i = 0; i < 18; i++) {
    const z = c.z + rnd(-55,55), x = c.x + rnd(-55,55);
    if (!insideIsland(x,z,8) || inCentralPark(x,z)) continue;
    addBox(nearDetail, x, 0.08, z, 0.7, 0.035, 3.0, streetMat, rnd(0, Math.PI), 'implied-walk-light-pulse');
  }
}

function addTransitLines() {
  const lineMat = new THREE.LineBasicMaterial({ color: 0xb7b0a5, transparent: true, opacity: 0.25 });
  const elevated = [
    [new THREE.Vector3(-80, 8, 1360), new THREE.Vector3(-70, 8, 1540), new THREE.Vector3(-55, 10, 1750), new THREE.Vector3(-42, 12, 1980)],
    [new THREE.Vector3(95, 7, 80), new THREE.Vector3(105, 7, 360), new THREE.Vector3(111, 8, 720), new THREE.Vector3(108, 9, 1300)]
  ];
  for (const pts of elevated) root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat));
}
addTransitLines();

const presets = {
  hero: { pos:[-1450,1120,-850], target:[-8,0,1065], fov:42 },
  downtown: { pos:[-330,250,30], target:[-30,15,245], fov:47 },
  midtown: { pos:[-95,82,690], target:[7,18,920], fov:52 },
  park: { pos:[-170,310,760], target:[-2,0,1075], fov:44 },
  bridges: { pos:[280,185,255], target:[58,18,515], fov:48 },
  gwb: { pos:[-420,210,2130], target:[-20,12,1750], fov:46 }
};
let presetTween = null;
function flyToPreset(name) {
  const p = presets[name];
  if (!p) return;
  presetTween = {
    t: 0,
    fromPos: camera.position.clone(),
    fromTarget: controls.target.clone(),
    fromFov: camera.fov,
    toPos: new THREE.Vector3(...p.pos),
    toTarget: new THREE.Vector3(...p.target),
    toFov: p.fov
  };
}

document.querySelectorAll('[data-preset]').forEach(btn => btn.addEventListener('click', () => flyToPreset(btn.dataset.preset)));
document.getElementById('photoMode').addEventListener('click', () => document.body.classList.toggle('photo'));
document.addEventListener('keydown', (e) => {
  if (e.key === 'r' || e.key === 'R') flyToPreset('hero');
  if (e.key === 'p' || e.key === 'P') document.body.classList.toggle('photo');
});

const lightMode = document.getElementById('lightMode');
let duskStart = -1000;
function setLightMode(mode) {
  if (mode === 'golden') {
    sharedUniforms.uMode.value = 0;
    sharedUniforms.uDusk.value = 0;
    sharedUniforms.uDuskWave.value = 0;
    sharedUniforms.uGlitter.value = 1.0;
    scene.background.setHex(0x8eb5da);
    scene.fog.color.setHex(0xbfd0df);
    scene.fog.density = 0.00044;
    sun.color.setHex(0xffbc6d);
    sun.intensity = 3.4;
    sun.position.set(-1180, 620, -380);
    hemi.intensity = 1.25;
    fill.intensity = 0.52;
    renderer.toneMappingExposure = 1.08;
  } else if (mode === 'noon') {
    sharedUniforms.uMode.value = 1;
    sharedUniforms.uDusk.value = 0;
    sharedUniforms.uDuskWave.value = 0;
    sharedUniforms.uGlitter.value = 0.42;
    scene.background.setHex(0xb9d8f5);
    scene.fog.color.setHex(0xd5e5f1);
    scene.fog.density = 0.00032;
    sun.color.setHex(0xffffff);
    sun.intensity = 2.35;
    sun.position.set(-350, 1150, 180);
    hemi.intensity = 1.55;
    fill.intensity = 0.38;
    renderer.toneMappingExposure = 1.02;
  } else {
    sharedUniforms.uMode.value = 2;
    sharedUniforms.uDusk.value = 1;
    sharedUniforms.uGlitter.value = 0.62;
    duskStart = clock.elapsedTime;
    scene.background.setHex(0x253653);
    scene.fog.color.setHex(0x38445b);
    scene.fog.density = 0.00053;
    sun.color.setHex(0xff8a4e);
    sun.intensity = 1.2;
    sun.position.set(-1220, 260, -520);
    hemi.intensity = 0.72;
    fill.intensity = 0.32;
    renderer.toneMappingExposure = 1.18;
  }
}
lightMode.addEventListener('change', () => setLightMode(lightMode.value));

const quality = document.getElementById('quality');
const trafficSlider = document.getElementById('trafficDensity');
const riverSlider = document.getElementById('riverDensity');
let qualityMult = 1;
function applyQuality() {
  const q = quality.value;
  qualityMult = q === 'high' ? 1 : q === 'medium' ? 0.68 : 0.42;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q === 'low' ? 1.15 : 2));
  mat.neighbor.opacity = q === 'low' ? 0.22 : 0.36;
  if (roofLOD.hvac) roofLOD.hvac.visible = q !== 'low';
  if (roofLOD.tanks) roofLOD.tanks.visible = true;
}
quality.addEventListener('change', applyQuality);
applyQuality();

const tmpMatrix = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpS = new THREE.Vector3(1,1,1);
const tmpV = new THREE.Vector3();
const yAxis = new THREE.Vector3(0,1,0);
function updateCars(t) {
  const density = parseFloat(trafficSlider.value) * qualityMult;
  const active = Math.floor(cars.length * density);
  carMesh.count = active;
  headlightMesh.count = active;
  for (let i = 0; i < active; i++) {
    const c = cars[i];
    const a = c.route.a, b = c.route.b;
    const dx = b.x - a.x, dz = b.y - a.y;
    const len = Math.hypot(dx, dz) || 1;
    let k = (c.t + t * c.speed * c.dir) % 1;
    if (k < 0) k += 1;
    const x = lerp(a.x, b.x, k);
    const z = lerp(a.y, b.y, k);
    const nx = -dz / len * c.lane;
    const nz = dx / len * c.lane;
    const angle = Math.atan2(dx * c.dir, dz * c.dir);
    tmpQ.setFromAxisAngle(yAxis, angle);
    tmpS.set(c.route.highway ? 1.18 : 0.95, 1, c.route.highway ? 1.35 : 1.0);
    tmpMatrix.compose(tmpV.set(x + nx, 0.43, z + nz), tmpQ, tmpS);
    carMesh.setMatrixAt(i, tmpMatrix);
    const headOffset = c.dir > 0 ? 1.25 : -1.25;
    const hx = x + nx + Math.sin(angle) * 0.62 + Math.sin(angle) * headOffset;
    const hz = z + nz + Math.cos(angle) * 0.62 + Math.cos(angle) * headOffset;
    tmpMatrix.compose(tmpV.set(hx, 0.62, hz), tmpQ, tmpS.set(1,1,1));
    headlightMesh.setMatrixAt(i, tmpMatrix);
  }
  carMesh.instanceMatrix.needsUpdate = true;
  headlightMesh.instanceMatrix.needsUpdate = true;
}
function updateBoats(t) {
  const density = parseFloat(riverSlider.value) * qualityMult;
  const active = Math.floor(boats.length * density);
  boatMesh.count = active;
  wakeMesh.count = active;
  for (let i = 0; i < active; i++) {
    const b = boats[i];
    const a = b.route.a, c = b.route.b;
    const dx = c.x - a.x, dz = c.y - a.y;
    const len = Math.hypot(dx, dz) || 1;
    let k = (b.t + t * b.speed * b.dir) % 1;
    if (k < 0) k += 1;
    const x = lerp(a.x, c.x, k);
    const z = lerp(a.y, c.y, k);
    const angle = Math.atan2(dx * b.dir, dz * b.dir);
    tmpQ.setFromAxisAngle(yAxis, angle);
    tmpS.set(b.size * 0.8, b.size * 0.45, b.size * (b.route.ferry ? 2.3 : 1.55));
    tmpMatrix.compose(tmpV.set(x, 0.38, z), tmpQ, tmpS);
    boatMesh.setMatrixAt(i, tmpMatrix);
    const back = -b.dir * b.size * 5.0;
    const wx = x + Math.sin(angle) * back;
    const wz = z + Math.cos(angle) * back;
    tmpS.set(b.size * 2.6, 1, b.size * 9.5);
    tmpMatrix.compose(tmpV.set(wx, 0.025, wz), tmpQ, tmpS);
    wakeMesh.setMatrixAt(i, tmpMatrix);
  }
  boatMesh.instanceMatrix.needsUpdate = true;
  wakeMesh.instanceMatrix.needsUpdate = true;
}
function updateHelicopters(t) {
  for (const h of helicopters) {
    const z = ((h.phase + t * h.speed * 0.035) % 1) * MANHATTAN_LENGTH;
    const edge = h.side < 0 ? westEdgeAt(z) - 65 : eastEdgeAt(z) + 62;
    h.mesh.position.set(edge + Math.sin(t * h.speed + h.phase * 10) * 22, h.height + Math.sin(t * 1.4 + h.phase) * 6, z);
    h.mesh.rotation.y = h.side < 0 ? Math.PI : 0;
    h.mesh.children[1].rotation.y = t * 28;
    h.mesh.children[2].rotation.y = -t * 28;
  }
}
function updateBirds(t) {
  if (!birdPoints) return;
  const pos = birdPoints.geometry.attributes.position.array;
  for (let i = 0; i < pos.length / 3; i++) {
    const phase = i * 0.37;
    pos[i*3] += Math.sin(t * 0.7 + phase) * 0.035;
    pos[i*3+1] += Math.sin(t * 2.0 + phase) * 0.018;
    pos[i*3+2] += Math.cos(t * 0.52 + phase) * 0.025;
  }
  birdPoints.geometry.attributes.position.needsUpdate = true;
}
function updateClouds(t) {
  for (const c of cloudShadows) {
    c.mesh.position.x += 0.018 * c.speed;
    c.mesh.position.z += 0.006 * c.speed;
    if (c.mesh.position.x > 260) c.mesh.position.x = -260;
    if (c.mesh.position.z > 2210) c.mesh.position.z = -20;
  }
}
function updateSteam(t) {
  for (const s of steamMeshes) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 1.6 + s.userData.phase);
    s.material.opacity = (camera.position.y < 135 ? 0.08 + pulse * 0.18 : 0.0);
    s.scale.y = 0.8 + pulse * 0.9;
    s.rotation.y += 0.002;
  }
}
function updatePresetTween(dt) {
  if (!presetTween) return;
  presetTween.t = Math.min(1, presetTween.t + dt * 0.72);
  const k = smoothstep(0, 1, presetTween.t);
  camera.position.lerpVectors(presetTween.fromPos, presetTween.toPos, k);
  controls.target.lerpVectors(presetTween.fromTarget, presetTween.toTarget, k);
  camera.fov = lerp(presetTween.fromFov, presetTween.toFov, k);
  camera.updateProjectionMatrix();
  if (presetTween.t >= 1) presetTween = null;
}
function updateLOD() {
  const alt = camera.position.y;
  const dist = camera.position.distanceTo(controls.target);
  if (farMassing && farMassing.material) {
    const fade = smoothstep(260, 1250, Math.max(alt, dist * 0.35));
    farMassing.material.opacity = 0.045 + fade * 0.14;
    farMassing.visible = fade > 0.02;
  }
  const roofFade = smoothstep(620, 120, alt);
  roofLOD.penthouses.visible = alt < 850;
  roofLOD.tanks.visible = alt < 720;
  roofLOD.legs.visible = alt < 450;
  roofLOD.hvac.visible = alt < 320 && quality.value !== 'low';
  mat.shadow.opacity = lightMode.value === 'noon' ? 0.025 : lightMode.value === 'dusk' ? 0.035 : 0.075;
  mat.bridgeLight.opacity = sharedUniforms.uDusk.value * 0.95;
  for (const lm of bridgeLightMeshes) lm.material.opacity = mat.bridgeLight.opacity;
  if (meter) {
    const kmAlt = (alt * 10 / 1000).toFixed(2);
    const kmZ = (controls.target.z * 10 / 1000).toFixed(1);
    const lod = alt > 700 ? 'island' : alt > 190 ? 'district' : alt > 80 ? 'neighborhood' : 'street';
    meter.textContent = `LOD ${lod} | camera ${kmAlt} km up | northing ${kmZ} km | ${buildingData.length.toLocaleString()} procedural buildings`;
  }
  rebuildNearDetail();
}

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  const t = clock.elapsedTime;
  sharedUniforms.uTime.value = t;
  if (lightMode.value === 'dusk') sharedUniforms.uDuskWave.value = Math.min(1.36, (t - duskStart) / 10.0);
  updatePresetTween(dt);
  controls.update();
  updateCars(t);
  updateBoats(t);
  updateHelicopters(t);
  updateBirds(t);
  updateClouds(t);
  updateSteam(t);
  updateLOD();
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.value === 'low' ? 1.15 : 2));
});

setLightMode('golden');
</script>
</body>
</html>
