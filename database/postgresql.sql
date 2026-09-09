-- PostgreSQL / Neon: run before first production request, or let repository.ready initialize.
CREATE TABLE IF NOT EXISTS cop_tenants (id TEXT PRIMARY KEY, name TEXT NOT NULL, demo INTEGER NOT NULL DEFAULT 0, created TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS cop_users (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES cop_tenants(id), name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('Admin','Consultant','Supervisor')), active INTEGER NOT NULL DEFAULT 1, settings TEXT NOT NULL DEFAULT '{}');
CREATE TABLE IF NOT EXISTS cop_sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES cop_users(id), expires BIGINT NOT NULL, last_seen BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS cop_attempts (id TEXT PRIMARY KEY, count INTEGER NOT NULL, until_at BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS cop_consultants (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES cop_tenants(id), user_id TEXT NOT NULL UNIQUE REFERENCES cop_users(id), name TEXT NOT NULL, specialty TEXT NOT NULL, languages TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS cop_companies (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES cop_tenants(id), name TEXT NOT NULL, industry TEXT NOT NULL, location TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS cop_clients (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES cop_tenants(id), company_id TEXT NOT NULL REFERENCES cop_companies(id), name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS cop_consultations (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES cop_tenants(id), client_id TEXT NOT NULL REFERENCES cop_clients(id), company_id TEXT NOT NULL REFERENCES cop_companies(id), consultant_id TEXT NOT NULL REFERENCES cop_consultants(id), status TEXT NOT NULL, start TEXT NOT NULL, data TEXT NOT NULL, simulation_cursor INTEGER NOT NULL DEFAULT 0, simulation_lease BIGINT NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS cop_schedules (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES cop_tenants(id), consultation_id TEXT NOT NULL UNIQUE REFERENCES cop_consultations(id), consultant_id TEXT NOT NULL REFERENCES cop_consultants(id), start TEXT NOT NULL, end_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS cop_transcripts (id TEXT PRIMARY KEY, consultation_id TEXT NOT NULL UNIQUE REFERENCES cop_consultations(id), tenant_id TEXT NOT NULL REFERENCES cop_tenants(id), created TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS cop_segments (id TEXT PRIMARY KEY, consultation_id TEXT NOT NULL REFERENCES cop_consultations(id), tenant_id TEXT NOT NULL REFERENCES cop_tenants(id), external_id TEXT NOT NULL, sequence BIGINT NOT NULL, data TEXT NOT NULL, UNIQUE(consultation_id,external_id));
CREATE TABLE IF NOT EXISTS cop_suggestions (id TEXT PRIMARY KEY, consultation_id TEXT NOT NULL REFERENCES cop_consultations(id), tenant_id TEXT NOT NULL REFERENCES cop_tenants(id), cache_key TEXT NOT NULL, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS cop_categories (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES cop_tenants(id), name TEXT NOT NULL, UNIQUE(tenant_id,name));
CREATE TABLE IF NOT EXISTS cop_documents (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES cop_tenants(id), category TEXT NOT NULL, status TEXT NOT NULL, updated TEXT NOT NULL, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS cop_chunks (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES cop_tenants(id), document_id TEXT NOT NULL REFERENCES cop_documents(id), section TEXT NOT NULL, content TEXT NOT NULL, embedding TEXT);
CREATE TABLE IF NOT EXISTS cop_profiles (consultation_id TEXT PRIMARY KEY REFERENCES cop_consultations(id), tenant_id TEXT NOT NULL REFERENCES cop_tenants(id), data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS cop_notes (consultation_id TEXT PRIMARY KEY REFERENCES cop_consultations(id), tenant_id TEXT NOT NULL REFERENCES cop_tenants(id), user_id TEXT NOT NULL REFERENCES cop_users(id), text TEXT NOT NULL, updated TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS cop_feedback (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES cop_tenants(id), suggestion_id TEXT NOT NULL REFERENCES cop_suggestions(id), consultation_id TEXT NOT NULL REFERENCES cop_consultations(id), user_id TEXT NOT NULL REFERENCES cop_users(id), value TEXT NOT NULL, created TEXT NOT NULL, UNIQUE(suggestion_id,user_id));
CREATE TABLE IF NOT EXISTS cop_followups (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES cop_tenants(id), consultation_id TEXT NOT NULL REFERENCES cop_consultations(id), text TEXT NOT NULL, status TEXT NOT NULL, due TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS cop_audit (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES cop_tenants(id), user_id TEXT NOT NULL REFERENCES cop_users(id), actor TEXT NOT NULL, action TEXT NOT NULL, target_id TEXT, timestamp TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS cop_events (seq BIGSERIAL PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES cop_tenants(id), consultation_id TEXT NOT NULL REFERENCES cop_consultations(id), type TEXT NOT NULL, data TEXT NOT NULL, timestamp TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS cop_consultations_access ON cop_consultations(tenant_id,consultant_id,status,start);
CREATE INDEX IF NOT EXISTS cop_segments_order ON cop_segments(consultation_id,sequence);
CREATE INDEX IF NOT EXISTS cop_events_replay ON cop_events(consultation_id,seq);
CREATE INDEX IF NOT EXISTS cop_documents_search ON cop_documents(tenant_id,status,category);
CREATE INDEX IF NOT EXISTS cop_chunks_document ON cop_chunks(tenant_id,document_id);
CREATE INDEX IF NOT EXISTS cop_suggestions_consultation ON cop_suggestions(consultation_id);
CREATE INDEX IF NOT EXISTS cop_feedback_tenant ON cop_feedback(tenant_id,value);
CREATE INDEX IF NOT EXISTS cop_audit_tenant ON cop_audit(tenant_id,timestamp);
CREATE INDEX IF NOT EXISTS cop_sessions_user ON cop_sessions(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS cop_suggestions_cache ON cop_suggestions(tenant_id,consultation_id,cache_key);
CREATE TABLE IF NOT EXISTS cop_ai_claims (id TEXT PRIMARY KEY, expires BIGINT NOT NULL);

-- Optional indexed vector store (1536-dimensional embeddings).
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE IF NOT EXISTS cop_vectors (chunk_id TEXT PRIMARY KEY REFERENCES cop_chunks(id) ON DELETE CASCADE, tenant_id TEXT NOT NULL REFERENCES cop_tenants(id), embedding vector(1536) NOT NULL);
CREATE INDEX IF NOT EXISTS cop_vectors_hnsw ON cop_vectors USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS cop_vectors_tenant ON cop_vectors(tenant_id);
