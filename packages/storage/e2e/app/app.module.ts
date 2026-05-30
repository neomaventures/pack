import { CerberusModule } from "@neoma/storage"
import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { TestKeyResolver } from "fixtures/resolvers/test-key-resolver"

import { UploadController } from "./upload.controller"
import { Upload } from "./upload.entity"

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "sqlite",
      database: ":memory:",
      entities: [Upload],
      synchronize: true,
    }),
    CerberusModule.forRoot({
      endpoint: process.env.STORAGE_ENDPOINT!,
      region: process.env.STORAGE_REGION!,
      bucket: process.env.STORAGE_BUCKET!,
      accessKeyId: process.env.STORAGE_ACCESS_KEY!,
      secretAccessKey: process.env.STORAGE_SECRET_KEY!,
      entity: Upload,
      maxFileSize: 500,
    }),
  ],
  providers: [TestKeyResolver],
  controllers: [UploadController],
})
export class AppModule {}
