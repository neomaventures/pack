import { stopContainer as stopMailpit } from "@neomaventures/mailpit"
import { stopContainer as stopMockServer } from "@neomaventures/mockserver"

const NODE_ENV = process.env.NODE_ENV ?? "specs"

export default async (): Promise<void> => {
  await Promise.all([
    stopMailpit({ prefix: `auth-${NODE_ENV}` }),
    stopMockServer({ prefix: `auth-${NODE_ENV}` }),
  ])
}
