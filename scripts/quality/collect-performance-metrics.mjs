import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const changelogPath = path.resolve("docs/figma-audit/changelog.md");
const fixturePath = path.resolve("tests/fixtures/home.stub.html");
const tokensPath = path.resolve("styles/tokens.css");
const artifactsDir = path.resolve("artifacts/smoke");
const reportPath = path.join(artifactsDir, "perf.json");

const CRITICAL_CSS_LIMIT_GZIP = 30 * 1024;

function gzipSize(bytes) {
  return zlib.gzipSync(bytes).byteLength;
}

function safeRead(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath) : Buffer.from("");
}

function hasThresholdFreeze() {
  if (!fs.existsSync(changelogPath)) return false;
  const changelog = fs.readFileSync(changelogPath, "utf8");
  return changelog.includes("type: threshold-freeze");
}

const fixture = safeRead(fixturePath);
const tokens = safeRead(tokensPath);
const thresholdFreeze = hasThresholdFreeze();
const target = tokens.length > 0 ? "styles/tokens.css" : "tests/fixtures/home.stub.html";
const targetBytes = tokens.length > 0 ? tokens : fixture;
const criticalCssGzipBytes = gzipSize(targetBytes);

const blocking = thresholdFreeze;
const pass = blocking ? criticalCssGzipBytes <= CRITICAL_CSS_LIMIT_GZIP : true;

fs.mkdirSync(artifactsDir, { recursive: true });
fs.writeFileSync(
  reportPath,
  JSON.stringify(
    {
      mode: blocking ? "step-b-blocking" : "step-a-exploratory",
      target,
      thresholds: {
        criticalCssGzipBytesMax: CRITICAL_CSS_LIMIT_GZIP
      },
      metrics: {
        criticalCssGzipBytes
      },
      pass,
      notes: blocking
        ? []
        : ["threshold-freeze is not found in changelog; performance metrics are exploratory."]
    },
    null,
    2
  )
);

if (!pass) {
  console.error(
    `Performance gate failed: critical CSS gzip ${criticalCssGzipBytes} exceeds ${CRITICAL_CSS_LIMIT_GZIP}.`
  );
  process.exit(1);
}

console.log(`Performance metrics written to ${path.relative(process.cwd(), reportPath)}.`);
