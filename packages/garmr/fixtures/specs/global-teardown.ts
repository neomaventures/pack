import { stopContainer as stopMailpit } from "@neoma/mailpit"
import { stopContainer as stopMockServer } from "@neoma/mockserver"

const NODE_ENV = process.env.NODE_ENV ?? "specs"

export default async (): Promise<void> => {
  await Promise.all([
    stopMailpit({ prefix: `garmr-${NODE_ENV}` }),
    stopMockServer({ prefix: `garmr-${NODE_ENV}` }),
  ])
}
