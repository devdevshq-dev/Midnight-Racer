const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),THREE=require('../three.min.js');
const draw=new Proxy({}, {get:(object,key)=>object[key]||(()=>{}),set:(object,key,value)=>(object[key]=value,true)});
const context={THREE,window:{},console,Blob,URL,atob:s=>Buffer.from(s,'base64').toString('binary'),TextDecoder,document:{createElement:()=>({getContext:()=>draw})},Image:class{set src(value){this.onload();}}};
for(const file of ['assets/bmw-m5-cs.js','car-loader.js','cockpit.js'])vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context);
const car=context.window.buildM5Car();
function total(){let n=0;car.traverse(o=>{if(o.isMesh&&o.visible)n+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;});return n;}
for(const {wheel} of car.userData.wheels)assert.equal(wheel.parent,car,'Tires are independent of sprung body movement');
const original=total(),bounds=new THREE.Box3().setFromObject(car),cockpit=context.window.installM5Cockpit(car);
assert(cockpit.triangles>2000,'Original steering-wheel geometry was extracted');assert(cockpit.triangles<20000,'Extraction is limited to the steering wheel');
assert.equal(total(),original+2,'All original triangles are retained, plus the two display triangles');
const after=new THREE.Box3().setFromObject(car);assert(after.min.distanceTo(bounds.min)<1e-6);assert(after.max.distanceTo(bounds.max)<1e-6);
const state={mode:'playing',steer:1,speed:160,rpm:4500,gear:4};cockpit.update(state,.2);assert(cockpit.wheel.quaternion.z<0,'Right input turns wheel clockwise');
const q=cockpit.wheel.quaternion.clone();cockpit.update({...state,mode:'paused',steer:-1},1);assert(q.equals(cockpit.wheel.quaternion),'Pause freezes wheel animation');
for(let i=0;i<120;i++)cockpit.update({...state,steer:0},1/60);assert(Math.abs(cockpit.wheel.quaternion.z)<1e-6,'Released steering returns wheel to center');
cockpit.update({...state,steer:-1},.2);assert(cockpit.wheel.quaternion.z>0,'Left input turns wheel counterclockwise');cockpit.update({...state,mode:'countdown'},0);assert.equal(cockpit.wheel.quaternion.z,0,'Restart centers the wheel');
const version=cockpit.screen.material.map.version;cockpit.update({...state,speed:220,rpm:6000,gear:5},.02);assert(cockpit.screen.material.map.version>version,'Live instruments update from driving telemetry');
console.log(`PASS: ${cockpit.triangles} original wheel triangles animated; full model preserved; steering, pause/reset and live instruments verified.`);
