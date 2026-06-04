import { ConfigurableModuleBuilder } from "@nestjs/common"
import { EventEmitterModule } from "@nestjs/event-emitter"

import { type AuthOptions, AUTH_OPTIONS } from "./auth.options"
import { GoogleCallbackInterceptor } from "./interceptors/google-callback.interceptor"
import { CurrentPrincipal, principalProvider } from "./principal/principal.slot"
import { AuthenticationService } from "./services/authentication.service"
import { GoogleAuthService } from "./services/google-auth.service"
import { MagicLinkService } from "./services/magic-link.service"
import { PermissionService } from "./services/permission.service"
import { SessionService } from "./services/session.service"
import { TokenService } from "./services/token.service"

const AUTH_PROVIDERS = [
  AuthenticationService,
  GoogleAuthService,
  GoogleCallbackInterceptor,
  MagicLinkService,
  PermissionService,
  SessionService,
  TokenService,
]

export const {
  ConfigurableModuleClass,
  MODULE_OPTIONS_TOKEN,
  ASYNC_OPTIONS_TYPE,
  OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<AuthOptions>({
  optionsInjectionToken: AUTH_OPTIONS,
})
  .setClassMethodName("forRoot")
  .setExtras({}, (definition) => ({
    ...definition,
    global: true,
    imports: [EventEmitterModule.forRoot(), ...(definition.imports ?? [])],
    providers: [
      ...(definition.providers ?? []),
      ...AUTH_PROVIDERS,
      principalProvider,
    ],
    // Services are exported so consumers can inject them directly
    // (e.g. AuthenticationService, SessionService).
    // AUTH_OPTIONS is exported so that guards resolved on-demand
    // (e.g. WebhookSignatureGuard) can access the configuration
    // via @Inject(AUTH_OPTIONS).
    // CurrentPrincipal is exported so consumers can inject the
    // per-request principal via @Inject(CurrentPrincipal).
    exports: [
      ...(definition.exports ?? []),
      ...AUTH_PROVIDERS,
      AUTH_OPTIONS,
      CurrentPrincipal,
    ],
  }))
  .build()
