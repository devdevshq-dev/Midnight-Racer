const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),THREE=require('../three.min.js');
const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../suspension.js'),'utf8'),context);
const state={mode:'playing',speed:160,acceleration:0,lateralAcceleration:0};
function simulate(patch,hz=120){const suspension=new context.window.RaceSuspension(),body=new THREE.Group();for(let i=0;i<hz;i++)suspension.update({...state,...patch},1/hz);suspension.apply(body,{...state,...patch});body.updateMatrix();return {suspension,body};}
function height(body,x,z){return new THREE.Vector3(x,0,z).applyMatrix4(body.matrix).y;}
let result=simulate({acceleration:6});assert(height(result.body,0,-2)>height(result.body,0,2),'Acceleration lifts front and compresses rear');
result=simulate({acceleration:-8});assert(height(result.body,0,2)>height(result.body,0,-2),'Braking lifts rear and compresses front');
result=simulate({lateralAcceleration:7});assert(height(result.body,1,0)>height(result.body,-1,0),'Right turn compresses left outside suspension');
result=simulate({lateralAcceleration:-7});assert(height(result.body,-1,0)>height(result.body,1,0),'Left turn compresses right outside suspension');
const slow=simulate({acceleration:6},30),fast=simulate({acceleration:6},120);assert(Math.abs(slow.body.rotation.x-fast.body.rotation.x)<1e-9,'Spring response is frame-rate independent');
const before=result.suspension.roll.value;result.suspension.update({...state,mode:'paused'},1);assert.equal(result.suspension.roll.value,before,'Pause freezes suspension');
for(let i=0;i<240;i++)result.suspension.update(state,1/120);assert(Math.abs(result.suspension.roll.value)<1e-6,'Body settles smoothly after load is released');
result.suspension.update({...state,mode:'countdown'},0);assert.equal(result.suspension.pitch.value,0);assert.equal(result.suspension.roll.value,0);
console.log('PASS: acceleration nose lift, braking rear lift, correct outside-wheel loading, smooth settling, pause/reset and frame-rate independence.');

const cockpitRide=new context.window.RaceSuspension(),cockpitBody=new THREE.Group();
for(let i=0;i<120;i++){cockpitRide.update({...state,camera:2,acceleration:5},1/120);cockpitRide.apply(cockpitBody,{...state,camera:2});assert(Math.abs(cockpitBody.position.y)<=.0006,'Cockpit vibration stays below 0.6 mm');}
assert(cockpitBody.rotation.x>0,'Cockpit keeps the real suspension weight-transfer response');
assert(Math.abs(cockpitBody.position.y)>0,'Gentle road motion remains present');
const pausedHeight=cockpitBody.position.y;cockpitRide.update({...state,camera:2,mode:'paused'},1);cockpitRide.apply(cockpitBody,{...state,camera:2,mode:'paused'});assert.equal(cockpitBody.position.y,pausedHeight,'Pause freezes the subtle vibration');
for(let i=0;i<600;i++){cockpitRide.update({...state,camera:2,speed:1800},1/120);cockpitRide.apply(cockpitBody,{...state,camera:2,speed:1800});assert(Math.abs(cockpitBody.position.y)<=.0006,'Extreme pace cannot amplify cockpit vibration');}
console.log('PASS: minimal cockpit vibration, bounded amplitude at extreme speed, pause freeze and suspension pitch preserved.');
