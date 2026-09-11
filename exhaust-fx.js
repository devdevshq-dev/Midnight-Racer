/* Four local exhaust jets; follows the M5 body through steering and suspension. */
(() => {
  'use strict';
  window.buildNitroExhaust=function(body){
    const T=THREE,group=new T.Group();group.name='Nitro exhaust flames';group.visible=false;body.add(group);
    const geometry=new T.ConeGeometry(.09,1,12,8,true);geometry.translate(0,.5,0);geometry.rotateX(Math.PI/2);
    const material=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,
      uniforms:{time:{value:0}},
      vertexShader:'uniform float time;varying float lengthwise;void main(){vec3 p=position;lengthwise=p.z;p.x+=sin(p.z*19.-time*32.)*.025*p.z*p.z;p.y+=cos(p.z*15.-time*27.)*.015*p.z;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}',
      fragmentShader:'uniform float time;varying float lengthwise;void main(){float z=clamp(lengthwise,0.,1.);vec3 c=mix(vec3(.18,.5,1.),vec3(1.,.35,.035),smoothstep(.1,.55,z));c=mix(vec3(.75,.9,1.),c,smoothstep(0.,.15,z));float a=(1.-z)*(.65+.2*sin(z*31.-time*39.));gl_FragColor=vec4(c*1.7,a);}' });
    const jets=[];
    // Coordinates use the animated body group, above the road at the four rear outlets.
    for(const x of [-.76,-.57,.57,.76]){const jet=new T.Mesh(geometry,material);jet.position.set(x,.29,2.48);group.add(jet);jets.push(jet);}
    const light=new T.PointLight(0xff7133,0,4,2);light.position.set(0,.4,2.8);body.add(light);
    return {group,jets,update(state,time){const active=state.mode==='playing'&&state.boosting&&!state.braking&&state.nitro>0;group.visible=active;if(!active){light.intensity=0;return;}material.uniforms.time.value=time;for(let i=0;i<jets.length;i++){const flicker=.8+.13*Math.sin(time*41+i*2)+.07*Math.sin(time*73+i);jets[i].scale.set(.9+.1*Math.sin(time*33+i),1,(.65+Math.min(state.speed/300,1)*.45)*flicker);}light.intensity=2.4+.6*Math.sin(time*37);}};
  };
})();
