/* RPF7 / RSC7 layout references: CodeWalker (dexyfex), GameFiles/Resources.
 * This converter handles the supplied unencrypted 22m5 archive; no game keys required.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
const T=require('../three.min.js');
const source=process.argv[2];if(!source)throw Error('Usage: node tools/convert-rpf.cjs /path/to/dlc.rpf [--inspect]');
const archive=fs.readFileSync(source),entries=new Map();
function scan(base){if(archive.readUInt32LE(base)!==0x52504637)throw Error('Expected RPF7');const count=archive.readUInt32LE(base+4),names=base+16+count*16,encryption=archive.readUInt32LE(base+12);if(encryption!==0x4e45504f&&encryption!==0)throw Error('Only unencrypted RPF archives supported');for(let i=0;i<count;i++){const p=base+16+i*16;if(archive.readUInt32LE(p+4)===0x7fffff00)continue;const start=names+archive.readUInt16LE(p),name=archive.toString('utf8',start,archive.indexOf(0,start)),offset=base+(archive.readUIntLE(p+5,3)&0x7fffff)*512,size=archive.readUIntLE(p+2,3)||archive.readUInt32LE(p+8);if(name.endsWith('.rpf'))scan(offset);else entries.set(name,archive.subarray(offset,offset+size));}}
scan(0);
function pageSize(f){return (512*2**(f&15))*(((f>>>27)&1)+((f>>>26)&1)*2+((f>>>25)&1)*4+((f>>>24)&1)*8+((f>>>17)&127)*16+((f>>>11)&63)*32+((f>>>7)&15)*64+((f>>>5)&3)*128+((f>>>4)&1)*256);}
class Resource{
  constructor(data){if(data.readUInt32LE(0)!==0x37435352)throw Error('Expected RSC7');this.systemSize=pageSize(data.readUInt32LE(8));this.b=zlib.inflateRawSync(data.subarray(16),{maxOutputLength:256*1024*1024});}
  address(v){if(!v)return 0;const region=Math.floor(v/0x10000000),o=v%0x10000000+(region===6?this.systemSize:0);if(![5,6].includes(region)||o>=this.b.length)throw Error(`Invalid resource pointer ${v.toString(16)}`);return o;}
  ptr(o){return this.address(Number(this.b.readBigUInt64LE(o)));}
  u32(o){return this.b.readUInt32LE(o);}u16(o){return this.b.readUInt16LE(o);}i16(o){return this.b.readInt16LE(o);}u8(o){return this.b[o];}f(o){return this.b.readFloatLE(o);}
  floats(o,n){return Array.from({length:n},(_,i)=>this.f(o+i*4));}
  string(o){return this.b.toString('utf8',o,this.b.indexOf(0,o));}
  list(o){const p=this.ptr(o),n=this.u16(o+8);if(n>4096)throw Error('Unexpected list size');return Array.from({length:n},(_,i)=>this.ptr(p+i*8));}
}
const r=new Resource(entries.get('22m5.yft')),td=new Resource(entries.get('22m5.ytd'));
function hash(str){let h=0;for(const c of str){h=(h+c.charCodeAt(0))>>>0;h=(h+(h<<10))>>>0;h^=h>>>6;}h=(h+(h<<3))>>>0;h^=h>>>11;return (h+(h<<15))>>>0;}
const shaderNames=['vehicle_paint1','vehicle_paint2','vehicle_paint3','vehicle_paint4','vehicle_mesh','vehicle_mesh_enveff','vehicle_badges','vehicle_interior','vehicle_interior2','vehicle_interior_emissive','vehicle_lights','vehicle_lightsemissive','vehicle_tire','vehicle_glass','vehicle_glass_inner','vehicle_licenseplate','vehicle_chrome','vehicle_generic','vehicle_decal','vehicle_emissive','normal_spec','normal','spec','default'];
const paramNames=['DiffuseSampler','BumpSampler','SpecSampler','TintPaletteSampler','DetailSampler','DirtSampler','diffuseSampler','specularIntensityMult','specularFalloffMult','diffuseColor','matDiffuseColor','envEffScale','envEffThickness','fresnelRolloff','specularFresnel','bumpiness','paintType','emissiveMultiplier'];
const names=new Map([...shaderNames,...shaderNames.map(x=>x+'.sps'),...paramNames].map(x=>[hash(x),x]));
function shaderAt(s){
 const params=[];
 if(r.u32(s+4)===0x6d657461){const infos=r.ptr(s+32),textures=r.ptr(s+16),buffers=r.ptr(s+8),n=r.u8(infos+4);for(let i=0;i<n;i++){const h=r.u32(infos+8+i*8),bits=r.u32(infos+12+i*8),type=bits&3,name=names.get(h)||h.toString(16);if(type===0){const p=r.ptr(textures+((bits>>>2)&255)*8);params.push({name,type:0,value:p?r.string(r.ptr(p+0x28)):''});}else if(type===3){const p=r.ptr(buffers+((bits>>>2)&63)*8)+((bits>>>8)&4095);params.push({name,type:1,value:r.floats(p,Math.min(16,(bits>>>20)/4))});}}return {name:names.get(r.u32(s))||r.u32(s).toString(16),bucket:r.u8(s+57),params};}
 const p=r.ptr(s),n=r.u8(s+16);let floatBytes=0;for(let i=0;i<n;i++){const at=p+i*16,type=r.u8(at),data=r.ptr(at+8);floatBytes+=type*16;params.push({type,data,value:type?r.floats(data,Math.min(type*4,16)):r.string(r.ptr(data+0x28))});}for(let i=0;i<n;i++){const h=r.u32(p+n*16+floatBytes+i*4);params[i].name=names.get(h)||h.toString(16);}return {name:names.get(r.u32(s+8))||r.u32(s+8).toString(16),file:names.get(r.u32(s+24))||r.u32(s+24).toString(16),bucket:r.u8(s+17),params};}
const drawable=r.ptr(0x30),group=r.ptr(drawable+0x10),shaders=r.list(group+0x10).map(shaderAt);
const skeleton=r.ptr(drawable+0x18),bonePtr=r.ptr(skeleton+0x20),boneCount=r.u16(skeleton+0x5e);
const bones=Array.from({length:boneCount},(_,i)=>{const p=bonePtr+i*80;return {name:r.string(r.ptr(p+0x38)),rotation:r.floats(p,4),translation:r.floats(p+16,3),scale:r.floats(p+32,3),parent:r.i16(p+50),index:r.i16(p+66)};});
function boneMatrix(i){if(i<0||!bones[i])return new T.Matrix4();const b=bones[i];if(b.matrix)return b.matrix;const local=new T.Matrix4().compose(new T.Vector3(...b.translation),new T.Quaternion(...b.rotation),new T.Vector3(...b.scale));b.matrix=boneMatrix(b.parent).clone().multiply(local);return b.matrix;}
bones.forEach((_,i)=>boneMatrix(i));
function modelsAt(d){const list=r.ptr(d+0x50);return list?r.list(list).map(m=>{const geometries=r.list(m+8),shaderMap=r.ptr(m+32),binding=r.u32(m+40);return {drawable:d,pointer:m,bone:binding>>>24,skin:!!((binding>>>8)&255),geometries:geometries.map((g,i)=>({pointer:g,shader:r.u16(shaderMap+i*2),vertices:r.u16(g+0x60),indices:r.u32(g+0x58)}))};}):[];}
const models=modelsAt(drawable);
const array=r.ptr(0x38),arrayCount=r.u32(0x48),lod=r.ptr(r.ptr(0xf0)+0x10),childrenPtr=r.ptr(lod+0xd0),childCount=r.u8(lod+0x11d);
const extras=Array.from({length:arrayCount},(_,i)=>({kind:'array',drawable:r.ptr(array+i*8)}));
for(let i=0;i<childCount;i++){const c=r.ptr(childrenPtr+i*8),d=r.ptr(c+0xa0);if(d)extras.push({kind:'child',drawable:d,tag:r.u16(c+0x12)});}
if(process.argv.includes('--parts')){fs.writeSync(1,JSON.stringify(extras.map(x=>({...x,matrix:r.floats(x.drawable+0xb0,16),models:modelsAt(x.drawable).map(m=>({bone:m.bone,skin:m.skin,shaders:m.geometries.map(g=>g.shader),samples:m.geometries.slice(0,1).map(g=>verticesAt(g).vertices[0])}))})),null,2));process.exit(0);}
const textures=td.list(0x30).map(p=>({name:td.string(td.ptr(p+0x28)),width:td.u16(p+0x18),height:td.u16(p+0x1a),format:td.u8(p+0x1f),levels:td.u8(p+0x22),data:td.ptr(p+0x38)}));
function verticesAt(g){
 const vb=r.ptr(g.pointer+0x18),data=r.ptr(vb+24),info=r.ptr(vb+56),count=r.u32(vb+8),boneIds=r.ptr(g.pointer+0x68),boneCount=r.u16(g.pointer+0x72);
 const layout=Array.from({length:52},(_,i)=>({i,type:r.u8(info+260+i),offset:r.u32(info+i*4),stride:r.u8(info+208+i)})).filter(x=>x.type);
 const components=new Map(layout.map(x=>[x.i,x]));
 function attribute(i,v){const c=components.get(i);if(!c)return null;const p=data+c.offset+c.stride*v;if([2,6,16].includes(c.type))return r.floats(p,c.type===2?4:c.type===6?3:2);if([28,30].includes(c.type))return Array.from({length:4},(_,j)=>r.u8(p+j)/(c.type===28?255:1));throw Error(`Unsupported vertex type ${c.type}`);}
 const vertices=Array.from({length:count},(_,v)=>{const indices=attribute(20,v),weights=attribute(16,v);let bone=0;if(indices){const dominant=weights.indexOf(Math.max(...weights)),index=indices[dominant];if(index>=boneCount)throw Error('Bone index out of bounds');bone=r.u16(boneIds+index*2);}return {position:attribute(0,v),normal:attribute(4,v),uv:attribute(28,v),bone};});
 const ib=r.ptr(g.pointer+0x38),idata=r.ptr(ib+24),icount=r.u32(ib+8),isize=r.u16(ib+12);if(isize!==2)throw Error(`Unsupported index size ${isize}`);
 const indices=Array.from({length:icount},(_,i)=>r.u16(idata+i*2));if(indices.some(i=>i>=count))throw Error('Invalid mesh index');
 return {vertices,indices,layout};
}
if(process.argv.includes('--vertices')){fs.writeSync(1,JSON.stringify(models.flatMap(m=>m.geometries.map(g=>{const v=verticesAt(g),counts={};for(const x of v.vertices)counts[bones[x.bone].name]=(counts[bones[x.bone].name]||0)+1;return {shader:g.shader,layout:v.layout,min:[0,1,2].map(k=>Math.min(...v.vertices.map(x=>x.position[k]))),max:[0,1,2].map(k=>Math.max(...v.vertices.map(x=>x.position[k]))),bones:counts,sample:v.vertices[0]};})),null,2));process.exit(0);}
if(process.argv.includes('--inspect')){fs.writeSync(1,JSON.stringify({systemBytes:r.systemSize,drawable,bones:bones.map(({matrix,...b})=>b),models:models.map(m=>({...m,name:bones[m.bone]?.name})),shaders,textures},null,2));process.exit(0);}

// Decode top-mip BC1 / BC3 / BGRA8 texture data; write lossless, embedded PNGs.
function decodeTexture(t){
 const {width:w,height:h,format,data}=t,out=Buffer.alloc(w*h*4);
 if(format===87){for(let i=0;i<w*h;i++){const p=data+i*4;out.set([td.b[p+2],td.b[p+1],td.b[p],td.b[p+3]],i*4);}return out;}
 if(![71,77].includes(format))throw Error(`Unsupported DXGI texture format ${format}`);
 const rgb=n=>[Math.round(((n>>>11)&31)*255/31),Math.round(((n>>>5)&63)*255/63),Math.round((n&31)*255/31),255];
 let p=data;for(let by=0;by<h;by+=4)for(let bx=0;bx<w;bx+=4){
  let alphas=null,abits=0n;if(format===77){const a=td.u8(p),b=td.u8(p+1);alphas=[a,b];if(a>b){for(let i=1;i<=6;i++)alphas.push(Math.round(((7-i)*a+i*b)/7));}else{for(let i=1;i<=4;i++)alphas.push(Math.round(((5-i)*a+i*b)/5));alphas.push(0,255);}abits=BigInt(td.b.readUIntLE(p+2,6));p+=8;}
  const c0=td.u16(p),c1=td.u16(p+2),colors=[rgb(c0),rgb(c1)],mix=(a,b,wa,wb,d)=>[0,1,2].map(k=>Math.round((a[k]*wa+b[k]*wb)/d)).concat(255);
  if(c0>c1||format===77){colors.push(mix(colors[0],colors[1],2,1,3),mix(colors[0],colors[1],1,2,3));}else colors.push(mix(colors[0],colors[1],1,1,2),[0,0,0,0]);
  const bits=td.u32(p+4);p+=8;for(let i=0;i<16;i++){const x=bx+i%4,y=by+Math.floor(i/4);if(x>=w||y>=h)continue;const c=colors[(bits>>>(i*2))&3],o=(y*w+x)*4;out.set(c,o);if(alphas)out[o+3]=alphas[Number((abits>>BigInt(i*3))&7n)];}
 }return out;
}
const crcTable=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function pngChunk(type,data){const chunk=Buffer.alloc(data.length+12);chunk.writeUInt32BE(data.length);chunk.write(type,4);data.copy(chunk,8);let crc=0xffffffff;for(const b of chunk.subarray(4,-4))crc=crcTable[(crc^b)&255]^(crc>>>8);chunk.writeUInt32BE((crc^0xffffffff)>>>0,chunk.length-4);return chunk;}
function png(t){const rgba=decodeTexture(t),raw=Buffer.alloc((t.width*4+1)*t.height);for(let y=0;y<t.height;y++)rgba.copy(raw,y*(t.width*4+1)+1,y*t.width*4,(y+1)*t.width*4);const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(t.width);ihdr.writeUInt32BE(t.height,4);ihdr[8]=8;ihdr[9]=6;return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),pngChunk('IHDR',ihdr),pngChunk('IDAT',zlib.deflateSync(raw,{level:9})),pngChunk('IEND',Buffer.alloc(0))]);}

const gltf={asset:{version:'2.0',generator:'Nightshift local RPF converter',extras:{source:'User-supplied 22m5/dlc.rpf',sha256:crypto.createHash('sha256').update(archive).digest('hex')}},scene:0,scenes:[{nodes:[]}],nodes:[],meshes:[],materials:[],textures:[],images:[],samplers:[{magFilter:9729,minFilter:9987,wrapS:10497,wrapT:10497}],accessors:[],bufferViews:[],buffers:[{byteLength:0}],extensionsUsed:['KHR_materials_clearcoat']};
const chunks=[];let length=0;
function bufferView(data,target){const b=Buffer.from(data.buffer||data,data.byteOffset||0,data.byteLength);const id=gltf.bufferViews.length;gltf.bufferViews.push({buffer:0,byteOffset:length,byteLength:b.length,...(target?{target}:{})});chunks.push(b);length+=b.length;const padding=(4-length%4)%4;if(padding){chunks.push(Buffer.alloc(padding));length+=padding;}return id;}
function accessor(values,size,index=false){const data=index?new Uint32Array(values):new Float32Array(values);if(values.some(v=>!Number.isFinite(v)))throw Error('Non-finite vertex');const id=gltf.accessors.length;const a={bufferView:bufferView(data,index?34963:34962),componentType:index?5125:5126,count:values.length/size,type:size===1?'SCALAR':`VEC${size}`};if(size===3){a.min=Array.from({length:3},(_,k)=>values.filter((_,i)=>i%3===k).reduce((x,y)=>Math.min(x,y),Infinity));a.max=Array.from({length:3},(_,k)=>values.filter((_,i)=>i%3===k).reduce((x,y)=>Math.max(x,y),-Infinity));}gltf.accessors.push(a);return id;}
const textureCache=new Map(),textureSources=new Map(textures.map(t=>[t.name.toLowerCase(),t]));
function texture(name){if(!name)return undefined;name=name.toLowerCase();if(textureCache.has(name))return textureCache.get(name);const t=textureSources.get(name);if(!t)return undefined;const index=gltf.textures.length;gltf.textures.push({source:gltf.images.length,sampler:0});gltf.images.push({name:t.name,mimeType:'image/png',bufferView:bufferView(png(t))});textureCache.set(name,index);return index;}
const linear=hex=>new T.Color(hex).toArray().concat(1);
for(let i=0;i<shaders.length;i++){
 const s=shaders[i],diffuse=s.params.find(p=>p.name==='c8e8c282')?.value;
 const m={name:`${i}_${s.name}_${diffuse||''}`,pbrMetallicRoughness:{baseColorFactor:[1,1,1,1],metallicFactor:.12,roughnessFactor:.58},extras:{sourceShader:i}};
 const p=m.pbrMetallicRoughness;let map=texture(diffuse);
 if(i===12){p.baseColorFactor=linear(0x354b3d);p.metallicFactor=.62;p.roughnessFactor=.34;map=undefined;m.extensions={KHR_materials_clearcoat:{clearcoatFactor:.55,clearcoatRoughnessFactor:.28}};}
 if([2,7,43].includes(i)){p.baseColorFactor=linear(0xb29667);p.metallicFactor=.83;p.roughnessFactor=.3;map=undefined;}
 if([0,3,8].includes(i)){p.roughnessFactor=.88;p.metallicFactor=0;}
 if([4,5,10,16,23].includes(i)){p.metallicFactor=.65;p.roughnessFactor=.28;}
 if([29,48].includes(i)){p.roughnessFactor=.28;p.metallicFactor=.22;m.extensions={KHR_materials_clearcoat:{clearcoatFactor:.65,clearcoatRoughnessFactor:.22}};}
 if(i===47){p.baseColorFactor=linear(0x222727);p.roughnessFactor=.78;map=undefined;}
 if(s.name==='vehicle_badges'||s.name==='9341b630'){m.alphaMode='MASK';m.alphaCutoff=.35;m.doubleSided=true;}
 if(s.name==='7c98d207'){
  map=undefined;m.alphaMode='BLEND';m.doubleSided=true;p.metallicFactor=.22;p.roughnessFactor=.08;p.baseColorFactor=linear(i===35?0x971b24:0x647e85);p.baseColorFactor[3]=[52,54].includes(i)?.32:i===35?.42:.14;
  m.extensions={KHR_materials_clearcoat:{clearcoatFactor:1,clearcoatRoughnessFactor:.06}};
 }
 if(s.name==='vehicle_lightsemissive'){m.emissiveFactor=[1,1,1];p.metallicFactor=.1;p.roughnessFactor=.3;if(map!==undefined)m.emissiveTexture={index:map};}
 if(i===19){p.baseColorFactor=linear(0xffde72);m.emissiveFactor=linear(0xffd347).slice(0,3);}
 if(map!==undefined)p.baseColorTexture={index:map};gltf.materials.push(m);
}
function primitive(vertices,indices,shader,transform=null){const pos=[],normal=[],uv=[];for(const v of vertices){const p=new T.Vector3(...v.position),n=new T.Vector3(...v.normal);if(transform){p.applyMatrix4(transform);n.transformDirection(transform);}pos.push(p.x,p.z,-p.y);normal.push(n.x,n.z,-n.y);uv.push(v.uv?.[0]||0,v.uv?.[1]||0);}return {attributes:{POSITION:accessor(pos,3),NORMAL:accessor(normal,3),TEXCOORD_0:accessor(uv,2)},indices:accessor(indices,1,true),material:shader};}
function addMesh(name,primitives,translation=[0,0,0],extras={}){const mesh=gltf.meshes.length;gltf.meshes.push({name,primitives});const node=gltf.nodes.length;gltf.nodes.push({name,mesh,translation,extras});gltf.scenes[0].nodes.push(node);return node;}
const bodyPrimitives=[];for(const m of models)for(const g of m.geometries){if(g.shader===54)continue;const data=verticesAt(g);bodyPrimitives.push(primitive(data.vertices,data.indices,g.shader));}
const wheelPart=extras.find(e=>modelsAt(e.drawable).some(m=>m.geometries.some(g=>g.shader===0)));if(!wheelPart)throw Error('Wheel geometry missing');
const wheelPrimitives=[],wheelVertices=[];for(const m of modelsAt(wheelPart.drawable))for(const g of m.geometries){const data=verticesAt(g);wheelVertices.push(...data.vertices);wheelPrimitives.push(primitive(data.vertices,data.indices,g.shader));}
const groundOffset=-Math.min(...wheelVertices.map(v=>v.position[2]+bones[68].translation[2]));
addMesh('22m5_body',bodyPrimitives,[0,groundOffset,0],{part:'body'});
for(const name of ['wheel_lf','wheel_rf','wheel_lr','wheel_rr']){const b=bones.find(b=>b.name===name),p=new T.Vector3().setFromMatrixPosition(b.matrix);const node=addMesh(name,wheelPrimitives,[p.x,p.z+groundOffset,-p.y],{part:'wheel',front:name.endsWith('f'),radius:.35});if(name.includes('_r'))gltf.nodes[node].rotation=[0,1,0,0];}
gltf.buffers[0].byteLength=length;
const json=Buffer.from(JSON.stringify(gltf)),jsonPadding=(4-json.length%4)%4,jsonChunk=Buffer.concat([json,Buffer.alloc(jsonPadding,32)]),bin=Buffer.concat(chunks),header=Buffer.alloc(12),jheader=Buffer.alloc(8),bheader=Buffer.alloc(8);
header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(28+jsonChunk.length+bin.length,8);jheader.writeUInt32LE(jsonChunk.length);jheader.writeUInt32LE(0x4e4f534a,4);bheader.writeUInt32LE(bin.length);bheader.writeUInt32LE(0x004e4942,4);
const glb=Buffer.concat([header,jheader,jsonChunk,bheader,bin]),output=path.join(__dirname,'../assets');fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'bmw-m5-cs.glb'),glb);fs.writeFileSync(path.join(output,'bmw-m5-cs.js'),`/* Generated from the user-supplied 22m5 archive. See MODEL-NOTICE.md. */\nwindow.NIGHTSHIFT_M5_GLB=${JSON.stringify(glb.toString('base64'))};\n`);
const stats={...gltf.asset.extras,bytes:glb.length,bodyTriangles:bodyPrimitives.reduce((n,p)=>n+gltf.accessors[p.indices].count/3,0),wheelTriangles:wheelPrimitives.reduce((n,p)=>n+gltf.accessors[p.indices].count/3,0),textures:gltf.images.length,groundOffset};fs.writeFileSync(path.join(output,'model-info.json'),JSON.stringify(stats,null,2)+'\n');console.log(stats);
