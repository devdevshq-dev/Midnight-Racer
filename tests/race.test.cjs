const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const elements=new Map(),storage=new Map();
const element=id=>{if(!elements.has(id))elements.set(id,{style:{},classList:{add(){},remove(){},toggle(){}},setAttribute(){}});return elements.get(id);};
class MockScene{constructor(){this.renderer={info:{render:{}}};}roadSlope(s){return Math.cos(s*.0028)*.0588+Math.cos(s*.006+.4)*.036;}impact(){}render(){}}
const context={console,RaceScene:MockScene,document:{getElementById:element,body:{classList:{add(){}}},addEventListener(){}},window:{},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},addEventListener(){},requestAnimationFrame(){},setTimeout(){}};
const source=readFileSync(join(__dirname,'../game.js'),'utf8').replace('function frame(t){','globalThis.test={state,start,update,pause,hit,finish,keys,frame,collide};function frame(t){');
vm.runInNewContext(readFileSync(join(__dirname,'../collisions.js'),'utf8'),context);
vm.runInNewContext(source,context);const t=context.test;
const step=seconds=>{for(let i=0;i<Math.ceil(seconds*60);i++)t.update(1/60);};
t.start();assert.equal(t.state.mode,'countdown');step(3.1);assert.equal(t.state.mode,'playing');
step(1);assert(t.state.distance>0);t.keys.add('KeyD');step(.2);t.keys.clear();assert(t.state.x>.1);
t.keys.add('Space');step(.4);assert(t.state.boosting);assert(t.state.nitro<100);t.keys.clear();
t.pause();const distance=t.state.distance;step(1);assert.equal(t.state.distance,distance);t.pause();assert.equal(t.state.mode,'playing');
t.state.traffic=[];t.state.x=0;t.state.distance=3999.9;t.state.speed=200;t.update(.02);assert.equal(t.state.mode,'playing');assert(t.state.distance>4000,'No finish line at 4 km');
t.hit(40);assert.equal(t.state.health,60);t.hit(40);assert.equal(t.state.health,60,'Collision immunity prevents per-frame damage');
t.state.traffic=[];t.state.x=0;step(1.7);t.hit(40);assert.equal(t.state.health,20);
t.state.traffic=[];t.state.x=0;step(1.7);t.hit(40);assert.equal(t.state.mode,'crashed');
assert(storage.has('nightshift-score'));
t.start();step(2);assert.equal(t.state.elapsed,0,'Pre-race countdown does not advance speed timer');step(1.1);
t.state.elapsed=14.9;t.state.speed=215;t.state.x=0;t.state.traffic=[];
t.update(.05);assert.equal(t.state.speedLevel,0);assert.equal(t.state.speedMultiplier,1);
t.update(.05);assert.equal(t.state.speedLevel,1);assert(Math.abs(t.state.speed-236.5)<1e-8,'At 15 s cruise speed increases exactly 10%');
t.update(.01);assert.equal(t.state.speedLevel,1,'Do not increase twice in the same interval');
t.pause();const elapsed=t.state.elapsed,speed=t.state.speed;step(30);assert.equal(t.state.elapsed,elapsed);assert.equal(t.state.speed,speed);t.pause();
t.state.elapsed=29.95;t.state.speed=236.5;t.state.x=0;t.state.traffic=[];t.update(.05);assert.equal(t.state.speedLevel,2);assert(Math.abs(t.state.speedMultiplier-1.21)<1e-8);assert(Math.abs(t.state.speed-260.15)<1e-8,'Second increase compounds');
t.keys.add('KeyS');const beforeBrake=t.state.speed;t.update(.05);assert(t.state.speed<beforeBrake,'Braking still works after speed increases');t.keys.clear();
t.state.elapsed=89.95;t.state.distance=12000;t.state.x=0;t.state.traffic=[];t.update(.05);assert.equal(t.state.mode,'playing','No time or distance limit');assert(t.state.distance>12000);assert.equal(t.state.speedLevel,6);assert(Math.abs(t.state.speedMultiplier-1.1**6)<1e-8,'Catch up any crossed intervals');
t.start();assert.equal(t.state.health,100);assert.equal(t.state.distance,0);assert.equal(t.state.elapsed,0);assert.equal(t.state.speedLevel,0);assert.equal(t.state.speedMultiplier,1);
t.state.mode='playing';t.state.speed=1800;t.state.traffic=[{x:0,s:10,speed:85,passed:false,target:0,change:5}];t.update(.05);assert(t.state.health<100,'Fast vehicles cannot tunnel through traffic between frames');
console.log('PASS: countdown, movement, steering, boost, pause, endless distance/time, collision damage/immunity, persistence, 15/30-second compounding, interval catch-up, braking and restart reset.');

// Momentum persists briefly after release, then grip settles the car.
t.start();t.state.mode='playing';t.state.speed=120;t.keys.add('KeyD');step(.2);
assert(t.state.lateralVelocity>0);const releaseX=t.state.x;t.keys.clear();step(.1);
assert(t.state.x>releaseX,'Release preserves lateral momentum');
step(1);assert(Math.abs(t.state.lateralVelocity)<.3,'Tires settle lateral motion');
t.state.x=5.91;t.state.lateralVelocity=5;t.update(.05);
assert(t.state.x<=5.92);assert(t.state.lateralVelocity<0,'Barrier contact deflects the car inward');
t.start();assert.equal(t.state.lateralVelocity,0);assert.equal(t.state.heading,0);
// Identical input duration should produce identical driving across display refresh rates.
function atRefreshRate(hz){const isolated={...context};vm.runInNewContext(source,isolated);const sim=isolated.test;sim.start();sim.state.mode='playing';sim.state.speed=120;sim.keys.add('KeyD');sim.frame(0);for(let i=1;i<=hz/2;i++)sim.frame(i*1000/hz);return {x:sim.state.x,speed:sim.state.speed,distance:sim.state.distance};}
const slow=atRefreshRate(30),fast=atRefreshRate(120);
assert(Math.abs(slow.x-fast.x)<.08,'Steering is consistent at 30 and 120 Hz');
assert(Math.abs(slow.distance-fast.distance)<.5,'Distance is consistent at 30 and 120 Hz');
console.log('PASS: lateral momentum, grip recovery, barrier deflection, handling reset and refresh-rate consistency.');

// Collision impulses depend on relative speed and direction, not absolute speed.
function setupImpact(speed,trafficSpeed,x=0,s=4.4){t.start();t.state.mode='playing';t.state.speed=speed;const car={x,s,speed:trafficSpeed,target:x,change:5,passed:false};t.state.traffic=[car];return car;}
let rival=setupImpact(125,120);t.collide(rival,{x:0,s:1});const gentleDamage=100-t.state.health;
assert(gentleDamage<10,'A low closing-speed bump does little damage');
assert(t.state.speed>120&&rival.speed>120,'Front impact transfers forward momentum to traffic');
assert(rival.s-t.state.distance>=4.55,'Cars separate after a front impact');
rival=setupImpact(240,90);t.collide(rival,{x:0,s:1});
assert(100-t.state.health>gentleDamage,'Fast closing impact causes more damage');
assert(t.state.impactRecovery>0,'Impact briefly interrupts acceleration');
const healthAfterImpact=t.state.health;t.state.speed=240;t.collide(rival,{x:0,s:1});
assert.equal(t.state.health,healthAfterImpact,'Persistent contact does not deal damage every step');
const second={x:0,s:4.4,speed:80,target:0,change:5};t.state.speed=180;t.collide(second,{x:0,s:1});
assert(t.state.health<healthAfterImpact,'A different vehicle is not covered by the first contact cooldown');
rival=setupImpact(160,160,1.8,0);t.state.lateralVelocity=4;t.collide(rival,{x:1,s:0});
assert.equal(t.state.speed,160,'A sideswipe preserves forward speed');
assert(t.state.lateralVelocity<4&&rival.lateralImpact>0,'Sideswipe pushes both cars apart');
assert(rival.x-t.state.x>=1.92);assert(t.state.impactYaw!==0&&rival.impactYaw!==0);
rival=setupImpact(80,160,0,-4.4);t.collide(rival,{x:0,s:-1});
assert(t.state.speed>80&&rival.speed<160,'A rear impact pushes the player forward');
rival=setupImpact(80,120);t.collide(rival,{x:0,s:1});assert.equal(t.state.health,100,'Separating cars do not take impact damage');
t.pause();const recovery=t.state.impactRecovery;step(.5);assert.equal(t.state.impactRecovery,recovery);t.pause();
t.start();assert.equal(t.state.impactYaw,0);assert.equal(t.state.impactRecovery,0);
const contact=context.window.trafficContact;
assert(contact({x:0,s:12},{x:0,s:-12}).s===1,'Swept front impact');
assert(contact({x:0,s:-12},{x:0,s:12}).s===-1,'Swept rear impact');
assert(contact({x:3,s:0},{x:-3,s:0}).x===1,'Swept lateral impact');
assert.equal(contact({x:3,s:12},{x:3,s:-12}),null,'Adjacent-lane pass is clear');
assert.equal(contact({x:5,s:5},{x:0,s:20}),null,'Crossing separate axes at different times is not a collision');
console.log('PASS: impact severity, momentum transfer, separation, per-car cooldowns, sideswipes, rear impacts and swept collision detection.');
