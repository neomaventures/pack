---
"@neoma/fixtures": patch
---

`startMailpit` now waits for the HTTP API to be ready (not just the SMTP port) before resolving — fixing an `ECONNRESET` race for clients that call the API immediately after startup.
