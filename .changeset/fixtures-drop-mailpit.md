---
"@neoma/fixtures": minor
---

**Breaking:** remove the Mailpit surface. `@neoma/fixtures` no longer exports `./mailpit`, `./setup/mailpit`, `./teardown/mailpit`, or the `startMailpit` / `stopMailpit` / `Mailpit*` symbols from `./docker`. Use the standalone [`@neoma/mailpit`](https://github.com/neomaventures/pack/tree/main/packages/mailpit) package instead.
