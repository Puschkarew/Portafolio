import fs from "node:fs";
import path from "node:path";

const distDir = path.resolve("dist");
const headersPath = path.join(distDir, "_headers");
const securityTxtPath = path.join(distDir, ".well-known", "security.txt");

function fail(message) {
  console.error(message);
  process.exit(1);
}

for (const filePath of [headersPath, securityTxtPath]) {
  if (!fs.existsSync(filePath)) {
    fail(`Security artifact check failed: missing ${path.relative(process.cwd(), filePath)}.`);
  }
}

const headers = fs.readFileSync(headersPath, "utf8");
const securityTxt = fs.readFileSync(securityTxtPath, "utf8");

const requiredHeaders = [
  "Content-Security-Policy:",
  "Strict-Transport-Security:",
  "X-Content-Type-Options: nosniff",
  "X-Frame-Options: SAMEORIGIN",
  "Referrer-Policy: strict-origin-when-cross-origin",
  "Permissions-Policy:"
];

for (const requiredHeader of requiredHeaders) {
  if (!headers.includes(requiredHeader)) {
    fail(`Security artifact check failed: _headers missing "${requiredHeader}".`);
  }
}

for (const requiredField of ["Contact:", "Canonical:", "Expires:"]) {
  if (!securityTxt.includes(requiredField)) {
    fail(`Security artifact check failed: security.txt missing "${requiredField}".`);
  }
}

console.log("Security artifact check passed.");
