import { uid, timestamp, transaction, type Statement } from './repository';
import {
  demoPeople,
  demoCompanies,
  guidance,
  categories,
  conversations,
  demoPoints,
} from './demo';
import {
  scenarios,
  type Consultation,
  type KnowledgeDocument,
  type Scenario,
  type Suggestion,
  type Segment,
} from './types';
export async function seedDemo() {
  const tenant = uid(),
    users = demoPeople.map(() => uid()),
    consultants = demoPeople.map(() => uid()),
    admin = uid(),
    supervisor = uid();
  const statements: Statement[] = [];
  const add = (sql: string, ...params: unknown[]) =>
    statements.push({ sql, params });
  const now = timestamp();
  add(
    'INSERT INTO cop_tenants(id,name,demo,created) VALUES(?,?,1,?)',
    tenant,
    'MCCIA SME Helpline · Demo',
    now,
  );
  for (const [i, p] of demoPeople.entries()) {
    add(
      'INSERT INTO cop_users(id,tenant_id,name,email,password,role,settings) VALUES(?,?,?,?,?,?,?)',
      users[i],
      tenant,
      p[0],
      `${users[i]}@demo.invalid`,
      'disabled',
      'Consultant',
      JSON.stringify({ language: 'English', autoCopilot: true }),
    );
    add(
      'INSERT INTO cop_consultants(id,tenant_id,user_id,name,specialty,languages) VALUES(?,?,?,?,?,?)',
      consultants[i],
      tenant,
      users[i],
      p[0],
      p[1],
      p[2],
    );
  }
  for (const [id, name, role] of [
    [admin, 'Ananya Rao', 'Admin'],
    [supervisor, 'Mihir Joshi', 'Supervisor'],
  ])
    add(
      'INSERT INTO cop_users(id,tenant_id,name,email,password,role,settings) VALUES(?,?,?,?,?,?,?)',
      id,
      tenant,
      name,
      `${id}@demo.invalid`,
      'disabled',
      role,
      JSON.stringify({ language: 'English', autoCopilot: true }),
    );
  const companyIds = demoCompanies.map(() => uid()),
    clientIds = demoCompanies.map(() => uid());
  for (const [i, c] of demoCompanies.entries()) {
    add(
      'INSERT INTO cop_companies(id,tenant_id,name,industry,location) VALUES(?,?,?,?,?)',
      companyIds[i],
      tenant,
      c[0],
      c[1],
      c[2],
    );
    add(
      'INSERT INTO cop_clients(id,tenant_id,company_id,name,email,phone) VALUES(?,?,?,?,?,?)',
      clientIds[i],
      tenant,
      companyIds[i],
      c[3],
      `client${i}@example.invalid`,
      'Demo contact',
    );
  }
  for (const c of categories)
    add(
      'INSERT INTO cop_categories(id,tenant_id,name) VALUES(?,?,?)',
      uid(),
      tenant,
      c,
    );
  const documents: KnowledgeDocument[] = [];
  const suffixes = [
    '',
    ' — intake guide',
    ' — client preparation',
    ' — advisor handover',
    ' — verification checklist',
    ' — conversation guide',
    ' — follow-up planning',
    ' — quality review',
    ' — reference worksheet',
  ];
  for (let i = 0; i < 50; i++) {
    const scenario = scenarios[i % 6].id,
      g = guidance[scenario],
      id = uid();
    const d: KnowledgeDocument = {
      id,
      title: g.title + suffixes[Math.floor(i / 6)],
      category: g.category,
      department: 'Helpline advisory team',
      scheme: 'Discovery guidance only',
      state: 'All states',
      industry: 'All industries',
      effective_date: now.slice(0, 10),
      source: 'Internal training library · fictional demo content',
      version: '1.0-demo',
      updated: now,
      status: 'Approved',
      content: `DEMO TRAINING DOCUMENT — This is a consultation discovery aid, not an official policy or eligibility source.\n\n${g.title}\n${g.en.join('\n')}\n\n${g.hi.join('\n')}\n\n${g.mr.join('\n')}\n\nWhat to check: ${g.check.join('; ')}\nTopics: ${g.keywords}`,
      filename: `training-${i + 1}.txt`,
      type: 'TXT',
      demo: 1,
    };
    documents.push(d);
    add(
      'INSERT INTO cop_documents(id,tenant_id,category,status,updated,data) VALUES(?,?,?,?,?,?)',
      id,
      tenant,
      d.category,
      d.status,
      now,
      JSON.stringify(d),
    );
    add(
      'INSERT INTO cop_chunks(id,tenant_id,document_id,section,content) VALUES(?,?,?,?,?)',
      id + '-1',
      tenant,
      id,
      'Discovery checklist',
      d.content,
    );
  }
  const indiaDay = new Date(Date.now() + 19800000).toISOString().slice(0, 10);
  for (let i = 0; i < 20; i++) {
    const ci = i % 10,
      scenario = scenarios[i % 6].id,
      id = uid();
    const completed = i >= 10 || i === 0 || i === 1;
    const d = new Date(indiaDay + 'T04:00:00.000Z');
    if (i >= 10) d.setUTCDate(d.getUTCDate() - Math.ceil((i - 9) / 2));
    d.setUTCMinutes((i % 10) * 45);
    const status = completed
      ? 'Completed'
      : i === 2
        ? 'Waiting'
        : i === 8
          ? 'Live'
          : i === 9
            ? 'Cancelled'
            : 'Upcoming';
    const assigned = i < 6 || (i >= 10 && i % 2 === 0) ? 0 : 1 + (i % 4);
    const row: Consultation = {
      id,
      client_id: clientIds[ci],
      company_id: companyIds[ci],
      consultant_id: consultants[assigned],
      client: demoCompanies[ci][3],
      company: demoCompanies[ci][0],
      topic: scenarios.find((s) => s.id === scenario)!.title,
      scenario,
      start: d.toISOString(),
      end: new Date(d.getTime() + 1800000).toISOString(),
      status,
      language: 'Auto',
      demo: 1,
      profile: {
        company: demoCompanies[ci][0],
        industry: demoCompanies[ci][1],
        location: demoCompanies[ci][2],
      },
      ...(completed
        ? {
            duration: 1500 + (i % 4) * 180,
            started_at: d.toISOString(),
            ended_at: new Date(d.getTime() + 1800000).toISOString(),
            summary: `Client: ${demoCompanies[ci][3]}\nCompany: ${demoCompanies[ci][0]}\nPrimary problem: ${scenarios.find((s) => s.id === scenario)!.title}\n\nDiscussion: Completed the discovery checklist with the client.\nRecommendations: ${guidance[scenario].en.join(' ')}\nDocuments required: To be confirmed.\nAction items: Verify approved sources and arrange a follow-up.\nImportant risks: Demo guidance only; eligibility and scheme terms have not been verified.`,
          }
        : status === 'Live'
          ? { started_at: now }
          : {}),
    };
    add(
      'INSERT INTO cop_consultations(id,tenant_id,client_id,company_id,consultant_id,status,start,data) VALUES(?,?,?,?,?,?,?,?)',
      id,
      tenant,
      row.client_id,
      row.company_id,
      row.consultant_id,
      status,
      row.start,
      JSON.stringify(row),
    );
    add(
      'INSERT INTO cop_schedules(id,tenant_id,consultation_id,consultant_id,start,end_at) VALUES(?,?,?,?,?,?)',
      uid(),
      tenant,
      id,
      row.consultant_id,
      row.start,
      row.end,
    );
    add(
      'INSERT INTO cop_profiles(consultation_id,tenant_id,data) VALUES(?,?,?)',
      id,
      tenant,
      JSON.stringify(row.profile),
    );
    add(
      'INSERT INTO cop_transcripts(id,consultation_id,tenant_id,created) VALUES(?,?,?,?)',
      uid(),
      id,
      tenant,
      now,
    );
    if (completed) {
      for (const [j, line] of conversations[scenario].entries()) {
        const seg: Segment = {
          id: uid(),
          consultation_id: id,
          speaker: line.speaker,
          text: line.text,
          language: line.language,
          confidence: 0.97,
          timestamp: new Date(d.getTime() + j * 18000).toISOString(),
          sequence: j,
          external_id: `seed-${j}`,
        };
        add(
          'INSERT INTO cop_segments(id,consultation_id,tenant_id,external_id,sequence,data) VALUES(?,?,?,?,?,?)',
          seg.id,
          id,
          tenant,
          seg.external_id,
          j,
          JSON.stringify(seg),
        );
      }
      const doc = documents[i % 6],
        sug: Suggestion = {
          id: uid(),
          consultation_id: id,
          question: conversations[scenario][0].text,
          short_answer: demoPoints(scenario, 'English')[0],
          key_points: demoPoints(scenario, 'English'),
          what_to_check: guidance[scenario].check,
          sources: [
            {
              id: doc.id + '-1',
              document_id: doc.id,
              title: doc.title,
              section: 'Discovery checklist',
              updated: now,
              excerpt: doc.content,
              source: doc.source,
              score: 0.8,
            },
          ],
          confidence: 'Medium',
          followups: guidance[scenario].followups,
          type: 'answer',
          timestamp: d.toISOString(),
          latency_ms: 750 + (i % 5) * 120,
          language: 'English',
        };
      add(
        'INSERT INTO cop_suggestions(id,consultation_id,tenant_id,cache_key,data) VALUES(?,?,?,?,?)',
        sug.id,
        id,
        tenant,
        'seed-' + i,
        JSON.stringify(sug),
      );
      add(
        'INSERT INTO cop_feedback(id,tenant_id,suggestion_id,consultation_id,user_id,value,created) VALUES(?,?,?,?,?,?,?)',
        uid(),
        tenant,
        sug.id,
        id,
        users[assigned],
        i === 12 ? 'Needs Verification' : i === 15 ? 'Not Helpful' : 'Helpful',
        now,
      );
    }
  }
  add(
    'INSERT INTO cop_audit(id,tenant_id,user_id,actor,action,target_id,timestamp) VALUES(?,?,?,?,?,?,?)',
    uid(),
    tenant,
    users[0],
    demoPeople[0][0],
    'Created isolated demo workspace',
    null,
    now,
  );
  await transaction(statements);
  return { tenantId: tenant, userId: users[0] };
}
