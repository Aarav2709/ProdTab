// limits, defaults and cleanup for everything prodtab stores

import { DEFAULT_SEARCH_ENGINE, SEARCH_ENGINES } from "./search.js";
import { normalizeText } from "./text.js";
import { normalizeUrl } from "./url.js";

export const MAX_BOOKMARKS = 12;
const NAME_MAX_LENGTH = 40;
export const CITY_MAX_LENGTH = 80;
const BOOKMARK_LABEL_MAX_LENGTH = 40;

const THEME_PREFERENCES = ["auto", "system", "light", "dark"];
const DEFAULT_THEME_PREFERENCE = "auto";

const WEATHER_UNITS = ["C", "F", "K"];
const DEFAULT_WEATHER_UNIT = "C";

const CLOCK_FORMATS = ["24", "12"];

export const DEFAULT_PREFERENCES = Object.freeze({
  clockFormat: "24",
  searchEngine: DEFAULT_SEARCH_ENGINE,
  customSearchUrl: "",
});

function isFiniteInRange(value, min, max) {
  return typeof value === "number" && value >= min && value <= max;
}

export function sanitizeLocation(value) {
  if (!value || typeof value !== "object") return null;
  const { latitude, longitude } = value;
  if (!isFiniteInRange(latitude, -90, 90)) return null;
  if (!isFiniteInRange(longitude, -180, 180)) return null;

  const label = normalizeText(value.label).slice(0, CITY_MAX_LENGTH);
  if (!label) return null;

  return {
    latitude,
    longitude,
    label,
    detail: normalizeText(value.detail) || label,
  };
}

export function sanitizeProfile(value) {
  if (!value || typeof value !== "object") return null;

  const name = normalizeText(value.name).slice(0, NAME_MAX_LENGTH);
  if (!name) return null;

  const city = normalizeText(value.city).slice(0, CITY_MAX_LENGTH);
  return {
    name,
    city,
    location: city ? sanitizeLocation(value.location) : null,
  };
}

export function sanitizeBookmarks(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      const label = normalizeText(entry?.label).slice(
        0,
        BOOKMARK_LABEL_MAX_LENGTH,
      );
      const href = normalizeUrl(entry?.href);
      return label && href ? { label, href } : null;
    })
    .filter(Boolean)
    .slice(0, MAX_BOOKMARKS);
}

export function sanitizeThemePreference(value) {
  return THEME_PREFERENCES.includes(value) ? value : DEFAULT_THEME_PREFERENCE;
}

export function sanitizeWeatherUnit(value) {
  return WEATHER_UNITS.includes(value) ? value : DEFAULT_WEATHER_UNIT;
}

export function sanitizePreferences(value) {
  const source = value && typeof value === "object" ? value : {};

  const clockFormat = CLOCK_FORMATS.includes(source.clockFormat)
    ? source.clockFormat
    : DEFAULT_PREFERENCES.clockFormat;

  const searchEngine = Object.hasOwn(SEARCH_ENGINES, source.searchEngine)
    ? source.searchEngine
    : DEFAULT_PREFERENCES.searchEngine;

  return {
    clockFormat,
    searchEngine,
    customSearchUrl: normalizeText(source.customSearchUrl).slice(0, 500),
  };
}
