const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const THREE=require('../three.min.js');
const context={THREE,window:{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../exhaust-fx.js'),'utf8'),context);
const body=new THREE.Group(),fx=context.window.buildNitroExhaust(body);
assert.equal(fx.group.parent,body);assert.equal(fx.jets.length,4);
const s={mode:'playing',boosting:true,braking:false,nitro:80,speed:240};fx.update(s,1);assert(fx.group.visible);
for(const jet of fx.jets){assert(jet.scale.z>0&&jet.scale.z<1.3);assert.equal(jet.material.depthWrite,false);assert.equal(jet.castShadow,false);for(const v of jet.geometry.attributes.position.array)assert(Number.isFinite(v));}
const first=fx.jets[0].scale.z;fx.update(s,1.1);assert.notEqual(fx.jets[0].scale.z,first,'Flames flicker');
for(const patch of [{boosting:false},{braking:true},{nitro:0},{mode:'paused'},{mode:'crashed'},{mode:'menu'},{mode:'countdown'}]){fx.update({...s,...patch},2);assert.equal(fx.group.visible,false,'Flames shut off when boost is unavailable');}
console.log('PASS: four attached exhaust jets, bounded flicker and boost/brake/pause/crash cutoffs.');
