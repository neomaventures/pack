// Fail if a published package isn't listed in the root README Packages table.
//
// The scaffold (scripts/new-package.sh) reminds you to add the row, but the
// row's description and placement are a human call — so this just enforces
// *completeness*, not content. Every packages/<dir> whose package.json isn't
// `private` must be linked as `(packages/<dir>)` somewhere in README.md.

import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

const root = join(import.meta.dirname, "..")
const readme = readFileSync(join(root, "README.md"), "utf8")
const packagesDir = join(root, "packages")

const missing = []
for (const entry of readdirSync(packagesDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue
  let pkg
  try {
    pkg = JSON.parse(
      readFileSync(join(packagesDir, entry.name, "package.json"), "utf8"),
    )
  } catch {
    continue // not a package directory
  }
  if (pkg.private) continue // only published packages must be listed
  if (!readme.includes(`(packages/${entry.name})`)) {
    missing.push(pkg.name ?? entry.name)
  }
}

if (missing.length > 0) {
  console.error(
    `✖ Root README Packages table is missing: ${missing.join(", ")}`,
  )
  console.error(
    "  Add a row: | [`<name>`](packages/<dir>) | <description> |",
  )
  process.exit(1)
}

console.log("✓ All published packages are listed in the README Packages table.")
