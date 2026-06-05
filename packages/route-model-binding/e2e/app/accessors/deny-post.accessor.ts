import {
  type ScopeAccessor,
  type ScopeContext,
} from "@neomaventures/route-model-binding"
import { Injectable } from "@nestjs/common"

@Injectable()
export class DenyPostAccessor implements ScopeAccessor {
  public canAccess(context: ScopeContext): boolean {
    return context.name !== "post"
  }
}
