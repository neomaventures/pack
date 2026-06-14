import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateOauthTokenTable1781471500000 implements MigrationInterface {
    name = 'CreateOauthTokenTable1781471500000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "oauth_token" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "provider" character varying NOT NULL, "accessToken" character varying NOT NULL, "refreshToken" text, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "scopes" text NOT NULL, "principalId" uuid, CONSTRAINT "PK_oauth_token_id" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "oauth_token" ADD CONSTRAINT "UQ_oauth_token_principalId_provider" UNIQUE ("principalId", "provider")`);
        await queryRunner.query(`ALTER TABLE "oauth_token" ADD CONSTRAINT "FK_oauth_token_principalId" FOREIGN KEY ("principalId") REFERENCES "account"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "oauth_token" DROP CONSTRAINT "FK_oauth_token_principalId"`);
        await queryRunner.query(`ALTER TABLE "oauth_token" DROP CONSTRAINT "UQ_oauth_token_principalId_provider"`);
        await queryRunner.query(`DROP TABLE "oauth_token"`);
    }

}
