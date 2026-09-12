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

// Relative eye position and orientation stay fixed in the cabin through motion.
const rig=camera();rig.player=new THREE.Group();const cabin=new THREE.Group();rig.player.add(cabin);rig.player.userData.body=cabin;
const driving={...state,camera:2,distance:120};
for(let i=0;i<40;i++){
  rig.player.position.set(i*.1,0,0);rig.player.rotation.y=Math.sin(i)*.1;cabin.rotation.set(Math.sin(i)*.04,0,Math.cos(i)*.05);
  const pose=rig.cockpitCameraPose(driving,.05);
  assert(cabin.worldToLocal(pose.eye.clone()).distanceTo(new THREE.Vector3(-.38,1.18,.3))<1e-9,'Eye cannot lag or slide relative to the dashboard');
  const expectedUp=new THREE.Vector3(0,1,0).transformDirection(cabin.matrixWorld);assert(pose.up.distanceTo(expectedUp)<1e-9,'Camera follows cabin roll');
}
console.log('PASS: cockpit eye and up-vector stay attached through steering, pitch and roll.');
