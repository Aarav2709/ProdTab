import { trackActivity } from "./activity.js";
import { initBookmarks } from "./bookmarks.js";
import { formatTime, getGreeting, startClock } from "./clock.js";
import { sanitizeProfile } from "./data.js";
import {
  initEffects,
  refreshEffectsForDate,
  setEffectsPaused,
  setWeatherCode,
} from "./effects.js";
import {
  DEFAULT_SEARCH_ENGINE,
  buildSearchUrl,
  hasBrowserSearch,
  resolveSearchTarget,
} from "./search.js";
import { initSettings, openSettings } from "./settings.js";
import {
  loadPreferences,
  loadProfile,
  loadWeatherUnit,
  removeRetiredKeys,
  savePreferences,
  saveProfile,
  saveWeatherUnit,
} from "./storage.js";
import {
  getThemePreference,
  initTheme,
  setDaylight,
  setThemePreference,
} from "./theme.js";
import { initToast } from "./toast.js";
import {
  initWeatherWidget,
  loadWeather,
  refreshWeatherIfStale,
  renderWeather,
} from "./weather-widget.js";

const state = {
  profile: loadProfile(),
  preferences: loadPreferences(),
  weatherUnit: loadWeatherUnit(),
};

const clockEl = document.getElementById("clock");
const clockPeriodEl = document.getElementById("clock-period");
const greetingEl = document.getElementById("greeting");
const searchInput = document.getElementById("search");

function getState() {
  return {
    profile: state.profile,
    preferences: state.preferences,
    theme: getThemePreference(),
    weatherUnit: state.weatherUnit,
  };
}

function renderClock(now = new Date()) {
  const { time, period } = formatTime(now, state.preferences.clockFormat);
  clockEl.textContent = time;
  clockPeriodEl.textContent = period;
  clockPeriodEl.classList.toggle("hidden", !period);
  greetingEl.textContent = getGreeting(now, state.profile?.name || "friend");
  refreshEffectsForDate(now);
}

function setWeatherUnit(unit) {
  state.weatherUnit = unit;
  saveWeatherUnit(unit);
  renderWeather();
}

function sameLocation(a, b) {
  return (
    (a?.city || "") === (b?.city || "") &&
    a?.location?.latitude === b?.location?.latitude &&
    a?.location?.longitude === b?.location?.longitude
  );
}

function applySettings({ profile, preferences, theme, weatherUnit }) {
  const previous = state.profile;
  state.profile = sanitizeProfile(profile);
  saveProfile(state.profile);

  if (preferences) {
    state.preferences = preferences;
    savePreferences(preferences);
  }
  if (theme) setThemePreference(theme);
  if (weatherUnit) setWeatherUnit(weatherUnit);

  renderClock();
  if (!sameLocation(previous, state.profile)) {
    loadWeather({ force: true });
  }
}

async function submitSearch(rawValue) {
  const target = resolveSearchTarget(
    rawValue,
    state.preferences,
    hasBrowserSearch(),
  );
  if (!target) return;

  if (target.type === "browser") {
    try {
      await globalThis.browser.search.query({
        text: target.query,
        disposition: "CURRENT_TAB",
      });
    } catch {
      window.location.assign(
        buildSearchUrl(target.query, DEFAULT_SEARCH_ENGINE),
      );
    }
    return;
  }

  window.location.assign(target.url);
}

removeRetiredKeys();
initToast();
initTheme(document.getElementById("theme-toggle-btn"));
initEffects(
  document.getElementById("dynamic-effects"),
  document.getElementById("fireworks-canvas"),
);
initBookmarks();

initWeatherWidget({
  getProfile: () => state.profile,
  getUnit: () => state.weatherUnit,
  onLocationResolved: (location) => {
    state.profile = sanitizeProfile({ ...state.profile, location });
    saveProfile(state.profile);
  },
  onConditions: ({ code, isDay }) => {
    setWeatherCode(code);
    setDaylight(isDay);
  },
});

initSettings({ getState, onSave: applySettings });

const activity = trackActivity({
  onPausedChange: setEffectsPaused,
  onVisible: refreshWeatherIfStale,
});

searchInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" || !searchInput.value.trim()) return;
  event.preventDefault();
  submitSearch(searchInput.value);
});

document.getElementById("settings-btn").addEventListener("click", () => {
  openSettings("edit");
});

document.getElementById("settings-dialog").addEventListener("close", () => {
  activity.markActive();
});

startClock(renderClock);

if (state.profile) {
  loadWeather();
} else {
  openSettings("setup");
}
