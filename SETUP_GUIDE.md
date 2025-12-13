# HealthNest Setup & Testing Guide

This guide will help you set up and test the foundation of HealthNest.

## Step 1: Environment Variables Setup

1. Copy the example environment file:
   ```bash
   cd healthnest-web
   cp .env.example .env
   ```

2. Generate a NextAuth secret:
   ```bash
   openssl rand -base64 32
   ```
   Copy the output - you'll need it for `NEXTAUTH_SECRET`.

3. Edit `.env` and fill in the following:

### Required for Basic Testing:

**MongoDB:**
- `MONGODB_URI`: Get this from MongoDB Atlas (see Step 2)
- `MONGODB_DB_NAME`: Use `healthnest` (or any name you prefer)

**NextAuth:**
- `NEXTAUTH_URL`: Use `http://localhost:3001` for local development
- `NEXTAUTH_SECRET`: Paste the secret you generated above

### Optional (can skip for initial testing):

**Cloudflare R2:**
- Leave these empty for now - we'll set up file uploads later

**Groq AI:**
- Leave empty for now - we'll set this up in Sprint 1

**OCR Service:**
- Leave empty for now - we'll set this up in Sprint 1

**Google OAuth:**
- Leave empty for now - email/password auth will work

## Step 2: MongoDB Atlas Setup

1. **Create MongoDB Atlas Account** (if you don't have one):
   - Go to https://www.mongodb.com/cloud/atlas
   - Sign up for free (M0 cluster is free)

2. **Create a Cluster:**
   - Choose a cloud provider and region
   - Select M0 (Free) tier
   - Name your cluster (e.g., "HealthNest")

3. **Create Database User:**
   - Go to "Database Access" → "Add New Database User"
   - Choose "Password" authentication
   - Create username and password (save these!)
   - Set privileges to "Atlas admin" or "Read and write to any database"

4. **Configure Network Access:**
   - Go to "Network Access" → "Add IP Address"
   - Click "Allow Access from Anywhere" (0.0.0.0/0) for development
   - Or add your current IP address

5. **Get Connection String:**
   - Go to "Database" → "Connect"
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password
   - Replace `<dbname>` with `healthnest` (or your chosen DB name)
   - Example: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/healthnest?retryWrites=true&w=majority`
   - Paste this into `.env.local` as `MONGODB_URI`

## Step 3: Initialize Database

Run the database initialization script to create indexes:

```bash
npm run init-db
```

**Expected output:**
```
Initializing MongoDB indexes...
MongoDB indexes initialized successfully
Database initialization complete!
```

If you see errors:
- Check your `MONGODB_URI` is correct
- Verify your IP is whitelisted in MongoDB Atlas
- Check your database user credentials

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

## Step 5: Test MongoDB Connection

Let's create a simple test endpoint to verify MongoDB is working.

1. Create a test API route:
   ```bash
   # This will be created in the next step
   ```

2. Visit: http://localhost:3001/api/test/db

You should see a JSON response indicating the connection status.

## Step 6: Test Authentication Setup

1. **Check NextAuth is configured:**
   - Visit: http://localhost:3001/api/auth/signin
   - You should see the NextAuth sign-in page (or redirect)

2. **Test session endpoint:**
   - Visit: http://localhost:3001/api/auth/session
   - Should return `{"user":null}` (no user logged in)

## Step 7: Verify Project Structure

Check that all files are in place:

```bash
# Check core files exist
ls -la lib/mongodb.ts
ls -la lib/r2.ts
ls -la lib/auth/config.ts
ls -la lib/db/init-indexes.ts

# Check types exist
ls -la lib/types/*.ts

# Check API route exists
ls -la app/api/auth/[...nextauth]/route.ts
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

