import {
  StoredFile,
  TemporaryLink,
  Upload as UploadDecorator,
} from "@neomaventures/storage"
import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from "@nestjs/common"
import { TestKeyResolver } from "fixtures/resolvers/test-key-resolver"
import { DataSource } from "typeorm"

import { Upload } from "./upload.entity"

@Controller("uploads")
export class UploadController {
  public constructor(private readonly dataSource: DataSource) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UploadDecorator()
  public create(@StoredFile() file: Upload): Upload {
    file.source = "form"
    return file
  }

  @Post("csv")
  @HttpCode(HttpStatus.CREATED)
  @UploadDecorator({ types: ["text/csv"] })
  public createCsv(@StoredFile() file: Upload): Upload {
    file.source = "csv-import"
    return file
  }

  @Post("small")
  @HttpCode(HttpStatus.CREATED)
  @UploadDecorator({ maxSize: 50 })
  public createSmall(@StoredFile() file: Upload): Upload {
    file.source = "small"
    return file
  }

  @Post("custom/class")
  @HttpCode(HttpStatus.CREATED)
  @UploadDecorator({
    key: TestKeyResolver,
  })
  public createCustomClass(@StoredFile() file: Upload): Upload {
    file.source = "custom"
    return file
  }

  @Post("custom/function")
  @HttpCode(HttpStatus.CREATED)
  @UploadDecorator({
    key: (req, idGenerator, file): string =>
      new TestKeyResolver().resolve(req, idGenerator, file),
  })
  public createCustomFunction(@StoredFile() file: Upload): Upload {
    file.source = "custom"
    return file
  }

  @Get(":id")
  @TemporaryLink()
  public async download(@Param("id") id: string): Promise<Upload> {
    const repo = this.dataSource.getRepository(Upload)
    return repo.findOneByOrFail({ id })
  }

  @Get(":id/avatar")
  @TemporaryLink({
    default: "/img/default.svg",
    cacheControl: "private, max-age=300",
  })
  public async avatar(@Param("id") id: string): Promise<Upload | null> {
    const repo = this.dataSource.getRepository(Upload)
    return repo.findOneBy({ id })
  }
}
