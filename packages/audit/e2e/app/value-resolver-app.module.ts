import { AuditModule } from "@neoma/audit"
import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"

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
    AuditModule.forRoot({
      resolveActor: (req) => req.headers["x-actor"] as string,
    }),
  ],
  controllers: [WidgetController],
})
export class ValueResolverAppModule {}
