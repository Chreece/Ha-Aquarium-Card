/** Keep the HACS single-file bundle in sync with the editable scene styles. */
import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const moduleURL = new URL("dist/ha-aquarium-card.js", root);
const [moduleSource, stylesheet, manifest] = await Promise.all([
  readFile(moduleURL, "utf8"),
  readFile(new URL("src/scene.css", root), "utf8"),
  readFile(new URL("package.json", root), "utf8"),
]);
const { version } = JSON.parse(manifest);
if (!/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(version)) throw new Error("Invalid package version");
if (stylesheet.includes("`") || stylesheet.includes("${")) throw new Error("Unsafe CSS template characters");
const styles = /const STYLES = `[^`]*`;/g;
const versions = /const AQUARIUM_CARD_VERSION = "[^"]+";/g;
if ([...moduleSource.matchAll(styles)].length !== 1 || [...moduleSource.matchAll(versions)].length !== 1) {
  throw new Error("Expected exactly one styles block and version in the card module");
}
const output = moduleSource
  .replace(styles, () => "const STYLES = `\n" + stylesheet.trimEnd() + "\n`;")
  .replace(versions, () => `const AQUARIUM_CARD_VERSION = "${version}";`);
if (output !== moduleSource) await writeFile(moduleURL, output);
console.log(`Aquarium Card ${version}: scene styles bundled`);
