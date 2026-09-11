/* Lightweight traffic fleet. Cars face -Z, with shared geometry and materials. */
(() => {
  'use strict';
  const T=THREE;
  const material=(color,roughness=.4,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
  const trim=material(0x12171c,.65),rubber=material(0x111315,.93),alloy=material(0xaeb8c2,.24,.85);
  const windows=new T.MeshPhysicalMaterial({color:0x132330,roughness:.15,metalness:.35,clearcoat:1});
  const red=new T.MeshStandardMaterial({color:0xa30919,emissive:0xff1828,emissiveIntensity:1.7});
  const white=new T.MeshStandardMaterial({color:0xe2edff,emissive:0xc5dcff,emissiveIntensity:2});
  const amber=new T.MeshStandardMaterial({color:0xffa52b,emissive:0xff8400,emissiveIntensity:2});
  const plate=material(0xd3d9d8,.65),cube=new T.BoxGeometry(1,1,1);
  const variants=[
    {name:'Executive sedan',roof:1.43,front:-.72,rear:1.03,roofFront:-.34,roofRear:.62,hood:.79},
    {name:'Sport coupe',roof:1.26,front:-.8,rear:1.2,roofFront:-.28,roofRear:.55,hood:.7},
    {name:'Touring SUV',roof:1.69,front:-.83,rear:1.65,roofFront:-.46,roofRear:1.28,hood:.86}
  ];
  // Cross-section body with chamfered shoulders, rather than intersecting boxes.
  function shell(sections){
    const vertices=[],indices=[];
    for(const [z,width,bottom,top] of sections){
      const bevel=Math.min(.1,(top-bottom)*.25);
      vertices.push(-width*.88,bottom,z,width*.88,bottom,z,width,bottom+bevel,z,width,top-bevel,z,width*.84,top,z,-width*.84,top,z,-width,top-bevel,z,-width,bottom+bevel,z);
    }
    for(let j=0;j<sections.length-1;j++)for(let i=0;i<8;i++){const a=j*8+i,b=j*8+(i+1)%8,c=b+8,d=a+8;indices.push(a,b,d,b,c,d);}
    for(let i=1;i<7;i++){indices.push(0,i+1,i);const end=(sections.length-1)*8;indices.push(end,end+i,end+i+1);}
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
  }
  // Merge static details by material so extra trim doesn't mean dozens of draw calls.
  function batch(group){
    const buckets=new Map();group.updateMatrixWorld(true);
    for(const child of [...group.children]){if(!child.isMesh)continue;const key=child.material;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(child);}
    for(const [mat,parts] of buckets){const positions=[],normals=[];
      for(const part of parts){const geometry=part.geometry.index?part.geometry.toNonIndexed():part.geometry.clone();geometry.applyMatrix4(part.matrix);positions.push(...geometry.attributes.position.array);normals.push(...geometry.attributes.normal.array);geometry.dispose();group.remove(part);}
      const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geometry.computeBoundingSphere();const m=new T.Mesh(geometry,mat);m.castShadow=true;m.receiveShadow=true;group.add(m);
    }
  }
  function box(group,mat,x,y,z,w,h,d){const m=new T.Mesh(cube,mat);m.position.set(x,y,z);m.scale.set(w,h,d);group.add(m);return m;}
  const tireGeometry=new T.CylinderGeometry(.34,.34,.22,20);tireGeometry.rotateZ(Math.PI/2);
  const rimGeometry=new T.CylinderGeometry(.245,.245,.225,20);rimGeometry.rotateZ(Math.PI/2);
  const templates=new Map();
  window.buildTrafficCar=function(color,variant=0){
    variant=((variant%variants.length)+variants.length)%variants.length;
    const key=color+'/'+variant;
    if(!templates.has(key)){
      const v=variants[variant],car=new T.Group(),body=new T.Group();car.name=v.name;car.add(body);
      const paint=new T.MeshPhysicalMaterial({color,metalness:.68,roughness:.28,clearcoat:1,clearcoatRoughness:.16});
      body.add(new T.Mesh(shell([[-2.16,.75,.36,v.hood-.08],[-1.8,.92,.33,v.hood],[-.85,.94,.32,.86],[1.45,.94,.33,.85],[2.15,.82,.4,.77]]),paint));
      body.add(new T.Mesh(shell([[v.front,.75,.79,.92],[v.roofFront,.67,.83,v.roof],[v.roofRear,.66,.83,v.roof],[v.rear,.76,.8,.92]]),windows));
      box(body,paint,0,v.roof+.005,(v.roofFront+v.roofRear)/2,1.31,.06,v.roofRear-v.roofFront+.08);
      for(const side of [-1,1]){
        box(body,paint,side*.91,.38,0,.07,.14,2.35);
        box(body,trim,side*.73,(v.roof+.84)/2,.29,.045,v.roof-.84,.095);
        box(body,alloy,side*.78,.87,.2,.025,.035,1.55);
        box(body,paint,side*.995,.98,-.55,.2,.11,.24);
        box(body,trim,side*.99,.925,-.55,.12,.035,.16);
        for(const z of (variant===1?[.3]:[-.26,.85]))box(body,alloy,side*.944,.76,z,.018,.035,.18);
        box(body,red,side*.61,.72,2.145,.43,.11,.025);
        box(body,white,side*.6,v.hood-.12,-2.145,.4,.07,.035);
        box(body,trim,side*.65,.48,-2.12,.28,.11,.06);
        box(body,alloy,side*.57,.36,2.16,.17,.065,.08);
      }
      box(body,trim,0,.51,-2.16,.74,.19,.045);box(body,alloy,0,.65,-2.17,.78,.025,.02);
      for(let i=-3;i<=3;i++)box(body,alloy,i*.095,.51,-2.188,.018,.14,.012);
      box(body,trim,0,.42,2.16,1.47,.12,.03);box(body,plate,0,.63,2.18,.39,.105,.016);
      for(let i=-2;i<=2;i++)box(body,trim,i*.05,.63,2.192,.024,.045,.006);
      if(variant===1)box(body,trim,0,.83,1.95,1.55,.045,.16);
      if(variant===2)for(const side of [-1,1])box(body,alloy,side*.55,v.roof+.07,.4,.045,.045,1.62);
      batch(body);
      for(const side of [-1,1])for(const z of [-1.36,1.37]){
        const pivot=new T.Group(),spin=new T.Group();pivot.name=z<0?'front-wheel':'rear-wheel';pivot.position.set(side*.9,.35,z);pivot.add(spin);body.add(pivot);
        spin.add(new T.Mesh(tireGeometry,rubber),new T.Mesh(rimGeometry,trim));
        for(let i=0;i<5;i++){const angle=i*Math.PI*2/5;const spoke=box(spin,alloy,side*.12,Math.sin(angle)*.115,Math.cos(angle)*.115,.025,.055,.23);spoke.rotation.x=-angle;}
        box(spin,alloy,side*.135,0,0,.025,.095,.095);batch(spin);
      }
      for(const side of [-1,1]){const indicator=box(car,amber,side*.86,.71,2.15,.08,.075,.03);indicator.name=side<0?'indicator-left':'indicator-right';}
      templates.set(key,car);
    }
    const car=templates.get(key).clone(true);car.userData.wheels=[];
    car.traverse(o=>{if(o.name.endsWith('-wheel'))car.userData.wheels.push({pivot:o,spin:o.children[0],front:o.name==='front-wheel'});});
    car.userData.indicators=[car.getObjectByName('indicator-left'),car.getObjectByName('indicator-right')];return car;
  };
})();
