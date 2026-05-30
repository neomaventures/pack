import { ConfigurableModuleBuilder } from "@nestjs/common"

import { type AuditOptions, AUDIT_OPTIONS } from "./audit.options"
import { ActorMiddleware } from "./middlewares/actor.middleware"

const AUDIT_RAW_OPTIONS = Symbol("AUDIT_RAW_OPTIONS")

export const { ConfigurableModuleClass } =
  new ConfigurableModuleBuilder<AuditOptions>({
    optionsInjectionToken: AUDIT_RAW_OPTIONS,
  })
    .setClassMethodName("forRoot")
    .setExtras({}, (definition) => ({
      ...definition,
      providers: [
        ...(definition.providers ?? []),
        {
          provide: AUDIT_OPTIONS,
          useFactory: (raw: AuditOptions): AuditOptions => ({
            ...raw,
            defaultActor: raw.defaultActor ?? "system",
          }),
          inject: [AUDIT_RAW_OPTIONS],
        },
        ActorMiddleware,
      ],
      exports: [...(definition.exports ?? []), AUDIT_OPTIONS],
    }))
    .build()
