const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),c=require('./af16-verification-context.cjs')
const destination=path.join(c.output,'documents-before.json');if(fs.existsSync(destination))throw Error('Preserve existing baseline')
const rows=[];function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory())walk(f);else if(e.name.endsWith('.md'))rows.push({file:path.relative(c.root,f).replaceAll('\\','/'),sha256:crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')})}}
walk(path.join(c.root,'docs/accounting-firms'));fs.writeFileSync(destination,JSON.stringify(rows,null,2));console.log('Retained '+rows.length+' Markdown hashes.')
