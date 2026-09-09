# SME Helpline AI Copilot

A private consultation application at **`/copilot`**, built alongside the existing Compliance Mitra workspace. It uses React, TypeScript, the Next.js App Router API through Vinext, Tailwind, shadcn/Base UI, a server-side API, persistent records, role-based authentication and realtime events.

## Start locally

Requires Node.js 22.13+ and npm. From `D:\ComplianceMitra\compliance-mitra`:

```sh
npm install
npm run dev
```

Open **http://localhost:3000/copilot**. Use `npm.cmd` on Windows if PowerShell blocks `npm.ps1`.

Choose **Explore demo workspace**, then **Start Demo Consultation**. Each session gets its own isolated tenant containing 5 consultants, 10 companies/clients, 20 consultations, 50 training documents, transcripts, suggestions and feedback. Dates are generated relative to today in India. Settings lets you explore Consultant, Admin and Supervisor roles inside the demo tenant. Role switching is unavailable in real accounts.

The copilot database initializes automatically; local state persists in `.wrangler/state`. The six scenarios cover government schemes, loans, GST/compliance, expansion, exports and digital marketing. Fictional demo guidance is explicitly identified and is not an official eligibility or legal source.

## Workflow

1. Join an assigned consultation or start a demo scenario.
2. The left column contains the meeting preview and client profile. The center holds transcript, notes and in-call knowledge search. The private AI sidebar stays beside the conversation.
3. Stream microphone speech, simulate a scenario, or add manually attributed transcript segments.
4. Final client sentences pass through question/proactive-need detection. Small talk and consultant questions do not invoke reasoning. A short conversation window supplies context.
5. Approved knowledge is retrieved first. The suggestion shows the question, answer, key points, checks, sources, evidence level and follow-ups.
6. Record Helpful, Not Helpful, Incorrect or Needs Verification feedback. Ask a follow-up, pin sources to notes, write notes, or generate a structured draft.
7. End the consultation, edit and save the summary, and optionally download it as text. History includes transcript, AI suggestions, feedback, notes, sources, summary and follow-ups.

The live surface is optimized for desktop; tablet layout moves client context above the transcript/sidebar. Small phones stack the columns.

## Accounts and security

Create a real workspace from the sign-in page. It starts empty with an Admin account. Team & access provisions consultants, supervisors or additional admins, including initial passwords and consultant expertise. Share initial credentials through your organization's existing secure channel; no invitations or emails are sent by this app.

| Role       | Access                                                                                                             |
| ---------- | ------------------------------------------------------------------------------------------------------------------ |
| Consultant | Assigned consultations, transcripts, suggestions, feedback, notes, follow-ups; approved knowledge; own preferences |
| Supervisor | Read-only tenant consultation review and analytics                                                                 |
| Admin      | Tenant-wide review, scheduling, team management, document ingestion/approval and categories                        |

Every API, event stream and source download checks identity, tenant and assignment. Dedicated `cop_*` tables prevent legacy compliance readers from accessing copilot records. Unapproved knowledge content is restricted to admins. Disabling a consultant revokes sessions and preserves history; live consultations must be ended first.

High-entropy opaque session tokens are stored only as SHA-256 digests. Cookies are HttpOnly, SameSite=Strict and Secure over HTTPS. Passwords use salted PBKDF2. Sessions expire after 30 minutes idle or 8 hours total. Auth and write requests are throttled; mutations/WebSocket upgrades validate origin. Audit entries have no edit/delete API. Hosting supplies TLS. Configure organizational retention, backup and least-privilege service credentials before accepting real client data.

## Configuration

Copy `.env.example` to **`.dev.vars`** for local execution, or set equivalent server secrets in Sites. Restart after changes. Never expose keys through `NEXT_PUBLIC_*` or `VITE_*`.

| Variable              | Purpose                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`        | Optional Neon PostgreSQL connection string. Empty uses D1/local SQLite.                                       |
| `USE_PGVECTOR`        | `true` with PostgreSQL enables the 1536-dimensional vector index.                                             |
| `VECTOR_DATABASE_URL` | Reserved for a separate retrieval deployment. Current pgvector uses `DATABASE_URL` for tenant/document joins. |
| `LLM_API_KEY`         | Server-only OpenAI-compatible chat API key.                                                                   |
| `LLM_BASE_URL`        | Default `https://api.openai.com/v1`.                                                                          |
| `LLM_MODEL`           | Default `gpt-4.1-mini`; requires JSON object output.                                                          |
| `EMBEDDING_API_KEY`   | Falls back to `LLM_API_KEY`.                                                                                  |
| `EMBEDDING_MODEL`     | Default `text-embedding-3-small`; adapter requests 1536 dimensions.                                           |
| `STT_PROVIDER`        | `deepgram` or `sarvam`.                                                                                       |
| `STT_API_KEY`         | Selected speech provider's key.                                                                               |
| `AUTH_SECRET`         | Reserved for a future identity adapter. Opaque database sessions do not need a signing secret.                |
| `WEBSOCKET_URL`       | Reserved for an external gateway. Built-in events and Sarvam relay are same-origin.                           |

All credentials can remain empty for demo mode. A real account without approved evidence or a configured reasoning provider returns: **Information not found in the approved knowledge base. Please verify before advising the client.**

### AI and multilingual behavior

The provider interfaces are `AIService`, `TranscriptionService`, `EmbeddingService`, `KnowledgeRetrievalService` and `QuestionDetectionService`. AI operates on finalized questions and short conversation windows, not individual words. Cache fingerprints include tenant, consultation, language, profile and knowledge revision. Database claims and a unique cache index prevent concurrent duplicate answers.

Production validation requires actual source passages for the short answer, key points and what-to-check fields. A citation ID alone is not treated as factual evidence. Unsupported promises, invented values and unverified translations are rejected. The LLM selects relevant extracts; it does not introduce unchecked paraphrases. Supply reviewed Hindi/Marathi knowledge for source-verifiable localized advice. If the requested language is unavailable in the source, excerpts stay in their original language. Demo answers/checklists and curated follow-ups are localized in English, Hindi and Marathi. Native and common transliterated mixed speech is recognized.

The LLM streams to a server buffer; raw tokens are withheld until validation completes. Processing events and the validated answer arrive in the sidebar through SSE. Evidence levels are not calibrated probabilities of correctness or eligibility. Notes and summaries are editable structured drafts composed from recorded material; they do not introduce new policy claims.

### Speech and meeting adapters

**Deepgram:** uses Nova-3 with a server-issued short-lived browser token. Long-lived keys remain server-side. Auto (`multi`) handles Hindi + English; Marathi requires selecting Marathi (`mr`). Automatic Marathi switching is not claimed. Verify estimated diarization labels; separate speaker runs are preserved.

**Sarvam:** the server relay connects to Saaras realtime with codemix enabled. The browser AudioWorklet supplies mono 16 kHz PCM. Auto supports English, Hindi and Marathi. Relay authorization is periodically rechecked; subscription keys never reach the browser. When the provider supplies no speaker label, the current Client/Consultant selector attributes the segment; this is not automatic diarization. Missing confidence is shown as unavailable.

Capture requires participant consent and HTTPS or localhost. Reconnection uses bounded exponential backoff. Transcript persistence completes independently of AI reasoning through Worker `waitUntil`, so a slow answer does not block later transcript segments. AI errors leave the conversation and notes available.

The meeting area is an integration-ready **local preview**, not a connected remote video call. It can capture local camera/screen media; a selected WebRTC/video provider must transport remote audio/video. The current speech input is a shared local microphone. Provider credentials and a connected browser were not supplied, so live speech/media must be checked with a consenting pilot call before launch.

Official references: [Deepgram languages](https://developers.deepgram.com/docs/models-languages-overview), [temporary tokens](https://developers.deepgram.com/reference/auth/tokens/grant), [Sarvam realtime protocol](https://docs.sarvam.ai/api/api-guides-tutorials/speech-to-text/realtime-streaming), [Neon HTTP driver](https://neon.com/docs/serverless/serverless-driver), [pgvector](https://github.com/pgvector/pgvector).

## Knowledge ingestion

PDF, DOCX, XLSX, CSV and UTF-8 TXT are supported, up to 10 MB per file. PDF uses `unpdf`; DOCX uses `mammoth`; XLSX reads cached values without executing formulas. Archive expansion, PDF pages, worksheet rows and extracted text are bounded. Image-only PDFs require OCR before upload. Uploaded bytes are kept in R2, metadata and overlapping chunks in the database. Failed extraction persists Failed status; successful documents remain Draft until an Admin approves them.

Metadata covers name, category, issuing department, scheme/service, state, industry, effective date, source, version and update time. Page labels are retained where available. Optional embeddings are shape/dimension checked. Retrieval combines multilingual lexical/topic matching and embedding similarity; PostgreSQL optionally uses pgvector HNSW, while D1 uses exact cosine on JSON vectors. Only approved documents participate. Use indexed PostgreSQL and workload measurement for large libraries.

## Database and realtime events

Models cover User, Consultant, Client, Company, Consultation, ConsultationSchedule, Transcript, TranscriptSegment, AISuggestion, KnowledgeDocument, KnowledgeChunk, ClientProfile, ConsultationNote, ConsultationFeedback, FollowUp and AuditLog, plus tenants, sessions, categories, events and generation claims. See `db/copilot-schema.ts`, `lib/copilot/schema.ts`, `database/postgresql.sql` and `drizzle/`. Queries use bound parameters, foreign keys and access-pattern indexes.

```sh
npm run db:copilot-schema
npm run db:generate
```

Copilot tables initialize idempotently for local startup; hosted Sites receives packaged migrations. PostgreSQL uses Neon's HTTP driver, compatible with the Worker runtime. Generic raw-TCP PostgreSQL connections are unsupported by hosted Sites.

SSE at `GET /api/copilot/consultations/:id/events` supports ordered database events, `Last-Event-ID` replay, heartbeat, cancellation, access revalidation and bounded connection lifetime. Reconnecting a stream never advances simulation. Simulation advances only through an authorized POST and database lease.

Events: `transcript.partial`, `transcript.final`, `question.detected`, `ai.thinking`, `ai.answer`, `ai.followup`, `client.profile.updated`, `alert.created`, `consultation.started`, `consultation.ended`, `ai.error` and `connection.error`.

## API

The UI uses `/api/copilot/*`. Consultation, AI, transcription, knowledge and client endpoints also have the requested `/api/*` aliases.

| Method     | Route under `/api/copilot`     | Purpose                                                     |
| ---------- | ------------------------------ | ----------------------------------------------------------- |
| POST       | `/auth`                        | Register, sign in/out, isolated demo, demo-only role switch |
| GET        | `/workspace`                   | Authorized dashboard and metrics                            |
| GET / POST | `/consultations`               | List / schedule                                             |
| GET        | `/consultations/:id`           | Full authorized record                                      |
| POST       | `/consultations/:id/start`     | Start with consent                                          |
| POST       | `/consultations/:id/end`       | End and prepare summary                                     |
| POST       | `/consultations/:id/summary`   | Save reviewed summary                                       |
| POST       | `/consultations/:id/notes`     | Save or generate notes                                      |
| POST       | `/consultations/:id/followups` | Record asked/planned follow-up                              |
| POST       | `/consultations/:id/simulate`  | Advance simulation once                                     |
| GET        | `/consultations/:id/events`    | Private replayable SSE                                      |
| POST       | `/transcription`               | Persist transcript / transcribe audio file                  |
| POST       | `/speech`                      | Scoped speech connection information                        |
| GET        | `/speech/stream`               | Authenticated Sarvam WebSocket upgrade                      |
| POST       | `/ai/question`                 | Detect question/proactive need                              |
| POST       | `/ai/suggestion`               | Generate grounded answer                                    |
| POST       | `/ai/feedback`                 | Record feedback                                             |
| POST       | `/knowledge/upload`            | Extract, chunk and index                                    |
| GET        | `/knowledge/search?q=...`      | Approved-source retrieval                                   |
| POST       | `/knowledge/:id/status`        | Approve/unapprove                                           |
| GET        | `/knowledge/:id/download`      | Authorized original source                                  |
| GET        | `/client/:id`                  | Authorized client and history                               |
| POST       | `/consultants`                 | Provision/update/deactivate team members                    |
| POST       | `/categories`                  | Create collection                                           |
| POST       | `/settings`                    | Save language and automatic assistance                      |

## Verification

```sh
npm run typecheck
npm run test:copilot   # development server running
npm test              # existing compliance regression suite
npm run build
```

The copilot suite covers multilingual normalization, proactive detection, strict answer evidence checks, all six scenarios, auth and tenant/assignment boundaries, supervisor write denial, draft isolation, all five formats, blank-PDF rejection, consent, duplicates, SSE, notes, feedback, summaries, scheduling, provisioning, deactivation and logout.

The requested sub-2-second transcription and 3–5-second answer timings are targets requiring measurement with actual providers and hosting region. Demo timings do not establish real speech/LLM latency. PostgreSQL connectivity, paid providers, browser media permissions, enterprise load and organization-specific operational controls need deployment-specific verification.
