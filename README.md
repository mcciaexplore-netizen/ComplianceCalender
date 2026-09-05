# Compliance Mitra

MCCIA-branded MSME compliance and audit workspace. Separate project; the IVR automation and YojanaSetu projects are unchanged.

## Run locally (Windows)

Use Node 24 and `npm.cmd` in PowerShell. If the network uses Windows-managed certificates, set `$env:NODE_USE_SYSTEM_CA='1'` before installation; do not disable TLS validation.

1. `npm.cmd ci`
2. `npm.cmd run build`
3. `npm.cmd run db:local` (once for a new local database)
4. `npm.cmd run dev -- --host 127.0.0.1`
5. Open the Local URL printed by the server (normally http://localhost:3000).

Choose **Explore demo workspace**, then **Explore demo**. Each demo creates an isolated company with seven roles. Use the role selector to follow the employee/reviewer/expert journeys. Registration creates a separate company account. Save the recovery code shown at registration; it is the supported password-reset mechanism.

## Implemented

- D1-backed company accounts, hashed passwords, HttpOnly sessions, one-time recovery codes, authentication throttling, server-side role authorization and organization scoping.
- Company profile, company logo, profile completion and profile-based potential applicability suggestions.
- Expert verification; verified requirements generate tasks. Approval of recurring tasks generates the next calendar occurrence.
- Month/week/list/year calendar, task assignment, configurable checklists, filing details, private evidence, comments, corrections, approval and activity history.
- Audit templates with sections, question types, required flags and scoring weights; audit assessments, findings, linked corrective actions and closure checks.
- Kaizen problem/root cause/improvement, before/after evidence, benefits and linked corrective actions.
- Private R2 file storage, file validation, previews, downloads, document versions and protection of approved evidence.
- Licence register, in-app reminders and escalation evaluation, user management, departments, settings and guidance request records.
- Company-branded PDF forms and real XLSX exports with header styling, filters, column widths and logo embedding.
- Dashboard, search, filters, status summaries, internal health score and role-specific navigation.

## Service boundaries and remaining production work

This is a working application with tested core workflows, not a production compliance certification or a fully commissioned external service.

- Email sending is not configured. Registration recovery codes support reset; guidance requests are saved internally and are not sent to MCCIA. In-app reminders are evaluated on workspace access; an external scheduler/email provider is required for unattended delivery.
- The MCCIA Administrator demo manages its authorized organization. Global organization provisioning, cross-organization administrator access and expert account verification require a separately commissioned platform administration process.
- Production identity assurance (email verification, MFA and verified external expert enrolment), malware scanning, backup/retention policy, dedicated security assessment and load tests remain deployment tasks.
- Applicability suggestions are explicitly provisional. No statutory deadlines or legal applicability are certified. Demo dates and registration identifiers are illustrative.
- Browser runtime was unavailable in the authoring session. Browser interaction, visual layout, mobile overflow and download behavior require manual browser QA. Server rendering and API workflows are tested.
- Storage models use relational organization/users/sessions/files plus versioned workflow records with JSON data for configurable forms. This is not a separate normalized table for every form field.

## Validation

- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd run build`
- With the local server running: `npm.cmd test`

Tests exercise expert verification, employee submission, correction/resubmission, approval, recurrence, audit findings, corrective action evidence/closure, Kaizen before/after and benefits, tenant isolation, permission rejection, CSRF rejection, registration, recovery and report generation. Test-created data stays in isolated local companies. Artifacts are written to ignored `tests/artifacts/`.

## Architecture

React + TypeScript + Vinext/Vite; Tailwind and shadcn primitives; Cloudflare D1/R2 through Sites; Zod; React Hook Form; Recharts; pdf-lib; ExcelJS.

`app/api/` contains server enforcement. `lib/server.ts` owns database/session helpers. `lib/applicability.ts` contains provisional profile matching. `db/schema.ts` and `drizzle/` define and migrate persistence. `components/workspace.tsx` contains the interactive workspace. Reports load on demand to avoid adding export libraries to initial rendering.

No application secrets are required for local D1/R2 emulation. Do not copy the parent project's `.env` into this app. Hosting binding identifiers are logical bindings, not credentials.

Official logo source: https://www.mcciapune.com/static/assets/images/logos/logo-mccia-white-blue-new.png. The original asset is used without redrawing. MCCIA reference: https://www.mcciapune.com/.
