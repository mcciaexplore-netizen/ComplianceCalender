import { env } from 'cloudflare:workers';
import { neon } from '@neondatabase/serverless';
import { schemaStatements } from './schema';
export function config(key: string): string {
  return String(
    (env as unknown as Record<string, unknown>)[key] ?? process.env[key] ?? '',
  );
}
export const uid = () => crypto.randomUUID();
export const timestamp = () => new Date().toISOString();
export interface Statement {
  sql: string;
  params: unknown[];
}
export interface CopilotRepository {
  kind: string;
  all<T = Record<string, unknown>>(
    sql: string,
    ...params: unknown[]
  ): Promise<T[]>;
  run(sql: string, ...params: unknown[]): Promise<number>;
  batch(statements: Statement[]): Promise<void>;
}
class D1Repository implements CopilotRepository {
  kind = 'D1 / SQLite';
  async all<T>(sql: string, ...params: unknown[]): Promise<T[]> {
    return (
      await env.DB.prepare(sql)
        .bind(...params)
        .all<T>()
    ).results;
  }
  async run(sql: string, ...params: unknown[]) {
    return (
      await env.DB.prepare(sql)
        .bind(...params)
        .run()
    ).meta.changes;
  }
  async batch(items: Statement[]) {
    for (let i = 0; i < items.length; i += 80)
      await env.DB.batch(
        items
          .slice(i, i + 80)
          .map((x) => env.DB.prepare(x.sql).bind(...x.params)),
      );
  }
}
const pgSQL = (sql: string) => {
  let n = 0;
  return sql
    .replace(/\?/g, () => '$' + ++n)
    .replace(
      'seq INTEGER PRIMARY KEY AUTOINCREMENT',
      'seq BIGSERIAL PRIMARY KEY',
    );
};
class PostgreSQLRepository implements CopilotRepository {
  kind = 'PostgreSQL';
  private client = neon(config('DATABASE_URL'));
  async all<T>(sql: string, ...params: unknown[]) {
    return (await this.client.query(pgSQL(sql), params)) as T[];
  }
  async run(sql: string, ...params: unknown[]) {
    const result = await this.client.query(pgSQL(sql), params, {
      fullResults: true,
    });
    return result.rowCount ?? 0;
  }
  async batch(items: Statement[]) {
    await this.client.transaction(
      items.map((x) => this.client.query(pgSQL(x.sql), x.params)),
    );
  }
}
let repo: CopilotRepository | undefined;
let initialized: Promise<void> | undefined;
export function repository() {
  return (repo ??= config('DATABASE_URL')
    ? new PostgreSQLRepository()
    : new D1Repository());
}
export async function ready() {
  if (!initialized)
    initialized = (async () => {
      await repository().batch(
        schemaStatements.map((sql) => ({ sql, params: [] })),
      );
      if (
        repository().kind === 'PostgreSQL' &&
        config('USE_PGVECTOR') === 'true'
      ) {
        await repository().run('CREATE EXTENSION IF NOT EXISTS vector');
        await repository().run(
          'CREATE TABLE IF NOT EXISTS cop_vectors (chunk_id TEXT PRIMARY KEY REFERENCES cop_chunks(id) ON DELETE CASCADE, tenant_id TEXT NOT NULL REFERENCES cop_tenants(id), embedding vector(1536) NOT NULL)',
        );
        await repository().run(
          'CREATE INDEX IF NOT EXISTS cop_vectors_hnsw ON cop_vectors USING hnsw (embedding vector_cosine_ops)',
        );
        await repository().run(
          'CREATE INDEX IF NOT EXISTS cop_vectors_tenant ON cop_vectors(tenant_id)',
        );
      }
    })().catch((e) => {
      initialized = undefined;
      throw e;
    });
  await initialized;
  return repository();
}
export async function rows<T = any>(
  sql: string,
  ...params: unknown[]
): Promise<T[]> {
  return (await ready()).all<T>(sql, ...params);
}
export async function first<T = any>(
  sql: string,
  ...params: unknown[]
): Promise<T | null> {
  return (await rows<T>(sql, ...params))[0] ?? null;
}
export async function execute(sql: string, ...params: unknown[]) {
  return (await ready()).run(sql, ...params);
}
export async function transaction(items: Statement[]) {
  return (await ready()).batch(items);
}
export async function hash(text: string) {
  const bytes = new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)),
  );
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function reject(status: number, message: string): never {
  throw new ApiError(status, message);
}
export function sameOrigin(req: Request) {
  const origin = req.headers.get('origin');
  if (origin && origin !== new URL(req.url).origin)
    reject(403, 'Request origin is not allowed.');
  if (req.headers.get('sec-fetch-site') === 'cross-site')
    reject(403, 'Cross-site request blocked.');
}
export async function audit(
  user: { id: string; tenant_id: string; name: string },
  action: string,
  target?: string,
) {
  await execute(
    'INSERT INTO cop_audit(id,tenant_id,user_id,actor,action,target_id,timestamp) VALUES(?,?,?,?,?,?,?)',
    uid(),
    user.tenant_id,
    user.id,
    user.name,
    action,
    target || null,
    timestamp(),
  );
}
export async function event(
  tenant: string,
  consultation: string,
  type: string,
  data: unknown,
) {
  await execute(
    'INSERT INTO cop_events(tenant_id,consultation_id,type,data,timestamp) VALUES(?,?,?,?,?)',
    tenant,
    consultation,
    type,
    JSON.stringify(data),
    timestamp(),
  );
}
export function storage() {
  return (env as unknown as { FILES: R2Bucket }).FILES;
}
