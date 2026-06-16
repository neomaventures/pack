import {
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
} from "@nestjs/common"

import { Authenticated } from "@neomaventures/auth"

/**
 * A test Controller exercising the `@Authenticated()` `onUnauthenticated`
 * precedence chain (per-route metadata > module-level default > built-in 401).
 *
 * Mounted under both module variants — the default app modules (no
 * `forRoot.onUnauthenticated`) and the configured app modules
 * (`forRoot({ onUnauthenticated: "/login" })`) — so the same routes
 * resolve to different responses depending on which module is loaded.
 */
@Controller("unauth")
export class OnUnauthenticatedController {
  /**
   * Per-route redirect string. Anonymous → 303 to /login.
   */
  @Get("redirect")
  @Authenticated({ onUnauthenticated: "/login" })
  public redirect(): { ok: boolean } {
    return { ok: true }
  }

  /**
   * Per-route NotFoundException. Anonymous → 404.
   */
  @Get("not-found")
  @Authenticated({ onUnauthenticated: NotFoundException })
  public notFound(): { ok: boolean } {
    return { ok: true }
  }

  /**
   * Per-route ForbiddenException. Anonymous → 403.
   */
  @Get("forbidden")
  @Authenticated({ onUnauthenticated: ForbiddenException })
  public forbidden(): { ok: boolean } {
    return { ok: true }
  }

  /**
   * No per-route options. Under the default app modules, anonymous → 401.
   * Under the configured app modules, anonymous → 303 to /login (forRoot wins).
   */
  @Get("default-401")
  @Authenticated()
  public default401(): { ok: boolean } {
    return { ok: true }
  }

  /**
   * No per-route options. Used to verify forRoot kicks in under the
   * configured app modules — anonymous → 303 to /login.
   */
  @Get("default-redirect")
  @Authenticated()
  public defaultRedirect(): { ok: boolean } {
    return { ok: true }
  }

  /**
   * Per-route NotFoundException overriding the forRoot redirect.
   * Anonymous → 404 (per-route wins over forRoot).
   */
  @Get("default-redirect-override")
  @Authenticated({ onUnauthenticated: NotFoundException })
  public defaultRedirectOverride(): { ok: boolean } {
    return { ok: true }
  }
}
