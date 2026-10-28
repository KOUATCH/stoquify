# Top12 Roadmap: No Prisma Reinstall Runbook

The Top12 roadmap execution is now available through a dedicated runner:

```powershell
node .\scripts\roadmap-top12-runner.js --skip-prisma
```

What this does:
- Runs the Top12 phase report + evaluation harness.
- Runs the required Top12 roadmap gates (`agent:*`, `ai:*`).
- Runs the roadmap external-input readiness check.
- Runs the Top12 roadmap tests and `typecheck`.

What it skips by default:
- `npm run prisma:validate` when `--skip-prisma` is passed.

Why this helps:
- It keeps the run focused on the roadmap control flow.
- It avoids Prisma schema validation CLI churn in environments where Prisma attempts to refresh engine binaries repeatedly.

If you still need the full Prisma-included lane:

```powershell
npm run roadmap:top12:with-prisma
```

For most local roadmap-only iterations, use:

```powershell
npm run roadmap:top12
```

