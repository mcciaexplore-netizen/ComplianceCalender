import { env } from 'cloudflare:workers';
import { hasAllowedOrigin } from './deployment';
export const db = () => env.DB as D1Database;
export const bucket = () => (env as unknown as { FILES: R2Bucket }).FILES;
export const id = () => crypto.randomUUID();
export const now = () => new Date().toISOString();
export const today = () => now().slice(0, 10);
export async function one<T = any>(
  sql: string,
  ...args: unknown[]
): Promise<T | null> {
  return db()
    .prepare(sql)
    .bind(...args)
    .first<T>();
}
export async function all<T = any>(
  sql: string,
  ...args: unknown[]
): Promise<T[]> {
  return (
    await db()
      .prepare(sql)
      .bind(...args)
      .all<T>()
  ).results;
}
export async function run(sql: string, ...args: unknown[]) {
  return db()
    .prepare(sql)
    .bind(...args)
    .run();
}
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function fail(message: string, status = 400): never {
  throw new HttpError(status, message);
}
export function responseError(error: unknown) {
  console.error(error instanceof HttpError ? error.message : error);
  return Response.json(
    {
      error:
        error instanceof HttpError
          ? error.message
          : 'The request could not be completed. Please try again.',
    },
    { status: error instanceof HttpError ? error.status : 500 },
  );
}
export function sameOrigin(req: Request) {
  if (!hasAllowedOrigin(req)) fail('Request origin is not allowed.', 403);
}
export async function digest(value: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)),
    ),
  )
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('');
}
export async function passwordHash(value: string, salt = id()) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(value),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: new TextEncoder().encode(salt),
      iterations: 100000,
      hash: 'SHA-256',
    },
    key,
    256,
  );
  return (
    salt +
    ':' +
    Array.from(new Uint8Array(bits))
      .map((x) => x.toString(16).padStart(2, '0'))
      .join('')
  );
}
export async function session(req: Request) {
  const token = req.headers
    .get('cookie')
    ?.split(';')
    .map((s) => s.trim())
    .find((s) => s.startsWith('cm_session='))
    ?.slice(11);
  if (!token) fail('Please sign in.', 401);
  const user = await one(
    'SELECT u.*,o.demo FROM sessions s JOIN users u ON u.id=s.user_id JOIN organizations o ON o.id=u.organization_id WHERE s.id=? AND s.expires>? AND u.status=?',
    await digest(token),
    Date.now(),
    'Active',
  );
  if (!user) fail('Your session expired. Please sign in.', 401);
  return user;
}
export async function makeSession(userId: string, req: Request) {
  const token = id() + id();
  await run(
    'INSERT INTO sessions(id,user_id,expires) VALUES(?,?,?)',
    await digest(token),
    userId,
    Date.now() + 86400000,
  );
  return `cm_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400${new URL(req.url).protocol === 'https:' ? '; Secure' : ''}`;
}
export async function rateLimit(key: string, maximum = 20) {
  await run(
    'INSERT INTO attempts(key,count,until) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN until<? THEN 1 ELSE count+1 END,until=CASE WHEN until<? THEN excluded.until ELSE until END',
    key,
    Date.now() + 900000,
    Date.now(),
    Date.now(),
  );
  const x = await one('SELECT count FROM attempts WHERE key=?', key);
  if (x.count > maximum)
    fail('Too many attempts. Try again in 15 minutes.', 429);
}
export const managers = ['Owner', 'Compliance Manager', 'MCCIA Administrator'];
export const experts = ['Expert', 'Auditor', 'MCCIA Administrator'];
export const reviewers = [
  'Owner',
  'Compliance Manager',
  'Reviewer',
  'Expert',
  'Auditor',
  'MCCIA Administrator',
];
export function permit(user: any, roles: string[]) {
  if (!roles.includes(user.role))
    fail('Your role cannot perform this action.', 403);
}
export async function record(org: string, recordId: string) {
  const r = await one(
    'SELECT * FROM records WHERE id=? AND organization_id=?',
    recordId,
    org,
  );
  if (!r) fail('Record not found.', 404);
  return { ...JSON.parse(r.data), ...r, data: undefined };
}
export async function insert(org: string, kind: string, data: any) {
  const rid = id();
  await run(
    'INSERT INTO records(id,organization_id,kind,parent_id,owner_id,reviewer_id,status,data,updated,version) VALUES(?,?,?,?,?,?,?,?,?,1)',
    rid,
    org,
    kind,
    data.parent_id || null,
    data.owner_id || null,
    data.reviewer_id || null,
    data.status || 'Draft',
    JSON.stringify(data),
    now(),
  );
  return rid;
}
export async function update(r: any, patch: any) {
  const merged = { ...r, ...patch };
  delete merged.data;
  const result = await run(
    'UPDATE records SET status=?,owner_id=?,reviewer_id=?,parent_id=?,data=?,updated=?,version=version+1 WHERE id=? AND organization_id=? AND version=?',
    merged.status,
    merged.owner_id || null,
    merged.reviewer_id || null,
    merged.parent_id || null,
    JSON.stringify(merged),
    now(),
    r.id,
    r.organization_id,
    r.version,
  );
  if (!result.meta.changes)
    fail('This record changed in another session. Refresh and try again.', 409);
}
export async function log(user: any, message: string, parent_id?: string) {
  await insert(user.organization_id, 'activity', {
    title: message,
    actor: user.name,
    parent_id,
    status: 'Recorded',
    date: now(),
  });
}
export async function notify(
  org: string,
  title: string,
  owner_id?: string,
  parent_id?: string,
) {
  await insert(org, 'notification', {
    title,
    owner_id,
    parent_id,
    status: 'Unread',
    date: now(),
  });
}
