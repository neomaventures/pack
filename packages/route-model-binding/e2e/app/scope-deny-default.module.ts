import {
  RouteModelBindingMiddleware,
  RouteModelBindingModule,
} from "@neomaventures/route-model-binding"
import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"

import { DenyAllAccessor } from "./accessors/deny-all.accessor"
import { AppController } from "./app.controller"

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "sqlite",
      database: ":memory:",
      entities: ["e2e/app/**/*.entity.ts"],
      synchronize: true,
    }),
    RouteModelBindingModule.forRoot({
      defaultResolver: ({ id }) => ({ id }),
      scope: { accessor: DenyAllAccessor },
    }),
  ],
  controllers: [AppController],
})
export class ScopeDenyDefaultModule implements NestModule {
  public configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(RouteModelBindingMiddleware)
      .forRoutes("/users/:user/posts/:post")
  }
}
