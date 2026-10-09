import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildSearchUrl,
  isValidCustomSearchUrl,
  resolveSearchTarget,
} from "../assets/js/search.js";

describe("resolveSearchTarget", () => {
  it("opens addresses directly", () => {
    assert.deepEqual(resolveSearchTarget("example.com", {}), {
      type: "url",
      url: "https://example.com/",
      query: "example.com",
    });
  });

  it("searches DuckDuckGo by default", () => {
    assert.equal(
      resolveSearchTarget("node.js streams", {}).url,
      "https://duckduckgo.com/?q=node.js%20streams",
    );
  });

  it("uses the chosen engine", () => {
    assert.equal(
      resolveSearchTarget("cats", { searchEngine: "google" }).url,
      "https://www.google.com/search?q=cats",
    );
  });

  it("hands off to Firefox only when its search API exists", () => {
    const preferences = { searchEngine: "browser" };
    assert.deepEqual(resolveSearchTarget("cats", preferences, true), {
      type: "browser",
      query: "cats",
    });
    assert.equal(
      resolveSearchTarget("cats", preferences, false).type,
      "search",
    );
  });

  it("ignores empty input", () => {
    assert.equal(resolveSearchTarget("   ", {}), null);
  });
});

describe("custom search URLs", () => {
  it("requires http(s) and a %s placeholder", () => {
    assert.equal(isValidCustomSearchUrl("https://example.com/?q=%s"), true);
    assert.equal(isValidCustomSearchUrl("https://example.com/?q="), false);
    assert.equal(isValidCustomSearchUrl("javascript:%s"), false);
  });

  it("fills every %s with the encoded query", () => {
    assert.equal(
      buildSearchUrl("a&b", "custom", "https://s.example/?q=%s&again=%s"),
      "https://s.example/?q=a%26b&again=a%26b",
    );
  });

  it("falls back to the default when the custom URL is invalid", () => {
    assert.equal(
      buildSearchUrl("x", "custom", "nope"),
      "https://duckduckgo.com/?q=x",
    );
  });
});
