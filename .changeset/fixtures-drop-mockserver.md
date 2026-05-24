---
"@neoma/fixtures": minor
---

**Breaking:** remove the MockServer surface. `@neoma/fixtures` no longer exports `./mockserver`, `./setup/mockserver`, `./teardown/mockserver`, or the `startMockServer` / `stopMockServer` / `MockServer*` symbols from `./docker`. Use the standalone [`@neoma/mockserver`](https://github.com/neomaventures/pack/tree/main/packages/mockserver) package instead.
