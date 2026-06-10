import { startContainer as startMailpit } from "@neomaventures/mailpit"
import { startContainer as startMockServer } from "@neomaventures/mockserver"

export default async (): Promise<void> => {
  await Promise.all([startMailpit(), startMockServer()])
}
