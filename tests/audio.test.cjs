const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
class Param{constructor(){this.value=0;}setTargetAtTime(v){assert(Number.isFinite(v));this.value=v;}setValueAtTime(v){this.value=v;}linearRampToValueAtTime(v){this.value=v;}exponentialRampToValueAtTime(v){assert(v>0);this.value=v;}}
class Node{constructor(){for(const k of ['gain','frequency','Q','detune','playbackRate','threshold','knee','ratio','attack','release'])this[k]=new Param();}connect(to){this.output=to;}disconnect(){}start(){this.started=true;}stop(){}setPeriodicWave(){}}
class AudioContext{constructor(){this.currentTime=1;this.sampleRate=44100;this.destination={};}resume(){return Promise.resolve();}createGain(){return new Node();}createDynamicsCompressor(){return new Node();}createBiquadFilter(){return new Node();}createWaveShaper(){return new Node();}createOscillator(){return new Node();}createBufferSource(){return new Node();}createPeriodicWave(){return {};}
createBuffer(channels,length,sampleRate){const data=Array.from({length:channels},()=>new Float32Array(length));return {numberOfChannels:channels,length,sampleRate,getChannelData:i=>data[i]};}
decodeAudioData(bytes){assert(bytes.byteLength>100000);return Promise.resolve(this.createBuffer(2,44100,44100));}}
(async()=>{
const context={window:{AudioContext},console,atob:s=>Buffer.from(s,'base64').toString('binary')};vm.runInNewContext(read('assets/m5-engine.js'),context);vm.runInNewContext(read('engine-audio.js'),context);
assert.deepEqual(Buffer.from(context.window.NIGHTSHIFT_ENGINE_MP3,'base64'),fs.readFileSync(path.join(__dirname,'../assets/m5-engine.mp3')),'Offline wrapper preserves the supplied recording');
const drive=new context.window.RaceDrivetrain(),s={mode:'playing',speed:0,acceleration:3,braking:false,boosting:false};drive.reset(s);
let shifts=0,last=1;for(let i=0;i<2400;i++){s.speed=i/8;drive.update(s,1/120);assert(s.rpm>=850&&s.rpm<=7200);assert(s.gear>=1&&s.gear<=8);if(s.gear!==last){shifts++;last=s.gear;}}
assert(shifts>=4,'Acceleration produces distinct gear shifts');const before=s.rpm;s.mode='paused';drive.update(s,1);assert.equal(s.rpm,before,'Pause freezes drivetrain');drive.reset(s);assert.equal(s.gear,1);
const audio=new context.window.RaceEngineAudio({useRecording:true});await audio.start();await Promise.resolve();assert(audio.recording?.started,'Supplied recording is decoded and looped');assert(audio.recording.loop);assert.equal(audio.recording.buffer.numberOfChannels,2);
s.mode='playing';s.rpm=5000;s.engineLoad=.8;audio.update(s);assert(audio.master.gain.value>0);assert.equal(audio.engine.gain.value,0,'Synthetic engine is silenced when recording is available');assert(audio.recordedGain.gain.value>0);assert(audio.recording.playbackRate.value>1);
const loadedGain=audio.recordedGain.gain.value;s.shiftTime=.15;audio.update(s);assert(audio.recordedGain.gain.value<loadedGain,'Shifts briefly reduce load volume');
audio.muted=true;audio.update(s);assert.equal(audio.master.gain.value,0);audio.muted=false;s.mode='paused';audio.update(s);assert.equal(audio.master.gain.value,0);s.mode='playing';audio.update(s);assert(audio.master.gain.value>0);
const synthesized=new context.window.RaceEngineAudio();await synthesized.start();s.mode='playing';s.shiftTime=0;synthesized.update(s);assert(!synthesized.recording);assert(synthesized.engine.gain.value>0,'Synthesis is the default');
console.log('PASS: recording wrapper parity, loop setup, RPM bounds, gear shifts, sample priority, shift volume, mute and pause.');
})().catch(error=>{console.error(error);process.exitCode=1;});
