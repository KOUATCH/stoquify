'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const c=require('../candidate-context.json');
const {NextURL}=require(path.join(c.source,'node_modules/next/dist/server/web/next-url.js'));
const {getRelativeURL}=require(path.join(c.source,'node_modules/next/dist/shared/lib/router/utils/relativize-url.js'));
test('reproduces IP-to-localhost normalization that makes a rewrite external',()=>{const initial='https://127.0.0.1:3193/uploads/p04-upload-a/sentinel.png';const target=new NextURL(initial);target.pathname='/api/uploads/p04-upload-a/sentinel.png';assert.equal(target.hostname,'localhost');assert.equal(getRelativeURL(target.toString(),initial),'https://localhost:3193/api/uploads/p04-upload-a/sentinel.png');});
test('consistent localhost origin keeps the exact guarded rewrite internal',()=>{for(const protocol of ['https','http']){const initial=protocol+'://localhost:3193/uploads/p04-upload-a/sentinel.png';const target=new NextURL(initial);target.pathname='/api/uploads/p04-upload-a/sentinel.png';assert.equal(getRelativeURL(target.toString(),initial),'/api/uploads/p04-upload-a/sentinel.png');}});
