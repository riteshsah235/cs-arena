const assert=require('assert');
(async()=>{
 const {backend}=require('../src/store');
 await backend.ensurePlayer('u1','A');await backend.ensurePlayer('u2','B');
 const m={key:'k1',subject:'dsa',level:'mixed',sides:[{uid:'u1',delta:16,result:'win',score:5},{uid:'u2',delta:-16,result:'loss',score:2}]};
 await Promise.all([backend.applyResult(m),backend.applyResult(m),backend.applyResult(m)]);
 const a=await backend.getPlayer('u1'),b=await backend.getPlayer('u2');
 assert.strictEqual(a.rating,1016);assert.strictEqual(a.games,1);assert.strictEqual(b.rating,984);
 console.log('idempotent+concurrent same key: applied once OK');
 await Promise.all([1,2,3,4].map((i)=>backend.applyResult({...m,key:'k'+(i+1)})));
 assert.strictEqual((await backend.getPlayer('u1')).games,5);console.log('4 distinct concurrent matches all applied OK');
})().catch(e=>{console.error('FAIL',e.message);process.exit(1)});
