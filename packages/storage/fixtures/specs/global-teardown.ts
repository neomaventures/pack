import { stopContainer } from "@neomaventures/minio"

export default async (): Promise<void> => {
  await stopContainer()
}
