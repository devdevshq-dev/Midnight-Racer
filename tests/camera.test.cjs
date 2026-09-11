const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),THREE=require('../three.min.js');
const context={THREE,window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../scene.js'),'utf8'),context);
const camera=()=>Object.create(context.window.RaceScene.prototype);
const state={mode:'playing',steer:1,speed:160,heading:.04};
const right=camera(),left=camera();
for(let i=0;i<120;i++){right.updateCameraSteering(state,1/120);left.updateCameraSteering({...state,steer:-1,heading:-.04},1/120);}
assert(right.cameraSteering>0);assert(left.cameraSteering<0);assert(Math.abs(right.cameraSteering+left.cameraSteering)<1e-9,'Left and right camera response is symmetric');
const held=right.cameraSteering;right.updateCameraSteering({...state,mode:'paused'},1);assert.equal(right.cameraSteering,held,'Pause freezes camera anticipation');
for(let i=0;i<240;i++)right.updateCameraSteering({...state,steer:0,heading:0},1/120);
assert(Math.abs(right.cameraSteering)<.001,'Camera returns smoothly to center');
assert(camera().steeringAngle({...state,speed:300})<camera().steeringAngle({...state,speed:60}),'Camera follows reduced high-speed wheel angle');
const slow=camera(),fast=camera();for(let i=0;i<30;i++)slow.updateCameraSteering(state,1/30);for(let i=0;i<120;i++)fast.updateCameraSteering(state,1/120);
assert(Math.abs(slow.cameraSteering-fast.cameraSteering)<1e-9,'Camera anticipation is independent of frame rate');
for(let i=0;i<120;i++)fast.updateCameraSteering({...state,heading:10},1/120);assert(Math.abs(fast.cameraSteering)<=.16,'Abrupt heading changes remain bounded');
fast.updateCameraSteering({...state,mode:'countdown'},0);assert.equal(fast.cameraSteering,0,'Restart resets camera angle');
const stationary=camera();stationary.updateCameraSteering({...state,speed:0},1);assert.equal(stationary.cameraSteering,0,'Stationary steering does not swing the camera');
console.log('PASS: directional camera steering, speed sensitivity, centering, pause/reset, bounded angles and frame-rate consistency.');
