import { MigrationInterface, QueryRunner } from 'typeorm';
import { readFileSync } from 'fs';
import { join } from 'path';

// Migracja bazowa — odtwarza pełny schemat z entiti TypeORM przy starcie pustej bazy.
// Generowana z pg_dump na środowisku rozwojowym (synchronize=true) i utrzymywana
// jako migration w produkcji (synchronize=false).
export class InitialSchema1777725595000 implements MigrationInterface {
  name = 'InitialSchema1777725595000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const sqlPath = join(__dirname, 'initial-schema.sql');
    const sql = readFileSync(sqlPath, 'utf8');
    await queryRunner.query(sql);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP SCHEMA public CASCADE`);
    await queryRunner.query(`CREATE SCHEMA public`);
  }
}
