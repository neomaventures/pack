import { Controller, Post } from "@nestjs/common"

import { RequestReaderService } from "./request-reader.service"

/**
 * Both endpoints delegate to the singleton {@link RequestReaderService},
 * which reads the live request deep in the call stack via `getRequest()`.
 * Nothing here threads `req` manually or uses `@Req()` — the whole point is
 * that the live request is reachable from the context alone.
 */
@Controller("echo")
export class EchoController {
  public constructor(private readonly reader: RequestReaderService) {}

  /** Deep read: the singleton reads the live request and echoes its body. */
  @Post()
  public echo(): { body: unknown } {
    return { body: this.reader.readBody() }
  }

  /**
   * Isolation: the singleton awaits a short delay *before* reading, so two
   * concurrent requests interleave (both enter, both yield, both resume). A
   * "stash the last request" singleton returns the wrong marker here.
   */
  @Post("slow")
  public async slow(): Promise<{ marker: unknown }> {
    const body = (await this.reader.readBodyAfterDelay()) as
      | { marker?: unknown }
      | undefined
    return { marker: body?.marker }
  }
}
