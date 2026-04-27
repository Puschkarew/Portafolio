import fs from "node:fs";
import path from "node:path";

const htmlPath = path.resolve(process.env.RUNTIME_HOME_PATH ?? "dist/index.html");
const html = fs.readFileSync(htmlPath, "utf8");

function fail(message) {
  console.error(message);
  process.exit(1);
}

const headingMatches = [...html.matchAll(/<h([1-6])\b/gi)].map((match) => Number(match[1]));
if (headingMatches.length === 0) {
  fail("HTML structure check failed: no headings found.");
}

if (headingMatches.filter((level) => level === 1).length !== 1) {
  fail("HTML structure check failed: there must be exactly one <h1>.");
}

for (let index = 1; index < headingMatches.length; index += 1) {
  const previous = headingMatches[index - 1];
  const current = headingMatches[index];
  if (current - previous > 1) {
    fail(
      `HTML structure check failed: heading level jump detected (${previous} -> ${current}).`
    );
  }
}

if (html.includes("http://127.0.0.1:7866/ingest/")) {
  fail("HTML structure check failed: debug localhost endpoint still present in generated HTML.");
}

const duplicateProjectGridLabel = [...html.matchAll(/aria-label="Projects grid"/g)].length;
if (duplicateProjectGridLabel > 0) {
  fail('HTML structure check failed: generic aria-label "Projects grid" should be replaced with unique labels.');
}

console.log("HTML structure check passed.");
