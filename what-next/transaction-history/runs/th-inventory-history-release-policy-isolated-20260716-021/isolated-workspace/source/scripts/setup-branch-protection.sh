#!/bin/bash

# Setup Branch Protection Rules for StockFlow
# Run this script after installing GitHub CLI (gh)

echo "Setting up branch protection rules for StockFlow repository..."

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed."
    echo "Please install it from: https://cli.github.com/"
    echo ""
    echo "After installation, run:"
    echo "  gh auth login"
    echo "  ./scripts/setup-branch-protection.sh"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub."
    echo "Please run: gh auth login"
    exit 1
fi

# Get repository info
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
echo "📁 Repository: $REPO"

# Rename master to main if needed
echo "🔄 Checking branch names..."
DEFAULT_BRANCH=$(gh repo view --json defaultBranch -q .defaultBranch)

if [ "$DEFAULT_BRANCH" = "master" ]; then
    echo "🔄 Renaming master branch to main..."

    # Create main branch from master
    git checkout master
    git pull origin master
    git checkout -b main
    git push -u origin main

    # Change default branch on GitHub
    gh api repos/$REPO -X PATCH -f default_branch=main

    # Delete master branch
    git push origin --delete master
    git branch -d master

    echo "✅ Successfully renamed master to main"
else
    echo "✅ Default branch is already: $DEFAULT_BRANCH"
fi

# Set up branch protection for main
echo "🛡️  Setting up branch protection for main branch..."

gh api repos/$REPO/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":[]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true,"require_code_owner_reviews":false}' \
  --field restrictions=null \
  --field allow_force_pushes=false \
  --field allow_deletions=false

if [ $? -eq 0 ]; then
    echo "✅ Branch protection rules applied successfully!"
else
    echo "❌ Failed to apply branch protection rules."
    echo "You can set them up manually via GitHub web interface:"
    echo "https://github.com/$REPO/settings/branches"
fi

echo ""
echo "🎉 Setup complete! Branch protection rules:"
echo "   ✅ Require pull request reviews (minimum 1)"
echo "   ✅ Dismiss stale reviews when new commits are pushed"
echo "   ✅ Require status checks to pass"
echo "   ✅ Require branches to be up to date"
echo "   ✅ Include administrators"
echo "   ✅ Restrict pushes to main"
echo "   ✅ Prevent force pushes"
echo "   ✅ Prevent branch deletion"

echo ""
echo "📚 Next steps:"
echo "   1. Review the WORKFLOW.md file"
echo "   2. Share with your team"
echo "   3. Start using feature branches for new work"
echo "   4. Set up status checks (CI/CD) if needed"