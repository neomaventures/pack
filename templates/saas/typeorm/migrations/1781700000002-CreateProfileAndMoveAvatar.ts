import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateProfileAndMoveAvatar1781700000002 implements MigrationInterface {
    name = 'CreateProfileAndMoveAvatar1781700000002'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Auth's concrete `Account` (#244) drops the avatar relation —
        // the consumer-owned `Profile` entity now holds it via FK
        // composition. Create the profile table, backfill from the
        // existing `account.avatarUploadId` column, then drop the column
        // and its constraints from `account`.
        await queryRunner.query(`CREATE TABLE "profile" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "accountId" uuid NOT NULL, "avatarUploadId" uuid, CONSTRAINT "UQ_profile_accountId" UNIQUE ("accountId"), CONSTRAINT "UQ_profile_avatarUploadId" UNIQUE ("avatarUploadId"), CONSTRAINT "PK_profile_id" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "profile" ADD CONSTRAINT "FK_profile_accountId" FOREIGN KEY ("accountId") REFERENCES "account"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "profile" ADD CONSTRAINT "FK_profile_avatarUploadId" FOREIGN KEY ("avatarUploadId") REFERENCES "upload"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);

        // Backfill: every account with a non-null avatar gets a profile row.
        await queryRunner.query(`INSERT INTO "profile" ("accountId", "avatarUploadId") SELECT "id", "avatarUploadId" FROM "account" WHERE "avatarUploadId" IS NOT NULL`);

        // Now drop the avatar column from account.
        await queryRunner.query(`ALTER TABLE "account" DROP CONSTRAINT "FK_account_avatarUploadId"`);
        await queryRunner.query(`ALTER TABLE "account" DROP CONSTRAINT "UQ_account_avatarUploadId"`);
        await queryRunner.query(`ALTER TABLE "account" DROP COLUMN "avatarUploadId"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Restore the avatar column on account.
        await queryRunner.query(`ALTER TABLE "account" ADD "avatarUploadId" uuid`);
        await queryRunner.query(`ALTER TABLE "account" ADD CONSTRAINT "UQ_account_avatarUploadId" UNIQUE ("avatarUploadId")`);
        await queryRunner.query(`ALTER TABLE "account" ADD CONSTRAINT "FK_account_avatarUploadId" FOREIGN KEY ("avatarUploadId") REFERENCES "upload"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);

        // Restore the FKs from profile back into account.
        await queryRunner.query(`UPDATE "account" SET "avatarUploadId" = "profile"."avatarUploadId" FROM "profile" WHERE "account"."id" = "profile"."accountId" AND "profile"."avatarUploadId" IS NOT NULL`);

        await queryRunner.query(`ALTER TABLE "profile" DROP CONSTRAINT "FK_profile_avatarUploadId"`);
        await queryRunner.query(`ALTER TABLE "profile" DROP CONSTRAINT "FK_profile_accountId"`);
        await queryRunner.query(`DROP TABLE "profile"`);
    }

}
