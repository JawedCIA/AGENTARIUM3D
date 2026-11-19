/* The flat isometric floor from the original 2D version, ported so it can stand in for the 3D
   scene when WebGL is missing or the scene fails. Same drawing, same data; it implements
   the small "view" interface main.js expects. */

import { FLOOR, PLANTS } from "./data.js";

const U = 32, V = 16, ZH = 26;
const W = FLOOR.W, D = FLOOR.D, WALL = FLOOR.WALL;
const NS = "http://www.w3.org/2000/svg";

const C = {
  floor: ["#0E1830", "#0A1226", "#070C1B"],
  wallA: "#111C36", wallB: "#0D162C",
  desk: ["#DCE3F0", "#A9B5CC", "#8E9BB5"],
  leg: ["#6B7896", "#55627F", "#48546F"],
  bezel: ["#27365A", "#141E36", "#0F172B"],
  chair: ["#26335A", "#182340", "#121A30"],
  body: {
    build: ["#97A2FF", "#7F8CFF", "#6471E6"],
    gate: ["#FFC255", "#F5A623", "#D48C14"],
    gtm: ["#6FE3C3", "#3FD0A8", "#2FB08D"],
    founder: ["#FFFFFF", "#E8EDF7", "#C3CCDF"]
  },
  zoneStroke: { delivery: "#2B3C68", gtm: "#1F5A52", command: "#4A4F63" },
  zoneFill: { delivery: "#7F8CFF0A", gtm: "#3FD0A80A", command: "#E8EDF708" },
  zoneText: { delivery: "#8FA0FF", gtm: "#3FD0A8", command: "#9AA8C4" }
};

function P(x, y, z) { return [(x - y) * U, (x + y) * V - (z || 0) * ZH]; }
function pts(arr) {
  return arr.map((p) => { const q = P(p[0], p[1], p[2]); return q[0].toFixed(1) + "," + q[1].toFixed(1); }).join(" ");
}
function s(tag, attrs, parent) {
  const n = document.createElementNS(NS, tag);
  if (attrs) Object.keys(attrs).forEach((k) => n.setAttribute(k, attrs[k]));
  if (parent) parent.appendChild(n);
  return n;
}
function poly(parent, arr, fill, extra) {
  return s("polygon", Object.assign({ points: pts(arr), fill }, extra), parent);
}
/* c = [top, leftFace, rightFace] */
function box(parent, x, y, z, w, d, h, c) {
  poly(parent, [[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]], c[1]);
  poly(parent, [[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]], c[2]);
  poly(parent, [[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]], c[0]);
}
function txt(parent, str, attrs) { const t = s("text", attrs, parent); t.textContent = str; return t; }

export function createSvgFloor(ctx) {
  const { viewEl, agents, agentById, events, reduce } = ctx;
  const ZONES = ctx.zones, STAGES = ctx.stageOrder.length;
  const scroll = document.createElement("div");
  scroll.className = "mf3-scroll";
  const svg = s("svg", { "class": "mf3-svg", role: "img",
    "aria-label": ctx.text.canvasLabel.replace("3D ", "Isometric ") }, scroll);

  const minX = P(0, D, 0)[0] - 30, maxX = P(W, 0, 0)[0] + 30;
  const minY = P(0, 0, WALL)[1] - 24, maxY = P(W, D, -0.4)[1] + 24;
  svg.setAttribute("viewBox", [minX, minY, maxX - minX, maxY - minY].join(" "));

  const gBase = s("g", null, svg), gObjects = s("g", null, svg),
    gPacket = s("g", { "class": "packet", opacity: "0" }, svg), gPills = s("g", null, svg);

  /* walls and floor */
  poly(gBase, [[0, 0, 0], [0, D, 0], [0, D, WALL], [0, 0, WALL]], C.wallB);
  poly(gBase, [[0, 0, 0], [W, 0, 0], [W, 0, WALL], [0, 0, WALL]], C.wallA);
  poly(gBase, [[0, 0, WALL], [W, 0, WALL]], "none", { stroke: "#22335C", "stroke-width": 1 });
  poly(gBase, [[0, 0, WALL], [0, D, WALL]], "none", { stroke: "#1A2848", "stroke-width": 1 });
  poly(gBase, [[0, D, 0], [W, D, 0], [W, D, -0.4], [0, D, -0.4]], C.floor[1]);
  poly(gBase, [[W, 0, 0], [W, D, 0], [W, D, -0.4], [W, 0, -0.4]], C.floor[2]);
  poly(gBase, [[0, 0, 0], [W, 0, 0], [W, D, 0], [0, D, 0]], C.floor[0]);

  /* windows on the left wall */
  (function () {
    const o = P(0, 0, 0), g = s("g", { transform: "matrix(-1,0.5,0,1," + o[0] + "," + o[1] + ")" }, gBase);
    [1.6, 5, 8.4].forEach((y0) => {
      const x = y0 * U, y = -3.5 * ZH, w = 2.5 * U, h = 2.3 * ZH;
      s("rect", { x, y, width: w, height: h, fill: "#16254A", stroke: "#2B3C68", "stroke-width": 1 }, g);
      s("line", { x1: x + w / 2, y1: y, x2: x + w / 2, y2: y + h, stroke: "#2B3C68", "stroke-width": 1 }, g);
      s("line", { x1: x, y1: y + h * 0.42, x2: x + w, y2: y + h * 0.42, stroke: "#2B3C68", "stroke-width": 1 }, g);
    });
  })();

  /* back wall: wordmark, pipeline board, card wall */
  const segs = [];
  let boardTitle, boardSub;
  (function () {
    const o = P(0, 0, 0), g = s("g", { transform: "matrix(1,0.5,0,1," + o[0] + "," + o[1] + ")" }, gBase);
    txt(g, ctx.text.wallName, { x: 2.2 * U, y: -2.55 * ZH, "class": "wall-word", "font-size": 19, fill: "#3A4C7C" });
    txt(g, ctx.text.wallLine, { x: 2.2 * U, y: -1.85 * ZH, "class": "board-t", fill: "#33436E" });

    const bx = 10.2 * U, by = -3.7 * ZH, bw = 8.4 * U, bh = 2.7 * ZH;
    s("rect", { x: bx, y: by, width: bw, height: bh, rx: 4, fill: "#070C1B", stroke: "#2B3C68", "stroke-width": 1 }, g);
    txt(g, "PIPELINE", { x: bx + 12, y: by + 17, "class": "board-t", fill: "#647290" });
    boardTitle = txt(g, "", { x: bx + 12, y: by + 34, "class": "board-t", "font-size": 11, fill: "#E8EDF7" });
    boardSub = txt(g, "", { x: bx + 12, y: by + 48, "class": "board-t", fill: "#9AA8C4" });
    const sw = (bw - 24 - (STAGES - 1) * 4) / STAGES;
    for (let i = 0; i < STAGES; i++) {
      segs.push(s("rect", { x: bx + 12 + i * (sw + 4), y: by + bh - 15, width: sw, height: 6, rx: 2, "class": "seg" }, g));
    }

    const kx = 20.6 * U, ky = -3.5 * ZH, cols = ["#7F8CFF", "#F5A623", "#3FD0A8", "#9AA8C4", "#7F8CFF"];
    for (let c = 0; c < 6; c++) for (let r = 0; r < 3; r++) {
      if ((c * 3 + r) % 5 === 4) continue;
      s("rect", { x: kx + c * 19, y: ky + r * 17, width: 14, height: 12, rx: 2, fill: cols[(c + r * 2) % cols.length], opacity: 0.55 }, g);
    }
  })();

  /* zones */
  const zoneEls = Object.create(null);
  ZONES.forEach((z) => {
    zoneEls[z.id] = poly(gBase, [[z.x, z.y, 0], [z.x + z.w, z.y, 0], [z.x + z.w, z.y + z.d, 0], [z.x, z.y + z.d, 0]],
      C.zoneFill[z.div], { "class": "zone", stroke: C.zoneStroke[z.div], "stroke-width": 1.5, "stroke-linejoin": "round" });
    const o = P(z.x + 0.3, z.y + z.d - 0.22, 0);
    txt(gBase, z.name.toUpperCase(), { transform: "matrix(1,0.5,-1,0.5," + o[0].toFixed(1) + "," + o[1].toFixed(1) + ")",
      "class": "zone-label", fill: C.zoneText[z.div], opacity: 0.8 });
  });

  /* desks, figures and plants, drawn back to front */
  const parts = Object.create(null), objects = [];
  agents.forEach((a) => objects.push({ key: a.x + a.y, agent: a }));
  PLANTS.forEach((p) => objects.push({ key: p[0] + p[1], plant: p }));
  objects.sort((a, b) => a.key - b.key);

  function drawPlant(p) {
    const g = s("g", null, gObjects), x = p[0], y = p[1];
    box(g, x, y, 0, 0.4, 0.4, 0.35, ["#C9D2E4", "#9AA8C4", "#7C8AA8"]);
    const t = P(x + 0.2, y + 0.2, 0.35);
    [[-7, -16, -24], [0, -22, 0], [7, -16, 24]].forEach((l) => {
      s("ellipse", { cx: t[0] + l[0], cy: t[1] + l[1], rx: 4, ry: 13, fill: "#2FA27E",
        transform: "rotate(" + l[2] + " " + (t[0] + l[0]) + " " + (t[1] + l[1]) + ")" }, g);
    });
  }

  function drawDesk(a) {
    const x = a.x, y = a.y, cx = a.cx, cy = a.cy;
    const g = s("g", { "class": "desk", "data-agent": a.id, "data-state": "idle" }, gObjects);
    poly(g, [[x - 0.2, y - 0.15, 0], [x + 2, y - 0.15, 0], [x + 2, y + 2.05, 0], [x - 0.2, y + 2.05, 0]], "none", { "class": "pad" });

    box(g, x, y + 0.05, 0, 0.07, 0.7, 0.62, C.leg);
    box(g, x + 1.73, y + 0.05, 0, 0.07, 0.7, 0.62, C.leg);
    box(g, x, y, 0.62, 1.8, 0.8, 0.08, C.desk);
    [x + 0.3, x + 0.96].forEach((mx) => {
      box(g, mx + 0.23, y + 0.2, 0.7, 0.08, 0.08, 0.1, C.bezel);
      box(g, mx, y + 0.2, 0.8, 0.54, 0.06, 0.4, C.bezel);
      const ys = y + 0.262;
      poly(g, [[mx + 0.04, ys, 0.84], [mx + 0.5, ys, 0.84], [mx + 0.5, ys, 1.16], [mx + 0.04, ys, 1.16]], "", { "class": "screen" });
    });
    poly(g, [[x + 0.62, y + 0.5, 0.702], [x + 1.18, y + 0.5, 0.702], [x + 1.18, y + 0.68, 0.702], [x + 0.62, y + 0.68, 0.702]], "#B4BFD6");

    box(g, cx - 0.04, cy - 0.04, 0, 0.08, 0.08, 0.38, C.chair);
    box(g, cx - 0.3, cy - 0.3, 0.38, 0.6, 0.6, 0.08, C.chair);
    box(g, cx - 0.22, cy - 0.16, 0.46, 0.44, 0.3, 0.62, C.body[a.kind] || C.body.build);
    box(g, cx - 0.3, cy + 0.22, 0.44, 0.6, 0.08, 0.44, C.chair);
    const hd = P(cx, cy, 1.33);
    s("circle", { cx: hd[0], cy: hd[1], r: 8.5, fill: "#E8EDF7", stroke: "#B9C3D9", "stroke-width": 1 }, g);
    s("rect", { x: hd[0] - 5.5, y: hd[1] - 2, width: 11, height: 4, rx: 2, fill: "#111C36" }, g);
    s("line", { x1: hd[0], y1: hd[1] - 8.5, x2: hd[0], y2: hd[1] - 13, stroke: "#B9C3D9", "stroke-width": 1.5 }, g);
    s("circle", { cx: hd[0], cy: hd[1] - 14.5, r: 2.8, "class": "lamp" }, g);

    const c = P(x + 0.9, y + 0.95, 0.6);
    s("rect", { x: c[0] - 36, y: c[1] - 34, width: 72, height: 66, fill: "#fff", "fill-opacity": 0 }, g);

    const label = a.pill || a.name.split(" ")[0], pw = Math.round(label.length * 7.2 + 34);
    const pg = s("g", { "class": "pill", "data-agent": a.id, "data-state": "idle", "data-gate": a.kind === "gate" ? "true" : "false",
      transform: "translate(" + hd[0].toFixed(1) + "," + (hd[1] - 34).toFixed(1) + ")" }, gPills);
    s("rect", { x: -pw / 2, y: -11, width: pw, height: 22, rx: 11 }, pg);
    s("circle", { cx: -pw / 2 + 12, cy: 0, r: 4, "class": "halo" }, pg);
    s("circle", { cx: -pw / 2 + 12, cy: 0, r: 4, "class": "dot" }, pg);
    txt(pg, label, { x: -pw / 2 + 22, y: 4 });
    parts[a.id] = { desk: g, pill: pg, anchor: P(cx, cy + 0.8, 0.05) };
  }

  objects.forEach((o) => { if (o.plant) drawPlant(o.plant); else drawDesk(o.agent); });

  s("circle", { r: 11, fill: "#FFFFFF", opacity: 0.18 }, gPacket);
  s("circle", { r: 4.5, fill: "#FFFFFF" }, gPacket);

  /* ---------- events ---------- */
  const offs = [];
  const on = (type, fn) => { svg.addEventListener(type, fn); offs.push(() => svg.removeEventListener(type, fn)); };
  const idFrom = (e) => {
    const t = e.target && e.target.closest ? e.target.closest("[data-agent]") : null;
    return t ? t.getAttribute("data-agent") : null;
  };
  on("pointerover", (e) => { const id = idFrom(e); if (id) events.hover(id); });
  on("pointerout", (e) => { if (idFrom(e)) events.hover(null); });
  on("click", (e) => { events.pick(idFrom(e)); });

  /* ---------- packet ---------- */
  let move = null, packetAt = null;
  const pending = new Set();
  const putPacket = (p) => gPacket.setAttribute("transform", "translate(" + p[0].toFixed(1) + "," + p[1].toFixed(1) + ")");
  function placeItem(id) {
    move = null;
    const p = id && parts[id] ? parts[id].anchor : null;
    packetAt = p;
    gPacket.setAttribute("opacity", p ? "1" : "0");
    if (p) putPacket(p);
  }

  viewEl.insertBefore(scroll, viewEl.firstChild);
  scroll.scrollLeft = (scroll.scrollWidth - scroll.clientWidth) / 2;

  return {
    kind: "svg",
    setState(id, state) {
      const p = parts[id]; if (!p) return;
      p.desk.setAttribute("data-state", state); p.pill.setAttribute("data-state", state);
    },
    setHot(id, isOn) {
      const p = parts[id]; if (!p) return;
      p.desk.classList.toggle("is-hot", isOn); p.pill.classList.toggle("is-hot", isOn);
    },
    setBoard(item, stageId, closed, order) {
      const z = stageId ? ctx.zoneById[stageId] : null, idx = z ? order.indexOf(z.id) : -1;
      const text = String(item || "");
      boardTitle.textContent = text.length > 34 ? text.slice(0, 33) + "…" : text;
      boardSub.textContent = z ? "STAGE: " + z.name.toUpperCase() : "";
      segs.forEach((el, i) => {
        el.setAttribute("class", "seg" + (closed ? " is-done" : idx < 0 ? "" : i < idx ? " is-done" : i === idx ? " is-now" : ""));
      });
    },
    setHalt(zoneId) {
      Object.keys(zoneEls).forEach((k) => zoneEls[k].classList.toggle("is-halted", k === zoneId));
    },
    placeItem,
    handoff(fromId, toId) {
      const to = parts[toId]; if (!to) return Promise.resolve();
      const from = packetAt;
      if (reduce() || !from) { placeItem(toId); return ctx.clock.wait(200); }
      gPacket.setAttribute("opacity", "1");
      return new Promise((resolve) => {
        pending.add(resolve);
        move = { from, to: to.anchor, t: 0, done() { packetAt = to.anchor; pending.delete(resolve); resolve(); } };
      });
    },
    settle() { return Promise.resolve(); },
    resetActors() {
      move = null;
      const p = Array.from(pending); pending.clear();
      p.forEach((fn) => fn());
    },
    frame(simMs) {
      if (!move) return;
      move.t = Math.min(1, move.t + simMs / 850);
      const t = move.t, e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      putPacket([move.from[0] + (move.to[0] - move.from[0]) * e, move.from[1] + (move.to[1] - move.from[1]) * e]);
      if (t >= 1) { const m = move; move = null; m.done(); }
    },
    anchor(id) {
      const p = parts[id]; if (!p) return null;
      const vr = viewEl.getBoundingClientRect(), pr = p.pill.getBoundingClientRect();
      return { left: pr.left - vr.left, right: pr.right - vr.left, top: pr.top - vr.top };
    },
    flyTo() {}, resetView() {}, setFollow() {}, setInteractive() {},
    destroy() {
      offs.forEach((off) => off()); offs.length = 0;
      move = null;
      if (scroll.parentNode) scroll.parentNode.removeChild(scroll);
    }
  };
}
