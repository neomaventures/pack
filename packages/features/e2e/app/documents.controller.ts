import { Feature } from "@neoma/features"
import { Controller, Get, HttpCode, HttpStatus, Post } from "@nestjs/common"

import { DocumentsService } from "./documents.service"

@Controller("documents")
export class DocumentsController {
  public constructor(private readonly documents: DocumentsService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  public upload(): Promise<void> {
    return this.documents.upload("DOCUMENT_AI_SUMMARY")
  }

  @Post("never")
  @HttpCode(HttpStatus.OK)
  public uploadNever(): Promise<void> {
    return this.documents.upload("NEVER_ENABLED")
  }

  @Get("ai-only")
  @Feature("DOCUMENT_AI_SUMMARY")
  public aiOnly(): { ok: true } {
    return { ok: true }
  }

  @Get("never")
  @Feature("NEVER_ENABLED")
  public neverAdmit(): { ok: true } {
    return { ok: true }
  }
}
