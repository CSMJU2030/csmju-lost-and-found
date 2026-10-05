/**
 * PostgreSQL จริงสำหรับ e2e: ฐานข้อมูล lost_and_found_test_db (สร้างให้ถ้ายังไม่มี)
 * แต่ละไฟล์ทดสอบได้ schema ของตัวเอง สร้างตารางด้วย migration ชุดเดียวกับของจริง แล้วลบทิ้งเมื่อจบ
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { config as loadEnv } from 'dotenv';
import { Client } from 'pg';

loadEnv({ path: resolve(__dirname, '../../.env'), quiet: true });

// ใช้ TEST_DATABASE_URL ถ้ามี ไม่เช่นนั้นใช้เซิร์ฟเวอร์เดียวกับ DATABASE_URL แต่คนละฐานข้อมูล
function testDatabaseUrl(): URL {
  if (process.env.TEST_DATABASE_URL) return new URL(process.env.TEST_DATABASE_URL);
  if (!process.env.DATABASE_URL) throw new Error('ต้องตั้ง DATABASE_URL หรือ TEST_DATABASE_URL ใน backend/.env');
  const url = new URL(process.env.DATABASE_URL);
  url.pathname = '/lost_and_found_test_db';
  url.searchParams.delete('schema');
  return url;
}

async function ensureDatabase(url: URL): Promise<void> {
  const maintenance = new URL(url);
  maintenance.pathname = '/postgres';
  const client = new Client({ connectionString: maintenance.toString() });
  await client.connect();
  try {
    const name = decodeURIComponent(url.pathname.slice(1));
    const exists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
    if (!exists.rowCount) await client.query(`CREATE DATABASE "${name}"`);
  } catch (error) {
    // ไฟล์ทดสอบอื่นสร้างไปพร้อมกันแล้ว (42P04 = มีอยู่แล้ว, 23505 = ชนกันระหว่างสร้าง)
    if (!['42P04', '23505'].includes((error as { code?: string }).code ?? '')) throw error;
  } finally {
    await client.end();
  }
}

export interface TestDatabase {
  url: string;
  drop(): Promise<void>;
}

export async function createTestDatabase(): Promise<TestDatabase> {
  const url = testDatabaseUrl();
  await ensureDatabase(url);
  const schema = `test_${randomUUID().replaceAll('-', '')}`;

  const client = new Client({ connectionString: url.toString() });
  await client.connect();
  try {
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET search_path TO "${schema}"`);
    const dir = resolve(__dirname, '../../prisma/migrations');
    for (const name of readdirSync(dir).filter((d) => existsSync(join(dir, d, 'migration.sql'))).sort()) {
      await client.query(readFileSync(join(dir, name, 'migration.sql'), 'utf8'));
    }
  } finally {
    await client.end();
  }

  const withSchema = new URL(url);
  withSchema.searchParams.set('schema', schema);
  return {
    url: withSchema.toString(),
    async drop() {
      const cleanup = new Client({ connectionString: url.toString() });
      await cleanup.connect();
      await cleanup.query(`DROP SCHEMA "${schema}" CASCADE`);
      await cleanup.end();
    },
  };
}
