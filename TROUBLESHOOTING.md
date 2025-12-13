# Troubleshooting Deployment Issues

## 404 Error on Home Page

### Step 1: Check Vercel Build Logs

1. Go to Vercel Dashboard → Your Project → Deployments
2. Click on the latest deployment
3. Check the "Build Logs" tab for any errors

**Common Build Errors:**
- Missing environment variables
- TypeScript compilation errors
- Missing dependencies

### Step 2: Verify Environment Variables

In Vercel Dashboard → Project Settings → Environment Variables, ensure these are set:

**Critical (Required):**
- `NEXTAUTH_SECRET` - Must be set! Generate with: `openssl rand -base64 32`
- `NEXTAUTH_URL` - Should be your production URL (e.g., `https://your-app.vercel.app`)
- `MONGODB_URI` - MongoDB Atlas connection string
- `MONGODB_DB_NAME` - Database name

**If NEXTAUTH_SECRET is missing:**
- NextAuth will fail to initialize
- The app will crash on startup
- You'll see 404 or 500 errors

**If NEXTAUTH_URL is wrong:**
- NextAuth callbacks won't work
- Authentication will fail
- Redirects won't work properly

### Step 3: Check MongoDB Connection

**MongoDB Atlas IP Whitelist:**
1. Go to MongoDB Atlas → Network Access
2. Add IP Address: `0.0.0.0/0` (allows all IPs - less secure but works for serverless)
3. Or add Vercel's IP ranges (more secure)

**Test Connection:**
- Check Vercel function logs for MongoDB connection errors
- Verify `MONGODB_URI` is correct format: `mongodb+srv://user:password@cluster.mongodb.net/`

### Step 4: Verify Root Directory

In Vercel Dashboard → Project Settings → General:
- **Root Directory**: Should be empty (or correct subdirectory)
- **Framework Preset**: Should show "Next.js"
- **Build Command**: `npm run build`
- **Output Directory**: `.next`

### Step 5: Check Runtime Logs

1. Go to Vercel Dashboard → Your Project → Functions
2. Check runtime logs for errors
3. Look for:
   - Environment variable errors
   - Database connection errors
   - NextAuth initialization errors

### Step 6: Test Locally First

Before deploying, test the production build locally:

```bash
npm run build
npm run start
```

Visit `http://localhost:3001` and verify:
- Home page loads
- Redirects work
- No console errors

### Step 7: Common Issues and Fixes

**Issue: "No Next.js version detected"**
- Fix: Check Root Directory setting in Vercel
- Fix: Ensure `package.json` has `"next"` in dependencies

**Issue: "404 NOT_FOUND" on home page**
- Fix: Check `NEXTAUTH_SECRET` is set
- Fix: Verify `NEXTAUTH_URL` matches production URL
- Fix: Check build logs for compilation errors

**Issue: "MongoDB connection failed"**
- Fix: Update MongoDB Atlas IP whitelist
- Fix: Verify `MONGODB_URI` is correct
- Fix: Check MongoDB Atlas cluster is running

**Issue: "NextAuth initialization failed"**
- Fix: Set `NEXTAUTH_SECRET` environment variable
- Fix: Set `NEXTAUTH_URL` to production URL
- Fix: Check NextAuth route exists at `/api/auth/[...nextauth]`

### Step 8: Debug Checklist

- [ ] All environment variables set in Vercel
- [ ] `NEXTAUTH_SECRET` is set and valid
- [ ] `NEXTAUTH_URL` matches production domain
- [ ] MongoDB Atlas IP whitelist allows Vercel
- [ ] Root Directory is correct in Vercel
- [ ] Build completes successfully (check logs)
- [ ] No TypeScript errors in build
- [ ] All dependencies installed correctly

### Step 9: Enable Debug Logging

Add to `next.config.ts` temporarily:

```typescript
const nextConfig: NextConfig = {
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};
```

### Step 10: Check Vercel Function Logs

1. Go to Vercel Dashboard → Your Project → Functions
2. Click on any function
3. Check "Logs" tab for runtime errors
4. Look for:
   - Environment variable access errors
   - Database connection timeouts
   - NextAuth errors

## Quick Fixes

### If home page shows 404:

1. **Verify page exists:**
   - Check `app/page.tsx` exists
   - Verify it exports a default component

2. **Check environment variables:**
   ```bash
   # In Vercel Dashboard, verify these are set:
   NEXTAUTH_SECRET=your-secret-here
   NEXTAUTH_URL=https://your-app.vercel.app
   ```

3. **Redeploy:**
   - Go to Deployments tab
   - Click "Redeploy" on latest deployment
   - Or push a new commit to trigger redeploy

4. **Check build output:**
   - Look for `.next` folder in build logs
   - Verify no build errors

## Getting Help

If issues persist:
1. Check Vercel build logs
2. Check Vercel function logs
3. Test locally with `npm run build && npm run start`
4. Verify all environment variables are set
5. Check MongoDB Atlas connection
6. Verify NextAuth configuration

