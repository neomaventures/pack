#!/usr/bin/env bash
#
# new-package.sh — scaffold a new @neoma/* package under packages/<name>.
#
# Produces the canonical flattened layout used across this monorepo
# (see packages/managed-database for the reference shape): lib at
# packages/<name>/src, per-package jest + tsconfig extending the shared
# root configs, and a publishable package.json. The new package builds,
# lints, and tests green immediately so the workspace stays green.
#
# Usage:
#   scripts/new-package.sh <name> [description]
#   pnpm new-package <name> [description]
#
# <name>  kebab-case, no @neoma/ prefix — e.g. 'minio', 'mockserver-gmail'.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

NAME="${1:-}"

if [[ -z "$NAME" ]]; then
  echo "Usage: scripts/new-package.sh <name> [description]" >&2
  echo "  <name>  kebab-case, no @neoma/ prefix — e.g. 'minio', 'mockserver-gmail'" >&2
  exit 1
fi

DESC="${2:-TODO: describe @neoma/$NAME}"

if [[ ! "$NAME" =~ ^[a-z][a-z0-9]*(-[a-z0-9]+)*$ ]]; then
  echo "Error: package name must be kebab-case (got '$NAME')." >&2
  exit 1
fi

PKG_DIR="$ROOT_DIR/packages/$NAME"

if [[ -e "$PKG_DIR" ]]; then
  echo "Error: packages/$NAME already exists." >&2
  exit 1
fi

echo "📦 Scaffolding @neoma/$NAME → packages/$NAME"

mkdir -p "$PKG_DIR/src"

# --- package.json + README.md (generated via Node) -------------------------
# Routed through Node so the user-supplied description is handled safely:
# JSON.stringify escapes quotes/backslashes/newlines for package.json, and a
# template literal keeps it verbatim in the README. A shell heredoc would
# produce invalid JSON — or shell-interpret backticks/$ — on those characters.
# NAME is kebab-validated above, so the remaining heredocs interpolate it safely.
NEOMA_NAME="$NAME" NEOMA_DESC="$DESC" NEOMA_DIR="$PKG_DIR" node <<'NODE'
const fs = require("fs")
const { join } = require("path")

const name = process.env.NEOMA_NAME
const desc = process.env.NEOMA_DESC
const dir = process.env.NEOMA_DIR

const pkg = {
  name: `@neoma/${name}`,
  version: "0.0.0",
  description: desc,
  author: "Shipdventures",
  repository: {
    type: "git",
    url: "https://github.com/neomaventures/pack",
    directory: `packages/${name}`,
  },
  bugs: { url: "https://github.com/neomaventures/pack/issues" },
  homepage: `https://github.com/neomaventures/pack/tree/main/packages/${name}#readme`,
  keywords: ["nestjs", "neoma", name],
  private: false,
  main: "dist/index.js",
  types: "dist/index.d.ts",
  files: ["dist", "README.md", "LICENSE", "!**/*.json", "!**/*.tsbuildinfo"],
  license: "MIT",
  scripts: {
    build: "tsc -p ./tsconfig.lib.json",
    test: "jest --runInBand --passWithNoTests",
    lint: "eslint .",
  },
  peerDependencies: {
    "@nestjs/common": "11.x",
    "@nestjs/core": "11.x",
  },
}
fs.writeFileSync(join(dir, "package.json"), JSON.stringify(pkg, null, 2) + "\n")

fs.writeFileSync(
  join(dir, "README.md"),
  `# @neoma/${name}

${desc}

## Installation

\`\`\`bash
npm install @neoma/${name}
\`\`\`

## Usage

> TODO: document the public API.

## License

MIT
`,
)
NODE

# --- tsconfig.json (typecheck/test: includes specs) -------------------------
cat > "$PKG_DIR/tsconfig.json" <<'EOF'
{
  "extends": "../../tsconfig.base.json",
  "include": ["src/**/*"]
}
EOF

# --- tsconfig.lib.json (build: lib only, excludes specs) --------------------
cat > "$PKG_DIR/tsconfig.lib.json" <<'EOF'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "declaration": true,
    "rootDir": "src",
    "outDir": "dist",
    "paths": {}
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*spec.ts"]
}
EOF

# --- jest.config.js ---------------------------------------------------------
cat > "$PKG_DIR/jest.config.js" <<'EOF'
/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  testRegex: ".*\\.spec\\.ts$",
  transform: {
    "^.+\\.(t|j)s$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.json" }],
  },
  testEnvironment: "node",
  roots: ["<rootDir>/src/"],
  setupFiles: ["reflect-metadata"],
  setupFilesAfterEnv: ["jest-extended/all"],
  moduleNameMapper: {
    "@lib/(.*)$": "<rootDir>/src/$1",
    "@lib": "<rootDir>/src",
  },
}
EOF

# --- src/index.ts -----------------------------------------------------------
cat > "$PKG_DIR/src/index.ts" <<EOF
/**
 * @neoma/$NAME
 *
 * TODO: replace this placeholder export with the package's public API.
 */
export const packageName = "@neoma/$NAME"
EOF

# --- src/<name>.spec.ts -----------------------------------------------------
cat > "$PKG_DIR/src/$NAME.spec.ts" <<EOF
import { packageName } from "@lib"

describe("@neoma/$NAME", () => {
  it("exposes the package name", () => {
    expect(packageName).toBe("@neoma/$NAME")
  })
})
EOF

# --- LICENSE ----------------------------------------------------------------
cat > "$PKG_DIR/LICENSE" <<'EOF'
MIT License

Copyright (c) 2025 Shipdventures

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF

echo "✅ Created packages/$NAME:"
echo "   package.json  tsconfig.json  tsconfig.lib.json  jest.config.js"
echo "   src/index.ts  src/$NAME.spec.ts  README.md  LICENSE"
echo
echo "Next steps:"
echo "  1. corepack pnpm install                       # register the package + update the lockfile"
echo "  2. corepack pnpm --filter @neoma/$NAME test    # the placeholder spec should pass"
echo "  3. Replace src/index.ts with the real API; add specs alongside it"
echo "  4. Add @neoma/$NAME to the root README Packages table  # CI enforces this"
echo "  5. pnpm changeset                              # record the new package for its first release"
