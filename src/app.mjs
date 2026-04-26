import { buildGen3ExportArtifacts, normalizeSlug, titleFromName } from "./lib/gen3-exporter.mjs";

const romInput = document.querySelector("#rom-file");
const tomlInput = document.querySelector("#toml-file");
const romFileName = document.querySelector("#rom-file-name");
const tomlFileName = document.querySelector("#toml-file-name");
const slugInput = document.querySelector("#slug-input");
const titleInput = document.querySelector("#title-input");
const generateButton = document.querySelector("#generate-button");
const downloadAllButton = document.querySelector("#download-all-button");
const downloadCalcButton = document.querySelector("#download-calc-button");
const downloadDexButton = document.querySelector("#download-dex-button");
const downloadSearchButton = document.querySelector("#download-search-button");
const statusBanner = document.querySelector("#status-banner");
const errorBanner = document.querySelector("#error-banner");
const calcMeta = document.querySelector("#calc-meta");
const dexMeta = document.querySelector("#dex-meta");
const searchMeta = document.querySelector("#search-meta");
const summaryGrid = document.querySelector("#summary-grid");

const summaryFields = [
  ["species", "species"],
  ["moves", "moves"],
  ["abilities", "abilities"],
  ["items", "items"],
  ["trainers", "trainers"],
  ["calc_species", "calc species"],
  ["calc_moves", "calc moves"],
  ["calc_formatted_set_species", "calc formatted set species"],
  ["dex_species", "dex species"],
  ["dex_moves", "dex moves"],
  ["dex_locations", "dex locations"],
];

const state = {
  romFile: null,
  tomlFile: null,
  result: null,
};

function bytesLabel(text) {
  const size = new TextEncoder().encode(text).length;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function setStatus(message) {
  statusBanner.textContent = message;
}

function setError(message) {
  if (!message) {
    errorBanner.hidden = true;
    errorBanner.textContent = "";
    return;
  }
  errorBanner.hidden = false;
  errorBanner.textContent = message;
}

function validateFileSelection() {
  if (!state.romFile || !state.tomlFile) return false;
  if (!/\.gba$/i.test(state.romFile.name)) throw new Error("Select a `.gba` ROM file.");
  if (!/\.toml$/i.test(state.tomlFile.name)) throw new Error("Select an HMA-style `.toml` layout file.");
  return true;
}

function updateFileLabels() {
  romFileName.textContent = state.romFile ? state.romFile.name : "No ROM selected";
  tomlFileName.textContent = state.tomlFile ? state.tomlFile.name : "No layout selected";
}

function updateMetadataDefaults() {
  if (state.romFile && !slugInput.value.trim()) slugInput.value = normalizeSlug(state.romFile.name);
  if (state.romFile && !titleInput.value.trim()) titleInput.value = titleFromName(state.romFile.name);
}

function renderSummary(summary) {
  summaryGrid.innerHTML = "";
  for (const [key, label] of summaryFields) {
    const card = document.createElement("article");
    card.className = "summary-card";
    card.innerHTML = `
      <div class="summary-label">${label}</div>
      <div class="summary-value">${summary[key] ?? "—"}</div>
    `;
    summaryGrid.appendChild(card);
  }
}

function downloadFile(file) {
  const blob = new Blob([file.text], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function updateOutputs() {
  const result = state.result;
  const ready = Boolean(result);
  downloadAllButton.disabled = !ready;
  downloadCalcButton.disabled = !ready;
  downloadDexButton.disabled = !ready;
  downloadSearchButton.disabled = !ready;
  if (!ready) {
    calcMeta.textContent = "Waiting for generation";
    dexMeta.textContent = "Waiting for generation";
    searchMeta.textContent = "Waiting for generation";
    summaryGrid.innerHTML = "";
    return;
  }
  calcMeta.textContent = `${result.files.calc.filename} • ${bytesLabel(result.files.calc.text)}`;
  dexMeta.textContent = `${result.files.dex.filename} • ${bytesLabel(result.files.dex.text)}`;
  searchMeta.textContent = `${result.files.searchIndex.filename} • ${bytesLabel(result.files.searchIndex.text)}`;
  renderSummary(result.summary);
}

romInput.addEventListener("change", () => {
  state.romFile = romInput.files?.[0] || null;
  updateFileLabels();
  updateMetadataDefaults();
  setError("");
});

tomlInput.addEventListener("change", () => {
  state.tomlFile = tomlInput.files?.[0] || null;
  updateFileLabels();
  setError("");
});

generateButton.addEventListener("click", async () => {
  try {
    setError("");
    validateFileSelection();
    const slug = normalizeSlug(slugInput.value || state.romFile.name);
    const title = titleInput.value.trim() || titleFromName(state.romFile.name);
    setStatus("Reading files...");
    const [romBytes, tomlText] = await Promise.all([
      state.romFile.arrayBuffer(),
      state.tomlFile.text(),
    ]);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    setStatus("Generating calc and ddex outputs in-browser...");
    state.result = buildGen3ExportArtifacts({
      romBytes: new Uint8Array(romBytes),
      tomlText,
      slug,
      title,
    });
    updateOutputs();
    setStatus(`Generated ${state.result.files.calc.filename}, ${state.result.files.dex.filename}, and ${state.result.files.searchIndex.filename}.`);
  } catch (error) {
    state.result = null;
    updateOutputs();
    setError(error instanceof Error ? error.message : String(error));
    setStatus("Generation failed.");
  }
});

downloadAllButton.addEventListener("click", () => {
  if (!state.result) return;
  downloadFile(state.result.files.calc);
  downloadFile(state.result.files.dex);
  downloadFile(state.result.files.searchIndex);
});

downloadCalcButton.addEventListener("click", () => state.result && downloadFile(state.result.files.calc));
downloadDexButton.addEventListener("click", () => state.result && downloadFile(state.result.files.dex));
downloadSearchButton.addEventListener("click", () => state.result && downloadFile(state.result.files.searchIndex));

updateFileLabels();
updateOutputs();
setStatus("Upload one `.gba` ROM and one required `.toml` layout file to begin.");
