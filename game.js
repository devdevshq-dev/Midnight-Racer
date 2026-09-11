(() => {
  'use strict';
  const $=id=>document.getElementById(id),clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  let scene;
  try {scene=new RaceScene($('world'));} catch(error){$('menu').innerHTML='<h2>Unable to start 3D graphics</h2><p>Enable hardware acceleration and reload in a modern browser.</p>';console.error(error);return;}
  let modelReady=!scene.player?.userData.ready;
  if(!modelReady){$('start').disabled=true;$('start').textContent='LOADING YOUR M5…';scene.player.userData.ready.then(()=>{modelReady=true;$('start').disabled=!!scene.contextLost;$('start').innerHTML='START YOUR ENGINE <span>↗</span>';}).catch(error=>{$('start').textContent='MODEL LOAD FAILED — RELOAD';console.error(error);});}
  const state={mode:'menu',distance:0,speed:0,speedLevel:0,speedMultiplier:1,x:0,steer:0,lateralVelocity:0,lateralAcceleration:0,acceleration:0,heading:0,impactYaw:0,impactRecovery:0,nitro:100,health:100,elapsed:0,score:0,combo:1,nearMisses:0,camera:0,traffic:[],boosting:false,braking:false};
  const keys=new Set(),touch={left:false,right:false,boost:false,brake:false};
  let last=0,countdown=3,spawnTimer=0,immunity=0,noticeTime=0,comboTime=0,previousMode='playing',best=0;
  try{best=Number(localStorage.getItem('nightshift-score'))||0;}catch{}
  $('menu-best').innerHTML=`${best.toLocaleString()} <small>PTS</small>`;
  const audio=new window.RaceEngineAudio(),drivetrain=new window.RaceDrivetrain(),resetTouch=[];
  function clearInput(){for(const reset of resetTouch)reset();keys.clear();for(const k in touch)touch[k]=false;}
  function notice(message,seconds=2){$('notice').textContent=message;noticeTime=seconds;}
  function start(){if(!modelReady||scene.contextLost)return;Object.assign(state,{mode:'countdown',distance:0,speed:0,speedLevel:0,speedMultiplier:1,x:0,steer:0,lateralVelocity:0,lateralAcceleration:0,acceleration:0,heading:0,impactYaw:0,impactRecovery:0,nitro:100,health:100,elapsed:0,score:0,combo:1,nearMisses:0,traffic:[],boosting:false,braking:false});drivetrain.reset(state);clearInput();countdown=3;spawnTimer=1;immunity=0;comboTime=0;$('menu').hidden=true;$('overlay').hidden=true;$('hud').hidden=false;$('car-info').hidden=true;document.body.classList.add('playing');$('countdown').hidden=false;$('countdown').textContent='3';$('pause').textContent='Ⅱ';$('pause').setAttribute('aria-label','Pause game');notice('ENDLESS RUN / SPEED +10% EVERY 15 SECONDS',4);audio.start();audio.beep(500);updateHUD();}
  function pause(){if(state.mode==='paused'){if(scene.contextLost)return;state.mode=previousMode;$('overlay').hidden=true;$('pause').textContent='Ⅱ';$('pause').setAttribute('aria-label','Pause game');audio.start();return;}if(!['playing','countdown'].includes(state.mode))return;previousMode=state.mode;state.mode='paused';clearInput();state.boosting=false;$('overlay').hidden=false;$('dialog-label').textContent='RUN PAUSED';$('dialog-title').textContent='PIT STOP.';$('dialog-copy').textContent='Steer with A / D. Brake with S. Boost with Space. C changes camera. Your speed-increase timer is paused too.';$('resume').hidden=false;$('restart').textContent='RESTART RUN';$('pause').textContent='▶';$('pause').setAttribute('aria-label','Resume game');}
  function finish(reason='CAR TOTALLED'){state.mode='crashed';state.boosting=false;clearInput();$('countdown').hidden=true;const score=Math.floor(state.score+state.distance);if(score>best){best=score;try{localStorage.setItem('nightshift-score',String(best));}catch{}}$('overlay').hidden=false;$('dialog-label').textContent=reason;$('dialog-title').textContent='RUN ENDED.';$('dialog-copy').textContent=`${score.toLocaleString()} points · ${(state.distance/1000).toFixed(2)} km · ${state.nearMisses} close passes · Best ${best.toLocaleString()}`;$('resume').hidden=true;$('restart').textContent='DRIVE AGAIN ↗';audio.beep(120,.4);}
  function hit(amount,contact=null){if(!contact&&immunity>0)return;state.health=Math.max(0,state.health-amount);if(!contact)state.speed*=.48;state.combo=1;immunity=1.6;scene.impact(contact);audio.impact(contact?.strength??.6);notice(`${contact?.label||'COLLISION'} / −${amount}% CONDITION`);$('impact').classList.add('flash');setTimeout(()=>$('impact').classList.remove('flash'),250);if(state.health<=0)finish();}
  function collide(c,normal){
    const trafficLateral=(c.target-c.x)*.65+(c.lateralImpact||0);
    const closing=(state.lateralVelocity-trafficLateral)*normal.x+(state.speed-c.speed)/3.6*normal.s;
    // Resolve penetration even while damage is on cooldown. Distance remains monotonic.
    if(normal.s)c.s=state.distance+normal.s*4.56;
    else {
      const overlap=Math.max(0,1.93-(c.x-state.x)*normal.x);
      const oldX=state.x;state.x=clamp(state.x-normal.x*overlap*.5,-5.92,5.92);
      c.x+=normal.x*(overlap-Math.abs(state.x-oldX));
    }
    c.passed=true;
    if(closing<=0)return;
    const impulse=closing*.57;
    state.speed=Math.max(0,state.speed-impulse*normal.s*3.6);
    c.speed=Math.max(0,c.speed+impulse*normal.s*3.6);
    state.lateralVelocity=clamp(state.lateralVelocity-impulse*normal.x,-10,10);
    c.lateralImpact=clamp((c.lateralImpact||0)+impulse*normal.x,-8,8);
    c.recovery=1.2;c.change=Math.max(c.change,2);
    const twist=normal.x*.1+normal.s*clamp(c.x-state.x,-1,1)*.06;
    state.impactYaw=clamp(state.impactYaw+twist*Math.min(closing/8,2),-.24,.24);
    c.impactYaw=clamp((c.impactYaw||0)-twist*Math.min(closing/8,2),-.3,.3);
    state.impactRecovery=Math.max(state.impactRecovery,Math.min(.8,closing*.025));state.boosting=false;
    if((c.contactCooldown||0)>0||closing<.5)return;
    c.contactCooldown=1.2;
    const damage=Math.round(clamp(normal.x?3+closing*2:5+closing*1.25,3,65));
    hit(damage,{x:(state.x+c.x)/2,z:-normal.s*2.2,strength:clamp(closing/22,.15,1),label:normal.x?'SIDESWIPE':normal.s>0?'FRONT IMPACT':'REAR IMPACT'});
  }
  function update(dt){
    if(state.mode==='countdown'){const before=Math.ceil(countdown);countdown-=dt;if(Math.ceil(countdown)!==before)audio.beep(countdown>0?500:1000);$('countdown').textContent=Math.max(1,Math.ceil(countdown));if(countdown<=0){state.mode='playing';state.speed=35;$('countdown').hidden=true;notice('GO / FIND YOUR LINE',2);}return;}
    if(state.mode!=='playing')return;
    state.impactYaw*=Math.exp(-dt*5);state.impactRecovery=Math.max(0,state.impactRecovery-dt);
    const previousX=state.x;
    state.elapsed+=dt;immunity=Math.max(0,immunity-dt);
    const speedLevel=Math.floor((state.elapsed+1e-8)/15);
    if(speedLevel>state.speedLevel){const increase=Math.pow(1.1,speedLevel-state.speedLevel);state.speed*=increase;state.speedLevel=speedLevel;state.speedMultiplier=Math.pow(1.1,speedLevel);notice(`PACE INCREASED / +10% / ${Math.round(state.speedMultiplier*100)}% PACE`,2.5);}
    state.braking=keys.has('KeyS')||keys.has('ArrowDown')||touch.brake;state.boosting=(keys.has('Space')||touch.boost)&&state.nitro>1&&!state.braking&&state.impactRecovery===0;
    const gas=keys.has('KeyW')||keys.has('ArrowUp'),target=state.braking?40:(state.boosting?300:gas?240:215)*state.speedMultiplier,rate=state.braking?2.3:state.boosting?1.1:.38;const previousSpeed=state.speed;state.speed+=(target-state.speed)*(1-Math.exp(-dt*rate*(state.impactRecovery>0&&!state.braking?.25:1)));state.acceleration=(state.speed-previousSpeed)/3.6/dt;state.nitro=clamp(state.nitro+(state.boosting?-24:9)*dt,0,100);
    const input=(keys.has('KeyD')||keys.has('ArrowRight')||touch.right?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')||touch.left?1:0);// Speed-sensitive steering builds lateral momentum; grip progressively arrests a slide.
    const velocity=state.speed/3.6;
    state.steer+=(input-state.steer)*(1-Math.exp(-dt*(input?8:11)));
    const oldSlope=scene.roadSlope(state.distance),move=velocity*dt;
    state.distance+=move;
    const curvature=(scene.roadSlope(state.distance)-oldSlope)/Math.max(move,.001);
    const steeringAuthority=clamp(velocity/14,0,1)*(5.8+Math.min(velocity,95)*.018);
    const desiredLateral=state.steer*steeringAuthority;
    const grip=state.braking?6.5:state.boosting?3.8:5;
    const lateralForce=(desiredLateral-state.lateralVelocity)*grip-curvature*Math.min(velocity,120)**2*.28;
    state.lateralAcceleration=clamp(lateralForce,-13,13);
    state.lateralVelocity+=state.lateralAcceleration*dt;
    state.x+=state.lateralVelocity*dt;
    state.heading=Math.atan2(state.lateralVelocity,Math.max(velocity,12));
    if(Math.abs(state.x)>5.92){
      state.x=clamp(state.x,-5.92,5.92);
      state.lateralVelocity=-Math.sign(state.x)*Math.abs(state.lateralVelocity)*.28;
      hit(18);
    }if(state.mode!=='playing')return;
    spawnTimer-=dt;if(spawnTimer<=0){const lane=Math.floor(Math.random()*4),x=(lane-1.5)*3.5,s=state.distance+170+Math.random()*40;if(!state.traffic.some(c=>Math.abs(c.s-s)<20&&Math.abs(c.x-x)<3))state.traffic.push({x,s,speed:85+Math.random()*45,passed:false,target:x,change:4+Math.random()*5});spawnTimer=Math.max(.8,1.6-state.distance/7000);}
    for(const c of state.traffic){const previousGap=c.s-(state.distance-move),previousTrafficX=c.x;
      c.contactCooldown=Math.max(0,(c.contactCooldown||0)-dt);c.recovery=Math.max(0,(c.recovery||0)-dt);c.impactYaw=(c.impactYaw||0)*Math.exp(-dt*4);
      c.cruiseSpeed??=c.speed;if(c.recovery===0)c.speed+=(c.cruiseSpeed-c.speed)*(1-Math.exp(-dt*.6));
      c.x+=(c.lateralImpact||0)*dt;c.lateralImpact=(c.lateralImpact||0)*Math.exp(-dt*3);
      c.s+=c.speed/3.6*dt;c.change-=dt;if(c.recovery===0&&c.change<0&&c.s-state.distance>40){const next=clamp(c.target+(Math.random()>.5?3.5:-3.5),-5.25,5.25);if(!state.traffic.some(other=>other!==c&&Math.abs(other.s-c.s)<20&&Math.abs(other.x-next)<2.9))c.target=next;c.change=6;}c.x+=(c.target-c.x)*Math.min(1,dt*.65);const dz=c.s-state.distance,dx=Math.abs(c.x-state.x);const contact=window.trafficContact({x:previousTrafficX-previousX,s:previousGap},{x:c.x-state.x,s:dz});if(contact){collide(c,contact);if(state.mode!=='playing')return;}if(dz<-5&&!c.passed){c.passed=true;if(dx<2.9&&immunity===0){state.nearMisses++;state.score+=250*state.combo;state.combo=Math.min(5,state.combo+1);comboTime=5;state.nitro=Math.min(100,state.nitro+12);notice(`CLOSE PASS / ${state.combo}× COMBO / +12 NITRO`);audio.beep(800,.06);}else state.score+=60;}}
    state.traffic=state.traffic.filter(c=>c.s>state.distance-30);comboTime-=dt;if(comboTime<=0)state.combo=1;
    noticeTime-=dt;if(noticeTime<=0)$('notice').textContent=state.boosting?'NITRO ENGAGED':'';
  }
  function updateHUD(){$('distance').textContent=(state.distance/1000).toFixed(2);$('best').textContent=`NEXT +10% IN ${Math.max(0,15*(state.speedLevel+1)-state.elapsed).toFixed(1)} S`;$('speed').textContent=Math.round(state.speed);$('speed-fill').style.width=`${clamp(state.speed/(300*state.speedMultiplier)*100,0,100)}%`;$('boost-fill').style.width=`${state.nitro}%`;$('nitro-label').textContent=state.boosting?'ACTIVE':`${Math.round(state.nitro)}%`;$('timer').textContent=`${Math.floor(state.elapsed/60)}:${String(Math.floor(state.elapsed%60)).padStart(2,'0')}`;$('score').textContent=Math.floor(state.score+state.distance).toLocaleString();$('health-fill').style.width=`${state.health}%`;$('health-label').textContent=`${state.health}%`;$('gear').textContent=`${state.gear||1}`;$('pace').textContent=`${state.speedMultiplier.toFixed(2)}×`;}
  $('start').onclick=start;$('restart').onclick=start;$('pause').onclick=pause;$('resume').onclick=pause;
  $('mute').onclick=()=>{audio.muted=!audio.muted;$('mute').textContent=audio.muted?'SOUND OFF':'SOUND ON';$('mute').setAttribute('aria-pressed',String(audio.muted));if(!audio.muted)audio.start();audio.update(state);};
  const changeCamera=()=>{state.camera=(state.camera+1)%3;$('camera').textContent=['CHASE CAM','HOOD CAM','COCKPIT CAM'][state.camera];};$('camera').onclick=changeCamera;
  addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space'].includes(e.code))e.preventDefault();if(e.repeat){keys.add(e.code);return;}if(e.code==='KeyP'||e.code==='Escape'){pause();return;}if(e.code==='KeyC'){changeCamera();return;}if(e.code==='KeyM'){$('mute').click();return;}if(e.code==='Enter'&&['menu','crashed'].includes(state.mode)){start();return;}keys.add(e.code);});addEventListener('keyup',e=>keys.delete(e.code));
  addEventListener('blur',()=>{clearInput();if(['playing','countdown'].includes(state.mode))pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&['playing','countdown'].includes(state.mode))pause();});
  for(const id of ['left','right','boost','brake'])resetTouch.push(window.bindRaceControl($(id),active=>{touch[id]=active;}));
  $('world').oncontextmenu=e=>e.preventDefault();
  $('world').addEventListener?.('webglcontextlost',e=>{e.preventDefault();scene.contextLost=true;if(['playing','countdown'].includes(state.mode))pause();$('resume').disabled=true;$('start').disabled=true;clearInput();$('dialog-copy').textContent='Graphics were interrupted. Waiting for your browser to restore them…';});
  $('world').addEventListener?.('webglcontextrestored',()=>{scene.contextLost=false;scene.needsRender=true;$('resume').disabled=false;$('start').disabled=!modelReady;$('dialog-copy').textContent='Graphics restored. Tap Back to the Road to continue.';});
  window.nightshift={getState:()=>({...state,traffic:state.traffic.map(c=>({...c})),drawCalls:scene.renderer.info.render.calls,triangles:scene.renderer.info.render.triangles})};
  let accumulator=0,hudTime=0;
  function frame(t){const dt=clamp((t-last)/1000||0,0,.1);last=t;accumulator+=dt;while(accumulator>=1/120){update(1/120);drivetrain.update(state,1/120);accumulator-=1/120;}hudTime+=dt;if(hudTime>=1/15){if(state.mode!=='menu')updateHUD();audio.update(state);hudTime=0;}scene.render(state,['paused','crashed'].includes(state.mode)?0:dt,t/1000);requestAnimationFrame(frame);}requestAnimationFrame(frame);
})();
