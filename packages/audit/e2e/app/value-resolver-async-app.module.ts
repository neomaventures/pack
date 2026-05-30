import { ArgosModule } from "@neoma/audit"
import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { type Request } from "express"

import { WidgetController } from "./widgets/widget.controller"
import { Widget } from "./widgets/widget.entity"

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "sqlite",
      database: ":memory:",
      entities: [Widget],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([Widget]),
    ArgosModule.forRootAsync({
      useFactory: (): { resolveActor: (req: Request) => string } => ({
        resolveActor: (req: Request) => req.headers["x-actor"] as string,
      }),
    }),
  ],
  controllers: [WidgetController],
})
export class ValueResolverAsyncAppModule {}
