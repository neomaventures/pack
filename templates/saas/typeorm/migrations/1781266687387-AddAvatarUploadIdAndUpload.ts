import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAvatarUploadIdAndUpload1781266687387 implements MigrationInterface {
    name = 'AddAvatarUploadIdAndUpload1781266687387'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "upload" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "originalName" character varying NOT NULL, "mimeType" character varying NOT NULL, "size" integer NOT NULL, "key" character varying NOT NULL, "bucket" character varying NOT NULL, CONSTRAINT "PK_1fe8db121b3de4ddfa677fc51f3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "account" ADD "avatarUploadId" uuid`);
        await queryRunner.query(`ALTER TABLE "account" ADD CONSTRAINT "UQ_account_avatarUploadId" UNIQUE ("avatarUploadId")`);
        await queryRunner.query(`ALTER TABLE "account" ADD CONSTRAINT "FK_account_avatarUploadId" FOREIGN KEY ("avatarUploadId") REFERENCES "upload"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "account" DROP CONSTRAINT "FK_account_avatarUploadId"`);
        await queryRunner.query(`ALTER TABLE "account" DROP CONSTRAINT "UQ_account_avatarUploadId"`);
        await queryRunner.query(`ALTER TABLE "account" DROP COLUMN "avatarUploadId"`);
        await queryRunner.query(`DROP TABLE "upload"`);
    }

}
