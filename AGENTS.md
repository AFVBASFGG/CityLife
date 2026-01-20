# AGENTS.md — Automated Agent Handoff (CityLife)

This handoff is written for an automated coding agent. It emphasizes stability, clarity, and incremental improvement. The codebase is intentionally lightweight: plain HTML/CSS, native ES modules, Canvas 2D rendering, and Cytoscape.js.

---

## 1) Product Intent (Vision)

CityLife is an isometric city builder that models **life balance** as a system:

- Buildings represent commitments and activities (tasks, habits, projects).
- Roads represent enabling pathways: time, effort, commute, or sequencing.
- Influence between buildings decays with **shortest road distance**.
- The objective is to sustain Income, Happiness, and Wellness in a balanced regime.

The product should feel like a technical planning instrument rather than a toy.

---

## 2) Non-Negotiable Invariants

Unless explicitly changed by product direction, preserve these invariants.

### 2.1 Activity gating by road adjacency
A building is **Active** if and only if it is orthogonally adjacent to at least one road tile.

This affects:
- simulation contributions
- relationship graph inclusion
- UI indicators (e.g., “Needs road”)

### 2.2 Influence distance defined by road shortest path
Distance \(d_{ij}\) is computed by BFS across road tiles from road-adjacent tiles near building \(i\) to road-adjacent tiles near building \(j\). If unreachable, \(d_{ij}=\infty\).

No Euclidean fallback unless explicitly requested.

### 2.3 Native ES modules (no bundler)
The project runs as ESM. It must be served by a local HTTP server. Avoid adding a build step unless requested.

---

## 3) Codebase Map

Root:
- `index.html`: layout, HUD, toolbar, modal containers, script includes
- `styles.css`: global styling, HUD, toolbar, modals, graph overlay styling

`js/` modules:
- `config.js`: grid size, tile size, thresholds, falloff parameters
- `utils.js`: helpers (clamp, lerp, exp falloff, ids, formatting)
- `isoRenderer.js`: Canvas isometric renderer
- `pathfinding.js`: road graph + BFS
- `metrics.js`: simulation heuristics and metric updates
- `ui.js`: HUD, toasts, sparklines
- `graphView.js`: Cytoscape graph modal, styling, interactions
- `game.js`: main loop, input handlers, tools, starter city

---

## 4) “Blank Screen” Failure Mode (Top Priority)

If the city is blank but the page loads:
- almost always a JS syntax error preventing ESM module execution, or
- an exception thrown repeatedly inside `renderer.draw()`.

Workflow:
1) open DevTools → Console
2) take the first error (topmost red line)
3) fix that file/line
4) reload

Typical causes:
- brace mismatch or accidental nesting of class methods inside other methods in `isoRenderer.js`
- duplicate `const` declarations inside a function
- missing imports (e.g., using `lerp` without importing it)

Recommendation:
- add a lightweight error boundary in `game.js` around the render loop (catch → toast + stop loop) to avoid silent blank-screen states.

---

## 5) Rendering (isoRenderer.js)

### 5.1 Depth ordering
Draw items are sorted by \(x+y\) with small offsets:
- tiles
- roads
- buildings

### 5.2 Camera
`camera` fields:
- `x`, `y`: world pan offsets
- `zoom`
- `rot`: 0..3 (90° rotations)

Conversions:
- `gridToScreen` uses rotated coordinates to draw
- `screenToGrid` maps cursor back to grid, then inverse rotates

### 5.3 Road visuals
Road tiles are asphalt diamonds. Markings must be derived from connectivity:
- 1 neighbor: dead-end marking toward neighbor
- 2 neighbors: corner or straight markings toward neighbors
- 3–4 neighbors: no markings (avoid clutter)

Keep markings coherent under rotation and zoom.

---

## 6) Simulation Model (metrics.js) — Mathematical Target

The current code uses pragmatic heuristics. The intended trajectory is a parameterized, editable model.

Core equations (target):

\[
w_{ij} =
\begin{cases}
a_i a_j \cdot \exp\!\left(-\frac{d_{ij}}{\lambda}\right) & d_{ij}\le d_{\max}\\
0 & \text{otherwise}
\end{cases}
\]

\[
\mathbf{M} \leftarrow \mathrm{clip}\left(\mathbf{M}_0 + \sum_i a_i \mathbf{b}_{t(i)} + \sum_{i\ne j} w_{ij}\mathbf{K}_{t(i),t(j)},\,\mathbf{M}_{\min},\,\mathbf{M}_{\max}\right)
\]

Where:
- \( \mathbf{M}=[I,H,W]^T \)
- \( \mathbf{b}_c \) is base contribution per category
- \( \mathbf{K}_{c,u} \) is pairwise interaction coefficients
- \( d_{ij} \) is BFS road distance
- \( a_i \) is active gating

When adjusting heuristics, preserve:
- monotonic distance decay
- bounded outputs (H/W typically 0..100)
- clear sign conventions (e.g., factory-to-housing happiness penalty is negative)

---

## 7) Graph View (graphView.js) — Design Targets

Aesthetic target: “Obsidian-like” technical graph:
- small nodes with refined depth (no emoji tiles)
- thin, curved edges; reduced visual weight
- hover tooltip on node (currently internal id)
- brief physics “reheat” after drag (“jiggle” then settle)
- prevent hairballs with thresholding and/or per-node edge caps

Implementation notes:
- Cytoscape: `curve-style: bezier`, `control-point-step-size`
- “Jiggle”: run a short COSE layout on `dragfree`, stop after ~0.6s
- Tooltips: absolute-positioned div overlay inside the modal; update on `mouseover/mouseout/mousemove`

Hairball control strategies:
- raise `CONFIG.influenceThreshold`
- cap edges per node by weight (top N)
- optionally hide labels by default; show on hover/selection

---

## 8) Early Deliverable: Spreadsheet Model Editor

Add a toolbar button that opens a spreadsheet-like table to edit:
- base vectors \( \mathbf{b}_c \)
- pairwise coefficients \( \mathbf{K}_{c,u} \)
- global parameters \( d_{\max},\lambda,\theta \)

Requirements:
- live apply changes to simulation + graph
- persist to localStorage
- export/import JSON model

Implementation options:
- embed a lightweight grid library, or
- implement a minimal editable table with validation (numbers only, sane ranges)

---

## 9) Planning Views (Future): Kanban + Gantt

Target: multiple synchronized representations of the same objects.

### 9.1 Object metadata
Extend building/task objects with:
- title
- description/notes
- status (Backlog / Active / Blocked / Done)
- start date, due date, completion date
- optional tags and dependencies

### 9.2 Kanban
- auto-generate lanes by status
- drag cards between lanes updates building status
- editing in Kanban updates building node metadata

### 9.3 Gantt
- timeline bars per building/task
- editing dates updates node properties
- dependencies can be derived from road connectivity or explicit links

## 9.4 Advisors (LLM Agent Support)

Planned feature: an omnipresent advisor panel (chat-style) that understands the city-as-life metaphor and provides actionable guidance.

Core requirements:
- Advisors operate as *personas* with distinct objectives:
  - Income advisor: maximize runway and sustainable work output without burnout
  - Happiness advisor: maximize motivation, enjoyment, and social/leisure balance
  - Wellness advisor: maximize recovery, health, and long-term resilience
  - Moderator advisor: reconcile tradeoffs and propose balanced experiments
- Suggestions must cover two layers:
  1) Model improvements: building placement, road connectivity, coefficient tuning, graph-based bottlenecks
  2) Real-world actions: next tasks, scheduling changes, de-scoping, rest, habit formation
- Explainability: when proposing an action, cite the relevant influence pathways (graph edges/weights) and metric deltas.
- Safety and privacy:
  - Default to privacy-first handling of user data
  - Provide a local-only mode and/or require explicit user consent before sending information externally
- UX:
  - advisors feel like strategy-game counselors: compact, persistent, and context-aware
  - allow toggling personas, muting, and “only notify on significant changes”


---

## 10) Running Locally (No Build)

```bash
python -m http.server 8999
```

Do not rely on `file://` because ESM imports may fail.

---

## 11) Manual Test Checklist

Core:
- [ ] Starter city appears on load
- [ ] Pan/zoom/rotate work
- [ ] Place roads and buildings, remove them, move buildings

Rules:
- [ ] Buildings become active only when adjacent to roads
- [ ] Metrics update and remain bounded
- [ ] Graph opens/closes; nodes and edges appear

Graph UX:
- [ ] Tooltip appears on hover (id)
- [ ] Dragging a node causes a brief “reheat” and settles

Stability:
- [ ] No console errors on load
- [ ] If an error occurs, it is surfaced via toast and loop stops safely

---

## 12) Agent Change Discipline

- Prefer incremental changes over rewrites.
- Keep modules small and single-responsibility.
- Avoid new build tooling unless requested.
- When implementing new UI (Model Editor, Kanban, Gantt), document:
  - how it maps to building objects
  - persistence format
  - any new module responsibilities

If you add new files, update `README.md` and this document.
