import { Module } from "@nestjs/common"

import { DashboardController } from "~dashboard/dashboard.controller"

/**
 * Module for the dashboard page.
 *
 * Registers the {@link DashboardController} which renders
 * the authenticated user's dashboard view.
 */
@Module({
  controllers: [DashboardController],
})
export class DashboardModule {}
