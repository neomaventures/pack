import { execSync } from "child_process"
import { resolve } from "path"

// Rebuild the lib before the e2e module is imported.
//
// The e2e resolves `@neoma/mockserver` to `dist/` (see jest-e2e.json), so the
// compiled output must be current. This runs as a `setupFiles` entry — once
// per test file, *before* the test's top-level imports resolve — and it
// re-runs on every `--watch` save, unlike `pretest`/`globalSetup` which fire
// only once per jest process. A `beforeAll` would be too late: the test's
// `import` of `dist/` is evaluated before `beforeAll` runs. `tsc --incremental`
// keeps this sub-second when nothing changed.
execSync("pnpm build", { cwd: resolve(__dirname, ".."), stdio: "inherit" })
