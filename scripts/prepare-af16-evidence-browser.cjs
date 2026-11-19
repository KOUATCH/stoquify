const fs=require('node:fs'),path=require('node:path'),{randomBytes}=require('node:crypto'),argon2=require('argon2')
const c=require('./af16-verification-context.cjs'),{PrismaClient}=require('../.codex-tmp/af16-prisma/client')
async function main(){
 if(process.env.NODE_ENV==='production')throw Error('Production forbidden')
 const db=new PrismaClient({datasources:{db:{url:c.url('af06')}}})
 try{
  const actual=(await db.$queryRawUnsafe('SHOW data_directory'))[0].data_directory
  if(fs.realpathSync(actual).toLowerCase()!==fs.realpathSync(c.cluster).toLowerCase())throw Error('Wrong cluster')
  const password=randomBytes(24).toString('base64url'),hash=await argon2.hash(password)
  for(const role of ['manager','preparer','reviewer','owner','recipient','outsider']){
   const id='af06-'+role,user=await db.user.findUniqueOrThrow({where:{id}})
   if(user.email!==id+'@example.invalid')throw Error('Wrong synthetic actor')
   await db.user.update({where:{id},data:{password:hash,firstName:role,lastName:'Synthetic'}})
   await db.account.upsert({where:{id:id+'-credential'},create:{id:id+'-credential',accountId:id,userId:id,providerId:'credential',password:hash},update:{password:hash}})
  }
  fs.writeFileSync(path.join(c.privateRoot,'af16-evidence-browser-private.json'),JSON.stringify({url:c.url('af06'),name:c.database('af06'),password,base:'http://127.0.0.1:3166'}))
 }finally{await db.$disconnect()}
 let check=fs.readFileSync(path.join(c.root,'scripts/verify-delegated-evidence-browser.cjs'),'utf8')
 for(const [from,to] of [['af05-prisma','af16-prisma'],['af06-browser-private.json','af16-evidence-browser-private.json'],['55441','55451'],['stoquify_local_af06_browser_20261020_r1',c.database('af06')],['AF06/2026-10-20-run-01','AF16/2026-10-25-run-01/AF06']])check=check.split(from).join(to)
 check=check.replace('page.setDefaultTimeout(90000)','page.setDefaultTimeout(180000)')
 fs.writeFileSync(path.join(c.root,'scripts/af16-verify-evidence-browser.cjs'),check)
 let start=fs.readFileSync(path.join(c.root,'scripts/af16-start-browser.cjs'),'utf8')
 for(const [from,to] of [['af16-browser-private.json','af16-evidence-browser-private.json'],[c.database('af13'),c.database('af06')],['3156','3166'],['af16-next','af16-evidence-next']])start=start.split(from).join(to)
 fs.writeFileSync(path.join(c.root,'scripts/af16-start-evidence-browser.cjs'),start)
 console.log('Prepared AF16 evidence browser credentials and reviewed harness adaptations.')
}
main().catch(e=>{console.error(e.stack);process.exitCode=1})
