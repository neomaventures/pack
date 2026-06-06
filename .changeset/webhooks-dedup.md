---
"@neomaventures/webhooks": minor
---

Add idempotent webhook ingestion via `@WebhookHandler(provider)` decorator. Persists unique events, short-circuits duplicates with HTTP 204, and emits `webhook.received` / `webhook.duplicate` domain events.
