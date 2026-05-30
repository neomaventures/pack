import { Feature } from "@neomaventures/features"
import {
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
} from "@nestjs/common"

@Controller()
export class OnDenyController {
  @Get("on-deny/disabled")
  @Feature("DISABLED_FEATURE", {
    onDeny: () =>
      new ForbiddenException({
        message: "Feature disabled",
      }),
  })
  public disabled(): string {
    return "unreachable"
  }

  @Get("on-deny/disabled-with-header")
  @Feature("DISABLED_FEATURE", {
    onDeny: (req) =>
      new ForbiddenException({
        message: "Feature disabled",
        requestId: req.headers["x-test-id"],
      }),
  })
  public disabledWithHeader(): string {
    return "unreachable"
  }

  @Get("on-deny/enabled")
  @Feature("ENABLED_FEATURE", {
    onDeny: () => new ForbiddenException("should never be thrown"),
  })
  public enabled(): string {
    return "admitted"
  }

  @Get("on-deny/fail-closed")
  @Feature("MISSING_FEATURE", {
    onDeny: () =>
      new HttpException(
        { message: "I'm a teapot — feature absent" },
        HttpStatus.I_AM_A_TEAPOT,
      ),
  })
  public failClosed(): string {
    return "unreachable"
  }

  @Get("on-deny/ungated")
  @HttpCode(HttpStatus.NO_CONTENT)
  public ungated(): void {
    // No @Feature — always reachable, confirms ungated routes don't hit onDeny
  }
}

@Controller("on-deny-class")
@Feature("DISABLED_FEATURE", {
  onDeny: () =>
    new ForbiddenException({ message: "Class-level onDeny should override" }),
})
export class OnDenyClassOverrideController {
  // Handler-level @Feature re-declares the flag with no options.
  // Expected: handler-level fully overrides class-level — class onDeny is
  // discarded, deny path falls back to NotFoundException (404).
  @Get("handler-plain")
  @Feature("DISABLED_FEATURE")
  public handlerPlain(): string {
    return "unreachable"
  }
}
