---
"@neoma/argos": patch
---

Harden actor resolution so the ALS store always holds a `string`. `ArgosModule.forRoot({ defaultActor: undefined })` no longer clobbers the built-in `"system"` default — the default is applied after merging raw options — and `ActorMiddleware` falls back to `"system"` as a final guard instead of asserting a non-null `defaultActor`.
