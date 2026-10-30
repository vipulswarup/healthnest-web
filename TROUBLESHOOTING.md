# Troubleshooting

Symptoms, causes and fixes for building, running and deploying SanoVault Web. For the architecture and variables see [README.md](./README.md); for how production is set up see [DEPLOYMENT.md](./DEPLOYMENT.md).

## Build and deploy

| Symptom | Cause and fix |
| --- | --- |
| Vercel: "No Next.js version detected" or 404 on every route | The Vercel root directory is wrong. When deploying from the parent repository it must be `sanovault-web`. |
| Build fails while migrating | `DIRECT_URL` is missing or is the pooled string. It must be a Neon **direct** connection. Fix it and redeploy; migrations resume where they stopped. |
| Build fails on type errors | Run `npx tsc --noEmit` and `npm run lint` locally; fix before pushing. |
| API returns "relation/column does not exist" | The code is ahead of the database. Run `npm run db:migrate` against that environment (a normal build does this first). |

## Environment

| Symptom | Cause and fix |
| --- | --- |
| `DATABASE_URL must be configured` | Missing in `.env.local` (local) or Vercel settings. Restart the dev server after editing. |
| Sign-in loops or "invalid session" | `NEON_AUTH_BASE_URL` or `NEON_AUTH_COOKIE_SECRET` is missing or from a different branch. Add your origin under Neon Console → Auth → trusted domains. |
| Google sign-in fails | Google must be enabled in Neon Console → Auth, with `{NEON_AUTH_BASE_URL}/callback/google` registered at Google. |
| Uploads fail | Check all four `R2_*` variables and that the access key is scoped to the bucket. |
| OCR or classification returns an error | Check `GROQ_API_KEY`, `GROQ_VISION_MODEL`, the user's AI-processing consent (More → AI document processing), and the hourly `RATE_LIMIT_*` values. |
| Invite email "Key not found" | `BREVO_API_KEY` is an SMTP key (`xsmtpsib-`). Use an API key (`xkeysib-`). |
| Cron routes return 401 | `CRON_SECRET` is not set, or the request lacks `Authorization: Bearer <secret>`. |

## Runtime

- Unexpected server errors return an opaque `requestId`. Find the matching entry in the Vercel function logs. Production logs are redacted and omit raw database or provider errors.
- Locally, `npm run build && npm run start` reproduces a production build on `http://localhost:3001`; development logs keep full error detail.
- Mobile app shows old data after a change: the app shows its on-device cache first and refreshes in the background. Pull to refresh, or check the connection if a "needs a connection" message appears when editing.
- A PDF stays under **Needs review** after sharing from the phone: it is probably password protected. Add the password under the person's profile → File passwords, then reopen the report.
