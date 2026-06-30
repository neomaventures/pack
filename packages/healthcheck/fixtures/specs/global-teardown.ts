import { stopContainer as stopMockServer } from "@neomaventures/mockserver"

export default async (): Promise<void> => {
  await stopMockServer()
}
