// Reuse the already verified synthetic receiving fixture without executing its test suite.
const fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync('services/inventory/__tests__/cross-workflow.phase3.postgres.test.ts','utf8');
const imports=source.slice(0,source.indexOf('const evidence:'));
const helpers=source.slice(source.indexOf('async function fixture()'),source.indexOf('async function snapshot(')).replace('async function fixture()','export async function fixture()').replace('async function approvedOrder(','export async function approvedOrder(').replace('async function receivingCommand(','export async function receivingCommand(');
fs.writeFileSync('services/inventory/__tests__/workflow-closure-ap.fixture.ts',imports+helpers);
