import { DynamicModule, Module, type Provider } from "@nestjs/common"
import { FindOptionsWhere } from "typeorm"

import {
  ROUTE_MODEL_BINDING_CONFIG,
  SCOPE_ACCESSOR,
} from "../constants/injection-tokens"
import { RouteModelBindingConfig } from "../interfaces/route-model-binding-config.interface"
import { RouteModelBindingMiddleware } from "../middlewares/route-model-binding.middleware"

/**
 * Default resolver function for route model binding
 * that simply matches the entity by its ID.
 *
 * @param param Object containing the ID to resolve
 * @param [param.id] The ID of the entity to resolve
 *
 * @returns A TypeORM where clause to find the entity by ID
 */
export const DEFAULT_RESOLVER = ({
  id,
}: {
  id: string
}): FindOptionsWhere<any> => ({ id })

/**
 * Module that provides route model binding functionality for NestJS applications.
 * This module registers the RouteModelBindingMiddleware as a provider.
 */
@Module({})
export class RouteModelBindingModule {
  /**
   * Creates a dynamic module with the RouteModelBindingMiddleware provider.
   *
   * @param config Configuration for route model binding behavior with sensible defaults
   * @returns A DynamicModule configuration for the RouteModelBindingModule
   */
  public static forRoot(config?: RouteModelBindingConfig): DynamicModule {
    const resolvedConfig: RouteModelBindingConfig = {
      ...config,
      defaultResolver: config?.defaultResolver ?? DEFAULT_RESOLVER,
    }

    const providers: Provider[] = [
      {
        provide: ROUTE_MODEL_BINDING_CONFIG,
        useValue: resolvedConfig,
      },
      RouteModelBindingMiddleware,
    ]

    if (resolvedConfig.scope?.accessor) {
      providers.push({
        provide: SCOPE_ACCESSOR,
        useClass: resolvedConfig.scope.accessor,
      })
    }

    const moduleExports: Array<
      Provider | symbol | typeof RouteModelBindingMiddleware
    > = [RouteModelBindingMiddleware, ROUTE_MODEL_BINDING_CONFIG]

    if (resolvedConfig.scope?.accessor) {
      moduleExports.push(SCOPE_ACCESSOR)
    }

    return {
      module: RouteModelBindingModule,
      providers,
      exports: moduleExports,
    }
  }
}
