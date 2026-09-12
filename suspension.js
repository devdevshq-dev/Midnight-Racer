/* Sprung-body weight transfer. +X right, +Z rear: positive pitch lifts the nose. */
(() => {
  'use strict';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function settle(spring,target,dt){
    const omega=10,offset=spring.value-target,decay=Math.exp(-omega*dt),step=(spring.velocity+omega*offset)*dt;
    spring.value=target+(offset+step)*decay;spring.velocity=(spring.velocity-omega*step)*decay;
  }
  window.RaceSuspension=class {
    constructor(){this.reset();}
    reset(){this.pitch={value:0,velocity:0};this.roll={value:0,velocity:0};this.travel=0;this.rideTime=0;this.rideStrength=0;}
    update(state,dt){
      if(['menu','countdown'].includes(state.mode)){this.reset();return;}
      if(state.mode!=='playing')return;
      dt=Math.max(0,dt);
      // A right turn loads the left (outside) springs, raising the right edge.
      const pitch=clamp((state.acceleration||0)*.006,-.052,.045);
      const roll=clamp((state.lateralAcceleration||0)*.006,-.05,.05);
      settle(this.pitch,pitch,dt);settle(this.roll,roll,dt);
      this.travel+=(state.speed||0)/3.6*dt;
      this.rideTime+=dt;
      this.rideStrength+=(clamp((state.speed||0)/180,0,1)-this.rideStrength)*(1-Math.exp(-dt*5));
    }
    apply(body,state){
      body.rotation.x=this.pitch.value;body.rotation.z=this.roll.value;
      // Sub-millimetre, time-based motion avoids the high-frequency judder of
      // distance-driven vibration at highway speeds. Camera and cabin move together.
      const gentleRide=(.75*Math.sin(this.rideTime*Math.PI*2*1.7)+.25*Math.sin(this.rideTime*Math.PI*2*3.1))*.0006*this.rideStrength;
      body.position.y=state.mode==='menu'||state.mode==='countdown'?0:state.camera===2?gentleRide:Math.sin(this.travel*2.8)*Math.min((state.speed||0)/180,1)*.003;
    }
  };
})();
