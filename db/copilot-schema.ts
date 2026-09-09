// Generated from lib/copilot/schema.ts. Run npm run db:copilot-schema after model changes.
import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
export const copTenants = sqliteTable('cop_tenants', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  demo: integer('demo').notNull().default(0),
  created: text('created').notNull(),
});
export const copUsers = sqliteTable(
  'cop_users',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => copTenants.id),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    password: text('password').notNull(),
    role: text('role').notNull(),
    active: integer('active').notNull().default(1),
    settings: text('settings').notNull().default('{}'),
  },
  (t) => [
    check(
      'cop_users_role_check',
      sql`role IN ('Admin','Consultant','Supervisor')`,
    ),
  ],
);
export const copSessions = sqliteTable(
  'cop_sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => copUsers.id),
    expires: integer('expires').notNull(),
    lastSeen: integer('last_seen').notNull(),
  },
  (t) => [index('cop_sessions_user').on(t.userId)],
);
export const copAttempts = sqliteTable('cop_attempts', {
  id: text('id').primaryKey(),
  count: integer('count').notNull(),
  untilAt: integer('until_at').notNull(),
});
export const copConsultants = sqliteTable('cop_consultants', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => copTenants.id),
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => copUsers.id),
  name: text('name').notNull(),
  specialty: text('specialty').notNull(),
  languages: text('languages').notNull(),
  active: integer('active').notNull().default(1),
});
export const copCompanies = sqliteTable('cop_companies', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => copTenants.id),
  name: text('name').notNull(),
  industry: text('industry').notNull(),
  location: text('location').notNull(),
});
export const copClients = sqliteTable('cop_clients', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => copTenants.id),
  companyId: text('company_id')
    .notNull()
    .references(() => copCompanies.id),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone').notNull(),
});
export const copConsultations = sqliteTable(
  'cop_consultations',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => copTenants.id),
    clientId: text('client_id')
      .notNull()
      .references(() => copClients.id),
    companyId: text('company_id')
      .notNull()
      .references(() => copCompanies.id),
    consultantId: text('consultant_id')
      .notNull()
      .references(() => copConsultants.id),
    status: text('status').notNull(),
    start: text('start').notNull(),
    data: text('data').notNull(),
    simulationCursor: integer('simulation_cursor').notNull().default(0),
    simulationLease: integer('simulation_lease').notNull().default(0),
  },
  (t) => [
    index('cop_consultations_access').on(
      t.tenantId,
      t.consultantId,
      t.status,
      t.start,
    ),
  ],
);
export const copSchedules = sqliteTable('cop_schedules', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => copTenants.id),
  consultationId: text('consultation_id')
    .notNull()
    .unique()
    .references(() => copConsultations.id),
  consultantId: text('consultant_id')
    .notNull()
    .references(() => copConsultants.id),
  start: text('start').notNull(),
  endAt: text('end_at').notNull(),
});
export const copTranscripts = sqliteTable('cop_transcripts', {
  id: text('id').primaryKey(),
  consultationId: text('consultation_id')
    .notNull()
    .unique()
    .references(() => copConsultations.id),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => copTenants.id),
  created: text('created').notNull(),
});
export const copSegments = sqliteTable(
  'cop_segments',
  {
    id: text('id').primaryKey(),
    consultationId: text('consultation_id')
      .notNull()
      .references(() => copConsultations.id),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => copTenants.id),
    externalId: text('external_id').notNull(),
    sequence: integer('sequence').notNull(),
    data: text('data').notNull(),
  },
  (t) => [
    uniqueIndex('cop_segments_consultation_id_external_id_unique').on(
      t.consultationId,
      t.externalId,
    ),
    index('cop_segments_order').on(t.consultationId, t.sequence),
  ],
);
export const copSuggestions = sqliteTable(
  'cop_suggestions',
  {
    id: text('id').primaryKey(),
    consultationId: text('consultation_id')
      .notNull()
      .references(() => copConsultations.id),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => copTenants.id),
    cacheKey: text('cache_key').notNull(),
    data: text('data').notNull(),
  },
  (t) => [
    index('cop_suggestions_consultation').on(t.consultationId),
    uniqueIndex('cop_suggestions_cache').on(
      t.tenantId,
      t.consultationId,
      t.cacheKey,
    ),
  ],
);
export const copCategories = sqliteTable(
  'cop_categories',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => copTenants.id),
    name: text('name').notNull(),
  },
  (t) => [
    uniqueIndex('cop_categories_tenant_id_name_unique').on(t.tenantId, t.name),
  ],
);
export const copDocuments = sqliteTable(
  'cop_documents',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => copTenants.id),
    category: text('category').notNull(),
    status: text('status').notNull(),
    updated: text('updated').notNull(),
    data: text('data').notNull(),
  },
  (t) => [index('cop_documents_search').on(t.tenantId, t.status, t.category)],
);
export const copChunks = sqliteTable(
  'cop_chunks',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => copTenants.id),
    documentId: text('document_id')
      .notNull()
      .references(() => copDocuments.id),
    section: text('section').notNull(),
    content: text('content').notNull(),
    embedding: text('embedding'),
  },
  (t) => [index('cop_chunks_document').on(t.tenantId, t.documentId)],
);
export const copProfiles = sqliteTable('cop_profiles', {
  consultationId: text('consultation_id')
    .primaryKey()
    .references(() => copConsultations.id),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => copTenants.id),
  data: text('data').notNull(),
});
export const copNotes = sqliteTable('cop_notes', {
  consultationId: text('consultation_id')
    .primaryKey()
    .references(() => copConsultations.id),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => copTenants.id),
  userId: text('user_id')
    .notNull()
    .references(() => copUsers.id),
  text: text('text').notNull(),
  updated: text('updated').notNull(),
});
export const copFeedback = sqliteTable(
  'cop_feedback',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => copTenants.id),
    suggestionId: text('suggestion_id')
      .notNull()
      .references(() => copSuggestions.id),
    consultationId: text('consultation_id')
      .notNull()
      .references(() => copConsultations.id),
    userId: text('user_id')
      .notNull()
      .references(() => copUsers.id),
    value: text('value').notNull(),
    created: text('created').notNull(),
  },
  (t) => [
    uniqueIndex('cop_feedback_suggestion_id_user_id_unique').on(
      t.suggestionId,
      t.userId,
    ),
    index('cop_feedback_tenant').on(t.tenantId, t.value),
  ],
);
export const copFollowups = sqliteTable('cop_followups', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => copTenants.id),
  consultationId: text('consultation_id')
    .notNull()
    .references(() => copConsultations.id),
  text: text('text').notNull(),
  status: text('status').notNull(),
  due: text('due').notNull(),
});
export const copAudit = sqliteTable(
  'cop_audit',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => copTenants.id),
    userId: text('user_id')
      .notNull()
      .references(() => copUsers.id),
    actor: text('actor').notNull(),
    action: text('action').notNull(),
    targetId: text('target_id'),
    timestamp: text('timestamp').notNull(),
  },
  (t) => [index('cop_audit_tenant').on(t.tenantId, t.timestamp)],
);
export const copEvents = sqliteTable(
  'cop_events',
  {
    seq: integer('seq').primaryKey({ autoIncrement: true }),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => copTenants.id),
    consultationId: text('consultation_id')
      .notNull()
      .references(() => copConsultations.id),
    type: text('type').notNull(),
    data: text('data').notNull(),
    timestamp: text('timestamp').notNull(),
  },
  (t) => [index('cop_events_replay').on(t.consultationId, t.seq)],
);
export const copAiClaims = sqliteTable('cop_ai_claims', {
  id: text('id').primaryKey(),
  expires: integer('expires').notNull(),
});
