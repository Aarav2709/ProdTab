import { normalizeText } from "./text.js";
import { isLikelyUrlInput, normalizeUrl } from "./url.js";

export const SEARCH_ENGINES = {
  browser: { label: "Firefox default", url: null },
  duckduckgo: { label: "DuckDuckGo", url: "https://duckduckgo.com/?q=%s" },
  google: { label: "Google", url: "https://www.google.com/search?q=%s" },
  bing: { label: "Bing", url: "https://www.bing.com/search?q=%s" },
  brave: { label: "Brave Search", url: "https://search.brave.com/search?q=%s" },
  startpage: {
    label: "Startpage",
    url: "https://www.startpage.com/sp/search?query=%s",
  },
  ecosia: { label: "Ecosia", url: "https://www.ecosia.org/search?q=%s" },
  kagi: { label: "Kagi", url: "https://kagi.com/search?q=%s" },
  custom: { label: "Custom", url: null },
};

export const DEFAULT_SEARCH_ENGINE = "duckduckgo";

// only available when running as the firefox extension
export function hasBrowserSearch() {
  return typeof globalThis.browser?.search?.query === "function";
}

export function isValidCustomSearchUrl(template) {
  const value = normalizeText(template);
  if (!/^https?:\/\//i.test(value) || !value.includes("%s")) return false;
  return normalizeUrl(value.replaceAll("%s", "test")) !== null;
}

export function buildSearchUrl(query, engineId, customSearchUrl) {
  const template =
    engineId === "custom" && isValidCustomSearchUrl(customSearchUrl)
      ? normalizeText(customSearchUrl)
      : SEARCH_ENGINES[engineId]?.url ||
        SEARCH_ENGINES[DEFAULT_SEARCH_ENGINE].url;

  return template.replaceAll("%s", encodeURIComponent(query));
}

// decides whether enter opens an address, uses the firefox engine or opens a search url
export function resolveSearchTarget(
  rawValue,
  { searchEngine, customSearchUrl } = {},
  browserSearchAvailable = false,
) {
  const query = normalizeText(rawValue);
  if (!query) return null;

  if (isLikelyUrlInput(query)) {
    const url = normalizeUrl(query);
    if (url) return { type: "url", url, query };
  }

  if (searchEngine === "browser" && browserSearchAvailable) {
    return { type: "browser", query };
  }

  return {
    type: "search",
    url: buildSearchUrl(query, searchEngine, customSearchUrl),
    query,
  };
}
