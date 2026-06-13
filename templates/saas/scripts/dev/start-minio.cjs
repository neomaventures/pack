// Start a local MinIO container for `pnpm dev`. Mirrors the e2e/ui test
// fixture path (uses @neomaventures/minio) so dev and test environments
// share one well-tested container lifecycle and bucket-creation step,
// instead of inlining raw `docker run` in package.json.
//
// Container name: "saas-minio" (prefix "saas" + suffix "-minio").
// API at http://localhost:9000, console at http://localhost:9001.
// Bucket "uploads" is created after the container is healthy.
//
// Matches the values in .env.development. Update both if you change them.
const { startContainer } = require("@neomaventures/minio")

startContainer({
  prefix: "saas",
  apiPort: 9000,
  consolePort: 9001,
  bucket: "uploads",
}).then((config) => {
  console.log(
    `MinIO running: ${config.container} (api :${config.apiPort}, console :${config.consolePort}, bucket "${config.bucket}")`,
  )
})
