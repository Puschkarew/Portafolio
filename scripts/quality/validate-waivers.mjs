import fs from "node:fs";
import path from "node:path";

const changelogPath = path.resolve("docs/figma-audit/changelog.md");
const requiredFields = ["approved_by", "date", "scope", "reason", "expires_at", "linked_task"];

if (!fs.existsSync(changelogPath)) {
  console.log(`No changelog file found at ${changelogPath}; no waiver entries to validate.`);
  process.exit(0);
}

const content = fs.readFileSync(changelogPath, "utf8");
const sections = content.split("\n## ").map((section, idx) => (idx === 0 ? section : `## ${section}`));

let hasWaiver = false;
const today = new Date().toISOString().slice(0, 10);

for (const section of sections) {
  if (!section.includes("- type: waiver")) continue;
  hasWaiver = true;

  for (const field of requiredFields) {
    if (!new RegExp(`-\\s+${field}:\\s+.+`).test(section)) {
      console.error(`Waiver schema field missing: ${field}`);
      process.exit(1);
    }
  }

  const expiresMatch = section.match(/-\s+expires_at:\s+([0-9]{4}-[0-9]{2}-[0-9]{2})/);
  if (!expiresMatch) {
    console.error("Waiver expires_at is missing or malformed.");
    process.exit(1);
  }

  const expiresAt = expiresMatch[1];
  if (expiresAt < today) {
    console.error(`Waiver expired: expires_at=${expiresAt}, today=${today}.`);
    process.exit(1);
  }
}

if (!hasWaiver) {
  console.log("No waiver entries found.");
} else {
  console.log("Waiver entries are valid.");
}
