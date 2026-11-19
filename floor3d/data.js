/* Content for the delivery floor. Carried over from the original flat (2D) version of this floor, which was the
   source of truth. Both the 3D scene and the SVG fallback read from here. */

export const ZONES = [
  { id: "refine",     name: "Refine",     div: "delivery", x: 1,    y: 1.2, w: 5,   d: 5 },
  { id: "design",     name: "Design",     div: "delivery", x: 6.4,  y: 1.2, w: 5,   d: 5 },
  { id: "build",      name: "Build",      div: "delivery", x: 11.8, y: 1.2, w: 5,   d: 5 },
  { id: "verify",     name: "Verify",     div: "delivery", x: 17.2, y: 1.2, w: 5,   d: 5 },
  { id: "ship",       name: "Ship",       div: "delivery", x: 22.6, y: 1.2, w: 5,   d: 5 },
  { id: "position",   name: "Position",   div: "gtm",      x: 1,    y: 7.6, w: 3.2, d: 3.4 },
  { id: "plan",       name: "Plan",       div: "gtm",      x: 4.6,  y: 7.6, w: 3.2, d: 3.4 },
  { id: "produce",    name: "Produce",    div: "gtm",      x: 8.2,  y: 7.6, w: 5,   d: 3.4 },
  { id: "distribute", name: "Distribute", div: "gtm",      x: 13.6, y: 7.6, w: 5,   d: 3.4 },
  { id: "command",    name: "Command",    div: "command",  x: 22.6, y: 7.6, w: 3.2, d: 3.4 }
];

export const AGENTS = [
  { id: "product-owner", zone: "refine", name: "Priya Nair", role: "Product owner", kind: "build",
    bio: "Turns a half-formed request into a story you can build against, and lists what is out of scope so a two-day job stays a two-day job.",
    owns: "The story and its acceptance criteria", idle: "Waiting for the next request" },
  { id: "scrum-master", zone: "refine", name: "Sana Qureshi", role: "Scrum master", kind: "build",
    bio: "Holds the line on Definition of Ready. If a blocking question is still open, the item goes back with the exact gap named.",
    owns: "Flow, blockers, readiness", idle: "Watching for blockers" },
  { id: "solution-architect", zone: "design", name: "Arjun Menon", role: "Solution architect", kind: "build",
    bio: "Writes the architecture decision record. No build starts without one, and every trade-off gets a single line: chosen, rejected, why.",
    owns: "The architecture decision record", idle: "Reading the codebase" },
  { id: "cto", zone: "design", name: "Vikram Rao", role: "CTO", kind: "build",
    bio: "Steps in when a decision has a long tail: a new dependency, a stack change, an accepted risk. Picks the boring option almost every time.",
    owns: "Stack, build versus buy, risk appetite", idle: "On call for decisions with a long tail" },
  { id: "ux-designer", zone: "design", name: "Leila Haddad", role: "UX designer", kind: "build",
    bio: "Specialises in the states everyone forgets: empty, loading, error, permission denied. Treats keyboard access as a requirement.",
    owns: "Flows, screen states, accessibility", idle: "Reviewing existing screens" },
  { id: "developer", zone: "build", name: "Rohan Gupta", role: "Developer", kind: "build",
    bio: "Implements what was designed. If the design is wrong he stops and says so. Writes the tests alongside the code, unhappy path first.",
    owns: "The implementation and its tests", idle: "Waiting for a signed-off design" },
  { id: "data-engineer", zone: "build", name: "Dev Iyer", role: "Data engineer", kind: "build",
    bio: "Treats every migration as if it will run at the worst possible moment. Nothing ships without a rollback that restores the prior state.",
    owns: "Schema, migrations, row-level security", idle: "Waiting for a schema change" },
  { id: "ai-engineer", zone: "build", name: "Zoya Rahman", role: "AI / ML engineer", kind: "build",
    bio: "Her rule is that a demo is not an eval. Anything model-driven is measured against a labelled set, adversarial cases included.",
    owns: "Models, retrieval, guardrails, evals", idle: "Waiting for model work" },
  { id: "qa-engineer", zone: "verify", name: "Farah Siddiqui", role: "QA engineer", kind: "gate",
    bio: "Tests against the acceptance criteria, never the implementation. She reports what she finds and does not fix it herself.",
    owns: "The test plan and the verdict", idle: "Waiting for a build to test" },
  { id: "appsec-engineer", zone: "verify", name: "Kabir Anand", role: "AppSec engineer", kind: "gate",
    bio: "Reviews cold, without the developer's reasoning. Threat-models first, checks second. Required on auth, secrets, money and user input.",
    owns: "Threat model and security findings", idle: "Waiting for a change to review" },
  { id: "privacy-officer", zone: "verify", name: "Elena Novak", role: "Data protection officer", kind: "gate",
    bio: "AppSec asks whether an attacker can reach the data. Elena asks whether we should hold it at all, and flags what needs a lawyer.",
    owns: "Lawful basis, minimisation, retention", idle: "Waiting for a change that touches personal data" },
  { id: "end-user", zone: "verify", name: "Meera Joshi", role: "End user", kind: "gate",
    bio: "Never reads the code. She judges the result from the outside: did it let her do what she came to do without making her feel lost.",
    owns: "User acceptance, in plain language", idle: "Waiting for something to try" },
  { id: "auditor", zone: "ship", name: "Hannah Berger", role: "Auditor", kind: "gate",
    bio: "Does not judge whether the work is good. She judges whether we can prove what we did, criterion by criterion, sign-off by sign-off.",
    owns: "Traceability and the sign-off ledger", idle: "Waiting for a finished item" },
  { id: "devops-engineer", zone: "ship", name: "Yusuf Khan", role: "DevOps engineer", kind: "build",
    bio: "Gets it into production and, more importantly, back out again. Every change ships with its alert and its rollback steps.",
    owns: "CI/CD, infrastructure, rollback", idle: "Watching the pipelines" },
  { id: "technical-writer", zone: "ship", name: "Nadia Farooq", role: "Technical writer", kind: "build",
    bio: "Documents what the system does, not what the spec hoped. Every example she publishes has been run.",
    owns: "User docs, API reference, release notes", idle: "Waiting for something to document" },
  { id: "product-marketer", zone: "position", name: "Ishaan Kapoor", role: "Product marketer", kind: "gtm",
    bio: "Nothing gets written until the positioning is settled, and the core message has to fit in one sentence.",
    owns: "Audience, core message, proof points", idle: "Waiting for something to launch" },
  { id: "content-strategist", zone: "plan", name: "Tara Bose", role: "Content strategist", kind: "gtm",
    bio: "Plans for reuse. One strong idea becomes a long piece, a few posts, an email and a video hook.",
    owns: "Channels, calendar, repurposing", idle: "Waiting for positioning" },
  { id: "copywriter", zone: "produce", name: "Omar Sheikh", role: "Copywriter", kind: "gtm",
    bio: "Writes to the reader's problem, not to our product, and flags any claim he cannot defend instead of shipping it.",
    owns: "Landing pages, email, ads, posts", idle: "Waiting for a content plan" },
  { id: "video-creator", zone: "produce", name: "Riya Malhotra", role: "Video creator", kind: "gtm",
    bio: "Writes the hook, script, shot list and captions. She plans video and is clear that she does not shoot it.",
    owns: "Hooks, scripts, shot lists", idle: "Waiting for a content plan" },
  { id: "growth-marketer", zone: "distribute", name: "Aditya Verma", role: "Growth marketer", kind: "gtm",
    bio: "Starts small, finds the signal, then scales the winner. States the decision rule before the test runs.",
    owns: "Campaigns, funnels, budget, tests", idle: "Waiting for assets" },
  { id: "sales-bd", zone: "distribute", name: "Layla Mansoori", role: "Sales / BD", kind: "gtm",
    bio: "Writes outreach that is about the person receiving it, and handles objections without overpromising.",
    owns: "Outreach, qualification, objections", idle: "Waiting for leads" },
  { id: "founder", zone: "command", name: "Lead", role: "Founder", kind: "founder", pill: "Lead",
    bio: "The one human on the floor. Sets direction, answers the blocking questions, breaks ties between roles and holds every final sign-off.",
    owns: "Direction and final sign-off", idle: "On call for blocking questions and tie-breaks" }
];

export const STAGE_ORDER = ["refine", "design", "build", "verify", "ship", "position", "plan", "produce", "distribute"];

export const RUNS = [
  { item: "Sprint: leave requests for the HRMS", sub: "Delivery line, full pipeline", skip: ["ai-engineer"], steps: [
    { a: "product-owner", t: "Writing the story and acceptance criteria", done: "Story written, six acceptance criteria" },
    { a: "scrum-master", t: "Checking Definition of Ready", done: "Ready for design" },
    { a: "solution-architect", t: "Drafting the architecture decision record", done: "ADR written" },
    { a: "cto", t: "Reviewing the ADR for long-term risk", done: "Approved with one condition" },
    { a: "ux-designer", t: "Specifying every screen state", done: "Spec handed to build" },
    { a: "data-engineer", t: "Writing a reversible migration and access policy", done: "Migration and rollback ready" },
    { a: "developer", t: "Implementing against the ADR", done: "Build complete, tests added" },
    { a: "qa-engineer", t: "Running the test plan", done: "All criteria pass" },
    { a: "appsec-engineer", t: "Threat-modelling the approval endpoint", block: "Halted the release: approval is missing an ownership check" },
    { a: "developer", t: "Fixing the ownership check and adding a test", done: "Fix pushed" },
    { a: "appsec-engineer", t: "Re-checking the fix", done: "Security review passed" },
    { a: "privacy-officer", t: "Reviewing what personal data is held, and why", done: "Passed, retention period set" },
    { a: "end-user", t: "Trying it the way a real user would", done: "Accepted" },
    { a: "auditor", t: "Tracing every criterion to its test", done: "Compliant, ledger signed" },
    { a: "devops-engineer", t: "Preparing the deploy and the rollback", done: "Deploy plan ready" },
    { a: "technical-writer", t: "Documenting what actually shipped", done: "Docs and release notes done" }
  ]},
  { item: "Launch: announcing the new feature", sub: "Go-to-market line", skip: [], steps: [
    { a: "product-marketer", t: "Settling the one-sentence message", done: "Positioning set" },
    { a: "content-strategist", t: "Choosing channels and the order", done: "Content plan ready" },
    { a: "copywriter", t: "Writing the landing page and email", done: "Copy drafted, one claim sent for human review" },
    { a: "video-creator", t: "Scripting a 30-second cut", done: "Script and shot list done" },
    { a: "growth-marketer", t: "Setting up a small test campaign", done: "Test plan ready" },
    { a: "sales-bd", t: "Drafting the outreach sequence", done: "Sequence ready" }
  ]}
];

/* On-screen wording that must not drift from the original page. */
export const TEXT = {
  eyebrow: "The delivery floor",
  heading: "Watch the line work.",
  demoBadge: "Demo run",
  liveBadge: "Live",
  gateTag: "can halt a release",
  footAgents: "These are AI agents, not employees. Each is a specialised model with its own brief and tools.",
  footDemo: "The run shown here is a scripted example of a typical sprint, not live activity.",
  footLive: "Status on this page is read from our pipeline.",
  closed: "Item closed. Every decision is on file.",
  skipped: "Not needed for this item",
  liveIdle: "The floor is idle.",
  liveNoItem: "No item in progress",
  liveDown: "Status is not reachable right now. Showing the last known state."
};

/* Floor size in floor units: W along the back wall, D front to back, WALL the wall height. */
export const FLOOR = { W: 28.6, D: 12, WALL: 4.2 };
export const PLANTS = [[0.5, 0.5], [FLOOR.W - 0.9, 0.5], [0.5, FLOOR.D - 0.9], [19.9, 8.6], [27.2, 10.6]];
export const STATES = ["idle", "working", "blocked", "done", "skipped"];

/* Desk slot for each agent, using the same rule as the original drawing. Returns fresh
   objects so the shared data above is never mutated. */
export function layout() {
  const zoneById = Object.create(null);
  ZONES.forEach((z) => { zoneById[z.id] = z; });
  const used = Object.create(null);
  const agents = AGENTS.map((src) => {
    const z = zoneById[src.zone];
    const cols = z.w >= 5 ? [z.x + 0.45, z.x + 2.75] : [z.x + 0.7];
    const rows = z.d >= 5 ? [z.y + 0.45, z.y + 2.7] : [z.y + 0.55];
    const slots = [];
    rows.forEach((ry) => { cols.forEach((cx) => { slots.push([cx, ry]); }); });
    const i = used[src.zone] || 0;
    used[src.zone] = i + 1;
    const x = slots[i][0], y = slots[i][1];
    return Object.assign({}, src, { x, y, cx: x + 0.9, cy: y + 1.35, state: "idle", task: src.idle });
  });
  const agentById = Object.create(null);
  agents.forEach((a) => { agentById[a.id] = a; });
  return { agents, agentById, zoneById };
}
