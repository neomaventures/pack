import {
  type ScopeAccessor,
  type ScopeContext,
} from "@neomaventures/route-model-binding"
import { Injectable } from "@nestjs/common"

@Injectable()
export class AllowAllAccessor implements ScopeAccessor {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public canAccess(_context: ScopeContext): boolean {
    return true
  }
}
