import vm from 'node:vm';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as RealThree from '../dist/vendor/three.module.js';
const root=new URL('../dist/',import.meta.url);
class Element {
  constructor(){this.children=new Map();this.style={};this.dataset={};this.value='75';this.checked=true;this.textContent='';this.handlers={};this.lastElementChild={textContent:''};const s=new Set();this.classList={add:(n)=>s.add(n),remove:(n)=>s.delete(n),contains:n=>s.has(n),toggle:(n,v)=>{if(v===undefined)v=!s.has(n);v?s.add(n):s.delete(n);}};}
  addEventListener(n,f){this.handlers[n]=f;}
  querySelector(n){if(!this.children.has(n))this.children.set(n,new Element());return this.children.get(n);}
  appendChild(){}
}
const elements=new Map();
const document={getElementById(id){if(!elements.has(id))elements.set(id,new Element());return elements.get(id);},body:new Element(),querySelectorAll:()=>[],addEventListener(){},pointerLockElement:null,hidden:false};
document.getElementById('volume').value='75';document.getElementById('brightness').value='100';
const targets=Object.fromEntries(Object.entries({register:[0,1.1,4.1],freezer:[0,1.2,-7.1],camera:[-1.7,1.1,4.2],shutter:[1.6,1.1,4.2],floodlight:[2.7,1.5,5]}).map(([k,v])=>[k,new RealThree.Vector3(...v)]));
const audioCalls=[];
class Audio {init(){return Promise.resolve();}speak(k){audioCalls.push(k);return Promise.resolve();}sfx(){}setVolume(){}setMusicVolume(){}setMusicMood(){}stop(){}pause(){}resume(){}}
const char=()=>({group:new RealThree.Group(),setVisible(v){this.group.visible=v;},setWalking(){},setGrinning(){},update(){}});
const world={targets,colliders:[],setEmergency(){},setShutter(){},setFreezer(){},setPolice(){},setChipsTaken(){},update(){}};
class Renderer {constructor(){this.domElement=new Element();this.shadowMap={};}setPixelRatio(){}setSize(){}render(){}}
const sandbox={console,THREE:{...RealThree,WebGLRenderer:Renderer},Reflector:class{},createWorld:()=>world,createCharacter:char,createShadow:()=>({...char(),setProgress(){}}),GameAudio:Audio,document,window:{addEventListener(){}},addEventListener(){},innerWidth:1200,innerHeight:800,devicePixelRatio:1,performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},Math};
const code=fs.readFileSync(new URL('game.js',root),'utf8').replace(/^import .*;\r?$/gm,'');
const ctx=vm.createContext(sandbox);
vm.runInContext(code+`\nglobalThis.test={begin,interact,toggleCamera,toggleMirror,update,retry,pauseGame,resumeGame,positionNPC,player,setStage,get state(){return {stage,timer,paused,active,view,events:events.length,checkpoint}}};`,ctx);
const t=ctx.test;
const advance=(seconds)=>{for(let i=0;i<Math.ceil(seconds/.05);i++)t.update(.05);};
const at=(target)=>{t.player.x=targets[target].x;t.player.z=targets[target].z;};
await t.begin();
assert.equal(t.state.stage,'first');
t.interact();assert.equal(t.state.view,'mirror');assert.equal(t.state.stage,'first','Change must wait for reflection check');
t.toggleMirror();t.interact();assert.equal(t.state.stage,'freezer');
t.interact();assert.equal(t.state.stage,'freezer','Cannot open freezer remotely');
at('freezer');t.interact();assert.equal(t.state.stage,'rescue');
advance(8);assert.equal(t.state.stage,'return');
at('register');advance(.1);assert.equal(t.state.stage,'grinnerInspect');
t.toggleCamera();assert.equal(t.state.stage,'grinnerTimer');assert.equal(t.state.timer,20);
t.pauseGame();advance(5);assert.equal(t.state.timer,20,'Pause freezes countdown');t.resumeGame();
advance(5);assert.ok(Math.abs(t.state.timer-15)<.01);
t.toggleCamera();at('shutter');t.interact();assert.equal(t.state.stage,'grinnerWait');assert.equal(t.state.timer,0);
advance(25);assert.equal(t.state.stage,'shutterOpen');
t.interact();advance(8);assert.equal(t.state.stage,'second');
at('register');t.interact();assert.equal(t.state.stage,'shadowIntro');
advance(17);assert.equal(t.state.stage,'shadowTimer');assert.ok(t.state.timer>0&&t.state.timer<=15);
at('floodlight');t.interact();assert.equal(t.state.stage,'shadowSafe');assert.equal(t.state.timer,0);
at('register');t.interact();assert.equal(t.state.stage,'goodbye');
await Promise.resolve();await Promise.resolve();await Promise.resolve();
advance(22);assert.equal(t.state.checkpoint,'complete');assert.equal(t.state.active,false);
assert.ok(audioCalls.includes('trapped'));assert.ok(audioCalls.includes('grinner'));assert.ok(audioCalls.includes('jimmyLeave'));
// Countdown boundary, retry, and old-event cancellation.
await t.begin();at('register');t.setStage('grinnerInspect');t.toggleCamera();
advance(19.95);assert.equal(t.state.active,true);advance(.1);assert.equal(t.state.active,false);assert.equal(t.state.checkpoint,'grinner');
t.retry();assert.equal(t.state.stage,'grinnerInspect');assert.equal(t.state.events,0);
t.toggleCamera();advance(20.1);assert.equal(t.state.active,false);
t.retry();t.setStage('shadowIntro');vm.runInContext("startShadow()",ctx);
advance(15.1);assert.equal(t.state.active,false);assert.equal(t.state.checkpoint,'shadow');
t.retry();assert.equal(t.state.stage,'shadowTimer');assert.equal(t.state.timer,15);
console.log('PASS: complete scripted level, mirror gate, interaction distance, 20s and 15s expiry, pause freeze, checkpoints, retry, required dialogue.');
