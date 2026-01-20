import { CONFIG } from "./config.js";
import { expFalloff, round2, clamp } from "./utils.js";
import { logEvent, captureGraphScreenshot } from "./debugTools.js";

export function openGraphModal(state, roadGraph, metrics) {
    const modal = document.getElementById("graphModal");
    const closeBtn = document.getElementById("closeGraph");
    const shotBtn = document.getElementById("graphShotBtn");
    const info = document.getElementById("selectedInfo");
    const snap = document.getElementById("metricSnapshot");

    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");

    snap.innerHTML = `
    <div><b>Income:</b> ${round2(metrics.income)}</div>
    <div><b>Happiness:</b> ${round2(metrics.happiness)}</div>
    <div><b>Wellness:</b> ${round2(metrics.wellness)}</div>
    <div><b>Population:</b> ${metrics.population}</div>
  `;

    const buildings = [...state.buildings.values()];

    // node styling by category
    function nodeStyle(type) {
        if (type === "house") return { bg: "#7E9BFF" };
        if (type === "office") return { bg: "#67D8BE" };
        if (type === "factory") return { bg: "#E17582" };
        if (type === "park") return { bg: "#6BE5A0" };
        if (type === "mall") return { bg: "#D9B26A" };
        if (type === "hospital") return { bg: "#7CB8E6" };
        if (type === "school") return { bg: "#9C8CE8" };
        return { bg: "#9FB3D9" };
    }

    const nodes = buildings.map(b => {
        const st = nodeStyle(b.type);
        return {
            data: {
                id: b.id,
                type: b.type,
                tooltip: b.id,     // requested: internal id on hover
                bg: st.bg,
                active: b.active
            },
            classes: b.active ? "active" : "inactive"
        };
    });

    // edges based on road distance & influence weight
    const edges = [];
    for (let i = 0; i < buildings.length; i++) {
        for (let j = i + 1; j < buildings.length; j++) {
            const A = buildings[i], B = buildings[j];
            if (!A.active || !B.active) continue;

            const d = roadGraph.roadDistanceBetweenBuildings(A, B, CONFIG.maxUsefulDistance);
            if (!Number.isFinite(d)) continue;

            const w = expFalloff(d, CONFIG.influenceFalloff);
            if (w < CONFIG.influenceThreshold) continue;

            edges.push({
                data: {
                    id: `${A.id}__${B.id}`,
                    source: A.id,
                    target: B.id,
                    distance: d,
                    weight: w,
                    label: `d=${d}, w=${round2(w)}`
                }
            });
        }
    }

    // --- NEW: keep only top-N strongest edges per node ---
    const MAX_EDGES_PER_NODE = 4;

    const byNode = new Map(); // nodeId -> edge[]
    for (const e of edges) {
        const { source, target } = e.data;
        if (!byNode.has(source)) byNode.set(source, []);
        if (!byNode.has(target)) byNode.set(target, []);
        byNode.get(source).push(e);
        byNode.get(target).push(e);
    }

    const keep = new Set(); // edge ids to keep
    for (const [nodeId, list] of byNode.entries()) {
        list.sort((a, b) => b.data.weight - a.data.weight);
        for (const e of list.slice(0, MAX_EDGES_PER_NODE)) keep.add(e.data.id);
    }

    const edgesFiltered = edges.filter(e => keep.has(e.data.id));


    const cyEl = document.getElementById("cy");
    cyEl.innerHTML = ""; // clear any previous instance

    const cy = cytoscape({
        container: cyEl,
        elements: { nodes, edges: edgesFiltered },
        layout: {
            name: "cose",
            animate: true,
            randomize: false,
            idealEdgeLength: 140,
            nodeRepulsion: 9000,
            nodeOverlap: 6,
            gravity: 0.16,
            numIter: 900,
            coolingFactor: 0.985
        },
        style: [
            {
                selector: "node",
                style: {
                    "width": 9,
                    "height": 9,
                    "shape": "ellipse",
                    "background-color": "data(bg)",
                    "background-opacity": 0.9,
                    "border-width": 0.5,
                    "border-color": "rgba(255,255,255,0.18)",

                    // subtle glow + depth
                    "shadow-blur": 9,
                    "shadow-color": "rgba(0,0,0,0.55)",
                    "shadow-opacity": 0.75,
                    "shadow-offset-y": 2,
                    "underlay-color": "rgba(120,140,255,0.28)",
                    "underlay-opacity": 0.18,
                    "underlay-padding": 1.4,

                    // no label; tooltip overlay is used instead
                    "label": "",
                    "overlay-opacity": 0
                }
            },
            {
                selector: "node:hover",
                style: {
                    "width": 12,
                    "height": 12,
                    "border-width": 1.2,
                    "border-color": "rgba(120,140,255,0.65)",
                    "underlay-opacity": 0.32,
                    "shadow-color": "rgba(120,140,255,0.22)"
                }
            },
            {
                selector: "node:selected",
                style: {
                    "width": 13,
                    "height": 13,
                    "border-width": 1.4,
                    "border-color": "rgba(53,255,154,0.80)",
                    "underlay-color": "rgba(53,255,154,0.45)",
                    "underlay-opacity": 0.35,
                    "shadow-color": "rgba(53,255,154,0.18)"
                }
            },
            {
                selector: "node.inactive",
                style: {
                    "opacity": 0.28,
                    "border-color": "rgba(255,180,120,0.35)",
                    "underlay-opacity": 0.08
                }
            },

            {
                selector: "edge",
                style: {
                    "width": "mapData(weight, 0.08, 1.0, 0.2, 0.9)",
                    "line-color": "mapData(weight, 0.08, 1.0, #2B354A, #7FA4E6)",
                    "opacity": "mapData(weight, 0.08, 1.0, 0.10, 0.48)",
                    "curve-style": "bezier",
                    "control-point-step-size": 60,
                    "line-cap": "round",
                    "overlay-opacity": 0
                }
            },
            {
                selector: "edge:hover",
                style: { "opacity": 0.85, "line-color": "rgba(160,185,255,0.70)" }
            },
            {
                selector: "edge:selected",
                style: { "opacity": 1, "line-color": "rgba(53,255,154,0.85)", "width": 1.4 }
            }
        ]

    });

    const tip = document.getElementById("graphTooltip");

    cy.on("mouseover", "node", (evt) => {
        const n = evt.target;
        tip.textContent = n.data("tooltip");
        tip.classList.remove("hidden");
    });
    cy.on("mouseout", "node", () => {
        tip.classList.add("hidden");
    });

    cy.on("mousemove", "node", (evt) => {
        const pos = evt.renderedPosition;
        const rect = cyEl.getBoundingClientRect();
        const tipRect = tip.getBoundingClientRect();

        const pad = 10;
        let x = pos.x + 12;
        let y = pos.y - 8;

        const maxX = rect.width - tipRect.width - pad;
        const maxY = rect.height - tipRect.height - pad;
        x = Math.max(pad, Math.min(x, maxX));
        y = Math.max(pad, Math.min(y, maxY));

        tip.style.left = `${x}px`;
        tip.style.top = `${y}px`;
    });

    cy.on("tap", "node", (evt) => {
        const n = evt.target.data();
        info.innerHTML = `
    <div><b>${n.label} ${n.name}</b></div>
    <div>Active: <b>${n.active ? "Yes" : "No (needs road)"}</b></div>
    <div style="margin-top:8px;color:rgba(255,255,255,0.75)">
      Move this building closer/farther to rebalance influence.
    </div>
  `;
                logEvent("info", "graph_node_selected", { id: n.id, type: n.type, active: n.active });
    });

    cy.on("tap", "edge", (evt) => {
        const e = evt.target.data();
        info.innerHTML = `
      <div><b>Edge</b></div>
      <div>Distance by road: <b>${e.distance}</b></div>
      <div>Influence weight: <b>${round2(e.weight)}</b></div>
      <div style="margin-top:8px;color:rgba(255,255,255,0.75)">
        Shorter road distance → stronger effect.
      </div>
    `;
                logEvent("info", "graph_edge_selected", { id: e.id, distance: e.distance, weight: round2(e.weight) });
    });

    // Jiggle: tiny local animation (no layout) to avoid whole-graph reshapes
    let jiggleTimer = null;
    cy.on("dragfree", "node", (evt) => {
        if (jiggleTimer) clearTimeout(jiggleTimer);

        const dragged = evt.target;
        const neighborhood = dragged.closedNeighborhood("node");

        // stop any in-flight animations
        try { neighborhood.stop(); } catch { }

        const base = new Map();
        neighborhood.forEach(n => base.set(n.id(), { ...n.position() }));

        // first: subtle nudge
        neighborhood.forEach(n => {
            if (n.id() === dragged.id()) return;
            const pos = base.get(n.id());
            const dx = (Math.random() - 0.5) * 6;
            const dy = (Math.random() - 0.5) * 6;
            n.animate({
                position: { x: pos.x + dx, y: pos.y + dy },
                duration: 120,
                easing: "ease-out"
            });
        });

        // then: settle back
        jiggleTimer = setTimeout(() => {
            neighborhood.forEach(n => {
                if (n.id() === dragged.id()) return;
                const pos = base.get(n.id());
                n.animate({
                    position: { x: pos.x, y: pos.y },
                    duration: 220,
                    easing: "ease-in-out"
                });
            });
        }, 140);
    });

    async function onShot() {
        await captureGraphScreenshot(cy, "graph");
    }
    shotBtn.addEventListener("click", onShot);

    function close() {
        modal.classList.add("hidden");
        modal.setAttribute("aria-hidden", "true");
        closeBtn.removeEventListener("click", close);
        modal.removeEventListener("click", outside);
        window.removeEventListener("keydown", esc);
        shotBtn.removeEventListener("click", onShot);
        // Cytoscape GC hint
        try { cy.destroy(); } catch { }
        logEvent("info", "graph_close");
    }

    function outside(e) {
        if (e.target === modal) close();
    }
    function esc(e) {
        if (e.key === "Escape") close();
    }

    closeBtn.addEventListener("click", close);
    modal.addEventListener("click", outside);
    window.addEventListener("keydown", esc);
}
