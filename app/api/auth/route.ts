import { z } from 'zod';
import {
  db,
  id,
  run,
  one,
  passwordHash,
  digest,
  rateLimit,
  sameOrigin,
  makeSession,
  responseError,
  fail,
  session,
} from '@/lib/server';
import { seedOrganization, roleNames } from '@/lib/seed';
const credentials = z.object({
  email: z.email().transform((x) => x.toLowerCase().trim()),
  password: z.string().min(10).max(128),
});
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const b = (await req.json()) as any;
    if (['login', 'register', 'reset', 'demo'].includes(b.action))
      await rateLimit(
        'auth:' +
          b.action +
          ':' +
          (req.headers.get('cf-connecting-ip') || 'local'),
      );
    if (b.action === 'logout') {
      const token = req.headers
        .get('cookie')
        ?.split(';')
        .map((x) => x.trim())
        .find((x) => x.startsWith('cm_session='))
        ?.slice(11);
      if (token)
        await run('DELETE FROM sessions WHERE id=?', await digest(token));
      return Response.json(
        { ok: true },
        {
          headers: {
            'Set-Cookie':
              'cm_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0',
          },
        },
      );
    }
    if (b.action === 'demo-role') {
      const u = await session(req);
      if (!u.demo || !roleNames.includes(b.role))
        fail(
          'Role switching is available only in isolated demo workspaces.',
          403,
        );
      const other = await one(
        'SELECT id FROM users WHERE organization_id=? AND role=?',
        u.organization_id,
        b.role,
      );
      return Response.json(
        { ok: true },
        { headers: { 'Set-Cookie': await makeSession(other.id, req) } },
      );
    }
    if (b.action === 'demo' || b.action === 'register') {
      const demo = b.action === 'demo';
      const input = demo
        ? { email: `${id()}@demo.invalid`, password: id() }
        : credentials.parse(b);
      if (!demo && (!b.company?.trim() || !b.name?.trim() || !b.mobile?.trim()))
        fail('Company name, contact name and mobile are required.');
      if (await one('SELECT id FROM users WHERE email=?', input.email))
        fail('This email is already registered. Please sign in.');
      const org = id(),
        uid = id(),
        recovery = id() + id();
      await db().batch([
        db()
          .prepare(
            'INSERT INTO organizations(id,name,profile,demo) VALUES(?,?,?,?)',
          )
          .bind(
            org,
            demo ? 'ABC Precision Components Pvt. Ltd.' : b.company,
            JSON.stringify(
              demo
                ? {
                    name: 'ABC Precision Components Pvt. Ltd.',
                    legal_name: 'ABC Precision Components Private Limited',
                    industry: 'Engineering Manufacturing',
                    structure: 'Private Limited',
                    state: 'Maharashtra',
                    district: 'Pune',
                    address:
                      'Plot 24, MIDC Industrial Area, Chakan, Pune 410501',
                    employees: 128,
                    male: 90,
                    female: 38,
                    contract: 24,
                    turnover: 'INR 25–50 Cr',
                    gst: 'DEMO-GST-REGISTRATION',
                    udyam: 'DEMO-UDYAM-REGISTRATION',
                  }
                : { name: b.company },
            ),
            demo ? 1 : 0,
          ),
        db()
          .prepare(
            'INSERT INTO users(id,organization_id,email,name,role,password,recovery,status,details) VALUES(?,?,?,?,?,?,?,?,?)',
          )
          .bind(
            uid,
            org,
            input.email,
            demo ? 'Aarav Deshmukh' : b.name,
            'Owner',
            await passwordHash(input.password),
            await digest(recovery),
            'Active',
            JSON.stringify({
              mobile: b.mobile || '',
              designation: b.designation || 'Owner',
            }),
          ),
      ]);
      await seedOrganization(org, uid, demo);
      return Response.json(
        { ok: true, recovery: demo ? undefined : recovery },
        { headers: { 'Set-Cookie': await makeSession(uid, req) } },
      );
    }
    if (b.action === 'reset') {
      const input = credentials.parse(b);
      const user = await one('SELECT * FROM users WHERE email=?', input.email);
      if (!user || !b.recovery || (await digest(b.recovery)) !== user.recovery)
        fail('Email or recovery code is incorrect.', 400);
      const recovery = id() + id();
      await db().batch([
        db()
          .prepare('UPDATE users SET password=?,recovery=? WHERE id=?')
          .bind(
            await passwordHash(input.password),
            await digest(recovery),
            user.id,
          ),
        db().prepare('DELETE FROM sessions WHERE user_id=?').bind(user.id),
      ]);
      return Response.json({ ok: true, recovery });
    }
    if (b.action === 'login') {
      const input = credentials.parse(b);
      const u = await one(
        'SELECT * FROM users WHERE email=? AND status=?',
        input.email,
        'Active',
      );
      if (
        !u ||
        u.password === 'disabled' ||
        (await passwordHash(input.password, u.password.split(':')[0])) !==
          u.password
      )
        fail('Email or password is incorrect.', 401);
      return Response.json(
        { ok: true },
        { headers: { 'Set-Cookie': await makeSession(u.id, req) } },
      );
    }
    fail('Unknown authentication action.');
  } catch (e) {
    if (e instanceof z.ZodError)
      return Response.json({ error: e.issues[0].message }, { status: 400 });
    return responseError(e);
  }
}
