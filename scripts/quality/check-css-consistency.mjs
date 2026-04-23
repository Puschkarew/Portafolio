import fs from "node:fs";
import path from "node:path";

const tokensPath = path.resolve("styles/tokens.css");
const layoutPath = path.resolve("styles/layout.css");
const componentsPath = path.resolve("styles/components.css");

const tokens = fs.readFileSync(tokensPath, "utf8");
const layout = fs.readFileSync(layoutPath, "utf8");
const components = fs.readFileSync(componentsPath, "utf8");

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!tokens.includes("--bp-md: 767px;") || !tokens.includes("--bp-lg: 1023px;")) {
  fail("CSS consistency check failed: token breakpoints must be 767px/1023px.");
}

if (!layout.includes("@media (max-width: 1023px)") || !layout.includes("@media (max-width: 767px)")) {
  fail("CSS consistency check failed: layout media queries must include 1023px and 767px breakpoints.");
}

if (/\.cards-grid\s*\{[^}]*grid-template-columns:\s*repeat\(8,/m.test(components)) {
  fail("CSS consistency check failed: cards-grid should not hardcode 8-column repeat.");
}

if (/\.cards-grid\s*\{[^}]*grid-template-columns:\s*repeat\(4,/m.test(components)) {
  fail("CSS consistency check failed: cards-grid should not hardcode 4-column repeat.");
}

if (!components.includes("@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))")) {
  fail("CSS consistency check failed: missing backdrop-filter fallback.");
}

console.log("CSS consistency check passed.");
