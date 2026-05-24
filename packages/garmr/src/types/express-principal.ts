import { type Authenticatable } from "../interfaces/authenticatable.interface"
import { type GoogleAuthResult } from "../services/google-auth.service"

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- Express global augmentation requires namespace
  namespace Express {
    interface Request {
      principal?: Authenticatable
      googleAuthResult?: GoogleAuthResult<Authenticatable>
    }
  }
}

export {}
