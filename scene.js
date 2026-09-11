/* Alpine highway renderer. The player uses the converted, user-supplied M5 GLB. */
(() => {
  "use strict";
  const T=THREE;
  const mat = (color, roughness=.5, metalness=0) => new T.MeshStandardMaterial({color,roughness,metalness});
  const tail=new T.MeshStandardMaterial({color:0xeb1832,emissive:0xff1020,emissiveIntensity:2});
  const cube=new T.BoxGeometry(1,1,1), sphere=new T.SphereGeometry(1,24,12);
  function mesh(g,geometry,material,x=0,y=0,z=0){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;}
  function box(g,m,x,y,z,w,h,d){const o=mesh(g,cube,m,x,y,z);o.scale.set(w,h,d);return o;}
  function ellipsoid(g,m,x,y,z,w,h,d){const o=mesh(g,sphere,m,x,y,z);o.scale.set(w,h,d);return o;}
  function canvasTexture(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;return texture;}
  const black=mat(0x0b0e11,.65),silver=mat(0x9caaad,.25,.9);
  const glass=new T.MeshPhysicalMaterial({color:0x18272d,roughness:.1,metalness:.25,clearcoat:1});
  class RaceScene {
    constructor(canvas){
      this.renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
      this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));this.renderer.setSize(innerWidth,innerHeight);
      this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
      this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.15;
      this.scene=new T.Scene();this.scene.background=new T.Color(0x899ba4);this.scene.fog=new T.FogExp2(0x899ba4,.0043);
      this.camera=new T.PerspectiveCamera(47,innerWidth/innerHeight,.1,900);
      this.scene.add(new T.HemisphereLight(0xd5e8ff,0x4e4b3b,1.15));
      const sun=new T.DirectionalLight(0xffe0b8,3.3);sun.position.set(-25,35,20);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-22,right:22,top:28,bottom:-28,near:1,far:100});sun.shadow.bias=-.0003;sun.shadow.normalBias=.025;this.scene.add(sun);
      const fill=new T.DirectionalLight(0xb8d9ff,1.4);fill.position.set(8,9,-12);this.scene.add(fill);
      const env=new T.Scene();env.background=new T.Color(0x7d95a2);env.add(new T.HemisphereLight(0xe7f4ff,0x403e34,3));
      const white=new T.MeshBasicMaterial({color:0xffffff});for(const [x,y,z,w,h,d]of [[-8,7,0,2,4,20],[8,6,0,2,3,20],[0,10,0,8,.1,20],[0,3,-12,9,4,.1]])box(env,white,x,y,z,w,h,d);
      const pmrem=new T.PMREMGenerator(this.renderer);this.environment=pmrem.fromScene(env,.07);this.scene.environment=this.environment.texture;pmrem.dispose();
      this.player=buildM5Car();this.scene.add(this.player);this.rivals=[];this.props=[];
      this.makeWorld();
      this.sparkGeometry=new T.BufferGeometry();this.sparkPositions=new Float32Array(90*3);this.sparkGeometry.setAttribute('position',new T.BufferAttribute(this.sparkPositions,3));this.sparks=new T.Points(this.sparkGeometry,new T.PointsMaterial({color:0xffbe61,size:.075,transparent:true}));this.scene.add(this.sparks);this.sparkAge=10;
      addEventListener('resize',()=>{this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.renderer.setSize(innerWidth,innerHeight);});
    }
    roadX(s){return Math.sin(s*.0028)*21+Math.sin(s*.006+.4)*6;}
    roadSlope(s){return Math.cos(s*.0028)*.0588+Math.cos(s*.006+.4)*.036;}
    relativeX(s,d){return this.roadX(s)-this.roadX(d)-(s-d)*this.roadSlope(d);}
    makeWorld(){
      const asphalt=canvasTexture(512,512,(c,w,h)=>{const img=c.createImageData(w,h);for(let i=0;i<img.data.length;i+=4){const v=32+Math.random()*23;img.data[i]=v;img.data[i+1]=v+2;img.data[i+2]=v+3;img.data[i+3]=255;}c.putImageData(img,0,0);});asphalt.wrapS=asphalt.wrapT=T.RepeatWrapping;asphalt.repeat.set(3,130);asphalt.anisotropy=8;
      const roadMat=new T.MeshStandardMaterial({map:asphalt,roughness:.83,bumpMap:asphalt,bumpScale:.015});
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
      const sky=new T.Mesh(new T.SphereGeometry(800,32,20),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{},vertexShader:'varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 v;void main(){vec3 n=normalize(v);float t=smoothstep(-.03,.65,n.y);vec3 c=mix(vec3(.66,.71,.71),vec3(.19,.36,.52),t);float sun=pow(max(dot(n,normalize(vec3(-.45,.22,-.8))),0.),350.);c+=vec3(1.,.75,.40)*sun;gl_FragColor=vec4(c,1.);}'}));this.scene.add(sky);
      this.markings=[];const stripe=mat(0xdedbc6,.8),rail=mat(0x8b9292,.46,.5);
      for(let i=0;i<100;i++){const group=new T.Group();for(const x of [-3.5,0,3.5])box(group,stripe,x,0,0,.095,.009,3);for(const s of [-1,1]){box(group,stripe,s*6.8,0,0,.13,.009,7);box(group,rail,s*7.5,.65,0,.12,.3,7);box(group,rail,s*7.5,.3,0,.11,.7,.09);}this.scene.add(group);this.markings.push(group);}
      const leaf=mat(0x203b2c,.94),trunk=mat(0x443a2c,.94);
      const treeTemplate=new T.Group();box(treeTemplate,trunk,0,2,0,.16,4,.16);
      for(let i=0;i<10;i++){const geo=new T.ConeGeometry(1.5-i*.125,1.65,16,5);const p=geo.attributes.position;for(let j=0;j<p.count;j++){const factor=.66+.34*Math.sin(j*13.7+i*5)**2;p.setX(j,p.getX(j)*factor);p.setZ(j,p.getZ(j)*factor);if(p.getY(j)<.7)p.setY(j,p.getY(j)+.15*Math.sin(j*8.3+i));}geo.computeVertexNormals();mesh(treeTemplate,geo,i%2?leaf:mat(0x2d4933,.96),Math.sin(i*4)*.04,1.3+i*.43,0);}
      for(let i=0;i<85;i++){const tree=treeTemplate.clone();this.scene.add(tree);this.props.push({object:tree,s:i*9,x:(i%2?-1:1)*(11+(i*17%23)),scale:.7+(i%4)*.35});}
      for(let i=0;i<14;i++){const lamp=new T.Group();const metal=mat(0x6b7478,.4,.55);box(lamp,metal,0,4,0,.12,8,.12);box(lamp,metal,-1.5,8,0,3,.1,.1);box(lamp,new T.MeshBasicMaterial({color:0xffedc2}),-2.7,7.94,0,.65,.07,.28);this.scene.add(lamp);this.props.push({object:lamp,s:i*50,x:8.4,scale:1});}
    }
    makeTraffic(color){const g=new T.Group(),p=mat(color,.3,.6);ellipsoid(g,p,0,.64,0,.96,.43,2.2);box(g,p,0,.53,0,1.83,.49,4.3);ellipsoid(g,glass,0,1.01,.22,.76,.47,1.16);box(g,p,0,1.32,.3,1.32,.06,1.28);for(const s of [-1,1]){for(const z of [-1.35,1.35]){const tire=mesh(g,new T.CylinderGeometry(.36,.36,.19,16),black,s*.94,.37,z);tire.rotation.z=Math.PI/2;const rim=mesh(g,new T.CircleGeometry(.24,12),silver,s*1.04,.37,z);rim.rotation.y=s*Math.PI/2;}box(g,tail,s*.64,.7,2.155,.42,.09,.035);}this.scene.add(g);this.rivals.push(g);return g;}
    impact(){this.sparkAge=0;}
    render(state,dt,time){
      const menu=state.mode==='menu',d=menu?0:state.distance;
      const positions=this.roadGeo.attributes.position;for(let i=0;i<positions.count;i++){const z=positions.getZ(i)-290;positions.setX(i,(i%2?7:-7)+this.relativeX(d-z,d));}positions.needsUpdate=true;this.roadGeo.computeVertexNormals();
      for(let i=0;i<this.markings.length;i++){const ahead=i*7-(d%7)-28,s=d+ahead,g=this.markings[i];g.position.set(this.relativeX(s,d),.001,-ahead);g.rotation.y=-(this.roadSlope(s)-this.roadSlope(d));}
      for(const p of this.props){const ahead=((p.s-d)%720+720)%720-30;p.object.position.set(p.x+this.relativeX(d+ahead,d),0,-ahead);p.object.scale.setScalar(p.scale);}
      this.player.position.set(menu?2.5:state.x,0,0);this.player.rotation.y=menu?Math.PI-.40:-state.steer*.07;
      this.player.userData.body.rotation.z=menu?0:-state.steer*.02;this.player.userData.body.rotation.x=menu?0:(state.braking?.012:-.003);
      for(const w of this.player.userData.wheels){w.spin.rotation.x-=menu?0:state.speed/3.6*dt/(w.radius||.39);w.wheel.rotation.y=w.front&&!menu?-state.steer*.22:0;}
      tail.emissiveIntensity=state.braking?5:1.5;
      for(const m of this.player.userData.brakeMaterials)m.emissiveIntensity=state.braking?3:1;
      for(let i=0;i<state.traffic.length;i++){const car=state.traffic[i];if(!this.rivals[i])this.makeTraffic([0x657d9b,0xbfc3bf,0x783b34,0x373b44,0xa59778][i%5]);const o=this.rivals[i];o.visible=true;o.position.set(car.x+this.relativeX(car.s,d),0,d-car.s);o.rotation.y=-(this.roadSlope(car.s)-this.roadSlope(d));}
      for(let i=state.traffic.length;i<this.rivals.length;i++)this.rivals[i].visible=false;
      this.sparkAge+=dt;this.sparks.visible=this.sparkAge<.8;if(this.sparks.visible){for(let i=0;i<90;i++){const a=i*2.4,t=this.sparkAge;this.sparkPositions[i*3]=state.x+Math.sin(a)*t*5;this.sparkPositions[i*3+1]=.5+Math.abs(Math.cos(a))*t*4-t*t*5;this.sparkPositions[i*3+2]=Math.cos(a)*t*5;}this.sparkGeometry.attributes.position.needsUpdate=true;}
      let eye,target;
      if(menu){const mobile=innerWidth<650;eye=mobile?new T.Vector3(9,3.0,10.5):new T.Vector3(8.0,2.65,8.4);target=mobile?new T.Vector3(2.0,3.3,0):new T.Vector3(-.4,.82,0);this.camera.fov=mobile?50:43;}
      else if(state.camera===1){eye=new T.Vector3(state.x,1.23,-1.2);target=new T.Vector3(state.x*.8+this.relativeX(d+65,d),1,-65);this.camera.fov=72;}
      else {eye=new T.Vector3(state.x*.68,3.15,state.boosting?8.5:7.5);target=new T.Vector3(state.x*.65+this.relativeX(d+28,d)*.45,.72,-12);this.camera.fov=T.MathUtils.lerp(this.camera.fov,state.boosting?65:55,Math.min(1,dt*4));}
      this.camera.position.lerp(eye,menu?1:Math.min(1,dt*7));this.camera.lookAt(target);this.camera.updateProjectionMatrix();
      this.renderer.render(this.scene,this.camera);
    }
  }
  window.RaceScene=RaceScene;
})();
