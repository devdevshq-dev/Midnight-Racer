const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const THREE=require('../three.min.js');
const context={THREE,window:{}};
vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../traffic-cars.js'),'utf8'),context);
const build=context.window.buildTrafficCar;
const heights=[];
for(let variant=0;variant<3;variant++){
  const car=build(0x526977,variant),other=build(0x526977,variant);
  assert.equal(car.userData.wheels.length,4);
  assert.equal(car.userData.wheels.filter(w=>w.front).length,2);
  assert.equal(car.userData.indicators.length,2);
  let meshes=0;
  car.traverse(o=>{if(!o.isMesh)return;meshes++;for(const name of ['position','normal'])for(const value of o.geometry.attributes[name].array)assert(Number.isFinite(value),'Finite geometry');});
  assert(meshes<30,'Traffic detail stays within a modest draw-call budget');
  const bounds=new THREE.Box3().setFromObject(car),size=bounds.getSize(new THREE.Vector3());
  assert(size.x<2.25&&size.z<4.5,'Fleet fits existing highway and collision envelope');
  assert(bounds.min.y>=0,'Tires stay above the road');heights.push(size.y);
  car.userData.wheels[0].spin.rotation.x=2;
  assert(Math.abs(other.userData.wheels[0].spin.rotation.x)<1e-10,'Instances animate independently');
  assert.equal(car.children[0].children[0].geometry,other.children[0].children[0].geometry,'Clones reuse static geometry');
}
assert(heights[1]<heights[0]&&heights[0]<heights[2],'Coupe, sedan and SUV have distinct silhouettes');
console.log('PASS: fleet geometry, dimensions, wheel pivots, independent animation, shared meshes and draw-call budget.');
