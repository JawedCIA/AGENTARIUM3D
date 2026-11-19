/* The 3D floor. Everything is built in code from boxes, spheres and flat planes.
   Floor coordinates follow the original drawing: fx runs along the back wall, fz from the
   back wall toward the viewer, and "up" is height. In three.js that is (x, y, z) = (fx, up, fz). */

import * as THREE from "./vendor/three-0.187.0/three.module.min.js";
import { OrbitControls } from "./vendor/three-0.187.0/OrbitControls.min.js";
import { FLOOR, PLANTS } from "./data.js";

const W = FLOOR.W, D = FLOOR.D, WALL = FLOOR.WALL;

const NIGHT = {
  floor: "#131E3D", floorSide: "#0A1226", wallA: "#17233F", wallB: "#131D38", trim: "#2A3D6B",
  desk: "#DCE3F0", leg: "#6B7896", bezel: "#27365A", chair: "#2C3B68", keys: "#B4BFD6",
  head: "#E8EDF7", visor: "#111C36", limb: "#1D2848", pot: "#C9D2E4", leaf: "#2FA27E",
  body: { build: "#7F8CFF", gate: "#F5A623", gtm: "#3FD0A8", founder: "#F4F6FB" },
  screen: { idle: "#1D2C4E", working: "#9CC8FF", blocked: "#FF8F85", done: "#3B5488", skipped: "#16213D" },
  lamp: { idle: "#647290", working: "#5EE2A0", blocked: "#FF6B5E", done: "#8FB4FF", skipped: "#3A4565" },
  zoneLine: { delivery: "#3A4E86", gtm: "#23705F", command: "#5A6078" },
  zoneFill: { delivery: "#7F8CFF", gtm: "#3FD0A8", command: "#E8EDF7" },
  zoneText: { delivery: "#8FA0FF", gtm: "#3FD0A8", command: "#9AA8C4" },
  ok: "#5EE2A0", stop: "#FF6B5E", ice: "#E8EDF7", doneBlue: "#8FB4FF"
};

Object.assign(NIGHT, {
  tileLine: "#1A2850", word: ["#6078C2", "#5169AC"], noteMix: 0.4, panel: "#B9C4DA", mug: "#E8EDF7",
  rug: "#1C2B58", sofa: "#3A4D8A", sofaBack: "#32437A", cushion: "#4A5FA3", book: "#7F8CFF",
  skipBody: "#3A4668", skipHead: "#5C6787", itemCore: "#FFFFFF", glowTint: "#FFFFFF",
  sky: ["#101D45", "#22387A", "#3A4FA0"], towers: ["#0C1634", "#101C40"], lit: ["#F5C76A", "#9CC8FF"], litChance: 0.72,
  hemi: [0xC9D6FF, 0x0B1226, 1.25], sun: [0xFFF4E4, 2.3], fill: [0x7F8CFF, 0.55],
  skin: ["#F2C9A5", "#E0A77E", "#C68656", "#9A6239", "#70452A"],
  hair: ["#1F1A1C", "#3B2A22", "#5A3A26", "#2A2C3A", "#8A5A34"]
});

/* "day" look: the same floor in daylight, with people-shaped figures, wood desks and pale walls.
   Role colours (shirts), state colours and every piece of content stay the same. */
const DAY = Object.assign({}, NIGHT, {
  floor: "#EEEAF5", floorSide: "#CDC6DF", wallA: "#F6F3FA", wallB: "#E8E3F1", trim: "#D2CBE2",
  desk: "#E3B981", leg: "#A9AEC0", bezel: "#1D2132", chair: "#242839", keys: "#F3F4F8",
  head: "#E9B58E", visor: "#1D2132", limb: "#2B3252", pot: "#FFFFFF", leaf: "#4CA56C",
  body: { build: "#6F7DFF", gate: "#F5A623", gtm: "#35C79F", founder: "#FFFFFF" },
  zoneLine: { delivery: "#8F9BF7", gtm: "#4CC7A6", command: "#A7ADC2" },
  zoneText: { delivery: "#5564E0", gtm: "#17997A", command: "#6A7290" },
  ok: "#1FB573", stop: "#F0503F", ice: "#2B3252",
  tileLine: "#DFD9EB", word: ["#A9A4C6", "#B7B2CF"], noteMix: 0.08, panel: "#CFA36A", mug: "#FFFFFF",
  rug: "#DAD4EE", sofa: "#6C79EA", sofaBack: "#5B68D8", cushion: "#8B96F6", book: "#F5A623",
  skipBody: "#BDBFCE", skipHead: "#D9CFC9", itemCore: "#F5A623", glowTint: "#FFC766",
  sky: ["#BFD6FF", "#DCE8FF", "#F3F6FF"], towers: ["#C4CCE8", "#B4BEE0"], lit: ["#E6ECFB", "#D5DEF6"], litChance: 0.6,
  hemi: [0xFFFFFF, 0xCFC8E2, 1.55], sun: [0xFFF2DE, 2.5], fill: [0xC9D1FF, 0.45]
});

const SEAT_ARM = 1.2, SEAT_LEG = Math.PI / 2, WALK_SPEED = 3.4, AISLE = 6.9;
/* Clear lanes (fx values) for crossing the second delivery row and the go-to-market row. */
const LANES_DELIVERY = [0.6, 3.5, 6.2, 8.9, 11.6, 14.3, 17.0, 19.7, 22.4, 25.1, 28.0];
const LANES_GTM = [0.6, 4.4, 8.0, 10.7, 13.4, 16.1, 18.9, 22.3, 26.2];

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
function bounceOut(t) {
  const n = 7.5625, d = 2.75;
  if (t < 1 / d) return n * t * t;
  if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
  if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
  return n * (t -= 2.625 / d) * t + 0.984375;
}

export function createScene(ctx) {
  const { viewEl, labelsEl, agents, agentById, zoneById, events, reduce } = ctx;
  const ZONES = ctx.zones, TEXT = ctx.text;
  const day = ctx.look === "day";
  /* Figure style is separate from the palette: people or robots, in daylight or in the dark. */
  const people = ctx.figures === "people";
  const COL = day ? DAY : NIGHT;

  /* Ask for the context ourselves so a machine without WebGL fails quietly here,
     before three.js has a chance to log anything. */
  const canvas = document.createElement("canvas");
  canvas.className = "mf3-canvas";
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", TEXT.canvasLabel);
  const gl = canvas.getContext("webgl2", { antialias: true, alpha: true, powerPreference: "high-performance" });
  if (!gl) throw new Error("no webgl2");

  const trash = new Set();
  const keep = (x) => { trash.add(x); return x; };
  const offs = [];
  const on = (target, type, fn, o) => { target.addEventListener(type, fn, o); offs.push(() => target.removeEventListener(type, fn, o)); };
  let destroyed = false;

  const renderer = new THREE.WebGLRenderer({ canvas, context: gl, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const smallScreen = Math.min(window.innerWidth, window.innerHeight) < 600;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 2, 0.5, 220);

  /* ---------- lights ---------- */
  scene.add(new THREE.HemisphereLight(COL.hemi[0], COL.hemi[1], COL.hemi[2]));
  const sun = new THREE.DirectionalLight(COL.sun[0], COL.sun[1]);
  sun.position.set(W / 2 + 8, 20, D / 2 + 10);
  sun.target.position.set(W / 2, 0, D / 2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(smallScreen ? 1024 : 2048, smallScreen ? 1024 : 2048);
  const sc = sun.shadow.camera;
  sc.left = -19; sc.right = 19; sc.top = 13; sc.bottom = -13; sc.near = 2; sc.far = 50;
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03; sun.shadow.radius = 2;
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight(COL.fill[0], COL.fill[1]);
  fill.position.set(-8, 9, 14);
  scene.add(fill);
  const alarm = new THREE.PointLight(0xFF5A4D, 0, 11, 1.6);
  alarm.position.set(0, 2.6, 0);
  scene.add(alarm);

  /* ---------- shared geometry and materials ---------- */
  const gBox = keep(new THREE.BoxGeometry(1, 1, 1));
  const gPlane = keep(new THREE.PlaneGeometry(1, 1));
  const gHead = keep(new THREE.SphereGeometry(0.2, 24, 16));
  const gVisor = keep(new THREE.SphereGeometry(0.208, 20, 6, Math.PI * 1.5 - 1.05, 2.1, 1.18, 0.52));
  const gTorso = keep(new THREE.CylinderGeometry(0.185, 0.23, 0.6, 16));
  const gNeck = keep(new THREE.CylinderGeometry(0.07, 0.08, 0.1, 10));
  const gArm = keep(new THREE.CapsuleGeometry(0.052, 0.3, 4, 10));
  const gLimb = keep(new THREE.CapsuleGeometry(0.068, 0.16, 4, 10));
  const gTri = keep((function () {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute([-0.1, 0, -0.16, -0.1, 0, 0.16, 0.14, 0, 0], 3));
    return g;
  })());
  const gLamp = keep(new THREE.SphereGeometry(0.06, 10, 8));
  const gLeaf = keep(new THREE.IcosahedronGeometry(1, 1));
  const lambert = (color, extra) => keep(new THREE.MeshLambertMaterial(Object.assign({ color }, extra)));
  const basic = (color, extra) => keep(new THREE.MeshBasicMaterial(Object.assign({ color }, extra)));

  const mBody = {
    build: lambert(COL.body.build), gate: lambert(COL.body.gate), gtm: lambert(COL.body.gtm),
    founder: lambert(COL.body.founder), skipped: lambert(COL.skipBody, { transparent: true, opacity: 0.55 })
  };
  const mHead = lambert(COL.head), mHeadDim = lambert(COL.skipHead, { transparent: true, opacity: 0.6 });
  const mSkin = people ? COL.skin.map((c) => lambert(c)) : [], mHair = people ? COL.hair.map((c) => lambert(c)) : [];
  const gHair = keep(new THREE.SphereGeometry(0.212, 20, 10, 0, Math.PI * 2, 0, 1.55)), gBun = keep(new THREE.SphereGeometry(0.085, 12, 10));
  const mVisor = lambert(COL.visor), mLimb = lambert(COL.limb);
  const mScreen = {}, mLamp = {};
  /* What each monitor shows: a few lines of "work" on a background that carries the state colour. */
  function screenTexture(state) {
    const cv = document.createElement("canvas"); cv.width = 128; cv.height = 88;
    const c2 = cv.getContext("2d");
    const ink = { idle: "#2A3C68", working: "#4F7FD0", blocked: "#B8463C", done: "#5C7BB8", skipped: "#16213D" }[state];
    c2.fillStyle = COL.screen[state]; c2.fillRect(0, 0, 128, 88);
    c2.fillStyle = ink;
    [[10, 60], [10, 92], [22, 70], [22, 48], [10, 84], [22, 56], [10, 40]].forEach((l, i) => { c2.fillRect(l[0], 10 + i * 10, l[1], 4); });
    if (state === "working") { c2.fillStyle = "#FFFFFF"; c2.fillRect(22, 30, 38, 4); c2.fillRect(10, 50, 22, 4); c2.fillStyle = "#2E9E6E"; c2.fillRect(70, 60, 30, 4); }
    if (state === "blocked") { c2.fillStyle = "#FFFFFF"; c2.fillRect(34, 32, 60, 24); c2.fillStyle = "#C9382C"; c2.fillRect(60, 36, 8, 10); c2.fillRect(60, 49, 8, 4); }
    if (state === "done") { c2.strokeStyle = "#BFD4FF"; c2.lineWidth = 6; c2.beginPath(); c2.moveTo(84, 46); c2.lineTo(96, 58); c2.lineTo(116, 32); c2.stroke(); }
    const t = keep(new THREE.CanvasTexture(cv)); t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  Object.keys(COL.screen).forEach((k) => { mScreen[k] = basic("#FFFFFF", { map: screenTexture(k) }); mLamp[k] = basic(COL.lamp[k]); });
  /* People-shaped agents wear a status badge on the chest (and one between the shoulders, because
     from the usual view they are seen from behind). It marks them as AI agents; the human lead has none. */
  const gBadge = keep(new THREE.CylinderGeometry(0.066, 0.066, 0.03, 20)), gRim = keep(new THREE.CylinderGeometry(0.092, 0.092, 0.018, 24));
  const mRim = basic("#FFFFFF");
  const haloTex = (function () {
    const cv = document.createElement("canvas"); cv.width = cv.height = 64;
    const c2 = cv.getContext("2d"), gr = c2.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(255,255,255,.9)"); gr.addColorStop(0.4, "rgba(255,255,255,.3)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    c2.fillStyle = gr; c2.fillRect(0, 0, 64, 64);
    return keep(new THREE.CanvasTexture(cv));
  })();
  const mHalo = {};
  ["working", "blocked", "done"].forEach((k) => {
    mHalo[k] = keep(new THREE.SpriteMaterial({ map: haloTex, color: COL.lamp[k], transparent: true, opacity: 1, depthWrite: false, blending: day ? THREE.NormalBlending : THREE.AdditiveBlending }));
  });

  /* Every box that never moves goes into one instanced mesh: one draw call for the lot. */
  const statics = [];
  /* Same argument order as the original drawing's box(): x, depth, up, width, depth size, height. */
  function sbox(fx, fz, up, w, d, hgt, color) { statics.push([fx + w / 2, up + hgt / 2, fz + d / 2, w, hgt, d, color]); }
  function mesh(geo, mat, x, y, z, sx, sy, sz, parent) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    if (sx !== undefined) m.scale.set(sx, sy, sz);
    (parent || scene).add(m);
    return m;
  }

  /* ---------- floor and walls ---------- */
  const tileTex = (function () {
    const cv = document.createElement("canvas"); cv.width = cv.height = 256;
    const c2 = cv.getContext("2d");
    c2.fillStyle = COL.floor; c2.fillRect(0, 0, 256, 256);
    c2.strokeStyle = COL.tileLine; c2.lineWidth = 3; c2.strokeRect(0, 0, 256, 256);
    const t = keep(new THREE.CanvasTexture(cv));
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(W / 1.3, D / 1.3); t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return t;
  })();
  const floor = mesh(gBox, [lambert(COL.floorSide), lambert(COL.floorSide), lambert("#FFFFFF", { map: tileTex }), lambert(COL.floorSide), lambert(COL.floorSide), lambert(COL.floorSide)], W / 2, -0.2, D / 2, W, 0.4, D);
  floor.receiveShadow = true;
  sbox(-0.3, -0.3, -0.4, W + 0.3, 0.3, WALL + 0.4, COL.wallA);
  sbox(-0.3, 0, -0.4, 0.3, D, WALL + 0.4, COL.wallB);
  sbox(-0.3, -0.3, WALL, W + 0.3, 0.3, 0.06, COL.trim);
  sbox(-0.3, 0, WALL, 0.3, D, 0.06, COL.trim);
  sbox(0, 0, 0, W, 0.05, 0.14, COL.trim);
  sbox(0, 0, 0, 0.05, D, 0.14, COL.trim);

  /* windows on the left wall */
  const skyTex = (function () {
    const cv = document.createElement("canvas"); cv.width = 256; cv.height = 236;
    const c2 = cv.getContext("2d"), gr = c2.createLinearGradient(0, 0, 0, 236);
    gr.addColorStop(0, COL.sky[0]); gr.addColorStop(0.6, COL.sky[1]); gr.addColorStop(1, COL.sky[2]);
    c2.fillStyle = gr; c2.fillRect(0, 0, 256, 236);
    let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let x = 0; x < 256;) {
      const bw = 18 + rnd() * 26, bh = 50 + rnd() * 120;
      c2.fillStyle = rnd() > 0.5 ? COL.towers[0] : COL.towers[1]; c2.fillRect(x, 236 - bh, bw, bh);
      for (let wy = 236 - bh + 8; wy < 228; wy += 10) for (let wx = x + 4; wx < x + bw - 5; wx += 8) {
        if (rnd() > COL.litChance) { c2.fillStyle = rnd() > 0.3 ? COL.lit[0] : COL.lit[1]; c2.fillRect(wx, wy, 3, 4); }
      }
      x += bw + 2;
    }
    const t = keep(new THREE.CanvasTexture(cv)); t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const mPane = basic("#FFFFFF", { map: skyTex });
  [1.6, 5, 8.4].forEach((z0) => {
    mesh(gBox, mPane, 0.012, 2.35, z0 + 1.25, 0.02, 2.3, 2.5);
    sbox(0, z0 - 0.06, 1.14, 0.05, 2.62, 0.06, COL.trim); sbox(0, z0 - 0.06, 3.5, 0.05, 2.62, 0.06, COL.trim);
    sbox(0, z0 - 0.06, 1.14, 0.05, 0.06, 2.42, COL.trim); sbox(0, z0 + 2.5, 1.14, 0.05, 0.06, 2.42, COL.trim);
    sbox(0, z0 + 1.23, 1.2, 0.04, 0.04, 2.3, COL.trim); sbox(0, z0, 2.5, 0.04, 2.5, 0.04, COL.trim);
  });

  /* ---------- text drawn to canvases (wall wordmark, zone names, pipeline board) ---------- */
  const redraws = [];
  function textPlane(w, hgt, px, draw, parent) {
    const cv = document.createElement("canvas");
    cv.width = Math.round(w * px); cv.height = Math.round(hgt * px);
    const c2 = cv.getContext("2d");
    const tex = keep(new THREE.CanvasTexture(cv));
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const mat = keep(new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    const m = mesh(gPlane, mat, 0, 0, 0, w, hgt, 1, parent);
    const redraw = () => { c2.clearRect(0, 0, cv.width, cv.height); draw(c2, cv.width, cv.height); tex.needsUpdate = true; };
    redraws.push(redraw); redraw();
    return { mesh: m, redraw };
  }
  const spaced = (c2, px) => { if ("letterSpacing" in c2) c2.letterSpacing = px + "px"; };
  const F_DISPLAY = '"Space Grotesk", system-ui, sans-serif', F_MONO = '"IBM Plex Mono", ui-monospace, monospace';

  const word = textPlane(6.4, 1.6, 160, (c2) => {
    c2.fillStyle = COL.word[0]; c2.font = "600 84px " + F_DISPLAY; spaced(c2, 7);
    /* shrink long names so they always fit the wall panel */
    let size = 84;
    while (size > 40 && c2.measureText(TEXT.wallName).width > 1000) { size -= 4; c2.font = "600 " + size + "px " + F_DISPLAY; }
    c2.fillText(TEXT.wallName, 0, 110);
    c2.fillStyle = COL.word[1]; c2.font = "500 34px " + F_MONO; spaced(c2, 4);
    c2.fillText(TEXT.wallLine, 2, 196);
  });
  word.mesh.position.set(2.2 + 3.2, 2.5, 0.02);

  /* pipeline board */
  const BOARD = { x: 10.2, up: 1.0, w: 8.4, h: 2.7 };
  let boardState = { item: "", stage: "", idx: -1, closed: false, halted: false, head: "" };
  sbox(BOARD.x - 0.08, 0, BOARD.up - 0.08, BOARD.w + 0.16, 0.06, BOARD.h + 0.16, "#2B3C68");
  const boardPlane = textPlane(BOARD.w, BOARD.h, 160, (c2, cw, ch) => {
    c2.fillStyle = "#070C1B"; c2.fillRect(0, 0, cw, ch);
    const pad = 62;
    c2.fillStyle = "#647290"; c2.font = "500 34px " + F_MONO; spaced(c2, 4);
    c2.fillText(boardState.head || "PIPELINE", pad, 96);
    c2.fillStyle = "#E8EDF7"; c2.font = "500 52px " + F_MONO; spaced(c2, 1);
    const t = boardState.item;
    c2.fillText(t.length > 34 ? t.slice(0, 33) + "…" : t, pad, 190);
    c2.fillStyle = boardState.halted ? COL.stop : "#9AA8C4"; c2.font = "500 36px " + F_MONO; spaced(c2, 4);
    c2.fillText(boardState.halted ? TEXT.haltLabel.toUpperCase() : boardState.stage, pad, 268);
    const n = ctx.stageOrder.length, gapPx = 22, sw = (cw - pad * 2 - gapPx * (n - 1)) / n;
    for (let i = 0; i < n; i++) {
      const idx = boardState.idx;
      c2.fillStyle = boardState.closed ? COL.doneBlue : idx < 0 ? "#1D2C4E" : i < idx ? COL.doneBlue : i === idx ? (boardState.halted ? COL.stop : COL.ok) : "#1D2C4E";
      c2.beginPath();
      if (c2.roundRect) c2.roundRect(pad + i * (sw + gapPx), ch - 104, sw, 36, 10); else c2.rect(pad + i * (sw + gapPx), ch - 104, sw, 36);
      c2.fill();
    }
  });
  boardPlane.mesh.material.transparent = false; boardPlane.mesh.material.depthWrite = true;
  boardPlane.mesh.position.set(BOARD.x + BOARD.w / 2, BOARD.up + BOARD.h / 2, 0.075);

  /* card wall */
  (function () {
    const cols = ["#7F8CFF", "#F5A623", "#3FD0A8", "#9AA8C4", "#7F8CFF"], wall = new THREE.Color(COL.wallA);
    for (let c = 0; c < 6; c++) for (let r = 0; r < 3; r++) {
      if ((c * 3 + r) % 5 === 4) continue;
      const col = new THREE.Color(cols[(c + r * 2) % cols.length]).lerp(wall, COL.noteMix);
      sbox(20.6 + c * 0.6, 0, 3.5 - 0.46 - r * 0.65, 0.44, 0.03, 0.46, "#" + col.getHexString());
    }
  })();

  /* ---------- zones ---------- */
  function ringGeo(w, d, t) {
    const o = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]];
    const i = [[-w / 2 + t, -d / 2 + t], [w / 2 - t, -d / 2 + t], [w / 2 - t, d / 2 - t], [-w / 2 + t, d / 2 - t]];
    const pos = [], idx = [];
    o.concat(i).forEach((p) => pos.push(p[0], 0, p[1]));
    for (let k = 0; k < 4; k++) { const n = (k + 1) % 4; idx.push(k, 4 + k, n, n, 4 + k, 4 + n); }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    return keep(g);
  }
  const flat = (m) => { m.rotation.x = -Math.PI / 2; return m; };
  const zoneParts = Object.create(null);
  ZONES.forEach((z) => {
    const cx = z.x + z.w / 2, cz = z.y + z.d / 2;
    const fillMat = basic(COL.zoneFill[z.div], { transparent: true, opacity: 0.055, depthWrite: false });
    const lineMat = basic(COL.zoneLine[z.div], { transparent: true, opacity: 1, depthWrite: false, side: THREE.DoubleSide });
    const f = flat(mesh(gPlane, fillMat, cx, 0.012, cz, z.w, z.d, 1));
    const r = mesh(ringGeo(z.w, z.d, 0.06), lineMat, cx, 0.016, cz);
    f.renderOrder = 1; r.renderOrder = 2;
    const name = textPlane(3.4, 0.425, 150, (c2) => {
      c2.fillStyle = COL.zoneText[z.div]; c2.globalAlpha = 0.85;
      c2.font = "500 40px " + F_MONO; spaced(c2, 6.5);
      c2.fillText(z.name.toUpperCase(), 0, 46);
    });
    flat(name.mesh).position.set(z.x + 0.3 + 1.7, 0.02, z.y + z.d - 0.36);
    name.mesh.renderOrder = 3;
    zoneParts[z.id] = { z, fillMat, lineMat, base: new THREE.Color(COL.zoneFill[z.div]), line: new THREE.Color(COL.zoneLine[z.div]) };
  });

  /* arrows in the gaps between neighbouring stations, in pipeline order */
  ctx.stageOrder.forEach((id, i) => {
    const a = zoneById[id], b = zoneById[ctx.stageOrder[i + 1]];
    if (!b || a.y !== b.y || b.x < a.x) return;
    const m = basic(COL.zoneText[a.div], { transparent: true, opacity: 0.75, depthWrite: false, side: THREE.DoubleSide });
    [-0.7, 0, 0.7].forEach((o) => { mesh(gTri, m, (a.x + a.w + b.x) / 2, 0.018, a.y + a.d / 2 + o).renderOrder = 2; });
  });

  /* a small lounge in the open corner, so the floor reads as a place people work in */
  sbox(19.0, 8.5, 0, 3.0, 2.9, 0.02, COL.rug);
  sbox(19.4, 9.0, 0, 2.2, 0.8, 0.36, COL.sofa); sbox(19.4, 9.0, 0.36, 2.2, 0.2, 0.42, COL.sofaBack);
  sbox(19.4, 9.0, 0.36, 0.18, 0.8, 0.2, COL.sofaBack); sbox(21.42, 9.0, 0.36, 0.18, 0.8, 0.2, COL.sofaBack);
  sbox(19.64, 9.24, 0.36, 0.84, 0.52, 0.07, COL.cushion); sbox(20.52, 9.24, 0.36, 0.84, 0.52, 0.07, COL.cushion);
  sbox(20.0, 10.25, 0, 1.0, 0.55, 0.05, COL.leg); sbox(19.95, 10.2, 0.26, 1.1, 0.65, 0.05, COL.desk);
  sbox(20.02, 10.27, 0.05, 0.06, 0.06, 0.21, COL.leg); sbox(20.92, 10.27, 0.05, 0.06, 0.06, 0.21, COL.leg);
  sbox(20.02, 10.72, 0.05, 0.06, 0.06, 0.21, COL.leg); sbox(20.92, 10.72, 0.05, 0.06, 0.06, 0.21, COL.leg);
  sbox(20.3, 10.4, 0.31, 0.3, 0.22, 0.03, COL.book); sbox(20.72, 10.5, 0.31, 0.08, 0.08, 0.1, COL.mug);

  /* ---------- plants ---------- */
  const leafSpots = [];
  PLANTS.forEach((p) => {
    sbox(p[0], p[1], 0, 0.4, 0.4, 0.35, COL.pot);
    [[-0.13, 0.5], [0, 0], [0.13, -0.5]].forEach((l, i) => leafSpots.push([p[0] + 0.2 + l[0], 0.35 + (i === 1 ? 0.5 : 0.4), p[1] + 0.2, l[1], i === 1 ? 0.5 : 0.42]));
  });
  const leaves = new THREE.InstancedMesh(gLeaf, lambert(COL.leaf, { flatShading: true }), leafSpots.length);
  (function () {
    const o = new THREE.Object3D();
    leafSpots.forEach((l, i) => {
      o.position.set(l[0], l[1], l[2]); o.rotation.set(0, i * 1.3, -l[3]); o.scale.set(0.13, l[4], 0.13);
      o.updateMatrix(); leaves.setMatrixAt(i, o.matrix);
    });
  })();
  leaves.castShadow = true;
  scene.add(leaves);

  /* ---------- desks and figures ---------- */
  const padFillGeo = gPlane, padRingGeo = ringGeo(2.2, 2.2, 0.045);
  const actors = Object.create(null), hitBoxes = [];

  agents.forEach((a) => {
    const x = a.x, y = a.y, cx = a.cx, cy = a.cy;
    sbox(x, y + 0.05, 0, 0.07, 0.7, 0.62, COL.leg);
    sbox(x + 1.73, y + 0.05, 0, 0.07, 0.7, 0.62, COL.leg);
    sbox(x, y, 0.62, 1.8, 0.8, 0.08, COL.desk);
    const screens = [];
    [x + 0.3, x + 0.96].forEach((mx) => {
      sbox(mx + 0.23, y + 0.2, 0.7, 0.08, 0.08, 0.1, COL.bezel);
      sbox(mx, y + 0.2, 0.8, 0.54, 0.06, 0.4, COL.bezel);
      screens.push(mesh(gBox, mScreen.idle, mx + 0.27, 1.0, y + 0.264, 0.46, 0.32, 0.01));
    });
    sbox(x + 0.62, y + 0.5, 0.7, 0.56, 0.18, 0.015, COL.keys);
    sbox(x + 1.26, y + 0.52, 0.7, 0.07, 0.11, 0.028, COL.keys);
    sbox(x + 0.12, y + 0.5, 0.7, 0.085, 0.085, 0.1, a.kind === "founder" ? "#F5A623" : COL.mug);
    sbox(x + 0.03, y + 0.02, 0.36, 1.74, 0.04, 0.26, COL.panel);
    sbox(cx - 0.27, cy - 0.03, 0, 0.54, 0.06, 0.05, COL.leg); sbox(cx - 0.03, cy - 0.27, 0, 0.06, 0.54, 0.05, COL.leg);
    sbox(cx - 0.04, cy - 0.04, 0, 0.08, 0.08, 0.38, COL.chair);
    sbox(cx - 0.3, cy - 0.3, 0.38, 0.6, 0.6, 0.08, COL.chair);
    sbox(cx - 0.3, cy + 0.22, 0.44, 0.6, 0.08, 0.44, COL.chair);

    /* pad under the desk: lights up for hover, working and blocked */
    const padFill = basic(COL.ice, { transparent: true, opacity: 0, depthWrite: false });
    const padLine = basic(COL.ice, { transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    const pf = flat(mesh(padFillGeo, padFill, x + 0.9, 0.022, y + 0.95, 2.2, 2.2, 1));
    const pr = mesh(padRingGeo, padLine, x + 0.9, 0.026, y + 0.95);
    pf.renderOrder = 4; pr.renderOrder = 5; pf.visible = pr.visible = false;

    /* figure: faces the monitors (toward the back wall) when its heading is 0 */
    const g = new THREE.Group();
    const bodyMat = mBody[a.kind] || mBody.build;
    const torso = mesh(gTorso, bodyMat, 0, 0.77, 0, 1.08, 1, 0.74, g);
    /* day look: a person with hair and a skin tone, picked by desk order so it never changes between visits */
    const n = agents.indexOf(a);
    const headMat = people ? mSkin[(n * 3 + 1) % mSkin.length] : mHead;
    mesh(gNeck, headMat, 0, 1.1, 0, undefined, undefined, undefined, g);
    const head = mesh(gHead, headMat, 0, 1.31, 0, undefined, undefined, undefined, g);
    let eyes = [], lamp = null;
    const halos = [];
    if (people && a.kind !== "founder") {
      [[0.08, 0.95, -0.15], [0, 0.99, 0.148]].forEach((b) => {
        /* white rim so the light reads on any shirt colour */
        mesh(gRim, mRim, b[0], b[1], b[2], undefined, undefined, undefined, g).rotation.x = Math.PI / 2;
        const badge = mesh(gBadge, mLamp.idle, b[0], b[1], b[2], undefined, undefined, undefined, g);
        badge.rotation.x = Math.PI / 2;
        const halo = new THREE.Sprite(mHalo.working);
        halo.position.set(b[0], b[1], b[2] + (b[2] < 0 ? -0.03 : 0.03)); halo.scale.set(0.5, 0.5, 1); halo.visible = false;
        g.add(halo);
        eyes.push(badge); halos.push(halo);
      });
    }
    if (people) {
      const hairMat = mHair[(n * 2 + 3) % mHair.length], style = n % 3;
      const hair = mesh(gHair, hairMat, 0, 1.318, 0.012, undefined, undefined, undefined, g);
      hair.rotation.x = 0.32; hair.castShadow = true;
      if (style === 0) mesh(gBun, hairMat, 0, 1.47, 0.14, undefined, undefined, undefined, g);
      if (style === 1) mesh(gBox, hairMat, 0, 1.2, 0.15, 0.3, 0.26, 0.1, g);
    } else {
      mesh(gVisor, mVisor, 0, 1.31, 0, undefined, undefined, undefined, g);
      /* the eyes and the antenna lamp carry the status colour */
      eyes = [mesh(gBox, mLamp.idle, -0.065, 1.325, -0.2, 0.045, 0.03, 0.03, g), mesh(gBox, mLamp.idle, 0.065, 1.325, -0.2, 0.045, 0.03, 0.03, g)];
      mesh(gBox, mVisor, 0, 1.57, 0, 0.022, 0.14, 0.022, g);
      lamp = mesh(gLamp, mLamp.idle, 0, 1.67, 0, undefined, undefined, undefined, g);
    }
    const limbs = [], knees = [];
    [-0.27, 0.27].forEach((sx) => {
      const pivot = new THREE.Group();
      pivot.position.set(sx, 1.0, 0);
      mesh(gArm, bodyMat, 0, -0.19, 0, undefined, undefined, undefined, pivot).castShadow = true;
      mesh(gLamp, headMat, 0, -0.4, 0, 0.9, 0.9, 0.9, pivot);
      g.add(pivot); limbs.push(pivot);
    });
    [-0.11, 0.11].forEach((sx) => {
      const pivot = new THREE.Group(), knee = new THREE.Group();
      pivot.position.set(sx, 0.53, 0);
      mesh(gLimb, mLimb, 0, -0.125, 0, undefined, undefined, undefined, pivot).castShadow = true;
      knee.position.set(0, -0.25, 0);
      mesh(gLimb, mLimb, 0, -0.125, 0, 0.9, 1, 0.9, knee).castShadow = true;
      mesh(gBox, mVisor, 0, -0.26, -0.05, 0.12, 0.07, 0.22, knee);
      pivot.add(knee); g.add(pivot); limbs.push(pivot); knees.push(knee);
    });
    torso.castShadow = head.castShadow = true;
    g.position.set(cx, 0, cy);
    scene.add(g);

    /* Two tight pick volumes (desk with monitors, seated figure) so a desk in front
       does not steal clicks meant for the one behind it. They are never rendered. */
    [[x + 0.9, 0.62, y + 0.42, 1.84, 1.24, 0.86], [cx, 0.92, cy + 0.02, 0.72, 1.84, 0.74]].forEach((b) => {
      const hit = new THREE.Mesh(gBox);
      hit.position.set(b[0], b[1], b[2]); hit.scale.set(b[3], b[4], b[5]);
      hit.updateMatrixWorld(true);
      hit.userData.id = a.id;
      hitBoxes.push(hit);
    });

    actors[a.id] = {
      a, g, torso, head, headMat, lamp, eyes, halos, limbs, knees, screens, padFill, padLine, pf, pr,
      pos: new THREE.Vector2(cx, cy), heading: 0, wantHeading: 0, stand: 0, phase: Math.random() * 6,
      job: null, waiters: [], state: "idle", hot: false,
      label: null, lx: -9999, ly: -9999, shown: false, compact: false, rect: null
    };
  });

  const staticMesh = new THREE.InstancedMesh(gBox, lambert("#FFFFFF"), statics.length);
  (function () {
    const o = new THREE.Object3D(), c = new THREE.Color();
    statics.forEach((s, i) => {
      o.position.set(s[0], s[1], s[2]); o.scale.set(s[3], s[4], s[5]); o.updateMatrix();
      staticMesh.setMatrixAt(i, o.matrix); staticMesh.setColorAt(i, c.set(s[6]));
    });
  })();
  staticMesh.castShadow = staticMesh.receiveShadow = true;
  scene.add(staticMesh);

  /* ---------- the work item ---------- */
  const item = new THREE.Group();
  const itemCore = mesh(gBox, basic(COL.itemCore), 0, 0, 0, 0.2, 0.2, 0.2, item);
  const glowTex = (function () {
    const cv = document.createElement("canvas"); cv.width = cv.height = 64;
    const c2 = cv.getContext("2d"), gr = c2.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(255,255,255,.75)"); gr.addColorStop(0.35, "rgba(190,215,255,.28)"); gr.addColorStop(1, "rgba(160,190,255,0)");
    c2.fillStyle = gr; c2.fillRect(0, 0, 64, 64);
    return keep(new THREE.CanvasTexture(cv));
  })();
  const glow = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: glowTex, color: COL.glowTint, transparent: true, depthWrite: false, blending: day ? THREE.NormalBlending : THREE.AdditiveBlending })));
  glow.scale.set(0.95, 0.95, 1);
  item.add(glow);
  item.visible = false;
  scene.add(item);
  /* where the item is: null (hidden), { desk: id }, { carrier: id }, or { toss: {...} } */
  let itemAt = null;
  const deskSpot = (a) => new THREE.Vector3(a.x + 1.62, 0.98, a.y + 0.52);

  /* ---------- the halt barrier ---------- */
  const barrier = new THREE.Group();
  const stripeTex = (function () {
    const cv = document.createElement("canvas"); cv.width = 64; cv.height = 64;
    const c2 = cv.getContext("2d");
    c2.fillStyle = "#FF6B5E"; c2.fillRect(0, 0, 64, 64);
    c2.fillStyle = "#F4F6FB";
    c2.beginPath(); c2.moveTo(0, 64); c2.lineTo(32, 64); c2.lineTo(64, 32); c2.lineTo(64, 0); c2.closePath(); c2.fill();
    c2.beginPath(); c2.moveTo(0, 0); c2.lineTo(0, 32); c2.lineTo(32, 0); c2.closePath(); c2.fill();
    const t = keep(new THREE.CanvasTexture(cv));
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 1); t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const mPost = lambert("#C9D2E4"), mBoom = keep(new THREE.MeshBasicMaterial({ map: stripeTex }));
  const mField = basic(COL.stop, { transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide });
  const postA = mesh(gBox, mPost, 0, 0.6, 0, 0.16, 1.2, 0.16, barrier), postB = mesh(gBox, mPost, 0, 0.6, 0, 0.16, 1.2, 0.16, barrier);
  const boom = mesh(gBox, mBoom, 0, 1.1, 0, 0.12, 0.2, 1, barrier);
  const field = mesh(gPlane, mField, 0, 0.55, 0, 1, 1, 1, barrier);
  field.rotation.y = Math.PI / 2;
  postA.castShadow = postB.castShadow = boom.castShadow = true;
  barrier.visible = false;
  scene.add(barrier);
  let haltId = null, haltShown = null, haltT = 0;
  const haltLabel = document.createElement("div");
  haltLabel.className = "mf3-halt";
  haltLabel.textContent = TEXT.haltLabel;
  haltLabel.hidden = true;
  labelsEl.appendChild(haltLabel);

  function layBarrier(z) {
    const bx = z.x + z.w + 0.2, z0 = z.y, z1 = z.y + z.d, len = z1 - z0;
    barrier.position.set(bx, 0, 0);
    postA.position.z = z0; postB.position.z = z1;
    boom.position.z = field.position.z = (z0 + z1) / 2;
    boom.scale.z = len; field.scale.set(len, 1.1, 1);
    stripeTex.repeat.set(len / 0.4, 1);
    alarm.position.set(z.x + z.w / 2, 2.6, z.y + z.d / 2);
  }

  /* ---------- name labels (HTML, so the text stays sharp) ---------- */
  agents.forEach((a) => {
    const A = actors[a.id];
    const el = document.createElement("div");
    el.className = "mf3-label";
    el.setAttribute("data-state", "idle");
    el.setAttribute("data-gate", a.kind === "gate" ? "true" : "false");
    const dot = document.createElement("i");
    const name = document.createElement("span");
    name.textContent = a.pill || a.name.split(" ")[0];
    el.appendChild(dot); el.appendChild(name);
    labelsEl.appendChild(el);
    A.label = el;
  });

  /* ---------- camera ---------- */
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = 0.09;
  controls.rotateSpeed = 0.55; controls.zoomSpeed = 0.9; controls.panSpeed = 0.9;
  controls.screenSpacePanning = false;
  controls.minPolarAngle = 0.2; controls.maxPolarAngle = 1.38;
  controls.minAzimuthAngle = -0.14; controls.maxAzimuthAngle = Math.PI / 2 + 0.14;
  controls.minDistance = 6;
  controls.enableZoom = false;
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };

  let vw = 1, vh = 1, portrait = false, atHome = true, interactive = true;
  const home = { target: new THREE.Vector3(), pos: new THREE.Vector3(), dist: 30 };
  const tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3();
  const sph = (r, phi, theta, out) => out.set(r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.cos(theta));

  /* Smallest distance at which the whole floor fits the frame from a given direction. */
  function fitHome(target, phi, theta) {
    const probe = camera.clone(), dir = sph(1, phi, theta, new THREE.Vector3());
    const pts = [];
    [0, W].forEach((x) => [0, D].forEach((z) => [0, 1.9].forEach((y) => pts.push(new THREE.Vector3(x, y, z)))));
    pts.push(new THREE.Vector3(0, WALL, 0), new THREE.Vector3(W, WALL, 0), new THREE.Vector3(0, WALL, D));
    const TOP = 0.93, BOTTOM = -0.84, SIDE = 0.955;
    const bounds = (dist) => {
      probe.position.copy(target).addScaledVector(dir, dist);
      probe.lookAt(target); probe.updateMatrixWorld(true); probe.updateProjectionMatrix();
      const b = { x0: 9, x1: -9, y0: 9, y1: -9 };
      pts.forEach((p) => { tmpV.copy(p).project(probe); b.x0 = Math.min(b.x0, tmpV.x); b.x1 = Math.max(b.x1, tmpV.x); b.y0 = Math.min(b.y0, tmpV.y); b.y1 = Math.max(b.y1, tmpV.y); });
      return b;
    };
    let dist = 40;
    /* Fit, then slide the target so the floor sits in the middle of the frame, and fit again. */
    for (let pass = 0; pass < 4; pass++) {
      let lo = 6, hi = 160;
      for (let i = 0; i < 20; i++) {
        const mid = (lo + hi) / 2, b = bounds(mid);
        if (b.x1 - b.x0 < SIDE * 2 && b.y1 - b.y0 < TOP - BOTTOM) hi = mid; else lo = mid;
      }
      dist = hi;
      const b = bounds(dist), half = dist * Math.tan((camera.fov * Math.PI) / 360);
      const offX = (b.x0 + b.x1) / 2, offY = (b.y0 + b.y1) / 2 - (TOP + BOTTOM) / 2;
      const right = offX * half * camera.aspect, away = (offY * half) / Math.cos(phi);
      target.x += Math.cos(theta) * right - Math.sin(theta) * away;
      target.z += -Math.sin(theta) * right - Math.cos(theta) * away;
    }
    return dist;
  }
  function computeHome() {
    portrait = vw / vh < 0.95;
    const phi = portrait ? 0.8 : 0.98, theta = portrait ? 1.0 : 0.4;
    home.target.set(W / 2, 0.5, D / 2);
    home.dist = fitHome(home.target, phi, theta);
    sph(home.dist, phi, theta, home.pos).add(home.target);
    controls.maxDistance = home.dist * 1.2;
  }

  let flight = null, follow = false;
  function flyCamera(pos, target, ms) {
    atHome = false;
    if (reduce() || !ms) { camera.position.copy(pos); controls.target.copy(target); flight = null; return; }
    flight = { p0: camera.position.clone(), t0: controls.target.clone(), p1: pos.clone(), t1: target.clone(), t: 0, ms };
  }
  function goHome(ms) {
    flyCamera(home.pos, home.target, ms);
    atHome = true;
  }
  on(controls, "start", () => { flight = null; atHome = false; if (follow) events.interact(); });

  function resize() {
    const w = viewEl.clientWidth, hgt = viewEl.clientHeight;
    if (!w || !hgt || (w === vw && hgt === vh)) return;
    vw = w; vh = hgt;
    renderer.setSize(w, hgt, false);
    camera.aspect = w / hgt; camera.updateProjectionMatrix();
    computeHome();
    if (atHome) { flight = null; camera.position.copy(home.pos); controls.target.copy(home.target); }
  }
  const ro = "ResizeObserver" in window ? new ResizeObserver(resize) : null;
  if (ro) ro.observe(viewEl); else on(window, "resize", resize);

  /* ---------- pointer: hover, click, and when the wheel may zoom ---------- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let pointerIn = false, pointerMoved = false, px = 0, py = 0, down = null, hoverId = null;
  function agentAt(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(hitBoxes, false);
    return hits.length ? hits[0].object.userData.id : null;
  }
  function setHover(id) {
    if (id === hoverId) return;
    hoverId = id;
    canvas.style.cursor = id ? "pointer" : "";
    events.hover(id);
  }
  on(canvas, "pointerdown", (e) => {
    down = { x: e.clientX, y: e.clientY, type: e.pointerType };
    /* Scrolling the page over the floor must not zoom it. A click inside arms the wheel. */
    if (e.pointerType === "mouse") controls.enableZoom = true;
  });
  on(canvas, "pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    pointerIn = true; pointerMoved = true; px = e.clientX; py = e.clientY;
  });
  on(canvas, "pointerup", (e) => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    down = null;
    if (moved > 6 || (e.pointerType === "mouse" && e.button !== 0)) return;
    events.pick(agentAt(e.clientX, e.clientY));
  });
  on(canvas, "pointercancel", () => { down = null; });
  on(canvas, "pointerleave", (e) => {
    pointerIn = false;
    if (e.pointerType === "mouse") { controls.enableZoom = false; setHover(null); }
  });
  on(canvas, "contextmenu", (e) => e.preventDefault());
  on(canvas, "webglcontextlost", (e) => { e.preventDefault(); if (!destroyed) events.fail(); });

  /* ---------- walking routes ---------- */
  const corridor = (a) => a.cy + 0.62;
  function crossing(lanes, x0, x1) {
    let best = lanes[0], cost = Infinity;
    lanes.forEach((l) => { const c = Math.abs(x0 - l) + Math.abs(x1 - l); if (c < cost) { cost = c; best = l; } });
    return best;
  }
  /* From a's chair to the spot just behind b's chair, staying in the gaps between desks. */
  function route(a, b) {
    const V = (x, z) => new THREE.Vector2(x, z);
    const z0 = corridor(a), z1 = corridor(b), x0 = a.cx + 0.52, x1 = b.cx + 0.52;
    const pts = [V(x0, a.cy), V(x0, z0)];
    const band = (z) => (z < 5 ? 0 : z < AISLE ? 1 : 2);
    const b0 = band(z0), b1 = band(z1);
    if (b0 !== b1) {
      const lo = Math.min(b0, b1), hi = Math.max(b0, b1);
      if (lo === 0 && hi === 1) { const l = crossing(LANES_DELIVERY, x0, x1); pts.push(V(l, z0), V(l, z1)); }
      else if (lo === 1) { const l = crossing(LANES_GTM, x0, x1); pts.push(V(l, z0), V(l, z1)); }
      else {
        const first = b0 === 0 ? LANES_DELIVERY : LANES_GTM, second = b0 === 0 ? LANES_GTM : LANES_DELIVERY;
        const l0 = crossing(first, x0, x1), l1 = crossing(second, l0, x1);
        pts.push(V(l0, z0), V(l0, AISLE), V(l1, AISLE), V(l1, z1));
      }
    }
    pts.push(V(x1, z1));
    return pts;
  }
  const pathLength = (from, pts) => { let n = 0, p = from; pts.forEach((q) => { n += p.distanceTo(q); p = q; }); return n; };

  function seat(A) {
    A.job = null;
    A.pos.set(A.a.cx, A.a.cy);
    A.wantHeading = 0;
    const w = A.waiters; A.waiters = [];
    w.forEach((fn) => fn());
  }

  const pending = new Set();
  function handoff(fromId, toId) {
    const A = actors[fromId], B = actors[toId];
    if (!A || !B) return Promise.resolve();
    if (reduce()) { placeItem(toId); return ctx.clock.wait(200); }
    return settle(fromId).then(() => new Promise((resolve) => {
      pending.add(resolve);
      const out = route(A.a, B.a), len = pathLength(A.pos, out);
      itemAt = { carrier: fromId }; item.visible = true;
      A.job = {
        pts: out, i: 0, carry: true, speed: Math.max(WALK_SPEED, len / 2.3),
        done() {
          A.wantHeading = 0;
          itemAt = { toss: { from: item.position.clone(), to: deskSpot(B.a), t: 0, id: toId } };
          const back = out.slice(0, -1).reverse(); back.push(new THREE.Vector2(A.a.cx, A.a.cy));
          A.job = { pts: back, i: 0, carry: false, speed: Math.max(WALK_SPEED, len / 2.3), done() { seat(A); } };
          pending.delete(resolve); resolve();
        }
      };
    }));
  }
  function settle(id) {
    const A = actors[id];
    if (!A || !A.job) return Promise.resolve();
    return new Promise((resolve) => { A.waiters.push(resolve); });
  }
  function placeItem(id) {
    const A = id ? actors[id] : null;
    itemAt = A ? { desk: id } : null;
    item.visible = !!A;
    if (A) item.position.copy(deskSpot(A.a));
  }
  function resetActors() {
    agents.forEach((a) => { const A = actors[a.id]; seat(A); A.stand = 0; A.heading = 0; });
    if (itemAt && (itemAt.carrier || itemAt.toss)) placeItem(null);
    const p = Array.from(pending); pending.clear();
    p.forEach((fn) => fn());
  }

  /* ---------- state ---------- */
  function paintPad(A) {
    const s = A.state;
    let color = null, fillA = 0, lineA = 0;
    if (A.hot) { color = COL.ice; fillA = 0.09; lineA = 0.75; }
    else if (s === "blocked") { color = COL.stop; fillA = 0.1; lineA = 0.6; }
    else if (s === "working") { color = COL.ok; fillA = 0.08; lineA = 0.45; }
    A.pf.visible = A.pr.visible = !!color;
    if (color) { A.padFill.color.set(color); A.padLine.color.set(color); A.padFill.opacity = fillA; A.padLine.opacity = lineA; }
  }
  function setState(id, state) {
    const A = actors[id]; if (!A) return;
    A.state = state;
    A.screens.forEach((m) => { m.material = mScreen[state] || mScreen.idle; });
    const lampMat = mLamp[state] || mLamp.idle;
    if (A.lamp) A.lamp.material = lampMat;
    A.eyes.forEach((m) => { m.material = lampMat; });
    A.halos.forEach((sp) => { sp.visible = !!mHalo[state]; if (mHalo[state]) sp.material = mHalo[state]; });
    const dim = state === "skipped";
    A.torso.material = dim ? mBody.skipped : (mBody[A.a.kind] || mBody.build);
    A.head.material = dim ? mHeadDim : A.headMat;
    A.limbs[0].children[0].material = A.limbs[1].children[0].material = A.torso.material;
    A.label.setAttribute("data-state", state);
    paintPad(A);
  }
  function setHot(id, isOn) {
    const A = actors[id]; if (!A) return;
    A.hot = isOn;
    A.label.classList.toggle("is-hot", isOn);
    paintPad(A);
  }
  function setBoard(itemText, stageId, closed, order, head) {
    const z = stageId ? zoneById[stageId] : null;
    boardState = { item: String(itemText || ""), stage: z ? "STAGE: " + z.name.toUpperCase() : (closed ? "CLOSED" : ""),
      idx: z && order ? order.indexOf(z.id) : -1, closed: !!closed, halted: !!haltId, head: typeof head === "string" ? head : "" };
    boardPlane.redraw();
  }
  function setHalt(zoneId) {
    haltId = zoneId && zoneParts[zoneId] ? zoneId : null;
    if (haltId) { haltShown = haltId; layBarrier(zoneParts[haltId].z); }
    if (boardState.halted !== !!haltId) { boardState.halted = !!haltId; boardPlane.redraw(); }
    if (reduce()) haltT = haltId ? 1 : 0;
  }

  /* ---------- per-frame ---------- */
  let time = 0;
  const cRed = new THREE.Color(COL.stop), cTmp = new THREE.Color();
  const cWork = new THREE.Color("#D2DDF2"), cWorkHi = new THREE.Color("#FFFFFF");

  function stepActor(A, dt) {
    const job = A.job;
    let walked = 0;
    if (job) {
      let move = job.speed * dt;
      while (move > 0 && job.i < job.pts.length) {
        const p = job.pts[job.i], dx = p.x - A.pos.x, dz = p.y - A.pos.y, dist = Math.hypot(dx, dz);
        if (dist <= move) { A.pos.copy(p); move -= dist; walked += dist; job.i++; }
        else { A.pos.x += (dx / dist) * move; A.pos.y += (dz / dist) * move; A.wantHeading = Math.atan2(-dx, -dz); walked += move; move = 0; }
      }
      if (job.i >= job.pts.length && A.job === job) { A.job = null; job.done(); }
    }
    A.phase += walked * 5.4;
    const standing = A.job ? 1 : 0;
    A.stand += (standing - A.stand) * Math.min(1, dt * 9);
    let dh = A.wantHeading - A.heading;
    dh = Math.atan2(Math.sin(dh), Math.cos(dh));
    A.heading += dh * Math.min(1, dt * 12);

    const s = A.stand, swing = Math.sin(A.phase) * 0.62 * s;
    const typing = A.state === "working" && !A.job ? Math.sin(time * 13 + A.phase) * 0.07 : 0;
    const carrying = A.job && A.job.carry;
    const armSeat = SEAT_ARM + typing;
    A.limbs[0].rotation.x = armSeat * (1 - s) + (carrying ? 1.05 : -swing) * s;
    A.limbs[1].rotation.x = (SEAT_ARM - typing) * (1 - s) + (carrying ? 1.05 : swing) * s;
    A.limbs[2].rotation.x = SEAT_LEG * (1 - s) + swing * s;
    A.limbs[3].rotation.x = SEAT_LEG * (1 - s) - swing * s;
    /* knees: shins hang straight down when seated, and bend on the back-swing when walking */
    A.knees[0].rotation.x = -SEAT_LEG * (1 - s) - Math.max(0, -swing) * 0.9;
    A.knees[1].rotation.x = -SEAT_LEG * (1 - s) - Math.max(0, swing) * 0.9;
    A.g.position.set(A.pos.x, Math.abs(Math.sin(A.phase)) * 0.035 * s, A.pos.y);
    A.g.rotation.y = A.heading;
    A.head.position.y = 1.31 + (A.state === "working" && !A.job ? Math.sin(time * 2.2 + A.phase) * 0.008 : 0);
  }

  function stepItem(dt) {
    if (!itemAt) return;
    itemCore.rotation.y += dt * 1.6; itemCore.rotation.x = 0.5;
    if (itemAt.desk) {
      const p = deskSpot(agentById[itemAt.desk]);
      item.position.set(p.x, p.y + Math.sin(time * 2.4) * 0.04, p.z);
    } else if (itemAt.carrier) {
      const A = actors[itemAt.carrier];
      item.position.set(A.pos.x - Math.sin(A.heading) * 0.36, 1.0, A.pos.y - Math.cos(A.heading) * 0.36);
    } else if (itemAt.toss) {
      const t = itemAt.toss;
      t.t = Math.min(1, t.t + dt / 0.38);
      item.position.lerpVectors(t.from, t.to, ease(t.t));
      item.position.y += Math.sin(t.t * Math.PI) * 0.45;
      if (t.t >= 1) itemAt = { desk: t.id };
    }
  }

  function stepHalt(dt) {
    const want = haltId ? 1 : 0;
    if (haltT !== want) haltT = clamp(haltT + (want ? dt / 0.7 : -dt / 0.45), 0, 1);
    const P = haltShown ? zoneParts[haltShown] : null;
    if (!P) return;
    const on = haltT > 0.001;
    barrier.visible = on;
    const pulse = reduce() ? 0.7 : 0.5 + 0.5 * Math.sin(time * 5);
    const k = ease(haltT);
    P.fillMat.color.copy(P.base).lerp(cRed, k); P.fillMat.opacity = 0.055 + k * (0.1 + pulse * 0.1);
    P.lineMat.color.copy(P.line).lerp(cRed, k);
    alarm.intensity = k * (14 + pulse * 12);
    if (on) {
      const drop = want ? bounceOut(haltT) : k;
      boom.position.y = 1.1 + (1 - drop) * 3.6;
      postA.scale.y = postB.scale.y = Math.max(0.01, 1.2 * Math.min(1, k * 2));
      postA.position.y = postB.position.y = postA.scale.y / 2;
      mField.opacity = k * (0.1 + pulse * 0.08);
      field.scale.y = Math.max(0.01, boom.position.y - 0.1); field.position.y = field.scale.y / 2;
      stripeTex.offset.x = reduce() ? 0 : time * 0.35;
    } else if (!haltId) haltShown = null;
  }

  function stepCamera(realDt) {
    if (flight) {
      flight.t = Math.min(1, flight.t + (realDt * 1000) / flight.ms);
      const k = ease(flight.t);
      camera.position.lerpVectors(flight.p0, flight.p1, k);
      controls.target.lerpVectors(flight.t0, flight.t1, k);
      if (flight.t >= 1) flight = null;
    } else if (follow && itemAt) {
      /* Tour: keep the work item in the middle of the frame from a steady three-quarter view. */
      tmpV.set(item.position.x, 0.8, item.position.z);
      sph(portrait ? 18 : 14.5, 0.95, 0.52, tmpV2).add(tmpV);
      const k = reduce() ? 1 : 1 - Math.exp(-realDt * 2.6);
      controls.target.lerp(tmpV, k); camera.position.lerp(tmpV2, k);
    }
    controls.update();
    /* Hard limits: the target stays over the floor, the camera stays above it and in front of the walls. */
    const t = controls.target;
    const tx = clamp(t.x, 1, W - 1), ty = clamp(t.y, 0, 2.2), tz = clamp(t.z, 0.8, D - 0.5);
    if (tx !== t.x || ty !== t.y || tz !== t.z) { camera.position.x += tx - t.x; camera.position.y += ty - t.y; camera.position.z += tz - t.z; t.set(tx, ty, tz); }
    const c = camera.position;
    if (c.x < 0.9) c.x = 0.9;
    if (c.z < 0.9) c.z = 0.9;
    if (c.y < 1.1) c.y = 1.1;
    camera.lookAt(t);
  }

  function placeLabels() {
    camera.updateMatrixWorld();
    const unitPx = (d) => vh / (2 * Math.tan((camera.fov * Math.PI) / 360) * d);
    agents.forEach((a) => {
      const A = actors[a.id];
      tmpV.set(A.pos.x, 1.93, A.pos.y);
      const dist = tmpV.distanceTo(camera.position);
      tmpV.project(camera);
      const x = (tmpV.x * 0.5 + 0.5) * vw, y = (-tmpV.y * 0.5 + 0.5) * vh;
      const vis = tmpV.z < 1 && x > -40 && x < vw + 40 && y > 0 && y < vh + 30;
      if (vis !== A.shown) { A.shown = vis; A.label.style.visibility = vis ? "visible" : "hidden"; }
      if (!vis) { A.rect = null; return; }
      /* Too far out for 22 names to fit: fall back to status dots, except where something is happening. */
      const compact = unitPx(dist) < 21 && !A.hot && A.state !== "working" && A.state !== "blocked";
      if (compact !== A.compact) { A.compact = compact; A.label.classList.toggle("is-compact", compact); }
      if (Math.abs(x - A.lx) > 0.1 || Math.abs(y - A.ly) > 0.1) {
        A.lx = x; A.ly = y;
        A.label.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px) translate(-50%,-100%)";
      }
      A.rect = { left: x - 44, right: x + 44, top: y - 24 };
    });
    const showHalt = haltT > 0.5 && haltShown;
    if (haltLabel.hidden === !!showHalt) haltLabel.hidden = !showHalt;
    if (showHalt) {
      const z = zoneParts[haltShown].z;
      tmpV.set(z.x + z.w / 2, 3.9, z.y + z.d / 2).project(camera);
      haltLabel.style.transform = "translate(" + ((tmpV.x * 0.5 + 0.5) * vw).toFixed(1) + "px," + ((-tmpV.y * 0.5 + 0.5) * vh).toFixed(1) + "px) translate(-50%,-50%)";
    }
  }

  function frame(simMs, realMs) {
    if (destroyed) return;
    if (!vw || vw === 1) resize();
    const dt = simMs / 1000;
    time += dt;
    agents.forEach((a) => stepActor(actors[a.id], dt));
    stepItem(dt);
    stepHalt(dt);
    if (!reduce()) mScreen.working.color.copy(cWork).lerp(cWorkHi, 0.5 + 0.5 * Math.sin(time * 3.1));
    stepCamera(realMs / 1000);
    if (pointerIn && interactive && !down && (pointerMoved || flight)) { pointerMoved = false; setHover(agentAt(px, py)); }
    renderer.render(scene, camera);
    placeLabels();
  }

  /* ---------- start ---------- */
  viewEl.insertBefore(canvas, viewEl.firstChild);
  resize();
  goHome(0);
  /* carried over when the look is switched, so the visitor keeps the view they had */
  if (ctx.camera && !ctx.camera.home) {
    camera.position.fromArray(ctx.camera.p); controls.target.fromArray(ctx.camera.t); atHome = false;
  }
  if (document.fonts && document.fonts.load) {
    Promise.all([document.fonts.load('600 84px "Space Grotesk"'), document.fonts.load('500 40px "IBM Plex Mono"')])
      .then(() => { if (!destroyed) redraws.forEach((fn) => fn()); })
      .catch(() => { /* system fonts are already drawn */ });
  }

  return {
    kind: "3d",
    setState, setHot, setBoard, setHalt, placeItem, handoff, settle, resetActors, frame,
    anchor(id) { const A = actors[id]; return A ? A.rect : null; },
    flyTo(id) {
      const a = agentById[id]; if (!a) return;
      /* aim a little to the right of the desk on wide screens, so the card opens beside the agent, not over it */
      tmpV.set(a.cx + (ctx.isNarrow() ? 0 : 2.1), 0.9, a.cy - 0.35);
      sph(portrait ? 12 : 10, 0.98, 0.7, tmpV2).add(tmpV);
      flyCamera(tmpV2, tmpV, 900);
    },
    resetView() { goHome(900); },
    cameraState() { return { p: camera.position.toArray(), t: controls.target.toArray(), home: atHome }; },
    /* On-screen buttons: turn the floor or move in and out by one step, inside the same limits as dragging. */
    nudge(turn, zoom) {
      const off = tmpV.copy(camera.position).sub(controls.target);
      const s = new THREE.Spherical().setFromVector3(off);
      s.theta = clamp(s.theta + turn * 0.4, controls.minAzimuthAngle, controls.maxAzimuthAngle);
      s.radius = clamp(s.radius * (zoom > 0 ? 0.78 : zoom < 0 ? 1.28 : 1), controls.minDistance, controls.maxDistance);
      follow = false;
      flyCamera(tmpV2.setFromSpherical(s).add(controls.target), controls.target, 320);
    },
    setFollow(isOn) { follow = !!isOn; if (follow) { flight = null; atHome = false; } },
    setInteractive(isOn) {
      interactive = !!isOn;
      controls.enabled = interactive;
      canvas.style.pointerEvents = interactive ? "auto" : "none";
      canvas.style.touchAction = interactive ? "none" : "pan-y";
      if (interactive && window.matchMedia && window.matchMedia("(hover: none), (pointer: coarse)").matches) controls.enableZoom = true;
    },
    destroy() {
      destroyed = true;
      if (ro) ro.disconnect();
      offs.forEach((off) => off()); offs.length = 0;
      controls.dispose();
      resetActors();
      scene.traverse((o) => { if (o.isInstancedMesh) o.dispose(); });
      trash.forEach((x) => x.dispose()); trash.clear();
      renderer.dispose();
      /* Hand the WebGL context back now; browsers only allow a handful per page. */
      const lose = gl.getExtension("WEBGL_lose_context");
      if (lose) lose.loseContext();
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      while (labelsEl.firstChild) labelsEl.removeChild(labelsEl.firstChild);
    }
  };
}
