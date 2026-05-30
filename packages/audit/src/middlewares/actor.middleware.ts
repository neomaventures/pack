import { Inject, Injectable, NestMiddleware } from "@nestjs/common"
import { type NextFunction, type Request, type Response } from "express"

import { type AuditOptions, AUDIT_OPTIONS } from "../audit.options"
import { auditStore } from "../audit.store"

@Injectable()
export class ActorMiddleware implements NestMiddleware {
  public constructor(
    @Inject(AUDIT_OPTIONS) private readonly options: AuditOptions,
  ) {}

  public async use(
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> {
    const resolved = this.options.resolveActor
      ? await this.options.resolveActor(req)
      : undefined

    auditStore.run(
      { actor: resolved ?? this.options.defaultActor ?? "system" },
      () => {
        next()
      },
    )
  }
}
