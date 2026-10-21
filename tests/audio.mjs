import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const root = new URL('../dist/', import.meta.url);
let pendingFetch = false, releaseFetch;
let fetchGate = Promise.resolve();
globalThis.fetch = async url => {
  if (pendingFetch) await fetchGate;
  const bytes = await readFile(url);
  assert.equal(bytes.toString('ascii',0,4),'RIFF','Dialogue asset must be a real WAV');
  assert.equal(bytes.toString('ascii',8,12),'WAVE');
  assert.ok(bytes.length>1000,'Dialogue must contain recorded samples');
  return {ok:true,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};
};
class Param {
  constructor(){this.value=1;}
  setValueAtTime(v){assert.ok(Number.isFinite(v));this.value=v;}
  exponentialRampToValueAtTime(v){assert.ok(v>0);this.value=v;}
  setTargetAtTime(v){assert.ok(Number.isFinite(v));this.value=v;}
}
class Node {
  constructor(ctx){this.ctx=ctx;this.gain=new Param();this.frequency=new Param();}
  connect(){}
  disconnect(){}
  start(){
    this.started=true;
    if(this.buffer&&!this.loop){
      this.ctx.starts++;
      this.tick=setInterval(()=>{if(this.ctx.state==='running')this.stop();},20);
    }
  }
  stop(){clearInterval(this.tick);if(!this.ended){this.ended=true;queueMicrotask(()=>this.onended?.());}}
}
class Context {
  constructor(){this.currentTime=0;this.sampleRate=22050;this.state='running';this.starts=0;}
  createGain(){return new Node(this);}
  createDynamicsCompressor(){const n=new Node(this);for(const k of ['threshold','knee','ratio','attack','release'])n[k]=new Param();return n;}
  createBuffer(c,n,rate){const channels=Array.from({length:c},()=>new Float32Array(n));return {numberOfChannels:c,length:n,sampleRate:rate,getChannelData:i=>channels[i]};}
  createBufferSource(){return new Node(this);}
  createBiquadFilter(){return new Node(this);}
  createOscillator(){return new Node(this);}
  async decodeAudioData(){return {duration:.02};}
  async resume(){this.state='running';}
  async suspend(){this.state='suspended';}
}
globalThis.AudioContext=Context;
const {GameAudio, lines}=await import(new URL('audio.js',root));
const a=new GameAudio();
assert.equal(a.musicVolume,.35);
assert.equal(a.ctx,null,'Constructing the game must not start audio');
a.setMusicVolume(.4);a.setMusicMood('threat');
assert.equal(a.ctx,null,'Music controls must not start a title-screen soundtrack');
a.setMusicVolume(.35);a.setMusicMood('calm');
const subtitles=[];
a.onSubtitle=(text,speaker)=>subtitles.push([text,speaker]);
await a.init();
assert.equal(a.buffers.size,Object.keys(lines).length,'Every named dialogue clip must be bundled');
assert.equal(a._music.length,2,'Only the synchronized calm/threat score pair starts');
const firstMusic=[...a._music];
assert.ok(firstMusic.every(source=>source.loop&&source.started));
await a.init();
assert.deepEqual(a._music,firstMusic,'Repeated init must not stack soundtracks');
for(const buffer of Object.values(a._musicBuffers)){
  assert.equal(buffer.numberOfChannels,2);
  let peak=0;
  for(const sample of buffer.getChannelData(0)){assert.ok(Number.isFinite(sample));peak=Math.max(peak,Math.abs(sample));}
  assert.ok(peak>.05&&peak<.5,'Music must be audible, finite, and leave voice headroom');
}
a.setMusicMood('threat');
assert.equal(a._calmGain.gain.value,0);assert.equal(a._threatGain.gain.value,1);
a.setMusicMood('calm');
const masterLevel=a.master.gain.value;
a.setMusicVolume(0);assert.equal(a._musicBus.gain.value,0);
assert.equal(a.master.gain.value,masterLevel,'Music mute must not mute dialogue and effects');
a.setMusicVolume(8);assert.equal(a.musicVolume,1);
a.setMusicVolume(-4);assert.equal(a.musicVolume,0);
a.setMusicVolume(.35);
await Promise.all([a.speak('welcome'),a.speak('firstCustomer')]);
assert.deepEqual(subtitles.filter(x=>x[0]).map(x=>x[1]),['JIMMY','CUSTOMER']);
assert.equal(subtitles.at(-1)[0],'');
const oldStarts=a.ctx.starts;
const long=a.speak('grinner');
const stale=a.speak('secondCustomer');
await new Promise(r=>setTimeout(r,2));
assert.ok(a._musicBus.gain.value<.35,'Dialogue automatically ducks the score');
a.stop();
await Promise.all([long,stale]);
assert.equal(a.ctx.starts,oldStarts+1,'Queued speech must not survive stop');
assert.ok(firstMusic.every(source=>source.ended),'Stop terminates every looping music source');
assert.equal(a._music.length,0);
await a.speak('end');
assert.equal(a._music.length,2,'Starting again creates exactly one new score pair');
assert.notEqual(a._music[0],firstMusic[0]);
assert.equal(a._musicBus.gain.value,.35,'Music recovers after dialogue finishes');
assert.equal(subtitles.filter(x=>x[0]).at(-1)[0],lines.end[0]);
const p=a.speak('thanks');
await new Promise(r=>setTimeout(r,2));
a.pause();
const pausedMusic=[...a._music];
assert.equal(a.ctx.state,'suspended');
let settled=false;p.then(()=>settled=true);
await new Promise(r=>setTimeout(r,35));
assert.equal(settled,false,'Pause preserves active dialogue');
a.resume();await p;
assert.equal(a.ctx.state,'running');
assert.deepEqual(a._music,pausedMusic,'Pause/resume continues existing music without restarting or doubling it');
for(const name of ['cash','knock','freezer','doorbell','grinnerKnock','shutter','shadow','floodlight','scare','footstep','camera','phone','siren','visionary','chips'])a.sfx(name);
a.setVolume(5);assert.equal(a.volume,1);a.setVolume(-3);assert.equal(a.volume,0);a.stop();
pendingFetch=true;fetchGate=new Promise(r=>releaseFetch=r);
const b=new GameAudio();const bsub=[];b.onSubtitle=t=>bsub.push(t);
const wait=b.speak('welcome');await new Promise(r=>setTimeout(r,2));b.stop();releaseFetch();await wait;
assert.deepEqual(bsub,[''],'Pending loads cannot resurrect cancelled subtitles');
assert.equal(b._ambient.length,0,'Pending loads cannot resurrect ambience');
assert.equal(b._music.length,0,'Pending loads cannot resurrect music');
b.resume();await Promise.resolve();assert.equal(b._music.length,0,'Resume after stop does not restart menu music');
console.log(`PASS: ${Object.keys(lines).length} real dialogue assets, serialized speech, queued/load cancellation, restart, pause/resume, all SFX, volume limits, original score buffers, music mute/mood/ducking/lifecycle.`);
