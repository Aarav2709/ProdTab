// local storage wrappers that never throw, so the page works even without storage

import {
  sanitizeBookmarks,
  sanitizePreferences,
  sanitizeProfile,
  sanitizeThemePreference,
  sanitizeWeatherUnit,
} from "./data.js";

const STORAGE_KEYS = {
  profile: "prodtab.profile.v1",
  bookmarks: "prodtab.bookmarks.v1",
  preferences: "prodtab.preferences.v1",
  theme: "prodtab.theme.v1",
  // last auto theme result, read before first paint to avoid a flash
  resolvedTheme: "prodtab.theme.resolved.v1",
  weatherCache: "prodtab.weather.cache.v1",
  weatherUnit: "prodtab.weather.unit.v1",
};

// keys from older versions that nothing reads anymore
const RETIRED_KEYS = ["prodtab.search.history.v1"];

function storageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore persistence failures
  }
}

function storageRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore persistence failures
  }
}

function readJson(key) {
  const raw = storageGet(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeJson(key, value) {
  storageSet(key, JSON.stringify(value));
}

export function removeRetiredKeys() {
  RETIRED_KEYS.forEach(storageRemove);
}

export function loadProfile() {
  return sanitizeProfile(readJson(STORAGE_KEYS.profile));
}

export function saveProfile(profile) {
  writeJson(STORAGE_KEYS.profile, profile);
}

export function loadBookmarks() {
  return sanitizeBookmarks(readJson(STORAGE_KEYS.bookmarks));
}

export function saveBookmarks(bookmarks) {
  writeJson(STORAGE_KEYS.bookmarks, bookmarks);
}

export function loadPreferences() {
  return sanitizePreferences(readJson(STORAGE_KEYS.preferences));
}

export function savePreferences(preferences) {
  writeJson(STORAGE_KEYS.preferences, preferences);
}

export function loadThemePreference() {
  return sanitizeThemePreference(storageGet(STORAGE_KEYS.theme));
}

export function saveThemePreference(preference) {
  storageSet(STORAGE_KEYS.theme, preference);
}

export function saveResolvedTheme(mode) {
  storageSet(STORAGE_KEYS.resolvedTheme, mode);
}

export function loadWeatherUnit() {
  return sanitizeWeatherUnit(storageGet(STORAGE_KEYS.weatherUnit));
}

export function saveWeatherUnit(unit) {
  storageSet(STORAGE_KEYS.weatherUnit, unit);
}

export function readWeatherCache(key) {
  if (!key) return null;
  const entry = readJson(STORAGE_KEYS.weatherCache)?.[key];
  return entry && typeof entry === "object" ? entry : null;
}

// only the current city is kept so the cache never grows
export function writeWeatherCache(key, entry) {
  if (!key) return;
  writeJson(STORAGE_KEYS.weatherCache, { [key]: entry });
}
