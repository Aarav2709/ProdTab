export function normalizeText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

export function sameText(a, b) {
  return normalizeText(a).toLowerCase() === normalizeText(b).toLowerCase();
}
