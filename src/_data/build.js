const { execSync } = require("node:child_process")

/** @returns {Date} */
const resolveBuildDate = () => {
  const envRaw = process.env.SITE_BUILD_AT?.trim()
  if (envRaw) {
    const fromEnv = new Date(envRaw)
    if (!Number.isNaN(fromEnv.getTime())) return fromEnv
  }
  try {
    const iso = execSync("git log -1 --format=%cI", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim()
    const fromGit = new Date(iso)
    if (!Number.isNaN(fromGit.getTime())) return fromGit
  } catch {
    /* no .git or git unavailable */
  }
  return new Date()
}

/** en-GB + optional SITE_BUILD_TZ (default Central Europe: Berlin / Paris / Madrid). SSR label only; browsers replace with local time via scripts/site-build-local-time.js when JS runs. */
const formatSiteBuildLabel = (date) => {
  const tz = process.env.SITE_BUILD_TZ?.trim() || "Europe/Berlin"
  const dtf = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    hourCycle: "h23",
    timeZone: tz
  })
  const parts = dtf.formatToParts(date)
  const byType = Object.fromEntries(
    parts.filter((p) => p.type !== "literal").map((p) => [p.type, p.value])
  )
  const day = byType.day ?? ""
  const month = byType.month ?? ""
  const year = byType.year ?? ""
  const hour = byType.hour ?? ""
  const minute = byType.minute ?? ""
  return `Site build ${day} ${month} ${year} at ${hour}:${minute}`
}

module.exports = () => {
  const date = resolveBuildDate()
  return {
    siteBuildAtIso: date.toISOString(),
    siteBuildLabel: formatSiteBuildLabel(date)
  }
}
