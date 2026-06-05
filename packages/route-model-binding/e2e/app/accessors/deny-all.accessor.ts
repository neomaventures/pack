import {
  type ScopeAccessor,
  type ScopeContext,
} from "@neomaventures/route-model-binding"
import { Injectable } from "@nestjs/common"

@Injectable()
export class DenyAllAccessor implements ScopeAccessor {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public canAccess(_context: ScopeContext): boolean {
    return false
  }
}
