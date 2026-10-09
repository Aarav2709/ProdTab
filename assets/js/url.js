import { normalizeText } from "./text.js";
import { TLDS } from "./tlds.js";

const SCHEME_PATTERN = /^[a-z][a-z\d+.-]*:\/\//i;
const OTHER_SCHEME_PATTERN = /^[a-z][a-z\d+.-]*:(?!\d)/i;
const IPV4_PATTERN =
  /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
const DOMAIN_LABEL_PATTERN = /^[\p{L}\p{N}](?:[\p{L}\p{N}-]*[\p{L}\p{N}])?$/u;

// real tlds that look like file names, so readme.md alone is searched
const FILE_EXTENSION_TLDS = new Set(["md", "mov", "py", "rs", "sh", "zip"]);

// host as typed, since url parsing turns 3.14 into an ipv4 address
function getRawHost(raw) {
  const withoutScheme = raw.replace(SCHEME_PATTERN, "");
  const authority = withoutScheme.split(/[/?#]/)[0];
  const host = authority.slice(authority.lastIndexOf("@") + 1);
  return host.replace(/:\d*$/, "").toLowerCase();
}

function isLocalHost(rawHost) {
  return (
    rawHost === "localhost" ||
    rawHost.endsWith(".localhost") ||
    rawHost.startsWith("[") ||
    IPV4_PATTERN.test(rawHost)
  );
}

export function normalizeUrl(urlValue) {
  const raw = normalizeText(urlValue);
  if (!raw) return null;

  let value = raw;
  if (!SCHEME_PATTERN.test(raw)) {
    // rejects mailto: and javascript: but keeps localhost:3000 as a port
    if (OTHER_SCHEME_PATTERN.test(raw)) return null;
    const scheme = isLocalHost(getRawHost(raw)) ? "http" : "https";
    value = `${scheme}://${raw}`;
  }

  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function isLikelyUrlInput(value) {
  const raw = normalizeText(value);
  if (!raw || /\s/.test(raw)) return false;

  const url = normalizeUrl(raw);
  if (!url) return false;
  if (SCHEME_PATTERN.test(raw)) return true;
  // an email address is a search
  if (raw.includes("@")) return false;

  const rawHost = getRawHost(raw);
  if (isLocalHost(rawHost)) return true;

  const labels = rawHost.split(".");
  if (labels.length < 2) return false;
  if (!labels.every((label) => DOMAIN_LABEL_PATTERN.test(label))) {
    return false;
  }

  // the parsed hostname is punycode, which matches the tld list
  const tld = new URL(url).hostname.split(".").pop();
  if (!TLDS.has(tld)) return false;

  const hasOnlyHost = raw.toLowerCase() === rawHost;
  if (FILE_EXTENSION_TLDS.has(tld) && labels.length === 2 && hasOnlyHost) {
    return false;
  }

  return true;
}

export function getFaviconUrl(href) {
  try {
    const { origin } = new URL(href);
    return origin === "null" ? "" : `${origin}/favicon.ico`;
  } catch {
    return "";
  }
}
