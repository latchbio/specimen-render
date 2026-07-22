import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");
const outputPath = resolve(dist, "bacteriophage-standalone.html");

let html = await readFile(resolve(dist, "index.html"), "utf8");

const stylesheetTag = html.match(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"[^>]*>/);
const scriptTag = html.match(/<script[^>]+src="([^"]+)"[^>]*><\/script>/);

if (!stylesheetTag || !scriptTag) {
  throw new Error("Could not locate the built stylesheet or script.");
}

const assetPath = (url) => resolve(dist, url.replace(/^\//, ""));
let css = await readFile(assetPath(stylesheetTag[1]), "utf8");
let javascript = await readFile(assetPath(scriptTag[1]), "utf8");

const logo = await readFile(resolve(dist, "brand-logo.png"));
const specimenAssets = [
  ["__BACTERIOPHAGE_OBJ__", "Bacteriophage_001.obj"],
  ["__BACTERIOPHAGE_OBJ_LOD1__", "Bacteriophage_001_LOD1.obj"],
  ["__HEPATITIS_C_OBJ__", "Hepatitis_C.obj"],
  ["__HEPATITIS_C_OBJ_LOD1__", "Hepatitis_C_LOD1.obj"],
  ["__RED_BLOOD_CELL_OBJ__", "Red_Blood_Cell.obj"],
  ["__RED_BLOOD_CELL_OBJ_LOD1__", "Red_Blood_Cell_LOD1.obj"],
  ["__VIRUS_OBJ__", "Virus.obj"],
  ["__VIRUS_OBJ_LOD1__", "Virus_LOD1.obj"],
  ["__ANTIBODY_OBJ__", "Antibodies_Final.obj"],
  ["__ANTIBODY_OBJ_LOD1__", "Antibodies_Final_LOD1.obj"],
  ["__CELL_AGGREGATE_OBJ__", "Cell_Aggregate.obj"],
  ["__CELL_AGGREGATE_OBJ_LOD1__", "Cell_Aggregate_LOD1.obj"],
  ["__PEBBLED_SPHERE_OBJ__", "Pebbled_Sphere.obj"],
  ["__PEBBLED_SPHERE_OBJ_LOD1__", "Pebbled_Sphere_LOD1.obj"],
  ["__BASOPHIL_OBJ__", "Basophil.obj"],
  ["__BASOPHIL_OBJ_LOD1__", "Basophil_LOD1.obj"],
  ["__BRAIN_OBJ__", "Brain.obj"],
  ["__BRAIN_OBJ_LOD1__", "Brain_LOD1.obj"],
];
const embeddedSpecimens = await Promise.all(
  specimenAssets.map(async ([key, filename]) => [
    key,
    (await readFile(resolve(dist, "models", filename))).toString("base64"),
  ]),
);
const logoDataUrl = `data:image/png;base64,${logo.toString("base64")}`;

css = css.replaceAll("/brand-logo.png", logoDataUrl);

const javascriptBase64 = Buffer.from(javascript).toString("base64");
const specimenBootstrap = embeddedSpecimens
  .map(
    ([key, encoded]) =>
      `globalThis.${key} = new TextDecoder().decode(decode("${encoded}"));`,
  )
  .join("\n    ");
const scriptBootstrap = `<script>
  const runStandalone = () => {
    const decode = (encoded) => Uint8Array.from(
      atob(encoded),
      (character) => character.charCodeAt(0),
    );
    ${specimenBootstrap}
    const source = new TextDecoder().decode(decode("${javascriptBase64}"));
    (0, eval)(source);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runStandalone, { once: true });
  } else {
    runStandalone();
  }
</script>`;

html = html
  .replace(stylesheetTag[0], `<style>${css}</style>`)
  .replace(scriptTag[0], scriptBootstrap);

await writeFile(outputPath, html);

const sizeInMegabytes = Buffer.byteLength(html) / 1024 / 1024;
console.log(`Created ${outputPath} (${sizeInMegabytes.toFixed(1)} MB)`);
