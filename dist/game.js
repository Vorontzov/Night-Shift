import * as THREE from './vendor/three.module.js';
import {Reflector} from './vendor/Reflector.js';
import {createWorld} from './world.js';
import {createCharacter, createShadow} from './characters.js';
import {GameAudio} from './audio.js';

const $=id=>document.getElementById(id);
const ui={menu:$('menu'),levels:$('levels'),hud:$('hud'),pause:$('pause'),ending:$('ending'),prompt:$('prompt'),subtitle:$('subtitle'),timer:$('countdown')};
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x091310);
scene.fog=new THREE.FogExp2(0x101d18,.023);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.05;
renderer.outputColorSpace=THREE.SRGBColorSpace;
$('scene').appendChild(renderer.domElement);
const camera=new THREE.PerspectiveCamera(68,innerWidth/innerHeight,.06,110);
camera.rotation.order='YXZ';
const cctvCamera=new THREE.PerspectiveCamera(66,innerWidth/innerHeight,.1,70);
cctvCamera.position.set(-5.9,3.3,1.8);
cctvCamera.lookAt(0,.9,-1.9);
const mirrorCamera=new THREE.PerspectiveCamera(49,innerWidth/innerHeight,.1,70);
const world=createWorld(scene);
let mirror;
if(world.mirror?.mesh){
  const old=world.mirror.mesh;
  mirror=new Reflector(old.geometry.clone(),{clipBias:.003,textureWidth:768,textureHeight:768,color:0xced8cf});
  mirror.position.copy(old.position); mirror.rotation.copy(old.rotation); mirror.scale.copy(old.scale);
  old.parent.add(mirror); old.visible=false;
}
const audio=new GameAudio();
const npc={};
for(const name of ['first','trapped','grinner','second','shadow','visionary','officer','officer2']){
  npc[name]=createCharacter(name); scene.add(npc[name].group); npc[name].setVisible(false);
}
const shadow=createShadow(); scene.add(shadow.group); shadow.group.visible=false;
const player=new THREE.Vector3(0,1.65,5.5);
let yaw=0,pitch=0,walkPhase=0,active=false,paused=false,view='player',stage='menu',gameTime=0;
let stageTime=0,timer=0,timerMax=0,run=0,footstepTime=0,knockTime=0,toastUntil=0;
let events=[],routes=[],isDragging=false,lastPointer=null,currentTarget=null,checkpoint='start';
let mirrorChecked=false,cameraChecked=false,finished=false,brightness=1,reducedMotion=false;
let currentLevel=1;
const keys=new Set(),moves=new THREE.Vector3(),tempVec=new THREE.Vector3();
const chapters={
  first:['01 / THE FIRST CUSTOMER','Give the customer their change.','A real customer has a reflection. M checks the mirror; E at the register gives change.'],
  freezer:['02 / SOMEBODY IN THE FREEZER','Find the source of the knocking.','Go around the left end of the counter, then follow the middle aisle to the blue freezer door.'],
  rescue:['02 / SOMEBODY IN THE FREEZER','Let the customer out.','Give them a moment. They look terrified.'],
  return:['03 / AN UNWELCOME GUEST','Return to the counter.','Something is standing in the aisle. Get behind the counter and check the camera.'],
  grinnerInspect:['03 / AN UNWELCOME GUEST','Check the security camera.','C opens the monitor. Compare the customer’s face with the camera image.'],
  grinnerTimer:['03 / THE GRINNER','Close the security shutter.','C returns to the store. Press E by the red shutter switch on the counter.'],
  grinnerWait:['03 / THE GRINNER','Keep the shutter closed.','Do not open it for the voice. Wait for the entrance bell.'],
  shutterOpen:['03 / THE GRINNER','The footsteps have stopped.','The Grinner has left. Press E at the shutter switch to open the counter.'],
  second:['04 / BUSINESS AS USUAL','Serve the next customer.','A reflection, a normal face on camera, and a still shadow. Give them their change.'],
  shadowIntro:['05 / THE STRAY SHADOW','A final customer approaches.','Watch the floor. Something is moving independently.'],
  shadowTimer:['05 / THE STRAY SHADOW','Hit the emergency floodlights.','The yellow switch is to your right, behind the counter. Get close and press E.'],
  shadowSafe:['05 / THE STRAY SHADOW','Ask the customer to leave.','Go to the register and press E to speak politely.'],
  goodbye:['05 / THE STRAY SHADOW','Let them leave.','Stay behind the counter until the store is empty.'],
  hungry:['01 / A MIDNIGHT SNACK','Grab a bag of chips.','Go around the left end of the counter. Find the marked chips on the left shelf.'],
  visionaryChase:['02 / THE VISIONARY','Run to the counter. Call the police.','Hold Shift to run. Follow the aisle around the LEFT end of the counter to the red telephone. Press E to call.'],
  policeCall:['02 / HELP IS ON THE WAY','Stay behind the security shutter.','The call went through. Keep away from the aisle while the officers arrive.'],
  policeArrive:['02 / THE WATCHING EYES','Let the police handle it.','Stay behind the counter. Press C to watch the officers escort the Visionary out.'],
  night2Open:['03 / BACK TO WORK','Open the counter shutter.','The officers have cleared the store. Press E at the red shutter switch.'],
  night2Customer:['03 / AN ORDINARY CUSTOMER','Check their reflection. Give them change.','Let them reach the counter, then check the mirror with M. Not every visitor is a monster.'],
  night2AfterCustomer:['04 / THAT FAMILIAR SMILE','Wait for the customer to leave.','Something is watching from the aisle.'],
  night2Finish:['04 / THE LAST BITE','You survived the second shift.','The Grinner has gone. Take a breath.']
};
function setStage(name){
  stage=name;stageTime=0;const c=chapters[name];
  if(c){$('chapter').textContent=c[0];$('objective').textContent=c[1];$('objective-hint').textContent=c[2];}
  const order=currentLevel===2?['hungry','visionaryChase','policeCall','policeArrive','night2Open','night2Customer','night2AfterCustomer','grinnerInspect','grinnerTimer','grinnerWait','shutterOpen','night2Finish']:['first','freezer','rescue','return','grinnerInspect','grinnerTimer','grinnerWait','shutterOpen','second','shadowIntro','shadowTimer','shadowSafe','goodbye'];
  const index=order.indexOf(name);
  $('clock').textContent=(currentLevel===2?'04:':'03:')+String(7+Math.max(0,index)*2).padStart(2,'0');
  $('shift-label').textContent=`JIMMY · LEVEL 0${currentLevel} · NIGHT CLERK`;
  if(currentLevel===2&&name==='shutterOpen'){$('objective').textContent='Open the shutter. Finish your shift.';$('objective-hint').textContent='The Grinner has left. Press E at the red shutter switch.';}
  audio.setMusicMood(['visionaryChase','policeCall','grinnerTimer','grinnerWait','shadowTimer'].includes(name)?'threat':'calm');
  document.body.dataset.stage=name;
}
function later(delay,fn){events.push({at:gameTime+delay,run,fn});}
function say(key){return audio.speak(key);}
function toast(text,seconds=4){$('toast').textContent=text;$('toast').classList.remove('hidden');toastUntil=gameTime+seconds;}
function sfx(name){audio.sfx(name);}
function positionNPC(name,x,z,rotation=0){npc[name].group.position.set(x,0,z);npc[name].group.rotation.y=rotation;npc[name].setVisible(true);}
function routeNPC(name,points,speed=1.25,onEnd){
  routes=routes.filter(r=>r.name!==name);npc[name].setWalking(true);
  routes.push({name,points:points.map(p=>new THREE.Vector3(p[0],0,p[1])),speed,onEnd});
}
function exitNPC(name,speed=1.3,onEnd){
  routeNPC(name,[[0,1.2],[5.8,1.2],[5.8,4],[8.4,4]],speed,()=>{npc[name].setVisible(false);sfx('doorbell');onEnd?.();});
}
function clearNPCs(){
  routes=[];for(const person of Object.values(npc)){person.setVisible(false);person.setWalking(false);person.setGrinning(false);}
  shadow.group.visible=false;
}
function setView(next){
  view=next;const watching=view!=='player';
  document.body.classList.toggle('camera-view',watching);
  $('view-label').classList.toggle('hidden',!watching);$('scanlines').classList.toggle('hidden',!watching);
  $('view-label').querySelector('strong').textContent=view==='mirror'?'COUNTER MIRROR / REFLECTION CHECK':'CAM 02 / SHOP FLOOR';
  $('view-detail').textContent=view==='mirror'?'LIVE REFLECTION':'LIVE · CHECK THE FACE';
  $('view-label').querySelector('small').textContent=view==='mirror'?'PRESS M OR C TO RETURN':'PRESS C TO RETURN';
  npc.grinner.setGrinning(view==='camera');
  if(view==='mirror'){
    // A fixed inspection angle uses the same real reflected shop scene as the physical mirror.
    if(mirror){
      mirror.updateWorldMatrix(true,false);
      const p=mirror.getWorldPosition(new THREE.Vector3());
      const normal=new THREE.Vector3(0,0,1).applyQuaternion(mirror.getWorldQuaternion(new THREE.Quaternion()));
      mirrorCamera.position.copy(p).addScaledVector(normal,2.1);
      mirrorCamera.lookAt(p);
    }
  }
}
function toggleCamera(){
  if(!active||paused)return;
  if(view!=='player'){setView('player');return;}
  if(player.distanceTo(new THREE.Vector3(0,1.65,4.9))>4.5){toast('The camera monitor is behind the counter.');return;}
  setView('camera');sfx('camera');cameraChecked=true;
  const grinnerVisible=['grinnerInspect','return','grinnerTimer'].includes(stage);
  cctvCamera.fov=grinnerVisible?32:56;
  cctvCamera.lookAt(grinnerVisible?new THREE.Vector3(-.7,1.35,-2.1):new THREE.Vector3(0,1.1,1.5));
  cctvCamera.updateProjectionMatrix();
  if(stage==='grinnerInspect'||stage==='return'){
    checkpoint='grinner';setStage('grinnerTimer');startTimer(20,'CLOSE THE SHUTTER');
    toast('That smile is only on the camera. Close the shutter!',4);
  }else if(['first','second','night2Customer','shadowIntro','shadowTimer','shadowSafe'].includes(stage)){
    toast(stage.startsWith('shadow')?'The face looks human. Check the shadow.':'The camera shows an ordinary face.',3);
  }
}
function toggleMirror(){
  if(!active||paused)return;
  if(view!=='player'){setView('player');return;}
  if(player.distanceTo(new THREE.Vector3(0,1.65,4.9))>4.5){toast('You can check the mirror from behind the counter.');return;}
  setView('mirror');mirrorChecked=true;sfx('camera');
  toast('A reflection is present. Check the face and shadow too.',4);
}
function startTimer(seconds,label){timer=timerMax=seconds;$('countdown-label').textContent=label;ui.timer.classList.remove('hidden');}
function stopTimer(){timer=timerMax=0;ui.timer.classList.add('hidden');}
function lockMouse(){
  try{const p=renderer.domElement.requestPointerLock?.();if(p?.catch)p.catch(()=>toast('Drag the scene to look around. WASD moves; E interacts.',5));}catch{}
}
async function begin(level=currentLevel){
  currentLevel=level===2?2:1;
  run++;active=false;audio.stop();events=[];gameTime=0;stageTime=0;footstepTime=0;clearNPCs();
  player.set(0,1.65,5.5);yaw=0;pitch=-.015;walkPhase=0;finished=false;checkpoint='start';paused=false;mirrorChecked=false;cameraChecked=false;
  world.setShutter(false);world.setFreezer(false);world.setEmergency(false);world.setPolice(false);world.setChipsTaken(currentLevel!==2);stopTimer();setView('player');
  ui.menu.classList.add('hidden');ui.pause.classList.add('hidden');ui.ending.classList.add('hidden');ui.hud.classList.remove('hidden');
  ui.levels.classList.add('hidden');
  ui.subtitle.classList.add('hidden');$('toast').classList.add('hidden');keys.clear();
  const beginRun=run;
  lockMouse();await audio.init();if(run!==beginRun)return;audio.setVolume(Number($('volume').value)/100);audio.setMusicVolume(Number($('music-volume').value)/100);
  if(paused)audio.pause();
  if(currentLevel===2){active=true;setStage('hungry');say('hungry');return;}
  active=true;setStage('first');positionNPC('first',0,1.55);
  say('welcome');later(3.8,()=>{if(stage==='first')say('firstCustomer');});
}
function pauseGame(settingsOnly=false){
  if(paused)return;paused=true;keys.clear();audio.pause();
  ui.pause.classList.remove('hidden');$('resume').textContent=settingsOnly?'BACK TO TITLE':'BACK TO WORK ↗';
  $('restart').classList.toggle('hidden',!active);$('pause-levels').classList.toggle('hidden',!active);
  if(document.pointerLockElement)document.exitPointerLock();
}
function resumeGame(){
  ui.pause.classList.add('hidden');paused=false;audio.resume();
  if(active)lockMouse();
}
function setTarget(){
  const targets=world.targets;
  if(stage==='hungry')return {pos:targets.chips,label:'Take the chips',name:'chips'};
  if(stage==='visionaryChase')return {pos:targets.phone,label:'CALL THE POLICE',name:'phone'};
  if(stage==='night2Open')return {pos:targets.shutter,label:'Open the security shutter',name:'shutter'};
  if(stage==='night2Customer')return {pos:targets.register,label:'Give the customer their change',name:'register'};
  if(stage==='first'||stage==='second')return {pos:targets.register,label:'Give the customer their change',name:'register'};
  if(stage==='freezer')return {pos:targets.freezer,label:'Open the freezer',name:'freezer'};
  if(stage==='return')return {pos:targets.register,label:'Check the security camera [C]',name:'camera'};
  if(stage==='grinnerInspect')return {pos:targets.camera,label:'Check the security camera',name:'camera'};
  if(stage==='grinnerTimer')return {pos:targets.shutter,label:'CLOSE THE SECURITY SHUTTER',name:'shutter'};
  if(stage==='shutterOpen')return {pos:targets.shutter,label:'Open the security shutter',name:'shutter'};
  if(stage==='shadowTimer')return {pos:targets.floodlight,label:'SWITCH ON THE FLOODLIGHTS',name:'floodlight'};
  if(stage==='shadowSafe')return {pos:targets.register,label:'Politely ask the customer to leave',name:'register'};
  return null;
}
function flatDistance(a,b){return Math.hypot(a.x-b.x,a.z-b.z);}
function interact(){
  if(!active||paused)return;
  if(view!=='player'){
    if(stage==='grinnerTimer'){setView('player');toast('Press E at the red shutter switch.');}
    else setView('player');
    return;
  }
  const t=setTarget();if(!t)return;
  if(flatDistance(player,t.pos)>2.05){toast('Move closer to '+({freezer:'the freezer door',camera:'the camera monitor',shutter:'the red shutter switch',floodlight:'the yellow floodlight switch',register:'the register',chips:'the chips shelf',phone:'the red telephone'}[t.name])+'.',2.5);return;}
  if(stage==='hungry'){startVisionary();return;}
  if(stage==='visionaryChase'){callPolice();return;}
  if(stage==='night2Open'){
    world.setShutter(false);sfx('shutter');setStage('night2Customer');mirrorChecked=false;cameraChecked=false;
    positionNPC('second',6,3.7);sfx('doorbell');routeNPC('second',[[5.5,1.5],[0,1.55]],1.4,()=>say('night2Customer'));return;
  }
  if(stage==='night2Customer'){
    if(routes.some(r=>r.name==='second')){toast('Let the customer reach the counter first.');return;}
    if(!mirrorChecked){toast('Check their reflection before giving change.');toggleMirror();return;}
    sfx('cash');say('night2Thanks');setStage('night2AfterCustomer');
    exitNPC('second',1.5,()=>later(1.5,()=>{checkpoint='grinner';positionNPC('grinner',-.7,-2.1);setStage('grinnerInspect');toast('That familiar silhouette. Check CAM 02.',5);}));return;
  }
  if(stage==='first'){
    if(!mirrorChecked){toast('Before giving change, press M to check their reflection.',4);toggleMirror();return;}
    setStage('freezer');sfx('cash');say('thanks');exitNPC('first',1.4);
    later(2.4,()=>{sfx('knock');toast('KNOCK. KNOCK. Something is inside the freezer.',5);});knockTime=gameTime+7;
  }else if(stage==='freezer'){
    setStage('rescue');world.setFreezer(true);sfx('freezer');
    positionNPC('trapped',0,-8.05);routeNPC('trapped',[[0,-6.7]],.8);
    later(.65,()=>say('trapped'));
    later(5.7,()=>{say('jimmyFreezer');routeNPC('trapped',[[0,-5.7],[5.8,-5.7],[5.8,4],[8.5,4]],2.8,()=>{npc.trapped.setVisible(false);sfx('doorbell');});});
    later(7.5,()=>{setStage('return');positionNPC('grinner',-.7,-2.1);});
  }else if(stage==='return'||stage==='grinnerInspect'){toggleCamera();}
  else if(stage==='grinnerTimer'){
    stopTimer();setView('player');world.setShutter(true);sfx('shutter');setStage('grinnerWait');
    routeNPC('grinner',[[-.7,1.8],[.15,2.1]],1.7,()=>{
      sfx('grinnerKnock');const currentRun=run;
      say(currentLevel===2?'grinner2':'grinner').then(()=>{if(currentRun===run&&currentLevel===2&&stage==='grinnerWait')later(2,leaveGrinner);});
    });
    later(5.0,()=>sfx('grinnerKnock'));
    if(currentLevel===1)later(11.5,leaveGrinner);
  }else if(stage==='shutterOpen'){
    if(currentLevel===2){world.setShutter(false);sfx('shutter');setStage('night2Finish');say('night2End');later(4.5,complete);return;}
    world.setShutter(false);sfx('shutter');setStage('second');mirrorChecked=false;cameraChecked=false;
    positionNPC('second',6,3.7);
    routeNPC('second',[[5.5,1.5],[0,1.55]],1.4,()=>say('secondCustomer'));sfx('doorbell');
  }else if(stage==='second'){
    if(routes.some(r=>r.name==='second')){toast('Let the customer reach the counter first.',3);return;}
    sfx('cash');say('secondThanks');setStage('shadowIntro');
    exitNPC('second',1.5,()=>{
      later(1.5,()=>{
        positionNPC('shadow',6,3.8);sfx('doorbell');
        routeNPC('shadow',[[5.5,1.5],[0,1.55]],1.5,()=>startShadow());
      });
    });
  }else if(stage==='shadowTimer'){
    stopTimer();world.setEmergency(true);sfx('floodlight');setStage('shadowSafe');flash(.65);
    shadow.group.visible=false;toast('The shadow recoils. The customer is safe to approach.',5);
    say('shadowCustomer');
  }else if(stage==='shadowSafe'){
    setStage('goodbye');const currentRun=run;
    say('jimmyLeave').then(()=>{
      if(currentRun!==run||stage!=='goodbye')return;
      return say('shadowLeave').then(()=>{
        if(currentRun!==run||stage!=='goodbye')return;
        exitNPC('shadow',1.35,()=>{say('end');later(4.2,complete);});
      });
    });
  }
}
function startVisionary(){
  checkpoint='visionary';world.setChipsTaken(true);sfx('chips');setStage('visionaryChase');
  positionNPC('visionary',0,-6.5);sfx('visionary');say('visionary');startTimer(25,'RUN · CALL THE POLICE');
  // The creature follows the same open aisle and counter passage as the player.
  routeNPC('visionary',[[0,-1],[0,1.3],[-4.25,1.3],[-4.25,4.8],[-2.8,5.7]],.78,()=>{if(stage==='visionaryChase')fail('visionary');});
  toast('THE VISIONARY · Do not stop to count the eyes. Run to the red phone!',5);
}
function leaveGrinner(){exitNPC('grinner',2,()=>{setStage('shutterOpen');toast('The entrance bell rings. It is gone.',5);});}
function callPolice(){
  stopTimer();setView('player');setStage('policeCall');world.setShutter(true);sfx('phone');
  const p=npc.visionary.group.position;
  const retreat=p.x<-2||p.z>2?[[-4.25,p.z],[-4.25,1.3],[0,1.3]]:[[0,p.z],[0,1.3]];
  routeNPC('visionary',retreat,1.05);
  const currentRun=run;
  say('callPolice').then(()=>{if(currentRun!==run)return;return say('dispatcher');}).then(()=>{
    if(currentRun!==run||stage!=='policeCall')return;
    later(2,arrivePolice);
  });
}
function arrivePolice(){
  setStage('policeArrive');world.setPolice(true);sfx('siren');
  positionNPC('officer',8,4);positionNPC('officer2',8.7,4.5);
  routeNPC('officer',[[5.6,4],[5.6,1.3],[.9,1.8]],1.8);
  routeNPC('officer2',[[5.6,4.5],[5.6,1],[1.2,1]],1.7,()=>{
    const currentRun=run;
    say('police').then(()=>{
      if(currentRun!==run||stage!=='policeArrive')return;
      exitNPC('visionary',1.45);
      later(.8,()=>exitNPC('officer',1.45));
      later(1.7,()=>exitNPC('officer2',1.45,()=>{
        world.setPolice(false);say('policeClear');setStage('night2Open');toast('The Visionary is gone. The store has been cleared.',5);
      }));
    });
  });
}
function startShadow(){
  checkpoint='shadow';setStage('shadowTimer');startTimer(15,'HIT THE FLOODLIGHTS');
  shadow.group.visible=true;shadow.group.position.set(0,.018,1.9);shadow.group.scale.set(1,1,1);
  sfx('shadow');toast('Its owner is standing still. The shadow is not.',4);
}
function flash(amount=1){$('flash').style.opacity=amount;setTimeout(()=>$('flash').style.opacity=0,130);}
function fail(kind){
  stopTimer();setView('player');active=false;finished=true;keys.clear();audio.stop();sfx('scare');
  if(kind==='grinner'){
    npc.grinner.setVisible(true);npc.grinner.setGrinning(true);
    npc.grinner.group.position.copy(player).add(new THREE.Vector3(-Math.sin(yaw)*.75,-1.65,-Math.cos(yaw)*.75));
    npc.grinner.group.rotation.y=yaw;
  }
  $('end-tag').textContent='SHIFT INTERRUPTED';$('end-title').textContent=kind==='visionary'?'It saw you hesitate.':kind==='grinner'?'You let it in.':'The lights were too late.';
  $('end-text').textContent=kind==='visionary'?'Run around the left end of the counter and use the red phone. Hold Shift to run. Call the police before the Visionary reaches you.':kind==='grinner'?'Once the camera reveals the grin, you have 20 seconds to close the counter shutter.':'You have 15 seconds. The yellow emergency switch is to your right, behind the counter.';
  $('retry').innerHTML='RETRY ENCOUNTER <span>↗</span>';$('end-stats').classList.add('hidden');
  ui.ending.classList.remove('hidden');ui.hud.classList.add('hidden');if(document.pointerLockElement)document.exitPointerLock();
}
function complete(){
  stopTimer();active=false;finished=true;checkpoint='complete';ui.hud.classList.add('hidden');ui.ending.classList.remove('hidden');
  $('end-tag').textContent='LEVEL 01 / SHIFT COMPLETE';$('end-title').textContent='You made it, Jimmy.';
  $('end-text').textContent='You rescued the customer, shut out the Grinner, and stopped the Stray Shadow. The store is quiet again. For now.';
  if(currentLevel===2){$('end-tag').textContent='LEVEL 02 / SHIFT COMPLETE';$('end-title').textContent='Somebody was watching.';$('end-text').textContent='You escaped the Visionary, called the police, served a real customer, and kept the Grinner outside. Those eyes are finally gone.';}
  $('end-stats').innerHTML=currentLevel===2?'<span>THE VISIONARY REMOVED</span><span>THE GRINNER SHUT OUT</span><span>SHIFT 02 COMPLETE</span>':'<span>4 CUSTOMERS</span><span>2 THREATS SURVIVED</span><span>SHIFT 01 COMPLETE</span>';
  $('retry').innerHTML='PLAY AGAIN <span>↗</span>';$('end-stats').classList.remove('hidden');
  if(document.pointerLockElement)document.exitPointerLock();
}
function retry(){
  if(checkpoint==='visionary'){begin(2);return;}
  if(checkpoint==='complete'||checkpoint==='start'){begin();return;}
  run++;events=[];routes=[];audio.stop();clearNPCs();ui.ending.classList.add('hidden');ui.hud.classList.remove('hidden');
  player.set(0,1.65,5.3);yaw=0;pitch=0;paused=false;active=true;finished=false;stopTimer();setView('player');
  world.setShutter(false);world.setEmergency(false);world.setPolice(false);keys.clear();lockMouse();audio.init();
  if(checkpoint==='grinner'){positionNPC('grinner',-.7,-2.1);setStage('grinnerInspect');}
  else{positionNPC('shadow',0,1.55);startShadow();}
}
function returnMenu(){
  run++;active=false;finished=false;paused=false;events=[];routes=[];audio.stop();clearNPCs();stopTimer();setView('player');
  ui.ending.classList.add('hidden');ui.pause.classList.add('hidden');ui.hud.classList.add('hidden');ui.levels.classList.add('hidden');ui.menu.classList.remove('hidden');
  world.setEmergency(false);world.setShutter(false);world.setFreezer(false);world.setPolice(false);world.setChipsTaken(true);stage='menu';keys.clear();
  if(document.pointerLockElement)document.exitPointerLock();
  positionNPC('first',0,1.55);
}
function showLevels(){returnMenu();ui.menu.classList.add('hidden');ui.levels.classList.remove('hidden');stage='levels';}

audio.onSubtitle=(text,speaker)=>{
  if(!text){ui.subtitle.classList.add('hidden');return;}
  ui.subtitle.querySelector('small').textContent=speaker||'';
  ui.subtitle.querySelector('p').textContent=text;
  ui.subtitle.classList.toggle('hidden',!$('captions').checked);
};
function blocked(x,z){
  if(x<-6.65||x>6.55||z<-8.1||z>6.6)return true;
  return world.colliders.some(b=>x>b.minX-.23&&x<b.maxX+.23&&z>b.minZ-.23&&z<b.maxZ+.23);
}
function movePlayer(dt){
  if(view!=='player')return;
  const forward=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0);
  const side=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0);
  moves.set(side,0,-forward);if(moves.lengthSq()>0)moves.normalize();
  const sin=Math.sin(yaw),cos=Math.cos(yaw),speed=keys.has('ShiftLeft')?3.8:2.6;
  const dx=(moves.x*cos+moves.z*sin)*speed*dt,dz=(-moves.x*sin+moves.z*cos)*speed*dt;
  if(!blocked(player.x+dx,player.z))player.x+=dx;
  if(!blocked(player.x,player.z+dz))player.z+=dz;
  if(forward||side){walkPhase+=dt*8.5;if(gameTime>footstepTime){sfx('footstep');footstepTime=gameTime+.46;}}
  camera.position.copy(player);
  if(!reducedMotion&&(forward||side))camera.position.y+=Math.sin(walkPhase)*.023;
  camera.rotation.set(pitch,yaw,0,'YXZ');
}
function updateRoutes(dt){
  for(const route of [...routes]){
    const person=npc[route.name],target=route.points[0];if(!target)continue;
    tempVec.copy(target).sub(person.group.position);tempVec.y=0;const distance=tempVec.length();
    if(distance<route.speed*dt+.025){
      person.group.position.copy(target);route.points.shift();
      if(!route.points.length){routes=routes.filter(r=>r!==route);person.setWalking(false);person.group.rotation.y=0;route.onEnd?.();}
    }else{tempVec.normalize();person.group.position.addScaledVector(tempVec,route.speed*dt);person.group.rotation.y=Math.atan2(tempVec.x,tempVec.z);}
  }
}
function updateHUD(){
  currentTarget=setTarget();
  const near=currentTarget&&flatDistance(player,currentTarget.pos)<2.05&&view==='player';
  ui.prompt.classList.toggle('hidden',!near);
  if(near)ui.prompt.querySelector('span').textContent=currentTarget.label;
  const showWaypoint=currentTarget&&!near&&view==='player';
  $('waypoint').classList.toggle('hidden',!showWaypoint);
  if(showWaypoint){
    const dist=flatDistance(player,currentTarget.pos);
    const dx=currentTarget.pos.x-player.x,dz=currentTarget.pos.z-player.z;
    let angle=Math.atan2(-dx,-dz)-yaw;angle=Math.atan2(Math.sin(angle),Math.cos(angle));
    $('waypoint-arrow').style.transform=`rotate(${-angle*180/Math.PI+180}deg)`;
    $('waypoint-label').textContent=({register:'COUNTER',freezer:'FREEZER',camera:'CAMERA',shutter:'SHUTTER SWITCH',floodlight:'FLOODLIGHT SWITCH',chips:'CHIPS SHELF',phone:'POLICE PHONE'}[currentTarget.name])+` · ${Math.round(dist)} m`;
  }
  if(timerMax){
    $('seconds').textContent=Math.max(0,timer).toFixed(1);$('timer-bar').style.width=`${timer/timerMax*100}%`;ui.timer.classList.toggle('danger',timer<6);
  }
}
function update(dt){
  if(active&&!paused){
    gameTime+=dt;stageTime+=dt;movePlayer(dt);updateRoutes(dt);
    const due=events.filter(e=>e.at<=gameTime);events=events.filter(e=>e.at>gameTime);
    for(const e of due)if(e.run===run)e.fn();
    for(const person of Object.values(npc))if(person.group.visible)person.update(dt,gameTime);
    if(stage==='return'&&player.z>3.6&&Math.abs(player.x)<3.5){setStage('grinnerInspect');toast('The customer in the aisle has not moved. Check CAM 02.',5);}
    if(stage==='freezer'&&gameTime>knockTime){sfx('knock');knockTime=gameTime+6;}
    if(timerMax){
      timer-=dt;
      if(stage==='shadowTimer'){
        const p=1-Math.max(0,timer)/timerMax;
        shadow.group.position.set(Math.sin(p*Math.PI)*-.55,.025,1.8+p*3.7);
        shadow.setProgress(p);shadow.update(dt,gameTime);
      }
      if(stage==='visionaryChase'&&flatDistance(player,npc.visionary.group.position)<.9)fail('visionary');
      else if(timer<=0)fail(stage==='visionaryChase'?'visionary':stage==='grinnerTimer'?'grinner':'shadow');
    }
    if(gameTime>toastUntil)$('toast').classList.add('hidden');
    updateHUD();
  }
  if(!paused)world.update(gameTime,dt);
}
let previous=performance.now(),titleTime=0;
function frame(now){
  const dt=Math.min((now-previous)/1000,.05);previous=now;
  update(dt);
  if(!active&&!finished){
    titleTime+=dt;camera.position.set(4.9+Math.sin(titleTime*.12)*.35,2.25,6.0);
    camera.lookAt(-.9,1.2,-2.3);npc.first.update(dt,titleTime);
    if(!paused)world.update(titleTime,dt);
  }
  renderer.toneMappingExposure=brightness*(view==='camera'?1.25:1.05);
  renderer.render(scene,view==='camera'?cctvCamera:view==='mirror'?mirrorCamera:camera);
  requestAnimationFrame(frame);
}
function onResize(){
  for(const cam of [camera,cctvCamera,mirrorCamera]){cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();}
  renderer.setSize(innerWidth,innerHeight);
}
addEventListener('resize',onResize);
addEventListener('keydown',e=>{
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
  if(e.code==='Escape'){if(active&&!paused)pauseGame();return;}
  if(e.repeat)return;
  if(!paused){keys.add(e.code);if(e.code==='KeyE')interact();if(e.code==='KeyC')toggleCamera();if(e.code==='KeyM')toggleMirror();}
});
addEventListener('keyup',e=>keys.delete(e.code));
addEventListener('blur',()=>{keys.clear();if(active&&!paused)pauseGame();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&active&&!paused)pauseGame();});
document.addEventListener('pointerlockchange',()=>{
  if(!document.pointerLockElement&&active&&!paused)pauseGame();
});
function look(dx,dy){if(!active||paused||view!=='player')return;yaw-=dx*.0022;pitch=THREE.MathUtils.clamp(pitch-dy*.0022,-1.22,1.22);}
document.addEventListener('mousemove',e=>{if(document.pointerLockElement===renderer.domElement)look(e.movementX,e.movementY);});
renderer.domElement.addEventListener('pointerdown',e=>{if(!active||paused)return;isDragging=true;lastPointer={x:e.clientX,y:e.clientY};renderer.domElement.setPointerCapture(e.pointerId);});
renderer.domElement.addEventListener('pointermove',e=>{if(isDragging&&!document.pointerLockElement){look(e.clientX-lastPointer.x,e.clientY-lastPointer.y);lastPointer={x:e.clientX,y:e.clientY};}});
renderer.domElement.addEventListener('pointerup',()=>{isDragging=false;lastPointer=null;});
$('start').addEventListener('click',showLevels);$('resume').addEventListener('click',resumeGame);
$('level-one').addEventListener('click',()=>begin(1));$('level-two').addEventListener('click',()=>begin(2));$('levels-back').addEventListener('click',returnMenu);
$('pause-levels').addEventListener('click',showLevels);$('end-levels').addEventListener('click',showLevels);
$('pause-button').addEventListener('click',()=>pauseGame());$('menu-settings').addEventListener('click',()=>pauseGame(true));
$('restart').addEventListener('click',()=>begin(currentLevel));$('retry').addEventListener('click',retry);$('end-menu').addEventListener('click',returnMenu);
$('volume').addEventListener('input',e=>{audio.setVolume(e.target.value/100);$('volume-value').textContent=e.target.value+'%';});
$('music-volume').addEventListener('input',e=>{audio.setMusicVolume(e.target.value/100);$('music-volume-value').textContent=e.target.value+'%';});
$('brightness').addEventListener('input',e=>{brightness=e.target.value/100;$('brightness-value').textContent=e.target.value+'%';});
$('reduce-motion').addEventListener('change',e=>reducedMotion=e.target.checked);
$('captions').addEventListener('change',e=>{if(!e.target.checked)ui.subtitle.classList.add('hidden');});
for(const button of document.querySelectorAll('[data-key]')){
  button.addEventListener('pointerdown',e=>{e.preventDefault();keys.add(button.dataset.key);button.setPointerCapture(e.pointerId);});
  for(const event of ['pointerup','pointercancel'])button.addEventListener(event,()=>keys.delete(button.dataset.key));
}
$('touch-camera').addEventListener('click',toggleCamera);$('touch-action').addEventListener('click',interact);
window.addEventListener('error',e=>{
  if(!$('loading').classList.contains('hidden'))$('loading').lastElementChild.textContent='The store could not load. Please refresh. '+e.message;
});
window.__nightShift={get state(){return {level:currentLevel,stage,active,paused,view,timer,player:{x:player.x,z:player.z},mirrorChecked,cameraChecked,checkpoint,targets:Object.fromEntries(Object.entries(world.targets).map(([k,v])=>[k,{x:v.x,z:v.z}]))};}};
positionNPC('first',0,1.55);$('loading').classList.add('hidden');ui.menu.classList.remove('hidden');
requestAnimationFrame(frame);
