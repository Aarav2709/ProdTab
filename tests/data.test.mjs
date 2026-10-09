import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_PREFERENCES,
  MAX_BOOKMARKS,
  sanitizeBookmarks,
  sanitizePreferences,
  sanitizeProfile,
} from "../assets/js/data.js";

describe("sanitizeProfile", () => {
  it("accepts profiles saved by older versions", () => {
    assert.deepEqual(sanitizeProfile({ name: " Ada ", city: "London" }), {
      name: "Ada",
      city: "London",
      location: null,
    });
  });

  it("makes the city optional", () => {
    assert.deepEqual(sanitizeProfile({ name: "Ada" }), {
      name: "Ada",
      city: "",
      location: null,
    });
  });

  it("requires a name", () => {
    assert.equal(sanitizeProfile({ city: "London" }), null);
    assert.equal(sanitizeProfile(null), null);
  });

  it("drops a location with bad coordinates", () => {
    const profile = sanitizeProfile({
      name: "Ada",
      city: "London",
      location: { latitude: 200, longitude: 0, label: "London" },
    });
    assert.equal(profile.location, null);
  });
});

describe("sanitizeBookmarks", () => {
  it("normalises entries and drops invalid ones", () => {
    assert.deepEqual(
      sanitizeBookmarks([
        { label: " Docs ", href: "developer.mozilla.org" },
        { label: "", href: "https://example.com" },
        { label: "Bad", href: "javascript:alert(1)" },
        "nonsense",
      ]),
      [{ label: "Docs", href: "https://developer.mozilla.org/" }],
    );
  });

  it("caps the list", () => {
    const many = Array.from({ length: MAX_BOOKMARKS + 5 }, (_, i) => ({
      label: `Site ${i}`,
      href: `https://site${i}.example`,
    }));
    assert.equal(sanitizeBookmarks(many).length, MAX_BOOKMARKS);
  });
});

describe("sanitizePreferences", () => {
  it("fills in defaults", () => {
    assert.deepEqual(sanitizePreferences(undefined), DEFAULT_PREFERENCES);
  });

  it("rejects unknown values", () => {
    assert.deepEqual(
      sanitizePreferences({ clockFormat: "36", searchEngine: "altavista" }),
      DEFAULT_PREFERENCES,
    );
  });
});
