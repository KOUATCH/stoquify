# Git Workflow Guide - StockFlow Project

## Overview

This document outlines the Git workflow for the StockFlow retail management system. We use **GitHub Flow** - a simple, effective workflow that supports continuous deployment.

## Branch Structure

### Main Branches
- **`main`** - Production-ready code, always deployable
- **`develop`** - Integration branch for features (optional)

### Supporting Branches
- **`feature/*`** - New features or enhancements
- **`bugfix/*`** - Bug fixes
- **`hotfix/*`** - Critical production fixes
- **`chore/*`** - Maintenance tasks, dependency updates

## Workflow Process

### 1. Starting New Work

```bash
# Always start from main
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/inventory-alerts
# or
git checkout -b bugfix/pos-calculation-error
# or
git checkout -b hotfix/critical-security-fix
```

### 2. Development Cycle

```bash
# Make changes and commit regularly
git add .
git commit -m "feat: add low stock alerts to inventory dashboard"

# Push to remote
git push origin feature/inventory-alerts

# Keep feature branch updated (if long-running)
git checkout main
git pull origin main
git checkout feature/inventory-alerts
git merge main
```

### 3. Creating Pull Requests

1. Push your feature branch to GitHub
2. Create a Pull Request via GitHub UI
3. Fill out the PR template (see below)
4. Request reviews from team members
5. Address feedback and make changes
6. Merge after approval

### 4. After Merge

```bash
# Switch back to main
git checkout main
git pull origin main

# Delete local feature branch
git branch -d feature/inventory-alerts

# Delete remote branch (if not auto-deleted)
git push origin --delete feature/inventory-alerts
```

## Branch Naming Conventions

### Format: `type/short-description`

**Types:**
- `feature/` - New functionality
- `bugfix/` - Bug fixes
- `hotfix/` - Critical production fixes
- `chore/` - Maintenance, refactoring, dependencies
- `docs/` - Documentation updates

**Examples:**
```
feature/pos-session-management
feature/advanced-reporting
bugfix/inventory-calculation
bugfix/login-authentication
hotfix/critical-data-loss
chore/update-dependencies
docs/api-documentation
```

## Commit Message Guidelines

### Format: `type(scope): description`

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Formatting, missing semicolons
- `refactor` - Code refactoring
- `test` - Adding tests
- `chore` - Maintenance

**Examples:**
```
feat(inventory): add low stock alerts
fix(pos): resolve calculation rounding error
docs(api): update authentication endpoints
refactor(dashboard): improve component structure
test(auth): add login validation tests
chore(deps): update React to v18
```

## Pull Request Guidelines

### PR Title Format
```
feat(inventory): Add automated reorder notifications
fix(pos): Resolve tax calculation edge case
```

### PR Description Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No breaking changes (or documented)

## Screenshots (if applicable)
```

## Branch Protection Rules

### Main Branch Protection
- ✅ Require pull request reviews (minimum 1)
- ✅ Require status checks to pass
- ✅ Require up-to-date branches
- ✅ Include administrators
- ✅ Restrict pushes
- ✅ Allow force pushes: ❌
- ✅ Allow deletions: ❌

## Code Review Guidelines

### For Reviewers
1. **Functionality** - Does the code work as intended?
2. **Architecture** - Is the solution well-designed?
3. **Readability** - Is the code easy to understand?
4. **Testing** - Are there adequate tests?
5. **Security** - Are there any security concerns?
6. **Performance** - Any performance implications?

### Review Checklist
- [ ] Code compiles without warnings
- [ ] All tests pass
- [ ] No merge conflicts
- [ ] Follows coding standards
- [ ] Documentation updated
- [ ] Security implications considered

## Release Process

### Version Numbering (Semantic Versioning)
- **MAJOR.MINOR.PATCH** (e.g., 1.2.3)
- **MAJOR** - Breaking changes
- **MINOR** - New features (backward compatible)
- **PATCH** - Bug fixes (backward compatible)

### Release Steps
1. Create release branch: `git checkout -b release/v1.2.0`
2. Update version numbers
3. Update CHANGELOG.md
4. Create PR to main
5. After merge, create GitHub release
6. Deploy to production

## Emergency Hotfix Process

For critical production issues:

```bash
# Create hotfix from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-security-fix

# Make minimal fix
git commit -m "fix: resolve critical security vulnerability"

# Push and create PR
git push origin hotfix/critical-security-fix
# Create PR with "HOTFIX" label
# Fast-track review and merge
```

## Common Commands Reference

```bash
# Check current status
git status
git log --oneline -10

# Sync with remote
git fetch origin
git pull origin main

# View branches
git branch -a
git branch -r

# Clean up merged branches
git branch --merged main | grep -v main | xargs git branch -d

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Stash work in progress
git stash
git stash pop
```

## Troubleshooting

### Common Issues

**Merge Conflicts:**
```bash
git merge main
# Resolve conflicts in files
git add .
git commit -m "resolve merge conflicts"
```

**Accidentally committed to main:**
```bash
git reset --soft HEAD~1
git checkout -b feature/my-changes
git commit -m "move changes to feature branch"
```

**Need to update feature branch:**
```bash
git checkout feature/my-branch
git merge main
# or
git rebase main
```

## Team Guidelines

### Do's ✅
- Always work on feature branches
- Write descriptive commit messages
- Keep commits focused and atomic
- Test before pushing
- Review your own PR first
- Keep branches up to date

### Don'ts ❌
- Don't commit directly to main
- Don't force push to shared branches
- Don't commit large binary files
- Don't leave branches stale for weeks
- Don't merge without review
- Don't commit secrets or credentials

## Tools Integration

### Recommended Tools
- **GitHub Desktop** - For GUI users
- **VS Code Git** - Built-in Git support
- **GitKraken** - Advanced Git GUI
- **GitHub CLI** - Command line GitHub operations

### VS Code Extensions
- GitLens
- Git Graph
- GitHub Pull Requests

## Contact

For questions about this workflow:
- Create an issue in the repository
- Ask in team chat
- Contact the lead developer

---

**Remember:** When in doubt, ask for help. It's better to clarify the process than to create problems that need fixing later.