/* Alpine highway renderer. The player uses the converted, user-supplied M5 GLB. */
(() => {
  "use strict";
  const T=THREE;
  const mat = (color, roughness=.5, metalness=0) => new T.MeshStandardMaterial({color,roughness,metalness});
  const cube=new T.BoxGeometry(1,1,1);
  function mesh(g,geometry,material,x=0,y=0,z=0){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;}
  function box(g,m,x,y,z,w,h,d){const o=mesh(g,cube,m,x,y,z);o.scale.set(w,h,d);return o;}
  function canvasTexture(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;return texture;}
  class RaceScene {
    constructor(canvas){
      this.renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
      this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));this.renderer.setSize(innerWidth,innerHeight);
      this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
      this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.15;
      this.scene=new T.Scene();this.scene.background=new T.Color(0x899ba4);this.scene.fog=new T.FogExp2(0xa6aaa5,.0037);
      this.camera=new T.PerspectiveCamera(47,innerWidth/innerHeight,.1,900);
      this.scene.add(new T.HemisphereLight(0xd5e8ff,0x4e4b3b,1.15));
      const sun=new T.DirectionalLight(0xffe0b8,3.3);sun.position.set(-25,35,20);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-22,right:22,top:28,bottom:-28,near:1,far:100});sun.shadow.bias=-.0003;sun.shadow.normalBias=.025;this.scene.add(sun);
      const fill=new T.DirectionalLight(0xb8d9ff,1.4);fill.position.set(8,9,-12);this.scene.add(fill);
      const env=new T.Scene();env.background=new T.Color(0x7d95a2);env.add(new T.HemisphereLight(0xe7f4ff,0x403e34,3));
      const white=new T.MeshBasicMaterial({color:0xffffff});for(const [x,y,z,w,h,d]of [[-8,7,0,2,4,20],[8,6,0,2,3,20],[0,10,0,8,.1,20],[0,3,-12,9,4,.1]])box(env,white,x,y,z,w,h,d);
      const pmrem=new T.PMREMGenerator(this.renderer);this.environment=pmrem.fromScene(env,.07);this.scene.environment=this.environment.texture;pmrem.dispose();
      this.player=buildM5Car();this.scene.add(this.player);this.rivals=[];this.props=[];
      this.makeWorld();this.makeDrivingEffects();this.cameraTarget=new T.Vector3();this.visualTime=0;
      this.sparkGeometry=new T.BufferGeometry();this.sparkPositions=new Float32Array(90*3);this.sparkGeometry.setAttribute('position',new T.BufferAttribute(this.sparkPositions,3));this.sparks=new T.Points(this.sparkGeometry,new T.PointsMaterial({color:0xffbe61,size:.075,transparent:true}));this.scene.add(this.sparks);this.sparkAge=10;
      addEventListener('resize',()=>{this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.renderer.setSize(innerWidth,innerHeight);});
    }
    roadX(s){return Math.sin(s*.0028)*21+Math.sin(s*.006+.4)*6;}
    roadSlope(s){return Math.cos(s*.0028)*.0588+Math.cos(s*.006+.4)*.036;}
    relativeX(s,d){return this.roadX(s)-this.roadX(d)-(s-d)*this.roadSlope(d);}
    makeWorld(){
      const asphalt=canvasTexture(512,512,(c,w,h)=>{const img=c.createImageData(w,h);for(let i=0;i<img.data.length;i+=4){const v=32+Math.random()*23;img.data[i]=v;img.data[i+1]=v+2;img.data[i+2]=v+3;img.data[i+3]=255;}c.putImageData(img,0,0);});asphalt.wrapS=asphalt.wrapT=T.RepeatWrapping;asphalt.repeat.set(3,130);asphalt.anisotropy=8;
      const roadMat=new T.MeshStandardMaterial({map:asphalt,roughness:.83,bumpMap:asphalt,bumpScale:.015});
      this.asphalt=asphalt;
      this.shoulderGeo=new T.PlaneGeometry(16.4,650,1,130);this.shoulderGeo.rotateX(-Math.PI/2);const shoulder=mesh(this.scene,this.shoulderGeo,mat(0x77766c,.98),0,-.045,-290);shoulder.castShadow=false;
      this.roadGeo=new T.PlaneGeometry(14,650,1,130);this.roadGeo.rotateX(-Math.PI/2);this.road=mesh(this.scene,this.roadGeo,roadMat,0,-.025,-290);this.road.receiveShadow=true;this.road.castShadow=false;
      const terrain=new T.PlaneGeometry(1800,1500,180,150);terrain.rotateX(-Math.PI/2);
      const tv=terrain.attributes.position,colors=[],grass=new T.Color(0x3c4b30),rock=new T.Color(0x6b756f),snow=new T.Color(0xbbc5c2);
      for(let i=0;i<tv.count;i++){
        const x=tv.getX(i),z=tv.getZ(i),edge=T.MathUtils.smoothstep(Math.abs(x),42,230);
        const ridge=Math.pow(Math.abs(Math.sin(x*.009+Math.sin(z*.004))*Math.cos(z*.007+x*.003)),1.5);
        const detail=Math.sin(x*.071+z*.04)*1.4+Math.sin(x*.027-z*.09)*1.1;
        const h=-.15+edge*(22+ridge*135+detail*3);tv.setY(i,h);
        const c=grass.clone().lerp(rock,T.MathUtils.smoothstep(h,22,105)).lerp(snow,T.MathUtils.smoothstep(h,115,157));c.multiplyScalar(.9+.12*Math.sin(x*.13+z*.1));colors.push(c.r,c.g,c.b);
      }terrain.setAttribute('color',new T.Float32BufferAttribute(colors,3));terrain.computeVertexNormals();
      const ground=mesh(this.scene,terrain,new T.MeshStandardMaterial({vertexColors:true,roughness:1}),0,0,-400);ground.castShadow=false;
      const sky=new T.Mesh(new T.SphereGeometry(800,32,20),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{},vertexShader:'varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 v;void main(){vec3 n=normalize(v);float t=smoothstep(-.03,.65,n.y);vec3 c=mix(vec3(.78,.69,.55),vec3(.15,.32,.49),t);float sun=pow(max(dot(n,normalize(vec3(-.45,.22,-.8))),0.),350.);c+=vec3(1.,.75,.40)*sun;float cloud=sin(n.x*26.+sin(n.z*17.))*sin(n.z*38.+n.x*8.);c=mix(c,vec3(.86,.81,.72),smoothstep(.38,.85,cloud)*smoothstep(.08,.22,n.y)*(1.-smoothstep(.3,.52,n.y))*.35);gl_FragColor=vec4(c,1.);}'}));this.scene.add(sky);
      this.markings=[];const stripe=mat(0xdedbc6,.8),rail=mat(0x8b9292,.46,.5);
      for(let i=0;i<100;i++){const group=new T.Group();for(const x of [-3.5,0,3.5])box(group,stripe,x,0,0,.095,.009,3);for(const s of [-1,1]){box(group,mat(i%2?0xc9c5ae:0x8d5340,.9),s*7.03,-.01,0,.34,.025,7);box(group,new T.MeshBasicMaterial({color:0xffcf79}),s*7.42,.72,0,.04,.08,.16);box(group,stripe,s*6.8,0,0,.13,.009,7);box(group,rail,s*7.5,.65,0,.12,.3,7);box(group,rail,s*7.5,.3,0,.11,.7,.09);}this.scene.add(group);this.markings.push(group);}
      const leaf=mat(0x203b2c,.94),trunk=mat(0x443a2c,.94);
      const treeTemplate=new T.Group();box(treeTemplate,trunk,0,2,0,.16,4,.16);
      for(let i=0;i<10;i++){const geo=new T.ConeGeometry(1.5-i*.125,1.65,16,5);const p=geo.attributes.position;for(let j=0;j<p.count;j++){const factor=.66+.34*Math.sin(j*13.7+i*5)**2;p.setX(j,p.getX(j)*factor);p.setZ(j,p.getZ(j)*factor);if(p.getY(j)<.7)p.setY(j,p.getY(j)+.15*Math.sin(j*8.3+i));}geo.computeVertexNormals();mesh(treeTemplate,geo,i%2?leaf:mat(0x2d4933,.96),Math.sin(i*4)*.04,1.3+i*.43,0);}
      for(let i=0;i<85;i++){const tree=treeTemplate.clone();this.scene.add(tree);this.props.push({object:tree,s:i*9,x:(i%2?-1:1)*(11+(i*17%23)),scale:.7+(i%4)*.35});}
      for(let i=0;i<14;i++){const lamp=new T.Group();const metal=mat(0x6b7478,.4,.55);box(lamp,metal,0,4,0,.12,8,.12);box(lamp,metal,-1.5,8,0,3,.1,.1);box(lamp,new T.MeshBasicMaterial({color:0xffedc2}),-2.7,7.94,0,.65,.07,.28);this.scene.add(lamp);this.props.push({object:lamp,s:i*50,x:8.4,scale:1});}
    }
    makeDrivingEffects(){
      const glow=canvasTexture(64,64,(c,w,h)=>{const g=c.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);g.addColorStop(0,'rgba(255,255,255,.7)');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.fillRect(0,0,w,h);});
      this.contact=new T.Mesh(new T.PlaneGeometry(3.4,6.2),new T.MeshBasicMaterial({map:glow,color:0x000000,transparent:true,opacity:.6,depthWrite:false}));this.contact.rotation.x=-Math.PI/2;this.contact.position.y=.006;this.scene.add(this.contact);
      this.headlights=[];
      for(const side of [-1,1]){const light=new T.SpotLight(0xffedc9,35,65,.28,.65,1.2);light.position.set(side*.72,.7,-2);light.target.position.set(side*.9,.02,-35);this.player.add(light,light.target);this.headlights.push(light);}
      this.skidGeo=new T.BufferGeometry();this.skidPositions=new Float32Array(240*6);this.skidGeo.setAttribute('position',new T.BufferAttribute(this.skidPositions,3));this.skids=new T.LineSegments(this.skidGeo,new T.LineBasicMaterial({color:0x171b1c,transparent:true,opacity:.45}));this.skids.frustumCulled=false;this.scene.add(this.skids);this.skidHistory=[];this.previousDistance=0;
      // One instanced draw per shared mesh replaces hundreds of individual roadside draws.
      this.sceneryBatches=[];
      const batch=(roots)=>{const groups=new Map();for(const root of roots){root.updateMatrixWorld(true);root.traverse(o=>{if(!o.isMesh)return;const key=o.geometry.uuid+'/'+o.material.uuid;if(!groups.has(key))groups.set(key,[]);groups.get(key).push({root,local:o.matrixWorld.clone(),mesh:o});});root.visible=false;}
        for(const entries of groups.values()){const first=entries[0].mesh,instances=new T.InstancedMesh(first.geometry,first.material,entries.length);instances.castShadow=first.castShadow;instances.receiveShadow=true;instances.frustumCulled=false;instances.instanceMatrix.setUsage(T.DynamicDrawUsage);this.scene.add(instances);this.sceneryBatches.push({instances,entries});}};
      batch(this.markings);batch(this.props.map(p=>p.object));this.instanceTransform=new T.Matrix4();
    }
    makeTraffic(color){const g=buildTrafficCar(color,this.rivals.length%3);this.scene.add(g);this.rivals.push(g);return g;}
    impact(contact){this.sparkAge=0;this.impactContact=contact;}
    render(state,dt,time){
      const menu=state.mode==='menu',d=menu?0:state.distance;this.visualTime+=dt;
      this.asphalt.offset.y=(d/5)%1;
      const positions=this.roadGeo.attributes.position;for(let i=0;i<positions.count;i++){const z=positions.getZ(i)-290;positions.setX(i,(i%2?7:-7)+this.relativeX(d-z,d));}positions.needsUpdate=true;
      const shoulder=this.shoulderGeo.attributes.position;for(let i=0;i<shoulder.count;i++){const z=shoulder.getZ(i)-290;shoulder.setX(i,(i%2?8.2:-8.2)+this.relativeX(d-z,d));}shoulder.needsUpdate=true;
      for(let i=0;i<this.markings.length;i++){const ahead=i*7-(d%7)-28,s=d+ahead,g=this.markings[i];g.position.set(this.relativeX(s,d),.001,-ahead);g.rotation.y=-(this.roadSlope(s)-this.roadSlope(d));}
      for(const p of this.props){const ahead=((p.s-d)%720+720)%720-30;p.object.position.set(p.x+this.relativeX(d+ahead,d),0,-ahead);p.object.scale.setScalar(p.scale);}
      for(const {instances,entries} of this.sceneryBatches){entries.forEach(({root,local},i)=>{root.updateMatrix();this.instanceTransform.multiplyMatrices(root.matrix,local);instances.setMatrixAt(i,this.instanceTransform);});instances.instanceMatrix.needsUpdate=true;}
      this.player.position.set(menu?2.5:state.x,0,0);this.player.rotation.y=menu?Math.PI-.40:-(state.heading||0)+(state.impactYaw||0);
      this.contact.position.x=this.player.position.x;this.contact.rotation.z=-this.player.rotation.y;
      const travelled=d-this.previousDistance;if(travelled<0||state.mode==='countdown')this.skidHistory=[];
      if(dt>0&&!menu){for(const mark of this.skidHistory)mark.z+=Math.max(0,travelled);if(state.speed>65&&(state.braking||Math.abs(state.lateralAcceleration)>10)){for(const side of [-1,1])this.skidHistory.push({x:state.x+side*.8,z:1.5,length:Math.max(.12,travelled)});}}
      this.skidHistory=this.skidHistory.filter(m=>m.z<34).slice(-240);this.skidHistory.forEach((m,i)=>{this.skidPositions.set([m.x,.015,m.z,m.x,.015,m.z+m.length],i*6);});this.skidGeo.setDrawRange(0,this.skidHistory.length*2);this.skidGeo.attributes.position.needsUpdate=true;this.previousDistance=d;
      const body=this.player.userData.body,settle=1-Math.exp(-dt*8);
      body.rotation.z=T.MathUtils.lerp(body.rotation.z,menu?0:T.MathUtils.clamp(-(state.lateralAcceleration||0)*.004,-.045,.045),settle);
      body.rotation.x=T.MathUtils.lerp(body.rotation.x,menu?0:T.MathUtils.clamp(-(state.acceleration||0)*.003,-.025,.035),settle);
      body.position.y=menu?0:Math.sin(this.visualTime*19)*Math.min(state.speed/240,1)*.004;
      for(const w of this.player.userData.wheels){w.spin.rotation.x-=menu?0:state.speed/3.6*dt/(w.radius||.39);w.wheel.rotation.y=w.front&&!menu?-state.steer*(.24/(1+state.speed/120)):0;}
      for(const m of this.player.userData.brakeMaterials)m.emissiveIntensity=state.braking?3:1;
      for(let i=0;i<state.traffic.length;i++){const car=state.traffic[i];if(!this.rivals[i])this.makeTraffic([0x657d9b,0xbfc3bf,0x783b34,0x373b44,0xa59778][i%5]);const o=this.rivals[i];o.visible=true;o.position.set(car.x+this.relativeX(car.s,d),0,d-car.s);const laneVelocity=(car.target-car.x)*.65;
        o.rotation.y=-(this.roadSlope(car.s)-this.roadSlope(d))-Math.atan2(laneVelocity+(car.lateralImpact||0),Math.max(1,car.speed/3.6))+(car.impactYaw||0);
        for(const wheel of o.userData.wheels){wheel.spin.rotation.x-=car.speed/3.6*dt/.34;wheel.pivot.rotation.y=wheel.front?-laneVelocity*.045:0;}
        o.userData.indicators.forEach((light,side)=>{light.visible=Math.abs(car.target-car.x)>.2&&(side===0?laneVelocity<0:laneVelocity>0)&&Math.floor(this.visualTime*3)%2===0;});}
      for(let i=state.traffic.length;i<this.rivals.length;i++)this.rivals[i].visible=false;
      this.sparkAge+=dt;this.sparks.visible=this.sparkAge<.8;if(this.sparks.visible){for(let i=0;i<90;i++){const a=i*2.4,t=this.sparkAge;this.sparkPositions[i*3]=(this.impactContact?.x??state.x)+Math.sin(a)*t*5;this.sparkPositions[i*3+1]=.5+Math.abs(Math.cos(a))*t*4-t*t*5;this.sparkPositions[i*3+2]=(this.impactContact?.z||0)+Math.cos(a)*t*5;}this.sparkGeometry.attributes.position.needsUpdate=true;}
      let eye,target;
      if(menu){const mobile=innerWidth<650;eye=mobile?new T.Vector3(9,3.0,10.5):new T.Vector3(8.0,2.65,8.4);target=mobile?new T.Vector3(2.0,3.3,0):new T.Vector3(-.4,.82,0);this.camera.fov=mobile?50:43;}
      else if(state.camera===1){eye=new T.Vector3(state.x,1.23,-1.2);target=new T.Vector3(state.x*.8+this.relativeX(d+65,d),1,-65);this.camera.fov=72;}
      else {eye=new T.Vector3(state.x*.68,3.15,state.boosting?8.5:7.5);target=new T.Vector3(state.x*.65+this.relativeX(d+28,d)*.45,.72,-12);this.camera.fov=T.MathUtils.lerp(this.camera.fov,55+Math.min(state.speed/300,1)*6+(state.boosting?5:0),1-Math.exp(-dt*4));}
      if(!menu&&this.sparkAge<.45){const strength=(1-this.sparkAge/.45)*.085*(this.impactContact?.strength??1);eye.x+=Math.sin(this.sparkAge*90)*strength;eye.y+=Math.cos(this.sparkAge*73)*strength;}
      this.camera.position.lerp(eye,menu?1:1-Math.exp(-dt*(state.camera?14:6)));this.cameraTarget.lerp(target,menu?1:1-Math.exp(-dt*9));this.camera.lookAt(this.cameraTarget);this.camera.updateProjectionMatrix();
      this.renderer.render(this.scene,this.camera);
    }
  }
  window.RaceScene=RaceScene;
})();
