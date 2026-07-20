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
const model = await readFile(resolve(dist, "models/Bacteriophage_001.obj"));
const logoDataUrl = `data:image/png;base64,${logo.toString("base64")}`;

css = css.replaceAll("/brand-logo.png", logoDataUrl);

const javascriptBase64 = Buffer.from(javascript).toString("base64");
const modelBase64 = model.toString("base64");
const scriptBootstrap = `<script>
  const runStandalone = () => {
    const decode = (encoded) => Uint8Array.from(
      atob(encoded),
      (character) => character.charCodeAt(0),
    );
    globalThis.__BACTERIOPHAGE_OBJ__ = new TextDecoder().decode(decode("${modelBase64}"));
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
