import { z } from 'zod';
import {
  authenticate,
  currentUser,
  permit,
  passwordHash,
  rateLimit,
} from './auth';
import {
  sameOrigin,
  ApiError,
  rows,
  first,
  execute,
  transaction,
  uid,
  reject,
  audit,
  timestamp,
  event,
} from './repository';
import {
  access,
  workspace,
  listConsultations,
  detail,
  createConsultation,
  startConsultation,
  endConsultation,
  saveSummary,
  saveNotes,
  generatedNotes,
  feedback,
  ingestSegment,
  simulateTick,
  generateSuggestion,
} from './service';
import {
  HybridKnowledgeService,
  speechToken,
  DeepgramTranscriptionService,
} from './providers';
import { upload, approveDocument, download } from './knowledge';
import { SentenceQuestionDetector } from './engine';
import { sarvamRelay } from './speech-relay';
import type { User, Language } from './types';
const language = z.enum(['Auto', 'English', 'Hindi', 'Marathi']);
const text = z.string().trim().min(1).max(6000);
function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
async function stream(req: Request, user: User, id: string) {
  await access(user, id);
  const url = new URL(req.url);
  let cursor = Number(
    req.headers.get('last-event-id') || url.searchParams.get('cursor') || 0,
  );
  if (!Number.isSafeInteger(cursor) || cursor < 0) cursor = 0;
  const began = Date.now(),
    encoder = new TextEncoder();
  let closed = false;
  return new Response(
    new ReadableStream({
      async start(controller) {
        const send = (s: string) => {
          if (!closed) controller.enqueue(encoder.encode(s));
        };
        try {
          send('retry: 1500\n\n');
          let checked = Date.now();
          while (!closed && !req.signal.aborted && Date.now() - began < 55000) {
            if (Date.now() - checked > 12000) {
              const current = await currentUser(req);
              await access(current, id);
              checked = Date.now();
              send(': heartbeat\n\n');
            }
            const events = await rows(
              'SELECT seq,type,data,timestamp FROM cop_events WHERE tenant_id=? AND consultation_id=? AND seq>? ORDER BY seq LIMIT 200',
              user.tenant_id,
              id,
              cursor,
            );
            for (const e of events) {
              cursor = Number(e.seq);
              send(`id: ${e.seq}\nevent: ${e.type}\ndata: ${e.data}\n\n`);
            }
            await new Promise((resolve) => setTimeout(resolve, 800));
          }
          if (!closed) {
            closed = true;
            controller.close();
          }
        } catch {
          if (!closed) {
            send(
              'event: connection.error\ndata: {"message":"Please reconnect or sign in again."}\n\n',
            );
            closed = true;
            controller.close();
          }
        }
      },
      cancel() {
        closed = true;
      },
    }),
    {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    },
  );
}
export async function handle(req: Request) {
  try {
    const url = new URL(req.url),
      path = url.pathname
        .replace(/^\/api\/(?:copilot\/)?/, '')
        .split('/')
        .filter(Boolean),
      method = req.method;
    if (method === 'POST') sameOrigin(req);
    if (path[0] === 'auth' && method === 'POST') return await authenticate(req);
    const user = await currentUser(req);
    if (method === 'POST') {
      await rateLimit('write:' + user.id, 1500);
      if (Number(req.headers.get('content-length') || 0) > 11 * 1024 * 1024)
        reject(413, 'Request exceeds the size limit.');
    }
    if (path[0] === 'workspace' && method === 'GET')
      return json(await workspace(user));
    if (path[0] === 'consultations') {
      const id = path[1],
        action = path[2];
      if (!id)
        return method === 'GET'
          ? json(await listConsultations(user))
          : json(
              await createConsultation(
                user,
                z
                  .object({
                    scenario: z.enum([
                      'schemes',
                      'loans',
                      'gst',
                      'expansion',
                      'exports',
                      'marketing',
                    ]),
                    client: z.string().max(150).optional(),
                    company: z.string().max(200).optional(),
                    consultant_id: z.string().optional(),
                    client_id: z.string().optional(),
                    start: z.string().optional(),
                    end: z.string().optional(),
                    language: language.optional(),
                    demo: z.boolean().optional(),
                    industry: z.string().max(100).optional(),
                    location: z.string().max(100).optional(),
                    email: z.string().max(254).optional(),
                    phone: z.string().max(30).optional(),
                  })
                  .parse(await req.json()),
              ),
            );
      if (method === 'GET') {
        if (action === 'events') return await stream(req, user, id);
        return json(await detail(user, id));
      }
      if (action === 'start') {
        const b = (await req.json()) as Record<string, any>;
        return json(await startConsultation(user, id, b.consent === true));
      }
      if (action === 'end') return json(await endConsultation(user, id));
      if (action === 'summary') {
        const b = z
          .object({ summary: z.string().max(50000) })
          .parse(await req.json());
        return json(await saveSummary(user, id, b.summary));
      }
      if (action === 'notes') {
        const b = z
          .object({
            text: z.string().max(50000).optional(),
            generate: z.boolean().optional(),
          })
          .parse(await req.json());
        return json(
          b.generate
            ? await generatedNotes(user, id)
            : await saveNotes(user, id, b.text || ''),
        );
      }
      if (action === 'simulate') {
        const b = (await req.json()) as Record<string, any>;
        return json(
          await simulateTick(
            user,
            id,
            language.parse(b.language || user.settings.language),
            b.generate !== false,
          ),
        );
      }
      if (action === 'followups') {
        await access(user, id, true);
        const b = z
          .object({
            text,
            due: z.string().max(10).default(''),
            status: z
              .enum(['Planned', 'Asked', 'Completed'])
              .default('Planned'),
          })
          .parse(await req.json());
        const fid = uid();
        await execute(
          'INSERT INTO cop_followups(id,tenant_id,consultation_id,text,status,due) VALUES(?,?,?,?,?,?)',
          fid,
          user.tenant_id,
          id,
          b.text,
          b.status,
          b.due,
        );
        await audit(user, 'Saved follow-up', id);
        return json({ id: fid, ...b });
      }
      if (action === 'cancel') {
        permit(user, ['Admin']);
        const c = await access(user, id, true);
        if (!['Upcoming', 'Waiting'].includes(c.status))
          reject(409, 'Only scheduled consultations can be cancelled.');
        await execute(
          'UPDATE cop_consultations SET status=? WHERE id=?',
          'Cancelled',
          id,
        );
        await audit(user, 'Cancelled consultation', id);
        return json({ ok: true });
      }
    }
    if (path[0] === 'transcription' && method === 'POST') {
      if (req.headers.get('content-type')?.includes('multipart/form-data')) {
        const form = await req.formData(),
          id = String(form.get('consultation_id') || ''),
          file = form.get('audio');
        const c = await access(user, id, true);
        if (c.status !== 'Live') reject(409, 'The consultation is not live.');
        if (!(file instanceof File) || file.size > 5 * 1024 * 1024)
          reject(400, 'Send an audio segment smaller than 5 MB.');
        const result = await new DeepgramTranscriptionService().transcribe(
          file,
          language.parse(form.get('language') || 'Auto'),
        );
        return json(result);
      }
      const b = z
        .object({
          consultation_id: z.string(),
          text,
          speaker: z.enum(['Client', 'Consultant']),
          external_id: z.string().min(1).max(200),
          language: z.string().max(50).optional(),
          confidence: z.number().min(0).max(1).optional(),
          generate: z.boolean().optional(),
          response_language: language.optional(),
        })
        .parse(await req.json());
      return json(await ingestSegment(user, b.consultation_id, b));
    }
    if (path[0] === 'speech' && path[1] === 'stream' && method === 'GET')
      return await sarvamRelay(req, user);
    if (path[0] === 'speech' && method === 'POST') {
      const b = z
        .object({ consultation_id: z.string(), language })
        .parse(await req.json());
      const c = await access(user, b.consultation_id, true);
      if (c.status !== 'Live')
        reject(409, 'Start the consultation before enabling speech.');
      await rateLimit('speech:' + user.id, 100);
      return json(await speechToken(b.language, b.consultation_id));
    }
    if (path[0] === 'ai' && method === 'POST') {
      const b = (await req.json()) as Record<string, any>;
      if (path[1] === 'feedback')
        return json(
          await feedback(
            user,
            text.parse(b.suggestion_id),
            text.parse(b.value),
          ),
        );
      if (path[1] === 'question') {
        await access(user, text.parse(b.consultation_id));
        return json(
          new SentenceQuestionDetector().detect(
            text.parse(b.text),
            b.speaker || 'Client',
          ),
        );
      }
      if (path[1] === 'suggestion')
        return json(
          await generateSuggestion(
            user,
            text.parse(b.consultation_id),
            text.parse(b.question),
            language.parse(b.language || user.settings.language),
          ),
        );
    }
    if (path[0] === 'knowledge') {
      if (path[1] === 'search') {
        const q = url.searchParams.get('q') || '';
        if (q.length < 2 || q.length > 1000) return json([]);
        await audit(user, 'Searched knowledge', q);
        return json(
          await new HybridKnowledgeService().search(user.tenant_id, q, 10),
        );
      }
      if (path[1] === 'upload' && method === 'POST')
        return json(await upload(user, req));
      if (path[2] === 'download' && method === 'GET')
        return await download(user, path[1]);
      if (path[2] === 'status' && method === 'POST') {
        const b = (await req.json()) as Record<string, any>;
        return json(await approveDocument(user, path[1], b.status));
      }
    }
    if (path[0] === 'categories' && method === 'POST') {
      permit(user, ['Admin']);
      const b = z
        .object({ name: z.string().trim().min(2).max(100) })
        .parse(await req.json());
      await execute(
        'INSERT INTO cop_categories(id,tenant_id,name) VALUES(?,?,?) ON CONFLICT(tenant_id,name) DO NOTHING',
        uid(),
        user.tenant_id,
        b.name,
      );
      await audit(user, 'Added knowledge category: ' + b.name);
      return json({ ok: true });
    }
    if (path[0] === 'settings' && method === 'POST') {
      const b = z
        .object({ language, autoCopilot: z.boolean() })
        .parse(await req.json());
      await execute(
        'UPDATE cop_users SET settings=? WHERE id=?',
        JSON.stringify(b),
        user.id,
      );
      await audit(user, 'Updated copilot preferences');
      return json({ ok: true });
    }
    if (path[0] === 'consultants' && method === 'POST') {
      permit(user, ['Admin']);
      const b = (await req.json()) as Record<string, any>;
      if (b.action === 'update') {
        const validated = z
          .object({
            id: z.string(),
            name: z.string().trim().min(2).max(100),
            specialty: z.string().max(150),
            languages: z.string().max(150),
            active: z.boolean(),
          })
          .parse(b);
        const c = await first(
          'SELECT * FROM cop_consultants WHERE id=? AND tenant_id=?',
          validated.id,
          user.tenant_id,
        );
        if (!c) reject(404, 'Consultant not found.');
        if (!validated.active) {
          const live = await first(
            'SELECT id FROM cop_consultations WHERE consultant_id=? AND status=?',
            c.id,
            'Live',
          );
          if (live)
            reject(
              409,
              'End or reassign live consultations before disabling this consultant.',
            );
        }
        await transaction([
          {
            sql: 'UPDATE cop_consultants SET name=?,specialty=?,languages=?,active=? WHERE id=?',
            params: [
              validated.name,
              validated.specialty,
              validated.languages,
              validated.active ? 1 : 0,
              c.id,
            ],
          },
          {
            sql: 'UPDATE cop_users SET name=?,active=? WHERE id=?',
            params: [validated.name, validated.active ? 1 : 0, c.user_id],
          },
          ...(!validated.active
            ? [
                {
                  sql: 'DELETE FROM cop_sessions WHERE user_id=?',
                  params: [c.user_id],
                },
              ]
            : []),
        ]);
        await audit(user, 'Updated consultant profile', c.id);
        return json({ ok: true });
      }
      const v = z
        .object({
          name: z.string().trim().min(2).max(100),
          email: z.email().max(254),
          password: z.string().min(12).max(128),
          role: z
            .enum(['Admin', 'Supervisor', 'Consultant'])
            .default('Consultant'),
          specialty: z.string().max(150).default('General advisory'),
          languages: z.string().max(150).default('English'),
        })
        .parse(b);
      if (
        await first(
          'SELECT id FROM cop_users WHERE email=?',
          v.email.toLowerCase(),
        )
      )
        reject(409, 'This email is already registered.');
      const id = uid(),
        cid = uid();
      const stmts = [
        {
          sql: 'INSERT INTO cop_users(id,tenant_id,name,email,password,role,settings) VALUES(?,?,?,?,?,?,?)',
          params: [
            id,
            user.tenant_id,
            v.name,
            v.email.toLowerCase(),
            await passwordHash(v.password),
            v.role,
            JSON.stringify({ language: 'English', autoCopilot: true }),
          ],
        },
      ];
      if (v.role === 'Consultant')
        stmts.push({
          sql: 'INSERT INTO cop_consultants(id,tenant_id,user_id,name,specialty,languages) VALUES(?,?,?,?,?,?)',
          params: [cid, user.tenant_id, id, v.name, v.specialty, v.languages],
        });
      await transaction(stmts);
      await audit(user, 'Added ' + v.role.toLowerCase(), id);
      return json({ ok: true, id });
    }
    if (path[0] === 'client' && method === 'GET') {
      const client = await first(
        'SELECT id,name,company_id,email,phone FROM cop_clients WHERE id=? AND tenant_id=?',
        path[1],
        user.tenant_id,
      );
      if (!client) reject(404, 'Client not found.');
      const consultations = (await listConsultations(user)).filter(
        (c) => c.client_id === client.id,
      );
      if (user.role === 'Consultant' && !consultations.length)
        reject(403, 'You do not have access to this client.');
      return json({ ...client, consultations });
    }
    reject(404, 'Endpoint not found.');
  } catch (error) {
    if (error instanceof z.ZodError)
      return json(
        { error: error.issues[0]?.message || 'Invalid request.' },
        400,
      );
    if (error instanceof ApiError)
      return json({ error: error.message }, error.status);
    console.error(
      'Copilot request failed',
      error instanceof Error ? error.message : 'Unknown error',
    );
    return json(
      { error: 'The request could not be completed. Please try again.' },
      500,
    );
  }
}
