# CityLife — Isometric Life‑Planning City Builder

CityLife is an isometric “city builder” that doubles as a **life planning simulator**.  
Instead of optimizing zoning and taxes, you place *commitments* and *activities* as buildings, connect them by roads, and watch how your **Income**, **Happiness**, and **Wellness** evolve as a coupled network over time.

The intent is to feel like a calm, technical instrument panel: a spatial model of your life where you can iterate quickly, inspect causality, and tune assumptions.

---

## Vision

Most planning tools treat tasks as flat lists. CityLife treats them as a **spatial system**:

- Buildings are *nodes* (tasks, projects, habits, routines).
- Roads are *dependencies/commute/effort pathways* that enable activities to influence one another.
- The shortest road distance between nodes defines how strongly they interact.
- The player’s goal is to maintain sustainable **life balance** rather than maximize a single metric.

This supports two complementary modes:

1. **Spatial planning** (isometric view): place/move things to change proximity and connectivity.
2. **Systems analysis** (relationship graph): inspect influence pathways and key bottlenecks.

---

## Core Concept: Buildings as Life Nodes

Buildings map to categories (these are conceptual defaults; the model is configurable):

- **Housing** (e.g., House): availability of time/people/energy (demand + stability)
- **Work — Current Income** (e.g., Factory): produces income now, can create strain if too close to housing/leisure
- **Work — Capacity / Future Income** (e.g., Office): improves sustainment, planning, future capacity; depends on housing access
- **Health** (e.g., Hospital): increases wellness; supports work sustainability
- **Leisure** (e.g., Park, Mall): increases happiness; supports retention/sustainability of work
- **Development** (e.g., School): improves long-term capacity and optional cross‑effects

A building must be **connected to the road network** to be active (usable).

---

## What’s Implemented Today

### Current features (completed)

- [x] Isometric renderer (Canvas 2D) with depth sorting and a stylized background
- [x] Tool system: place roads and buildings, move buildings, bulldoze roads/buildings
- [x] Road adjacency rule: buildings must touch a road tile to become **Active**
- [x] Road-distance pathfinding: shortest path on roads (BFS) for relationships/influence
- [x] HUD showing Income / Happiness / Wellness and recent history (sparklines)
- [x] Relationship graph modal (Cytoscape.js) to visualize building relationships
- [x] Example starter city loaded at game start
- [x] Runs locally with a simple HTTP server (no build step)

### In-progress / needing polish

- [ ] Relationship graph aesthetics (aim: Obsidian-like refinement)
- [ ] Road markings/intersection visuals fully consistent with connectivity
- [ ] Robust error boundary around renderer loop (prevent silent blank-screen failures)

---

## Roadmap (Proposed)

### Near-term (core UX + configurability)
- [ ] **Spreadsheet-based “Model Editor” button**: open an editable table of weights and coefficients (see below)
- [ ] Relationship graph refinement:
  - [ ] smaller nodes, subtle depth, thin curved edges, hover tooltips
  - [ ] satisfying “jiggle” physics response on drag
- [ ] Save/Load:
  - [ ] localStorage autosave
  - [ ] JSON export/import

### Mid-term (planning views)
- [ ] **Kanban board** generated from buildings/tasks:
  - [ ] columns by status (Backlog / Active / Blocked / Done)
  - [ ] edit status and notes; sync back to buildings
- [ ] **Gantt chart** view:
  - [ ] edit start/end dates, milestones, dependencies
  - [ ] propagate schedule metadata back to buildings


### Advisors (LLM Agent Support)
- [ ] Omnipresent advisor panel (chat-style) with context of the city-as-life metaphor
- [ ] Multiple personas (initial default set):
  - [ ] Income advisor (focus: sustainability of work and runway)
  - [ ] Happiness advisor (focus: joy, motivation, social/leisure balance)
  - [ ] Wellness advisor (focus: health, recovery, long-term resilience)
  - [ ] Moderator advisor (balances tradeoffs, resolves conflicts, proposes experiments)
- [ ] Advisor suggestions for:
  - [ ] improving the city/model representation (weights, placement, connectivity)
  - [ ] real-world actions (next steps, scheduling, de-scoping, recovery time)
  - [ ] “what-if” scenarios (simulate changes and explain likely outcomes)
- [ ] Explainability: advisors cite the graph paths and terms contributing to advice
- [ ] Privacy-first: local-only mode and/or explicit user consent before sending data externally

### Longer-term (depth)
- [ ] Multi-tile buildings and districts
- [ ] “Scenarios” and timeline simulation (week-by-week)
- [ ] Explanations panel (“Why Happiness changed” attribution)
- [ ] Constraint system (“must have N leisure within distance D of housing”)
- [ ] Better asset pipeline (optional) for high-quality iconography

---

## The Model (Math)

CityLife treats the city as a weighted influence network.

> **GitHub Markdown supports math, and the formulas below are written in MathJax/LaTeX style.**  
> If you publish docs via GitHub Pages, you can also enable MathJax explicitly:
> ```html
> <script defer src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
> ```

### Notation

Let \( \mathcal{B} \) be the set of buildings.

Each building \( i \in \mathcal{B} \) has:
- type/category \( t(i) \)
- location \( (x_i, y_i) \)
- active flag \( a_i \in \{0,1\} \) (active if adjacent to a road)
- optional metadata (later: title, status, dates, etc.)

Define road shortest-path distance \( d_{ij} \) between buildings \( i \) and \( j \) as:
- choose road-adjacent tiles near \( i \) and \( j \)
- run BFS on road tiles
- take the minimum path length across adjacency choices
- if unreachable: \( d_{ij} = \infty \)

### Distance falloff and edge weights

Influence decays with road distance via an exponential falloff:

\[
w_{ij} =
\begin{cases}
a_i a_j \cdot \exp\!\left(-\frac{d_{ij}}{\lambda}\right) & \text{if } d_{ij} \le d_{\max} \\
0 & \text{otherwise}
\end{cases}
\]

Where:
- \( \lambda \) is the falloff scale (CONFIG.influenceFalloff)
- \( d_{\max} \) is the maximum useful distance (CONFIG.maxUsefulDistance)

Edges in the relationship graph are typically created when \( w_{ij} \ge \theta \) (CONFIG.influenceThreshold).

### Metrics vector

Let the player’s life metrics be a vector:

\[
\mathbf{M} =
\begin{bmatrix}
I \\ H \\ W
\end{bmatrix}
\]

Where:
- \( I \): Income
- \( H \): Happiness
- \( W \): Wellness

The simulator computes metrics as a baseline plus local (node) effects plus pairwise (edge) effects.

### Node (building) contributions

Each category \( c \) has a base contribution vector \( \mathbf{b}_c \):

\[
\Delta \mathbf{M}_{\text{node}} = \sum_{i \in \mathcal{B}} a_i \,\mathbf{b}_{t(i)}
\]

Examples:
- Housing may contribute positively to stability (H/W) and enable work capacity.
- Work buildings contribute to income but can carry happiness/wellness costs.
- Leisure increases happiness (and indirectly supports work sustainability).
- Health increases wellness.

### Pairwise (distance-weighted) interactions

Categories also interact pairwise through a 3D “interaction tensor”:

\[
\mathbf{K}_{c,u} =
\begin{bmatrix}
k^{(I)}_{c,u} \\
k^{(H)}_{c,u} \\
k^{(W)}_{c,u}
\end{bmatrix}
\]

Meaning: “how much category \( u \) influences category \( c \)” for each metric.

Then total pairwise effect is:

\[
\Delta \mathbf{M}_{\text{pair}} = \sum_{i \ne j} w_{ij}\,\mathbf{K}_{t(i),\,t(j)}
\]

This term encodes effects like:
- Offices benefit from nearby housing (workers) and nearby leisure (retention).
- Parks benefit housing (happiness/wellness) when close.
- Factories reduce happiness/wellness when too close to housing/leisure.
- Hospitals improve wellness near housing.

### Final metric update and bounds

A simple bounded update is:

\[
\mathbf{M} \leftarrow \mathrm{clip}\!\left(\mathbf{M}_0 + \Delta \mathbf{M}_{\text{node}} + \Delta \mathbf{M}_{\text{pair}},\; \mathbf{M}_{\min},\; \mathbf{M}_{\max}\right)
\]

Where clip clamps each component to desired bounds (e.g., happiness and wellness in \([0,100]\)).

> **Note:** The current implementation uses practical heuristics rather than a fully parameterized tensor everywhere.  
> The roadmap includes a spreadsheet model editor to externalize these weights.

---

## Early Deliverable: Spreadsheet “Model Editor”

A near-term goal is to add a button that opens a spreadsheet-style editor (in-app) to tune:

1. Category base contributions \( \mathbf{b}_c \)
2. Pairwise interaction coefficients \( \mathbf{K}_{c,u} \)
3. Thresholds \( d_{\max}, \lambda, \theta \)
4. Optional “hard rules” (e.g., factory penalty radius around housing)

### Proposed UX
- A toolbar button: **Model Editor**
- Opens a modal with a grid/table:
  - rows: influencing category \( u \)
  - columns: influenced category \( c \)
  - each cell holds a 3-vector (Income/Happiness/Wellness) or separate tabs per metric
- Changes apply live; include “Reset to defaults” and “Export/Import model JSON”

Implementation suggestion:
- Use an embedded grid library (e.g., Tabulator, Handsontable community alternatives, or a minimal custom table).
- Persist to localStorage and exportable JSON.

---

## Running Locally

Because the code uses ES modules, run via a local server:

```bash
python -m http.server 8999
```

Then open:

- `http://localhost:8999`

---

## Project Structure

```
.
├── index.html
├── styles.css
└── js/
    ├── config.js         # grid size, tuning constants
    ├── utils.js          # helpers (clamp/lerp/uid/falloff/etc.)
    ├── isoRenderer.js    # isometric drawing (tiles/roads/buildings)
    ├── pathfinding.js    # road graph + BFS distances
    ├── metrics.js        # life-balance simulation rules
    ├── graphView.js      # relationship graph modal (Cytoscape)
    ├── ui.js             # HUD, toasts, sparklines
    └── game.js           # main loop, input, tools, example city
```

---

## Troubleshooting

### Blank city / nothing renders
This usually means a JavaScript module failed to load due to a syntax error.

1) Open DevTools → Console  
2) Find the first error  
3) Fix that file/line and reload

Common causes:
- accidental brace/method nesting in `isoRenderer.js`
- duplicate `const` declarations inside `drawRoad()`

### Graph modal issues (open/close)
If the modal won’t hide, check CSS specificity:

```css
.modal.hidden { display: none !important; }
.hidden { display: none !important; }
```

---

## Attribution / Licensing

- Relationship graph uses **Cytoscape.js** (loaded via CDN).
- Add a license file if open-sourcing (MIT is common).
