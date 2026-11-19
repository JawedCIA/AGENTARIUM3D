/* Optional cinematic opening and closing for the floor (Version C).
   Opening: a dark room, one person at a desk, a monitor showing falling code. The camera moves
   over their shoulder into the screen, dives into a single character, and the floor is revealed.
   Closing (after the tour): the camera pulls back out, and the same person is watching the floor
   on that monitor. It is a layer on top of the stage with its own small scene; the floor itself
   is untouched. The falling-code look is drawn here from plain letters, digits and symbols. */

import * as THREE from "./vendor/three-0.187.0/three.module.min.js";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<>[]{}/=+*#$%&:;";
const FIELD_W = 1024, FIELD_H = 540, CELL = 15;
const COLS = Math.ceil(FIELD_W / CELL), ROWS = Math.ceil(FIELD_H / CELL);
/* The character the camera dives into, and its place on the screen. */
const FOCUS = { col: Math.floor(COLS * 0.56), row: Math.floor(ROWS * 0.46), ch: "A" };
const FOCUS_X = (FOCUS.col + 0.5) * CELL, FOCUS_Y = (FOCUS.row + 0.5) * CELL;

const SCREEN = { w: 1.9, h: 1.0, y: 1.45 };
const FOV = 35;
const IN = { hold: 1100, room: 6600, dive: 2700, vision: 2300, reveal: 1100 };
const OUT = { fade: 600, pull: 3800, hold: 2800, leave: 800 };

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
function rnd(a, b, c) {
  let n = Math.imul(a + 1, 73856093) ^ Math.imul(b + 1, 19349663) ^ Math.imul(c + 1, 83492791);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

/* Falling code, drawn fresh each frame so it can be magnified without going soft.
   (fx, fy) is the point of the code field placed at the centre of the canvas. */
function drawRain(c2, w, h, t, zoom, fx, fy, focusGlow) {
  c2.setTransform(1, 0, 0, 1, 0, 0);
  c2.fillStyle = "#010603";
  c2.fillRect(0, 0, w, h);
  const size = CELL * zoom;
  c2.font = "600 " + (size * 0.92).toFixed(1) + 'px "IBM Plex Mono", ui-monospace, monospace';
  c2.textAlign = "center"; c2.textBaseline = "middle";
  const c0 = Math.max(0, Math.floor((fx - w / 2 / zoom) / CELL)), c1 = Math.min(COLS - 1, Math.ceil((fx + w / 2 / zoom) / CELL));
  const r0 = Math.max(0, Math.floor((fy - h / 2 / zoom) / CELL)), r1 = Math.min(ROWS - 1, Math.ceil((fy + h / 2 / zoom) / CELL));
  for (let col = c0; col <= c1; col++) {
    const x = ((col + 0.5) * CELL - fx) * zoom + w / 2;
    for (let s = 0; s < 2; s++) {
      const speed = 5 + rnd(col, s, 1) * 11, len = 7 + Math.floor(rnd(col, s, 2) * 20), span = ROWS + len + 6;
      const head = (t * speed + rnd(col, s, 3) * span) % span;
      const top = Math.max(r0, Math.ceil(head - len)), bottom = Math.min(r1, Math.floor(head));
      for (let row = top; row <= bottom; row++) {
        const d = head - row;
        const ch = GLYPHS[Math.floor(rnd(col, row, Math.floor(t * 1.6 + rnd(col, row, 7) * 9)) * GLYPHS.length)];
        const y = ((row + 0.5) * CELL - fy) * zoom + h / 2;
        if (d < 1) c2.fillStyle = "#EAFFF0";
        else { const a = 1 - d / len; c2.fillStyle = "rgba(" + Math.round(40 + 60 * a) + ",255," + Math.round(110 + 40 * a) + "," + (0.18 + a * 0.8).toFixed(3) + ")"; }
        if (col === FOCUS.col && row === FOCUS.row && focusGlow > 0) continue;
        c2.fillText(ch, x, y);
      }
    }
  }
  if (focusGlow > 0) {
    /* the chosen character holds still and brightens as the camera closes in */
    c2.fillStyle = "rgba(214,255,224," + Math.min(1, 0.35 + focusGlow).toFixed(3) + ")";
    c2.shadowColor = "#5CFF8F"; c2.shadowBlur = Math.min(60, size * 0.3) * focusGlow;
    drawDotA(c2, w / 2, h / 2, size * 0.62, size * 0.86, c2.fillStyle);
    c2.shadowBlur = 0;
  }
}

/* The letter the camera dives into, drawn as a dot-matrix display: a 5 x 7 grid of square
   lights, the ones that make an "A" lit and the rest left faintly visible. */
const DOT_A = [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"];
function drawDotA(c2, cx, cy, gw, gh, lit) {
  const cols = 5, rows = 7, pitch = Math.min(gw / cols, gh / rows), dot = pitch * 0.78, r = dot * 0.2;
  const x0 = cx - (cols * pitch) / 2 + (pitch - dot) / 2, y0 = cy - (rows * pitch) / 2 + (pitch - dot) / 2;
  const cell = (c, rw) => {
    const x = x0 + c * pitch, y = y0 + rw * pitch;
    c2.beginPath();
    if (c2.roundRect) c2.roundRect(x, y, dot, dot, r); else c2.rect(x, y, dot, dot);
    c2.fill();
  };
  const blur = c2.shadowBlur;
  c2.shadowBlur = 0; c2.fillStyle = "rgba(60,255,130,.08)";
  for (let rw = 0; rw < rows; rw++) for (let c = 0; c < cols; c++) if (DOT_A[rw][c] !== "#") cell(c, rw);
  c2.shadowBlur = blur; c2.fillStyle = lit;
  for (let rw = 0; rw < rows; rw++) for (let c = 0; c < cols; c++) if (DOT_A[rw][c] === "#") cell(c, rw);
}

export function createIntro({ stage, getFloorCanvas, reduce, modelUrl, imageUrl }) {
  let layer = null, renderer = null, gl = null, scene = null, camera = null, c3 = null, c2d = null, ctx2 = null;
  let screenCv = null, screenCtx = null, screenTex = null, flash = null, caption = null, btnSkip = null;
  let person = null, torsoMesh = null, headG = null, hands = [], vision = null;
  let chairBack = null, keyboard = null, mouse = null, cutout = null, ready = true, model = null, modelIdle = null, loadTimer = 0, buildId = 0;
  let mode = null, t = 0, clock = 0, done = null, w = 1, h = 1, closing = false;
  const trash = [];
  const keep = (x) => { trash.push(x); return x; };
  const start = new THREE.Vector3(1.75, 1.95, 3.7), beside = new THREE.Vector3(0.52, 1.58, 1.45), near = new THREE.Vector3();
  const BESIDE = beside.clone();
  const focusWorld = new THREE.Vector3((FOCUS_X / FIELD_W - 0.5) * SCREEN.w, SCREEN.y + (0.5 - FOCUS_Y / FIELD_H) * SCREEN.h, 0.03);
  const look = new THREE.Vector3(), tmp = new THREE.Vector3();
  let path = null;

  function build() {
    layer = document.createElement("div");
    layer.className = "mf3-intro";
    c2d = document.createElement("canvas"); c2d.className = "mf3-intro-2d";
    c3 = document.createElement("canvas"); c3.className = "mf3-intro-3d";
    flash = document.createElement("div"); flash.className = "mf3-intro-flash";
    caption = document.createElement("p"); caption.className = "mf3-intro-caption";
    caption.textContent = "Agents do the work. One person stays in control.";
    btnSkip = document.createElement("button");
    btnSkip.type = "button"; btnSkip.className = "mf3-btn mf3-intro-skip"; btnSkip.textContent = "Skip intro";
    btnSkip.addEventListener("click", skip);
    [c2d, c3, flash, caption, btnSkip].forEach((n) => layer.appendChild(n));
    ctx2 = c2d.getContext("2d");

    gl = c3.getContext("webgl2", { antialias: true, alpha: false });
    if (!gl) throw new Error("no webgl2");
    renderer = new THREE.WebGLRenderer({ canvas: c3, context: gl, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x010305, 1);
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x010305, 5, 11);
    camera = new THREE.PerspectiveCamera(FOV, 2, 0.05, 40);

    const box = keep(new THREE.BoxGeometry(1, 1, 1));
    const mat = (c) => keep(new THREE.MeshLambertMaterial({ color: c }));
    const add = (geo, m, x, y, z, sx, sy, sz) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); if (sx !== undefined) o.scale.set(sx, sy, sz); scene.add(o); return o; };
    const dark = mat("#141A22"), darker = mat("#0B0F15"), wood = mat("#2A2420"), metal = mat("#30363F");

    scene.add(new THREE.HemisphereLight(0x4A6480, 0x05080C, 1.0));
    const glow = new THREE.PointLight(0x4DFF88, 9, 7, 1.7); glow.position.set(0, SCREEN.y, 0.9); scene.add(glow);
    const rim = new THREE.DirectionalLight(0x7F93FF, 0.9); rim.position.set(3, 4, 5); scene.add(rim);

    add(box, darker, 0, -0.05, 1, 14, 0.1, 12);                       /* floor */
    add(box, dark, 0, 2, -0.9, 14, 5, 0.1);                           /* back wall */
    add(box, wood, 0, 0.75, 0.42, 2.9, 0.06, 1.15);                   /* desk top */
    add(box, metal, -1.35, 0.37, 0.42, 0.06, 0.74, 1.0); add(box, metal, 1.35, 0.37, 0.42, 0.06, 0.74, 1.0);
    add(box, metal, 0, 0.84, -0.02, 0.5, 0.03, 0.26); add(box, metal, 0, 0.9, -0.05, 0.1, 0.14, 0.06);   /* monitor stand */
    add(box, darker, 0, SCREEN.y, 0, SCREEN.w + 0.08, SCREEN.h + 0.08, 0.05);                              /* bezel */
    keyboard = add(box, mat("#3A4048"), 0.05, 0.795, 0.62, 0.62, 0.02, 0.2); mouse = add(box, mat("#3A4048"), 0.5, 0.795, 0.64, 0.08, 0.025, 0.12);
    add(box, mat("#C9D2E4"), -0.95, 0.83, 0.5, 0.09, 0.11, 0.09);     /* mug */
    add(box, darker, -1.9, 1.1, -0.6, 0.9, 2.2, 0.4);                 /* shelf silhouette */

    screenCv = document.createElement("canvas"); screenCv.width = FIELD_W; screenCv.height = FIELD_H;
    screenCtx = screenCv.getContext("2d");
    screenTex = keep(new THREE.CanvasTexture(screenCv));
    screenTex.colorSpace = THREE.SRGBColorSpace;
    screenTex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const plane = keep(new THREE.PlaneGeometry(SCREEN.w, SCREEN.h));
    add(plane, keep(new THREE.MeshBasicMaterial({ map: screenTex })), 0, SCREEN.y, 0.028);

    /* the controller, seen from behind: built from rounded parts with shoulders, bent arms,
       hands on the keyboard and a headset, and given a little idle movement in frame() */
    const shirt = mat("#23262E"), skin = mat("#C9966B"), hair = mat("#17130F"), chair = mat("#10151D"), gear = mat("#0A0D12");
    const jeans = mat("#1A1C23"), sole = mat("#B9B4AC");
    add(box, chair, 0, 0.47, 1.22, 0.62, 0.08, 0.6); chairBack = add(box, chair, 0, 0.8, 1.5, 0.58, 0.56, 0.08); add(box, chair, 0, 0.22, 1.22, 0.08, 0.44, 0.08);
    add(box, chair, 0, 0.03, 1.22, 0.6, 0.05, 0.07); add(box, chair, 0, 0.03, 1.22, 0.07, 0.05, 0.6);
    [-0.37, 0.37].forEach((sx) => { add(box, chair, sx, 0.71, 1.2, 0.06, 0.035, 0.38); add(box, chair, sx, 0.6, 1.3, 0.04, 0.2, 0.04); });
    const lamp = add(box, gear, 1.12, 0.79, 0.2, 0.2, 0.03, 0.2); add(box, gear, 1.12, 1.0, 0.2, 0.025, 0.42, 0.025);
    const shade = add(keep(new THREE.CylinderGeometry(0.05, 0.13, 0.14, 16)), mat("#2B3340"), 1.02, 1.2, 0.3); shade.rotation.z = -0.5; void lamp;
    const warm = new THREE.PointLight(0xFFC98A, 2.4, 4.5, 1.8); warm.position.set(0.95, 1.12, 0.45); scene.add(warm);

    /* Sculpted by hand to follow the reference pictures: black hoodie with the hood resting
       behind the neck, dark curly hair, beard, glasses, dark jeans, trainers with pale soles. */
    person = new THREE.Group(); person.position.set(0, 0, 1.2); scene.add(person);
    const part = (geo, m, x, y, z, sx, sy, sz, parent) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); if (sx !== undefined) o.scale.set(sx, sy, sz); (parent || person).add(o); return o; };
    const profile = [[0.21, 0], [0.245, 0.1], [0.255, 0.3], [0.28, 0.45], [0.268, 0.53], [0.185, 0.6], [0.09, 0.64], [0, 0.65]].map((q) => new THREE.Vector2(q[0], q[1]));
    torsoMesh = part(keep(new THREE.LatheGeometry(profile, 28)), shirt, 0, 0.5, 0, 1.14, 1, 0.68);
    const ball = keep(new THREE.SphereGeometry(1, 20, 14));
    const upper = keep(new THREE.CapsuleGeometry(0.066, 0.24, 4, 12)), fore = keep(new THREE.CapsuleGeometry(0.056, 0.26, 4, 12));
    part(keep(new THREE.TorusGeometry(0.245, 0.03, 8, 28)), shirt, 0, 0.53, 0, 1.14, 0.7, 1).rotation.x = Math.PI / 2;      /* hoodie hem */
    hands = [];
    const tube = keep(new THREE.CylinderGeometry(1, 1, 1, 14)), up = new THREE.Vector3(0, 1, 0);
    const limb = (A, B, r, m) => { const o = part(tube, m, (A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2, r, A.distanceTo(B), r); o.quaternion.setFromUnitVectors(up, B.clone().sub(A).normalize()); return o; };
    [-1, 1].forEach((sd) => {
      /* Arms that read as arms: elbows out and above the desk, slim forearms sloping down and
         inward to the keyboard, and hands with separate fingers. */
      const S = new THREE.Vector3(sd * 0.29, 1.05, 0), E = new THREE.Vector3(sd * 0.39, 0.89, -0.13), W = new THREE.Vector3(sd * 0.19, 0.845, -0.47);
      part(ball, shirt, S.x, S.y, S.z, 0.112, 0.105, 0.115);                                      /* shoulder */
      limb(S, E, 0.07, shirt); limb(E, W, 0.05, shirt);                                           /* upper arm, forearm */
      part(ball, shirt, E.x, E.y, E.z, 0.072, 0.072, 0.072);                                      /* elbow */
      part(ball, shirt, W.x, W.y, W.z, 0.055, 0.05, 0.045);                                       /* ribbed cuff */
      part(box, skin, sd * 0.175, 0.835, -0.535, 0.085, 0.024, 0.09);                             /* palm */
      for (let i = 0; i < 4; i++) hands.push(part(box, skin, sd * 0.175 + (i - 1.5) * 0.021, 0.83, -0.61, 0.016, 0.016, 0.07));   /* fingers */
      part(box, skin, sd * 0.175 - sd * 0.05, 0.83, -0.555, 0.018, 0.016, 0.05).rotation.y = sd * 0.6;                           /* thumb */
      /* legs under the desk: thigh, shin, trainer */
      const th = part(keep(new THREE.CapsuleGeometry(0.088, 0.3, 4, 12)), jeans, sd * 0.115, 0.57, -0.24); th.rotation.x = Math.PI / 2;
      part(keep(new THREE.CapsuleGeometry(0.066, 0.34, 4, 12)), jeans, sd * 0.115, 0.31, -0.47);
      part(box, gear, sd * 0.115, 0.07, -0.53, 0.11, 0.08, 0.27); part(box, sole, sd * 0.115, 0.018, -0.53, 0.118, 0.034, 0.285);
    });
    /* the hood, folded down behind the neck, and its collar */
    part(ball, shirt, 0, 1.11, 0.13, 0.2, 0.125, 0.13);
    part(ball, shirt, 0, 1.0, 0.17, 0.15, 0.13, 0.07);
    part(keep(new THREE.TorusGeometry(0.115, 0.04, 10, 24)), shirt, 0, 1.165, 0.01).rotation.x = Math.PI / 2;
    part(keep(new THREE.CylinderGeometry(0.065, 0.078, 0.11, 14)), skin, 0, 1.2, 0);
    headG = new THREE.Group(); headG.position.set(0, 1.26, 0); person.add(headG);
    part(ball, skin, 0, 0.17, 0, 0.172, 0.205, 0.188, headG);                                     /* head */
    part(ball, skin, -0.172, 0.15, 0.005, 0.03, 0.05, 0.035, headG); part(ball, skin, 0.172, 0.15, 0.005, 0.03, 0.05, 0.035, headG);   /* ears */
    part(ball, hair, 0, 0.078, -0.07, 0.15, 0.118, 0.135, headG);                                 /* beard along the jaw */
    const hairGeo = keep(new THREE.SphereGeometry(1, 24, 14, 0, Math.PI * 2, 0, 1.7));
    const hairTop = part(hairGeo, hair, 0, 0.19, 0.02, 0.182, 0.208, 0.198, headG); hairTop.rotation.x = 0.42;
    /* curls: small tufts over the crown and the back of the head */
    for (let i = 0; i < 34; i++) {
      const th = rnd(i, 3, 1) * Math.PI * 2, ph = 0.15 + rnd(i, 5, 2) * 1.25, r = 0.04 + rnd(i, 7, 3) * 0.028;
      const x = Math.sin(ph) * Math.cos(th) * 0.165, y = 0.2 + Math.cos(ph) * 0.2, z = 0.02 + Math.sin(ph) * Math.sin(th) * 0.185;
      if (z < -0.1 && y < 0.32) continue;                                                          /* keep the forehead and face clear */
      part(ball, hair, x, y, z, r, r * 0.92, r, headG);
    }
    /* glasses: two rims, a bridge and the arms back to the ears */
    const lensRim = keep(new THREE.TorusGeometry(0.043, 0.006, 6, 20));
    [-1, 1].forEach((sd) => {
      part(lensRim, gear, sd * 0.072, 0.2, -0.186, 1.25, 0.9, 1, headG);
      part(box, gear, sd * 0.172, 0.205, -0.09, 0.008, 0.012, 0.2, headG);
    });
    part(box, gear, 0, 0.205, -0.19, 0.04, 0.008, 0.008, headG);

    buildId++;
    if (imageUrl) loadCutout(buildId); else if (modelUrl) loadModel(buildId); else ready = true;
    stage.appendChild(layer);
    stage.classList.add("mf3-intro-on");   /* lets the full-screen button show above this layer */
    resize();
  }

  function resize() {
    const nw = stage.clientWidth, nh = stage.clientHeight;
    if (!nw || !nh || (nw === w && nh === h)) return;
    w = nw; h = nh;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    c2d.width = Math.round(w * ratio); c2d.height = Math.round(h * ratio);
    /* sized to the old frame (for example before going full screen): rebuild when next needed */
    masks.length = 0; vision = null;
    /* end of the room shot: straight in front of the chosen character, past the controller's shoulder */
    near.set(focusWorld.x, focusWorld.y, 0.62);
    path = new THREE.CatmullRomCurve3([start, beside, near], false, "centripetal");
  }

  /* how much the flat code layer must be magnified to match what the camera sees at distance z */
  const zoomAt = (z) => c2d.height / ((2 * z * Math.tan((FOV * Math.PI) / 360)) / SCREEN.h * FIELD_H);

  /* ---------- optional modelled character (a .glb file with a standard humanoid skeleton) ----------
     The built-in figure above is used unless the host page names a model. The model is scaled to a
     person's height, turned to face the monitor and posed sitting with its hands at the keyboard by
     aiming its limb bones, so it works with the common rigs (Mixamo, Ready Player Me and similar)
     without needing a "sitting" animation in the file. Anything that fails falls back to the built-in figure. */
  function findBones(root) {
    const map = Object.create(null);
    root.traverse((o) => { if (o.isBone) { const n = o.name.toLowerCase().replace(/mixamorig\d*|[^a-z0-9]/g, ""); if (!map[n]) map[n] = o; } });
    const pick = (...names) => { for (const n of names) if (map[n]) return map[n]; return null; };
    const side = (L) => ({
      arm: pick(L + "arm", L + "upperarm", "upperarm" + L[0], "arm" + L[0]),
      fore: pick(L + "forearm", L + "lowerarm", "lowerarm" + L[0], "forearm" + L[0]),
      hand: pick(L + "hand", "hand" + L[0]),
      thigh: pick(L + "upleg", L + "upperleg", "upperleg" + L[0], "thigh" + L[0]),
      shin: pick(L + "leg", L + "lowerleg", "lowerleg" + L[0], "shin" + L[0]),
      foot: pick(L + "foot", "foot" + L[0])
    });
    return { hips: pick("hips", "pelvis", "root"), chest: pick("spine2", "chest", "upperchest", "spine1", "spine"), head: pick("head"), left: side("left"), right: side("right") };
  }
  /* turn a bone about its own length (bone to child), in world space */
  function roll(bone, child, angle) {
    if (!bone || !child || !bone.parent) return;
    const a = new THREE.Vector3(), b = new THREE.Vector3(), q = new THREE.Quaternion(), bw = new THREE.Quaternion(), pw = new THREE.Quaternion();
    bone.updateWorldMatrix(true, false); child.updateWorldMatrix(true, false);
    bone.getWorldPosition(a); child.getWorldPosition(b);
    q.setFromAxisAngle(b.sub(a).normalize(), angle);
    bone.getWorldQuaternion(bw); bone.parent.getWorldQuaternion(pw);
    bone.quaternion.copy(pw.invert().multiply(q.multiply(bw)));
    bone.updateMatrixWorld(true);
  }
  function aim(bone, child, x, y, z) {
    if (!bone || !child || !bone.parent) return;
    const a = new THREE.Vector3(), b = new THREE.Vector3(), q = new THREE.Quaternion(), bw = new THREE.Quaternion(), pw = new THREE.Quaternion();
    bone.updateWorldMatrix(true, false); child.updateWorldMatrix(true, false);
    bone.getWorldPosition(a); child.getWorldPosition(b);
    q.setFromUnitVectors(b.sub(a).normalize(), new THREE.Vector3(x, y, z).normalize());
    bone.getWorldQuaternion(bw); bone.parent.getWorldQuaternion(pw);
    bone.quaternion.copy(pw.invert().multiply(q.multiply(bw)));
    bone.updateMatrixWorld(true);
  }
  function seatModel(root) {
    root.updateMatrixWorld(true);
    const B = findBones(root);
    if (!B.hips || !B.head || !B.left.thigh || !B.right.thigh || !B.left.arm || !B.right.arm || !B.left.foot) throw new Error("skeleton not recognised");
    const hip = new THREE.Vector3(), w = new THREE.Vector3();
    /* Height is measured on the skeleton (sole to head joint), which is reliable whatever units
       the file was authored in; the head joint sits near the chin, so allow for the skull above it. */
    B.head.getWorldPosition(hip); B.left.foot.getWorldPosition(w);
    const tall = (hip.y - w.y) * 1.16;
    if (!(tall > 0)) throw new Error("empty model");
    root.scale.multiplyScalar(1.8 / tall);
    root.rotation.y = Math.PI;                       /* glTF characters face +Z; the monitor is toward -Z */
    root.position.set(0, 0, 1.24);
    root.updateMatrixWorld(true);
    /* glossy game materials turn black without studio lighting: make them plain cloth and skin */
    root.traverse((o) => { if (o.isMesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach((mt) => { if ("metalness" in mt) { mt.metalness = 0; mt.roughness = Math.max(0.75, mt.roughness || 0); } }); });
    B.hips.getWorldPosition(hip);
    [B.left, B.right].forEach((L) => {
      L.thigh.getWorldPosition(w);
      const sd = w.x >= hip.x ? 1 : -1;
      aim(L.thigh, L.shin, sd * 0.13, -0.03, -1);    /* thighs forward on the seat */
      aim(L.shin, L.foot, 0, -1, -0.1);              /* shins down */
      aim(L.arm, L.fore, sd * 0.22, -0.8, -0.5);     /* upper arms down and forward */
      aim(L.fore, L.hand, -sd * 0.26, 0.1, -1);      /* forearms reach in to the keyboard */
      roll(L.fore, L.hand, sd * ROLL);               /* palms down, onto the keys */
    });
    root.updateMatrixWorld(true);
    B.hips.getWorldPosition(hip);
    root.position.y += 0.66 - hip.y; root.position.z += 1.26 - hip.z;
    root.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
    modelIdle = { head: B.head, chest: B.chest, headQ: B.head ? B.head.quaternion.clone() : null, chestQ: B.chest ? B.chest.quaternion.clone() : null };
  }
  function loadModel(id) {
    ready = false;
    const settle = () => { if (id === buildId) { clearTimeout(loadTimer); ready = true; } };
    loadTimer = setTimeout(settle, 4000);            /* never keep the visitor waiting on a slow file */
    import("./vendor/three-0.187.0/GLTFLoader.min.js").then((m) => {
      new m.GLTFLoader().load(modelUrl, (gltf) => {
        if (id !== buildId || !scene) return;
        try {
          seatModel(gltf.scene);
          model = gltf.scene; scene.add(model);
          if (person) person.visible = false;
          /* a lower chair back, so the character's shoulders and head are in view */
          if (chairBack) { chairBack.scale.y = 0.36; chairBack.position.y = 0.7; }
        } catch (err) { model = null; }
        settle();
      }, undefined, settle);
    }).catch(settle);
  }
  /* ---------- optional photo cutout ----------
     A picture of a seated person with a transparent background, stood upright in the room as a flat
     card. The picture this was tuned for is a three-quarter view from behind and to the right, so
     the card is angled to match and the keyboard is moved under the hands. The camera keeps to the
     side the picture was taken from, and the card fades out as the camera passes it. */
  const CUT = { yaw: 0.986, hipU: 0.247, feetV: 0.959, seated: 1.35, lift: 0.06, hip: new THREE.Vector3(0, 0, 1.22) };
  const cutNormal = new THREE.Vector3(Math.sin(CUT.yaw), 0, Math.cos(CUT.yaw)), cutRight = new THREE.Vector3(Math.cos(CUT.yaw), 0, -Math.sin(CUT.yaw));
  function loadCutout(id) {
    ready = false;
    const settle = () => { if (id === buildId) { clearTimeout(loadTimer); ready = true; } };
    loadTimer = setTimeout(settle, 4000);
    new THREE.TextureLoader().load(imageUrl, (tex) => {
      if (id !== buildId || !scene) { tex.dispose(); return; }
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      const iw = tex.image.width, ih = tex.image.height;
      /* the seated figure fills most of the picture height: size the card so he is life-size */
      const hgt = CUT.seated / 0.94, wid = hgt * (iw / ih);
      const m = new THREE.Mesh(keep(new THREE.PlaneGeometry(wid, hgt)),
        keep(new THREE.MeshBasicMaterial({ map: keep(tex), color: 0xA9C4B4, transparent: true, alphaTest: 0.08, side: THREE.DoubleSide, fog: false })));
      m.rotation.y = CUT.yaw;
      m.position.copy(CUT.hip).addScaledVector(cutRight, (0.5 - CUT.hipU) * wid);
      m.position.y = CUT.lift - (1 - CUT.feetV) * hgt + hgt / 2;
      scene.add(m); cutout = m;
      if (person) person.visible = false;
      if (chairBack) { chairBack.scale.y = 0.36; chairBack.position.y = 0.7; }
      /* keyboard and mouse under his hands */
      keyboard.position.set(0.34, 0.795, 0.67); keyboard.rotation.y = -0.585;
      mouse.position.set(0.74, 0.795, 0.52); mouse.rotation.y = -0.585;
      beside.set(1.2, 1.66, 2.05);
      w = h = 1;                                       /* rebuild the camera path on the next frame */
      settle();
    }, undefined, settle);
  }

  const idleE = new THREE.Euler(), idleQ = new THREE.Quaternion();
  const ROLL = 3.0;

  /* small signs of life: breathing, a slow turn of the head, fingers on the keys */
  function livePerson() {
    if (cutout) {
      const d = tmp.copy(camera.position).sub(CUT.hip).dot(cutNormal);
      cutout.material.opacity = clamp01((d - 0.2) / 0.55);
      cutout.visible = cutout.material.opacity > 0.01;
      return;
    }
    if (model && modelIdle) {
      if (modelIdle.head) modelIdle.head.quaternion.copy(modelIdle.headQ).multiply(idleQ.setFromEuler(idleE.set(Math.sin(clock * 0.31) * 0.04, Math.sin(clock * 0.42) * 0.1, 0)));
      if (modelIdle.chest) modelIdle.chest.quaternion.copy(modelIdle.chestQ).multiply(idleQ.setFromEuler(idleE.set(Math.sin(clock * 1.5) * 0.012, 0, 0)));
      return;
    }
    if (!person) return;
    torsoMesh.scale.y = 1 + Math.sin(clock * 1.5) * 0.008;
    headG.rotation.y = Math.sin(clock * 0.42) * 0.09; headG.rotation.x = Math.sin(clock * 0.31) * 0.03;
    /* typing: single fingers lift a little, each on its own rhythm; the hands themselves stay put */
    hands.forEach((f, i) => { f.position.y = 0.83 + Math.max(0, Math.sin(clock * (6 + (i % 4) * 1.7) + i * 2.3)) * 0.014; });
  }

  /* The glimpse inside the screen: the floor itself, seen as code. The real floor underneath is
     sampled once and redrawn as green characters whose brightness follows the picture, so desks
     and seated agents appear as figures made of code before the real floor comes through. */
  /* Character grids are drawn once, ahead of time, and reused as stencils: each frame is then
     two image copies instead of thousands of letters, which keeps the glimpse smooth. */
  const masks = [];
  function buildMask() {
    const cell = Math.max(9, Math.round(c2d.width / 170));
    const cv = document.createElement("canvas"); cv.width = c2d.width; cv.height = c2d.height;
    const g = cv.getContext("2d"), n = masks.length;
    g.font = "600 " + (cell * 1.08).toFixed(1) + 'px "IBM Plex Mono", ui-monospace, monospace';
    g.textAlign = "center"; g.textBaseline = "middle";
    for (let r = 0; r * cell < cv.height; r++) for (let c = 0; c * cell < cv.width; c++) {
      g.fillStyle = "rgba(255,255,255," + (0.55 + rnd(c, r, n + 11) * 0.45).toFixed(2) + ")";
      g.fillText(GLYPHS[Math.floor(rnd(c, r, n * 7 + 3) * GLYPHS.length)], (c + 0.5) * cell, (r + 0.5) * cell);
    }
    masks.push(cv);
  }
  function sampleFloor() {
    const floor = getFloorCanvas();
    const sw = Math.max(2, Math.round(c2d.width / 3)), sh = Math.max(2, Math.round(c2d.height / 3));
    const cv = document.createElement("canvas"); cv.width = sw; cv.height = sh;
    const g = cv.getContext("2d", { willReadFrequently: true });
    try {
      if (!floor || !floor.width) throw new Error("no floor");
      g.drawImage(floor, 0, 0, sw, sh);
      const img = g.getImageData(0, 0, sw, sh), d = img.data, count = sw * sh;
      let lo = 1, hi = 0, mean = 0;
      for (let i = 0; i < count; i++) { const v = (d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11) / 255 * (d[i * 4 + 3] / 255); mean += v; if (v < lo) lo = v; if (v > hi) hi = v; }
      mean /= count;
      const span = Math.max(0.05, hi - lo), invert = (mean - lo) / span > 0.55;   /* a bright (day) floor: figures are the dark parts */
      for (let i = 0; i < count; i++) {
        let v = ((d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11) / 255 * (d[i * 4 + 3] / 255) - lo) / span;
        v = invert ? Math.pow(1 - v, 1.8) : Math.pow(v, 0.55);   /* lift the mid-tones so walls, desks and figures all read */
        const hot = v * v * v;
        d[i * 4] = 30 + 205 * hot; d[i * 4 + 1] = 120 + 135 * Math.min(1, v * 1.6); d[i * 4 + 2] = 70 + 150 * hot;
        d[i * 4 + 3] = 255 * Math.min(1, 0.14 + v * 1.3);
      }
      g.putImageData(img, 0, 0);
      return { img: cv };
    } catch (err) {
      g.fillStyle = "rgba(60,255,120,.35)"; g.fillRect(0, 0, sw, sh);
      return { img: cv };
    }
  }
  function drawVision(k) {
    const W = c2d.width, H = c2d.height;
    while (masks.length < 3) buildMask();
    ctx2.setTransform(1, 0, 0, 1, 0, 0);
    ctx2.globalCompositeOperation = "source-over";
    ctx2.clearRect(0, 0, W, H);
    /* still travelling inward: the picture settles from magnified to exact */
    const z = 1 + (1 - ease(clamp01(k * 1.25))) * 0.3;
    ctx2.setTransform(z, 0, 0, z, (W - W * z) / 2, (H - H * z) / 2);
    ctx2.imageSmoothingEnabled = true;
    ctx2.drawImage(vision.img, 0, 0, W, H);
    /* a bright band sweeps down, as if the picture were being read line by line */
    const y = ((clock * 0.5) % 1.25) * H, band = ctx2.createLinearGradient(0, y - H * 0.07, 0, y + H * 0.02);
    band.addColorStop(0, "rgba(190,255,205,0)"); band.addColorStop(1, "rgba(190,255,205,.5)");
    ctx2.globalCompositeOperation = "source-atop";
    ctx2.fillStyle = band; ctx2.fillRect(0, y - H * 0.07, W, H * 0.09);
    /* keep the picture only where the characters are */
    ctx2.globalCompositeOperation = "destination-in";
    ctx2.setTransform(1, 0, 0, 1, 0, 0);
    ctx2.drawImage(masks[Math.floor(clock * 9) % masks.length], 0, 0);
    ctx2.globalCompositeOperation = "destination-over";
    ctx2.fillStyle = "#010603"; ctx2.fillRect(0, 0, W, H);
    ctx2.globalCompositeOperation = "source-over";
  }

  function frameIn(dt) {
    t += dt;
    const total = IN.room + IN.dive + IN.vision + IN.reveal;
    if (t < IN.room + 250) {
      /* a beat on the wide shot first, drifting slightly, then the move in */
      const k = ease(clamp01((t - IN.hold) / (IN.room - IN.hold)));
      path.getPoint(k, camera.position);
      camera.position.x += Math.sin(clock * 0.6) * 0.05 * (1 - k); camera.position.y += Math.sin(clock * 0.45) * 0.03 * (1 - k);
      look.set(0, SCREEN.y - 0.15, 0).lerp(focusWorld, clamp01(k * 1.25));
      camera.lookAt(look);
      drawRain(screenCtx, FIELD_W, FIELD_H, clock, 1, FIELD_W / 2, FIELD_H / 2, 0);
      screenTex.needsUpdate = true;
      livePerson();
      renderer.render(scene, camera);
      /* prepare the stencils for the glimpse a little at a time, while nothing else is busy */
      if (t > 1800 && masks.length < 3 && Math.floor(t / 400) > masks.length + 4) buildMask();
    }
    const fade = clamp01((t - (IN.room - 900)) / 650);
    c3.style.opacity = String(1 - fade);
    if (t >= IN.room + IN.dive) {
      if (!vision) vision = sampleFloor();
      const k = clamp01((t - IN.room - IN.dive) / IN.vision);
      drawVision(k);
      flash.style.opacity = String(1 - clamp01(k / 0.22));
    }
    else if (fade > 0) {
      const k = clamp01((t - IN.room) / IN.dive);
      const z0 = zoomAt(near.z - 0.03), zoom = z0 * Math.pow(90 / z0 < 2 ? 2 : 90 / z0, ease(k));
      drawRain(ctx2, c2d.width, c2d.height, clock, zoom, FOCUS_X, FOCUS_Y, clamp01(k * 1.6));
      flash.style.opacity = String(clamp01((k - 0.72) / 0.28));
    }
    if (t >= IN.room + IN.dive + IN.vision) {
      /* the floor is underneath: let it through */
      if (!closing) { closing = true; stage.classList.add("mf3-revealing"); btnSkip.hidden = true; }
      layer.style.opacity = String(1 - clamp01((t - IN.room - IN.dive - IN.vision) / IN.reveal));
    }
    if (t >= total) finish();
  }

  function frameOut(dt) {
    t += dt;
    const total = OUT.fade + OUT.pull + OUT.hold + OUT.leave;
    layer.style.opacity = String(Math.min(clamp01(t / OUT.fade), 1 - clamp01((t - (total - OUT.leave)) / OUT.leave)));
    const k = ease(clamp01((t - OUT.fade * 0.4) / OUT.pull));
    camera.position.lerpVectors(beside, start, k);
    tmp.set(0.25, 0.1, 0.6); camera.position.addScaledVector(tmp, Math.sin(k * Math.PI) * 0.5);
    look.set(0, SCREEN.y - 0.12 * k, 0);
    camera.lookAt(look);
    /* the monitor now shows the floor itself */
    const floor = getFloorCanvas();
    screenCtx.fillStyle = "#05080F"; screenCtx.fillRect(0, 0, FIELD_W, FIELD_H);
    if (floor && floor.width && floor.height) {
      const s = Math.max(FIELD_W / floor.width, FIELD_H / floor.height), dw = floor.width * s, dh = floor.height * s;
      try { screenCtx.drawImage(floor, (FIELD_W - dw) / 2, (FIELD_H - dh) / 2, dw, dh); } catch (err) { /* keep the dark screen */ }
    }
    screenTex.needsUpdate = true;
    livePerson();
    renderer.render(scene, camera);
    caption.style.opacity = String(Math.min(clamp01((t - OUT.fade - OUT.pull * 0.7) / 700), 1 - clamp01((t - (total - OUT.leave)) / 400)));
    if (t >= total) finish();
  }

  function finish() {
    const cb = done;
    teardown();
    if (cb) cb();
  }
  function skip() {
    if (!mode) return;
    if (mode === "in") { t = Math.max(t, IN.room + IN.dive + IN.vision); flash.style.opacity = "0"; c3.style.opacity = "0"; }
    else t = Math.max(t, OUT.fade + OUT.pull + OUT.hold);
  }
  function teardown() {
    mode = null; done = null; closing = false; vision = null; masks.length = 0;
    buildId++; clearTimeout(loadTimer); ready = true; modelIdle = null; cutout = keyboard = mouse = null; beside.copy(BESIDE);
    if (model) {
      model.traverse((o) => {
        if (!o.isMesh) return;
        o.geometry.dispose();
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((mt) => { Object.keys(mt).forEach((k) => { if (mt[k] && mt[k].isTexture) mt[k].dispose(); }); mt.dispose(); });
      });
      model = null;
    } person = torsoMesh = headG = null; hands = [];
    if (btnSkip) btnSkip.removeEventListener("click", skip);
    trash.forEach((x) => x.dispose()); trash.length = 0;
    if (renderer) {
      renderer.dispose();
      const lose = gl && gl.getExtension("WEBGL_lose_context");
      if (lose) lose.loseContext();
    }
    if (layer && layer.parentNode) layer.parentNode.removeChild(layer);
    stage.classList.remove("mf3-intro-on");
    layer = renderer = gl = scene = camera = c3 = c2d = ctx2 = screenCv = screenCtx = screenTex = flash = caption = btnSkip = null;
    w = h = 1;
  }

  return {
    isPlaying: () => !!mode,
    /* which: "in" (opening) or "out" (closing). Calls onDone when finished or skipped. */
    play(which, onDone) {
      if (mode) return;
      if (reduce()) { if (onDone) onDone(); return; }
      try { build(); } catch (err) { teardown(); if (onDone) onDone(); return; }
      mode = which === "out" ? "out" : "in"; t = 0; done = onDone || null;
      stage.classList.remove("mf3-revealing");
      if (mode === "out") { layer.style.opacity = "0"; c2d.style.display = "none"; flash.style.display = "none"; btnSkip.textContent = "Back to the floor"; }
      else { caption.style.display = "none"; }
    },
    frame(realMs) {
      if (!mode) return;
      if (!ready) return;                              /* a named character file is still arriving */
      resize();
      clock += realMs / 1000;
      if (mode === "in") frameIn(realMs); else frameOut(realMs);
    },
    skip,
    destroy() { done = null; teardown(); }
  };
}
