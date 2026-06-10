import { execSync } from "child_process"
import { resolve } from "path"

// Rebuild the lib before the e2e modules are imported.
//
// The e2e specs resolve `@neomaventures/healthcheck` to `dist/` (see
// jest-e2e.json), so the compiled output must be current. Runs as a
// `setupFiles` entry: once per test file, before imports resolve, and on every
// `--watch` save. `tsc --incremental` keeps it sub-second when nothing changed.
execSync("pnpm build", { cwd: resolve(__dirname, ".."), stdio: "inherit" })
