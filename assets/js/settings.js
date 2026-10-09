// settings dialog: setup mode on first run only asks for name and city, edit mode adds preferences

import { CITY_MAX_LENGTH, sanitizeLocation } from "./data.js";
import { closeDialog, openDialog, setDialogDismissible } from "./dialog.js";
import {
  SEARCH_ENGINES,
  hasBrowserSearch,
  isValidCustomSearchUrl,
} from "./search.js";
import { normalizeText, sameText } from "./text.js";
import { searchCities } from "./weather.js";

const CITY_LOOKUP_DEBOUNCE_MS = 450;
const EMPTY_LOOKUP = { query: "", results: [], error: false, shown: false };

let options = null;
let mode = "setup";
let lookup = { ...EMPTY_LOOKUP };
let lookupController = null;
let lookupTimerId = null;
const els = {};

function setError(message, focusTarget) {
  els.error.textContent = message;
  els.error.classList.toggle("hidden", !message);
  focusTarget?.focus();
}

function setCityStatus(message) {
  els.cityStatus.textContent = message;
  els.cityStatus.classList.toggle("hidden", !message);
}

function clearCityMatches() {
  els.cityMatches.classList.add("hidden");
  els.cityMatchList.replaceChildren();
  lookup.shown = false;
}

function createMatchOption(location, index) {
  const label = document.createElement("label");
  label.className = "city-match";
  const radio = document.createElement("input");
  radio.type = "radio";
  radio.name = "city-match";
  radio.value = String(index);
  radio.checked = index === 0;
  const text = document.createElement("span");
  text.textContent = location.detail;
  label.append(radio, text);
  return label;
}

function renderCityMatches(results) {
  clearCityMatches();
  if (results.length === 0) {
    setCityStatus("No matching city yet.");
    return;
  }
  if (results.length === 1) {
    setCityStatus(`Found ${results[0].detail}.`);
    return;
  }

  setCityStatus("");
  els.cityMatchList.replaceChildren(...results.map(createMatchOption));
  els.cityMatches.classList.remove("hidden");
  lookup.shown = true;
}

// matches the saved city as typed or as shown in the field
function isSavedCity(text) {
  const profile = options.getState().profile;
  if (!profile?.location) return false;
  return (
    sameText(profile.city, text) || sameText(profile.location.detail, text)
  );
}

async function runCityLookup(text) {
  lookupController?.abort();
  const controller = new AbortController();
  lookupController = controller;
  setCityStatus("Looking up city…");

  try {
    const results = await searchCities(text, { signal: controller.signal });
    if (controller.signal.aborted) return;
    lookup = { ...EMPTY_LOOKUP, query: text, results };
    renderCityMatches(results);
  } catch {
    if (controller.signal.aborted) return;
    lookup = { ...EMPTY_LOOKUP, query: text, error: true };
    clearCityMatches();
    setCityStatus("Couldn't reach the weather service.");
  } finally {
    if (lookupController === controller) lookupController = null;
  }
}

function handleCityInput() {
  clearTimeout(lookupTimerId);
  lookupController?.abort();
  clearCityMatches();
  setCityStatus("");
  lookup = { ...EMPTY_LOOKUP };

  const text = normalizeText(els.city.value);
  if (text.length < 2 || isSavedCity(text)) return;
  lookupTimerId = setTimeout(
    () => runCityLookup(text),
    CITY_LOOKUP_DEBOUNCE_MS,
  );
}

// returns { location } once the city is settled, or null after telling the user what to fix
async function resolveCity(cityText) {
  if (!cityText) return { location: null };
  if (isSavedCity(cityText)) {
    return { location: options.getState().profile.location };
  }

  if (lookup.query !== cityText || lookup.error) {
    clearTimeout(lookupTimerId);
    await runCityLookup(cityText);
  }

  if (lookup.error) {
    setError(
      "Couldn't reach the weather service to check your city. Check your connection, or leave the city empty for now.",
      els.city,
    );
    return null;
  }

  const { results } = lookup;
  if (!results.length) {
    setError(
      `Couldn't find a city called “${cityText}”. Check the spelling, or add a country, like “Paris, France”.`,
      els.city,
    );
    return null;
  }

  if (results.length > 1 && !lookup.shown) {
    renderCityMatches(results);
    setError("Several places match. Pick one, then save again.");
    return null;
  }

  const checked = els.cityMatchList.querySelector("input:checked");
  return { location: sanitizeLocation(results[Number(checked?.value) || 0]) };
}

function fillEngineOptions(selected) {
  const engines = Object.entries(SEARCH_ENGINES).filter(
    ([id]) => id !== "browser" || hasBrowserSearch(),
  );
  els.engine.replaceChildren(
    ...engines.map(([id, engine]) => new Option(engine.label, id)),
  );
  const available = engines.some(([id]) => id === selected);
  els.engine.value = available ? selected : "duckduckgo";
}

function updateCustomEngineVisibility() {
  els.customEngineRow.classList.toggle("hidden", els.engine.value !== "custom");
}

function fillForm() {
  const { profile, preferences, theme, weatherUnit } = options.getState();

  els.name.value = profile?.name || "";
  els.city.value = profile?.location?.detail || profile?.city || "";
  els.theme.value = theme;
  els.clock.value = preferences.clockFormat;
  els.unit.value = weatherUnit;
  fillEngineOptions(preferences.searchEngine);
  els.customEngine.value = preferences.customSearchUrl;
  updateCustomEngineVisibility();
}

function applyMode() {
  const isSetup = mode === "setup";
  els.title.textContent = isSetup ? "Welcome to ProdTab" : "Settings";
  els.description.textContent = isSetup
    ? "Set up your name and city once. You can change them any time."
    : "Update your profile and preferences.";
  els.submit.textContent = isSetup ? "Save" : "Save Changes";
  els.cancel.classList.toggle("hidden", isSetup);
  els.preferences.classList.toggle("hidden", isSetup);
  setDialogDismissible(els.dialog, !isSetup);
}

export function openSettings(nextMode) {
  mode = nextMode;
  lookup = { ...EMPTY_LOOKUP };
  clearCityMatches();
  setCityStatus("");
  setError("");
  fillForm();
  applyMode();
  openDialog(els.dialog, {
    dismissible: mode !== "setup",
    initialFocus: els.name,
  });
}

function readPreferences() {
  return {
    theme: els.theme.value,
    weatherUnit: els.unit.value,
    preferences: {
      clockFormat: els.clock.value,
      searchEngine: els.engine.value,
      customSearchUrl: normalizeText(els.customEngine.value),
    },
  };
}

async function handleSubmit(event) {
  event.preventDefault();
  setError("");

  const name = normalizeText(els.name.value);
  if (!name) {
    setError("Please enter your name.", els.name);
    return;
  }

  // an untouched field shows the full place name, so keep the city as originally typed
  let cityText = normalizeText(els.city.value).slice(0, CITY_MAX_LENGTH);
  if (isSavedCity(cityText)) cityText = options.getState().profile.city;

  const needsCustomUrl = mode === "edit" && els.engine.value === "custom";
  if (needsCustomUrl && !isValidCustomSearchUrl(els.customEngine.value)) {
    setError(
      "The custom search address must start with https:// and contain %s where the search words go.",
      els.customEngine,
    );
    return;
  }

  const label = els.submit.textContent;
  els.submit.disabled = true;
  els.submit.textContent = "Checking…";
  let city;
  try {
    city = await resolveCity(cityText);
  } finally {
    els.submit.disabled = false;
    els.submit.textContent = label;
  }
  if (!city) return;

  options.onSave({
    profile: { name, city: cityText, location: city.location },
    ...(mode === "edit" ? readPreferences() : {}),
  });
  closeDialog(els.dialog);
}

export function initSettings(settingsOptions) {
  options = settingsOptions;
  Object.assign(els, {
    dialog: document.getElementById("settings-dialog"),
    form: document.getElementById("settings-form"),
    title: document.getElementById("settings-title"),
    description: document.getElementById("settings-description"),
    name: document.getElementById("settings-name"),
    city: document.getElementById("settings-city"),
    cityStatus: document.getElementById("settings-city-status"),
    cityMatches: document.getElementById("settings-city-matches"),
    cityMatchList: document.getElementById("settings-city-match-list"),
    preferences: document.getElementById("settings-preferences"),
    theme: document.getElementById("settings-theme"),
    clock: document.getElementById("settings-clock"),
    unit: document.getElementById("settings-unit"),
    engine: document.getElementById("settings-engine"),
    customEngineRow: document.getElementById("settings-custom-engine-row"),
    customEngine: document.getElementById("settings-custom-engine"),
    error: document.getElementById("settings-error"),
    cancel: document.getElementById("settings-cancel-btn"),
    submit: document.getElementById("settings-submit-btn"),
  });

  els.form.addEventListener("submit", handleSubmit);
  els.form.addEventListener("input", () => setError(""));
  els.city.addEventListener("input", handleCityInput);
  els.engine.addEventListener("change", updateCustomEngineVisibility);
  els.cancel.addEventListener("click", () => closeDialog(els.dialog));
}
