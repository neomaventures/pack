import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTimestampsToAccount1781700000001 implements MigrationInterface {
    name = 'AddTimestampsToAccount1781700000001'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // `@neomaventures/auth`'s concrete `Account` adds `createdAt` /
        // `updatedAt` via `@CreateDateColumn` / `@UpdateDateColumn`.
        // Existing rows are backfilled with NOW() so the NOT NULL
        // constraint can be applied without breaking existing accounts.
        await queryRunner.query(`ALTER TABLE "account" ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "account" ADD "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "account" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "account" DROP COLUMN "createdAt"`);
    }

}
