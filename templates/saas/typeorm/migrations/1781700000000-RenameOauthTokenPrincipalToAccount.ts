import { MigrationInterface, QueryRunner } from "typeorm";

export class RenameOauthTokenPrincipalToAccount1781700000000 implements MigrationInterface {
    name = 'RenameOauthTokenPrincipalToAccount1781700000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop the old FK + UQ on principalId, rename the column, and
        // recreate the constraints under the new accountId name. Matches
        // the navigation rename from `principal` → `account` in
        // `@neomaventures/auth`'s concrete `OAuthToken` entity (#244).
        await queryRunner.query(`ALTER TABLE "oauth_token" DROP CONSTRAINT "FK_oauth_token_principalId"`);
        await queryRunner.query(`ALTER TABLE "oauth_token" DROP CONSTRAINT "UQ_oauth_token_principalId_provider"`);
        await queryRunner.query(`ALTER TABLE "oauth_token" RENAME COLUMN "principalId" TO "accountId"`);
        await queryRunner.query(`ALTER TABLE "oauth_token" ADD CONSTRAINT "UQ_oauth_token_accountId_provider" UNIQUE ("accountId", "provider")`);
        await queryRunner.query(`ALTER TABLE "oauth_token" ADD CONSTRAINT "FK_oauth_token_accountId" FOREIGN KEY ("accountId") REFERENCES "account"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "oauth_token" DROP CONSTRAINT "FK_oauth_token_accountId"`);
        await queryRunner.query(`ALTER TABLE "oauth_token" DROP CONSTRAINT "UQ_oauth_token_accountId_provider"`);
        await queryRunner.query(`ALTER TABLE "oauth_token" RENAME COLUMN "accountId" TO "principalId"`);
        await queryRunner.query(`ALTER TABLE "oauth_token" ADD CONSTRAINT "UQ_oauth_token_principalId_provider" UNIQUE ("principalId", "provider")`);
        await queryRunner.query(`ALTER TABLE "oauth_token" ADD CONSTRAINT "FK_oauth_token_principalId" FOREIGN KEY ("principalId") REFERENCES "account"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
