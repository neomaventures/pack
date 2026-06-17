import { StorageModule } from "@neomaventures/storage"
import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"

import { UploadController } from "./upload.controller"
import { Upload } from "./upload.entity"

/**
 * Demo app module with a bogus S3 endpoint for testing the
 * file-store-unreachable error path.
 */
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "sqlite",
      database: ":memory:",
      entities: [Upload],
      synchronize: true,
    }),
    StorageModule.forRoot({
      endpoint: "http://localhost:1",
      region: "us-east-1",
      accessKeyId: "fake-key",
      secretAccessKey: "fake-secret",
      entity: Upload,
    }),
    StorageModule.forFeature({
      bucket: "unreachable-bucket",
    }),
  ],
  controllers: [UploadController],
})
export class UnreachableAppModule {}
