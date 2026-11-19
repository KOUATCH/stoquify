const {ensureClient}=require('../../../scripts/ensure-prisma-client');
const code=ensureClient({spawnSync:()=>{throw Error('Client incomplete: automatic generation/application-config fallback is forbidden in this verification')}});
if(code!==0)throw Error('Client verification failed');
const {Prisma}=require('@prisma/client'),model=Prisma.dmmf.datamodel.models.find(m=>m.name==='HrisWorkSchedule');
for(const name of ['revision','supersedesScheduleId','shiftPlan'])if(!model.fields.some(field=>field.name===name))throw Error('Missing generated field '+name);
console.log('Schema tokens, required generated files, installed client version, engine byte hash and schedule field metadata verified. Existing locked DLL retained unchanged.');
