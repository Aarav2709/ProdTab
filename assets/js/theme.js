import {
  loadThemePreference,
  saveResolvedTheme,
  saveThemePreference,
} from "./storage.js";
import { sanitizeThemePreference } from "./data.js";

// auto follows daylight in the user's city and falls back to the system setting
export function resolveTheme(preference, isDaylight, systemPrefersDark) {
  if (preference === "light" || preference === "dark") return preference;
  if (preference === "auto" && typeof isDaylight === "boolean") {
    return isDaylight ? "light" : "dark";
  }
  return systemPrefersDark ? "dark" : "light";
}

let preference = "auto";
let isDaylight = null;
let systemQuery = null;
let toggleButton = null;

function apply() {
  const mode = resolveTheme(preference, isDaylight, systemQuery.matches);
  document.documentElement.classList.toggle("dark-theme", mode === "dark");
  // keep the last daylight result until the weather loads
  if (preference === "auto" && typeof isDaylight === "boolean") {
    saveResolvedTheme(mode);
  }

  if (toggleButton) {
    const isDark = mode === "dark";
    const label = isDark ? "Switch to light mode" : "Switch to dark mode";
    toggleButton.classList.toggle("is-dark", isDark);
    toggleButton.setAttribute("aria-label", label);
    toggleButton.title = label;
  }
}

export function initTheme(button) {
  toggleButton = button;
  preference = loadThemePreference();
  systemQuery = window.matchMedia("(prefers-color-scheme: dark)");
  systemQuery.addEventListener("change", apply);

  toggleButton?.addEventListener("click", () => {
    const isDark = document.documentElement.classList.contains("dark-theme");
    setThemePreference(isDark ? "light" : "dark");
  });

  apply();
}

export function getThemePreference() {
  return preference;
}

export function setThemePreference(value) {
  preference = sanitizeThemePreference(value);
  saveThemePreference(preference);
  apply();
}

// null means no city, so auto falls back to the system setting
export function setDaylight(value) {
  isDaylight = typeof value === "boolean" ? value : null;
  if (isDaylight === null) saveResolvedTheme("");
  apply();
}
