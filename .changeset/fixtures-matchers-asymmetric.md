---
"@neomaventures/fixtures": minor
---

`toMatchError` and `toThrowMatching` now support Jest asymmetric matchers (`expect.objectContaining`, `expect.arrayContaining`, `expect.stringMatching`, `expect.any`, etc.) inside their `properties` argument. The shared `checkErrorInstance` helper now uses Jest's `equals` engine instead of Node's `isDeepStrictEqual`, so partial-match sentinels compose naturally. No call-site migration required — existing strict-equality usage continues to work.

Closes #295.
