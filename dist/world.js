import * as THREE from './vendor/three.module.js';

// All scenery and packaging is drawn locally. No external asset requests.
export function createWorld(scene) {
  let seed=5217;
  const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const root=new THREE.Group();root.name='WILLOW CREEK • environment';scene.add(root);
  const colliders=[],normalLights=[],floodLights=[],fluorescents=[];
  const mat=(color,roughness=.75,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
  const painted=mat(0x697b73),dark=mat(0x182927),steel=mat(0x778784,.4,.6),cream=mat(0xc9c6ab),black=mat(0x101918),red=mat(0xa53529),yellow=mat(0xd5a649);
  const boxGeo=new THREE.BoxGeometry(1,1,1);
  function box(w,h,d,x,y,z,m,parent=root,shadow=true){const a=new THREE.Mesh(boxGeo,m);a.scale.set(w,h,d);a.position.set(x,y,z);a.castShadow=shadow;a.receiveShadow=true;parent.add(a);return a;}
  function cylinder(r,h,x,y,z,m,parent=root){const a=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,12),m);a.position.set(x,y,z);a.castShadow=true;a.receiveShadow=true;parent.add(a);return a;}
  function obstacle(x,z,w,d){colliders.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2});}
  function texture(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;}
  function sign(text,w,h,x,y,z,{bg='#253c37',fg='#e2d7b3',size=55,rot=0,parent=root,emissive=false}={}){const t=texture(768,256,(c,W,H)=>{c.fillStyle=bg;c.fillRect(0,0,W,H);c.strokeStyle=fg;c.lineWidth=5;c.strokeRect(12,12,W-24,H-24);c.textAlign='center';c.textBaseline='middle';c.font=`bold ${size}px Georgia`;text.split('\n').forEach((s,i,a)=>c.fillText(s,W/2,H/2+(i-(a.length-1)/2)*67));});const m=emissive?new THREE.MeshBasicMaterial({map:t}):new THREE.MeshStandardMaterial({map:t,roughness:.8});const a=new THREE.Mesh(new THREE.PlaneGeometry(w,h),m);a.position.set(x,y,z);a.rotation.y=rot;parent.add(a);return a;}
  const floorTex=texture(512,512,(c,W,H)=>{c.fillStyle='#86908a';c.fillRect(0,0,W,H);for(let y=0;y<4;y++)for(let x=0;x<4;x++){c.fillStyle=(x+y)%2?'#84918a':'#a5aaa0';c.fillRect(x*128+2,y*128+2,124,124);}for(let i=0;i<6500;i++){c.fillStyle=`rgba(20,35,30,${rnd()*.13})`;c.fillRect(rnd()*W,rnd()*H,rnd()*3+1,rnd()*3+1);}c.strokeStyle='rgba(35,45,35,.12)';for(let i=0;i<50;i++){const x=rnd()*W,y=rnd()*H;c.beginPath();c.moveTo(x,y);c.lineTo(x+rnd()*55,y+rnd()*20);c.stroke();}});floorTex.wrapS=floorTex.wrapT=THREE.RepeatWrapping;floorTex.repeat.set(7,8);
  box(14,.15,16,0,-.08,-1,new THREE.MeshStandardMaterial({map:floorTex,roughness:.36,metalness:.08}));
  const wallTex=texture(256,512,(c,W,H)=>{c.fillStyle='#89968a';c.fillRect(0,0,W,H);c.fillStyle='#d4d2b8';c.fillRect(0,0,W,H*.66);c.fillStyle='#3b6558';c.fillRect(0,H*.66,W,12);for(let i=0;i<5500;i++){c.fillStyle=`rgba(23,38,28,${rnd()*.1})`;c.fillRect(rnd()*W,rnd()*H,2,3);}for(let x=0;x<W;x+=64){c.fillStyle='rgba(40,52,40,.13)';c.fillRect(x,0,1,H);}});wallTex.wrapS=THREE.RepeatWrapping;wallTex.repeat.x=4;
  const wallMat=new THREE.MeshStandardMaterial({map:wallTex,roughness:1});
  box(.2,3.8,16,-7,1.9,-1,wallMat);obstacle(-7,-1,.2,16);
  box(14,3.8,.2,0,1.9,7,wallMat);obstacle(0,7,14,.2);
  box(5.65,3.8,.2,-4.175,1.9,-9,wallMat);box(5.65,3.8,.2,4.175,1.9,-9,wallMat);
  box(2.7,.7,.2,0,3.45,-9,wallMat);obstacle(-4.175,-9,5.65,.2);obstacle(4.175,-9,5.65,.2);
  box(.2,.65,16,7,.325,-1,wallMat);box(.2,.55,16,7,3.525,-1,wallMat);obstacle(7,-1,.2,16);
  box(14,.12,16,0,3.86,-1,mat(0x727e70));
  for(let x=-6;x<=6;x+=2)box(.022,.018,16,x,3.79,-1,steel,root,false);
  for(let z=-8;z<=6;z+=2)box(14,.018,.022,0,3.79,z,steel,root,false);
  box(14,.12,.14,0,.15,6.88,dark);box(.14,.12,16,-6.88,.15,-1,dark);
  // Rain-smeared glazing along the eastern storefront.
  const rainTex=texture(256,512,(c,W,H)=>{c.clearRect(0,0,W,H);for(let i=0;i<90;i++){let x=rnd()*W,y=rnd()*H;c.strokeStyle=`rgba(147,192,191,${.12+rnd()*.25})`;c.lineWidth=.6+rnd()*1.5;c.beginPath();c.moveTo(x,y);c.lineTo(x-3,y+10+rnd()*130);c.stroke();}});rainTex.wrapT=THREE.RepeatWrapping;
  const glassMat=new THREE.MeshStandardMaterial({color:0x527775,map:rainTex,transparent:true,opacity:.38,roughness:.2,metalness:.15,side:THREE.DoubleSide,depthWrite:false});
  for(let z=-7.6;z<6;z+=2.6){box(.09,2.6,.08,6.93,1.95,z,dark);const g=new THREE.Mesh(new THREE.PlaneGeometry(2.5,2.6),glassMat);g.rotation.y=-Math.PI/2;g.position.set(6.96,1.95,z+1.25);root.add(g);}
  box(.16,.08,16,6.9,.67,-1,dark);box(.16,.08,16,6.9,3.24,-1,dark);
  sign('OPEN\n24 HOURS',1.25,.65,6.81,2.5,3.85,{rot:-Math.PI/2,fg:'#ef916f',bg:'#162529',emissive:true,size:62});
  box(.12,2.6,.07,6.8,1.35,2.95,steel);box(.12,2.6,.07,6.8,1.35,5.05,steel);box(.12,.07,2.16,6.8,2.63,4,steel);box(.17,.06,.8,6.7,1.15,4,steel);
  box(35,.1,40,15,-.17,-2,mat(0x111e25,.35));
  for(let z=-15;z<15;z+=5)box(6,.006,.12,13,-.11,z,mat(0x9b925b),root,false);
  for(let z=-12;z<15;z+=9){cylinder(.07,6.5,15,3.1,z,steel);box(1.2,.15,.6,14.6,6.3,z,steel);const p=new THREE.PointLight(0xa5cddd,45,16,2);p.position.set(14.2,5.9,z);root.add(p);}
  const car=new THREE.Group();car.position.set(15,.05,-2);box(2.1,.8,4.1,0,.7,0,mat(0x1a373b),car);box(1.8,.65,2.2,0,1.4,-.1,mat(0x18292e,.18,.4),car);for(const x of [-1,1])for(const z of [-1.2,1.2]){const tire=cylinder(.43,.2,x,.4,z,black,car);tire.rotation.z=Math.PI/2;}root.add(car);
  // An arriving patrol car sits outside the entrance and never blocks the shop.
  const policeCar=new THREE.Group();policeCar.name='Willow Creek patrol car';policeCar.position.set(10.5,.02,4);policeCar.visible=false;root.add(policeCar);
  const policeWhite=mat(0xd7dcd4,.34,.25),policeBlack=mat(0x172126,.3,.35),policeGlass=mat(0x26434b,.12,.45);
  box(2,.48,4.4,0,.62,0,policeWhite,policeCar);box(1.98,.12,4.5,0,.39,0,policeBlack,policeCar);box(1.93,.17,1.08,0,.92,1.54,policeBlack,policeCar);box(1.93,.16,.8,0,.92,-1.72,policeBlack,policeCar);
  box(1.76,.69,2.35,0,1.21,-.08,policeGlass,policeCar);box(1.82,.1,2.4,0,1.59,-.08,policeWhite,policeCar);for(const x of [-.91,.91]){box(.08,.7,.08,x,1.22,-1.2,policeWhite,policeCar);box(.08,.7,.1,x,1.22,.34,policeWhite,policeCar);box(.08,.7,.08,x,1.22,1.1,policeWhite,policeCar);box(.03,.26,2.15,x*1.105,.68,0,policeBlack,policeCar);}
  for(const x of [-1.01,1.01])for(const z of [-1.35,1.35]){const tire=cylinder(.4,.2,x,.4,z,black,policeCar);tire.rotation.z=Math.PI/2;const hub=cylinder(.19,.215,x,.4,z,steel,policeCar);hub.rotation.z=Math.PI/2;}
  sign('POLICE',1.65,.28,-1.025,.72,0,{rot:-Math.PI/2,bg:'#1a292e',fg:'#eef0d8',size:80,parent:policeCar});
  box(1.5,.12,.35,0,1.72,-.08,policeBlack,policeCar);
  const policeRedMat=new THREE.MeshStandardMaterial({color:0x972b29,emissive:0xff2c22,emissiveIntensity:0}),policeBlueMat=new THREE.MeshStandardMaterial({color:0x234498,emissive:0x236dff,emissiveIntensity:0});
  box(.62,.17,.31,-.4,1.85,-.08,policeRedMat,policeCar);box(.62,.17,.31,.4,1.85,-.08,policeBlueMat,policeCar);
  const policeRedLight=new THREE.PointLight(0xff332b,0,17,1.6),policeBlueLight=new THREE.PointLight(0x317bff,0,17,1.6);policeRedLight.position.set(8.2,2.2,3.4);policeBlueLight.position.set(8.2,2.2,4.6);root.add(policeRedLight,policeBlueLight);
  // A cold room recessed into the rear wall.
  box(3.2,.12,3,0,-.025,-9.95,steel);box(3.2,3.1,.15,0,1.55,-11.2,painted);box(.12,3.1,2.4,-1.55,1.55,-10.1,steel);box(.12,3.1,2.4,1.55,1.55,-10.1,steel);obstacle(0,-11.2,3.2,.15);obstacle(-1.55,-10.1,.12,2.4);obstacle(1.55,-10.1,.12,2.4);
  box(.18,3.08,.38,-1.43,1.54,-8.9,steel);box(.18,3.08,.38,1.43,1.54,-8.9,steel);box(3.04,.18,.38,0,3.08,-8.9,steel);
  const freezerDoor=new THREE.Group();freezerDoor.name='freezer hinge';freezerDoor.position.set(-1.32,0,-8.72);root.add(freezerDoor);
  box(2.64,2.95,.17,1.32,1.48,0,mat(0x9db4b5,.38,.52),freezerDoor);box(2.4,2.65,.022,1.32,1.48,.1,mat(0x7f999b,.52,.35),freezerDoor);
  box(.1,.65,.14,2.36,1.35,.19,dark,freezerDoor);box(.48,.13,.13,2.17,1.6,.18,steel,freezerDoor);
  sign('FREEZER',1.45,.42,1.32,2.35,.12,{bg:'#b8c7bc',fg:'#254b50',size:75,parent:freezerDoor});
  sign('PULL TO OPEN\nKEEP DOOR CLOSED',.85,.45,1.32,1.77,.12,{bg:'#bbbaa1',fg:'#3a4c42',size:42,parent:freezerDoor});
  sign('COLD STORAGE',2.7,.42,0,3.43,-8.83,{bg:'#19434c',fg:'#a2dee1',size:66,emissive:true});
  const coldLight=new THREE.PointLight(0x7ee6ff,24,7,2);coldLight.position.set(0,2.6,-9.7);root.add(coldLight);
  for(let i=0;i<6;i++)box(.6,.4,.55,-.8+(i%3)*.7,.25+Math.floor(i/3)*.45,-10.8,mat(i%2?0x899f97:0xc4baa0));
  // Shelves, including the illustrated packaging, are instanced for smooth movement.
  const products=[];
  const brands=[['MIDNIGHT','CRUNCH','#b64a32'],['OWL','COOKIES','#ba9a52'],['GARDEN','PEAS','#528267'],['FRESH','MILK','#c6d3c3'],['SUNSET','SODA','#9e6e31'],['NORTH','COFFEE','#643d35'],['OAT','FLAKES','#a98454'],['MOON','CHIPS','#626982']];
  for(const [brand,kind,color] of brands){const t=texture(128,192,(c,W,H)=>{c.fillStyle=color;c.fillRect(0,0,W,H);c.fillStyle='#e7dbb4';c.fillRect(0,35,W,45);c.textAlign='center';c.font='bold 18px Georgia';c.fillStyle='#233b37';c.fillText(brand,W/2,63);c.fillStyle='#f1dca5';c.beginPath();c.arc(W/2,115,25,0,Math.PI*2);c.fill();c.fillStyle=color;c.beginPath();c.arc(W/2+8,109,18,0,Math.PI*2);c.fill();c.fillStyle='#fff3ce';c.font='bold 14px sans-serif';c.fillText(kind,W/2,161);c.fillStyle='rgba(255,255,255,.2)';c.fillRect(6,5,4,H-10);});products.push({material:new THREE.MeshStandardMaterial({map:t,roughness:.68}),positions:[]});}
  function product(type,x,y,z,w=.24,h=.36,d=.18,rot=0){products[type%products.length].positions.push({x,y,z,w,h,d,rot});}
  for(const x of [-3.5,3.5]){obstacle(x,-2,1.1,5.2);box(1.08,1.76,5.2,x,.88,-2,painted);for(const y of [.18,.68,1.18,1.68]){box(1.28,.055,5.3,x,y,-2,cream);box(.035,.11,5.31,x-.65,y+.02,-2,red);box(.035,.11,5.31,x+.65,y+.02,-2,red);for(const side of [-1,1])for(let j=0;j<16;j++){if(rnd()<.13)continue;const type=Math.floor(rnd()*8),z=-4.42+j*.31;product(type,x+side*.45,y+.22,z,.22,.34+rnd()*.08,.23,side*Math.PI/2);}}box(.07,1.9,.07,x-.62,.95,-4.62,steel);box(.07,1.9,.07,x+.62,.95,-4.62,steel);box(.07,1.9,.07,x-.62,.95,.62,steel);box(.07,1.9,.07,x+.62,.95,.62,steel);sign(x<0?'PANTRY / 01':'SNACKS / 02',1.15,.35,x,2.18,.7,{size:55});for(const xx of [-.42,.42])box(.018,1.5,.018,x+xx,2.95,.63,steel,root,false);}
  // A single collectible bag is separate from the instanced stock so it can vanish on pickup.
  box(.52,.065,1,-2.58,1.12,-3.5,cream);box(.09,.43,.75,-2.83,.9,-3.5,painted);obstacle(-2.64,-3.5,.38,1);
  sign('CHIPS  /  $1.25',1,.25,-2.3,1.04,-3.5,{rot:Math.PI/2,bg:'#c4923e',fg:'#293a2b',size:64});
  const chipsGroup=new THREE.Group();chipsGroup.name='collectible chips';chipsGroup.position.set(-2.48,1.47,-3.5);chipsGroup.rotation.y=Math.PI/2;root.add(chipsGroup);
  const chipsTex=texture(256,384,(c,W,H)=>{c.fillStyle='#cf702d';c.fillRect(0,0,W,H);c.fillStyle='#f7d06f';c.fillRect(0,37,W,85);c.fillStyle='#542c20';c.textAlign='center';c.font='bold 32px Georgia';c.fillText('MIDNIGHT',W/2,77);c.font='bold 24px Georgia';c.fillText('CRUNCH',W/2,106);c.fillStyle='#efbb58';for(const [x,y,r] of [[90,195,-.45],[160,221,.35],[101,244,.15]]){c.save();c.translate(x,y);c.rotate(r);c.beginPath();c.ellipse(0,0,46,29,0,0,Math.PI*2);c.fill();c.strokeStyle='#bd853c';for(let j=-3;j<4;j++){c.beginPath();c.moveTo(-30,j*6);c.lineTo(30,j*6);c.stroke();}c.restore();}c.fillStyle='#fff0bd';c.font='bold 30px Georgia';c.fillText('CHIPS',W/2,312);c.font='16px sans-serif';c.fillText('ORIGINAL • SEA SALT',W/2,342);for(let x=3;x<W;x+=8){c.fillStyle='#9f4c26';c.fillRect(x,0,3,20);c.fillRect(x,H-19,3,19);}const shine=c.createLinearGradient(0,0,W,0);shine.addColorStop(0,'rgba(255,255,255,.25)');shine.addColorStop(.25,'rgba(255,255,255,0)');shine.addColorStop(.8,'rgba(0,0,0,0)');shine.addColorStop(1,'rgba(0,0,0,.22)');c.fillStyle=shine;c.fillRect(0,0,W,H);});
  const chipBagMat=new THREE.MeshStandardMaterial({map:chipsTex,roughness:.42,metalness:.13,emissive:0x6a3013,emissiveIntensity:.12});
  const chipBag=box(.46,.62,.19,0,0,0,chipBagMat,chipsGroup);chipBag.rotation.z=-.05;box(.48,.035,.11,0,.31,0,mat(0xc18035,.45),chipsGroup);box(.47,.025,.13,0,-.31,0,mat(0xc18035,.45),chipsGroup);
  sign('CHIPS',.95,.3,-2.56,2.1,-3.5,{rot:Math.PI/2,bg:'#f1d287',fg:'#603b29',size:90});
  // Illuminated drinks refrigerators along the west wall.
  for(let k=0;k<4;k++){const z=-6.4+k*1.65;box(.75,2.5,1.56,-6.45,1.25,z,dark);obstacle(-6.45,z,.9,1.6);box(.12,2.24,1.38,-6.05,1.25,z,mat(0xc1dbd1,.3));for(const y of [.35,.9,1.45,2]){box(.6,.04,1.42,-6.12,y,z,steel);for(let j=0;j<5;j++)product((j+k)%5,-5.98,y+.2,z-.55+j*.26,.18,.36,.16,Math.PI/2);}box(.08,2.45,.045,-5.94,1.25,z-.75,steel);box(.08,2.45,.045,-5.94,1.25,z+.75,steel);box(.06,.42,.06,-5.85,1.3,z+.58,steel);const strip=new THREE.MeshBasicMaterial({color:0x9de8d8});box(.03,2.14,.04,-5.9,1.3,z-.63,strip,root,false);}
  const fridgeGlow=new THREE.PointLight(0x8accc0,22,7,2);fridgeGlow.position.set(-5.4,1.6,-3.9);root.add(fridgeGlow);
  sign('COLD DRINKS',1.5,.38,-5.9,2.8,-3.9,{rot:Math.PI/2,fg:'#a7dbc5',emissive:true,size:62});
  const instancedDummy=new THREE.Object3D();for(const p of products){const mesh=new THREE.InstancedMesh(boxGeo,p.material,p.positions.length);p.positions.forEach((q,i)=>{instancedDummy.position.set(q.x,q.y,q.z);instancedDummy.scale.set(q.w,q.h,q.d);instancedDummy.rotation.set(0,q.rot,0);instancedDummy.updateMatrix();mesh.setMatrixAt(i,instancedDummy.matrix);});mesh.receiveShadow=true;root.add(mesh);}
  // Cashier station: worn wood, register, camera monitor and safety switches.
  const woodTex=texture(256,256,(c,W,H)=>{c.fillStyle='#66503c';c.fillRect(0,0,W,H);for(let i=0;i<120;i++){c.strokeStyle=`rgba(23,18,10,${rnd()*.26})`;c.beginPath();c.moveTo(rnd()*W,0);c.lineTo(rnd()*W,H);c.stroke();}});
  box(5.2,1.02,1.12,-.5,.51,3.03,new THREE.MeshStandardMaterial({map:woodTex,roughness:.7}));obstacle(-.5,3.03,5.2,1.12);
  box(5.42,.13,1.35,-.5,1.08,3.03,mat(0x203631,.4));box(5.28,.09,.035,-.5,.8,2.455,yellow);
  sign('WILLOW CREEK\nTHANK YOU FOR SHOPPING',2.6,.65,-.5,.54,2.455,{rot:Math.PI,bg:'#294d41',fg:'#d0c49d',size:54});
  box(.78,.23,.58,.2,1.26,3.12,cream);box(.69,.42,.2,.2,1.53,2.95,dark);sign('TOTAL   $ 4.50',.61,.2,.2,1.56,3.058,{bg:'#102923',fg:'#9ac98e',emissive:true,size:51});
  box(.49,.035,.25,.2,1.39,3.37,black);for(let i=0;i<12;i++)box(.08,.012,.045,.04+(i%4)*.1,1.414,3.3+Math.floor(i/4)*.065,cream,root,false);
  const coins=cylinder(.085,.012,.82,1.16,3.48,mat(0xb89e5b,.3,.75));cylinder(.065,.012,1.03,1.16,3.38,mat(0xb5b9b1,.3,.85));
  box(.85,.62,.44,-1.65,1.46,3.13,mat(0x263a32));box(.7,.46,.025,-1.65,1.48,3.365,black);const monitor=sign('CAM 01\nAISLE / LIVE',.65,.4,-1.65,1.48,3.385,{bg:'#132a23',fg:'#91bf94',size:51,emissive:true});
  box(.68,.08,.42,-1.65,1.18,3.16,dark);cylinder(.025,.02,-1.99,1.2,3.36,mat(0x58be72));
  sign('CCTV  [C]',.85,.2,-1.65,1.88,3.4,{bg:'#d7cb9e',fg:'#2e4336',size:65});
  const shutterSwitch=new THREE.Group();shutterSwitch.position.set(1.85,1.15,3.4);root.add(shutterSwitch);box(.32,.11,.32,0,0,0,yellow,shutterSwitch);const sb=cylinder(.085,.05,0,.08,0,red,shutterSwitch);
  sign('SHUTTER [E]',.85,.22,1.62,1.47,3.45,{bg:'#d5b450',fg:'#333523',size:58});
  box(.16,2.77,.18,-3.22,2.3,2.53,steel);box(.16,2.77,.18,2.22,2.3,2.53,steel);box(5.6,.34,.36,-.5,3.53,2.53,steel);
  const shutter=new THREE.Group();shutter.position.set(-.5,3.49,2.55);shutter.name='security shutter';root.add(shutter);
  box(5.36,2.36,.09,0,-1.18,0,mat(0x637670,.5,.65),shutter);for(let i=0;i<24;i++)box(5.36,.025,.11,0,-.05-i*.1,.025,steel,shutter,false);shutter.scale.y=.015;
  sign('STAFF ONLY',1.1,.25,-4.5,.02,3.5,{bg:'#383b2b',fg:'#cbbb84',size:64}).rotation.x=-Math.PI/2;
  // A large real-mirror-ready plane overlooks the checkout. Its local normal is +Z.
  const mirrorMesh=new THREE.Mesh(new THREE.PlaneGeometry(2.47,1.47),mat(0x8ba3a3,.07,1));mirrorMesh.position.set(0,2.1,-8.68);root.add(mirrorMesh);
  // The mirror is on a narrow suspended board above the aisle, clear of the freezer door.
  mirrorMesh.position.set(0,2.43,.3);mirrorMesh.rotation.x=.48;const mirrorFrame=box(2.65,1.65,.07,0,2.43,.25,dark);mirrorFrame.rotation.x=.48;for(const x of [-1.15,1.15])box(.025,.65,.025,x,3.48,.27,steel,root,false);
  sign('CHECK REFLECTION  [M]',2.6,.22,0,1.49,.3,{bg:'#b5baa0',fg:'#263f32',size:55});
  // Floodlight control is deliberately separate from the shutter switch.
  box(.15,1.35,.15,2.8,.68,5,steel);box(.58,.08,.52,2.8,.045,5,dark);box(.48,.4,.22,2.8,1.48,5,yellow);const emergencyButton=cylinder(.11,.045,2.8,1.48,5.14,red);emergencyButton.rotation.x=Math.PI/2;
  sign('FLOODLIGHT\n[E]',.78,.38,2.8,1.98,5.03,{bg:'#d4b75c',fg:'#2a3d32',size:56});
  for(const x of [-5.5,5.5]){box(.7,.44,.3,x,3.24,5.8,steel);const lens=box(.58,.3,.025,x,3.24,5.61,new THREE.MeshStandardMaterial({color:0xd3d6b5,emissive:0xfff4cf,emissiveIntensity:.1}));fluorescents.push({mesh:lens,flood:true});const l=new THREE.SpotLight(0xfff6d5,0,26,Math.PI/2.8,.55,1.3);l.position.set(x,3.15,5.5);l.target.position.set(0,.3,-2);root.add(l,l.target);floodLights.push(l);}
  // Fluorescent luminaires and one soft shadow map keep the store legible.
  const ambient=new THREE.HemisphereLight(0xb5cec1,0x2b342c,.85);root.add(ambient);
  for(const [x,z] of [[-3.5,-5],[3.5,-5],[-3.5,0],[3.5,0],[0,4.6]]){box(1.65,.15,.42,x,3.58,z,dark);const m=new THREE.MeshStandardMaterial({color:0xdee6c5,emissive:0xc9e6af,emissiveIntensity:2.3});const b=box(1.49,.035,.28,x,3.49,z,m,root,false);fluorescents.push({mesh:b,flood:false});for(const d of [-.62,.62])box(.012,.22,.012,x+d,3.74,z,steel,root,false);const l=new THREE.PointLight(0xd5e6bd,z>3?32:22,10,2);l.position.set(x,3.24,z);l.userData.base=l.intensity;normalLights.push(l);root.add(l);}
  const key=new THREE.SpotLight(0xdfe7c6,95,19,1.15,.65,1.6);key.position.set(-1.5,3.6,4.5);key.target.position.set(0,0,-2);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.bias=-.00035;key.shadow.normalBias=.025;key.shadow.camera.near=.2;key.shadow.camera.far=22;root.add(key,key.target);normalLights.push(key);key.userData.base=95;
  const blue=new THREE.PointLight(0x6dabb6,9,10,2);blue.position.set(5.8,2.2,2);root.add(blue);
  // Back office clutter and readable store ephemera.
  sign('WILLOW CREEK',4.2,.65,-2,2.85,6.84,{rot:Math.PI,bg:'#29483c',fg:'#e1c58a',size:80});
  sign('COFFEE\n50¢ ALL NIGHT',1.25,1.2,5.8,2,-8.84,{bg:'#b88c4c',fg:'#272f24',size:60});
  sign('MISSING\nHAVE YOU SEEN HIM?',1.05,1.25,-4.75,2,-8.84,{bg:'#c3b99b',fg:'#3d4336',size:43});
  sign('RULE 01\nNO REFLECTION?\nKEEP THE CHANGE.',1.5,.83,-5.9,1.9,6.84,{rot:Math.PI,bg:'#d0c29c',fg:'#423d2b',size:39});
  box(1.4,.93,.6,5.9,.47,6.3,painted);obstacle(5.9,6.3,1.4,.6);box(.65,.65,.4,5.8,1.26,6.3,dark);cylinder(.18,.28,5.8,1.24,6.02,mat(0x423322,.2));
  const clockFace=texture(256,256,(c,W,H)=>{c.fillStyle='#e1d9bb';c.beginPath();c.arc(128,128,122,0,Math.PI*2);c.fill();c.strokeStyle='#243a30';c.lineWidth=9;c.stroke();c.fillStyle='#334536';c.font='bold 24px Georgia';c.textAlign='center';c.textBaseline='middle';for(let i=1;i<=12;i++){const a=i*Math.PI/6;c.fillText(i,128+94*Math.sin(a),128-94*Math.cos(a));}c.lineWidth=8;c.beginPath();c.moveTo(128,128);c.lineTo(185,143);c.moveTo(128,128);c.lineTo(128,54);c.stroke();});const clock=new THREE.Mesh(new THREE.CircleGeometry(.4,32),new THREE.MeshStandardMaterial({map:clockFace}));clock.position.set(-3.8,3,-8.84);root.add(clock);
  for(let i=0;i<3;i++)box(.7,.6,.65,-5.3+i*.28,.3+i*.59,5.7,mat(0x8c7654));
  // The emergency telephone is reached entirely from the safe side of the counter.
  box(1.12,.08,.65,-2.8,1.05,6.32,mat(0x77583f));for(const x of [-3.24,-2.36])box(.08,1.02,.08,x,.51,6.32,painted);obstacle(-2.8,6.32,1.1,.65);
  const phone=new THREE.Group();phone.name='emergency telephone';phone.position.set(-2.8,1.11,6.26);phone.rotation.y=Math.PI;root.add(phone);
  const phoneRed=mat(0xa72f23,.32,.12),receiverRed=mat(0x72231e,.3,.1);
  const phoneBase=box(.63,.19,.46,0,.1,0,phoneRed,phone);box(.53,.1,.31,0,.22,-.04,phoneRed,phone);
  box(.67,.095,.13,0,.38,-.09,receiverRed,phone);for(const x of [-.27,.27]){const ear=cylinder(.12,.13,x,.32,-.09,receiverRed,phone);ear.scale.z=1.1;box(.045,.1,.08,x,.25,-.09,steel,phone,false);}
  const dial=cylinder(.125,.025,0,.263,.085,mat(0xc1b68c,.4,.45),phone);for(let i=0;i<10;i++){const a=i*Math.PI/5;const hole=cylinder(.019,.027,Math.sin(a)*.09,.279,.085+Math.cos(a)*.09,black,phone);hole.castShadow=false;}
  const cordPoints=[];for(let i=0;i<150;i++){const t=i/149;cordPoints.push(new THREE.Vector3(-.36-Math.sin(t*Math.PI)*.09+Math.sin(t*Math.PI*30)*.018,.28-t*.72,-.08+Math.cos(t*Math.PI*30)*.018));}const cord=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cordPoints),150,.008,5,false),black);phone.add(cord);
  sign('EMERGENCY PHONE\nPOLICE  /  [E]',1.5,.5,-2.8,1.87,6.57,{rot:Math.PI,bg:'#b5b59a',fg:'#673a2e',size:56});
  const dustGeo=new THREE.BufferGeometry(),dustPositions=[];for(let i=0;i<100;i++)dustPositions.push((rnd()-.5)*13,rnd()*3.5,-8+rnd()*14);dustGeo.setAttribute('position',new THREE.Float32BufferAttribute(dustPositions,3));root.add(new THREE.Points(dustGeo,new THREE.PointsMaterial({color:0xcdd7c1,size:.012,transparent:true,opacity:.23,depthWrite:false})));
  let freezerOpen=false,shutterClosed=false,emergency=false,policeActive=false;
  const targets={register:new THREE.Vector3(.2,1.3,4.1),freezer:new THREE.Vector3(0,1.5,-7.1),camera:new THREE.Vector3(-1.7,1.5,4.2),shutter:new THREE.Vector3(1.85,1.35,4.2),floodlight:new THREE.Vector3(2.8,1.48,5),customer:new THREE.Vector3(0,1.2,1.9),chips:new THREE.Vector3(-1.45,1.45,-3.5),phone:new THREE.Vector3(-2.8,1.4,5.7)};
  return {root,colliders,freezerDoor,shutter,floodLights,normalLights,mirror:{mesh:mirrorMesh,position:mirrorMesh.position.clone()},monitor,cameraPosition:new THREE.Vector3(-6,3.3,5),targets,
    setEmergency(value){emergency=!!value;floodLights.forEach(l=>l.intensity=emergency?180:0);fluorescents.filter(f=>f.flood).forEach(f=>f.mesh.material.emissiveIntensity=emergency?5:.1);},
    setChipsTaken(value){chipsGroup.visible=!value;},
    setPolice(value){policeActive=!!value;policeCar.visible=policeActive;if(!policeActive){policeRedLight.intensity=0;policeBlueLight.intensity=0;policeRedMat.emissiveIntensity=0;policeBlueMat.emissiveIntensity=0;}},
    setShutter(value){shutterClosed=!!value;},setFreezer(value){freezerOpen=!!value;},
    update(time,delta){const a=1-Math.exp(-Math.max(0,delta)*5);freezerDoor.rotation.y=THREE.MathUtils.lerp(freezerDoor.rotation.y,freezerOpen?-1.72:0,a);shutter.scale.y=THREE.MathUtils.lerp(shutter.scale.y,shutterClosed?1:.015,a*1.2);rainTex.offset.y=(time*.018)%1;const flicker=Math.sin(time*17.3)*Math.sin(time*39.7)>.94?.68:1;normalLights[0].intensity=normalLights[0].userData.base*flicker;if(policeActive){const pulse=(Math.sin(time*3.4)+1)*.5;policeRedLight.intensity=12+38*pulse;policeBlueLight.intensity=12+38*(1-pulse);policeRedMat.emissiveIntensity=1+5*pulse;policeBlueMat.emissiveIntensity=1+5*(1-pulse);}}
  };
}
