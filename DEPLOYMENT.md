# Deployment

How SanoVault Web runs in production and what to configure. Local setup and the variable reference live in [README.md](./README.md); fixing failures lives in [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).

## Production topology

| Piece | Where |
| --- | --- |
| Web and API | Vercel project `sanovault-web`, Git-linked to the `HealthNest` repository, production branch `main`, **root directory `sanovault-web`**, Node 24.x |
| Functions region | `iad1` (Washington DC); Fluid compute on. Not overridden in `vercel.json` |
| Database | Neon Postgres, AWS `us-east-2` (Ohio), next to `iad1` |
| Files | Cloudflare R2, private bucket, signed URLs only (no public bucket URL) |
| Scheduled jobs | Vercel Cron, defined in `vercel.json` |

A push to `main` deploys production. Any other branch or pull request gets a preview deployment. Previews use the same environment variables unless you scope them separately, so they talk to the same database; do not run destructive tests against a preview.

### Latency note

Server-to-database latency is small (neighbouring regions). For users in India the dominant cost is the round trip from the phone to the US. The mobile app therefore reads from its on-device cache first and refreshes in the background, and the API keeps the work per request to a minimum (one query to authenticate a mobile token). Moving both Vercel functions and Neon to an Asian region is possible later; it requires a database migration and is not needed for the current design.

## Release steps

1. Merge to `main` (or promote a preview).
2. The build runs `npm run db:migrate` first, then `next build --webpack`, so a failing migration stops the deploy. Migrations are additive and recorded in `schema_migrations`.
3. Check the deployment's function logs for the first few minutes.
4. **Order matters for the mobile app.** Deploy API changes before publishing an app build that depends on them (for example, blood-pressure edit/delete and the `days` history window). Older app builds keep working because existing routes and fields are unchanged.

## Environment variables

Set them in Vercel → Project Settings → Environment Variables. The full list with explanations is in [README.md](./README.md#environment-variables) and `.env.example`. Do not add legacy `NEXTAUTH_*` or `MONGODB_*` variables; the project uses Neon Auth and Postgres only.

`CRON_SECRET` protects the internal routes. Vercel sends it as a bearer token on cron invocations.

## Scheduled jobs

| Path | Schedule (UTC) | Purpose |
| --- | --- | --- |
| `/api/internal/deletions` | daily 02:00 | Retry account-deletion work: R2 erasure and identity-provider cleanup |
| `/api/internal/medication-catalogue/reconcile` | Mondays 03:00 | Reconcile the medication catalogue |

## Account deletion

Deleting an account removes database rows immediately and queues physical R2 erasure and identity cleanup, retried by the daily job. Before publishing deletion controls, configure:

- `NEON_API_KEY`, `NEON_PROJECT_ID`, `NEON_BRANCH_ID` to delete Neon Auth users. They must match the project and branch behind `NEON_AUTH_BASE_URL`.
- `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` to revoke Sign in with Apple. Keep the key in Vercel's encrypted store. Apple sign-ins that have no stored revocation token need a fresh authorisation in the iOS app.
- The existing R2 variables for erasing files.

Migration `0019_deletion.sql` adds the queue and the lifecycle rules. After the first rollout, check the cron and any pending deletion jobs.

## WhatsApp report forwarding (optional)

1. Create a Meta Business app with the WhatsApp Cloud API and a business phone number.
2. Set the webhook URL to `https://www.sanovault.com/api/webhooks/whatsapp` and subscribe to `messages`. Use the same value for the Meta verify token and `WHATSAPP_VERIFY_TOKEN`.
3. Add `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` and `WHATSAPP_APP_SECRET` (verifies `X-Hub-Signature-256`).
4. In the app, link each sender's phone number (country code, digits only) under the family folder's WhatsApp intake.
5. People forward a PDF, photo or text, choose the person in WhatsApp, and confirm the result in the app under **Reports → Needs review**.

Retries use `POST /api/internal/whatsapp/process`, authorised by `WHATSAPP_INTERNAL_SECRET` or `CRON_SECRET`.

## Domain and email

Add the domain under Vercel → Domains. `NEXT_PUBLIC_APP_URL` must equal the public origin because invite links and the email logo use it. Invite and share emails go through Brevo; verify the sending domain there and use an `xkeysib-` API key.

## Post-deployment checklist

- [ ] Home page and `/auth/signin` load; sign-in works (email, Google)
- [ ] Mobile sign-in works against the deployment (`POST /api/auth/mobile/password`)
- [ ] Upload a PDF and an image; both open from signed URLs; the bucket is not publicly readable
- [ ] A new report appears in the correct place when sorted by document date
- [ ] Invite email arrives and the link opens `/households/invites/...`
- [ ] Cron routes return 200 when called with `Authorization: Bearer $CRON_SECRET`
- [ ] No errors in Vercel function logs

## CI

Vercel builds and deploys automatically. `.github/workflows/deploy.yml.example` is an optional lint/test pipeline you can enable if you want checks before merge (`npm run lint`, `npm run test:security`).
