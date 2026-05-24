import specsSetup from "../specs/global-setup"

// The lib build is handled by e2e/build.setup.ts (setupFiles), so this
// globalSetup only needs to start the shared containers + set env.
export default async (): Promise<void> => {
  await specsSetup()
}
