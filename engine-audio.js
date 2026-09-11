/* User-supplied M5 recording, with a synthesized fallback if audio decoding fails. */
(() => {
  'use strict';
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  class Drivetrain {
    reset(s){s.gear=1;s.rpm=850;s.engineLoad=0;s.shiftTime=0;this.previousSpeed=0;}
    update(s,dt){
      if(!['playing','countdown'].includes(s.mode))return;
      const ratios=[4.7,3.1,2.1,1.67,1.29,1,.84,.67];
      s.gear||=1;s.rpm||=850;s.shiftTime=Math.max(0,(s.shiftTime||0)-dt);
      const load=s.braking?.02:s.boosting?1:clamp(.24+(s.acceleration||0)*.055,.16,.95);
      s.engineLoad=(s.engineLoad||0)+(load-(s.engineLoad||0))*(1-Math.exp(-dt*7));
      // Wheel circumference and final drive approximate a road-going eight-speed V8.
      const wheelRPM=Math.max(0,s.speed)/3.6/(2*Math.PI*.35)*60;
      let target=wheelRPM*3.15*ratios[s.gear-1];
      if(s.shiftTime===0&&s.mode==='playing'){
        if(target>(s.boosting?6800:5900)&&s.gear<8){s.gear++;s.shiftTime=.18;}
        else if(target<2100&&s.gear>1&&wheelRPM*3.15*ratios[s.gear-2]<6200){s.gear--;s.shiftTime=.14;}
        target=wheelRPM*3.15*ratios[s.gear-1];
      }
      target=clamp(target+(s.speed<30?s.engineLoad*950:0),850,7200);
      s.rpm+=(target-s.rpm)*(1-Math.exp(-dt*(s.shiftTime>0?16:9)));
    }
  }
  class EngineAudio {
    constructor(){this.muted=false;this.ctx=null;this.lastLoad=0;this.lastEffect=-1;}
    async start(){
      try{
        if(!this.ctx){const A=window.AudioContext||window.webkitAudioContext;if(!A)return;this.ctx=new A();this.build();this.loadRecording();}
        await this.ctx.resume();
      }catch(error){console.warn('Engine audio unavailable:',error);}
    }
    build(){
      const c=this.ctx;
      this.master=c.createGain();this.master.gain.value=0;
      const limiter=c.createDynamicsCompressor();limiter.threshold.value=-14;limiter.knee.value=12;limiter.ratio.value=5;limiter.attack.value=.004;limiter.release.value=.18;
      this.master.connect(limiter);limiter.connect(c.destination);
      this.engine=c.createGain();this.engine.gain.value=0;
      this.filter=c.createBiquadFilter();this.filter.type='lowpass';this.filter.frequency.value=800;this.filter.Q.value=.6;
      const rumble=c.createBiquadFilter();rumble.type='lowshelf';rumble.frequency.value=150;rumble.gain.value=4;
      const shaper=c.createWaveShaper(),curve=new Float32Array(1024);for(let i=0;i<curve.length;i++){const x=i*2/(curve.length-1)-1;curve[i]=Math.tanh(x*1.5)/Math.tanh(1.5);}shaper.curve=curve;
      this.engine.connect(shaper);shaper.connect(this.filter);this.filter.connect(rumble);rumble.connect(this.master);
      // Eight combustion pulses per 720-degree cycle, with exhaust-bank coloration.
      const real=new Float32Array(65),imag=new Float32Array(65),pulses=[1,.72,.9,.8,1,.78,.88,.7];
      for(let h=1;h<65;h++)for(let j=0;j<8;j++){const phase=2*Math.PI*h*j/8;const amplitude=pulses[j]*Math.exp(-h*.055)/8;real[h]+=Math.cos(phase)*amplitude;imag[h]-=Math.sin(phase)*amplitude;}
      const wave=c.createPeriodicWave(real,imag);this.exhaust=[];
      for(const detune of [-5,5]){const o=c.createOscillator(),g=c.createGain();o.setPeriodicWave(wave);o.detune.value=detune;g.gain.value=.3;o.connect(g);g.connect(this.engine);o.start();this.exhaust.push(o);}
      this.bass=c.createOscillator();this.bass.type='sine';const bassGain=c.createGain();bassGain.gain.value=.24;this.bass.connect(bassGain);bassGain.connect(this.engine);this.bass.start();
      const buffer=c.createBuffer(1,c.sampleRate*2,c.sampleRate),data=buffer.getChannelData(0);let brown=0;
      for(let i=0;i<data.length;i++){brown=(brown+(Math.random()*2-1)*.06)/1.02;data[i]=brown;}
      const noise=c.createBufferSource();noise.buffer=buffer;noise.loop=true;
      this.intakeFilter=c.createBiquadFilter();this.intakeFilter.type='bandpass';this.intakeFilter.frequency.value=700;this.intakeFilter.Q.value=.6;
      this.intake=c.createGain();this.intake.gain.value=0;noise.connect(this.intakeFilter);this.intakeFilter.connect(this.intake);this.intake.connect(this.master);noise.start();
      this.turbo=c.createOscillator();this.turbo.type='sine';this.turboGain=c.createGain();this.turboGain.gain.value=0;this.turbo.connect(this.turboGain);this.turboGain.connect(this.master);this.turbo.start();
      this.noiseBuffer=buffer;
    }
    async loadRecording(){
      if(!window.NIGHTSHIFT_ENGINE_MP3)return;
      try{
        const raw=atob(window.NIGHTSHIFT_ENGINE_MP3),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
        const decoded=await this.ctx.decodeAudioData(bytes.buffer);
        // Equal-length overlap at the loop boundary prevents a hard click without altering the source file.
        const fade=Math.min(Math.floor(decoded.sampleRate*.12),Math.floor(decoded.length/4));
        const length=decoded.length-fade,loop=this.ctx.createBuffer(decoded.numberOfChannels,length,decoded.sampleRate);
        for(let channel=0;channel<decoded.numberOfChannels;channel++){
          const source=decoded.getChannelData(channel),out=loop.getChannelData(channel);out.set(source.subarray(0,length));
          for(let i=0;i<fade;i++){const weight=i/fade;out[i]=source[length+i]*(1-weight)+source[i]*weight;}
        }
        this.recordedGain=this.ctx.createGain();this.recordedGain.gain.value=0;this.recordedGain.connect(this.master);
        this.recording=this.ctx.createBufferSource();this.recording.buffer=loop;this.recording.loop=true;this.recording.connect(this.recordedGain);this.recording.start();
      }catch(error){console.warn('M5 recording could not be decoded; using synthesized fallback.',error);}
    }
    update(s){
      if(!this.ctx||!this.master)return;
      const t=this.ctx.currentTime,active=['playing','countdown'].includes(s.mode),load=s.engineLoad||0,rpm=s.rpm||850;
      this.master.gain.setTargetAtTime(active&&!this.muted?.46:0,t,.035);
      for(const o of this.exhaust)o.frequency.setTargetAtTime(rpm/120,t,.035);
      this.bass.frequency.setTargetAtTime(rpm/60,t,.05);
      this.engine.gain.setTargetAtTime(this.recording?0:(.3+load*.48)*(s.shiftTime>0?.4:1),t,.06);
      if(this.recording){this.recording.playbackRate.setTargetAtTime(.78+clamp((rpm-850)/6350,0,1)*.6,t,.09);this.recordedGain.gain.setTargetAtTime((.42+load*.42)*(s.shiftTime>0?.5:1),t,.045);}
      this.filter.frequency.setTargetAtTime(420+rpm*.12+load*1250,t,.08);
      this.intakeFilter.frequency.setTargetAtTime(450+rpm*.2,t,.1);
      this.intake.gain.setTargetAtTime(active&&!this.recording?load*.2:0,t,.1);
      this.turbo.frequency.setTargetAtTime(850+rpm*.22,t,.15);
      this.turboGain.gain.setTargetAtTime(active&&!this.recording?Math.max(0,load-.5)*.015:0,t,.15);
      if(active&&!this.recording&&this.lastLoad-load>.35&&rpm>2800&&t-this.lastEffect>.7){this.release();this.lastEffect=t;}
      this.lastLoad=load;
    }
    release(){
      if(!this.ctx||this.muted)return;
      const c=this.ctx,t=c.currentTime,n=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();n.buffer=this.noiseBuffer;f.type='highpass';f.frequency.value=950;g.gain.setValueAtTime(.07,t);g.gain.exponentialRampToValueAtTime(.001,t+.16);n.connect(f);f.connect(g);g.connect(this.master);n.start();n.stop(t+.17);n.onended=()=>{n.disconnect();f.disconnect();g.disconnect();};
    }
    beep(frequency=700,duration=.12){
      if(!this.ctx||this.muted||!this.master)return;
      const c=this.ctx,t=c.currentTime,o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=frequency;o.connect(g);g.connect(this.master);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.1,t+.008);g.gain.exponentialRampToValueAtTime(.001,t+duration);o.start();o.stop(t+duration);o.onended=()=>{o.disconnect();g.disconnect();};
    }
    impact(strength=.5){
      if(!this.ctx||this.muted||!this.master)return;
      const c=this.ctx,t=c.currentTime,n=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();n.buffer=this.noiseBuffer;f.type='lowpass';f.frequency.value=350;g.gain.setValueAtTime(.3+strength*.6,t);g.gain.exponentialRampToValueAtTime(.001,t+.22);n.connect(f);f.connect(g);g.connect(this.master);n.start();n.stop(t+.23);n.onended=()=>{n.disconnect();f.disconnect();g.disconnect();};
    }
  }
  window.RaceDrivetrain=Drivetrain;window.RaceEngineAudio=EngineAudio;
})();
