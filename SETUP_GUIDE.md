# SanoVault Setup & Testing Guide

This guide will help you set up and test the foundation of SanoVault.

## Step 1: Environment Variables Setup

1. Copy the example environment file:
   ```bash
   cd sanovault-web
   cp .env.example .env.local
   ```

2. Generate a Neon Auth cookie secret:
   ```bash
   openssl rand -base64 32
   ```
   Copy the output - you'll need it for `NEON_AUTH_COOKIE_SECRET`.

3. Edit `.env` and fill in the following:

### Required for Basic Testing:

**Neon Postgres:**
- `DATABASE_URL`: Neon pooled connection string
- `DIRECT_URL`: Neon direct connection string for migrations

**Neon Auth:**
- `NEON_AUTH_BASE_URL`: Copy the Auth URL from Neon Console → Auth → Configuration
- `NEON_AUTH_COOKIE_SECRET`: Paste the secret you generated above

### Optional (can skip for initial testing):

**Cloudflare R2:**
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and `R2_BUCKET_NAME`: Required for document uploads. Keep the bucket private; do not configure a public URL.

**Groq AI:**
- Leave empty for now - we'll set this up in Sprint 1

**OCR Service:**
- Leave empty for now - we'll set this up in Sprint 1

**Social SSO (Neon Console, not app env vars):**
- Enable Google under Neon Console → Auth → Configuration
- Add trusted domains for `http://localhost:3001` and your production URL
- Register the Google redirect URI as `{NEON_AUTH_BASE_URL}/callback/google`

## Step 2: Neon and R2 Setup

1. Create a Neon project and enable Neon Auth on its production branch.
2. Copy the pooled and direct Postgres connection strings into `.env.local`.
3. Copy Neon Auth's Auth URL and add it as `NEON_AUTH_BASE_URL`.
4. Create a Cloudflare R2 bucket and an S3 API token restricted to that bucket; add the four R2 variables to `.env.local`.
5. For Google social login in production, confirm Google is enabled in Neon Auth and add your app origins as trusted domains.

## Step 3: Initialize Database

Run the versioned database migrations:

```bash
npm run init-db
```

**Expected output:**
```
Applied database/migrations/0001_initial.sql
```

If you see errors:
- Check `DIRECT_URL` is a Neon direct connection string
- Check the Neon project is reachable and the credentials are correct

## Step 4: Start Development Server

```bash
npm run dev
```

**Expected output:**
```
  ▲ Next.js 16.0.1
  - Local:        http://localhost:3001
  - Ready in 2.3s
```

Open http://localhost:3001 in your browser. You should see the default Next.js page.

## Step 5: Test Authentication and Uploads

1. Open `http://localhost:3001/auth/signup` and create a test account.
2. Create a patient, then upload a small PDF or image through a health record.
3. Verify the object appears in R2 and its metadata is visible in Neon; the bucket object should not be publicly accessible.

## Step 6: Verify Project Structure

Check that all files are in place:

```bash
# Check core files exist
ls -la lib/r2.ts
ls -la lib/auth/session.ts
ls -la lib/db/neon.ts

# Check types exist
ls -la lib/types/*.ts

# Check API route exists
ls -la app/api/auth/[...path]/route.ts
```

## Troubleshooting

### MongoDB Connection Errors

**Error: "MongoServerError: bad auth"**
- Check your database username and password in the connection string
- Verify the user has proper permissions

**Error: "MongoNetworkError: connection timeout"**
- Check your IP is whitelisted in MongoDB Atlas Network Access
- Try "Allow Access from Anywhere" (0.0.0.0/0) for testing

**Error: "MONGODB_URI not found"**
- Make sure `.env` exists (not `.env.example`)
- Restart the dev server after creating `.env`

### NextAuth Errors

**Error: "NEXTAUTH_SECRET is not set"**
- Make sure `NEXTAUTH_SECRET` is in `.env`
- Generate a new secret with `openssl rand -base64 32`

**Error: "Invalid API route"**
- Make sure the route file is at `app/api/auth/[...nextauth]/route.ts`
- Restart the dev server

### TypeScript Errors

If you see TypeScript errors:
```bash
# Check for type errors
npm run build
```

Most errors should be resolved, but let me know if you see any.

## Next Steps After Testing

Once everything is working:
1. ✅ MongoDB connection verified
2. ✅ Database indexes created
3. ✅ NextAuth configured
4. ✅ Development server running

We can proceed to implement the API layer (Task #8) which will include:
- User registration and authentication endpoints
- Patient CRUD endpoints
- Health record endpoints
- Medication endpoints

## Quick Test Checklist

- [ ] `.env.local` file created with MongoDB URI
- [ ] `NEXTAUTH_SECRET` generated and added
- [ ] MongoDB Atlas cluster created and accessible
- [ ] `npm run init-db` completed successfully
- [ ] `npm run dev` starts without errors
- [ ] http://localhost:3001 loads
- [ ] http://localhost:3001/api/auth/session returns JSON

Let me know if you encounter any issues or if everything works!
