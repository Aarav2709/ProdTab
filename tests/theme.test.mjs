import assert from "node:assert/strict";
import { describe, it } from "node:test";

// theme.js only touches the page inside its functions, so node can import it
import { resolveTheme } from "../assets/js/theme.js";

describe("resolveTheme", () => {
  it("honours an explicit choice", () => {
    assert.equal(resolveTheme("light", false, true), "light");
    assert.equal(resolveTheme("dark", true, false), "dark");
  });

  it("follows daylight in auto mode", () => {
    assert.equal(resolveTheme("auto", true, true), "light");
    assert.equal(resolveTheme("auto", false, false), "dark");
  });

  it("falls back to the system setting when daylight is unknown", () => {
    assert.equal(resolveTheme("auto", null, true), "dark");
    assert.equal(resolveTheme("auto", null, false), "light");
  });

  it("can always follow the system", () => {
    assert.equal(resolveTheme("system", true, true), "dark");
    assert.equal(resolveTheme("system", false, false), "light");
  });
});
