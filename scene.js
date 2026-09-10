/* Original procedural M5 CS-inspired model. Coordinates are metres; front is -Z. */
(() => {
  'use strict';
  const T = THREE;
  const mat = (color, roughness=.5, metalness=0) => new T.MeshStandardMaterial({color,roughness,metalness});
  const paint = new T.MeshPhysicalMaterial({color:0x354c40,roughness:.36,metalness:.72,clearcoat:.7,clearcoatRoughness:.28});
  const black=mat(0x0b0e11,.65), carbon=mat(0x14191b,.34,.35), bronze=mat(0xb59768,.29,.85);
  const glass=new T.MeshPhysicalMaterial({color:0x18272d,roughness:.1,metalness:.25,clearcoat:1,side:T.DoubleSide});
  const silver=mat(0x9caaad,.25,.9), red=mat(0xb32327,.32,.4);
  const led=new T.MeshStandardMaterial({color:0xffe789,emissive:0xffd338,emissiveIntensity:3});
  const tail=new T.MeshStandardMaterial({color:0xeb1832,emissive:0xff1020,emissiveIntensity:2});
  const cube=new T.BoxGeometry(1,1,1), sphere=new T.SphereGeometry(1,24,12);
  function mesh(g,geometry,material,x=0,y=0,z=0){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;}
  function box(g,m,x,y,z,w,h,d){const o=mesh(g,cube,m,x,y,z);o.scale.set(w,h,d);return o;}
  function ellipsoid(g,m,x,y,z,w,h,d){const o=mesh(g,sphere,m,x,y,z);o.scale.set(w,h,d);return o;}
  function line(g,points,m,r=.01){const c=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));return mesh(g,new T.TubeGeometry(c,Math.max(8,points.length*5),r,6,false),m);}
  function surface(g,rows,m){const pos=[],idx=[],cols=rows[0].length;for(const row of rows)for(const p of row)pos.push(...p);for(let i=0;i<rows.length-1;i++)for(let j=0;j<cols-1;j++){const k=i*cols+j;idx.push(k,k+cols,k+1,k+1,k+cols,k+cols+1);}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();return mesh(g,geo,m);}
  function panel(g,points,m){const s=new T.Shape();s.moveTo(points[0][0],points[0][1]);for(const p of points.slice(1))s.lineTo(p[0],p[1]);s.closePath();return mesh(g,new T.ShapeGeometry(s),m);}
  function rounded(g,m,x,y,z,w,h,r=.06,depth=.018){const s=new T.Shape();s.moveTo(-w/2+r,-h/2);s.lineTo(w/2-r,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);s.lineTo(w/2,h/2-r);s.quadraticCurveTo(w/2,h/2,w/2-r,h/2);s.lineTo(-w/2+r,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);s.lineTo(-w/2,-h/2+r);s.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);const o=mesh(g,new T.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.012,bevelThickness:.01,curveSegments:12}),m,x,y,z);return o;}
  function canvasTexture(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;return texture;}
  const badgeTexture=canvasTexture(128,128,(c)=>{c.fillStyle='#a5aaad';c.beginPath();c.arc(64,64,62,0,Math.PI*2);c.fill();c.fillStyle='#080b0f';c.beginPath();c.arc(64,64,56,0,Math.PI*2);c.fill();for(let i=0;i<4;i++){c.fillStyle=i%2?'#eee':'#2b8dcc';c.beginPath();c.moveTo(64,64);c.arc(64,64,35,i*Math.PI/2,(i+1)*Math.PI/2);c.fill();}c.fillStyle='white';c.font='bold 16px Arial';c.textAlign='center';c.fillText('B M W',64,23);});
  const badgeMat=new T.MeshBasicMaterial({map:badgeTexture,side:T.DoubleSide});
  const plateMat=new T.MeshStandardMaterial({map:canvasTexture(512,128,c=>{c.fillStyle='#eee';c.fillRect(0,0,512,128);c.fillStyle='#18519e';c.fillRect(0,0,42,128);c.fillStyle='white';c.font='25px Arial';c.fillText('D',12,100);c.fillStyle='#13181a';c.font='bold 80px Arial';c.fillText('M EI 2526',55,94);}),roughness:.5});
  const carPaint=paint.clone();carPaint.side=T.DoubleSide;
  function buildCar(){
    const car=new T.Group(),body=new T.Group();car.add(body);const wheels=[];
    // Smooth closed upper shell; lower side edges lift around the actual wheel wells.
    const rows=[];
    for(let j=0;j<=100;j++){
      const z=-2.48+j*4.96/100,front=Math.max(0,(-z-1.95)/.53),rear=Math.max(0,(z-1.95)/.53);
      const w=.982-.10*front*front-.07*rear*rear+.023*Math.exp(-Math.pow((Math.abs(z)-1.5)/.35,2));
      const top=1.025-.18*front*front-.065*rear*rear;
      let bottom=.22;for(const wz of [-1.5,1.48]){const d=Math.abs(z-wz);if(d<.45)bottom=Math.max(bottom,.39+Math.sqrt(.45*.45-d*d));}
      const row=[];for(let k=0;k<=32;k++){const a=Math.PI*k/32;const x=-w*Math.cos(a);const y=top-.11*Math.pow(Math.abs(Math.cos(a)),5);row.push([x,y,z]);}
      row.unshift([-w*.985,bottom,z],[-w*1.005,Math.max(bottom,.63),z]);
      row.push([w*1.005,Math.max(bottom,.63),z],[w*.985,bottom,z]);rows.push(row);
    }
    surface(body,rows,carPaint);
    box(body,black,0,.23,0,1.62,.1,4.55);
    // Hood crown and the two longitudinal power creases of the reference.
    for(const s of [-1,1])line(body,[[s*.37,1.037,-.94],[s*.41,1.04,-1.38],[s*.46,1.004,-1.93],[s*.48,.94,-2.2]],paint,.017);
    const cabin=[];
    for(let j=0;j<=36;j++){
      const z=-.95+j*2.57/36;
      const rise=z<-.35?T.MathUtils.smoothstep(z,-.95,-.35):z>.78?1-T.MathUtils.smoothstep(z,.78,1.62):1;
      const h=1.01+rise*.48,w=.825-rise*.125,row=[];
      const section=[[-.837,1.01],[-w,h-.025],[-w*.6,h+.005],[0,h+.012],[w*.6,h+.005],[w,h-.025],[.837,1.01]];
      for(const [x,y] of section)row.push([x,y,z]);
      cabin.push(row);
    }
    surface(body,cabin,glass);
    // Thin carbon roof follows the cabin, with painted pillars and four-door seams.
    const roof=[];for(let j=0;j<=16;j++){const z=-.32+j*1.15/16,row=[];for(let k=0;k<=20;k++){const x=(k/20-.5)*1.3;row.push([x,1.505-.045*Math.pow(x/.65,4)-.026*Math.pow((z-.24)/.59,4),z]);}roof.push(row);}surface(body,roof,carbon);
    for(const s of [-1,1]){
      line(body,[[s*.83,1.035,-.94],[s*.76,1.21,-.66],[s*.70,1.465,-.34],[s*.70,1.465,.76],[s*.765,1.225,1.2],[s*.835,1.025,1.60]],paint,.018);
      line(body,[[s*.82,1.036,-.88],[s*.80,1.036,.7],[s*.82,1.04,1.45]],black,.018);
      line(body,[[s*.834,1.025,.27],[s*.704,1.465,.24]],carbon,.023);
      line(body,[[s*.986,.91,.3],[s*.99,.63,.32],[s*.982,.29,.36]],black,.006);
      line(body,[[s*.976,.92,-.87],[s*.988,.66,-.85],[s*.982,.29,-.75],[s*.982,.28,1.04],[s*.99,.63,1.08],[s*.98,.92,1.08]],black,.006);
      line(body,[[s*.989,.77,-.91],[s*1.009,.8,.3],[s*1.004,.83,1.03]],paint,.018);
      for(const z of [.08,.93])ellipsoid(body,carbon,s*.993,.877,z,.012,.028,.10);
      line(body,[[s*.975,.28,-1],[s*1.015,.25,.0],[s*.995,.28,.96]],paint,.04);
      for(const wz of [-1.5,1.48]){const pts=[];for(let i=0;i<=32;i++){const a=Math.PI*i/32;pts.push([s*1.009,.39+Math.sin(a)*.452,wz+Math.cos(a)*.452]);}line(body,pts,paint,.024);}
      ellipsoid(body,carbon,s*1.06,1.07,-.73,.17,.068,.11);line(body,[[s*.79,1.04,-.68],[s*1.03,1.06,-.73]],carbon,.024);
      box(body,silver,s*1.07,1.083,-.627,.19,.055,.005);
      line(body,[[s*.995,.86,-1.01],[s*1.003,.84,-.77],[s*1.006,.74,-.91]],bronze,.008);
    }
    // Sculpted bumper, squat bronze kidneys and yellow double-L running lights.
    rounded(body,paint,0,.57,-2.43,1.81,.47,.12,.08);
    for(const s of [-1,1]){
      rounded(body,bronze,s*.263,.815,-2.493,.492,.30,.10,.015);
      rounded(body,black,s*.263,.815,-2.512,.429,.245,.082,.015);
      for(let i=0;i<7;i++)line(body,[[s*.263+(i-3)*.052,.716,-2.537],[s*.263+(i-3)*.052,.80,-2.55],[s*.263+(i-3)*.052,.919,-2.537]],carbon,.009);
      rounded(body,black,s*.73,.863,-2.428,.41,.163,.055,.025);
      for(const dx of [.62,.82]){
        ellipsoid(body,silver,s*dx,.88,-2.47,.046,.035,.015);
        line(body,[[s*(dx-.064),.912,-2.482],[s*(dx-.028),.818,-2.482],[s*(dx+.078),.819,-2.482]],led,.009);
      }
      rounded(body,black,s*.727,.465,-2.495,.335,.22,.045,.012);
      for(let i=0;i<3;i++)box(body,carbon,s*.727,.405+i*.054,-2.52,.285,.014,.018);
      line(body,[[s*.51,.36,-2.47],[s*.76,.30,-2.52],[s*.97,.30,-2.4]],carbon,.035);
    }
    rounded(body,black,0,.403,-2.506,.93,.25,.06,.012);
    for(let i=0;i<5;i++)box(body,carbon,0,.31+i*.043,-2.527,.84,.012,.015);
    for(let i=0;i<14;i++)box(body,carbon,(i-6.5)*.058,.402,-2.53,.014,.205,.012);
    line(body,[[-.94,.258,-2.42],[-.63,.243,-2.52],[0,.239,-2.56],[.63,.243,-2.52],[.94,.258,-2.42]],carbon,.023);
    const fp=mesh(body,new T.PlaneGeometry(.55,.126),plateMat,0,.607,-2.552);fp.rotation.y=Math.PI;
    const badge=mesh(body,new T.CircleGeometry(.052,32),badgeMat,0,.962,-2.315);badge.rotation.x=-Math.PI/2-.17;
    // Rear lights, diffuser, lip spoiler and four hollow exhaust pipes.
    rounded(body,paint,0,.62,2.414,1.81,.42,.11,.06);
    for(const s of [-1,1]){
      rounded(body,black,s*.657,.88,2.421,.50,.14,.04,.016);
      line(body,[[s*.90,.92,2.433],[s*.68,.925,2.465],[s*.42,.9,2.457]],tail,.016);
      line(body,[[s*.9,.91,2.437],[s*.88,.83,2.45],[s*.65,.826,2.463]],tail,.011);
      for(const dx of [.62,.8]){const o=mesh(body,new T.CylinderGeometry(.065,.065,.16,24,1,true),silver,s*dx,.3,2.45);o.rotation.x=Math.PI/2;const hole=mesh(body,new T.CircleGeometry(.05,24),black,s*dx,.3,2.535);}
    }
    box(body,carbon,0,.315,2.4,1.8,.15,.13);for(let i=0;i<5;i++)box(body,carbon,(i-2)*.24,.26,2.45,.02,.14,.19);
    line(body,[[-.86,1.005,2.15],[0,1.025,2.21],[.86,1.005,2.15]],carbon,.033);
    mesh(body,new T.PlaneGeometry(.54,.125),plateMat,0,.653,2.49);
    mesh(body,new T.CircleGeometry(.048,32),badgeMat,0,.858,2.492);
    // Bronze split-spoke wheels, separate spinning hubs, brake discs and calipers.
    const rubber=mat(0x131518,.91),disc=mat(0x737b7c,.42,.8);
    for(const s of [-1,1])for(const wz of [-1.5,1.48]){
      const wheel=new T.Group();wheel.position.set(s*.985,.395,wz);body.add(wheel);
      const tire=mesh(wheel,new T.TorusGeometry(.316,.082,12,56),rubber);tire.rotation.y=Math.PI/2;
      const side=mesh(wheel,new T.CylinderGeometry(.365,.365,.20,48),rubber);side.rotation.z=Math.PI/2;
      const spin=new T.Group();spin.position.x=s*.116;wheel.add(spin);wheels.push({wheel,spin,front:wz<0});
      const rotor=mesh(spin,new T.CylinderGeometry(.265,.265,.017,40),disc);rotor.rotation.z=Math.PI/2;
      for(const r of [.295,.311]){const rim=mesh(spin,new T.TorusGeometry(r,.009,6,56),bronze,s*.025,0,0);rim.rotation.y=Math.PI/2;}
      for(let i=0;i<10;i++){const a=i*Math.PI/5;for(const split of [-1,1]){const b=a+split*.11;line(spin,[[s*.046,Math.cos(a)*.067,Math.sin(a)*.067],[s*.051,Math.cos(a)*.16,Math.sin(a)*.16],[s*.033,Math.cos(b)*.294,Math.sin(b)*.294]],bronze,.012);}}
      for(let i=0;i<5;i++){const a=i*Math.PI*2/5;ellipsoid(spin,silver,s*.068,Math.cos(a)*.057,Math.sin(a)*.057,.012,.011,.011);}
      const hub=mesh(spin,new T.CircleGeometry(.039,24),badgeMat,s*.073,0,0);hub.rotation.y=s*Math.PI/2;
      box(wheel,red,s*.115,.08,.195,.025,.18,.075);
      for(let i=0;i<22;i++){const a=i*Math.PI/11;ellipsoid(spin,black,s*.013,Math.cos(a)*.225,Math.sin(a)*.225,.003,.006,.006);}
    }
    car.userData={body,wheels,tail};return car;
  }
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
      this.player=buildCar();this.scene.add(this.player);this.rivals=[];this.props=[];
      this.makeWorld();this.checkpoint=this.makeGate();this.scene.add(this.checkpoint);
      this.sparkGeometry=new T.BufferGeometry();this.sparkPositions=new Float32Array(90*3);this.sparkGeometry.setAttribute('position',new T.BufferAttribute(this.sparkPositions,3));this.sparks=new T.Points(this.sparkGeometry,new T.PointsMaterial({color:0xffbe61,size:.075,transparent:true}));this.scene.add(this.sparks);this.sparkAge=10;
      addEventListener('resize',()=>{this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.renderer.setSize(innerWidth,innerHeight);});
    }
    roadX(s){return Math.sin(s*.0028)*21+Math.sin(s*.006+.4)*6;}
    roadSlope(s){return Math.cos(s*.0028)*.0588+Math.cos(s*.006+.4)*.036;}
    relativeX(s,d){return this.roadX(s)-this.roadX(d)-(s-d)*this.roadSlope(d);}
    makeWorld(){
      const asphalt=canvasTexture(256,256,(c,w,h)=>{const img=c.createImageData(w,h);for(let i=0;i<img.data.length;i+=4){const v=65+Math.random()*27;img.data[i]=v;img.data[i+1]=v+3;img.data[i+2]=v+4;img.data[i+3]=255;}c.putImageData(img,0,0);});asphalt.wrapS=asphalt.wrapT=T.RepeatWrapping;asphalt.repeat.set(2,100);asphalt.anisotropy=4;
      const roadMat=new T.MeshStandardMaterial({map:asphalt,roughness:.83,bumpMap:asphalt,bumpScale:.015});
      this.roadGeo=new T.PlaneGeometry(14,650,1,130);this.roadGeo.rotateX(-Math.PI/2);this.road=mesh(this.scene,this.roadGeo,roadMat,0,-.025,-290);this.road.receiveShadow=true;this.road.castShadow=false;
      const terrain=new T.PlaneGeometry(1800,1500,90,75);terrain.rotateX(-Math.PI/2);
      const tv=terrain.attributes.position;for(let i=0;i<tv.count;i++){const x=tv.getX(i),z=tv.getZ(i),edge=T.MathUtils.smoothstep(Math.abs(x),38,180);tv.setY(i,-.14+edge*(18+Math.sin(x*.018+z*.008)*14+Math.sin(z*.024)*9));}terrain.computeVertexNormals();
      const ground=mesh(this.scene,terrain,mat(0x69715a,.95),0,0,-400);ground.castShadow=false;
      const sky=new T.Mesh(new T.SphereGeometry(800,32,20),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{},vertexShader:'varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 v;void main(){vec3 n=normalize(v);float t=smoothstep(-.03,.65,n.y);vec3 c=mix(vec3(.66,.71,.71),vec3(.19,.36,.52),t);float sun=pow(max(dot(n,normalize(vec3(-.45,.22,-.8))),0.),350.);c+=vec3(1.,.75,.40)*sun;gl_FragColor=vec4(c,1.);}'}));this.scene.add(sky);
      this.markings=[];const stripe=mat(0xdedbc6,.8),rail=mat(0x8b9292,.46,.5);
      for(let i=0;i<100;i++){const group=new T.Group();for(const x of [-3.5,0,3.5])box(group,stripe,x,0,0,.095,.009,3);for(const s of [-1,1]){box(group,stripe,s*6.8,0,0,.13,.009,7);box(group,rail,s*7.5,.65,0,.12,.3,7);box(group,rail,s*7.5,.3,0,.11,.7,.09);}this.scene.add(group);this.markings.push(group);}
      const leaf=mat(0x344e3f,.94),trunk=mat(0x64564a,.94);
      const treeTemplate=new T.Group();box(treeTemplate,trunk,0,2,0,.16,4,.16);
      for(let i=0;i<8;i++){const geo=new T.ConeGeometry(1.55-i*.17,1.5,24,3);const p=geo.attributes.position;for(let j=0;j<p.count;j++){const factor=.83+.17*Math.sin(j*13.7+i*5);p.setX(j,p.getX(j)*factor);p.setZ(j,p.getZ(j)*factor);}geo.computeVertexNormals();mesh(treeTemplate,geo,i%2?leaf:mat(0x3e5949,.96),0,1.65+i*.5,0);}
      for(let i=0;i<85;i++){const tree=treeTemplate.clone();this.scene.add(tree);this.props.push({object:tree,s:i*9,x:(i%2?-1:1)*(11+(i*17%23)),scale:.7+(i%4)*.35});}
      const mountainMat=mat(0x637984,.99);for(let i=0;i<18;i++){const m=mesh(this.scene,new T.ConeGeometry(65+i%3*25,80+i%5*21,6),mountainMat,(i-9)*95,20,-570-Math.abs(i-9)*10);m.rotation.y=i;m.castShadow=false;}
      for(let i=0;i<14;i++){const lamp=new T.Group();const metal=mat(0x6b7478,.4,.55);box(lamp,metal,0,4,0,.12,8,.12);box(lamp,metal,-1.5,8,0,3,.1,.1);box(lamp,new T.MeshBasicMaterial({color:0xffedc2}),-2.7,7.94,0,.65,.07,.28);this.scene.add(lamp);this.props.push({object:lamp,s:i*50,x:8.4,scale:1});}
    }
    makeGate(){const g=new T.Group(),metal=mat(0x414b50,.4,.6);for(const s of [-1,1])box(g,metal,s*7.25,3.5,0,.18,7,.18);box(g,metal,0,6.9,0,14.6,.2,.2);const tex=canvasTexture(1024,128,(c,w,h)=>{c.fillStyle='#122724';c.fillRect(0,0,w,h);c.fillStyle='#ccf580';c.font='bold 60px Arial';c.textAlign='center';c.fillText('CHECKPOINT  /  +25 SEC',w/2,86);});const sign=mesh(g,new T.PlaneGeometry(9,1.12),new T.MeshBasicMaterial({map:tex,side:T.DoubleSide}),0,6.1,.12);return g;}
    makeTraffic(color){const g=new T.Group(),p=mat(color,.3,.6);ellipsoid(g,p,0,.64,0,.96,.43,2.2);box(g,p,0,.53,0,1.83,.49,4.3);ellipsoid(g,glass,0,1.01,.22,.76,.47,1.16);box(g,p,0,1.32,.3,1.32,.06,1.28);for(const s of [-1,1]){for(const z of [-1.35,1.35]){const tire=mesh(g,new T.CylinderGeometry(.36,.36,.19,16),black,s*.94,.37,z);tire.rotation.z=Math.PI/2;const rim=mesh(g,new T.CircleGeometry(.24,12),silver,s*1.04,.37,z);rim.rotation.y=s*Math.PI/2;}box(g,tail,s*.64,.7,2.155,.42,.09,.035);}this.scene.add(g);this.rivals.push(g);return g;}
    impact(){this.sparkAge=0;}
    render(state,dt,time){
      const menu=state.mode==='menu',d=menu?0:state.distance;
      const positions=this.roadGeo.attributes.position;for(let i=0;i<positions.count;i++){const z=positions.getZ(i)-290;positions.setX(i,(i%2?7:-7)+this.relativeX(d-z,d));}positions.needsUpdate=true;this.roadGeo.computeVertexNormals();
      for(let i=0;i<this.markings.length;i++){const ahead=i*7-(d%7)-28,s=d+ahead,g=this.markings[i];g.position.set(this.relativeX(s,d),.001,-ahead);g.rotation.y=-(this.roadSlope(s)-this.roadSlope(d));}
      for(const p of this.props){const ahead=((p.s-d)%720+720)%720-30;p.object.position.set(p.x+this.relativeX(d+ahead,d),0,-ahead);p.object.scale.setScalar(p.scale);}
      this.player.position.set(menu?2.5:state.x,0,0);this.player.rotation.y=menu?Math.PI-.40:-state.steer*.07;
      this.player.userData.body.rotation.z=menu?0:-state.steer*.02;this.player.userData.body.rotation.x=menu?0:(state.braking?.012:-.003);
      for(const w of this.player.userData.wheels){w.spin.rotation.x-=menu?0:state.speed/3.6*dt/.39;w.wheel.rotation.y=w.front&&!menu?-state.steer*.22:0;}
      tail.emissiveIntensity=state.braking?5:1.5;
      for(let i=0;i<state.traffic.length;i++){const car=state.traffic[i];if(!this.rivals[i])this.makeTraffic([0x657d9b,0xbfc3bf,0x783b34,0x373b44,0xa59778][i%5]);const o=this.rivals[i];o.visible=true;o.position.set(car.x+this.relativeX(car.s,d),0,d-car.s);o.rotation.y=-(this.roadSlope(car.s)-this.roadSlope(d));}
      for(let i=state.traffic.length;i<this.rivals.length;i++)this.rivals[i].visible=false;
      const gate=state.nextCheckpoint;this.checkpoint.visible=!menu&&gate-d<600&&gate-d>-15;this.checkpoint.position.set(this.relativeX(gate,d),0,d-gate);this.checkpoint.rotation.y=-(this.roadSlope(gate)-this.roadSlope(d));
      this.sparkAge+=dt;this.sparks.visible=this.sparkAge<.8;if(this.sparks.visible){for(let i=0;i<90;i++){const a=i*2.4,t=this.sparkAge;this.sparkPositions[i*3]=state.x+Math.sin(a)*t*5;this.sparkPositions[i*3+1]=.5+Math.abs(Math.cos(a))*t*4-t*t*5;this.sparkPositions[i*3+2]=Math.cos(a)*t*5;}this.sparkGeometry.attributes.position.needsUpdate=true;}
      let eye,target;
      if(menu){const mobile=innerWidth<650;eye=mobile?new T.Vector3(9,3.0,10.5):new T.Vector3(8.0,2.65,8.4);target=mobile?new T.Vector3(2.0,1.4,0):new T.Vector3(-.4,.82,0);this.camera.fov=mobile?54:43;}
      else if(state.camera===1){eye=new T.Vector3(state.x,1.23,-1.2);target=new T.Vector3(state.x*.8+this.relativeX(d+65,d),1,-65);this.camera.fov=72;}
      else {eye=new T.Vector3(state.x*.68,3.15,state.boosting?8.5:7.5);target=new T.Vector3(state.x*.65+this.relativeX(d+28,d)*.45,.72,-12);this.camera.fov=T.MathUtils.lerp(this.camera.fov,state.boosting?65:55,Math.min(1,dt*4));}
      this.camera.position.lerp(eye,menu?1:Math.min(1,dt*7));this.camera.lookAt(target);this.camera.updateProjectionMatrix();
      this.renderer.render(this.scene,this.camera);
    }
  }
  window.RaceScene=RaceScene;
})();
