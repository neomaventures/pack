---
"@neoma/config": patch
---

Declare the previously-missing `dotenv` runtime dependency. `ConfigModule.forRoot({ loadEnv: true })` loads `.env` files via `dotenv`, but `0.4.1` shipped with no declared dependencies — so `loadEnv: true` threw `Cannot find module 'dotenv'` unless a consumer happened to have dotenv hoisted. `dotenv` is now a direct dependency.
