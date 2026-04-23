import fs from "node:fs";
import path from "node:path";

const artifactsDir = path.resolve("artifacts/smoke");
const backlogPath = path.resolve("docs/figma-audit/parity-backlog.md");
const requiredSlices = ["hero", "projects", "footer"];
const requiredViewports = ["390", "1512", "1920", "2560"];

function fail(message) {
  console.error(message);
  process.exit(1);
}

function ensureFile(filePath) {
  if (!fs.existsSync(filePath)) {
    fail(`Missing required live parity artifact: ${path.relative(process.cwd(), filePath)}`);
  }
}

function validateReports() {
  for (const slice of requiredSlices) {
    const reportPath = path.join(artifactsDir, `home-live-${slice}-report.json`);
    ensureFile(reportPath);

    const raw = fs.readFileSync(reportPath, "utf8");
    const parsed = JSON.parse(raw);
    const captures = Array.isArray(parsed.captures) ? parsed.captures : [];
    const foundViewports = new Set(captures.map((capture) => String(capture.viewport)));

    for (const viewport of requiredViewports) {
      if (!foundViewports.has(viewport)) {
        fail(
          `Missing viewport ${viewport} in report ${path.relative(process.cwd(), reportPath)}`
        );
      }
      ensureFile(path.join(artifactsDir, `home-live-${slice}-${viewport}.png`));
    }
  }
}

function validateBacklog() {
  ensureFile(backlogPath);
  const content = fs.readFileSync(backlogPath, "utf8");
  const lines = content.split("\n");
  const rowPattern = /^\|\s*PB-\d+\s*\|/;
  let inCodeBlock = false;

  const openHighSeverity = lines.filter((line) => {
    if (line.trim().startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      return false;
    }
    if (inCodeBlock) return false;
    if (!rowPattern.test(line)) return false;
    const cells = line
      .split("|")
      .map((cell) => cell.trim())
      .filter(Boolean);
    if (cells.length < 8) return false;

    const severity = cells[2];
    const status = cells[7];
    return (severity === "P0" || severity === "P1") && status !== "resolved";
  });

  if (openHighSeverity.length > 0) {
    fail(
      `Live parity DoD failed: open P0/P1 entries remain in parity backlog:\n${openHighSeverity.join("\n")}`
    );
  }
}

validateReports();
validateBacklog();
console.log("Live parity DoD check passed (reports + backlog status).");
