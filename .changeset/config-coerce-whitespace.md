---
"@neoma/config": patch
---

Fix `coerce: true` turning whitespace-only env vars into `0`. `isCleanNumber` only rejected empty strings, but `Number("   ")` is `0` (not `NaN`), so a blank value like `"   "` was coerced to `0`. It now rejects whitespace-only strings (a number padded with whitespace like `" 123 "` still coerces, as documented).
