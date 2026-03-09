import * as THREE from "three";
import * as OBC from "@thatopen/components";
import * as OBCF from "@thatopen/components-front";

// ── DOM ───────────────────────────────────────────────────────────────────────
const dropZone = document.getElementById("drop-zone");
const fileInput = document.getElementById("file-input");
const app = document.getElementById("app");
const fileNameEl = document.getElementById("file-name");
const spacesList = document.getElementById("spaces-list");
const spaceCount = document.getElementById("space-count");
const viewerContainer = document.getElementById("viewer-container");
const fitBtn = document.getElementById("fit-btn");
const loadBtn = document.getElementById("load-btn");
const samplesRow = document.getElementById("samples-row");
const samplesSelect = document.getElementById("samples-select");
const samplesLoadBtn = document.getElementById("samples-load-btn");

// ── 3D Scene Setup ────────────────────────────────────────────────────────────
const components = new OBC.Components();
const worlds = components.get(OBC.Worlds);
const world = worlds.create();

world.scene = new OBC.SimpleScene(components);
world.renderer = new OBCF.PostproductionRenderer(components, viewerContainer);
world.camera = new OBC.SimpleCamera(components);

components.init();

world.scene.setup();
world.camera.controls.setLookAt(50, 50, 50, 0, 0, 0);

const grids = components.get(OBC.Grids);
const grid = grids.create(world);

const { postproduction } = world.renderer;
postproduction.enabled = true;
if (postproduction.customEffects) {
  postproduction.customEffects.excludedMeshes.push(grid.three);
}

// ── Fragments Manager ─────────────────────────────────────────────────────────
const fragments = components.get(OBC.FragmentsManager);
fragments.init("/worker.mjs");

world.renderer.onBeforeUpdate.add(() => fragments.core.update());

// ── IFC Loader ────────────────────────────────────────────────────────────────
const ifcLoader = components.get(OBC.IfcLoader);
await ifcLoader.setup({
  autoSetWasm: false,
  wasm: { path: "/", absolute: false },
});

let currentModel = null;

// ── Controls ──────────────────────────────────────────────────────────────────
fitBtn.addEventListener("click", () => {
  if (currentModel) world.camera.fitToItems();
});

loadBtn.addEventListener("click", () => {
  app.classList.add("hidden");
  dropZone.classList.remove("hidden");
  fileInput.value = "";
});

// ── Utilities ─────────────────────────────────────────────────────────────────
const esc = (s) => String(s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ── Floor Area from Geometry ──────────────────────────────────────────────────
function computeFloorArea(meshDataArray) {
  const va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3();
  const ab = new THREE.Vector3(), ac = new THREE.Vector3(), cross = new THREE.Vector3();
  let area = 0;

  for (const { positions, indices, transform } of meshDataArray) {
    if (!positions || !indices) continue;
    for (let i = 0; i < indices.length; i += 3) {
      const a = indices[i] * 3, b = indices[i + 1] * 3, c = indices[i + 2] * 3;
      va.set(positions[a], positions[a + 1], positions[a + 2]).applyMatrix4(transform);
      vb.set(positions[b], positions[b + 1], positions[b + 2]).applyMatrix4(transform);
      vc.set(positions[c], positions[c + 1], positions[c + 2]).applyMatrix4(transform);
      ab.subVectors(vb, va);
      ac.subVectors(vc, va);
      cross.crossVectors(ab, ac);
      // Use abs(cross.y) so both Y-up and Z-up IFC models are handled correctly
      area += Math.abs(cross.y) * 0.5;
    }
  }

  return area > 0 ? area : null;
}

// ── Space Extraction ──────────────────────────────────────────────────────────
async function extractSpacesFromModel(model) {
  const result = await model.getItemsOfCategories([/^IFCSPACE$/i]);
  const spaceIds = Object.values(result).flat();

  if (spaceIds.length === 0) return [];

  const [itemsData, geometries] = await Promise.all([
    model.getItemsData(spaceIds, {
      attributesDefault: true,
      relations: {
        IsDefinedBy: { attributes: true, relations: true },
      },
      relationsDefault: { attributes: false, relations: false },
    }),
    model.getItemsGeometry(spaceIds).catch(() => null),
  ]);

  const spaces = itemsData.map((item, idx) => {
    const name = item.Name?.value || "Unnamed";
    const longName = item.LongName?.value || "";
    let area = null;

    const psets = Array.isArray(item.IsDefinedBy) ? item.IsDefinedBy : [];
    for (const pset of psets) {
      const quantities = Array.isArray(pset.Quantities) ? pset.Quantities : [];
      for (const q of quantities) {
        const qName = (q.Name?.value || "").toLowerCase();
        if (qName.includes("area") && q.AreaValue?.value != null) {
          area = q.AreaValue.value;
          break;
        }
      }
      if (area === null) {
        const props = Array.isArray(pset.HasProperties) ? pset.HasProperties : [];
        for (const p of props) {
          const pName = (p.Name?.value || "").toLowerCase();
          if (pName.includes("area") && p.NominalValue?.value != null) {
            area = p.NominalValue.value;
            break;
          }
        }
      }
      if (area !== null) break;
    }

    if (area === null && geometries?.[idx]) {
      area = computeFloorArea(geometries[idx]);
    }

    return { name, longName, area };
  });

  return spaces.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
}

// ── Render Sidebar ────────────────────────────────────────────────────────────
function renderSpaces(spaces) {
  spaceCount.textContent = spaces.length;

  if (spaces.length === 0) {
    spacesList.innerHTML = '<p class="status-msg">No spaces found.</p>';
    return;
  }

  const totalArea = spaces.reduce((sum, s) => sum + (s.area || 0), 0);

  spacesList.innerHTML =
    `<div class="summary">
      <span>${spaces.length} spaces</span>
      <span class="total-area">${totalArea.toFixed(1)} m²</span>
    </div>` +
    spaces
      .map(
        (s) => `
        <div class="space-item">
          <div class="space-name">${esc(s.name)}</div>
          <div class="space-meta">
            <span>${esc(s.longName)}</span>
            <span class="space-area">${
              s.area !== null ? s.area.toFixed(2) + " m²" : "—"
            }</span>
          </div>
        </div>`
      )
      .join("");
}

// ── Load IFC File ─────────────────────────────────────────────────────────────
async function loadIFC(file) {
  dropZone.classList.add("hidden");
  app.classList.remove("hidden");
  fileNameEl.textContent = file.name;
  spacesList.innerHTML = '<p class="status-msg">Loading model…</p>';
  spaceCount.textContent = "";

  try {
    const buffer = await file.arrayBuffer();
    const data = new Uint8Array(buffer);

    // Remove previous model
    if (currentModel) {
      world.scene.three.remove(currentModel.object);
      await currentModel.dispose();
      currentModel = null;
    }

    currentModel = await ifcLoader.load(data, true, file.name);
    world.scene.three.add(currentModel.object);

    currentModel.useCamera(world.camera.three);
    await fragments.core.update(true);

    const box = currentModel.box;
    if (box && !box.isEmpty()) {
      await world.camera.controls.fitToBox(box, true);
    }

    spacesList.innerHTML = '<p class="status-msg">Extracting spaces…</p>';
    const spaces = await extractSpacesFromModel(currentModel);
    renderSpaces(spaces);
  } catch (err) {
    console.error("Error loading IFC:", err);
    spacesList.innerHTML = `<p class="status-msg">Error: ${err.message}</p>`;
  }
}

// ── Drag & Drop ───────────────────────────────────────────────────────────────
dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("drag-over");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("drag-over");
});

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("drag-over");
  const file = e.dataTransfer.files[0];
  if (file?.name.toLowerCase().endsWith(".ifc")) loadIFC(file);
});

fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) loadIFC(file);
});

// ── Sample Files ──────────────────────────────────────────────────────────────
fetch("/samples.json")
  .then((r) => r.json())
  .then((files) => {
    if (!files.length) return;
    files.forEach((name) => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      samplesSelect.appendChild(opt);
    });
    samplesRow.classList.remove("hidden");
  })
  .catch(() => {});

samplesLoadBtn.addEventListener("click", async () => {
  const name = samplesSelect.value;
  if (!name) return;
  const res = await fetch(`/${name}`);
  if (!res.ok) {
    spacesList.innerHTML = `<p class="status-msg">Could not load sample: ${res.statusText}</p>`;
    return;
  }
  const buffer = await res.arrayBuffer();
  const file = new File([buffer], name, { type: "application/octet-stream" });
  loadIFC(file);
});
