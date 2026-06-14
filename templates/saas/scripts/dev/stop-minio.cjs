// Stop the local MinIO container started by `pnpm dev`. Same prefix as
// start-minio.cjs so the container name matches.
const { stopContainer } = require("@neomaventures/minio")

stopContainer({ prefix: "saas" })
