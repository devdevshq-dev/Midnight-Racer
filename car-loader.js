/* Local GLB reader for the primitives/materials emitted by tools/convert-rpf.cjs. */
(() => {
  'use strict';
  const T=THREE;
  window.buildM5Car=function(){
    if(!window.NIGHTSHIFT_M5_GLB)throw Error('The supplied M5 asset is missing.');
    const decoded=atob(window.NIGHTSHIFT_M5_GLB),bytes=new Uint8Array(decoded.length);
    for(let i=0;i<decoded.length;i++)bytes[i]=decoded.charCodeAt(i);
    const view=new DataView(bytes.buffer);
    if(view.getUint32(0,true)!==0x46546c67||view.getUint32(4,true)!==2)throw Error('Invalid M5 GLB asset');
    const jsonLength=view.getUint32(12,true),data=JSON.parse(new TextDecoder().decode(bytes.subarray(20,20+jsonLength))),binStart=28+jsonLength;
    const pending=[],textures=data.textures.map(t=>{
      const source=data.images[t.source],buffer=data.bufferViews[source.bufferView];
      const url=URL.createObjectURL(new Blob([bytes.subarray(binStart+buffer.byteOffset,binStart+buffer.byteOffset+buffer.byteLength)],{type:source.mimeType}));
      const texture=new T.Texture();texture.name=source.name;texture.colorSpace=T.SRGBColorSpace;texture.flipY=false;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.anisotropy=8;
      pending.push(new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{texture.image=image;texture.needsUpdate=true;URL.revokeObjectURL(url);resolve();};image.onerror=()=>{URL.revokeObjectURL(url);reject(Error(`Unable to decode ${source.name}`));};image.src=url;}));
      return texture;
    });
    const materials=data.materials.map(m=>{
      const p=m.pbrMetallicRoughness,c=p.baseColorFactor||[1,1,1,1],coat=m.extensions?.KHR_materials_clearcoat;
      const material=new T.MeshPhysicalMaterial({name:m.name,color:new T.Color().fromArray(c),opacity:c[3],metalness:p.metallicFactor,roughness:p.roughnessFactor,transparent:m.alphaMode==='BLEND',depthWrite:m.alphaMode!=='BLEND',alphaTest:m.alphaMode==='MASK'?m.alphaCutoff:0,side:m.doubleSided?T.DoubleSide:T.FrontSide,clearcoat:coat?.clearcoatFactor||0,clearcoatRoughness:coat?.clearcoatRoughnessFactor||0,envMapIntensity:.85});
      if(p.baseColorTexture)material.map=textures[p.baseColorTexture.index];
      if(m.emissiveFactor)material.emissive.fromArray(m.emissiveFactor);
      if(m.emissiveTexture)material.emissiveMap=textures[m.emissiveTexture.index];
      // The archive stores separate inner/outer glass. The exported pane serves both sides.
      if([33,35,36,51,52].includes(m.extras.sourceShader))material.side=T.DoubleSide;
      material.userData.sourceShader=m.extras.sourceShader;
      return material;
    });
    function attribute(index){const a=data.accessors[index],b=data.bufferViews[a.bufferView],C=a.componentType===5125?Uint32Array:Float32Array,size={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type];return new T.BufferAttribute(new C(bytes.buffer,binStart+b.byteOffset+(a.byteOffset||0),a.count*size),size);}
    const car=new T.Group(),body=new T.Group(),wheels=[],geometryCache=new Map();car.name='BMW M5 CS — supplied 22m5 model';car.add(body);
    for(const node of data.nodes){
      const group=new T.Group();group.name=node.name;group.position.fromArray(node.translation);body.add(group);
      let content=group;
      if(node.extras.part==='wheel'){const spin=new T.Group(),orientation=new T.Group();group.add(spin);spin.add(orientation);if(node.rotation)orientation.quaternion.fromArray(node.rotation);content=orientation;wheels.push({wheel:group,spin,front:node.extras.front,radius:node.extras.radius});}
      for(const p of data.meshes[node.mesh].primitives){
        const key=`${p.attributes.POSITION}/${p.indices}`;let geometry=geometryCache.get(key);
        if(!geometry){geometry=new T.BufferGeometry();geometry.setAttribute('position',attribute(p.attributes.POSITION));geometry.setAttribute('normal',attribute(p.attributes.NORMAL));geometry.setAttribute('uv',attribute(p.attributes.TEXCOORD_0));geometry.setIndex(attribute(p.indices));geometry.computeBoundingSphere();geometryCache.set(key,geometry);}
        const mesh=new T.Mesh(geometry,materials[p.material]);mesh.name=materials[p.material].name;mesh.castShadow=!mesh.material.transparent;mesh.receiveShadow=true;content.add(mesh);
      }
    }
    const brakeMaterials=materials.filter(m=>m.userData.sourceShader===18);
    car.userData={body,wheels,brakeMaterials,ready:Promise.all(pending),source:'22m5/dlc.rpf',geometryCount:geometryCache.size};
    return car;
  };
})();
