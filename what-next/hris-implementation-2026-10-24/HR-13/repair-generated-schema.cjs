const fs=require('node:fs'),crypto=require('node:crypto'),path=require('node:path'),{schemaTokens}=require('../../../scripts/ensure-prisma-client');
const source=fs.readFileSync('prisma/schema.prisma','utf8'),generated=fs.readFileSync('node_modules/.prisma/client/index.js','utf8');
const inline=generated.match(/"inlineSchema":\s*("(?:[^"\\]|\\.)*")/);
if(!inline||schemaTokens(JSON.parse(inline[1]))!==schemaTokens(source))throw Error('Generator-emitted runtime schema does not match; refusing repair');
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const engine='node_modules/.prisma/client/query_engine-windows.dll.node',packaged=path.join(path.dirname(require.resolve('@prisma/engines/package.json')),'query_engine-windows.dll.node');
if(hash(engine)!==hash(packaged)||require('prisma/package.json').version!==require('@prisma/client/package.json').version)throw Error('Engine or version mismatch; refusing repair');
const types=fs.readFileSync('node_modules/.prisma/client/index.d.ts','utf8');
for(const name of ['revision','shiftPlan','supersedesScheduleId','HrisSetupReviewerGrant'])if(!types.includes(name))throw Error('Generated declarations incomplete');
const before=hash(engine);
// Generation emitted current JS/types but failed while replacing an identical
// Windows DLL before copying the schema artifact. Repair only that text copy.
fs.copyFileSync('prisma/schema.prisma','node_modules/.prisma/client/schema.prisma');
if(hash(engine)!==before)throw Error('Engine changed unexpectedly');
console.log('Copied validated schema matching generator-emitted inline schema; engine bytes were not modified.');
require('./verify-generated-client.cjs');
