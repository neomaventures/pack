import { Inject, Injectable, NestMiddleware } from "@nestjs/common"
import { type NextFunction, type Request, type Response } from "express"

import { type ArgosOptions, ARGOS_OPTIONS } from "../argos.options"
import { auditStore } from "../argos.store"

@Injectable()
export class ActorMiddleware implements NestMiddleware {
  public constructor(
    @Inject(ARGOS_OPTIONS) private readonly options: ArgosOptions,
  ) {}

  public async use(
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> {
    const resolved = this.options.resolveActor
      ? await this.options.resolveActor(req)
      : undefined

    auditStore.run({ actor: resolved ?? this.options.defaultActor! }, () => {
      next()
    })
  }
}
