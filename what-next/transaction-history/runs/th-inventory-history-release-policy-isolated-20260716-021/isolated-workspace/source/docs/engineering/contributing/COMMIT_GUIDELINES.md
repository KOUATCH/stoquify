# Commit Message Guidelines - StockFlow

## Overview

Good commit messages are essential for project maintenance, code reviews, and understanding the project history. This guide establishes standards for commit messages in the StockFlow project.

## Commit Message Format

### Basic Structure

```
type(scope): subject

body (optional)

footer (optional)
```

### Example

```
feat(inventory): add automated reorder notifications

Implement system to automatically notify managers when
inventory levels fall below reorder thresholds. Includes
email notifications and dashboard alerts.

Closes #123
```

## Commit Types

### Primary Types

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat(pos): add barcode scanning` |
| `fix` | Bug fix | `fix(auth): resolve login timeout issue` |
| `docs` | Documentation | `docs(api): update authentication guide` |
| `style` | Code style/formatting | `style(dashboard): fix indentation` |
| `refactor` | Code refactoring | `refactor(inventory): simplify calculation logic` |
| `test` | Adding/updating tests | `test(pos): add payment validation tests` |
| `chore` | Maintenance tasks | `chore(deps): update React to v18` |
| `perf` | Performance improvements | `perf(dashboard): optimize data loading` |
| `ci` | CI/CD changes | `ci: add automated testing workflow` |
| `build` | Build system changes | `build: update webpack configuration` |
| `revert` | Reverting changes | `revert: revert "feat(pos): add barcode scanning"` |

### Emergency Types

| Type | Description | Example |
|------|-------------|---------|
| `hotfix` | Critical production fix | `hotfix(security): patch authentication vulnerability` |
| `security` | Security-related changes | `security(auth): implement rate limiting` |

## Scope Guidelines

### Common Scopes for StockFlow

| Scope | Description | Example |
|-------|-------------|---------|
| `inventory` | Inventory management | `feat(inventory): add stock alerts` |
| `pos` | Point of sale system | `fix(pos): resolve payment processing` |
| `auth` | Authentication/authorization | `feat(auth): add two-factor authentication` |
| `dashboard` | Main dashboard | `style(dashboard): improve mobile layout` |
| `analytics` | Reporting and analytics | `feat(analytics): add sales trend charts` |
| `api` | API endpoints | `fix(api): handle invalid request format` |
| `db` | Database changes | `feat(db): add inventory audit table` |
| `ui` | User interface | `style(ui): update button components` |
| `config` | Configuration | `chore(config): update environment variables` |
| `deps` | Dependencies | `chore(deps): update security packages` |

### Custom Scopes

You can create custom scopes for specific features:
- `customers` - Customer management
- `suppliers` - Supplier management
- `reports` - Report generation
- `mobile` - Mobile-specific features
- `notifications` - Notification system

## Subject Line Rules

### Do ✅

```
feat(inventory): add low stock alerts
fix(pos): resolve tax calculation error
docs(api): update endpoint documentation
refactor(auth): simplify user validation
```

### Don't ❌

```
Fixed bug                          # Too vague
feat(inventory): Add Low Stock     # Wrong capitalization
fix(pos): resolve tax calculation error.  # Period at end
feat(inventory): add low stock alerts and also update the dashboard UI  # Too long
```

### Guidelines

- **Length**: Keep under 50 characters
- **Capitalization**: Use lowercase for subject
- **Tense**: Use imperative mood ("add", not "added" or "adds")
- **Punctuation**: No period at the end
- **Be specific**: Describe what the commit does

## Body Guidelines

### When to Include a Body

Include a body when:
- The change is complex
- Multiple files are affected
- Context is needed for reviewers
- Breaking changes are introduced

### Format

```
feat(inventory): add automated reorder system

Implement comprehensive reorder system that:
- Monitors inventory levels in real-time
- Calculates optimal reorder quantities
- Sends notifications to suppliers
- Tracks order status and delivery

This replaces the manual reorder process and reduces
stockout incidents by an estimated 40%.

Breaking change: Removes legacy reorder API endpoints
/api/v1/reorder/* - use /api/v2/inventory/reorder instead

Closes #145, #167
Co-authored-by: Jane Smith <jane@example.com>
```

### Body Rules

- **Line length**: Wrap at 72 characters
- **Blank line**: Always separate body from subject
- **Explain what and why**: Not just how
- **Use bullet points**: For multiple changes
- **Reference issues**: Link to relevant tickets

## Footer Guidelines

### Breaking Changes

```
BREAKING CHANGE: Authentication API endpoints have changed

Old: POST /api/auth/login
New: POST /api/v2/auth/authenticate

Update all client applications to use new endpoints.
```

### Issue References

```
Closes #123
Fixes #456
Resolves #789
Related to #101, #102
```

### Co-authorship

```
Co-authored-by: John Doe <john@example.com>
Co-authored-by: Jane Smith <jane@example.com>
```

## Special Commit Types

### Merge Commits

```
Merge pull request #123 from feature/inventory-alerts

feat(inventory): add automated reorder notifications
```

### Release Commits

```
chore(release): bump version to 1.2.0

- Add inventory automation features
- Fix POS calculation bugs
- Update dashboard UI
- Security improvements
```

### Initial Commits

```
feat: initial project setup

- Configure Next.js application
- Set up Prisma database
- Add authentication system
- Create basic project structure
```

## Commit Frequency

### Best Practices

- **Commit often**: Small, logical changes
- **Atomic commits**: One feature/fix per commit
- **Complete commits**: Don't break the build
- **Test before commit**: Ensure tests pass

### Good Examples

```
feat(auth): add user registration form
feat(auth): implement email verification
feat(auth): add password reset functionality
test(auth): add registration validation tests
```

### Bad Example

```
feat(auth): add complete authentication system
# This should be broken into multiple commits
```

## Pre-commit Checklist

Before committing, ensure:

- [ ] Code compiles without errors
- [ ] Tests pass locally
- [ ] Code follows project style guide
- [ ] No debugging code or console.logs
- [ ] No sensitive information (API keys, passwords)
- [ ] Commit message follows guidelines
- [ ] Changes are atomic and focused

## Tools and Automation

### Recommended Tools

1. **Commitizen** - Interactive commit message tool
   ```bash
   npm install -g commitizen
   npm install -g cz-conventional-changelog
   ```

2. **Husky** - Git hooks for validation
   ```bash
   npm install --save-dev husky
   ```

3. **Commitlint** - Lint commit messages
   ```bash
   npm install --save-dev @commitlint/cli @commitlint/config-conventional
   ```

### Git Aliases

Add to your `.gitconfig`:

```ini
[alias]
    cm = commit -m
    ca = commit -am
    cf = commit --fixup
    cs = commit -S -m  # Signed commit
```

## Examples by Feature Area

### Inventory Management

```bash
feat(inventory): add real-time stock tracking
fix(inventory): resolve negative stock calculation
refactor(inventory): optimize stock lookup queries
test(inventory): add stock adjustment unit tests
```

### POS System

```bash
feat(pos): implement contactless payment
fix(pos): resolve receipt printing timeout
style(pos): improve checkout UI layout
perf(pos): optimize transaction processing
```

### Dashboard

```bash
feat(dashboard): add sales analytics widgets
fix(dashboard): resolve mobile responsiveness
style(dashboard): update color scheme
refactor(dashboard): modularize chart components
```

### Authentication

```bash
feat(auth): add two-factor authentication
fix(auth): resolve session timeout handling
security(auth): implement rate limiting
test(auth): add login attempt validation
```

## Common Mistakes to Avoid

### ❌ Bad Commits

```bash
# Too vague
git commit -m "fix bug"
git commit -m "update code"
git commit -m "changes"

# Wrong format
git commit -m "Fixed the POS bug"  # Wrong tense
git commit -m "feat: Add inventory"  # Wrong capitalization
git commit -m "inventory: add alerts"  # Missing type

# Too broad
git commit -m "feat: update everything"
git commit -m "fix: multiple bugs"
```

### ✅ Good Commits

```bash
git commit -m "fix(pos): resolve tax calculation rounding error"
git commit -m "feat(inventory): add low stock notification system"
git commit -m "refactor(auth): extract validation logic to separate module"
git commit -m "test(dashboard): add analytics widget unit tests"
```

## Troubleshooting

### Fixing Recent Commits

```bash
# Fix last commit message
git commit --amend -m "corrected message"

# Add files to last commit
git add forgotten-file.js
git commit --amend --no-edit

# Split a large commit
git reset HEAD~1
git add file1.js
git commit -m "feat(inventory): add stock tracking"
git add file2.js
git commit -m "feat(inventory): add reorder alerts"
```

### Interactive Rebase

```bash
# Clean up commit history before pushing
git rebase -i HEAD~3

# Options:
# pick = keep commit
# reword = change commit message
# squash = combine with previous commit
# drop = remove commit
```

## Review Process

### For Authors

Before submitting PR:
- [ ] All commits follow message format
- [ ] Commit history is clean and logical
- [ ] No "WIP" or "debug" commits
- [ ] Related commits are grouped

### For Reviewers

Check for:
- [ ] Clear, descriptive commit messages
- [ ] Logical commit structure
- [ ] No merge commits (use rebase)
- [ ] Appropriate scope and type usage

---

**Remember**: Good commit messages are love letters to your future self and your teammates. Make them count! 💝