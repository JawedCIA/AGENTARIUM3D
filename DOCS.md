# Delivery floor, 3D

A 3D delivery floor run by AI agents, built with three.js. It began as a flat (2D) drawing; this
version keeps the same agents, zones and scripted runs.

## Files

```
floor3d.html             demo page, version A (night look)
floor3d-day.html         demo page, version B (day look): same code with { look: "day" }
floor3d-intro.html       demo page, version C: version B plus the opening sequence, human desk left off the floor
floor3d/
  main.js                mount(): builds the section, card, agent list, frame loop
  data.js                AGENTS, ZONES, RUNS and on-screen wording, carried over from the original 2D version
  runner.js              scripted demo run, tour, live status polling and validation
  scene.js               the three.js office, figures, camera and pointer handling
  fallback-svg.js        the flat isometric drawing, shown if WebGL is missing or the scene fails
  floor3d.css            all styles, scoped under .mf3
  vendor/three-0.187.0/  three.js r187 and OrbitControls, minified, MIT licence included
```

There is no build step. It must be served over http(s); ES modules do not load from `file://`.
To preview locally: `python -m http.server 8765` in the project folder, then open
`http://127.0.0.1:8765/floor3d.html`.

## Embed in an existing page

1. Copy the `floor3d/` folder next to the page.
2. In `<head>`, add the fonts link (skip it if the page already loads these three families)
   and the stylesheet:

   ```html
   <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
   <link rel="stylesheet" href="floor3d/floor3d.css">
   ```

3. Where the section should appear:

   ```html
   <div id="agentarium3d"></div>
   <script type="module">
     import { mount } from "./floor3d/main.js";
     mount(document.getElementById("agentarium3d"));
   </script>
   ```

`mount(element, options)` builds everything inside the element and returns `{ destroy() }`.
Call `destroy()` if the host page removes the section (single-page navigation); it stops the
loop, removes every listener and timer, and frees the GPU resources.

Notes for the host page:

- Every class is prefixed `mf3-` and nothing is selected by id, so it can sit on any page without
  clashing with its styles.
- The module adds no globals of its own. three.js itself sets `window.__THREE__` (its revision
  string). If the host page already loads its own three.js, three will print a "multiple
  instances" warning in the console; it is harmless.
- The 3D code (about 790 KB before compression) is only fetched when the section comes
  within 200px of the viewport. Serve `.js` with gzip or brotli.
- If the site sends a Content-Security-Policy, it needs `script-src 'self'` and, for live
  status, `connect-src 'self'`. No inline script or eval is used by the modules.

### Options

| Option      | Default | Meaning |
|-------------|---------|---------|
| `statusUrl` | none    | URL of a status JSON file. Switches the floor to live mode. |
| `pollMs`    | `5000`  | How often to re-read it. Minimum 2000. |
| `look`      | `"night"` | `"day"` switches the 3D scene to the daylight look (see below). |
| `figures`   | by look | `"people"` or `"robots"`. Defaults to people in the day look, robots in the night look. |
| `themeSwitch` | `false` | `true` adds a "Dark view / Day view" button to the status bar. The run, camera and pinned card carry across the switch. |
| `layouts`   | none    | A list of layout ids, for example `["it", "manufacturing", "media"]`. Adds a "Company type" switcher above the floor. |
| `layout`    | `"it"`  | Which layout to show first. |
| `wallName`  | `"AGENTARIUM3D"` | Name written on the back wall. Up to 28 characters; long names shrink to fit. |
| `wallLine`  | per layout | Small line under the name (for example "DELIVERY FLOOR"). Up to 36 characters. |
| `leadName`  | `"Lead"`  | Label for the one human desk. Up to 16 characters. |
| `autoTour`  | `false` | `true` starts the guided tour as soon as the 3D scene is ready. |
| `intro`     | `false` | `true` plays the opening sequence before the floor and the closing shot after the tour (Version C). |
| `controllerModel` | none | Path to a `.glb` character file for the person at the desk in the intro. Without it, the built-in figure is used. |
| `hideLead`  | `false` | `true` leaves the human desk and the Command station off the floor. Used with `intro`, where the human sits outside. |
| `view`      | none    | `"svg"` forces the flat fallback, for testing it. |

The two demo pages also read these four from the address bar, which is handy for recordings:
`floor3d-day.html?wall=Concept%20Floor&line=Thought%20experiment&lead=Lead&tour=1`

Every 3D view also has four on-screen buttons (rotate left, rotate right, zoom in, zoom out) in
the bottom-right corner. They respect the same camera limits as dragging, are keyboard operable,
and on touch devices work without "Tap to explore".

### Version C: the opening sequence (`floor3d-intro.html`)

`mount(el, { intro: true, hideLead: true, ... })`. About ten seconds: a dark room, one person at a
desk, a monitor of green falling code; the camera moves over their shoulder, dives into one
character, and the floor comes through. When the guided tour finishes, the camera pulls back out
and the same person is watching the floor on that monitor.

- The floor is held still underneath and starts as it is revealed. With `autoTour`, the tour begins right after.
- "Skip intro" or Escape ends it at once; "Replay intro" sits next to "Reset view".
- It is skipped entirely with `prefers-reduced-motion`, on the SVG fallback, and when the visitor only switches company type.
- It lives in `intro.js`, loaded only when `intro` is on, and uses its own short-lived WebGL context.
- The falling code is drawn from plain letters, digits and symbols. It is a look-alike of a familiar
  film style, not a copy of that film's characters or footage; keep it that way if you edit it.

#### A photo cutout for the controller

`controllerImage: "floor3d/assets/controller.webp"` stands a photo of a seated person in the room
as a flat card (this is what `index.html` and `floor3d-intro.html` use; add `?photo=0` to see the
built-in figure).
The picture needs a transparent background and should be a three-quarter view from behind and to
the right, seated, hands forward at desk height. The card is angled to match that view, the keyboard
is moved under the hands, and the card fades as the camera passes it. It does not move. Placement
values are in `CUT` in `intro.js` if another picture needs adjusting. If the image fails to load,
the built-in figure is used. The included picture shows the project's author and is published with
their agreement; it is not covered by the MIT licence, so replace it with your own if you reuse this.

#### A modelled character for the controller

The person in the intro is built from shapes by default. To use a real character model instead:

1. Put a `.glb` file in the site, for example `floor3d/models/controller.glb`.
2. Pass `controllerModel: "floor3d/models/controller.glb"` to `mount()`. On `floor3d-intro.html`
   you can also try a file without editing anything: `?model=floor3d/models/controller.glb`
   (a plain path on the same site only).

What the file needs:

- **A standard humanoid skeleton.** Bones named in the Mixamo or Ready Player Me style (Hips, Spine2,
  Head, LeftArm, LeftForeArm, LeftHand, LeftUpLeg, LeftLeg, LeftFoot and the Right equivalents) are
  recognised. No sitting animation is needed: the code scales the character to a person's height,
  turns it to face the monitor and seats it by aiming the limb bones.
- **Standing in a T-pose or A-pose, facing +Z**, which is how these characters are normally exported.
- **A reasonable size.** Under about 3 MB is a sensible target; the file is only downloaded when the intro plays.
- **A licence that allows use on a public website.** No character file ships with this project.

If the file is missing, broken, slow (over four seconds) or has an unrecognised skeleton, the built-in
figure is used and nothing is shown to the visitor. The model loader (`GLTFLoader` and two helpers
from the same three.js package, about 65 KB) is only fetched when `controllerModel` is set.

Hand and arm angles are generic and may need a small adjustment for a particular character: see
`seatModel()` in `intro.js`.

### Two looks, one codebase

- **Version A, night** (`floor3d.html`): dark navy office, robot-style figures with visors and status lamps.
- **Version B, day** (`floor3d-day.html`): daylight office, people-shaped figures with hair and skin tones,
  wood desks, pale walls. Enabled with `mount(el, { look: "day", figures: "people", themeSwitch: true })`,
  which also gives visitors the switch to a dark view of the same office.

Both use the same data, run, tour, live mode, limits and fallback; only colours, lighting and the
figure model differ. The section around the scene (heading, status bar, agent list) stays dark in
both, and the SVG fallback is always the original night drawing. To go live with one, embed as
above with or without the `look` option; there is nothing to delete for the other.

With `figures: "people"`, every agent wears a white-rimmed status badge on the chest and between
the shoulders (the usual view is from behind). Its colour follows the agent's state and it glows
while working, blocked or done. The lead, the one human, has none, and the legend says so.

Version B draws the agents as people. The on-page line "These are AI agents, not employees" is
unchanged and matters more in that version, so keep it close to the scene.

## The sprint (IT layout)

The IT floor plays as a Scrum sprint, defined in `layouts.js` (`SPRINT` and `backlog`):

1. Sprint planning (ceremony: no work item moves).
2. Three backlog items, one at a time, each starting again at Refine. The strip under the status
   bar shows each item as To do, In progress or Done, and the wall board shows "Item 2 of 3".
3. Sprint review and retrospective.
4. The go-to-market launch run, then the next sprint.

Item 1 (size L) and the launch run are the original runs from `data.js`, unchanged. Items 2 (S)
and 3 (M) are new scripted examples; roles their size does not call for are shown dimmed as
"Not needed for this item". "Take the tour" follows the whole sprint and ends after the retrospective.

## Company-type layouts

`layouts.js` holds every layout. `it` is the real floor. `manufacturing` and `media` are
**concept layouts**: draft roles, names and runs showing how the same model could be arranged for
another kind of company. Wherever one is shown, the page adds a "Concept layout" badge and a
footer line saying these are not agents operated today. Keep both if a concept goes on a public page.

- All layouts share one floor grid (five stations on the top row, four plus Command on the bottom),
  so desks, walking routes and camera limits work unchanged. A layout changes station names, who
  sits where, role colours' meaning, the wording of the halt, and the scripted runs.
- To add or edit one, copy a concept block in `layouts.js`, keep its zones on the grid described
  at the top of that file, and add it to `LAYOUTS`. Each top-row station seats up to four; a
  3.2-wide bottom station seats one and a 5-wide one seats two.
- Live status applies to the `it` layout only; concept layouts always play their scripted run.
- Switching layout rebuilds the floor and keeps the visitor's day/dark choice.

## Live status

By default the floor plays the scripted demo and labels it "Demo run", with the line saying
the run is a scripted example. To show real status:

```js
mount(el, { statusUrl: "status.json" });
```

The badge changes to "Live", the footer line changes to "Status on this page is read from our
pipeline", and the Pause and tour buttons are hidden. Only switch this on when the file really
is written by the pipeline, because the page then tells visitors it is.

File shape:

```json
{
  "item": "Sprint: leave requests",
  "stage": "build",
  "agents": {
    "developer":       { "state": "working", "task": "Implementing the ADR" },
    "appsec-engineer": { "state": "blocked", "task": "Approval is missing an ownership check" }
  }
}
```

- `state` is one of `idle`, `working`, `blocked`, `done`, `skipped`. Anything else is shown as idle.
- Agent keys are the ids in `data.js` (`product-owner`, `developer`, `qa-engineer`, ...).
  Unknown keys are ignored. Agents left out are shown as idle.
- `stage` is a zone id (`refine`, `design`, `build`, `verify`, `ship`, `position`, `plan`,
  `produce`, `distribute`). Anything else is ignored.
- `item` is cut to 80 characters and `task` to 140. All text is inserted as plain text.
- A gate role (QA, AppSec, data protection, end user, auditor) in state `blocked` turns its
  zone red and drops the barrier, the same as the halt in the demo.
- If the file cannot be read or parsed, the floor keeps the last state and says status is not
  reachable. Figures do not walk in live mode; the file carries no handoff information.
- The file is fetched same-origin with `cache: "no-store"`. Do not put anything in it you would
  not publish: it is readable by every visitor.

## Behaviour worth knowing

- **Scrolling is never trapped.** With a mouse, the wheel only zooms after a click inside the
  floor and stops again when the pointer leaves. On touch devices the canvas ignores gestures
  until "Tap to explore", and "Back to scrolling" hands them back.
- **Full screen.** The corner button next to "Reset view" fills the screen with the floor, using the
  browser's full-screen mode where available and stretching over the page where it is not (iPhone
  Safari). The "Demo run" label, the tour caption, the card and the view buttons stay on screen.
  The same button or Escape exits. An embedding page inside an iframe needs `allow="fullscreen"`.
- **Fallback.** No WebGL 2, a failure while starting, a missing vendor file, or a lost GPU
  context all swap in the SVG floor without showing an error.
- **Reduced motion.** With `prefers-reduced-motion`, camera moves are instant, figures do not
  walk (the work item jumps desk to desk) and the barrier appears without animation.
- **Accessibility.** The agent list under the floor is the accessible version: real buttons,
  keyboard operable, each with a label giving name, role and current task. Enter pins the card,
  Escape releases it. The canvas has a text description.
- **Rendering stops** when the section is off screen or the tab is hidden; the run pauses with it.

## Changing content

Edit `data.js`. Desk positions are derived from the zone sizes, so adding an agent to a zone with a free
slot needs no layout work.

## Updating three.js

The vendor files were produced from the `three@0.187.0` npm package with terser
(`build/three.core.js`, `build/three.module.js`, `examples/jsm/controls/OrbitControls.js`),
with two import paths rewritten to relative ones. To move to another version, repeat that into
a new `vendor/three-<version>/` folder and change the two import lines at the top of `scene.js`.
