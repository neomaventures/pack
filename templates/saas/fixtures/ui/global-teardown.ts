import { stopContainer as stopMailpit } from "@neomaventures/mailpit"
import { stopContainer as stopMinio } from "@neomaventures/minio"
import { stopContainer as stopMockServer } from "@neomaventures/mockserver"

export default async (): Promise<void> => {
  await Promise.all([stopMailpit(), stopMockServer(), stopMinio()])
}
