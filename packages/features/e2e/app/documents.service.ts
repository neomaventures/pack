import { FeaturesService } from "@neoma/features"
import { Injectable, NotFoundException } from "@nestjs/common"

@Injectable()
export class DocumentsService {
  public constructor(private readonly features: FeaturesService) {}

  /**
   * Demo handler body used by the e2e spec as a test fixture. The only
   * thing we care about is that the `FeaturesService.isEnabled(flag)`
   * call returns the right boolean for the in-flight request: when the
   * flag is off we throw `NotFoundException` so the e2e spec can assert
   * status-only parity with a sibling `@Feature`-gated route. This is
   * NOT the canonical "always admit, conditional extra work" pattern
   * from the README — it's just the simplest observable signal.
   */
  public async upload(flag: string): Promise<void> {
    if (!(await this.features.isEnabled(flag))) {
      throw new NotFoundException()
    }
  }
}
