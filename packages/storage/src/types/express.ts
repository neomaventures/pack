import { type Storable } from "../interfaces/storable.interface"

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- Express global augmentation requires namespace
  namespace Express {
    interface Request {
      cerberus?: {
        storedFile?: Storable
      }
    }
  }
}

export {}
