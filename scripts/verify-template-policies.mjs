#!/usr/bin/env node
// Compares supply-chain policies between the pack monorepo and the saas-template.
// Fails if they've drifted. Intended for CI; safe to run locally.

import { readFileSync } from "fs"
import { parse } from "yaml"

const POLICIES_TO_MIRROR = [
  "autoInstallPeers",
  "minimumReleaseAge",
  "allowBuilds",
  "overrides",
  "minimumReleaseAgeExclude",
]

function normalisedJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value)
  if (Array.isArray(value)) return JSON.stringify(value.map(normalisedJson).sort())
  const sortedKeys = Object.keys(value).sort()
  return JSON.stringify(Object.fromEntries(sortedKeys.map((k) => [k, value[k]])))
}

const workspace = parse(readFileSync("pnpm-workspace.yaml", "utf-8"))
const templatePkg = JSON.parse(readFileSync("templates/saas/package.json", "utf-8"))
const templatePolicies = templatePkg.pnpm ?? {}

const drifts = []
for (const key of POLICIES_TO_MIRROR) {
  if (normalisedJson(workspace[key]) !== normalisedJson(templatePolicies[key])) {
    drifts.push({
      key,
      workspace: workspace[key],
      template: templatePolicies[key],
    })
  }
}

if (drifts.length > 0) {
  console.error("✗ Supply-chain policy drift detected between pack and templates/saas:")
  for (const { key, workspace, template } of drifts) {
    console.error(`  ${key}: workspace=${JSON.stringify(workspace)} template=${JSON.stringify(template)}`)
  }
  console.error("")
  console.error("Update templates/saas/package.json's pnpm key to match pnpm-workspace.yaml.")
  process.exit(1)
}

console.log(`✓ Template policies match workspace for: ${POLICIES_TO_MIRROR.join(", ")}`)
