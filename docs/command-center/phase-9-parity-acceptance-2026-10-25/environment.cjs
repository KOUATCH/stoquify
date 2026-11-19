const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../..'),pointer=path.join(root,'.codex-tmp/command-center-phase9-current.json');
const previous=require('../phase-8-blocker-fixes-2026-10-25/environment.cjs');
function state(){const s=JSON.parse(fs.readFileSync(pointer));if(path.dirname(s.work)!==path.join(root,'.codex-tmp')||!/^phase9-[a-f0-9]{10}$/.test(path.basename(s.work)))throw Error('Unexpected Phase 9 path');const owner=previous.state();if(s.cluster!==owner.cluster||s.cluster!==path.join(owner.work,'cluster-retry'))throw Error('Unexpected cluster owner');return {...s,...JSON.parse(fs.readFileSync(path.join(s.work,'private.json')))}}
module.exports={root,pointer,state,environment:previous.environment,redact:previous.redact};
