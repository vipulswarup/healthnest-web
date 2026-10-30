# SanoVault Web

The SanoVault website **and** the HTTP API used by the mobile app. Next.js (App Router) on Vercel, Neon Postgres, Cloudflare R2.

Where things live: see the [repository README](../README.md). Production hosting, scheduled jobs and WhatsApp setup: [DEPLOYMENT.md](./DEPLOYMENT.md). When something breaks: [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).

## Stack

| Concern | Choice |
| --- | --- |
| App | Next.js 16 (App Router, webpack build), React 19, TypeScript |
| UI | Tailwind CSS 4 with the shared teal tokens in `app/globals.css`, HeroUI components |
| Database | Neon Postgres via `@neondatabase/serverless` (HTTP driver) |
| Auth | Neon Auth for the website (cookies); bearer tokens for the mobile app (`mobile_sessions`) |
| Files | Cloudflare R2, private bucket, short-lived signed URLs |
| Document reading | PDF text extraction plus Groq vision OCR; Office text extracted natively; optional external OCR service |
| AI | Groq (classification, tagging, analysis, medicine photo extraction), gated by per-user consent |
| Email | Brevo (household invites, document sharing) |
| Push | Device tokens registered through `/api/devices` |

## Run locally

Requires Node.js 20+, a Neon project with Neon Auth enabled, and a Cloudflare R2 bucket.

```bash
cd sanovault-web
npm install
cp .env.example .env.local     # then fill in the values below
npm run db:migrate             # apply database/migrations/*.sql
npm run dev                    # http://localhost:3001
```

Smoke test: sign up at `/auth/signup`, accept the beta terms, add a person, upload a small PDF or image from **Reports**, and confirm the object is in R2 and **not** publicly readable.

## Environment variables

`.env.example` is the authoritative list with comments. Summary:

| Group | Variables | Needed for |
| --- | --- | --- |
| Database | `DATABASE_URL` (pooled), `DIRECT_URL` (direct, migrations only) | everything |
| Auth | `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET` (`openssl rand -base64 32`), `APPLE_BUNDLE_ID` | sign-in, mobile Apple sign-in |
| Storage | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` | uploads, previews, sharing |
| AI | `GROQ_API_KEY`, `GROQ_VISION_MODEL` | OCR of scans, classification, tagging |
| Email | `BREVO_API_KEY` (an `xkeysib-` API key, not SMTP), `EMAIL_FROM`, `NEXT_PUBLIC_APP_URL` | invites, share-by-email |
| Rate limits | `RATE_LIMIT_DOCUMENT_UPLOADS_PER_HOUR`, `RATE_LIMIT_OCR_INTAKE_PER_HOUR`, `RATE_LIMIT_OCR_FULL_PER_HOUR`, `RATE_LIMIT_AI_PER_HOUR` | cost control |
| Optional | `OCR_SERVICE_URL`, `GOOGLE_SITE_VERIFICATION`, WhatsApp variables | see DEPLOYMENT.md |
| Account deletion | `NEON_API_KEY`, `NEON_PROJECT_ID`, `NEON_BRANCH_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`, `CRON_SECRET` | deleting accounts, see DEPLOYMENT.md |

Google sign-in is configured in the Neon Console (Auth → Configuration), not through app variables. Register `{NEON_AUTH_BASE_URL}/callback/google` and add your app origins as trusted domains.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on port 3001 |
| `npm run build` | Applies migrations, then `next build --webpack` |
| `npm run start` | Serve the production build on port 3001 |
| `npm run lint` | ESLint |
| `npm run db:migrate` (alias `init-db`) | Apply pending migrations; recorded in `schema_migrations`, safe to re-run |
| `npm run test:security` | File-signature, CSRF, error-handler and beta-acknowledgement tests |
| `npm run test:images` | Image normalisation tests |
| `npm run test:blood-summary:unit` | Blood-summary unit tests (`test:blood-summary` also seeds data) |

## Code map

```
app/            Pages (App Router) and app/api/** route handlers
components/     UI by area: dashboard, documents, lab, layout, medications, vitals, ...
lib/auth/       Website session, mobile bearer sessions, Apple sign-in
lib/services/   Business logic per area (documents, OCR, vitals, visit notes, ...)
lib/households/ Access checks: who may see which person
lib/db/         Neon client and row mappers
database/migrations/   Numbered SQL migrations, applied in order
docs/           Feature specs and reviews
```

Every health-data route authenticates with `getCurrentUser()` (`lib/auth/session.ts`), which also enforces the current beta acknowledgement, then checks household access to the person.

## API

All routes are under `/api` and accept either the website cookie or `Authorization: Bearer <mobile token>`. Methods listed are those implemented.

| Area | Routes |
| --- | --- |
| Auth | `/auth/[...path]` (Neon Auth); `POST /auth/mobile/apple`, `POST /auth/mobile/password`, `POST,DELETE /auth/mobile/session` |
| Account | `GET,PUT /users/me`, `GET,POST /users/beta-acknowledgement`, `PATCH /users/groq-ai-consent`, `GET,POST /users/me/deletion`, `POST /users/onboarding/complete`, `GET /privacy`, `POST /devices` |
| Home | `GET /dashboard`, `GET,PATCH /me/active-household` |
| Families | `GET,POST /households`, `GET,PATCH,DELETE /households/[id]`, `.../members`, `.../invites`, `.../patients`, `.../leave`, `GET,POST /households/invites/[token]`, `GET /households/invites/pending` |
| People | `GET,POST /patients`, `GET,PUT,DELETE /patients/[id]`, `GET /patients/search`, `GET,POST /patients/[id]/file-passwords`, `DELETE .../[passwordId]` |
| Reports | `GET,POST /health-records` (newest **document date** first), `GET,PUT,DELETE /health-records/[id]`, `GET /health-records/trends`, `GET /health-record-categories`, `GET /healthcare-sources`, `POST /healthcare-sources/match`, `GET /doctors`, `POST /doctors/match` |
| Documents | `POST /documents/upload`, `POST /documents/lookup-hash`, `POST /documents/view`, `GET /documents/preview`, `GET /documents/[id]/file`, `GET,DELETE /documents/[id]`, `GET,POST,DELETE /documents/[id]/share`, `POST .../share/email`, `GET /share/[token]`, `GET /share/[token]/file` |
| AI and OCR | `POST /ocr/process`, `POST /ai/analyze`, `POST /ai/classify`, `POST /ai/suggest-tags` |
| Medicines | `GET,POST /medications`, `GET,PUT,DELETE /medications/[id]`, `POST /medications/extract-from-photo`, `GET /medication-catalog/search`, `GET /reports/medications` |
| Vitals | `GET /vitals/blood-pressure?patientId=&days=` (default 8 days, max 365), `POST` to add, `PATCH,DELETE /vitals/blood-pressure/[id]`, `POST /vitals/blood-pressure/sync` (HealthKit / Health Connect), `GET,POST /vitals/growth`, `DELETE /vitals/growth/[id]` |
| Tracking | `GET,POST /vaccinations`, `PATCH,DELETE /vaccinations/[id]`, `GET,POST /visit-notes` (symptoms and notes, newest first), `PATCH,DELETE /visit-notes/[id]` |
| Doctor | `GET,POST /reports/doctor-packet`, `GET /reports/blood-summary` |
| WhatsApp | `GET,POST /webhooks/whatsapp`, `GET,PUT,DELETE /whatsapp/sender-map` |
| Internal (cron / secret) | `GET /internal/deletions`, `GET /internal/medication-catalogue/reconcile`, `POST /internal/whatsapp/process` |

### Ordering rules (relied on by both clients)

- Reports: `COALESCE(document_date, created_at::date) DESC, created_at DESC`. Date filters use the same date.
- Symptoms and notes: `note_date DESC, created_at DESC`. There is no pinning (the `pinned` column is retained but ignored).
- Blood pressure readings: `recorded_at DESC`. Only readings the app owns (`vault_owned`) can be deleted; editing a device-synced reading makes it app-owned so the next sync cannot overwrite it.

## Database

Postgres on Neon. Schema changes are numbered files in `database/migrations/` (currently `0001`–`0020`): core tables, households and sharing, document storage and checksums, medication catalogue, vitals (`blood_pressure_readings`, growth), `visit_notes`, `vaccinations`, mobile sessions and devices, WhatsApp intake, file passwords, account-deletion queue, and AI consent. Add a new numbered file for every change; never edit an applied one.

## Related documents

- [DEPLOYMENT.md](./DEPLOYMENT.md): Vercel, regions, cron jobs, WhatsApp, account deletion
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md): build, environment, migration and runtime problems
- [docs/medication-center-spec.md](./docs/medication-center-spec.md): medicine record and composition rules
- [docs/ux-friction-review.md](./docs/ux-friction-review.md): August 2026 usability review (point in time)
- [../FOLDER-CHECK.md](../FOLDER-CHECK.md): Mac folder import, whose backend lives here
- [../DESIGN.md](../DESIGN.md): shared palette, navigation and interaction rules
