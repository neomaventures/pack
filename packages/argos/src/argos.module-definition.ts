import { ConfigurableModuleBuilder } from "@nestjs/common"

import { type ArgosOptions, ARGOS_OPTIONS } from "./argos.options"
import { ActorMiddleware } from "./middlewares/actor.middleware"

const ARGOS_RAW_OPTIONS = Symbol("ARGOS_RAW_OPTIONS")

export const { ConfigurableModuleClass } =
  new ConfigurableModuleBuilder<ArgosOptions>({
    optionsInjectionToken: ARGOS_RAW_OPTIONS,
  })
    .setClassMethodName("forRoot")
    .setExtras({}, (definition) => ({
      ...definition,
      providers: [
        ...(definition.providers ?? []),
        {
          provide: ARGOS_OPTIONS,
          useFactory: (raw: ArgosOptions): ArgosOptions => ({
            ...raw,
            defaultActor: raw.defaultActor ?? "system",
          }),
          inject: [ARGOS_RAW_OPTIONS],
        },
        ActorMiddleware,
      ],
      exports: [...(definition.exports ?? []), ARGOS_OPTIONS],
    }))
    .build()
