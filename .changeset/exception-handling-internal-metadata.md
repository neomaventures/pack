---
"@neoma/exception-handling": minor
---

Remove the internal `ErrorTemplateMetadata` type from the public API. It is the implementation shape stored under the route-metadata key and read by the bridge guard — never intended for consumers to construct. `ErrorTemplate`, `ErrorTemplateOptions`, and `ERROR_TEMPLATE_KEY` remain public.
