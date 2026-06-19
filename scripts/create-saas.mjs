#!/usr/bin/env node

/**
 * Scaffolds a new SaaS application from the SaaS template.
 *
 * Usage: node scripts/create-saas.mjs <project-name> [target-directory]
 *
 * @example
 * ```sh
 * node scripts/create-saas.mjs saasquatch
 * node scripts/create-saas.mjs saasquatch /tmp/saasquatch
 * ```
 */

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "fs"
import { homedir } from "os"
import { basename, extname, join, resolve } from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const PACK_ROOT = resolve(__filename, "..", "..")
const TEMPLATE_DIR = join(PACK_ROOT, "templates", "saas")
const PACKAGES_DIR = join(PACK_ROOT, "packages")

const KEBAB_CASE_REGEX = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/

const TEXT_EXTENSIONS = new Set([
  ".ts",
  ".json",
  ".ejs",
  ".html",
  ".css",
  ".md",
  ".yaml",
  ".yml",
  ".mjs",
  ".sh",
])

const SKIP_DIRS = new Set(["node_modules", "dist", "playwright-report", "test-results"])

/**
 * Determines whether a file should have token replacement applied.
 *
 * @param {string} filePath - The absolute path to the file.
 * @returns {boolean} True if the file is a text file that should be processed.
 */
function isTextFile(filePath) {
  const ext = extname(filePath)
  const name = basename(filePath)

  if (name.startsWith(".env")) {
    return true
  }

  return TEXT_EXTENSIONS.has(ext)
}

/**
 * Recursively walks a directory and applies token replacement to text files.
 *
 * @param {string} dir - The directory to walk.
 * @param {Record<string, string>} tokens - Map of token -> replacement value.
 */
function replaceTokensInDir(dir, tokens) {
  const entries = readdirSync(dir)

  for (const entry of entries) {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      if (SKIP_DIRS.has(entry)) {
        continue
      }
      replaceTokensInDir(fullPath, tokens)
    } else if (stat.isFile() && isTextFile(fullPath)) {
      let content = readFileSync(fullPath, "utf-8")
      let changed = false

      for (const [token, value] of Object.entries(tokens)) {
        if (content.includes(token)) {
          content = content.replaceAll(token, value)
          changed = true
        }
      }

      if (changed) {
        writeFileSync(fullPath, content, "utf-8")
      }
    }
  }
}

// --- Main ---

const projectName = process.argv[2]
const targetArg = process.argv[3]

if (!projectName) {
  console.error("Usage: node scripts/create-saas.mjs <project-name> [target-directory]")
  console.error("")
  console.error("  project-name      kebab-case name for the new app (e.g. saasquatch)")
  console.error("  target-directory   where to create the app (defaults to ../<project-name>)")
  process.exit(1)
}

if (!KEBAB_CASE_REGEX.test(projectName)) {
  console.error(
    `Error: "${projectName}" is not a valid kebab-case name.`,
  )
  console.error("  Use lowercase letters, numbers, and hyphens (e.g. my-app, saasquatch)")
  process.exit(1)
}

const targetDir = targetArg
  ? resolve(targetArg)
  : resolve(PACK_ROOT, "..", projectName)

if (existsSync(targetDir)) {
  console.error(`Error: "${targetDir}" already exists.`)
  console.error("  Remove it first or choose a different target directory.")
  process.exit(1)
}

console.log(`Creating "${projectName}" at ${targetDir}...`)
console.log("")

cpSync(TEMPLATE_DIR, targetDir, {
  recursive: true,
  filter: (src) => {
    const name = basename(src)
    return !SKIP_DIRS.has(name)
  },
})

// Move scaffold/*.yml to .github/workflows/
const scaffoldDir = join(targetDir, "scaffold")
if (existsSync(scaffoldDir)) {
  const workflowsDir = join(targetDir, ".github", "workflows")
  mkdirSync(workflowsDir, { recursive: true })
  for (const file of readdirSync(scaffoldDir)) {
    renameSync(join(scaffoldDir, file), join(workflowsDir, file))
  }
  rmSync(scaffoldDir, { recursive: true })
}

replaceTokensInDir(targetDir, {
  __PACKAGE_NAME__: projectName,
})

// Replace workspace:* with published versions
const targetPkg = JSON.parse(readFileSync(join(targetDir, "package.json"), "utf-8"))
for (const depGroup of ["dependencies", "devDependencies"]) {
  if (!targetPkg[depGroup]) continue
  for (const [name, version] of Object.entries(targetPkg[depGroup])) {
    if (version !== "workspace:*") continue
    const pkgName = name.replace("@neomaventures/", "")
    const pkgJson = JSON.parse(readFileSync(join(PACKAGES_DIR, pkgName, "package.json"), "utf-8"))
    targetPkg[depGroup][name] = `^${pkgJson.version}`
  }
}
writeFileSync(join(targetDir, "package.json"), JSON.stringify(targetPkg, null, 2) + "\n", "utf-8")

const hasHomeNpmrc = existsSync(join(homedir(), ".npmrc"))
if (!hasHomeNpmrc) {
  console.warn("Warning: ~/.npmrc not found.")
  console.warn("  pnpm install will fail without a GitHub Packages token in ~/.npmrc.")
  console.warn("  See the Prerequisites section of the new project's README for setup.")
  console.warn("")
}

console.log("Done! Next steps:")
console.log("")
console.log(`  cd ${targetDir}`)
console.log("  pnpm install")
console.log("  pnpm dev")
console.log("")
