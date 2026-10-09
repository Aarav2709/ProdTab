// rebuilds assets/js/tlds.js from the iana list, pass a file path to use a local copy

import { readFile, writeFile } from "node:fs/promises";

const IANA_URL = "https://data.iana.org/TLD/tlds-alpha-by-domain.txt";
const OUTPUT = new URL("../assets/js/tlds.js", import.meta.url);

async function readSource(localPath) {
  if (localPath) return readFile(localPath, "utf8");

  const response = await fetch(IANA_URL);
  if (!response.ok) {
    throw new Error(`IANA request failed: ${response.status}`);
  }
  return response.text();
}

const source = await readSource(process.argv[2]);
const lines = source.split(/\r?\n/).map((line) => line.trim());
const versionLine = lines.find((line) => line.startsWith("#")) || "# unknown";
const tlds = lines
  .filter((line) => line && !line.startsWith("#"))
  .map((line) => line.toLowerCase());

if (tlds.length < 1000) {
  throw new Error(`Only ${tlds.length} TLDs found; refusing to overwrite.`);
}

const version = versionLine.match(/Version (\d+)/)?.[1] || "unknown";
const output = `// generated from the iana tld list version ${version}, do not edit by hand

export const TLDS = new Set(
  "${tlds.join(" ")}".split(" "),
);
`;

await writeFile(OUTPUT, output);
console.log(`Wrote ${tlds.length} TLDs to assets/js/tlds.js`);
