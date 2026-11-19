/** Local encrypted picture lifecycle fixtures; never an online media provider. */
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,writeFileSync,unlinkSync} from 'node:fs';
import path from 'node:path';
import {deflateSync} from 'node:zlib';
import {db} from './db';
import {hasRbacPermission} from '../lib/security/rbac-permissions';
import {uploadItemPicture,readItemPicture,claimItemPictures,deleteUnattachedPicture,type PictureTestTransport} from '../services/media/picture.service';
type Actor={organizationId:string;actorId:string;actorPermissions:string[]};
const orgs=['synth12_douala','synth12_yaounde','synth12_bafoussam'];
const sha=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex');
function ensure(value:unknown,message:string):asserts value{if(!value)throw Error(message);}
function png(marker:string){
 // A real RGB PNG with valid chunk CRCs and a labelled synthetic checker pattern.
 const chunk=(kind:string,data:Buffer)=>{const body=Buffer.concat([Buffer.from(kind),data]);let crc=0xffffffff;
  for(const byte of body){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
  const length=Buffer.alloc(4),checksum=Buffer.alloc(4);length.writeUInt32BE(data.length);checksum.writeUInt32BE((crc^0xffffffff)>>>0);return Buffer.concat([length,body,checksum]);};
 const header=Buffer.alloc(13);header.writeUInt32BE(16,0);header.writeUInt32BE(16,4);header[8]=8;header[9]=2;
 const pixels=Buffer.alloc(16*(1+16*3));for(let y=0;y<16;y++)for(let x=0;x<16;x++){const i=y*49+1+x*3,on=(Math.floor(x/4)+Math.floor(y/4))%2===0;pixels[i]=on?36:224;pixels[i+1]=on?88:180;pixels[i+2]=on?132:48;}
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('tEXt',Buffer.from('Fixture\0SYNTHETIC TEST ONLY '+marker)),chunk('IDAT',deflateSync(pixels)),chunk('IEND',Buffer.alloc(0))]);
}
export async function seedRemainingPictures(org:string,actors:Record<string,Actor>,out:string){
 const {OUT,assertManifestTarget}=require('../scripts/disposable-business-dataset.cjs');
 ensure(process.env.NODE_ENV==='test'&&orgs.includes(org)&&path.resolve(out)===path.resolve(OUT),'Owned picture fixture required');
 const manifest=JSON.parse(readFileSync(path.join(out,'manifest.json'),'utf8')),url=new URL(process.env.DATABASE_URL||'');
 ensure(['localhost','127.0.0.1','[::1]'].includes(url.hostname)&&manifest.status==='schema-verified'&&manifest.target.database==='stoquify_replay_dataset_20261028_01','Owned local database required');
 ensure(manifest.schemaSha256===sha(readFileSync('prisma/schema.prisma')),'Picture fixture schema changed');assertManifestTarget(url,manifest);
 ensure((await db.$queryRaw<Array<{name:string}>>`SELECT current_database() AS name`)[0].name===manifest.target.database,'Picture fixture database mismatch');
 const owner=actors.owner;ensure(owner?.organizationId===org&&hasRbacPermission(owner.actorPermissions,'inventory.items.update'),'Scoped inventory picture writer required');
 const actualOwner=await db.user.findUniqueOrThrow({where:{id:owner.actorId}});ensure(actualOwner.organizationId===org&&actualOwner.isActive,'Usable picture owner required');
 const folder=path.resolve('.seed-artifacts/disposable-dataset-2026-10-28/picture-objects',org);mkdirSync(folder,{recursive:true});
 const documents=path.join(out,'synthetic-documents');mkdirSync(documents,{recursive:true});
 const retained=(file:string,bytes:Buffer|string)=>{const content=Buffer.from(bytes);if(existsSync(file))ensure(readFileSync(file).equals(content),'Retained picture evidence changed: '+path.basename(file));else writeFileSync(file,content);};
 const objectPath=(id:string,extension:string)=>{ensure(/^[a-f0-9-]{36}$/.test(id),'Invalid local picture object identifier');const result=path.resolve(folder,id+extension);ensure(path.dirname(result)===folder,'Local picture object escaped owned folder');return result;};
 let tamperId:string|null=null;
 const transport:PictureTestTransport={kind:'local-test',
  async put(id,bytes){ensure(!existsSync(objectPath(id,'.deleted.json')),'Deleted local picture cannot be resurrected');const target=objectPath(id,'.bin');retained(target,Buffer.from(bytes));return{byteLength:bytes.length,sha256:sha(readFileSync(target))};},
  async get(id){const target=objectPath(id,'.bin');ensure(!existsSync(objectPath(id,'.deleted.json'))&&existsSync(target),'Local picture is unavailable');const bytes=Buffer.from(readFileSync(target));if(id===tamperId)bytes[0]^=1;return new Response(new Uint8Array(bytes));},
  async remove(id){const target=objectPath(id,'.bin'),tombstone=objectPath(id,'.deleted.json');if(!existsSync(tombstone)){ensure(existsSync(target),'Local delete requires its persisted object');const bytes=readFileSync(target);retained(tombstone,JSON.stringify({id,organizationId:org,ciphertextSha256:sha(bytes),byteLength:bytes.length,deleted:true},null,2)+'\n');}if(existsSync(target))unlinkSync(target);return true;},
 };
 const deny=async(fn:()=>Promise<unknown>,code:string)=>{let denied=false;try{await fn();}catch(error){ensure((error as {code?:string}).code===code,'Picture denial used unexpected error: '+String((error as Error).message));denied=true;}ensure(denied,'Picture negative scenario unexpectedly succeeded');};
 const load=async(purpose:'attached'|'orphan')=>{
  const bytes=png(org+':'+purpose),name=`${org}-remaining-picture-${purpose}.png`,digest=sha(bytes);retained(path.join(documents,name),bytes);
  const found=await db.pictureAsset.findMany({where:{organizationId:org,createdById:owner.actorId,sha256:digest}});ensure(found.length<=1,'Duplicate local picture fixture detected');
  let asset=found[0];if(!asset){const reference=await uploadItemPicture(new File([new Uint8Array(bytes)],name,{type:'image/png'}),org,owner.actorId,transport);asset=await db.pictureAsset.findUniqueOrThrow({where:{id:reference.slice('/api/media/'.length)}});}
  ensure(asset.providerKey==='local-test:'+asset.id&&asset.providerUrl==='local-test-picture:'+asset.id&&asset.mimeType==='image/png'&&asset.byteLength===bytes.length,'Retained local picture identity changed');
  return{asset,bytes,name};
 };
 const attached=await load('attached');ensure(attached.asset.status==='ready','Claimed picture must remain ready');
 const reference='/api/media/'+attached.asset.id;
 const roundTrip=await readItemPicture(attached.asset.id,org,transport);ensure(roundTrip.mimeType==='image/png'&&Buffer.from(roundTrip.bytes).equals(attached.bytes),'Picture plaintext round trip differs');
 const foreign=orgs.find(id=>id!==org)!;
 await deny(()=>readItemPicture(attached.asset.id,foreign,transport),'NOT_FOUND');
 await deny(()=>db.$transaction(tx=>claimItemPictures(tx,foreign,[reference])),'BUSINESS_RULE_VIOLATION');
 tamperId=attached.asset.id;try{await deny(()=>readItemPicture(attached.asset.id,org,transport),'INTERNAL_ERROR');}finally{tamperId=null;}
 await deny(()=>readItemPicture(attached.asset.id,org),'INTERNAL_ERROR'); // No default network request accepts a local locator.
 await deny(()=>uploadItemPicture(new File([Buffer.from('not an image at all')],'bad.png',{type:'image/png'}),org,owner.actorId,transport),'BUSINESS_RULE_VIOLATION');
 if(!attached.asset.attachedAt)await db.$transaction(tx=>claimItemPictures(tx,org,[reference]));
 await deny(()=>deleteUnattachedPicture(reference,org,owner.actorId,transport),'NOT_FOUND');
 const orphan=await load('orphan');ensure(['ready','deleted'].includes(orphan.asset.status)&&!orphan.asset.attachedAt,'Orphan picture has unexpected state');
 if(orphan.asset.status==='ready')ensure(Buffer.from((await readItemPicture(orphan.asset.id,org,transport)).bytes).equals(orphan.bytes),'Orphan image plaintext differs');
 await deleteUnattachedPicture('/api/media/'+orphan.asset.id,org,owner.actorId,transport);
 await deleteUnattachedPicture('/api/media/'+orphan.asset.id,org,owner.actorId,transport); // Actual idempotent deletion, no repeated provider call.
 await deny(()=>readItemPicture(orphan.asset.id,org,transport),'NOT_FOUND');
 const describe=async(fixture:typeof attached)=>{
  const asset=await db.pictureAsset.findUniqueOrThrow({where:{id:fixture.asset.id}}),deleted=asset.status==='deleted';
  const tombstone=deleted?JSON.parse(readFileSync(objectPath(asset.id,'.deleted.json'),'utf8')):null;
  ensure(deleted?!existsSync(objectPath(asset.id,'.bin')):!!asset.attachedAt,'Picture lifecycle final state differs');
  return{id:asset.id,reference:'/api/media/'+asset.id,providerKey:asset.providerKey,providerLocator:asset.providerUrl,plaintextFile:'synthetic-documents/'+fixture.name,plaintextSha256:asset.sha256,byteLength:asset.byteLength,
   ciphertextFile:path.relative(process.cwd(),objectPath(asset.id,'.bin')).split(path.sep).join('/'),ciphertextSha256:deleted?tombstone.ciphertextSha256:sha(readFileSync(objectPath(asset.id,'.bin'))),status:asset.status,attachedAt:asset.attachedAt?.toISOString()??null,
   tombstoneFile:deleted?path.relative(process.cwd(),objectPath(asset.id,'.deleted.json')).split(path.sep).join('/'):null};
 };
 const receipt={version:1,classification:'SYNTHETIC_TEST_ONLY',organizationId:org,storageMode:'LOCAL_TEST_TRANSPORT_ONLY',externalCommunicationPerformed:false,catalogItemLinked:false,
  attachmentMeaning:'claimItemPictures reservation only; no item or ordinary application media route is linked',attached:await describe(attached),orphan:await describe(orphan),
  checks:{roundTrip:true,wrongTenantReadDenied:true,wrongTenantClaimDenied:true,tamperDenied:true,attachedDeleteDenied:true,orphanDeleted:true,deletedReadDenied:true,invalidMimeDenied:true,defaultTransportDenied:true}};
 retained(path.join(out,org+'-remaining-pictures.json'),JSON.stringify(receipt,null,2)+'\n');
 return receipt;
}
