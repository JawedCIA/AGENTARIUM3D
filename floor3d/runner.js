/* Drives the floor: the scripted demo runs, the tour, and the optional live mode.
   It never touches the DOM or the scene directly; it calls the ui and view it is given. */

import { STATES } from "./data.js";

const CANCEL = { cancelled: true };
const STEP_MS = 2600, BLOCK_MS = 2400, CLOSE_MS = 3200;

/* Time only moves when the host page advances it, so a paused or off-screen floor
   stops mid-step and resumes where it left off. */
export function makeClock() {
  let waits = [];
  return {
    wait(ms) { return new Promise((resolve) => { waits.push({ left: ms, resolve }); }); },
    advance(dt) {
      if (!dt || !waits.length) return;
      const due = [];
      waits = waits.filter((w) => { w.left -= dt; if (w.left <= 0) { due.push(w); return false; } return true; });
      due.forEach((w) => w.resolve());
    },
    flush() { const w = waits; waits = []; w.forEach((x) => x.resolve()); }
  };
}

export function createRunner({ agents, agentById, zoneById, ui, getView, clock, reduce, runs, text }) {
  const RUNS = runs, TEXT = text;
  let gen = 0, touring = false, destroyed = false;
  let pollTimer = 0, abort = null, lastLive = null;

  function cancelAll() {
    gen++;
    clock.flush();
    getView().resetActors();
  }
  function guard() {
    const mine = ++gen;
    return () => { if (mine !== gen || destroyed) throw CANCEL; };
  }

  function resetFloor(run) {
    const view = getView();
    agents.forEach((a) => ui.setState(a.id, "idle"));
    view.resetActors();
    view.placeItem(null);
    ui.setHalt(null);
    run.skip.forEach((id) => ui.setState(id, "skipped", TEXT.skipped));
  }

  /* The tour follows the floor until this run closes: the sprint review if the layout has one, else the first run. */
  const tourEnd = Math.max(0, RUNS.findIndex((r) => r.tourEnd));

  async function playRun(run, check, isTour, endsTour) {
    const view = () => getView();
    const pause = async (ms) => { await clock.wait(ms); check(); };
    let prev = null, haltBy = null;
    resetFloor(run);
    if (run.resetBacklog) ui.setBacklog(null);
    if (run.backlog != null) ui.setBacklog(run.backlog, "doing");

    for (let i = 0; i < run.steps.length; i++) {
      const st = run.steps[i], a = agentById[st.a];
      ui.setBoard(run.item, a.zone, false);
      if (run.ceremony) {
        /* A sprint ceremony is a conversation, not a handoff: no work item moves. */
        if (isTour && touring) view().flyTo(a.id);
      }
      else if (prev && prev !== a) {
        if (isTour && touring) ui.tourStep(i + 1, run.steps.length, prev, "Walking the work over to " + a.name);
        await view().handoff(prev.id, a.id); check();
      }
      else if (!prev) { view().placeItem(a.id); await pause(reduce() ? 200 : 500); }
      await view().settle(a.id); check();

      if (isTour && touring) ui.tourStep(i + 1, run.steps.length, a, st.t);
      ui.setState(a.id, "working", st.t);
      ui.setNow(a, st.t);
      await pause(STEP_MS);

      if (st.block) {
        ui.setState(a.id, "blocked", st.block);
        ui.setNow(a, st.block);
        ui.log(a, st.block, true);
        ui.setHalt(a.zone);
        haltBy = a.id;
        if (isTour && touring) ui.tourStep(i + 1, run.steps.length, a, st.block);
        await pause(BLOCK_MS);
      } else {
        ui.setState(a.id, "done", st.done);
        ui.log(a, st.done, false);
        /* The barrier lifts only when the role that raised it passes the work. */
        if (haltBy === a.id) { ui.setHalt(null); haltBy = null; }
      }
      prev = a;
    }
    ui.setNow(null, run.closed || TEXT.closed);
    ui.setBoard(run.item, null, !run.ceremony);
    if (run.backlog != null) ui.setBacklog(run.backlog, "done");
    view().placeItem(null);
    if (isTour && touring && endsTour) endTour(true);
    await pause(run.ceremony ? 1800 : CLOSE_MS);
  }

  function startDemo(fromIndex, asTour) {
    cancelAll();
    const check = guard();
    (async () => {
      let tour = !!asTour;
      for (let r = fromIndex; ; r = (r + 1) % RUNS.length) {
        await playRun(RUNS[r], check, tour, r === tourEnd);
        if (r === tourEnd) tour = false;
      }
    })().catch(() => { /* cancelled, or a view failed mid-run: the next start() recovers */ });
  }

  function startTour() {
    if (lastLive !== null) return;
    touring = true;
    ui.tourState(true);
    startDemo(0, true);
    getView().setFollow(true);
  }
  function endTour(finished) {
    if (!touring) return;
    touring = false;
    ui.tourState(false);
    const view = getView();
    view.setFollow(false);
    if (finished) { view.resetView(); if (ui.tourFinished) ui.tourFinished(); }
  }

  /* ---------- live mode ---------- */
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

  function applyLive(data) {
    if (!data || typeof data !== "object" || Array.isArray(data)) return;
    lastLive = data;
    const src = data.agents && typeof data.agents === "object" && !Array.isArray(data.agents) ? data.agents : {};
    let active = null, halted = null;
    agents.forEach((a) => {
      const e = own(src, a.id) && src[a.id] && typeof src[a.id] === "object" ? src[a.id] : null;
      const state = e && typeof e.state === "string" && STATES.indexOf(e.state) > -1 ? e.state : "idle";
      const task = e && typeof e.task === "string" ? e.task.slice(0, 140) : "";
      ui.setState(a.id, state, task);
      if (state === "working" || state === "blocked") active = a;
      if (state === "blocked" && a.kind === "gate" && !halted) halted = a.zone;
    });
    const stage = typeof data.stage === "string" && zoneById[data.stage] ? data.stage : null;
    ui.setBoard(typeof data.item === "string" ? data.item.slice(0, 80) : TEXT.liveNoItem, stage, false);
    ui.setHalt(halted);
    getView().placeItem(active ? active.id : null);
    if (active) ui.setNow(active, agentById[active.id].task); else ui.setNow(null, TEXT.liveIdle);
  }

  function poll(url) {
    if (destroyed || document.hidden) return;
    if (abort) abort.abort();
    abort = new AbortController();
    fetch(url, { cache: "no-store", signal: abort.signal, credentials: "same-origin" })
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then((data) => { if (!destroyed) applyLive(data); })
      .catch((err) => { if (!destroyed && !(err && err.name === "AbortError")) ui.setNow(null, TEXT.liveDown); });
  }

  function startLive(url, pollMs) {
    lastLive = {};
    ui.setBoard("Connecting", null, false);
    poll(url);
    pollTimer = setInterval(() => poll(url), pollMs);
  }

  return {
    startDemo: () => startDemo(0, false),
    startLive,
    startTour,
    exitTour: () => endTour(false),
    isTouring: () => touring,
    /* Called after the view is swapped (3D to SVG fallback) so the new view catches up. */
    resync() {
      if (lastLive !== null) { applyLive(lastLive); return; }
      if (touring) endTour(false);
      startDemo(0, false);
    },
    destroy() {
      destroyed = true;
      gen++;
      clearInterval(pollTimer);
      if (abort) abort.abort();
      clock.flush();
    }
  };
}
