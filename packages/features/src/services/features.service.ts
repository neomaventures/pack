import { Inject, Injectable, Scope } from "@nestjs/common"
import { REQUEST } from "@nestjs/core"
import type { Request } from "express"

import {
  FEATURES_OPTIONS,
  type FeaturesModuleOptions,
} from "../features.options"

/**
 * Request-scoped programmatic access to feature flag state.
 *
 * Use when a handler must always run but needs to conditionally vary
 * behaviour based on a flag — e.g. "always accept the upload, but only
 * compute an AI summary if DOCUMENT_AI_SUMMARY is enabled for this user."
 *
 * `isEnabled(name)` evaluates the exact admit rule the `FeatureGuard`
 * evaluates for `@Feature(name)` on the same request:
 *
 *     admit = flags?.[name] === true
 *          || (await resolve?.(req))?.[name] === true
 *
 * The resolver (if configured) is invoked with the live express `Request`
 * for the in-flight HTTP call. Each call to `isEnabled` invokes the
 * resolver independently — no memoisation. If the consumer needs caching,
 * they memoise inside their own resolver.
 *
 * A resolver rejection propagates unchanged.
 *
 * Because the service is `Scope.REQUEST`, it must be used from
 * request-scoped or per-call providers. Injecting it into a singleton
 * construction path is a consumer error — DI will either fail or promote
 * the singleton to request scope.
 *
 * @example In-handler branching
 * ```typescript
 * @Injectable()
 * export class DocumentsService {
 *   constructor(private readonly features: FeaturesService) {}
 *
 *   async upload(file: Buffer) {
 *     const doc = await this.store(file)
 *     if (await this.features.isEnabled("DOCUMENT_AI_SUMMARY")) {
 *       doc.summary = await this.summarise(file)
 *     }
 *     return doc
 *   }
 * }
 * ```
 */
@Injectable({ scope: Scope.REQUEST })
export class FeaturesService {
  /**
   * Binds the module-wide options and the in-flight request so that
   * `isEnabled` can mirror the guard's admit rule on demand. A new
   * instance is created for every HTTP call because the service is
   * `Scope.REQUEST` — that is what makes `@Inject(REQUEST)` safe here.
   *
   * @param options - Module options resolved at bootstrap via the
   *   `FEATURES_OPTIONS` token. Holds the static `flags` map and the optional
   *   per-request `resolve` function that this service must mirror exactly.
   * @param request - The in-flight express `Request`, injected via Nest's
   *   `REQUEST` token. Passed unchanged to the consumer's resolver.
   */
  public constructor(
    @Inject(FEATURES_OPTIONS)
    private readonly options: FeaturesModuleOptions,
    @Inject(REQUEST)
    private readonly request: Request,
  ) {}

  /**
   * Returns `true` when the named feature flag is enabled for the
   * in-flight request, `false` otherwise.
   *
   * Mirrors the `FeatureGuard` admit rule exactly: the static `flags`
   * map short-circuits the resolver when it already admits. A resolver
   * that rejects propagates its rejection unchanged.
   *
   * @param name - The feature flag name to check.
   * @returns Whether the flag admits for this request.
   *
   * @example
   * ```typescript
   * if (await this.features.isEnabled("DOCUMENT_AI_SUMMARY")) {
   *   // branch taken only when enabled for this request
   * }
   * ```
   */
  public async isEnabled(name: string): Promise<boolean> {
    const { flags, resolve } = this.options
    if (flags?.[name] === true) return true
    const resolved = await resolve?.(this.request)
    return resolved?.[name] === true
  }
}
