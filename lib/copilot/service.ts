import { waitUntil } from 'cloudflare:workers';
import {
  rows,
  first,
  execute,
  transaction,
  uid,
  timestamp,
  reject,
  audit,
  event,
  hash,
  config,
  repository,
} from './repository';
import { permit } from './auth';
import {
  SentenceQuestionDetector,
  extractProfile,
  detectLanguage,
  normalize,
  buildNotes,
  ABSTENTION,
} from './engine';
import { HybridKnowledgeService, GroundedAIService } from './providers';
import { conversations } from './demo';
import {
  scenarios,
  type Consultation,
  type ConsultationDetail,
  type User,
  type Segment,
  type Suggestion,
  type Language,
  type Scenario,
  type Profile,
  type Alert,
} from './types';
export const parseConsultation = (r: any): Consultation => ({
  ...JSON.parse(r.data),
  id: r.id,
  status: r.status,
  consultant_id: r.consultant_id,
  start: r.start,
});
export async function access(user: User, id: string, write = false) {
  const r = await first(
    'SELECT c.*,p.user_id AS assignee FROM cop_consultations c JOIN cop_consultants p ON p.id=c.consultant_id WHERE c.id=? AND c.tenant_id=?',
    id,
    user.tenant_id,
  );
  if (!r) reject(404, 'Consultation not found.');
  if (user.role === 'Consultant' && r.assignee !== user.id)
    reject(403, 'This consultation is assigned to another consultant.');
  if (write && user.role === 'Supervisor')
    reject(403, 'Supervisors have read-only consultation access.');
  return r;
}
export async function listConsultations(user: User) {
  const rs = await rows(
    `SELECT c.* FROM cop_consultations c JOIN cop_consultants p ON p.id=c.consultant_id WHERE c.tenant_id=? ${user.role === 'Consultant' ? 'AND p.user_id=?' : ''} ORDER BY c.start DESC`,
    ...(user.role === 'Consultant'
      ? [user.tenant_id, user.id]
      : [user.tenant_id]),
  );
  return rs.map(parseConsultation);
}
export async function detail(
  user: User,
  id: string,
): Promise<ConsultationDetail> {
  const r = await access(user, id);
  const [segments, suggestions, notes, profile, followups, events] =
    await Promise.all([
      rows(
        'SELECT data FROM cop_segments WHERE consultation_id=? ORDER BY sequence',
        id,
      ),
      rows(
        'SELECT s.data,f.value AS feedback FROM cop_suggestions s LEFT JOIN cop_feedback f ON f.suggestion_id=s.id AND f.user_id=? WHERE s.consultation_id=? ORDER BY s.id',
        user.id,
        id,
      ),
      first('SELECT text FROM cop_notes WHERE consultation_id=?', id),
      first('SELECT data FROM cop_profiles WHERE consultation_id=?', id),
      rows(
        'SELECT id,text,status,due FROM cop_followups WHERE consultation_id=?',
        id,
      ),
      rows(
        'SELECT data FROM cop_events WHERE consultation_id=? AND type=? ORDER BY seq',
        id,
        'alert.created',
      ),
    ]);
  return {
    ...parseConsultation(r),
    transcript: segments.map((s) => JSON.parse(s.data)),
    suggestions: suggestions
      .map((s) => ({ ...JSON.parse(s.data), feedback: s.feedback }))
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
    notes: notes?.text || '',
    profile: profile ? JSON.parse(profile.data) : {},
    followups,
    alerts: events.map((e) => JSON.parse(e.data)),
  };
}
export async function workspace(user: User) {
  const consultations = await listConsultations(user),
    ids = new Set(consultations.map((c) => c.id));
  const [
    consultants,
    companies,
    clients,
    docs,
    cats,
    suggestions,
    feedback,
    activity,
  ] = await Promise.all([
    rows(
      'SELECT id,user_id,name,specialty,languages,active FROM cop_consultants WHERE tenant_id=? ORDER BY name',
      user.tenant_id,
    ),
    rows(
      'SELECT id,name,industry,location FROM cop_companies WHERE tenant_id=?',
      user.tenant_id,
    ),
    rows(
      'SELECT id,name,company_id,email,phone FROM cop_clients WHERE tenant_id=?',
      user.tenant_id,
    ),
    rows(
      'SELECT data FROM cop_documents WHERE tenant_id=? AND (?=1 OR status=?) ORDER BY updated DESC',
      user.tenant_id,
      user.role === 'Admin' ? 1 : 0,
      'Approved',
    ),
    rows(
      'SELECT name FROM cop_categories WHERE tenant_id=? ORDER BY name',
      user.tenant_id,
    ),
    rows(
      'SELECT consultation_id,data FROM cop_suggestions WHERE tenant_id=?',
      user.tenant_id,
    ),
    rows(
      'SELECT consultation_id,suggestion_id,value FROM cop_feedback WHERE tenant_id=?',
      user.tenant_id,
    ),
    user.role === 'Consultant'
      ? rows(
          'SELECT actor,action,timestamp FROM cop_audit WHERE tenant_id=? AND user_id=? ORDER BY timestamp DESC LIMIT 12',
          user.tenant_id,
          user.id,
        )
      : rows(
          'SELECT actor,action,timestamp FROM cop_audit WHERE tenant_id=? ORDER BY timestamp DESC LIMIT 20',
          user.tenant_id,
        ),
  ]);
  const ss = suggestions
      .filter((s) => ids.has(s.consultation_id))
      .map((s) => JSON.parse(s.data) as Suggestion),
    ff = feedback.filter((f) => ids.has(f.consultation_id));
  const languageSegments = await rows(
    'SELECT consultation_id,data FROM cop_segments WHERE tenant_id=?',
    user.tenant_id,
  );
  const languageCounts = new Map<string, number>();
  for (const row of languageSegments) {
    if (!ids.has(row.consultation_id)) continue;
    const language = JSON.parse(row.data).language || 'Unspecified';
    languageCounts.set(language, (languageCounts.get(language) || 0) + 1);
  }
  const language_usage = [...languageCounts]
    .map(([language, count]) => ({ language, count }))
    .sort((a, b) => b.count - a.count);
  const searches = await rows(
    'SELECT target_id AS topic,COUNT(*) AS count FROM cop_audit WHERE tenant_id=? AND action=? AND (?=1 OR user_id=?) GROUP BY target_id ORDER BY count DESC LIMIT 6',
    user.tenant_id,
    'Searched knowledge',
    user.role === 'Consultant' ? 0 : 1,
    user.id,
  );
  return {
    user,
    language_usage,
    searches,
    consultants,
    companies: companies.filter(
      (c) =>
        user.role !== 'Consultant' ||
        consultations.some((x) => x.company_id === c.id),
    ),
    clients: clients.filter(
      (c) =>
        user.role !== 'Consultant' ||
        consultations.some((x) => x.client_id === c.id),
    ),
    consultations,
    knowledge: docs.map((d) => JSON.parse(d.data)),
    categories: cats.map((c) => c.name),
    metrics: {
      suggestions: ss.length,
      accepted: ff.filter((f) => f.value === 'Helpful').length,
      rejected: ff.filter((f) => f.value === 'Not Helpful').length,
      incorrect: ff.filter((f) => f.value === 'Incorrect').length,
      verification: ff.filter((f) => f.value === 'Needs Verification').length,
      feedback: ff.length,
      latency: ss.length
        ? Math.round(ss.reduce((n, s) => n + s.latency_ms, 0) / ss.length)
        : 0,
      retrieval_rate: ss.length
        ? Math.round(
            (100 * ss.filter((s) => s.sources.length).length) / ss.length,
          )
        : 0,
    },
    gaps: ff
      .filter((f) => f.value !== 'Helpful')
      .map((f) => ({
        question:
          ss.find((s) => s.id === f.suggestion_id)?.question ||
          'Question unavailable',
        feedback: f.value,
        count: 1,
      })),
    activity,
    providers: {
      ai: !!config('LLM_API_KEY'),
      stt: !!config('STT_API_KEY'),
      stt_provider: config('STT_PROVIDER') || 'deepgram',
      embedding: !!(config('EMBEDDING_API_KEY') || config('LLM_API_KEY')),
      database: repository().kind,
    },
  };
}
export async function createConsultation(user: User, b: any) {
  permit(user, ['Admin', 'Consultant']);
  const scenario = scenarios.find((s) => s.id === b.scenario);
  if (!scenario) reject(400, 'Choose a consultation topic.');
  const c = await first(
    'SELECT * FROM cop_consultants WHERE tenant_id=? AND active=1 AND ' +
      (user.role === 'Consultant' ? 'user_id=?' : 'id=?'),
    user.tenant_id,
    user.role === 'Consultant' ? user.id : b.consultant_id,
  );
  if (!c) reject(400, 'Select an active consultant.');
  const demo = Boolean(b.demo);
  if (demo && !user.demo)
    reject(
      403,
      'Start a separate demo workspace to use simulated client data.',
    );
  if (!demo && (!b.client?.trim() || !b.company?.trim()))
    reject(400, 'Client and company names are required.');
  const start = b.start ? new Date(b.start) : new Date(),
    end = b.end ? new Date(b.end) : new Date(start.getTime() + 1800000);
  if (
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(end.getTime()) ||
    end <= start ||
    end.getTime() - start.getTime() > 4 * 60 * 60 * 1000
  )
    reject(400, 'Choose a valid consultation time of up to four hours.');
  if (!demo) {
    const overlap = await first(
      'SELECT c.id FROM cop_schedules s JOIN cop_consultations c ON c.id=s.consultation_id WHERE s.tenant_id=? AND s.consultant_id=? AND s.start<? AND s.end_at>? AND c.status IN (?,?,?)',
      user.tenant_id,
      c.id,
      end.toISOString(),
      start.toISOString(),
      'Upcoming',
      'Waiting',
      'Live',
    );
    if (overlap)
      reject(
        409,
        'This consultant already has a consultation during that time.',
      );
  }
  let clientId = uid(),
    companyId = uid();
  const existing = b.client_id
    ? await first(
        'SELECT c.id,c.company_id,c.name,p.name AS company,p.industry,p.location FROM cop_clients c JOIN cop_companies p ON p.id=c.company_id WHERE c.id=? AND c.tenant_id=?',
        b.client_id,
        user.tenant_id,
      )
    : null;
  if (b.client_id && !existing) reject(404, 'Client not found.');
  if (existing && user.role === 'Consultant') {
    const assigned = await first(
      'SELECT c.id FROM cop_consultations c JOIN cop_consultants p ON p.id=c.consultant_id WHERE c.tenant_id=? AND c.client_id=? AND p.user_id=?',
      user.tenant_id,
      existing.id,
      user.id,
    );
    if (!assigned) reject(403, 'You do not have access to this client.');
  }
  if (existing) {
    clientId = existing.id;
    companyId = existing.company_id;
  }
  const row: Consultation = {
    id: uid(),
    client_id: clientId,
    company_id: companyId,
    consultant_id: c.id,
    client: existing?.name || b.client || 'Rahul Patil',
    company: existing?.company || b.company || 'Pragati Precision Pvt. Ltd.',
    topic: scenario.title,
    scenario: scenario.id,
    start: start.toISOString(),
    end: end.toISOString(),
    status: 'Upcoming',
    language: b.language || 'Auto',
    demo: demo ? 1 : 0,
    profile: {
      industry: existing?.industry || b.industry || '',
      location: existing?.location || b.location || '',
    },
  };
  const stmts = [];
  if (!existing) {
    stmts.push(
      {
        sql: 'INSERT INTO cop_companies(id,tenant_id,name,industry,location) VALUES(?,?,?,?,?)',
        params: [
          companyId,
          user.tenant_id,
          row.company,
          row.profile.industry || '',
          row.profile.location || '',
        ],
      },
      {
        sql: 'INSERT INTO cop_clients(id,tenant_id,company_id,name,email,phone) VALUES(?,?,?,?,?,?)',
        params: [
          clientId,
          user.tenant_id,
          companyId,
          row.client,
          b.email || '',
          b.phone || '',
        ],
      },
    );
  }
  stmts.push(
    {
      sql: 'INSERT INTO cop_consultations(id,tenant_id,client_id,company_id,consultant_id,status,start,data) VALUES(?,?,?,?,?,?,?,?)',
      params: [
        row.id,
        user.tenant_id,
        clientId,
        companyId,
        c.id,
        row.status,
        row.start,
        JSON.stringify(row),
      ],
    },
    {
      sql: 'INSERT INTO cop_schedules(id,tenant_id,consultation_id,consultant_id,start,end_at) VALUES(?,?,?,?,?,?)',
      params: [uid(), user.tenant_id, row.id, c.id, row.start, row.end],
    },
    {
      sql: 'INSERT INTO cop_transcripts(id,consultation_id,tenant_id,created) VALUES(?,?,?,?)',
      params: [uid(), row.id, user.tenant_id, timestamp()],
    },
    {
      sql: 'INSERT INTO cop_profiles(consultation_id,tenant_id,data) VALUES(?,?,?)',
      params: [row.id, user.tenant_id, JSON.stringify(row.profile)],
    },
  );
  await transaction(stmts);
  await audit(user, 'Scheduled consultation', row.id);
  return row;
}
export async function startConsultation(
  user: User,
  id: string,
  consent: boolean,
) {
  const r = await access(user, id, true),
    c = parseConsultation(r);
  if (c.status === 'Live') return c;
  if (!['Upcoming', 'Waiting'].includes(c.status))
    reject(409, 'Only upcoming or waiting consultations can start.');
  if (!c.demo && !consent)
    reject(400, 'Confirm participant consent before starting transcription.');
  const updated = { ...c, status: 'Live', started_at: timestamp(), consent };
  const changed = await execute(
    'UPDATE cop_consultations SET status=?,data=? WHERE id=? AND status IN (?,?)',
    'Live',
    JSON.stringify(updated),
    id,
    'Upcoming',
    'Waiting',
  );
  if (!changed)
    reject(409, 'The consultation state changed. Refresh and try again.');
  await event(user.tenant_id, id, 'consultation.started', updated);
  await audit(user, 'Started consultation', id);
  return updated;
}
export async function generateSuggestion(
  user: User,
  id: string,
  question: string,
  language: Language,
) {
  await access(user, id, true);
  let claimKey = '';
  try {
    const c = await detail(user, id);
    if (c.status !== 'Live') return null;
    const began = Date.now();
    const revision = await first(
      'SELECT MAX(updated) AS updated FROM cop_documents WHERE tenant_id=?',
      user.tenant_id,
    );
    const key = await hash(
      JSON.stringify({
        tenant: user.tenant_id,
        consultation: id,
        q: normalize(question),
        language,
        profile: c.profile,
        revision: revision?.updated,
      }),
    );
    const cached = await first(
      'SELECT data FROM cop_suggestions WHERE tenant_id=? AND consultation_id=? AND cache_key=?',
      user.tenant_id,
      id,
      key,
    );
    if (cached) {
      const answer = { ...JSON.parse(cached.data), cached: true };
      await event(user.tenant_id, id, 'ai.answer', answer);
      return answer;
    }
    const claimed = await execute(
      'INSERT INTO cop_ai_claims(id,expires) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET expires=excluded.expires WHERE cop_ai_claims.expires<?',
      key,
      Date.now() + 90000,
      Date.now(),
    );
    if (!claimed) return null;
    claimKey = key;
    await event(user.tenant_id, id, 'question.detected', { question });
    await event(user.tenant_id, id, 'ai.thinking', {
      text: 'Searching approved knowledge…',
    });
    const sources = await new HybridKnowledgeService().search(
      user.tenant_id,
      question +
        ' ' +
        c.transcript
          .slice(-2)
          .map((s) => s.text)
          .join(' '),
    );
    const result = await new GroundedAIService().generate({
      question,
      context: c.transcript,
      profile: c.profile,
      language,
      sources,
      demo: !!c.demo,
    });
    const still = await access(user, id);
    if (still.status !== 'Live') return null;
    const s: Suggestion = {
      id: uid(),
      consultation_id: id,
      question,
      short_answer: result.short_answer,
      key_points: result.key_points,
      what_to_check: result.what_to_check,
      sources: result.sources,
      confidence: result.validated ? 'Medium' : 'Unverified',
      followups: result.followups,
      type: new SentenceQuestionDetector().detect(question, 'Client').type,
      timestamp: timestamp(),
      latency_ms: Date.now() - began,
      language: language === 'Auto' ? detectLanguage(question) : language,
    };
    const inserted = await execute(
      'INSERT INTO cop_suggestions(id,consultation_id,tenant_id,cache_key,data) SELECT ?,?,?,?,? FROM cop_consultations WHERE id=? AND status=? ON CONFLICT(tenant_id,consultation_id,cache_key) DO NOTHING',
      s.id,
      id,
      user.tenant_id,
      key,
      JSON.stringify(s),
      id,
      'Live',
    );
    if (!inserted) return null;
    await event(user.tenant_id, id, 'ai.answer', s);
    await event(user.tenant_id, id, 'ai.followup', {
      suggestion_id: s.id,
      questions: s.followups,
    });
    if (!result.validated)
      await event(user.tenant_id, id, 'alert.created', {
        id: uid(),
        type: 'Verification required',
        text: ABSTENTION,
      });
    return s;
  } catch {
    await event(user.tenant_id, id, 'ai.error', {
      message:
        'AI assistance temporarily unavailable. The consultation can continue.',
    }).catch(() => {});
    return null;
  } finally {
    if (claimKey)
      await execute('DELETE FROM cop_ai_claims WHERE id=?', claimKey).catch(
        () => {},
      );
  }
}
export async function ingestSegment(
  user: User,
  id: string,
  b: {
    text: string;
    speaker: 'Client' | 'Consultant';
    external_id: string;
    language?: string;
    confidence?: number;
    generate?: boolean;
    response_language?: Language;
  },
) {
  const r = await access(user, id, true),
    c = parseConsultation(r);
  if (c.status !== 'Live')
    reject(409, 'Start the consultation before adding transcript segments.');
  if (
    !b.text?.trim() ||
    b.text.length > 6000 ||
    !['Client', 'Consultant'].includes(b.speaker) ||
    !b.external_id ||
    b.external_id.length > 200
  )
    reject(400, 'Invalid transcript segment.');
  const existing = await first(
    'SELECT data FROM cop_segments WHERE consultation_id=? AND external_id=?',
    id,
    b.external_id,
  );
  if (existing) return { segment: JSON.parse(existing.data), duplicate: true };
  const seg: Segment = {
    id: uid(),
    consultation_id: id,
    speaker: b.speaker,
    text: b.text.trim(),
    timestamp: timestamp(),
    language: b.language || detectLanguage(b.text),
    confidence: Math.max(0, Math.min(1, b.confidence ?? 0.95)),
    sequence: Date.now(),
    external_id: b.external_id,
  };
  const inserted = await execute(
    'INSERT INTO cop_segments(id,consultation_id,tenant_id,external_id,sequence,data) SELECT ?,?,?,?,?,? FROM cop_consultations WHERE id=? AND status=? ON CONFLICT(consultation_id,external_id) DO NOTHING',
    seg.id,
    id,
    user.tenant_id,
    seg.external_id,
    seg.sequence,
    JSON.stringify(seg),
    id,
    'Live',
  );
  if (!inserted) return { duplicate: true };
  await event(user.tenant_id, id, 'transcript.final', seg);
  const prev = await first(
    'SELECT data FROM cop_profiles WHERE consultation_id=?',
    id,
  );
  const profile =
    b.speaker === 'Client'
      ? extractProfile(b.text, prev ? JSON.parse(prev.data) : c.profile)
      : prev
        ? JSON.parse(prev.data)
        : c.profile;
  if (b.speaker === 'Client' && !profile.problem) profile.problem = b.text;
  await execute(
    'INSERT INTO cop_profiles(consultation_id,tenant_id,data) VALUES(?,?,?) ON CONFLICT(consultation_id) DO UPDATE SET data=excluded.data',
    id,
    user.tenant_id,
    JSON.stringify(profile),
  );
  await event(user.tenant_id, id, 'client.profile.updated', profile);
  if (b.speaker === 'Client' && /\d+\s*%/.test(b.text))
    await event(user.tenant_id, id, 'alert.created', {
      id: uid(),
      type: 'Verification required',
      text: 'A percentage was mentioned. Verify it against a current approved source before advising.',
    });
  if (b.speaker === 'Client' && /loan|funding|कर्ज|लोन/i.test(b.text))
    await event(user.tenant_id, id, 'alert.created', {
      id: uid(),
      type: 'Opportunity',
      text: 'Clarify the financing purpose, amount and available records.',
    });
  if (
    b.speaker === 'Client' &&
    /subsidy|scheme|अनुदान|योजना/i.test(b.text) &&
    !profile.investment
  )
    await event(user.tenant_id, id, 'alert.created', {
      id: uid(),
      type: 'Missing information',
      text: 'The investment amount has not been established.',
    });
  if (
    b.generate !== false &&
    new SentenceQuestionDetector().detect(b.text, b.speaker).meaningful
  )
    waitUntil(
      generateSuggestion(
        user,
        id,
        b.text,
        b.response_language || user.settings.language,
      ).catch(() => {}),
    );
  return { segment: seg, profile };
}
export async function simulateTick(
  user: User,
  id: string,
  language: Language,
  generate = true,
) {
  const r = await access(user, id, true),
    c = parseConsultation(r);
  if (!c.demo || !user.demo)
    reject(403, 'Simulation is restricted to demo consultations.');
  if (c.status !== 'Live') reject(409, 'The consultation is not live.');
  const cursor = Number(r.simulation_cursor),
    script = conversations[c.scenario];
  if (cursor >= script.length) return { done: true };
  if (Number(r.simulation_lease) > Date.now()) return { busy: true };
  const claimed = await execute(
    'UPDATE cop_consultations SET simulation_lease=? WHERE id=? AND simulation_cursor=? AND simulation_lease<?',
    Date.now() + 60000,
    id,
    cursor,
    Date.now(),
  );
  if (!claimed) return { busy: true };
  try {
    const line = script[cursor];
    await event(user.tenant_id, id, 'transcript.partial', {
      text: line.text.slice(0, Math.ceil(line.text.length * 0.55)),
      speaker: line.speaker,
    });
    const result = await ingestSegment(user, id, {
      ...line,
      external_id: `simulation-${cursor}`,
      confidence: 0.97,
      generate,
      response_language: language,
    });
    if (line.profile) {
      const prev = await first(
        'SELECT data FROM cop_profiles WHERE consultation_id=?',
        id,
      );
      const profile = { ...JSON.parse(prev.data), ...line.profile };
      await execute(
        'UPDATE cop_profiles SET data=? WHERE consultation_id=?',
        JSON.stringify(profile),
        id,
      );
      await event(user.tenant_id, id, 'client.profile.updated', profile);
    }
    await execute(
      'UPDATE cop_consultations SET simulation_cursor=simulation_cursor+1,simulation_lease=0 WHERE id=? AND simulation_cursor=?',
      id,
      cursor,
    );
    return { ...result, done: cursor + 1 >= script.length };
  } finally {
    await execute(
      'UPDATE cop_consultations SET simulation_lease=0 WHERE id=?',
      id,
    );
  }
}
export async function saveNotes(user: User, id: string, text: string) {
  await access(user, id, true);
  if (text.length > 50000) reject(400, 'Notes are too long.');
  await execute(
    'INSERT INTO cop_notes(consultation_id,tenant_id,user_id,text,updated) VALUES(?,?,?,?,?) ON CONFLICT(consultation_id) DO UPDATE SET text=excluded.text,updated=excluded.updated,user_id=excluded.user_id',
    id,
    user.tenant_id,
    user.id,
    text,
    timestamp(),
  );
  await audit(user, 'Saved consultation notes', id);
  return { ok: true };
}
export async function generatedNotes(user: User, id: string) {
  const c = await detail(user, id);
  await access(user, id, true);
  const notes = buildNotes(
    c.client,
    c.company,
    c.transcript,
    c.suggestions,
    c.profile,
  );
  await saveNotes(user, id, notes);
  return { notes };
}
export async function endConsultation(user: User, id: string) {
  await access(user, id, true);
  const closed = await execute(
    'UPDATE cop_consultations SET status=? WHERE id=? AND status=?',
    'Completed',
    id,
    'Live',
  );
  if (!closed) reject(409, 'Only a live consultation can end.');
  const c = await detail(user, id);
  const ended = timestamp(),
    duration = Math.max(
      0,
      Math.round((Date.now() - Date.parse(c.started_at || ended)) / 1000),
    );
  const summary = `Client: ${c.client}\nCompany: ${c.company}\nConsultant: ${user.name}\nDuration: ${Math.floor(duration / 60)}m ${duration % 60}s\n\nPrimary Problem\n${c.profile.problem || c.transcript.find((t) => t.speaker === 'Client')?.text || 'Not established.'}\n\nKey Discussion\n${
    c.transcript
      .filter((t) => t.speaker === 'Client')
      .map((t) => t.text)
      .join('\n') || 'No transcript recorded.'
  }\n\nAI Recommendations\n${c.suggestions.map((s) => s.short_answer).join('\n') || 'No recommendations generated.'}\n\nSchemes / Services Discussed\n${[...new Set(c.suggestions.flatMap((s) => s.sources.map((x) => x.title)))].join('\n') || 'None verified.'}\n\nDocuments Required\nTo be confirmed with the client and current approved guidance.\n\nAction Items\n${c.followups.map((f) => f.text).join('\n') || 'Verify the advice and agree the next steps.'}\n\nFollow-up\n${
    c.followups
      .filter((f) => f.due)
      .map((f) => `${f.due}: ${f.text}`)
      .join('\n') || 'Date to be agreed.'
  }\n\nImportant Risks\n${c.alerts.map((a) => a.text).join('\n') || 'Review all AI assistance before sharing advice.'}`;
  const {
    transcript: _t,
    suggestions: _s,
    alerts: _a,
    followups: _f,
    ...data
  } = c;
  const next = {
    ...data,
    status: 'Completed',
    ended_at: ended,
    duration,
    summary,
  };
  await execute(
    'UPDATE cop_consultations SET status=?,data=? WHERE id=? AND status=?',
    'Completed',
    JSON.stringify(next),
    id,
    'Completed',
  );
  await event(user.tenant_id, id, 'consultation.ended', { ...next, summary });
  await audit(user, 'Ended consultation', id);
  return { summary, duration };
}
export async function saveSummary(user: User, id: string, summary: string) {
  const r = await access(user, id, true);
  if (r.status !== 'Completed')
    reject(409, 'End the consultation before saving its summary.');
  if (!summary.trim() || summary.length > 50000)
    reject(400, 'Enter a summary of up to 50,000 characters.');
  const data = { ...JSON.parse(r.data), summary };
  await execute(
    'UPDATE cop_consultations SET data=? WHERE id=?',
    JSON.stringify(data),
    id,
  );
  await audit(user, 'Reviewed and saved consultation summary', id);
  return { ok: true };
}
export async function feedback(
  user: User,
  suggestionId: string,
  value: string,
) {
  if (
    !['Helpful', 'Not Helpful', 'Incorrect', 'Needs Verification'].includes(
      value,
    )
  )
    reject(400, 'Choose valid feedback.');
  const s = await first(
    'SELECT * FROM cop_suggestions WHERE id=? AND tenant_id=?',
    suggestionId,
    user.tenant_id,
  );
  if (!s) reject(404, 'Suggestion not found.');
  await access(user, s.consultation_id, true);
  await execute(
    'INSERT INTO cop_feedback(id,tenant_id,suggestion_id,consultation_id,user_id,value,created) VALUES(?,?,?,?,?,?,?) ON CONFLICT(suggestion_id,user_id) DO UPDATE SET value=excluded.value,created=excluded.created',
    uid(),
    user.tenant_id,
    suggestionId,
    s.consultation_id,
    user.id,
    value,
    timestamp(),
  );
  await audit(user, 'Recorded AI feedback: ' + value, suggestionId);
  return { ok: true };
}
