#!/bin/bash

# Migration script to extract healthnest-web into separate GitHub repository
# Usage: ./migrate.sh <new-repo-url>
# Example: ./migrate.sh git@github.com:vipulswarup/healthnest-web.git

set -e

if [ -z "$1" ]; then
    echo "Error: Please provide the new repository URL"
    echo "Usage: ./migrate.sh <new-repo-url>"
    echo "Example: ./migrate.sh git@github.com:vipulswarup/healthnest-web.git"
    exit 1
fi

NEW_REPO_URL=$1

echo "🚀 Starting migration to separate repository..."
echo "📦 New repository URL: $NEW_REPO_URL"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "next.config.ts" ]; then
    echo "❌ Error: This doesn't look like the healthnest-web directory"
    echo "   Please run this script from the healthnest-web directory"
    exit 1
fi

# Check if .git exists
if [ -d ".git" ]; then
    echo "📋 Current git remote:"
    git remote -v
    echo ""
    read -p "⚠️  This will remove the current git connection. Continue? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Migration cancelled"
        exit 1
    fi
fi

# Remove old git connection
echo "🗑️  Removing old git connection..."
rm -rf .git

# Initialize new git repository
echo "📦 Initializing new git repository..."
git init

# Add all files
echo "📝 Adding files..."
git add .

# Create initial commit
echo "💾 Creating initial commit..."
git commit -m "Initial commit: Extract healthnest-web from HealthNest monorepo

- Moved from HealthNest monorepo to standalone repository
- Next.js web application for HealthNest
- Includes all dependencies and configuration"

# Add new remote
echo "🔗 Adding new remote repository..."
git remote add origin "$NEW_REPO_URL"

# Set main branch
echo "🌿 Setting main branch..."
git branch -M main

# Push to new repository
echo "🚀 Pushing to new repository..."
echo ""
read -p "⚠️  Ready to push to $NEW_REPO_URL. Continue? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Push cancelled. Repository is ready locally."
    echo "   Run 'git push -u origin main' when ready."
    exit 0
fi

git push -u origin main

echo ""
echo "✅ Migration complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Go to Vercel Dashboard"
echo "   2. Update project to use new repository: $NEW_REPO_URL"
echo "   3. Set Root Directory to empty (not 'healthnest-web')"
echo "   4. Verify environment variables are set"
echo "   5. Redeploy!"
echo ""

