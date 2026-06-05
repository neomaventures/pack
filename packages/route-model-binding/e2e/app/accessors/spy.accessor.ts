import {
  type ScopeAccessor,
  type ScopeContext,
} from "@neomaventures/route-model-binding"
import { Injectable } from "@nestjs/common"

@Injectable()
export class SpyAccessor implements ScopeAccessor {
  public static calls: ScopeContext[] = []

  public canAccess(context: ScopeContext): boolean {
    SpyAccessor.calls.push(context)
    return true
  }
}
