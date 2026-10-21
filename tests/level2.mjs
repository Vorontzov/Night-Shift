import vm from 'node:vm';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as RealThree from '../dist/vendor/three.module.js';

// Deterministic story test: real Three vectors and game logic, simulated display/audio.
const root=new URL('../dist/',import.meta.url);
class Element {
  constructor(){
    this.children=new Map();this.style={};this.dataset={};this.value='75';this.checked=true;
    this.textContent='';this.handlers={};this.lastElementChild={textContent:''};this.disabled=false;
    const classes=new Set();this.classList={add:n=>classes.add(n),remove:n=>classes.delete(n),contains:n=>classes.has(n),toggle:(n,v)=>{if(v===undefined)v=!classes.has(n);v?classes.add(n):classes.delete(n);}};
  }
  addEventListener(name,fn){this.handlers[name]=fn;}
  querySelector(name){if(!this.children.has(name))this.children.set(name,new Element());return this.children.get(name);}
  appendChild(){}
  click(){assert.ok(this.handlers.click,'The button must be wired');return this.handlers.click();}
}
const elements=new Map();
const document={getElementById(id){if(!elements.has(id))elements.set(id,new Element());return elements.get(id);},body:new Element(),querySelectorAll:()=>[],addEventListener(){},pointerLockElement:null,hidden:false};
const $=id=>document.getElementById(id);
$('brightness').value='100';$('music-volume').value='35';
const targets=Object.fromEntries(Object.entries({register:[.2,1.3,4.1],freezer:[0,1.5,-7.1],camera:[-1.7,1.5,4.2],shutter:[1.85,1.35,4.2],floodlight:[2.8,1.48,5],chips:[-1.45,1.45,-3.5],phone:[-2.8,1.4,5.7]}).map(([key,value])=>[key,new RealThree.Vector3(...value)]));
const audioCalls=[],audioCompleted=[],soundCalls=[],worldCalls=[];
const durations={hungry:2,visionary:3,callPolice:3,dispatcher:3,police:3,policeClear:3,night2Customer:2,night2Thanks:2,grinner2:13.52,night2End:3};
let audio;
class Audio {
  constructor(){audio=this;this.queue=[];this.paused=false;this.holds=new Set();this.time=0;}
  init(){return Promise.resolve();}
  speak(key){
    audioCalls.push(key);
    return new Promise(resolve=>this.queue.push({key,remaining:durations[key]??1,resolve}));
  }
  tick(dt){
    if(this.paused)return;this.time+=dt;const job=this.queue[0];
    if(!job||this.holds.has(job.key))return;
    job.remaining-=dt;
    if(job.remaining<=.000001){this.queue.shift();audioCompleted.push({key:job.key,time:this.time});job.resolve();}
  }
  sfx(key){soundCalls.push(key);}
  setVolume(){}
  setMusicVolume(){}
  setMusicMood(){}
  stop(){const jobs=this.queue.splice(0);for(const job of jobs)job.resolve();this.paused=false;}
  pause(){this.paused=true;}
  resume(){this.paused=false;}
}
const char=()=>({group:new RealThree.Group(),setVisible(value){this.group.visible=value;},setWalking(){},setGrinning(){},update(){}});
const worldState={shutter:false,police:false,chipsTaken:true};
const world={targets,colliders:[],setEmergency(){},setFreezer(){},update(){},
  setShutter(value){worldState.shutter=value;worldCalls.push(['shutter',value]);},
  setPolice(value){worldState.police=value;worldCalls.push(['police',value]);},
  setChipsTaken(value){worldState.chipsTaken=value;worldCalls.push(['chips',value]);}
};
class Renderer {constructor(){this.domElement=new Element();this.shadowMap={};}setPixelRatio(){}setSize(){}render(){}}
const sandbox={console,THREE:{...RealThree,WebGLRenderer:Renderer},Reflector:class{},createWorld:()=>world,createCharacter:char,createShadow:()=>({...char(),setProgress(){}}),GameAudio:Audio,document,window:{addEventListener(){}},addEventListener(){},innerWidth:1200,innerHeight:800,devicePixelRatio:1,performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},Math};
const ctx=vm.createContext(sandbox);
const code=fs.readFileSync(new URL('game.js',root),'utf8').replace(/^import .*;\r?$/gm,'');
vm.runInContext(code+`\nglobalThis.test={begin,interact,toggleCamera,toggleMirror,update,retry,pauseGame,resumeGame,showLevels,returnMenu,positionNPC,setStage,player,keys,npc,
  haltRoutes(){routes=[];},seedObsoleteEvent(){later(100,()=>setStage('policeArrive'));},
  get state(){return {stage,timer,paused,active,view,events:events.length,routes:routes.map(r=>r.name),checkpoint,currentLevel,gameTime,run,mirrorChecked}}};`,ctx);
const t=ctx.test;
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
const frame=async(dt=.05)=>{t.update(dt);audio.tick(dt);await flush();};
const advance=async(seconds)=>{for(let left=seconds;left>.000001;left-=.05)await frame(Math.min(.05,left));};
const until=async(predicate,seconds,message)=>{
  for(let left=seconds;left>0&&!predicate();left-=.05)await frame();
  assert.ok(predicate(),message+` (stage=${t.state.stage}, audio=${audio.queue[0]?.key}, timer=${t.state.timer.toFixed(2)})`);
};
const at=target=>{t.player.x=targets[target].x;t.player.z=targets[target].z;};
const runAxis=async(axis,destination)=>{
  const key=axis==='x'?(destination>t.player.x?'KeyD':'KeyA'):(destination>t.player.z?'KeyS':'KeyW');
  t.keys.add('ShiftLeft');t.keys.add(key);
  while(Math.abs(destination-t.player[axis])>.00001)await frame(Math.min(.05,Math.abs(destination-t.player[axis])/3.8));
  t.keys.delete(key);t.keys.delete('ShiftLeft');
};
const startCall=async()=>{
  await t.begin(2);at('chips');t.interact();at('phone');t.interact();
  assert.equal(t.state.stage,'policeCall');
};

// Clock In opens a selector. Both real HTML buttons are playable immediately.
const html=fs.readFileSync(new URL('index.html',root),'utf8');
for(const id of ['level-one','level-two']){
  const button=html.match(new RegExp(`<button\\b[^>]*\\bid=["']${id}["'][^>]*>`,'i'))?.[0];
  assert.ok(button,`${id} exists as an accessible native button`);
  assert.doesNotMatch(button,/\bdisabled\b|aria-disabled=["']true/i,`${id} must not require an unlock`);
}
$('start').click();
assert.equal(t.state.stage,'levels');assert.equal($('levels').classList.contains('hidden'),false);
await $('level-one').click();assert.equal(t.state.currentLevel,1);assert.equal(t.state.stage,'first');
t.showLevels();await $('level-two').click();
assert.equal(t.state.currentLevel,2);assert.equal(t.state.stage,'hungry');assert.equal(worldState.chipsTaken,false);
assert.equal(t.state.timer,0);assert.equal($('levels').classList.contains('hidden'),true);
assert.ok(audioCalls.includes('hungry'));
t.interact();assert.equal(t.state.stage,'hungry','Chips cannot be taken from the counter');
at('chips');t.interact();
assert.equal(t.state.stage,'visionaryChase');assert.equal(t.state.timer,25);assert.equal(worldState.chipsTaken,true);
assert.equal(t.npc.visionary.group.visible,true);assert.ok(audioCalls.includes('visionary'));
t.interact();assert.equal(t.state.stage,'visionaryChase','Phone cannot be used from the chips shelf');

const creatureBeforePause=t.npc.visionary.group.position.clone();
const timeBeforePause=t.state.gameTime;
t.pauseGame();await advance(7);
assert.equal(t.state.timer,25);assert.equal(t.state.gameTime,timeBeforePause);
assert.ok(creatureBeforePause.equals(t.npc.visionary.group.position),'Pause freezes the chasing creature');
t.resumeGame();
// Sprint via the same left-hand counter passage using the movement system.
await runAxis('z',1.3);await runAxis('x',-4.25);await runAxis('z',5.7);await runAxis('x',-2.8);
assert.equal(t.state.stage,'visionaryChase');assert.ok(t.state.timer>20&&t.state.timer<25);
t.interact();assert.equal(t.state.stage,'policeCall');assert.equal(t.state.timer,0);assert.equal(worldState.shutter,true);
await until(()=>t.state.stage==='policeArrive',20,'Dispatcher completion should summon the police');
assert.equal(worldState.police,true);assert.equal(t.npc.officer.group.visible,true);assert.equal(t.npc.officer2.group.visible,true);
await until(()=>t.state.stage==='night2Open',40,'Both officers should escort the Visionary out');
assert.equal(worldState.police,false);
for(const name of ['visionary','officer','officer2'])assert.equal(t.npc[name].group.visible,false,`${name} must leave the store`);
assert.ok(audioCalls.includes('callPolice'));assert.ok(audioCalls.includes('dispatcher'));assert.ok(audioCalls.includes('police'));assert.ok(audioCalls.includes('policeClear'));
at('shutter');t.interact();assert.equal(t.state.stage,'night2Customer');assert.equal(worldState.shutter,false);
at('register');t.interact();assert.equal(t.state.stage,'night2Customer','The arriving customer must reach the register first');
assert.equal(t.state.mirrorChecked,false);
await until(()=>!t.state.routes.includes('second'),10,'Human customer should reach the register');
t.interact();assert.equal(t.state.stage,'night2Customer');assert.equal(t.state.view,'mirror','Change is gated by a reflection check');
t.toggleMirror();t.interact();assert.equal(t.state.stage,'night2AfterCustomer');
await until(()=>t.state.stage==='grinnerInspect',15,'Grinner should appear after the human leaves');
t.toggleCamera();assert.equal(t.state.stage,'grinnerTimer');assert.equal(t.state.timer,20);
await advance(2);assert.ok(Math.abs(t.state.timer-18)<.001);
t.toggleCamera();at('shutter');t.interact();
assert.equal(t.state.stage,'grinnerWait');assert.equal(t.state.timer,0);assert.equal(worldState.shutter,true);
await until(()=>audio.queue[0]?.key==='grinner2',8,'Level 2 should play its new Grinner line');
const grinnerPosition=t.npc.grinner.group.position.clone();
await advance(13.45);
assert.equal(audio.queue[0]?.key,'grinner2','The full 13.52-second line should still be playing');
assert.equal(t.state.stage,'grinnerWait');
assert.ok(grinnerPosition.equals(t.npc.grinner.group.position),'Grinner must wait at the shutter until its full line finishes');
await until(()=>t.state.stage==='shutterOpen',15,'Grinner should depart after finishing its line');
assert.equal(t.npc.grinner.group.visible,false);assert.ok(audioCompleted.some(entry=>entry.key==='grinner2'));
t.interact();assert.equal(t.state.stage,'night2Finish');
await advance(5);assert.equal(t.state.checkpoint,'complete');assert.equal(t.state.active,false);
assert.equal(t.state.currentLevel,2);assert.match($('end-tag').textContent,/LEVEL 02/);
assert.ok(audioCalls.includes('night2End'));assert.ok(soundCalls.includes('chips'));assert.ok(soundCalls.includes('phone'));assert.ok(soundCalls.includes('siren'));

// Isolate the 25-second deadline from the separate physical-contact failure.
await t.begin(2);at('chips');t.interact();at('phone');t.haltRoutes();
await advance(24.95);assert.equal(t.state.active,true);assert.ok(t.state.timer>0);
await advance(.1);assert.equal(t.state.active,false);assert.equal(t.state.checkpoint,'visionary');
t.retry();await flush();
assert.equal(t.state.currentLevel,2);assert.equal(t.state.stage,'hungry');assert.equal(t.state.events,0);assert.equal(t.state.timer,0);assert.equal(worldState.chipsTaken,false);
at('chips');t.interact();t.positionNPC('visionary',t.player.x+.2,t.player.z);await frame();
assert.equal(t.state.active,false,'Physical contact with the Visionary is also a failure');
t.retry();await flush();assert.equal(t.state.stage,'hungry');

// Grinner retries keep Level 2 and discard old events, routes, and police state.
at('register');t.positionNPC('grinner',-.7,-2.1);t.setStage('grinnerInspect');t.toggleCamera();t.seedObsoleteEvent();
await advance(19.95);assert.equal(t.state.active,true);
await advance(.1);assert.equal(t.state.active,false);assert.equal(t.state.checkpoint,'grinner');
t.retry();await flush();
assert.equal(t.state.currentLevel,2);assert.equal(t.state.stage,'grinnerInspect');assert.equal(t.state.events,0);assert.equal(t.state.routes.length,0);
assert.equal(worldState.police,false);assert.equal(t.state.timer,0);assert.equal(t.state.view,'player');
t.toggleCamera();assert.equal(t.state.timer,20);await advance(20.05);assert.equal(t.state.active,false);
t.retry();await flush();assert.equal(t.state.stage,'grinnerInspect');assert.equal(t.state.currentLevel,2);

// A cancelled phone call must not enqueue a dispatcher or spawn officers later.
audio.holds.add('callPolice');await startCall();
await until(()=>audio.queue[0]?.key==='callPolice',10,'The call should reach its held dialogue');
const callsBeforeSwitch=audioCalls.length;t.showLevels();await flush();await advance(30);
assert.equal(t.state.stage,'levels');assert.equal(t.state.events,0);assert.equal(t.state.active,false);assert.equal(worldState.police,false);
assert.equal(audioCalls.slice(callsBeforeSwitch).includes('dispatcher'),false,'A stale call must not continue into dispatch');
audio.holds.clear();

// Restart while the dispatcher speaks: no old delayed police arrival may survive.
audio.holds.add('dispatcher');await startCall();
await until(()=>audio.queue[0]?.key==='dispatcher',15,'Dispatch should be awaiting completion');
await $('restart').click();await flush();
assert.equal(t.state.stage,'hungry');assert.equal(t.state.currentLevel,2);assert.equal(t.state.events,0);
await advance(30);assert.equal(t.state.stage,'hungry');assert.equal(worldState.police,false);
audio.holds.clear();

// Switching levels while an officer speaks must invalidate the escort callback.
audio.holds.add('police');await startCall();
await until(()=>audio.queue[0]?.key==='police',35,'Officer dialogue should begin after walking into the store');
t.showLevels();await $('level-one').click();await flush();await advance(40);
assert.equal(t.state.currentLevel,1);assert.equal(t.state.stage,'first');assert.equal(worldState.police,false);
for(const name of ['visionary','officer','officer2'])assert.equal(t.npc[name].group.visible,false);
audio.holds.clear();

// Also invalidate the delayed second-officer departure after escort has started.
await startCall();await until(()=>t.state.stage==='policeArrive'&&t.state.routes.includes('visionary'),40,'The escort should start after the officer finishes speaking');
assert.ok(t.state.events>0,'Officer departure events should be pending');
t.showLevels();await flush();await advance(40);
assert.equal(t.state.stage,'levels');assert.equal(t.state.events,0);assert.equal(t.state.routes.length,0);assert.equal(worldState.police,false);
console.log('PASS: Level 2 selector, chips distance gate, sprint and 25s chase, pause, phone and police escort, human reflection gate, full 13.52s Grinner line, 20s deadline, completion, retries, and cancelled async police callbacks.');
