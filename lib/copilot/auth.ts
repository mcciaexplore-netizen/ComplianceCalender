import {
  first,
  execute,
  transaction,
  uid,
  timestamp,
  hash,
  reject,
  sameOrigin,
  audit,
} from './repository';
import { seedDemo } from './seed';
import type { Role, User } from './types';
export async function passwordHash(value: string, salt = uid()) {
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
    Array.from(new Uint8Array(bits), (x) =>
      x.toString(16).padStart(2, '0'),
    ).join('')
  );
}
function safeEqual(a: string, b: string) {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++)
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}
function token(req: Request) {
  return req.headers
    .get('cookie')
    ?.split(';')
    .map((x) => x.trim())
    .find((x) => x.startsWith('sme_session='))
    ?.slice(12);
}
export async function currentUser(req: Request): Promise<User> {
  const raw = token(req);
  if (!raw) reject(401, 'Please sign in to your helpline workspace.');
  const s = await first(
    'SELECT u.*,t.demo,s.last_seen,s.expires FROM cop_sessions s JOIN cop_users u ON u.id=s.user_id JOIN cop_tenants t ON t.id=u.tenant_id WHERE s.id=? AND u.active=1',
    await hash(raw),
  );
  if (
    !s ||
    Number(s.expires) < Date.now() ||
    Number(s.last_seen) < Date.now() - 30 * 60 * 1000
  )
    reject(401, 'Your session expired. Please sign in again.');
  await execute(
    'UPDATE cop_sessions SET last_seen=? WHERE id=?',
    Date.now(),
    await hash(raw),
  );
  return {
    id: s.id,
    tenant_id: s.tenant_id,
    name: s.name,
    email: s.email,
    role: s.role,
    active: s.active,
    demo: s.demo,
    settings: {
      language: 'English',
      autoCopilot: true,
      ...JSON.parse(s.settings),
    },
  };
}
export function permit(user: User, roles: Role[]) {
  if (!roles.includes(user.role))
    reject(403, 'Your role cannot perform this action.');
}
export async function rateLimit(key: string, limit = 25) {
  const now = Date.now();
  await execute(
    'INSERT INTO cop_attempts(id,count,until_at) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET count=CASE WHEN cop_attempts.until_at<? THEN 1 ELSE cop_attempts.count+1 END,until_at=CASE WHEN cop_attempts.until_at<? THEN excluded.until_at ELSE cop_attempts.until_at END',
    key,
    now + 900000,
    now,
    now,
  );
  const r = await first('SELECT count FROM cop_attempts WHERE id=?', key);
  if (Number(r.count) > limit)
    reject(429, 'Too many requests. Please try again in 15 minutes.');
}
async function makeSession(userId: string, req: Request) {
  const raw = uid() + uid();
  await execute(
    'INSERT INTO cop_sessions(id,user_id,expires,last_seen) VALUES(?,?,?,?)',
    await hash(raw),
    userId,
    Date.now() + 8 * 60 * 60 * 1000,
    Date.now(),
  );
  return `sme_session=${raw}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${new URL(req.url).protocol === 'https:' ? '; Secure' : ''}`;
}
export async function authenticate(req: Request) {
  sameOrigin(req);
  const b = (await req.json()) as Record<string, string>;
  if (b.action === 'logout') {
    const raw = token(req);
    if (raw)
      await execute('DELETE FROM cop_sessions WHERE id=?', await hash(raw));
    return Response.json(
      { ok: true },
      {
        headers: {
          'Set-Cookie':
            'sme_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0',
        },
      },
    );
  }
  if (b.action === 'demo-role') {
    const u = await currentUser(req);
    if (!u.demo || !['Admin', 'Consultant', 'Supervisor'].includes(b.role))
      reject(403, 'Role switching is limited to isolated demo workspaces.');
    const other = await first(
      'SELECT id FROM cop_users WHERE tenant_id=? AND role=? AND active=1 ORDER BY name',
      u.tenant_id,
      b.role,
    );
    return Response.json(
      { ok: true },
      { headers: { 'Set-Cookie': await makeSession(other.id, req) } },
    );
  }
  await rateLimit(
    'auth:' +
      (await hash(
        (req.headers.get('cf-connecting-ip') || 'local') + ':' + b.action,
      )),
    b.action === 'demo' ? 12 : 25,
  );
  if (b.action === 'demo') {
    const result = await seedDemo();
    return Response.json(
      { ok: true },
      { headers: { 'Set-Cookie': await makeSession(result.userId, req) } },
    );
  }
  const email = String(b.email || '')
    .trim()
    .toLowerCase();
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254 ||
    !b.password ||
    b.password.length < 12 ||
    b.password.length > 128
  )
    reject(400, 'Use a valid email and a password of 12–128 characters.');
  if (b.action === 'register') {
    if (
      !b.name?.trim() ||
      !b.organization?.trim() ||
      b.name.length > 100 ||
      b.organization.length > 150
    )
      reject(400, 'Your name and organization are required.');
    if (await first('SELECT id FROM cop_users WHERE email=?', email))
      reject(409, 'This email is already registered.');
    const tenant = uid(),
      userId = uid();
    await transaction([
      {
        sql: 'INSERT INTO cop_tenants(id,name,demo,created) VALUES(?,?,0,?)',
        params: [tenant, b.organization, timestamp()],
      },
      {
        sql: 'INSERT INTO cop_users(id,tenant_id,name,email,password,role,settings) VALUES(?,?,?,?,?,?,?)',
        params: [
          userId,
          tenant,
          b.name,
          email,
          await passwordHash(b.password),
          'Admin',
          JSON.stringify({ language: 'English', autoCopilot: true }),
        ],
      },
    ]);
    await audit(
      { id: userId, tenant_id: tenant, name: b.name },
      'Created helpline workspace',
    );
    return Response.json(
      { ok: true },
      { headers: { 'Set-Cookie': await makeSession(userId, req) } },
    );
  }
  if (b.action === 'login') {
    const user = await first(
      'SELECT * FROM cop_users WHERE email=? AND active=1',
      email,
    );
    const valid =
      user &&
      user.password !== 'disabled' &&
      safeEqual(
        await passwordHash(b.password, user.password.split(':')[0]),
        user.password,
      );
    if (!valid) reject(401, 'Email or password is incorrect.');
    await audit(user, 'Signed in');
    return Response.json(
      { ok: true },
      { headers: { 'Set-Cookie': await makeSession(user.id, req) } },
    );
  }
  reject(400, 'Unknown authentication action.');
}
