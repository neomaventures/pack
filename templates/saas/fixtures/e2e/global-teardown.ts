import { stopContainer } from "@neomaventures/mailpit"

export default async (): Promise<void> => {
  await stopContainer()
}
