/* The delivery floor, 3D version.
   mount(host, options) builds the whole section inside `host` and returns { destroy }.
   Nothing is written to window, every class is prefixed mf3-, and all text goes in
   through textContent. See DOCS.md at the top of the repository for embedding and live status. */

import { LAYOUTS, textFor, arrange } from "./layouts.js";
import { makeClock, createRunner } from "./runner.js";

function h(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

/* A view that draws nothing. Used until the scene loads, and kept if both the scene and
   the SVG fallback fail, so the status bar and the agent list still work. */
function nullView() {
  const done = () => Promise.resolve();
  return {
    kind: "none", setState() {}, setHot() {}, setBoard() {}, setHalt() {}, placeItem() {},
    handoff: done, settle: done, resetActors() {}, anchor: () => null, frame() {},
    flyTo() {}, resetView() {}, setFollow() {}, setInteractive() {}, nudge() {}, cameraState: () => null, destroy() {}
  };
}

/* Builds one floor for one layout. mount() below owns the layout switcher and calls this again
   when the visitor picks another company type. */
function mountOne(host, opts, preset, switcher, focusSwitch) {
  /* Version C keeps the human outside the floor, at the controller's desk in the intro. */
  if (opts.hideLead === true) {
    preset = Object.assign({}, preset, {
      agents: preset.agents.filter((a) => a.kind !== "founder"),
      zones: preset.zones.filter((z) => z.div !== "command")
    });
  }
  const TEXT = textFor(preset, opts), ZONES = preset.zones, STAGE_ORDER = preset.stageOrder;
  /* Live status describes the real IT floor only; concept layouts always play their scripted run. */
  const statusUrl = !preset.concept && typeof opts.statusUrl === "string" && opts.statusUrl.trim() ? opts.statusUrl.trim() : null;
  const pollMs = Math.max(2000, Number(opts.pollMs) || 5000);
  let look = opts.look === "day" ? "day" : "night";
  const figures = opts.figures === "people" || (opts.figures !== "robots" && look === "day") ? "people" : "robots";
  const NS = "http://www.w3.org/2000/svg";
  /* Small line icons, drawn here so no icon file or font is needed. */
  function icon(paths, flip) {
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("aria-hidden", "true"); svg.setAttribute("class", "mf3-ico");
    if (flip) svg.setAttribute("transform", "scale(-1,1)");
    paths.forEach((d) => { const p = document.createElementNS(NS, "path"); p.setAttribute("d", d); svg.appendChild(p); });
    return svg;
  }
  function iconButton(label, paths, flip) {
    const b = h("button", "mf3-btn mf3-iconbtn");
    b.type = "button"; b.setAttribute("aria-label", label); b.title = label;
    b.appendChild(icon(paths, flip));
    return b;
  }

  const { agents, agentById, zoneById } = arrange(preset, opts);
  const offs = [];
  const on = (target, type, fn, o) => { target.addEventListener(type, fn, o); offs.push(() => target.removeEventListener(type, fn, o)); };
  const media = (q) => (window.matchMedia ? window.matchMedia(q) : { matches: false });
  const mqReduce = media("(prefers-reduced-motion: reduce)");
  const mqNarrow = media("(max-width:760px)");
  const mqTouch = media("(hover: none), (pointer: coarse)");
  const reduce = () => mqReduce.matches;

  /* ---------- markup ---------- */
  const root = h("section", "mf3");
  root.setAttribute("aria-label", "The delivery floor");
  root.setAttribute("data-look", look);
  const shell = h("div", "mf3-shell");
  root.appendChild(shell);
  shell.appendChild(h("p", "mf3-eyebrow", TEXT.eyebrow));
  shell.appendChild(h("h2", "mf3-title", TEXT.heading));
  shell.appendChild(h("p", "mf3-lede", TEXT.lede));

  /* company-type switcher */
  let activeTab = null;
  if (switcher) {
    const tabs = h("div", "mf3-layouts");
    tabs.setAttribute("role", "group"); tabs.setAttribute("aria-label", "Company type");
    tabs.appendChild(h("span", "mf3-layouts-label", "Company type"));
    switcher.ids.forEach((id) => {
      const L = LAYOUTS[id], b = h("button", "mf3-tab");
      b.type = "button"; b.setAttribute("data-layout", id);
      b.setAttribute("aria-pressed", id === preset.id ? "true" : "false");
      b.appendChild(h("span", null, L.label));
      if (L.concept) b.appendChild(h("small", null, "Concept"));
      tabs.appendChild(b);
      if (id === preset.id) activeTab = b;
    });
    shell.appendChild(tabs);
  }

  const bar = h("div", "mf3-bar");
  const elMode = h("span", "mf3-mode", statusUrl ? TEXT.liveBadge : TEXT.demoBadge);
  elMode.setAttribute("data-live", statusUrl ? "true" : "false");
  const itemWrap = h("div", "mf3-item");
  const elItem = h("span", null, "Starting up");
  const elStage = h("small", null, " ");
  itemWrap.appendChild(elItem); itemWrap.appendChild(elStage);
  const btnTour = h("button", "mf3-btn mf3-btn-tour", "Take the tour");
  btnTour.type = "button";
  const btnPause = h("button", "mf3-btn", "Pause");
  btnPause.type = "button"; btnPause.setAttribute("aria-pressed", "false");
  const btnLook = h("button", "mf3-btn mf3-btn-look");
  btnLook.type = "button"; btnLook.hidden = true;
  const lookText = h("span");
  btnLook.appendChild(icon(["M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4", "M12 8a4 4 0 1 0 0 8a4 4 0 0 0 0-8z"]));
  btnLook.appendChild(icon(["M20 14.5A8 8 0 0 1 9.5 4a7 7 0 1 0 10.5 10.5z"]));
  btnLook.appendChild(lookText);
  bar.appendChild(elMode);
  if (preset.concept) bar.appendChild(h("span", "mf3-mode mf3-mode-concept", "Concept layout"));
  bar.appendChild(itemWrap); bar.appendChild(btnLook); bar.appendChild(btnTour); bar.appendChild(btnPause);
  shell.appendChild(bar);

  /* sprint backlog (layouts that have one): several items, worked one at a time */
  const backlogEls = [];
  if (preset.backlog) {
    const strip = h("div", "mf3-backlog");
    strip.appendChild(h("h3", null, "Sprint backlog"));
    const list = h("ol");
    preset.backlog.forEach((b) => {
      const li = h("li"); li.setAttribute("data-status", "todo");
      const dot = h("i"); dot.setAttribute("aria-hidden", "true");
      const size = h("small", null, b.size); size.title = "Size " + b.size + ": the ceremony is scaled to the size of the work";
      const status = h("em", null, "To do");
      li.appendChild(dot); li.appendChild(h("span", null, b.title)); li.appendChild(size); li.appendChild(status);
      list.appendChild(li); backlogEls.push({ li, status });
    });
    strip.appendChild(list);
    shell.appendChild(strip);
  }

  const stage = h("div", "mf3-stage");
  const viewEl = h("div", "mf3-view");
  const labelsEl = h("div", "mf3-labels");
  labelsEl.setAttribute("aria-hidden", "true");
  viewEl.appendChild(labelsEl);
  stage.appendChild(viewEl);

  const hint = h("p", "mf3-hint", "Drag to rotate · click, then scroll to zoom · right-drag to pan");
  hint.setAttribute("aria-hidden", "true"); hint.hidden = true;
  const tools = h("div", "mf3-tools"); tools.hidden = true;
  const btnDone = h("button", "mf3-btn", "Back to scrolling");
  btnDone.type = "button"; btnDone.hidden = true;
  const btnReset = h("button", "mf3-btn", "Reset view");
  btnReset.type = "button";
  const btnFull = h("button", "mf3-btn mf3-iconbtn mf3-fs");
  btnFull.type = "button";
  btnFull.appendChild(icon(["M4 9V4h5", "M20 9V4h-5", "M4 15v5h5", "M20 15v5h-5"]));
  btnFull.appendChild(icon(["M9 4v5H4", "M15 4v5h5", "M9 20v-5H4", "M15 20v-5h5"]));
  const btnReplay = h("button", "mf3-btn", "Replay intro");
  btnReplay.type = "button"; btnReplay.hidden = true;
  tools.appendChild(btnDone); tools.appendChild(btnReplay); tools.appendChild(btnReset); tools.appendChild(btnFull);
  /* Shown only in full screen, where the status bar is out of view: keeps the "Demo run" label on screen. */
  const fsInfo = h("div", "mf3-fsinfo");
  fsInfo.appendChild(h("span", "mf3-mode", statusUrl ? TEXT.liveBadge : TEXT.demoBadge));
  if (preset.concept) fsInfo.appendChild(h("span", "mf3-mode mf3-mode-concept", "Concept layout"));
  const fsItem = h("b");
  fsInfo.appendChild(fsItem);
  stage.appendChild(fsInfo);
  const pad = h("div", "mf3-pad"); pad.hidden = true;
  pad.setAttribute("role", "group"); pad.setAttribute("aria-label", "Move the view");
  const ROT = ["M20 12a8 8 0 1 1-2.4-5.7", "M20 4v4.5h-4.5"];
  const btnLeft = iconButton("Rotate left", ROT, true), btnRight = iconButton("Rotate right", ROT, false);
  const btnIn = iconButton("Zoom in", ["M12 5v14M5 12h14"]), btnOut = iconButton("Zoom out", ["M5 12h14"]);
  [btnLeft, btnRight, btnIn, btnOut].forEach((b) => pad.appendChild(b));
  const tap = h("button", "mf3-tap");
  tap.type = "button"; tap.hidden = true;
  tap.appendChild(h("span", null, "Tap to explore"));
  const tourBox = h("div", "mf3-tour"); tourBox.hidden = true;
  tourBox.setAttribute("role", "status");
  const tourText = h("div", "mf3-tour-text");
  const tourCount = h("b"), tourLine = h("span");
  tourText.appendChild(tourCount); tourText.appendChild(tourLine);
  const btnExit = h("button", "mf3-btn", "Exit tour");
  btnExit.type = "button";
  tourBox.appendChild(tourText); tourBox.appendChild(btnExit);
  stage.appendChild(hint); stage.appendChild(tools); stage.appendChild(pad); stage.appendChild(tap); stage.appendChild(tourBox);

  const card = h("div", "mf3-card"); card.hidden = true;
  const cNameRow = h("p", "mf3-card-name");
  const cName = h("span"), cGate = h("span", "mf3-tag", TEXT.gateTag);
  cGate.hidden = true;
  cNameRow.appendChild(cName); cNameRow.appendChild(cGate);
  const cRole = h("p", "mf3-card-role");
  const cNow = h("div", "mf3-nowbox"); cNow.setAttribute("data-state", "idle");
  const cNowIn = h("div"), cTask = h("span");
  cNowIn.appendChild(h("b", null, "Right now")); cNowIn.appendChild(cTask);
  cNow.appendChild(h("span", "mf3-sd")); cNow.appendChild(cNowIn);
  const cBio = h("p", "mf3-card-bio");
  const cOwnsRow = h("p", "mf3-card-owns"), cOwns = h("em");
  cOwnsRow.appendChild(h("span", null, "Owns")); cOwnsRow.appendChild(cOwns);
  [cNameRow, cRole, cNow, cBio, cOwnsRow].forEach((n) => card.appendChild(n));
  stage.appendChild(card);
  shell.appendChild(stage);

  const feed = h("div", "mf3-feed");
  const feedA = h("div"), feedB = h("div");
  const elNow = h("p", "mf3-now", " "), elLog = h("ul", "mf3-log");
  feedA.appendChild(h("h3", null, "Now on the floor")); feedA.appendChild(elNow);
  feedB.appendChild(h("h3", null, "Recent handoffs")); feedB.appendChild(elLog);
  feed.appendChild(feedA); feed.appendChild(feedB);
  shell.appendChild(feed);

  const roster = h("div", "mf3-roster");
  roster.setAttribute("role", "group");
  roster.setAttribute("aria-label", "All agents by station");
  ZONES.forEach((z) => {
    const group = h("div", "mf3-group");
    group.appendChild(h("h3", null, z.name));
    const chips = h("div", "mf3-chips");
    agents.filter((a) => a.zone === z.id).forEach((a) => {
      const b = h("button", "mf3-chip");
      b.type = "button";
      b.setAttribute("data-agent", a.id);
      b.setAttribute("data-state", "idle");
      b.setAttribute("data-gate", a.kind === "gate" ? "true" : "false");
      b.setAttribute("aria-pressed", "false");
      const d = h("span", "mf3-sd"); d.setAttribute("aria-hidden", "true");
      b.appendChild(d); b.appendChild(h("span", null, a.name));
      chips.appendChild(b);
      a.chipEl = b;
    });
    group.appendChild(chips);
    roster.appendChild(group);
  });
  shell.appendChild(roster);

  const legend = h("div", "mf3-legend");
  legend.setAttribute("aria-hidden", "true");
  [["build", TEXT.legend.build], ["gate", TEXT.legend.gate], ["gtm", TEXT.legend.gtm],
   ["working", "Working"], ["blocked", "Blocked the work"]].forEach((l) => {
    const s = h("span"), i = h("i"); i.setAttribute("data-k", l[0]);
    s.appendChild(i); s.appendChild(document.createTextNode(l[1]));
    legend.appendChild(s);
  });
  if (figures === "people") {
    const s = h("span"), i = h("i"); i.setAttribute("data-k", "badge");
    s.appendChild(i); s.appendChild(document.createTextNode(opts.hideLead === true ? "Glowing chest badge: an AI agent" : "Glowing chest badge: an AI agent. The one human on the floor has none"));
    legend.appendChild(s);
  }
  shell.appendChild(legend);

  const foot = h("p", "mf3-foot");
  const footDot = h("i"); footDot.setAttribute("aria-hidden", "true");
  const footText = h("span", null, TEXT.footAgents + " ");
  footText.appendChild(h("span", null, statusUrl ? TEXT.footLive : TEXT.footDemo));
  foot.appendChild(footDot); foot.appendChild(footText);
  shell.appendChild(foot);

  host.appendChild(root);

  /* ---------- state shared with the view ---------- */
  let view = nullView();
  let destroyed = false, paused = false;
  let openId = null, pinned = false, hideTimer = 0, cardW = 320, cardH = 200;
  let board = { item: "", stageId: null, closed: false }, haltZone = null, boardHead = null;
  const clock = makeClock();

  function setState(id, state, task) {
    const a = agentById[id]; if (!a) return;
    a.state = state; a.task = task || a.idle;
    a.chipEl.setAttribute("data-state", state);
    a.chipEl.setAttribute("aria-label", a.name + ", " + a.role + ". " + a.task + ".");
    view.setState(id, state);
    if (openId === id) fillCard(a);
  }

  function fillCard(a) {
    cName.textContent = a.name;
    cGate.hidden = a.kind !== "gate";
    cRole.textContent = a.role + (a.kind === "founder" ? "" : " · " + zoneById[a.zone].name + " station");
    cTask.textContent = a.task;
    cNow.setAttribute("data-state", a.state);
    cBio.textContent = a.bio;
    cOwns.textContent = a.owns;
  }

  function hot(id, isOn) {
    const a = agentById[id]; if (!a) return;
    a.chipEl.classList.toggle("is-hot", isOn);
    view.setHot(id, isOn);
  }

  function place() {
    if (!openId || mqNarrow.matches) { card.style.left = card.style.top = ""; return; }
    const r = view.anchor(openId);
    const sw = stage.clientWidth, sh = viewEl.clientHeight, gap = 16;
    if (!r) { card.style.left = Math.max(8, sw - cardW - 16) + "px"; card.style.top = "56px"; return; }
    let left = r.right + gap;
    if (left + cardW > sw - 8) left = r.left - cardW - gap;
    left = Math.max(8, Math.min(left, sw - cardW - 8));
    const top = Math.max(8, Math.min(r.top - 20, sh - cardH - 8));
    card.style.left = Math.round(left) + "px"; card.style.top = Math.round(top) + "px";
  }

  function show(id) {
    clearTimeout(hideTimer);
    if (openId && openId !== id) hot(openId, false);
    const a = agentById[id]; if (!a) return;
    openId = id; fillCard(a); hot(id, true);
    card.hidden = false;
    cardW = card.offsetWidth; cardH = card.offsetHeight;
    place();
  }
  function setPinned(v) {
    pinned = v;
    agents.forEach((a) => a.chipEl.setAttribute("aria-pressed", v && a.id === openId ? "true" : "false"));
  }
  function hide(force) {
    if (pinned && !force) return;
    if (openId) hot(openId, false);
    setPinned(false);
    openId = null; card.hidden = true;
  }
  function hideSoon() { clearTimeout(hideTimer); hideTimer = setTimeout(() => hide(false), 160); }

  /* Click on a desk or a list button: pin the card and fly there. Again on the same one: release. */
  function pick(id, fromList) {
    if (!id) { hide(true); return; }
    if (pinned && openId === id) { hide(true); return; }
    if (runner.isTouring()) runner.exitTour();
    setPinned(false); show(id); setPinned(true);
    view.flyTo(id);
    if (mqNarrow.matches && card.scrollIntoView && !fromList) {
      card.scrollIntoView({ block: "nearest", behavior: reduce() ? "auto" : "smooth" });
    }
  }

  const events = {
    hover(id) { if (id) { if (!pinned) show(id); } else hideSoon(); },
    pick(id) { pick(id, false); },
    /* The visitor took the camera: stop steering it for them. */
    interact() { if (runner.isTouring()) runner.exitTour(); },
    /* The scene lost its WebGL context or broke after starting. */
    fail() { useFallback(); }
  };

  const idFrom = (e) => {
    const t = e.target && e.target.closest ? e.target.closest("[data-agent]") : null;
    return t ? t.getAttribute("data-agent") : null;
  };
  on(roster, "pointerover", (e) => { const id = idFrom(e); if (id && !pinned) show(id); });
  on(roster, "pointerout", (e) => { if (idFrom(e)) hideSoon(); });
  on(roster, "click", (e) => { const id = idFrom(e); if (id) pick(id, true); });
  on(roster, "focusin", (e) => { const id = idFrom(e); if (id && !pinned) show(id); });
  on(roster, "focusout", hideSoon);
  on(card, "pointerenter", () => clearTimeout(hideTimer));
  on(card, "pointerleave", hideSoon);
  on(document, "keydown", (e) => {
    if (e.key !== "Escape") return;
    if (intro && intro.isPlaying()) { intro.skip(); return; }
    if (pinned || openId) hide(true);
    else if (runner.isTouring()) runner.exitTour();
    else if (isFull && document.fullscreenElement !== stage) setFull(false);
  });
  on(document, "click", (e) => {
    if (!pinned || !e.target.closest) return;
    /* Clicks inside the floor are handled by the view, which knows a drag from a click. */
    if (e.target.closest("[data-agent]") || card.contains(e.target) || viewEl.contains(e.target)) return;
    hide(true);
  });

  /* ---------- board, feed ---------- */
  function setBoard(item, stageId, closed) {
    board = { item, stageId, closed };
    const z = stageId ? zoneById[stageId] : null;
    elItem.textContent = item;
    fsItem.textContent = item;
    elStage.textContent = z ? "Stage: " + z.name : " ";
    view.setBoard(item, z ? z.id : null, closed, STAGE_ORDER, boardHead);
  }
  function setNow(a, text) {
    elNow.textContent = "";
    if (!a) { elNow.textContent = text; return; }
    elNow.appendChild(h("b", null, a.name));
    elNow.appendChild(document.createTextNode(" · " + text));
  }
  function log(a, text, stop) {
    const li = h("li", stop ? "is-stop" : null, a.name.split(" ")[0] + ": " + text);
    elLog.insertBefore(li, elLog.firstChild);
    while (elLog.children.length > 3) elLog.removeChild(elLog.lastChild);
  }
  function setHalt(zoneId) {
    haltZone = zoneId && zoneById[zoneId] ? zoneId : null;
    view.setHalt(haltZone);
  }

  const ui = {
    setState, setBoard, setNow, log, setHalt,
    setBacklog(index, status) {
      const WORDS = { todo: "To do", doing: "In progress", done: "Done" };
      if (index == null) {
        backlogEls.forEach((b) => { b.li.setAttribute("data-status", "todo"); b.status.textContent = WORDS.todo; });
        boardHead = backlogEls.length ? "SPRINT PLANNING" : null;
        return;
      }
      const b = backlogEls[index]; if (!b || !WORDS[status]) return;
      b.li.setAttribute("data-status", status); b.status.textContent = WORDS[status];
      boardHead = status === "doing" ? "SPRINT BACKLOG \u00b7 ITEM " + (index + 1) + " OF " + backlogEls.length : null;
    },
    tourState(isOn) {
      tourBox.hidden = !isOn;
      root.classList.toggle("is-touring", isOn);
      btnTour.textContent = isOn ? "Exit tour" : "Take the tour";
      btnTour.setAttribute("aria-pressed", isOn ? "true" : "false");
      if (isOn) { tourCount.textContent = "Tour"; tourLine.textContent = "Following one sprint from request to release."; }
    },
    tourStep(i, n, a, text) {
      tourCount.textContent = "Tour · step " + i + " of " + n;
      tourLine.textContent = a.name + ", " + a.role.toLowerCase() + ": " + text;
    }
  };

  /* The runner talks to the view through this, so the floor remembers where the work item is
     and can hand that to a new view when the look is switched mid-run. */
  let itemDesk = null;
  const viewPort = {
    placeItem(id) { itemDesk = id; view.placeItem(id); },
    handoff(from, to) { itemDesk = to; return view.handoff(from, to); },
    settle: (id) => view.settle(id),
    resetActors: () => view.resetActors(),
    setFollow: (v) => view.setFollow(v),
    flyTo: (id) => view.flyTo(id),
    resetView: () => view.resetView()
  };
  const runner = createRunner({ agents, agentById, zoneById, ui, getView: () => viewPort, clock, reduce, runs: preset.runs, text: TEXT });

  on(btnPause, "click", () => {
    paused = !paused;
    btnPause.textContent = paused ? "Play" : "Pause";
    btnPause.setAttribute("aria-pressed", paused ? "true" : "false");
  });
  on(btnTour, "click", () => {
    if (runner.isTouring()) { runner.exitTour(); return; }
    hide(true);
    if (paused) btnPause.click();
    runner.startTour();
  });
  on(btnExit, "click", () => runner.exitTour());
  on(btnReset, "click", () => { if (runner.isTouring()) runner.exitTour(); view.resetView(); });
  const step = (turn, zoom) => () => { if (runner.isTouring()) runner.exitTour(); view.nudge(turn, zoom); };
  on(btnLeft, "click", step(-1, 0)); on(btnRight, "click", step(1, 0));
  on(btnIn, "click", step(0, 1)); on(btnOut, "click", step(0, -1));

  /* ---------- day / dark switch (only when the page asks for it) ---------- */
  function paintLook() {
    root.setAttribute("data-look", look);
    lookText.textContent = look === "day" ? "Dark view" : "Day view";
    btnLook.setAttribute("aria-label", look === "day" ? "Switch to dark view" : "Switch to day view");
  }
  on(btnLook, "click", () => {
    if (view.kind !== "3d") return;
    look = look === "day" ? "night" : "day";
    ctx.look = look;
    paintLook();
    import("./scene.js").then((m) => {
      if (destroyed) return;
      /* Rebuild the scene in the other palette. The run, the pinned card and the camera carry over. */
      ctx.camera = view.cameraState();
      const old = view; view = nullView(); old.destroy();
      adopt(m.createScene(ctx), true);
      ctx.camera = null;
    }).catch(() => useFallback());
  });

  /* ---------- touch: do not take gestures until asked ---------- */
  let exploring = false;

  /* ---------- full screen ----------
     Uses the browser's full-screen mode where it exists. Where it does not (iPhone Safari), the
     floor is stretched over the page instead; the button or Escape brings it back either way. */
  let isFull = false, exploringBefore = false;
  function paintFull(v) {
    if (v === isFull) return;
    isFull = v;
    stage.classList.toggle("is-full", v);
    btnFull.setAttribute("aria-label", v ? "Exit full screen" : "Full screen");
    btnFull.title = v ? "Exit full screen" : "Full screen";
    /* Nothing to scroll past in full screen, so touch gestures go straight to the floor. */
    if (v) { exploringBefore = exploring; exploring = true; } else exploring = exploringBefore;
    applyTouchGate();
    if (openId) { cardW = card.offsetWidth; cardH = card.offsetHeight; place(); }
  }
  function setFull(v) {
    if (v) {
      const req = stage.requestFullscreen || stage.webkitRequestFullscreen;
      if (req) { try { const r = req.call(stage); if (r && r.catch) r.catch(() => paintFull(true)); } catch (err) { paintFull(true); } }
      else paintFull(true);
    } else if (document.fullscreenElement === stage || document.webkitFullscreenElement === stage) {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      try { const r = exit.call(document); if (r && r.catch) r.catch(() => {}); } catch (err) { /* already out */ }
    } else paintFull(false);
  }
  const onFsChange = () => paintFull((document.fullscreenElement || document.webkitFullscreenElement) === stage);
  on(document, "fullscreenchange", onFsChange);
  on(document, "webkitfullscreenchange", onFsChange);
  on(btnFull, "click", () => setFull(!isFull));
  btnFull.setAttribute("aria-label", "Full screen"); btnFull.title = "Full screen";
  function applyTouchGate() {
    const is3d = view.kind === "3d";
    const gated = is3d && mqTouch.matches;
    tap.hidden = !(gated && !exploring);
    btnDone.hidden = !(gated && exploring);
    view.setInteractive(!gated || exploring);
    hint.hidden = !is3d || gated;
    tools.hidden = !is3d;
    pad.hidden = !is3d;
    btnLook.hidden = !is3d || opts.themeSwitch !== true;
    btnReplay.hidden = !is3d || opts.intro !== true || reduce();
    btnTour.hidden = !!statusUrl || view.kind === "none";
  }
  on(tap, "click", () => { exploring = true; applyTouchGate(); });
  on(btnDone, "click", () => { exploring = false; applyTouchGate(); });
  if (mqTouch.addEventListener) on(mqTouch, "change", applyTouchGate);

  /* ---------- frame loop: runs only while the section is visible ---------- */
  let raf = 0, last = 0, inView = false;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const real = Math.min(now - last, 100); last = now;
    /* the floor holds still under the opening, so the sprint starts as it is revealed */
    const sim = paused || introHold ? 0 : real;
    clock.advance(sim);
    try { view.frame(sim, real); } catch (err) { useFallback(); return; }
    if (intro && intro.isPlaying()) { try { intro.frame(real); } catch (err) { intro.destroy(); introHold = false; } }
    if (openId && view.kind === "3d") place();
  }
  function updateLoop() {
    const want = inView && !document.hidden && !destroyed;
    if (want && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
    else if (!want && raf) { cancelAnimationFrame(raf); raf = 0; }
  }
  on(document, "visibilitychange", updateLoop);
  on(window, "resize", () => { if (openId) { cardW = card.offsetWidth; cardH = card.offsetHeight; place(); } });

  /* ---------- views ---------- */
  const ctx = { look, figures, camera: null, zones: ZONES, text: TEXT, viewEl, labelsEl, agents, agentById, zoneById, events, reduce, clock,
    isNarrow: () => mqNarrow.matches, stageOrder: STAGE_ORDER };

  function adopt(next, keepRun) {
    const old = view;
    view = next;
    try { old.destroy(); } catch (err) { /* already gone */ }
    root.setAttribute("data-view", view.kind);
    agents.forEach((a) => { view.setState(a.id, a.state); });
    view.setBoard(board.item, board.stageId, board.closed, STAGE_ORDER, boardHead);
    view.setHalt(haltZone);
    if (openId) view.setHot(openId, true);
    applyTouchGate();
    if (keepRun) { view.placeItem(itemDesk); if (runner.isTouring()) view.setFollow(true); }
    else runner.resync();
    if (wantIntro && view.kind === "3d") { wantIntro = false; playIntro("in"); }
    else if (autoTour && view.kind === "3d" && !introHold) { autoTour = false; runner.startTour(); }
  }

  let fallbackTried = false;
  function useFallback() {
    if (destroyed || fallbackTried) return;
    fallbackTried = true;
    exploring = false;
    import("./fallback-svg.js")
      .then((m) => { if (!destroyed) adopt(m.createSvgFloor(ctx)); })
      .catch(() => { if (!destroyed) adopt(nullView()); });
  }

  let loadStarted = false;
  function loadView() {
    if (loadStarted) return;
    loadStarted = true;
    if (opts.view === "svg") { useFallback(); return; }
    import("./scene.js")
      .then((m) => { if (!destroyed) adopt(m.createScene(ctx)); })
      .catch(() => useFallback());
  }

  let io = null;
  if ("IntersectionObserver" in window) {
    io = new IntersectionObserver((entries) => {
      inView = entries[entries.length - 1].isIntersecting;
      if (inView) loadView();
      updateLoop();
    }, { rootMargin: "200px 0px" });
    io.observe(stage);
  } else {
    inView = true; loadView(); updateLoop();
  }

  agents.forEach((a) => setState(a.id, "idle"));
  root.setAttribute("data-view", "none");
  paintLook();
  applyTouchGate();
  if (statusUrl) { btnPause.hidden = true; runner.startLive(statusUrl, pollMs); }
  else runner.startDemo();
  /* For screen recordings: start the guided tour by itself once the 3D scene is up. */
  let autoTour = opts.autoTour === true && !statusUrl;

  /* ---------- cinematic opening and closing (optional) ---------- */
  let intro = null, introHold = false;
  /* Not replayed when the visitor only switched company type. */
  let wantIntro = opts.intro === true && !focusSwitch && !reduce();
  function playIntro(which) {
    if (destroyed || view.kind !== "3d" || (intro && intro.isPlaying())) return;
    if (which === "in") { introHold = true; hide(true); }
    import("./intro.js").then((m) => {
      if (destroyed) return;
      if (!intro) intro = m.createIntro({ stage, getFloorCanvas: () => viewEl.querySelector(".mf3-canvas"), reduce,
        imageUrl: typeof opts.controllerImage === "string" && /\.(webp|png)(\?.*)?$/i.test(opts.controllerImage) && opts.controllerImage.length < 400 ? opts.controllerImage : null,
        modelUrl: typeof opts.controllerModel === "string" && /\.(glb|gltf)(\?.*)?$/i.test(opts.controllerModel) && opts.controllerModel.length < 400 ? opts.controllerModel : null });
      intro.play(which, () => {
        if (which !== "in") return;
        introHold = false;
        if (autoTour && view.kind === "3d") { autoTour = false; runner.startTour(); }
      });
    }).catch(() => { introHold = false; });
  }
  on(btnReplay, "click", () => { if (runner.isTouring()) runner.exitTour(); view.resetView(); playIntro("in"); });
  ui.tourFinished = () => { if (opts.intro === true && !reduce()) playIntro("out"); };

  if (switcher) {
    on(shell.querySelector(".mf3-layouts"), "click", (e) => {
      const b = e.target.closest ? e.target.closest("[data-layout]") : null;
      if (b) switcher.go(b.getAttribute("data-layout"));
    });
    if (focusSwitch && activeTab) activeTab.focus({ preventScroll: true });
  }

  return {
    getLook: () => look,
    destroy() {
      if (destroyed) return;
      if (isFull) setFull(false);
      if (intro) intro.destroy();
      destroyed = true;
      clearTimeout(hideTimer);
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      if (io) io.disconnect();
      runner.destroy();
      offs.forEach((off) => off());
      offs.length = 0;
      try { view.destroy(); } catch (err) { /* nothing to release */ }
      view = nullView();
      if (root.parentNode) root.parentNode.removeChild(root);
    }
  };
}

/* Public entry point. Options are described in DOCS.md. With `layouts` (a list of layout ids)
   the section gets a company-type switcher; picking one rebuilds the floor for that layout and
   keeps the visitor's day/dark choice. */
export function mount(host, options) {
  if (!host || host.nodeType !== 1) throw new TypeError("mount() needs an element to build the floor in.");
  const opts = options || {};
  const ids = Array.isArray(opts.layouts) ? opts.layouts.filter((id, i, all) => typeof id === "string" && LAYOUTS[id] && all.indexOf(id) === i) : [];
  let current = typeof opts.layout === "string" && LAYOUTS[opts.layout] ? opts.layout : (ids[0] || "it");
  if (ids.length && ids.indexOf(current) < 0) ids.unshift(current);
  let handle = null, gone = false;
  const switcher = ids.length > 1 ? {
    ids,
    go(id) {
      if (gone || id === current || !LAYOUTS[id]) return;
      const keep = Object.assign({}, opts, { look: handle.getLook() });
      handle.destroy();
      current = id;
      handle = mountOne(host, keep, LAYOUTS[id], switcher, true);
    }
  } : null;
  handle = mountOne(host, opts, LAYOUTS[current], switcher, false);
  return { destroy() { if (gone) return; gone = true; handle.destroy(); } };
}
