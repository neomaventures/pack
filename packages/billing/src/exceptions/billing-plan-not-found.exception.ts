export class BillingPlanNotFoundException extends Error {
  public constructor(identifier: string) {
    super(`Billing plan not found: ${identifier}`)
    this.name = "BillingPlanNotFoundException"
  }
}
