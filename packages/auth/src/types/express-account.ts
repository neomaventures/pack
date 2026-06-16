import { type Account } from "../entities/account.entity"
import { type GoogleAuthResult } from "../services/google-auth.service"

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- Express global augmentation requires namespace
  namespace Express {
    interface Request {
      /**
       * @deprecated Use `getAccount()`, `@CurrentAccount()`, or
       * `@Inject(CurrentAccountToken)` instead. This property is populated via
       * dual-write for backward compatibility and will be removed in a future
       * major version.
       */
      account?: Account
      googleAuthResult?: GoogleAuthResult
    }
  }
}

export {}
