import {
  RouteModelBindingModule,
  RouteModelBindingMiddleware,
} from "@neomaventures/route-model-binding"
import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"

import { AppController } from "./app.controller"

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "sqlite",
      database: ":memory:",
      entities: ["e2e/app/**/*.entity.ts"],
      synchronize: true,
    }),
    RouteModelBindingModule.forRoot(),
  ],
  controllers: [AppController],
})
export class AppModule implements NestModule {
  public configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(RouteModelBindingMiddleware)
      .forRoutes("/users/:user/posts/:post")
  }
}
