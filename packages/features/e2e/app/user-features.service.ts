import { Injectable } from "@nestjs/common"
import type { Request } from "express"

type DynamicFlags = {
  DYNAMIC_FEATURE: boolean
  DYNAMIC_DISABLED: boolean
  DOCUMENT_AI_SUMMARY: boolean
}

@Injectable()
export class UserFeaturesService {
  public featuresFor(req?: Request): DynamicFlags {
    const header = req?.headers["x-ai-summary"]
    return {
      DYNAMIC_FEATURE: true,
      DYNAMIC_DISABLED: false,
      DOCUMENT_AI_SUMMARY: header === "true",
    }
  }
}
