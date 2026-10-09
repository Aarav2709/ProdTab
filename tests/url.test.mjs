import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getFaviconUrl,
  isLikelyUrlInput,
  normalizeUrl,
} from "../assets/js/url.js";

describe("isLikelyUrlInput", () => {
  const addresses = [
    "example.com",
    "github.com/Aarav2709/ProdTab",
    "www.readme.md",
    "readme.md/docs",
    "https://node.js",
    "http://intranet",
    "localhost",
    "localhost:3000",
    "192.168.1.1",
    "192.168.1.1:8080/admin",
    "[::1]:8080",
    "bbc.co.uk",
    "münchen.de",
    "foo.bar",
  ];

  const searches = [
    "node.js",
    "3.14",
    "e.g.",
    "readme.md",
    "main.py",
    "archive.zip",
    "vue.js vs react",
    "hello",
    "name@example.com",
    "1.2.3",
    "999.1.1.1",
    ".com",
    "example..com",
    "-bad.com",
    "ftp://example.com",
    "",
  ];

  for (const input of addresses) {
    it(`treats ${JSON.stringify(input)} as an address`, () => {
      assert.equal(isLikelyUrlInput(input), true);
    });
  }

  for (const input of searches) {
    it(`treats ${JSON.stringify(input)} as a search`, () => {
      assert.equal(isLikelyUrlInput(input), false);
    });
  }
});

describe("normalizeUrl", () => {
  it("adds https:// to bare domains", () => {
    assert.equal(normalizeUrl("example.com"), "https://example.com/");
  });

  it("uses http:// for local addresses", () => {
    assert.equal(normalizeUrl("localhost:3000"), "http://localhost:3000/");
    assert.equal(normalizeUrl("10.0.0.1/admin"), "http://10.0.0.1/admin");
  });

  it("keeps an explicit scheme", () => {
    assert.equal(normalizeUrl("http://example.com/a"), "http://example.com/a");
  });

  it("rejects non-web schemes and junk", () => {
    assert.equal(normalizeUrl("javascript:alert(1)"), null);
    assert.equal(normalizeUrl("ftp://example.com"), null);
    assert.equal(normalizeUrl("mailto:me@example.com"), null);
    assert.equal(normalizeUrl("   "), null);
  });
});

describe("getFaviconUrl", () => {
  it("asks the bookmarked site itself", () => {
    assert.equal(
      getFaviconUrl("https://example.com/some/page?x=1"),
      "https://example.com/favicon.ico",
    );
    assert.equal(
      getFaviconUrl("http://localhost:3000/"),
      "http://localhost:3000/favicon.ico",
    );
  });

  it("returns an empty string for unparseable input", () => {
    assert.equal(getFaviconUrl("not a url"), "");
  });
});
