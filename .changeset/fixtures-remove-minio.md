---
"@neoma/fixtures": minor
---

**Breaking:** remove the MinIO surface. `@neoma/fixtures` no longer exports `./docker`, `./setup/minio`, `./teardown/minio`, or the `startMinIO` / `stopMinIO` / `MinIO*` symbols. Use the standalone [`@neoma/minio`](https://github.com/neomaventures/pack/tree/main/packages/minio) package instead. The Docker health helpers (`waitForHttp` / `waitForTcp` + option types) that `./docker` re-exported now live in [`@neoma/docker`](https://github.com/neomaventures/pack/tree/main/packages/docker) — import them from there. With this, `@neoma/fixtures` no longer depends on Docker at all.
