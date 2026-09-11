/* Animate the supplied M5 cabin without replacing its reference-matching interior. */
(() => {
  'use strict';
  window.installM5Cockpit=function(car){
    const T=THREE,body=car.userData.body,source=body.getObjectByName('22m5_body');
    if(!source)throw Error('M5 interior body node is missing');
    const wheel=new T.Group();wheel.name='Animated M5 steering wheel';wheel.position.set(-.381,.397,-.28);
    const allowed=new Set([15,23,29,30,44,45,48]);let triangles=0;
    // The archive flattened the steering wheel into body materials. Separate only its
    // triangles, retaining the exact positions, UVs, textures, buttons and BMW badge.
    for(const mesh of [...source.children]){
      if(!mesh.isMesh||!allowed.has(mesh.material.userData.sourceShader))continue;
      const geometry=mesh.geometry,p=geometry.attributes.position,indices=geometry.index.array,moving=[],fixed=[];
      const inside=i=>p.getX(i)>-.566&&p.getX(i)<-.196&&p.getY(i)>.225&&p.getY(i)<.57&&p.getZ(i)>-.375&&p.getZ(i)<-.19;
      for(let i=0;i<indices.length;i+=3){const target=inside(indices[i])&&inside(indices[i+1])&&inside(indices[i+2])?moving:fixed;target.push(indices[i],indices[i+1],indices[i+2]);}
      if(!moving.length)continue;
      const subset=list=>{const g=new T.BufferGeometry();for(const [name,a] of Object.entries(geometry.attributes))g.setAttribute(name,a);g.setIndex(new T.BufferAttribute(new Uint32Array(list),1));g.computeBoundingSphere();return g;};
      mesh.geometry=subset(fixed);mesh.visible=fixed.length>0;
      const part=new T.Mesh(subset(moving),mesh.material);part.position.copy(wheel.position).multiplyScalar(-1);part.castShadow=mesh.castShadow;part.receiveShadow=mesh.receiveShadow;wheel.add(part);triangles+=moving.length/3;
    }
    source.add(wheel);
    const canvas=document.createElement('canvas');canvas.width=768;canvas.height=256;
    const context=canvas.getContext('2d'),texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
    const screen=new T.Mesh(new T.PlaneGeometry(.32,.107),new T.MeshBasicMaterial({map:texture,toneMapped:false}));screen.name='Live M5 instruments';screen.position.set(-.381,.416,-.522);screen.rotation.x=.35;source.add(screen);
    const axis=new T.Vector3(0,.4,.9165).normalize();let lastDisplay='',steering=0;
    function draw(state){
      const c=context,w=canvas.width,h=canvas.height,speed=Math.round(state.speed||0),rpm=Math.round(state.rpm||850),gear=state.gear||1;
      c.fillStyle='#06090e';c.fillRect(0,0,w,h);
      c.strokeStyle='#263548';c.lineWidth=3;c.strokeRect(3,3,w-6,h-6);
      c.textAlign='center';c.fillStyle='#e9f2ff';c.font='bold 102px Arial';c.fillText(String(speed),w/2,139);
      c.font='23px Arial';c.fillStyle='#b9c7d7';c.fillText('km/h',w/2,175);
      c.fillStyle='#e9f2ff';c.font='bold 53px Arial';c.fillText('D'+gear,645,132);
      c.fillStyle=state.boosting?'#76bfff':'#ef665b';c.font='bold 22px Arial';c.fillText(state.boosting?'BOOST':'M5 CS',123,150);
      for(let i=0;i<36;i++){c.fillStyle=i<rpm/200?(i>30?'#ff4a45':i>25?'#e8be64':'#dbeaff'):'#202b37';c.fillRect(65+i*18,25,13,20);}
      c.fillStyle='#aebdce';c.font='20px Arial';c.fillText((rpm/1000).toFixed(1)+' ×1000 rpm',w/2,225);
      // A moving speed needle supplements the exact digital reading.
      c.save();c.translate(123,91);c.strokeStyle='#647284';c.lineWidth=4;c.beginPath();c.arc(0,0,46,Math.PI*.8,Math.PI*2.2);c.stroke();
      const a=Math.PI*.8+Math.min(speed/330,1)*Math.PI*1.4;c.strokeStyle='#ff6557';c.lineWidth=5;c.beginPath();c.moveTo(0,0);c.lineTo(Math.cos(a)*43,Math.sin(a)*43);c.stroke();c.restore();texture.needsUpdate=true;
    }
    draw({speed:0,rpm:850,gear:1});
    return {wheel,screen,triangles,update(state,dt){
      if(['menu','countdown'].includes(state.mode))steering=0;
      else if(state.mode==='playing'){const roadAngle=(state.steer||0)*(.24/(1+Math.max(0,state.speed)/120));const target=-roadAngle*14;steering+=(target-steering)*(1-Math.exp(-Math.max(0,dt)*12));}
      wheel.quaternion.setFromAxisAngle(axis,steering);
      const display=[Math.round(state.speed||0),Math.round((state.rpm||850)/50),state.gear||1,!!state.boosting].join('/');if(display!==lastDisplay){draw(state);lastDisplay=display;}
    }};
  };
})();
