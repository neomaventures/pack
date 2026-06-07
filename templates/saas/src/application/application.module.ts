import { Module } from "@nestjs/common"

import { ApplicationController } from "~application/application.controller"

/**
 * Root application module for the SaaS template.
 *
 * Registers all top-level controllers and serves as the
 * entry point for the NestJS dependency injection container.
 */
@Module({
  controllers: [ApplicationController],
})
export class ApplicationModule {}
