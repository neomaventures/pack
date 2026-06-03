---
"@neomaventures/minio": minor
"@neomaventures/mockserver": minor
"@neomaventures/mailpit": minor
---

`startContainer()` no longer sets environment variables. It returns a config object with all connection details — consumers must wire their own env vars from the returned config or use static `.env` files. See each package's updated README for the new pattern.
