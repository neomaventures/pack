---
"@neoma/mockserver": patch
"@neoma/fixtures": patch
---

Source the Docker container helpers (`waitForHttp` / `waitForTcp` / `stopContainer` + option types) from the new `@neoma/docker` package instead of a bundled copy. No public API change — `@neoma/fixtures/docker` still re-exports the same helpers.
