# Migrating sanovault-web to Separate GitHub Repository

This guide will help you move `sanovault-web` into its own GitHub repository, separate from the Flutter project.

## Step 1: Create New GitHub Repository

1. Go to [GitHub](https://github.com/new)
2. Create a new repository named `sanovault-web` (or `sanovault-web-app`)
3. **DO NOT** initialize with README, .gitignore, or license (we'll bring our own)
4. Copy the repository URL (e.g., `git@github.com:vipulswarup/sanovault-web.git`)

## Step 2: Extract sanovault-web from Parent Repository

### Option A: Use the Migration Script (Recommended)

1. Create the new GitHub repository first (Step 1)
2. Run the migration script:

```bash
cd /Users/vipulswarup/coding/health-apps/SanoVault/sanovault-web
./migrate.sh git@github.com:vipulswarup/sanovault-web.git
# Replace with your actual repository URL
```

The script will:
- Remove the old git connection
- Initialize a new repository
- Create an initial commit
- Push to the new repository

### Option B: Manual Commands

Run these commands in your terminal:

```bash
# Navigate to the sanovault-web directory
cd /Users/vipulswarup/coding/health-apps/SanoVault/sanovault-web

# Remove the current git connection to parent repo
rm -rf .git

# Initialize a new git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Extract sanovault-web from SanoVault monorepo"

# Add the new remote repository
git remote add origin git@github.com:vipulswarup/sanovault-web.git
# Replace with your actual repository URL

# Push to the new repository
git branch -M main
git push -u origin main
```

## Step 3: Update Vercel Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Find your current SanoVault project
3. Go to **Project Settings** → **General**
4. Click **"Change"** next to the repository
5. Select the new `sanovault-web` repository
6. Update **Root Directory** to be empty (since the repo is now the web project root)
7. Verify **Framework Preset** shows "Next.js"
8. Click **Save**

Alternatively, create a new Vercel project:
1. Go to Vercel Dashboard → **Add New Project**
2. Import the new `sanovault-web` repository
3. Configure environment variables (copy from old project)
4. Deploy!

## Step 4: Update Environment Variables in Vercel

After connecting the new repository:
1. Go to **Project Settings** → **Environment Variables**
2. Ensure all variables are set:
   - `MONGODB_URI`
   - `MONGODB_DB_NAME`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL`
   - `R2_ACCOUNT_ID`
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`
   - `R2_BUCKET_NAME`
   - `GOOGLE_CLIENT_ID` (if using)
   - `GOOGLE_CLIENT_SECRET` (if using)

## Step 5: Remove sanovault-web from Parent Repository (Optional)

If you want to remove `sanovault-web` from the parent SanoVault repository:

```bash
# Navigate to parent repository
cd /Users/vipulswarup/coding/health-apps/SanoVault

# Remove sanovault-web directory from git tracking
git rm -r --cached sanovault-web

# Commit the removal
git commit -m "Remove sanovault-web - moved to separate repository"

# Push to parent repository
git push origin main
```

**Note:** This removes it from git tracking but keeps the local folder. If you want to delete it completely:
```bash
rm -rf sanovault-web
```

## Step 6: Verify Deployment

1. After Vercel redeploys, check the deployment logs
2. Visit your Vercel URL
3. Verify the app loads correctly
4. Test authentication and key features

## Troubleshooting

### If Vercel still shows errors:
- Check that Root Directory is empty (not `sanovault-web`)
- Verify all environment variables are set
- Check build logs for any errors

### If git push fails:
- Ensure you have write access to the new repository
- Check that the repository URL is correct
- Try using HTTPS instead of SSH if needed

### If you need to keep both repos in sync temporarily:
You can use git subtree or git submodule, but for a clean separation, it's better to fully migrate.

## Next Steps

After migration:
- Update any documentation that references the old repository structure
- Update CI/CD workflows if you have any
- Consider updating the README to reflect the new standalone structure
- Update any deployment scripts or documentation

