import { execSync } from "child_process"
import { resolve } from "path"

// e2e resolves `@neoma/exceptions` to built `dist` (via jest
// moduleNameMapper), so build the lib before the suite runs.
execSync("pnpm build", { cwd: resolve(__dirname, ".."), stdio: "inherit" })
