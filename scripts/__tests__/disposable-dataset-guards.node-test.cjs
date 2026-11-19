const {test}=require('node:test'),assert=require('node:assert/strict');
const {targetFor,redact,assertManifestTarget}=require('../disposable-business-dataset.cjs');
test('rejects operational, remote and matching source databases',()=>{
 for(const name of ['stoquify','postgres','stoquify_replay_other','../test'])assert.throws(()=>targetFor(name,'postgresql://test:test@localhost/current'));
 assert.throws(()=>targetFor('stoquify_replay_dataset_test','postgresql://test:test@remote.example.test/current'));
 assert.throws(()=>targetFor('stoquify_replay_dataset_test','postgresql://test:test@localhost/stoquify_replay_dataset_test'));
});
test('constructs a distinct disposable target and removes source options',()=>{
 const u=targetFor('stoquify_replay_dataset_test','postgresql://test:test@localhost/current?schema=other');
 assert.equal(u.pathname,'/stoquify_replay_dataset_test');assert.equal(u.searchParams.get('schema'),'public');
});
test('redacts credentials in database connection errors',()=>assert.equal(redact('failed postgresql://someone:secret@localhost/db'),'failed [REDACTED_DATABASE_URL]'));
test('pins host, port, database and schema to retained ownership evidence',()=>{
 const u=targetFor('stoquify_replay_dataset_test','postgresql://test:test@localhost:5432/current');
 const manifest={target:{host:'localhost',port:'5432',database:'stoquify_replay_dataset_test',schema:'public'}};
 assert.doesNotThrow(()=>assertManifestTarget(u,manifest));
 for(const [key,value]of Object.entries({host:'127.0.0.1',port:'5433',database:'stoquify_replay_dataset_other',schema:'other'}))assert.throws(()=>assertManifestTarget(u,{target:{...manifest.target,[key]:value}}));
});
