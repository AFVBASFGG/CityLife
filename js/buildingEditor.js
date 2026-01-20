import { uid } from "./utils.js";
import { logEvent } from "./debugTools.js";

function byId(id) {
  return document.getElementById(id);
}

function ensureMeta(b) {
  if (!b) return;
  if (typeof b.name !== "string") b.name = "";
  if (typeof b.description !== "string") b.description = "";
  if (!Array.isArray(b.tasks)) b.tasks = [];
}

export function openBuildingEditor(state) {
  const modal = byId("buildingModal");
  const closeBtn = byId("buildingClose");
  const meta = byId("buildingMeta");
  const nameInput = byId("buildingName");
  const descInput = byId("buildingDesc");
  const taskInput = byId("taskText");
  const taskAdd = byId("taskAdd");
  const taskList = byId("taskList");

  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");

  let building = null;

  function getSelectedBuilding() {
    if (!state.selected || state.selected.kind !== "building") return null;
    return state.buildings.get(state.selected.id) || null;
  }

  function renderTasks() {
    taskList.innerHTML = "";
    if (!building) return;
    for (const task of building.tasks) {
      const row = document.createElement("div");
      row.className = "taskRow";
      row.dataset.taskId = task.id;

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.className = "taskDone";
      cb.checked = !!task.done;
      cb.addEventListener("change", () => {
        task.done = cb.checked;
      });

      const text = document.createElement("input");
      text.type = "text";
      text.value = task.text || "";
      text.addEventListener("input", () => {
        task.text = text.value;
      });

      const del = document.createElement("button");
      del.className = "toolbtn";
      del.textContent = "✕";
      del.addEventListener("click", () => {
        building.tasks = building.tasks.filter(t => t.id !== task.id);
        renderTasks();
      });

      row.appendChild(cb);
      row.appendChild(text);
      row.appendChild(del);
      taskList.appendChild(row);
    }
  }

  function render() {
    building = getSelectedBuilding();
    if (!building) {
      meta.textContent = "Select a building to edit.";
      nameInput.value = "";
      descInput.value = "";
      taskList.innerHTML = "";
      return;
    }

    ensureMeta(building);
    meta.textContent = `${building.type} · ${building.id}`;
    nameInput.value = building.name;
    descInput.value = building.description;
    renderTasks();
  }

  function close() {
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    closeBtn.removeEventListener("click", close);
    modal.removeEventListener("click", outside);
    window.removeEventListener("keydown", esc);
    nameInput.removeEventListener("input", onName);
    descInput.removeEventListener("input", onDesc);
    taskAdd.removeEventListener("click", onAddTask);
    logEvent("info", "building_editor_close");
  }

  function outside(e) {
    if (e.target === modal) close();
  }

  function esc(e) {
    if (e.key === "Escape") close();
  }

  function onName() {
    if (!building) return;
    building.name = nameInput.value;
  }

  function onDesc() {
    if (!building) return;
    building.description = descInput.value;
  }

  function onAddTask() {
    if (!building) return;
    const text = taskInput.value.trim();
    if (!text) return;
    building.tasks.push({ id: uid("task"), text, done: false });
    taskInput.value = "";
    renderTasks();
  }

  nameInput.addEventListener("input", onName);
  descInput.addEventListener("input", onDesc);
  taskAdd.addEventListener("click", onAddTask);
  closeBtn.addEventListener("click", close);
  modal.addEventListener("click", outside);
  window.addEventListener("keydown", esc);

  render();
  logEvent("info", "building_editor_open");
}
