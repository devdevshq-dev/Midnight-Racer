const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../mobile.js'),'utf8'),context);
function control(){const element={classList:{toggle(name,active){element.held=active;}},setAttribute(){},setPointerCapture(id){element.captured=id;}};let active=false;const reset=context.window.bindRaceControl(element,value=>active=value);return {element,reset,get active(){return active;}};}
let prevented=0;const event=id=>({pointerId:id,preventDefault(){prevented++;}});
const steer=control(),boost=control();steer.element.onpointerdown(event(1));boost.element.onpointerdown(event(2));
assert(steer.active&&boost.active,'Steer and boost work simultaneously');
steer.element.onpointerup(event(1));assert(!steer.active&&boost.active,'Releasing one button leaves the other held');
boost.element.onpointerdown(event(3));boost.element.onpointerup(event(2));assert(boost.active,'A second finger keeps the same button held');
boost.element.onlostpointercapture(event(3));assert(!boost.active&&!boost.element.held,'Lost capture clears the pressed state');
steer.element.onpointerdown(event(4));steer.element.onpointercancel(event(4));assert(!steer.active,'Cancelled touches cannot stick');
boost.element.onpointerdown(event(5));boost.reset();assert(!boost.active,'Pause/reset clears held touches');
boost.element.oncontextmenu(event(5));boost.element.onselectstart(event(5));boost.element.ondragstart(event(5));assert(prevented>=8,'Native long-press, drag and selection actions are suppressed');
console.log('PASS: simultaneous touch controls, multiple fingers, cancellation, lost capture, reset and native selection suppression.');

// Verify draw-call batching retains every original scenery triangle and shadow flag.
const THREE=require('../three.min.js');
const canvas={getContext:()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){},createRadialGradient:()=>({addColorStop(){}}),fillRect(){}})};
const sceneContext={THREE,window:{},document:{createElement:()=>canvas}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../scene.js'),'utf8'),sceneContext);
const scene=Object.create(sceneContext.window.RaceScene.prototype);scene.scene=new THREE.Scene();scene.props=[];scene.player=new THREE.Group();scene.makeWorld();scene.makeDrivingEffects();
assert(scene.sceneryBatches.length<25,'Shared roadside materials reduce instanced draw calls');
let originals=0,batched=0;
for(const {instances,entries} of scene.sceneryBatches){for(const entry of entries){assert.equal(instances.geometry,entry.mesh.geometry);assert.equal(instances.material,entry.mesh.material);assert.equal(instances.castShadow,entry.mesh.castShadow);originals+=(entry.mesh.geometry.index?.count||entry.mesh.geometry.attributes.position.count)/3;}batched+=(instances.geometry.index?.count||instances.geometry.attributes.position.count)/3*instances.count;}
assert.equal(batched,originals,'No scenery triangles removed');
console.log(`PASS: ${scene.sceneryBatches.length} scenery batches preserve all ${originals.toLocaleString()} triangles, materials and shadows.`);
