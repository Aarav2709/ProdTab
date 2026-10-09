// open meteo lookups and pure weather helpers

import { sanitizeWeatherUnit } from "./data.js";
import { normalizeText } from "./text.js";

export const WEATHER_CACHE_TTL_MS = 1000 * 60 * 45;
export const WEATHER_CACHE_FALLBACK_MS = 1000 * 60 * 60 * 24;

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

export function formatTemperature(tempCelsius, unit) {
  if (typeof tempCelsius !== "number" || Number.isNaN(tempCelsius)) {
    return "--°";
  }

  switch (sanitizeWeatherUnit(unit)) {
    case "F":
      return `${Math.round((tempCelsius * 9) / 5 + 32)}°F`;
    case "K":
      return `${Math.round(tempCelsius + 273.15)}K`;
    default:
      return `${Math.round(tempCelsius)}°C`;
  }
}

// wmo weather codes as returned by open meteo
export function describeWeatherCode(code) {
  if (code === 0) return "Clear sky";
  if (code === 1) return "Mainly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Fog";
  if (code >= 51 && code <= 55) return "Drizzle";
  if (code === 56 || code === 57) return "Freezing drizzle";
  if (code >= 61 && code <= 65) return "Rain";
  if (code === 66 || code === 67) return "Freezing rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Rain showers";
  if (code === 85 || code === 86) return "Snow showers";
  if (code === 95) return "Thunderstorm";
  if (code === 96 || code === 99) return "Thunderstorm with hail";
  return "";
}

export function getWeatherEffect(code) {
  if (typeof code !== "number") return null;
  if (code >= 95) return "storm";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if ((code >= 1 && code <= 3) || code === 45 || code === 48) return "clouds";
  return null;
}

// "paris, france" searches paris and keeps results in france
export function parseCityQuery(text) {
  const [name, ...rest] = normalizeText(text).split(",");
  return {
    name: normalizeText(name),
    qualifiers: rest
      .map((part) => normalizeText(part).toLowerCase())
      .filter(Boolean),
  };
}

function toLocation(result) {
  const label = normalizeText(result?.name);
  const parts = [label, result?.admin1, result?.country]
    .map(normalizeText)
    .filter(Boolean)
    .filter((part, index, all) => all.indexOf(part) === index);

  return {
    latitude: result?.latitude,
    longitude: result?.longitude,
    label,
    detail: parts.join(", "),
  };
}

// every qualifier has to match the country or a region
function matchesQualifiers(result, qualifiers) {
  const fields = [
    result?.country,
    result?.country_code,
    result?.admin1,
    result?.admin2,
  ]
    .map((value) => normalizeText(value).toLowerCase())
    .filter(Boolean);

  return qualifiers.every((qualifier) =>
    fields.some((field) => field.startsWith(qualifier)),
  );
}

export function locationsFromGeocoding(data, qualifiers, limit) {
  const results = Array.isArray(data?.results) ? data.results : [];
  const seen = new Set();

  return results
    .filter((result) => matchesQualifiers(result, qualifiers))
    .map(toLocation)
    .filter((location) => {
      if (!location.label || seen.has(location.detail)) return false;
      if (typeof location.latitude !== "number") return false;
      if (typeof location.longitude !== "number") return false;
      seen.add(location.detail);
      return true;
    })
    .slice(0, limit);
}

export async function searchCities(text, { limit = 5, signal } = {}) {
  const { name, qualifiers } = parseCityQuery(text);
  if (name.length < 2) return [];

  const params = new URLSearchParams({
    name,
    count: String(qualifiers.length ? 20 : limit + 3),
    language: "en",
    format: "json",
  });
  const response = await fetch(`${GEOCODING_URL}?${params}`, { signal });
  if (!response.ok) {
    throw new Error(`Geocoding failed: ${response.status}`);
  }

  return locationsFromGeocoding(await response.json(), qualifiers, limit);
}

export async function fetchCurrentWeather(
  { latitude, longitude },
  { signal } = {},
) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: "temperature_2m,weather_code,is_day",
    timezone: "auto",
  });
  const response = await fetch(`${FORECAST_URL}?${params}`, { signal });
  if (!response.ok) {
    throw new Error(`Forecast failed: ${response.status}`);
  }

  const current = (await response.json())?.current;
  if (!current || typeof current.temperature_2m !== "number") {
    throw new Error("Forecast response missing current conditions.");
  }

  return {
    tempC: current.temperature_2m,
    code: current.weather_code,
    isDay: current.is_day === 1,
  };
}

// confirmed cities are keyed by coordinates so two places named paris never share a cache
export function getWeatherCacheKey(profile) {
  const location = profile?.location;
  if (location) {
    return `${location.latitude.toFixed(3)},${location.longitude.toFixed(3)}`;
  }
  return normalizeText(profile?.city).toLowerCase();
}

export function isCacheEntryUsable(entry, now, maxAgeMs) {
  return (
    Boolean(entry) &&
    typeof entry.tempC === "number" &&
    typeof entry.timestamp === "number" &&
    now - entry.timestamp >= 0 &&
    now - entry.timestamp <= maxAgeMs
  );
}
