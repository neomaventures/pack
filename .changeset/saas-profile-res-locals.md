---
"__PACKAGE_NAME__": patch
---

`ProfileController.index()` collapses to a decorator-only handler: `@WithMailboxStats() + @ErrorTemplate({ default: "profile" }) + @Render("profile")`. The profile template reads `account.oauthTokens` and `mailboxStats` directly from `res.locals`, dropping the `ConnectedAccountRow` view-model and inline mailbox try/catch. Mailbox failure paths re-render the profile page with "Unavailable" copy in the stats cells; the Connected Accounts row remains visible.
