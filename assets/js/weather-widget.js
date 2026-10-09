import { readWeatherCache, writeWeatherCache } from "./storage.js";
import {
  WEATHER_CACHE_FALLBACK_MS,
  WEATHER_CACHE_TTL_MS,
  describeWeatherCode,
  fetchCurrentWeather,
  formatTemperature,
  getWeatherCacheKey,
  isCacheEntryUsable,
  searchCities,
} from "./weather.js";

let options = null;
let latest = null;
let requestId = 0;
let inFlight = null;
const els = {};

export function renderWeather() {
  els.widget.classList.toggle("hidden", !latest);
  if (!latest) return;

  els.temp.textContent = formatTemperature(latest.tempC, options.getUnit());
  els.city.textContent = latest.cityLabel || "";

  const description = latest.error
    ? "Weather unavailable"
    : describeWeatherCode(latest.code);
  els.widget.title = description;
  els.description.textContent = description ? `${description}.` : "";
}

function show(entry) {
  latest = entry;
  renderWeather();
  options.onConditions({ code: entry?.code ?? 0, isDay: entry?.isDay ?? null });
}

export async function loadWeather({ force = false } = {}) {
  const profile = options.getProfile();
  const id = ++requestId;

  if (!profile?.city) {
    inFlight = null;
    show(null);
    return;
  }

  const key = getWeatherCacheKey(profile);
  const cache = readWeatherCache(key);
  const now = Date.now();
  const isFresh = isCacheEntryUsable(cache, now, WEATHER_CACHE_TTL_MS);
  const isUsable = isCacheEntryUsable(cache, now, WEATHER_CACHE_FALLBACK_MS);
  const cityLabel = profile.location?.label || profile.city;

  if (isUsable) {
    show({ ...cache, cityLabel: cache.cityLabel || cityLabel });
  } else {
    latest = { tempC: null, cityLabel };
    renderWeather();
  }

  if (isFresh && !force) return;
  if (inFlight?.key === key && !force) return inFlight.promise;

  const promise = (async () => {
    try {
      let location = profile.location;
      if (!location) {
        // profiles from older versions only have a city name
        [location] = await searchCities(profile.city, { limit: 1 });
        if (!location) throw new Error("City not found.");
        if (id === requestId) options.onLocationResolved(location);
      }

      const conditions = await fetchCurrentWeather(location);
      if (id !== requestId) return;

      const entry = {
        ...conditions,
        cityLabel: location.label,
        timestamp: Date.now(),
      };
      writeWeatherCache(getWeatherCacheKey({ ...profile, location }), entry);
      show(entry);
    } catch {
      if (id !== requestId || isUsable) return;
      // keep effects and theme as they are, only the widget shows the failure
      latest = { tempC: null, cityLabel, error: true };
      renderWeather();
    } finally {
      if (inFlight?.promise === promise) inFlight = null;
    }
  })();

  inFlight = { key, promise };
  return promise;
}

export function refreshWeatherIfStale() {
  const profile = options.getProfile();
  if (!profile?.city) return;

  const cache = readWeatherCache(getWeatherCacheKey(profile));
  if (!isCacheEntryUsable(cache, Date.now(), WEATHER_CACHE_TTL_MS)) {
    loadWeather({ force: true });
  }
}

export function initWeatherWidget(widgetOptions) {
  options = widgetOptions;
  Object.assign(els, {
    widget: document.getElementById("weather"),
    temp: document.getElementById("wx-temp"),
    city: document.getElementById("wx-city"),
    description: document.getElementById("wx-description"),
  });

  renderWeather();
}
