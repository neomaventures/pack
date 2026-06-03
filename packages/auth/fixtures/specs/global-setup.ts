import { join } from "path"

import { startContainer as startMailpit } from "@neomaventures/mailpit"
import { startContainer as startMockServer } from "@neomaventures/mockserver"

export default async (): Promise<void> => {
  const htpasswdPath = join(__dirname, "..", "email", "smtp-auth.htpasswd")

  await Promise.all([
    startMailpit({ htpasswd: htpasswdPath }),
    startMockServer(),
  ])
}
