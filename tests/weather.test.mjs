import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  WEATHER_CACHE_TTL_MS,
  formatTemperature,
  getWeatherCacheKey,
  getWeatherEffect,
  isCacheEntryUsable,
  locationsFromGeocoding,
  parseCityQuery,
} from "../assets/js/weather.js";

describe("formatTemperature", () => {
  it("converts between units", () => {
    assert.equal(formatTemperature(21.4, "C"), "21°C");
    assert.equal(formatTemperature(21.4, "F"), "71°F");
    assert.equal(formatTemperature(21.4, "K"), "295K");
  });

  it("shows a placeholder for missing data", () => {
    assert.equal(formatTemperature(null, "C"), "--°");
    assert.equal(formatTemperature(Number.NaN, "C"), "--°");
  });
});

describe("getWeatherEffect", () => {
  it("shows rain showers as rain, not snow", () => {
    assert.equal(getWeatherEffect(80), "rain");
    assert.equal(getWeatherEffect(82), "rain");
  });

  it("maps the other condition groups", () => {
    assert.equal(getWeatherEffect(0), null);
    assert.equal(getWeatherEffect(2), "clouds");
    assert.equal(getWeatherEffect(45), "clouds");
    assert.equal(getWeatherEffect(63), "rain");
    assert.equal(getWeatherEffect(75), "snow");
    assert.equal(getWeatherEffect(86), "snow");
    assert.equal(getWeatherEffect(95), "storm");
  });
});

describe("city lookup", () => {
  const geocoding = {
    results: [
      {
        name: "Paris",
        latitude: 48.85,
        longitude: 2.35,
        country: "France",
        country_code: "FR",
        admin1: "Île-de-France",
      },
      {
        name: "Paris",
        latitude: 33.66,
        longitude: -95.55,
        country: "United States",
        country_code: "US",
        admin1: "Texas",
      },
      {
        name: "Paris",
        latitude: 33.66,
        longitude: -95.55,
        country: "United States",
        country_code: "US",
        admin1: "Texas",
      },
      {
        name: "Paris",
        latitude: 36.3,
        longitude: -88.33,
        country: "United States",
        country_code: "US",
        admin1: "Tennessee",
      },
    ],
  };

  it("splits a name from its qualifiers", () => {
    assert.deepEqual(parseCityQuery(" Paris ,  Texas, US "), {
      name: "Paris",
      qualifiers: ["texas", "us"],
    });
  });

  it("drops duplicate places", () => {
    const locations = locationsFromGeocoding(geocoding, [], 5);
    assert.deepEqual(
      locations.map((location) => location.detail),
      [
        "Paris, Île-de-France, France",
        "Paris, Texas, United States",
        "Paris, Tennessee, United States",
      ],
    );
  });

  it("filters by country or region", () => {
    const [texas, ...rest] = locationsFromGeocoding(geocoding, ["tex"], 5);
    assert.equal(texas.detail, "Paris, Texas, United States");
    assert.equal(rest.length, 0);
    assert.equal(locationsFromGeocoding(geocoding, ["us"], 5).length, 2);
    assert.equal(locationsFromGeocoding(geocoding, ["japan"], 5).length, 0);
  });

  it("copes with an empty response", () => {
    assert.deepEqual(locationsFromGeocoding({}, [], 5), []);
  });
});

describe("weather cache", () => {
  it("keys confirmed cities by coordinates", () => {
    assert.equal(
      getWeatherCacheKey({
        city: "Paris",
        location: { latitude: 48.8566, longitude: 2.3522 },
      }),
      "48.857,2.352",
    );
    assert.equal(getWeatherCacheKey({ city: " Paris " }), "paris");
  });

  it("checks age and shape", () => {
    const now = 1_000_000_000;
    const entry = { tempC: 10, timestamp: now - 1000 };
    assert.equal(isCacheEntryUsable(entry, now, WEATHER_CACHE_TTL_MS), true);
    assert.equal(
      isCacheEntryUsable(
        { ...entry, timestamp: now - WEATHER_CACHE_TTL_MS - 1 },
        now,
        WEATHER_CACHE_TTL_MS,
      ),
      false,
    );
    assert.equal(isCacheEntryUsable({ timestamp: now }, now, 1000), false);
    assert.equal(isCacheEntryUsable(null, now, 1000), false);
    // a timestamp from the future is not trusted
    assert.equal(
      isCacheEntryUsable({ tempC: 1, timestamp: now + 5 }, now, 1000),
      false,
    );
  });
});
