import { startContainer as startMockServer } from "@neomaventures/mockserver"

export default async (): Promise<void> => {
  await startMockServer()
}
