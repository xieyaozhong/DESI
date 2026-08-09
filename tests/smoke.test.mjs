import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readProjectFile = (relativePath) =>
  readFile(path.join(projectRoot, relativePath), "utf8");

const [indexHtml, entryScript, crystalAssembly, tenWorlds, crystalCss, polishCss] =
  await Promise.all([
    readProjectFile("index.html"),
    readProjectFile("script.js"),
    readProjectFile("desi-crystal-assembly.js"),
    readProjectFile("desi-ten-worlds.js"),
    readProjectFile("desi-crystal-cinema.css"),
    readProjectFile("desi-portfolio-polish.css"),
  ]);

test("index exposes portfolio metadata and semantic landmarks", () => {
  assert.match(indexHtml, /<html\s+lang=["']zh-Hant["']/i);
  assert.match(
    indexHtml,
    /<link\s+rel=["']canonical["']\s+href=["']https:\/\/xieyaozhong\.github\.io\/DESI\/["']/i,
  );
  assert.match(
    indexHtml,
    /<meta\s+property=["']og:image["']\s+content=["']https:\/\/xieyaozhong\.github\.io\/DESI\/og-preview\.png["']/i,
  );
  assert.match(indexHtml, /<a\b[^>]*class=["'][^"']*skip-link[^"']*["'][^>]*href=["']#main["']/i);
  assert.match(indexHtml, /<main\s+id=["']main["']/i);
  assert.match(indexHtml, /<section\s+id=["']system-note["']/i);
  assert.match(indexHtml, /href=["']https:\/\/github\.com\/xieyaozhong\/DESI["']/i);
});

test("every local stylesheet, script, icon, manifest, and preview referenced by index exists", async () => {
  const localReferences = [...indexHtml.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)]
    .map((match) => match[1])
    .filter((reference) =>
      !reference.startsWith("#") &&
      !reference.startsWith("http://") &&
      !reference.startsWith("https://") &&
      !reference.startsWith("mailto:") &&
      !reference.startsWith("tel:") &&
      !reference.startsWith("data:"),
    )
    .map((reference) => decodeURIComponent(reference.split(/[?#]/, 1)[0]))
    .filter(Boolean);

  assert.ok(localReferences.length >= 8, "expected the entry document to reference its local asset set");

  for (const reference of new Set(localReferences)) {
    const relativePath = reference.replace(/^\.\//, "").replace(/^\//, "");
    await assert.doesNotReject(
      access(path.join(projectRoot, relativePath)),
      `missing local asset referenced by index.html: ${reference}`,
    );
  }
});

test("active entry pipeline uses one portfolio-r14 cache version", async () => {
  const entryFiles = [
    ["index.html", indexHtml],
    ["script.js", entryScript],
    ["desi-director-v4.js", await readProjectFile("desi-director-v4.js")],
    ["desi-director-v6.js", await readProjectFile("desi-director-v6.js")],
  ];
  const versions = entryFiles.flatMap(([, source]) =>
    [...source.matchAll(/20260809-portfolio-r\d+/g)].map((match) => match[0]),
  );

  assert.ok(versions.length >= 10, "expected versioned CSS and JavaScript entry assets");
  assert.deepEqual([...new Set(versions)], ["20260809-portfolio-r14"]);

  for (const [name, source] of entryFiles) {
    assert.doesNotMatch(source, /portfolio-r(?:11|12|13)\b/, `${name} contains a stale pre-r14 entry reference`);
  }
});

function readPointArray(source, constantName) {
  const block = source.match(new RegExp(`const\\s+${constantName}\\s*=\\s*\\[([\\s\\S]*?)\\n\\s*\\];`));
  assert.ok(block, `could not find ${constantName}`);
  const points = [...block[1].matchAll(/\[\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\]/g)]
    .map((match) => [Number(match[1]), Number(match[2])]);
  assert.ok(points.length > 2, `${constantName} must be a polygon`);
  return points;
}

function polygonArea(points) {
  return Math.abs(points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + point[0] * next[1] - next[0] * point[1];
  }, 0)) / 2;
}

test("the fourteen physical facets exactly cover the crystal outline", () => {
  const outline = readPointArray(crystalAssembly, "CRYSTAL_OUTLINE");
  const inner = readPointArray(crystalAssembly, "CRYSTAL_INNER");
  const centerMatch = crystalAssembly.match(/const\s+CRYSTAL_CENTER\s*=\s*\[\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\]/);
  assert.ok(centerMatch, "could not find CRYSTAL_CENTER");
  const center = [Number(centerMatch[1]), Number(centerMatch[2])];

  assert.equal(outline.length, 7);
  assert.equal(inner.length, 7);

  const fragments = outline.flatMap((vertex, index) => {
    const next = outline[(index + 1) % outline.length];
    const innerPoint = inner[index];
    const innerNext = inner[(index + 1) % inner.length];
    return [
      [vertex, next, innerNext, innerPoint],
      [center, innerPoint, innerNext],
    ];
  });

  assert.equal(fragments.length, 14);
  const fragmentArea = fragments.reduce((sum, fragment) => sum + polygonArea(fragment), 0);
  const outlineArea = polygonArea(outline);
  assert.ok(
    Math.abs(fragmentArea - outlineArea) < 1e-9,
    `facet area ${fragmentArea} must equal outline area ${outlineArea}`,
  );
  assert.match(crystalAssembly, /CRYSTAL_OUTLINE\.flatMap/);
  assert.match(crystalAssembly, /kind:\s*half\s*\?\s*["']core["']\s*:\s*["']rim["']/);
});

test("interactive crystal controls expose state and reduced-motion fallbacks", () => {
  assert.match(indexHtml, /id=["']crystal-draw-announcement["'][^>]*aria-live=["']polite["']/i);
  assert.match(indexHtml, /id=["']motion-toggle["'][^>]*aria-pressed=["']false["']/i);
  assert.match(tenWorlds, /setAttribute\(["']role["'],\s*["']group["']\)/);
  assert.match(tenWorlds, /setAttribute\(["']aria-pressed["']/);
  assert.match(tenWorlds, /setAttribute\(["']aria-current["']/);
  assert.match(crystalAssembly, /matchMedia\([\s\S]*?prefers-reduced-motion:\s*reduce/);
  assert.match(crystalCss, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(polishCss, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});
