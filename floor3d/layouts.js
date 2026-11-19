/* Company-type layouts for the floor. "it" is the original delivery floor and reads
   its content from data.js unchanged. The others are CONCEPT layouts: they show how the same
   agent model could be arranged for another kind of company. Their roles, names and runs are
   draft examples, and the page labels them as concepts wherever they are shown.

   All layouts use the same floor grid, so desks, walking routes and the camera work unchanged:
     top row     five stations, 5 x 5, up to four desks each   (x = 1, 6.4, 11.8, 17.2, 22.6; y = 1.2)
     bottom row  3.2-wide stations hold one desk, 5-wide hold two (x = 1, 4.6, 8.2, 13.6; y = 7.6)
     command     one desk at x = 22.6, y = 7.6
   To add a layout, copy one of the concept blocks, keep the zone rectangles on that grid,
   and add it to LAYOUTS at the bottom. */

import { ZONES, AGENTS, RUNS, STAGE_ORDER, TEXT } from "./data.js";

const LEAD = { id: "founder", zone: "command", name: "Lead", role: "Founder", kind: "founder", pill: "Lead",
  bio: "The one human on the floor. Sets direction, answers the blocking questions, breaks ties between roles and holds every final sign-off.",
  owns: "Direction and final sign-off", idle: "On call for blocking questions and tie-breaks" };

const top = (id, name, i) => ({ id, name, div: "delivery", x: [1, 6.4, 11.8, 17.2, 22.6][i], y: 1.2, w: 5, d: 5 });
const low = (id, name, i) => ({ id, name, div: "gtm", x: [1, 4.6, 8.2, 13.6][i], y: 7.6, w: i < 2 ? 3.2 : 5, d: 3.4 });
const COMMAND = { id: "command", name: "Command", div: "command", x: 22.6, y: 7.6, w: 3.2, d: 3.4 };

/* The IT floor runs as a Scrum sprint: planning, then each backlog item through the pipeline
   starting again at Refine, then review and retrospective, then the go-to-market run.
   Item 1 and the launch run are the original scripted runs from data.js. Items 2 and 3 are
   smaller, and skip the roles their size does not call for (S: developer and QA; M: no CTO,
   UX, data, AI, end-user or DevOps step), following the ceremony-depth rule in the handbook. */
const DELIVERY = ["product-owner", "scrum-master", "solution-architect", "cto", "ux-designer", "developer", "data-engineer",
  "ai-engineer", "qa-engineer", "appsec-engineer", "privacy-officer", "end-user", "auditor", "devops-engineer", "technical-writer"];
const except = (keep) => DELIVERY.filter((id) => keep.indexOf(id) < 0);

const SPRINT = [
  { item: "Sprint planning", sub: "Ceremony", ceremony: true, resetBacklog: true, skip: [], closed: "Sprint planned. Three items committed.", steps: [
    { a: "product-owner", t: "Presenting the top of the backlog", done: "Three items offered for the sprint" },
    { a: "scrum-master", t: "Checking capacity and Definition of Ready", done: "Sprint goal set, three items committed" }
  ]},
  Object.assign({}, RUNS[0], { item: "Story: leave requests for the HRMS", sub: "Size L: full pipeline", backlog: 0 }),
  { item: "Bug fix: half-day leave rounds down", sub: "Size S: developer and QA", backlog: 1,
    skip: except(["product-owner", "developer", "qa-engineer"]), steps: [
    { a: "product-owner", t: "Confirming the bug and the expected result", done: "Ready, one acceptance criterion" },
    { a: "developer", t: "Writing a failing test, then the fix", done: "Fix pushed, test passes" },
    { a: "qa-engineer", t: "Re-running the leave balance cases", done: "All criteria pass" }
  ]},
  { item: "Feature: remind managers of pending approvals", sub: "Size M: light design, both gates", backlog: 2,
    skip: ["cto", "ux-designer", "data-engineer", "ai-engineer", "end-user", "devops-engineer"], steps: [
    { a: "product-owner", t: "Writing the story and acceptance criteria", done: "Story written, four acceptance criteria" },
    { a: "scrum-master", t: "Checking Definition of Ready", done: "Ready for design" },
    { a: "solution-architect", t: "Writing a light ADR for the reminder job", done: "ADR written" },
    { a: "developer", t: "Implementing against the ADR", done: "Build complete, tests added" },
    { a: "qa-engineer", t: "Running the test plan", done: "All criteria pass" },
    { a: "appsec-engineer", t: "Reviewing who can trigger and receive a reminder", done: "Security review passed" },
    { a: "privacy-officer", t: "Checking the reminder holds only what it needs", done: "Passed, no new personal data stored" },
    { a: "auditor", t: "Tracing every criterion to its test", done: "Compliant, ledger signed" },
    { a: "technical-writer", t: "Writing the release note", done: "Release note done" }
  ]},
  { item: "Sprint review and retrospective", sub: "Ceremony", ceremony: true, tourEnd: true, skip: [], closed: "Sprint closed. The next one starts with planning.", steps: [
    { a: "product-owner", t: "Checking the increment against the sprint goal", done: "Sprint goal met, three items accepted" },
    { a: "scrum-master", t: "Running the retrospective", done: "One improvement agreed for the next sprint" }
  ]},
  RUNS[1]
];

const IT = {
  id: "it", label: "IT delivery", concept: false,
  zones: ZONES, agents: AGENTS, stageOrder: STAGE_ORDER, runs: SPRINT,
  backlog: [
    { title: "Leave requests for the HRMS", size: "L" },
    { title: "Half-day leave rounds down", size: "S" },
    { title: "Remind managers of pending approvals", size: "M" }
  ],
  text: {
    lede: "Twenty-one AI agents, each at the station where its job happens. Hover a desk to see who sits there and what they are doing right now, or drag to look around the floor.",
    wallLine: "DELIVERY FLOOR", haltLabel: "Release halted",
    canvasLabel: "3D office floor showing 21 AI agents at their stations. The list below the floor gives the same information as text.",
    legend: { build: "Plan and build", gate: "Gate role, can halt a release", gtm: "Go-to-market" }
  }
};

const MANUFACTURING = {
  id: "manufacturing", label: "Manufacturing", concept: true,
  zones: [top("plan", "Plan", 0), top("engineer", "Engineer", 1), top("produce", "Produce", 2), top("inspect", "Inspect", 3), top("dispatch", "Dispatch", 4),
    low("demand", "Demand", 0), low("source", "Source", 1), low("stock", "Stock", 2), low("service", "Service", 3), COMMAND],
  stageOrder: ["plan", "engineer", "produce", "inspect", "dispatch", "demand", "source", "stock", "service"],
  agents: [
    { id: "production-planner", zone: "plan", name: "Anika Rao", role: "Production planner", kind: "build",
      bio: "Turns an order into a work order with quantities, dates and the line it will run on, and says early when a date cannot be met.",
      owns: "The work order and its due date", idle: "Waiting for the next order" },
    { id: "scheduler", zone: "plan", name: "Tomas Weber", role: "Line scheduler", kind: "build",
      bio: "Sequences jobs to keep changeovers short. If material or a machine is not confirmed, the job does not get a slot.",
      owns: "The line schedule and changeovers", idle: "Watching the schedule for clashes" },
    { id: "design-engineer", zone: "engineer", name: "Kavya Pillai", role: "Design engineer", kind: "build",
      bio: "Owns the drawing and the bill of materials. Every revision is numbered, and the shop floor only ever sees the released one.",
      owns: "Drawings and the bill of materials", idle: "Reviewing open change requests" },
    { id: "process-engineer", zone: "engineer", name: "Marco Bianchi", role: "Process engineer", kind: "build",
      bio: "Writes the routing: which machine, which settings, which checks. Changes one variable at a time and records the result.",
      owns: "Routings, settings and work instructions", idle: "Studying yesterday's scrap figures" },
    { id: "tooling-engineer", zone: "engineer", name: "Sofia Lind", role: "Tooling engineer", kind: "build",
      bio: "Makes sure the fixtures and tools exist, fit and are within their service life before a job is released to the line.",
      owns: "Fixtures, tools and tool life", idle: "Checking tool wear records" },
    { id: "line-supervisor", zone: "produce", name: "Imran Sheikh", role: "Line supervisor", kind: "build",
      bio: "Releases the job to the line once people, material and tooling are all confirmed. Escalates a stoppage within minutes, not at shift end.",
      owns: "The running order on the line", idle: "Waiting for a released job" },
    { id: "line-controller", zone: "produce", name: "Yuki Tanaka", role: "Line controller", kind: "build",
      bio: "Runs the job against the routing and logs every count and stoppage as it happens, so the record is never rebuilt from memory.",
      owns: "Output counts and stoppage log", idle: "Waiting for the line to start" },
    { id: "maintenance-planner", zone: "produce", name: "Grace Okafor", role: "Maintenance planner", kind: "build",
      bio: "Plans upkeep around the schedule instead of after a breakdown, and keeps the spares list honest.",
      owns: "Planned maintenance and spares", idle: "Watching machine condition data" },
    { id: "quality-inspector", zone: "inspect", name: "Lena Fischer", role: "Quality inspector", kind: "gate",
      bio: "Measures against the drawing, never against the last good batch. A first article that fails stops the line until the cause is found.",
      owns: "First-article and in-process checks", idle: "Waiting for a first article" },
    { id: "safety-officer", zone: "inspect", name: "Daniel Mensah", role: "Safety officer", kind: "gate",
      bio: "Checks guarding, lock-out steps and handling risks for every new job. An unsafe set-up does not run, whatever the due date.",
      owns: "Risk assessment and safe set-up", idle: "Walking the line records" },
    { id: "compliance-officer", zone: "inspect", name: "Priti Desai", role: "Compliance officer", kind: "gate",
      bio: "Confirms the batch record is complete and traceable, and flags anything that needs a qualified person's sign-off.",
      owns: "Batch records and traceability", idle: "Waiting for a finished batch record" },
    { id: "packaging-planner", zone: "dispatch", name: "Olu Adeyemi", role: "Packaging planner", kind: "build",
      bio: "Specifies packing so parts arrive as they left: right count, right protection, right label.",
      owns: "Packing specification and labels", idle: "Waiting for released goods" },
    { id: "logistics-coordinator", zone: "dispatch", name: "Carla Mendes", role: "Logistics coordinator", kind: "build",
      bio: "Books the carrier and the dock slot, and tells the customer the real delivery date as soon as it changes.",
      owns: "Carrier booking and delivery date", idle: "Waiting for packed goods" },
    { id: "shipping-docs", zone: "dispatch", name: "Henrik Olsen", role: "Shipping documents", kind: "build",
      bio: "Prepares the delivery note and certificates from the batch record, so paperwork matches what is on the pallet.",
      owns: "Delivery notes and certificates", idle: "Waiting for a shipment to document" },
    { id: "demand-forecaster", zone: "demand", name: "Nisha Varma", role: "Demand forecaster", kind: "gtm",
      bio: "Forecasts from orders and history, states how wrong the last forecast was, and widens the range when the data is thin.",
      owns: "The demand forecast and its error", idle: "Waiting for this week's order book" },
    { id: "buyer", zone: "source", name: "Peter Novak", role: "Procurement buyer", kind: "gtm",
      bio: "Buys to the plan, not to the discount. Every order names the specification, the lead time and the fallback supplier.",
      owns: "Purchase orders and lead times", idle: "Waiting for a material requirement" },
    { id: "inventory-controller", zone: "stock", name: "Amara Diallo", role: "Inventory controller", kind: "gtm",
      bio: "Keeps the count in the system equal to the count on the shelf, and raises a reorder before a line goes short.",
      owns: "Stock levels and reorder points", idle: "Reconciling cycle counts" },
    { id: "supplier-quality", zone: "stock", name: "Jonas Keller", role: "Supplier quality", kind: "gtm",
      bio: "Checks incoming material against its certificate before it reaches the line, and scores suppliers on what actually arrived.",
      owns: "Incoming inspection and supplier scores", idle: "Waiting for a delivery to check" },
    { id: "customer-service", zone: "service", name: "Maya Fernandes", role: "Customer service", kind: "gtm",
      bio: "Gives customers order status from the record rather than a guess, and passes complaints to quality the same day.",
      owns: "Order status and complaints intake", idle: "Waiting for customer queries" },
    { id: "field-service", zone: "service", name: "Sam Carter", role: "Field service planner", kind: "gtm",
      bio: "Plans service visits and feeds every field failure back to engineering with the part and batch number attached.",
      owns: "Service visits and failure reports", idle: "Waiting for service requests" },
    LEAD
  ],
  runs: [
    { item: "Work order: 500 pump housings", sub: "Production line, full route", skip: ["maintenance-planner"], steps: [
      { a: "production-planner", t: "Turning the order into a work order", done: "Work order raised, due date confirmed" },
      { a: "scheduler", t: "Finding a slot with the shortest changeover", done: "Scheduled on line 2" },
      { a: "design-engineer", t: "Releasing the drawing and bill of materials", done: "Revision C released" },
      { a: "process-engineer", t: "Writing the routing and machine settings", done: "Routing issued" },
      { a: "tooling-engineer", t: "Confirming fixtures and tool life", done: "Tooling ready" },
      { a: "line-supervisor", t: "Checking people, material and tooling", done: "Job released to the line" },
      { a: "line-controller", t: "Running the first article", done: "First article produced" },
      { a: "quality-inspector", t: "Measuring the first article against the drawing", block: "Stopped the line: bore diameter is out of tolerance" },
      { a: "process-engineer", t: "Correcting the tool offset and re-running the first article", done: "Offset corrected" },
      { a: "quality-inspector", t: "Re-measuring the first article", done: "First article passed" },
      { a: "safety-officer", t: "Reviewing guarding and handling for this job", done: "Safe to run" },
      { a: "compliance-officer", t: "Checking the batch record is complete", done: "Batch record traceable" },
      { a: "packaging-planner", t: "Specifying packing and labels", done: "Packing spec issued" },
      { a: "logistics-coordinator", t: "Booking the carrier and dock slot", done: "Collection booked" },
      { a: "shipping-docs", t: "Preparing the delivery note and certificates", done: "Documents match the pallet" }
    ]},
    { item: "Replenishment: bearing stock below reorder point", sub: "Supply line", skip: [], steps: [
      { a: "demand-forecaster", t: "Updating the forecast from the order book", done: "Forecast updated, range stated" },
      { a: "buyer", t: "Raising the purchase order", done: "Order placed, lead time confirmed" },
      { a: "inventory-controller", t: "Setting the new reorder point", done: "Stock plan updated" },
      { a: "supplier-quality", t: "Planning the incoming inspection", done: "Inspection plan ready" },
      { a: "customer-service", t: "Updating affected customers", done: "Customers told the real date" }
    ]}
  ],
  text: {
    eyebrow: "The production floor", heading: "Watch the line work.",
    lede: "A concept layout: twenty AI agents arranged for a manufacturing company, from work order to dispatch. Hover a desk to see who sits there and what they are doing, or drag to look around the floor.",
    wallLine: "PRODUCTION FLOOR", haltLabel: "Line stopped", gateTag: "can stop the line",
    canvasLabel: "3D floor showing a concept layout of 20 AI agents for a manufacturing company. The list below the floor gives the same information as text.",
    legend: { build: "Plan and produce", gate: "Gate role, can stop the line", gtm: "Supply and service" },
    footDemo: "This is a concept layout showing how the same model could be arranged for a manufacturing company. The roles and the run are scripted examples, not agents we operate today.",
    closed: "Order closed. Every check is on file."
  }
};

const MEDIA = {
  id: "media", label: "Media", concept: true,
  zones: [top("pitch", "Pitch", 0), top("research", "Research", 1), top("create", "Create", 2), top("review", "Review", 3), top("publish", "Publish", 4),
    low("audience", "Audience", 0), low("schedule", "Schedule", 1), low("promote", "Promote", 2), low("revenue", "Revenue", 3), COMMAND],
  stageOrder: ["pitch", "research", "create", "review", "publish", "audience", "schedule", "promote", "revenue"],
  agents: [
    { id: "commissioning-editor", zone: "pitch", name: "Helena Brandt", role: "Commissioning editor", kind: "build",
      bio: "Decides whether an idea is a story: who it is for, why now, and what would make it not worth running.",
      owns: "The brief and the angle", idle: "Reading incoming pitches" },
    { id: "story-planner", zone: "pitch", name: "Rafael Costa", role: "Story planner", kind: "build",
      bio: "Breaks the brief into formats and deadlines, and cuts scope before the deadline does it for him.",
      owns: "Formats, deadlines and scope", idle: "Waiting for a commissioned brief" },
    { id: "researcher", zone: "research", name: "Ama Boateng", role: "Researcher", kind: "build",
      bio: "Finds primary sources and keeps a link for every claim, so anyone can retrace how we know what we say.",
      owns: "Sources and the evidence file", idle: "Waiting for a story to research" },
    { id: "data-journalist", zone: "research", name: "Viktor Lindqvist", role: "Data journalist", kind: "build",
      bio: "Checks the numbers against the original dataset and writes down the method next to every figure.",
      owns: "Figures, charts and their method", idle: "Watching for new data releases" },
    { id: "interview-producer", zone: "research", name: "Shreya Kulkarni", role: "Interview producer", kind: "build",
      bio: "Prepares questions and background for interviews, and records what was on and off the record.",
      owns: "Interview prep and consent notes", idle: "Waiting for interviews to prepare" },
    { id: "writer", zone: "create", name: "James Whitfield", role: "Writer", kind: "build",
      bio: "Writes from the evidence file, not from memory, and marks anything he could not stand up instead of smoothing it over.",
      owns: "The draft", idle: "Waiting for research" },
    { id: "video-producer", zone: "create", name: "Lucia Romero", role: "Video producer", kind: "build",
      bio: "Plans the cut, script and captions. She plans video and is clear that she does not shoot it.",
      owns: "Scripts, cut lists and captions", idle: "Waiting for an approved draft" },
    { id: "designer", zone: "create", name: "Min-jun Park", role: "Designer", kind: "build",
      bio: "Designs charts and layouts that say one thing clearly, with labels a reader can check against the source.",
      owns: "Charts, layouts and image credits", idle: "Waiting for figures to visualise" },
    { id: "sub-editor", zone: "review", name: "Catherine Doyle", role: "Sub-editor", kind: "gate",
      bio: "Edits for clarity and house style, and sends back any headline that promises more than the piece delivers.",
      owns: "Copy, headline and style", idle: "Waiting for a draft to edit" },
    { id: "fact-checker", zone: "review", name: "Nikhil Bhatt", role: "Fact-checker", kind: "gate",
      bio: "Checks every claim cold against its source. A figure without a primary source holds the story until it has one.",
      owns: "The fact-check record", idle: "Waiting for a draft to check" },
    { id: "legal-reviewer", zone: "review", name: "Ingrid Solberg", role: "Legal reviewer", kind: "gate",
      bio: "Flags defamation, privacy and copyright risk, and routes anything borderline to a qualified lawyer rather than deciding it herself.",
      owns: "Legal risk flags", idle: "Waiting for a piece to review" },
    { id: "standards-editor", zone: "review", name: "Ebo Asante", role: "Standards editor", kind: "gate",
      bio: "Asks whether the piece is fair: right of reply offered, labels honest, corrections policy followed.",
      owns: "Fairness, labelling and corrections", idle: "Waiting for a piece to review" },
    { id: "publishing-desk", zone: "publish", name: "Zara Malik", role: "Publishing desk", kind: "build",
      bio: "Publishes the approved version and nothing else, and can pull or correct it in minutes.",
      owns: "Publishing and corrections", idle: "Waiting for an approved piece" },
    { id: "seo-editor", zone: "publish", name: "Theo Laurent", role: "Search editor", kind: "build",
      bio: "Makes the piece findable without changing what it says. No headline is rewritten into a promise the story does not keep.",
      owns: "Titles, descriptions and links", idle: "Waiting for a published piece" },
    { id: "archivist", zone: "publish", name: "Bea Kowalski", role: "Archivist", kind: "build",
      bio: "Files the final piece with its sources and rights, so it can be found, reused and corrected later.",
      owns: "The archive and rights records", idle: "Waiting for something to file" },
    { id: "audience-analyst", zone: "audience", name: "Farid Rahimi", role: "Audience analyst", kind: "gtm",
      bio: "Reports what readers actually did, with the caveats, and resists turning one good day into a strategy.",
      owns: "Audience data and its caveats", idle: "Waiting for something to measure" },
    { id: "programme-scheduler", zone: "schedule", name: "Elise Martin", role: "Programme scheduler", kind: "gtm",
      bio: "Chooses when each format goes out so pieces support each other instead of competing.",
      owns: "The release schedule", idle: "Waiting for publish dates" },
    { id: "social-editor", zone: "promote", name: "Dele Akande", role: "Social editor", kind: "gtm",
      bio: "Writes posts that match the story's own claims, and never uses a clip that changes its meaning.",
      owns: "Social posts and clips", idle: "Waiting for a schedule" },
    { id: "newsletter-editor", zone: "promote", name: "Hana Suzuki", role: "Newsletter editor", kind: "gtm",
      bio: "Picks what subscribers need this week and says in one line why each piece is worth their time.",
      owns: "The newsletter", idle: "Waiting for this week's pieces" },
    { id: "partnerships", zone: "revenue", name: "Owen Hughes", role: "Partnerships", kind: "gtm",
      bio: "Arranges sponsorship and syndication, with sponsored content labelled as such every time.",
      owns: "Sponsorship and syndication", idle: "Waiting for a package to offer" },
    { id: "ad-operations", zone: "revenue", name: "Rina Gupta", role: "Ad operations", kind: "gtm",
      bio: "Places advertising where the policy allows it and keeps it away from stories where it would be inappropriate.",
      owns: "Ad placement and exclusions", idle: "Waiting for published pages" },
    LEAD
  ],
  runs: [
    { item: "Story: city budget explainer", sub: "Editorial line, full route", skip: ["interview-producer", "video-producer"], steps: [
      { a: "commissioning-editor", t: "Deciding the angle and who it is for", done: "Brief commissioned" },
      { a: "story-planner", t: "Setting formats and deadlines", done: "Plan agreed, scope cut to one explainer" },
      { a: "researcher", t: "Gathering primary sources", done: "Evidence file started" },
      { a: "data-journalist", t: "Checking figures against the published budget", done: "Figures and method recorded" },
      { a: "writer", t: "Writing from the evidence file", done: "Draft filed" },
      { a: "designer", t: "Drawing the spending chart", done: "Chart ready, source labelled" },
      { a: "sub-editor", t: "Editing copy and headline", done: "Edited to house style" },
      { a: "fact-checker", t: "Checking every claim against its source", block: "Held the story: one figure has no primary source" },
      { a: "researcher", t: "Finding the primary source and correcting the figure", done: "Source found, figure corrected" },
      { a: "fact-checker", t: "Re-checking the corrected figure", done: "Fact-check passed" },
      { a: "legal-reviewer", t: "Reviewing for legal risk", done: "No flags raised" },
      { a: "standards-editor", t: "Checking fairness and labelling", done: "Right of reply recorded" },
      { a: "publishing-desk", t: "Publishing the approved version", done: "Published" },
      { a: "seo-editor", t: "Writing the title and description", done: "Search details set" },
      { a: "archivist", t: "Filing the piece with its sources", done: "Archived with rights notes" }
    ]},
    { item: "Promotion: launching the explainer", sub: "Audience line", skip: [], steps: [
      { a: "audience-analyst", t: "Finding who read similar pieces", done: "Audience brief ready" },
      { a: "programme-scheduler", t: "Choosing release times", done: "Schedule set" },
      { a: "social-editor", t: "Writing posts that match the story", done: "Posts drafted" },
      { a: "newsletter-editor", t: "Placing it in this week's newsletter", done: "Newsletter slot booked" },
      { a: "partnerships", t: "Offering it for syndication", done: "Offer sent, sponsorship labelled" }
    ]}
  ],
  text: {
    eyebrow: "The newsroom floor", heading: "Watch the desk work.",
    lede: "A concept layout: twenty-one AI agents arranged for a media company, from pitch to publication. Hover a desk to see who sits there and what they are doing, or drag to look around the floor.",
    wallLine: "NEWSROOM FLOOR", haltLabel: "Story held", gateTag: "can hold a story",
    canvasLabel: "3D floor showing a concept layout of 21 AI agents for a media company. The list below the floor gives the same information as text.",
    legend: { build: "Plan and create", gate: "Gate role, can hold a story", gtm: "Audience and revenue" },
    footDemo: "This is a concept layout showing how the same model could be arranged for a media company. The roles and the run are scripted examples, not agents we operate today.",
    closed: "Story closed. Every check is on file."
  }
};

export const LAYOUTS = Object.assign(Object.create(null), { it: IT, manufacturing: MANUFACTURING, media: MEDIA });

/* Shared wording with the layout's own lines on top. */
export function textFor(preset, opts) {
  const t = Object.assign({ wallName: "AGENTARIUM3D" }, TEXT, preset.text);
  /* Optional wording set by the host page: the name on the wall and the line under it. */
  const clean = (v, max) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
  const name = opts ? clean(opts.wallName, 28) : null, line = opts ? clean(opts.wallLine, 36) : null;
  if (name) t.wallName = name.toUpperCase();
  if (line) t.wallLine = line.toUpperCase();
  return t;
}

/* Desk slot for each agent, using the same rule as the original drawing. */
export function arrange(preset, opts) {
  const lead = opts && typeof opts.leadName === "string" && opts.leadName.trim() ? opts.leadName.trim().slice(0, 16) : null;
  const zoneById = Object.create(null);
  preset.zones.forEach((z) => { zoneById[z.id] = z; });
  const used = Object.create(null);
  const agents = preset.agents.map((src) => {
    const z = zoneById[src.zone];
    const cols = z.w >= 5 ? [z.x + 0.45, z.x + 2.75] : [z.x + 0.7];
    const rows = z.d >= 5 ? [z.y + 0.45, z.y + 2.7] : [z.y + 0.55];
    const slots = [];
    rows.forEach((ry) => { cols.forEach((cx) => { slots.push([cx, ry]); }); });
    const i = used[src.zone] || 0;
    used[src.zone] = i + 1;
    const x = slots[i][0], y = slots[i][1];
    const a = Object.assign({}, src, { x, y, cx: x + 0.9, cy: y + 1.35, state: "idle", task: src.idle });
    /* The human desk can be relabelled (for example "Lead") without touching the layout data. */
    if (lead && a.kind === "founder") { a.name = lead; a.pill = lead; }
    return a;
  });
  const agentById = Object.create(null);
  agents.forEach((a) => { agentById[a.id] = a; });
  return { agents, agentById, zoneById };
}
