'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),zlib=require('node:zlib');
const root=path.join(__dirname,'../assets'),glb=fs.readFileSync(path.join(root,'bmw-m5-cs.glb'));
assert.equal(glb.readUInt32LE(0),0x46546c67);assert.equal(glb.readUInt32LE(4),2);assert.equal(glb.readUInt32LE(8),glb.length);
const jsonLength=glb.readUInt32LE(12),gltf=JSON.parse(glb.toString('utf8',20,20+jsonLength)),binStart=28+jsonLength;
assert.equal(glb.readUInt32LE(16),0x4e4f534a);assert.equal(glb.readUInt32LE(24+jsonLength),0x004e4942);assert.equal(gltf.buffers[0].byteLength,glb.length-binStart);
const blob=index=>{const v=gltf.bufferViews[index];assert(v.byteOffset>=0&&v.byteOffset+v.byteLength<=gltf.buffers[0].byteLength);return glb.subarray(binStart+v.byteOffset,binStart+v.byteOffset+v.byteLength);};
function read(index){const a=gltf.accessors[index],b=blob(a.bufferView),width={SCALAR:1,VEC2:2,VEC3:3}[a.type];assert.equal(b.length,a.count*width*4);const values=[];for(let i=0;i<b.length;i+=4){const x=a.componentType===5125?b.readUInt32LE(i):b.readFloatLE(i);assert(Number.isFinite(x));values.push(x);}return values;}
let triangles=0;
for(const mesh of gltf.meshes)for(const p of mesh.primitives){const v=read(p.attributes.POSITION),n=read(p.attributes.NORMAL),uv=read(p.attributes.TEXCOORD_0),indices=read(p.indices);assert.equal(n.length,v.length);assert.equal(uv.length/2,v.length/3);assert.equal(indices.length%3,0);assert(indices.every(i=>i<v.length/3));assert(gltf.materials[p.material]);triangles+=indices.length/3;}
assert(triangles>450000,'The detailed supplied model is present, not a procedural placeholder');
const wheels=gltf.nodes.filter(n=>n.extras.part==='wheel');assert.equal(wheels.length,4);assert.equal(wheels.filter(w=>w.extras.front).length,2);assert.deepEqual(wheels.map(w=>w.name),['wheel_lf','wheel_rf','wheel_lr','wheel_rr']);
for(const w of wheels){assert(Math.abs(w.translation[0])>.7);assert(w.translation[1]>.3&&w.translation[1]<.4);assert(Math.abs(w.translation[2])>1.4);}
for(const image of gltf.images){const b=blob(image.bufferView);assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a');const w=b.readUInt32BE(16),h=b.readUInt32BE(20);assert(w>0&&h>0);let offset=8;const compressed=[];while(offset<b.length){const size=b.readUInt32BE(offset),type=b.toString('ascii',offset+4,offset+8);assert(offset+12+size<=b.length);if(type==='IDAT')compressed.push(b.subarray(offset+8,offset+8+size));offset+=size+12;}assert.equal(zlib.inflateSync(Buffer.concat(compressed)).length,(w*4+1)*h);}
const wrapper=fs.readFileSync(path.join(root,'bmw-m5-cs.js'),'utf8').match(/window\.NIGHTSHIFT_M5_GLB=("[A-Za-z0-9+/=]+")/);assert(wrapper);assert.deepEqual(Buffer.from(JSON.parse(wrapper[1]),'base64'),glb);
console.log(`PASS: GLB structure, finite geometry, ${triangles.toLocaleString()} triangles, four wheel pivots, ${gltf.images.length} embedded PNGs, and offline wrapper parity.`);
