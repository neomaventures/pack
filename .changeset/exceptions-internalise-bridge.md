---
"@neomaventures/exceptions": minor
---

`ErrorTemplateMetadataBridge` is no longer exported from the package. The class remains in place internally and continues to be registered as an `APP_GUARD` by `ExceptionHandlerModule` — this is a pre-1.0 surface cleanup with no known consumers and no runtime change.
