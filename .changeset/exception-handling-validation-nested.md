---
"@neoma/exception-handling": patch
---

Fix `validationFactory` throwing on nested `@ValidateNested()` errors. A nested validation error carries its failures in `children` rather than `constraints`, so the previous `Object.values(constraints!)` threw — surfacing a 500 from inside the validation pipe instead of a 400. The factory now recurses into `children`, producing a nested `{ field: { child: { value, error } } }` response shape.
