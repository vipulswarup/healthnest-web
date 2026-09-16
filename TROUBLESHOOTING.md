# Troubleshooting deployment issues

## Verify the Vercel build

In Vercel, open the latest deployment and inspect the build logs. The project
uses the Next.js preset with `npm run build` and produces `.next` output.

Common build failures are missing dependencies, TypeScript errors, or an
incorrect Vercel root directory. When deploying from the parent repository,
the root directory must be `sanovault-web`.

## Required environment variables

Configure the production values in Vercel Project Settings → Environment
Variables:

- `DATABASE_URL` — Neon pooled PostgreSQL connection string.
- `DIRECT_URL` — Neon direct connection string, used only by migrations.
- `NEON_AUTH_BASE_URL` and `NEON_AUTH_COOKIE_SECRET` — Neon Auth settings.
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and
  `R2_BUCKET_NAME` — private Cloudflare R2 document storage.
- `GROQ_API_KEY` — required when using AI analysis or vision OCR.
- `BREVO_API_KEY` and `EMAIL_FROM` — required for household invite email.
- `NEXT_PUBLIC_APP_URL` — the public application origin, used in invite links.

Do not configure legacy `NEXTAUTH_*` or `MONGODB_*` variables; this project
uses Neon Auth and Postgres exclusively.

## Database migrations

Deploy application code only after applying its database migrations:

```bash
npm run db:migrate
```

Use a direct Neon connection in `DIRECT_URL`. The migration runner records
completed files in `schema_migrations`, so it is safe to run again. If an API
route reports a missing table or column, apply migrations before retrying the
deployment.

## Runtime errors

Production responses include an opaque `requestId` for unexpected server
errors. Check the matching Vercel function log entry; production logs are
intentionally redacted and do not include raw database or provider errors.

For local troubleshooting, run:

```bash
npm run build
npm run start
```

Then visit `http://localhost:3001`. Local development logs retain detailed
errors for diagnosis.
