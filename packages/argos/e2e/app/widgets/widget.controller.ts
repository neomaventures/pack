import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { type Repository } from "typeorm"

import { Widget } from "./widget.entity"

@Controller("widgets")
export class WidgetController {
  public constructor(
    @InjectRepository(Widget)
    private readonly repository: Repository<Widget>,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  public async create(@Body() body: { name: string }): Promise<Widget> {
    return this.repository.save(this.repository.create({ name: body.name }))
  }

  @Put(":id")
  public async update(
    @Param("id") id: string,
    @Body() body: { name: string },
  ): Promise<Widget> {
    const widget = await this.repository.findOneByOrFail({ id })
    widget.name = body.name
    return this.repository.save(widget)
  }
}
