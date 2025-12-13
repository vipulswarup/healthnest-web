# Deployment Guide

This guide covers free, serverless deployment options with CI/CD for HealthNest Web.

## Recommended Options

### 1. Vercel (Recommended) ⭐

**Why Vercel:**
- Created by the Next.js team - best Next.js support
- Free Hobby plan with generous limits
- Automatic CI/CD from Git (GitHub, GitLab, Bitbucket)
- Zero-config serverless functions
- Edge network for fast global performance
- Built-in environment variable management
- Preview deployments for every PR

**Free Tier Limits:**
- 100GB bandwidth/month
- Unlimited serverless function executions
- 100GB-hours serverless function execution time
- Automatic SSL certificates

**Setup Steps:**
1. Push your code to GitHub/GitLab/Bitbucket
2. Go to [vercel.com](https://vercel.com) and sign up
3. Click "New Project" and import your repository
4. Vercel auto-detects Next.js - no config needed
5. Add environment variables in project settings
6. Deploy!

**Environment Variables to Set:**
- `MONGODB_URI`
- `MONGODB_DB_NAME`
- `NEXTAUTH_URL` (auto-set by Vercel, but verify)
- `NEXTAUTH_SECRET`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_PUBLIC_URL` (optional)
- `GOOGLE_CLIENT_ID` (optional)
- `GOOGLE_CLIENT_SECRET` (optional)

**Custom Domain:**
- Add your domain in Project Settings → Domains
- Vercel automatically configures SSL

---

### 2. Cloudflare Pages

**Why Cloudflare Pages:**
- Excellent free tier
- Global CDN with edge computing
- Integrates well with Cloudflare R2 (you're already using it)
- CI/CD from Git
- Free SSL and DDoS protection

**Free Tier Limits:**
- Unlimited requests
- 500 builds/month
- Unlimited bandwidth
- 100,000 requests/day for Workers

**Setup Steps:**
1. Push code to GitHub/GitLab
2. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
3. Navigate to Workers & Pages → Create Application → Pages
4. Connect your Git repository
5. Build settings:
   - Framework preset: Next.js
   - Build command: `npm run build`
   - Build output directory: `.next`
6. Add environment variables
7. Deploy!

**Note:** Cloudflare Pages uses a different build system. You may need to use `@cloudflare/next-on-pages` adapter.

---

### 3. Netlify

**Why Netlify:**
- Great free tier
- Excellent CI/CD
- Serverless functions included
- Easy environment variable management

**Free Tier Limits:**
- 100GB bandwidth/month
- 300 build minutes/month
- 125,000 serverless function invocations/month

**Setup Steps:**
1. Push code to GitHub/GitLab/Bitbucket
2. Go to [netlify.com](https://netlify.com) and sign up
3. Click "New site from Git"
4. Connect repository
5. Build settings:
   - Build command: `npm run build`
   - Publish directory: `.next`
6. Add environment variables
7. Deploy!

**Note:** Netlify requires `@netlify/plugin-nextjs` for optimal Next.js support.

---

## CI/CD Configuration

All platforms above support automatic deployments from Git. Here's how they work:

### Automatic Deployments
- **Production:** Every push to `main`/`master` branch
- **Preview:** Every pull request gets a preview URL
- **Rollback:** One-click rollback to previous deployments

### Manual Deployment
- Trigger deployments from dashboard
- Deploy specific branches/commits

---

## Recommended: Vercel Setup

Vercel is the best choice for Next.js apps. Here's a quick setup:

### 1. Verify Root Directory

In Vercel Dashboard → Project Settings → General:
- **Root Directory**: Leave empty (defaults to repository root)
- If your `package.json` is in a subdirectory, set Root Directory to that subdirectory

### 2. Create `vercel.json` (optional - usually not needed)

Vercel auto-detects Next.js, but if you need custom config:

```json
{
  "framework": "nextjs"
}
```

### 2. Environment Variables

Set these in Vercel Dashboard → Project Settings → Environment Variables:

**Production:**
- All required env vars listed above

**Preview/Development:**
- Same variables (or use different MongoDB database for testing)

### 3. Build Settings

Vercel auto-detects Next.js. Verify these settings:

**In Vercel Dashboard → Project Settings → General:**
- **Root Directory**: Leave empty (or set if package.json is in subdirectory)
- **Framework Preset**: Should auto-detect as "Next.js"
- **Build Command**: `npm run build` (auto-detected)
- **Output Directory**: `.next` (auto-detected)
- **Install Command**: `npm install` (auto-detected)

**If Next.js is not detected:**
1. Check that `package.json` is in the root directory (or set Root Directory correctly)
2. Verify `"next"` is in `dependencies` (not just `devDependencies`)
3. Try removing `vercel.json` if it exists - let Vercel auto-detect
4. Re-import the project if issues persist

### 4. Custom Domain

1. Go to Project Settings → Domains
2. Add your domain
3. Update DNS records as instructed
4. SSL is automatic

---

## Database Considerations

### MongoDB Atlas
- Works from anywhere (cloud-hosted)
- Whitelist Vercel IPs or use 0.0.0.0/0 for serverless (less secure but works)
- Better: Use MongoDB Atlas IP Access List with Vercel's IP ranges

### R2 Storage
- Already cloud-hosted, works from anywhere
- No changes needed

---

## Post-Deployment Checklist

- [ ] All environment variables set
- [ ] MongoDB connection tested
- [ ] R2 file uploads working
- [ ] Authentication working (NextAuth)
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active
- [ ] Database indexes initialized (`npm run init-db`)
- [ ] Test user registration/login
- [ ] Test file uploads
- [ ] Monitor deployment logs for errors

---

## Troubleshooting

### "404 NOT_FOUND" on Home Page

**Problem:** Home page shows 404 error after deployment.

**Step-by-Step Debugging:**

1. **Check Vercel Build Logs**
   - Go to Vercel Dashboard → Your Project → Deployments
   - Click on latest deployment → "Build Logs" tab
   - Look for errors during build
   - Verify build completes successfully (should see "Build Completed")

2. **Verify Critical Environment Variables**
   - Go to Vercel Dashboard → Project Settings → Environment Variables
   - **CRITICAL:** Ensure `NEXTAUTH_SECRET` is set
     - Generate: `openssl rand -base64 32`
     - If missing, NextAuth will fail and app won't work
     - This is the #1 cause of 404 errors
   - **CRITICAL:** Ensure `NEXTAUTH_URL` matches your production URL
     - Format: `https://your-app.vercel.app` (no trailing slash)
     - Vercel auto-sets this, but verify it's correct
   - Verify `MONGODB_URI` is set correctly

3. **Check Root Directory**
   - Go to Vercel Dashboard → Project Settings → General
   - **Root Directory:** Should be empty (if `package.json` is at repo root)
   - **Framework Preset:** Should show "Next.js"
   - **Build Command:** Should be `npm run build` (or auto-detected)
   - **Output Directory:** Should be `.next` (or auto-detected)

4. **Test Build Locally**
   ```bash
   npm run build
   npm run start
   ```
   - Visit `http://localhost:3001`
   - If it works locally but not on Vercel, it's an environment/config issue

5. **Check Runtime Logs**
   - Go to Vercel Dashboard → Your Project → Functions
   - Check logs for runtime errors
   - Look for:
     - "NEXTAUTH_SECRET is not set"
     - MongoDB connection errors
     - NextAuth initialization errors

6. **Verify Page Structure**
   - Ensure `app/page.tsx` exists and exports default component
   - Check `app/layout.tsx` exists
   - Verify no syntax errors in these files

**Most Common Fix:**
The #1 cause is missing `NEXTAUTH_SECRET`. Set it in Vercel environment variables and redeploy.

**Quick Fix Checklist:**
- [ ] `NEXTAUTH_SECRET` is set in Vercel environment variables
- [ ] `NEXTAUTH_URL` matches production URL (check auto-set value)
- [ ] Build completes successfully (check build logs)
- [ ] Root Directory is empty or correct
- [ ] `app/page.tsx` exists and exports default component

### "No Next.js version detected"

**Problem:** Vercel can't detect Next.js framework.

**Solutions:**
1. Check Root Directory setting in Vercel (should be empty or correct subdirectory)
2. Ensure `package.json` has `"next"` in dependencies (not devDependencies)
3. Verify `vercel.json` doesn't override framework detection incorrectly
4. Try removing `vercel.json` temporarily to let auto-detection work
5. Re-import the project in Vercel

### Build Errors

**Common issues:**
- Missing environment variables → Add them in Vercel project settings
- TypeScript errors → Fix locally first, then redeploy
- Missing dependencies → Check `package.json` includes all required packages
- MongoDB connection → Verify IP whitelist includes Vercel IPs (or use `0.0.0.0/0`)

### Runtime Errors

**Check function logs:**
1. Go to Vercel Dashboard → Your Project → Functions
2. Click on a function → View Logs
3. Look for:
   - Environment variable access errors
   - Database connection timeouts
   - API route errors

**Common fixes:**
- Verify all environment variables are set
- Check MongoDB Atlas IP whitelist
- Verify API routes are correctly structured

---

## Monitoring & Analytics

### Vercel Analytics (Free)
- Built-in analytics dashboard
- Real-time performance metrics
- Error tracking

### Other Free Options
- Sentry (error tracking)
- Google Analytics
- Vercel Speed Insights

---

## Cost Comparison

| Platform | Free Tier | Best For |
|----------|-----------|----------|
| **Vercel** | Excellent | Next.js apps (recommended) |
| **Cloudflare Pages** | Excellent | Apps using Cloudflare services |
| **Netlify** | Good | General web apps |
| **Railway** | Limited | Apps needing persistent storage |
| **Render** | Limited | Traditional apps |

---

## Recommendation

**Use Vercel** - It's the best choice for Next.js because:
1. Made by Next.js creators
2. Zero configuration needed
3. Best performance optimizations
4. Excellent free tier
5. Automatic CI/CD
6. Preview deployments
7. Easy environment variable management

