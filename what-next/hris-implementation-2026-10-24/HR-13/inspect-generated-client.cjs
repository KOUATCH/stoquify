const fs=require('node:fs'),{schemaTokens}=require('../../../scripts/ensure-prisma-client');
const raw=fs.readFileSync('node_modules/.prisma/client/index.js','utf8');
const match=raw.match(/"inlineSchema":\s*("(?:[^"\\]|\\.)*")/);
console.log(JSON.stringify({inlineSchemaFound:!!match,inlineSchemaMatches:!!match&&schemaTokens(JSON.parse(match[1]))===schemaTokens(fs.readFileSync('prisma/schema.prisma','utf8')),newModel:require('@prisma/client').Prisma.dmmf.datamodel.models.some(m=>m.name==='HrisSetupReviewerGrant')},null,2));
