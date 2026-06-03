import { startContainer } from "@neomaventures/minio"

export default async (): Promise<void> => {
  await startContainer()
}
