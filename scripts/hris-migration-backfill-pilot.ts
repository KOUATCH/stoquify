import { mkdir, writeFile } from "fs/promises";
import { dirname, resolve } from "path";

import { db } from "../prisma/db";
import {
  formatHrisMigrationBackfillPilotReport,
  generateHrisMigrationBackfillPilotPlan,
  type HrisMigrationBackfillPilotInput,
} from "../services/hris/migration-backfill-pilot.service";

type PilotMode = "report" | "fail";

function readArgs(argv: string[]) {
  const args = new Map<string, string | boolean>();
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      args.set(key, true);
      continue;
    }
    args.set(key, next);
    index += 1;
  }
  return args;
}

function stringArg(args: Map<string, string | boolean>, key: string) {
  const value = args.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function requiredArg(args: Map<string, string | boolean>, key: string) {
  const value = stringArg(args, key);
  if (!value) throw new Error(`Missing required --${key}.`);
  return value;
}

function numberArg(args: Map<string, string | boolean>, key: string) {
  const value = stringArg(args, key);
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`--${key} must be a positive integer.`);
  }
  return parsed;
}

function modeArg(args: Map<string, string | boolean>): PilotMode {
  const value = stringArg(args, "mode") ?? "report";
  if (value !== "report" && value !== "fail") {
    throw new Error("--mode must be report or fail.");
  }
  return value;
}

async function writeEvidence(path: string, contents: string) {
  const target = resolve(path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, contents, "utf8");
  return target;
}

export async function runHrisMigrationBackfillPilotCli(
  argv = process.argv.slice(2),
) {
  const args = readArgs(argv);
  const mode = modeArg(args);
  const input: HrisMigrationBackfillPilotInput = {
    organizationId: requiredArg(args, "organization-id"),
    maxEmployees: numberArg(args, "max-employees"),
    dryRun:
      args.get("mutation") !== true && stringArg(args, "dry-run") !== "false",
  };
  const plan = await generateHrisMigrationBackfillPilotPlan(input);
  const markdown = formatHrisMigrationBackfillPilotReport(plan);
  const markdownOut = stringArg(args, "out");
  const jsonOut = stringArg(args, "json-out");

  if (markdownOut) {
    const target = await writeEvidence(markdownOut, markdown);
    console.log(`Redacted HRIS migration pilot report saved to ${target}`);
  } else {
    console.log(markdown);
  }
  if (jsonOut) {
    const target = await writeEvidence(
      jsonOut,
      JSON.stringify(plan, null, 2) + "\n",
    );
    console.log(`Redacted HRIS migration pilot evidence saved to ${target}`);
  }

  return {
    plan,
    exitCode: mode === "fail" && plan.status === "BLOCKED" ? 1 : 0,
  };
}

if (require.main === module) {
  runHrisMigrationBackfillPilotCli()
    .then(({ exitCode }) => {
      process.exitCode = exitCode;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    })
    .finally(async () => {
      await db.$disconnect();
    });
}
