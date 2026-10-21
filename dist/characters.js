import * as THREE from './vendor/three.module.js';

// Hand-built, articulated characters. All faces point along local +Z.
const palettes = {
  customer: {skin:0xb88467, coat:0x815039, cloth:0x454a47, trousers:0x26343a, hair:0x271f1b},
  first: {skin:0xb88467, coat:0x815039, cloth:0x454a47, trousers:0x26343a, hair:0x271f1b},
  trapped: {skin:0xd3b29b, coat:0x315561, cloth:0x8d9395, trousers:0x303a49, hair:0x4b2b1d},
  grinner: {skin:0xb5b2a3, coat:0x303735, cloth:0x888377, trousers:0x232a2a, hair:0x171b19},
  second: {skin:0x93654f, coat:0xb89145, cloth:0x657775, trousers:0x323231, hair:0x211b1b},
  shadow: {skin:0xb89d8d, coat:0x727169, cloth:0xb3b3a2, trousers:0x333b3b, hair:0x504b44},
  officer: {skin:0xb79b82, coat:0x23364c, cloth:0x334559, trousers:0x1b2c3e, hair:0x3b322b},
  officer2: {skin:0x78533f, coat:0x263b51, cloth:0x3b4e60, trousers:0x1b2c3e, hair:0x211e1b}
};
const black = new THREE.MeshStandardMaterial({color:0x131515,roughness:0.83});
const sole = new THREE.MeshStandardMaterial({color:0x252826,roughness:0.98});
const ivory = new THREE.MeshStandardMaterial({color:0xe0dbc5,roughness:0.6});
function mat(color, roughness=0.88) { return new THREE.MeshStandardMaterial({color,roughness,flatShading:true}); }
function mesh(g,m,p,parent) {
  const o = new THREE.Mesh(g,m); if(p)o.position.set(...p);
  o.castShadow=true; o.receiveShadow=true; if(parent)parent.add(o); return o;
}
function box(w,h,d,m,p,parent,bevel=0.008) {
  const b=Math.min(bevel,w/5,h/5,d/5), s = new THREE.Shape();
  s.moveTo(-w/2+b,-h/2);s.lineTo(w/2-b,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+b);
  s.lineTo(w/2,h/2-b);s.quadraticCurveTo(w/2,h/2,w/2-b,h/2);s.lineTo(-w/2+b,h/2);
  s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-b);s.lineTo(-w/2,-h/2+b);s.quadraticCurveTo(-w/2,-h/2,-w/2+b,-h/2);
  const g = new THREE.ExtrudeGeometry(s,{depth:Math.max(0.001,d-2*b),bevelEnabled:true,bevelSize:b,bevelThickness:b,bevelSegments:1,steps:1,curveSegments:2});
  g.translate(0,0,-d/2+b);return mesh(g,m,p,parent);
}
function oval(rx,ry,rz,m,p,parent,detail=1) { const o=mesh(new THREE.IcosahedronGeometry(1,detail),m,p,parent);o.scale.set(rx,ry,rz);return o; }
function tapered(top,bottom,h,d,m,p,parent) {
  const g=new THREE.CylinderGeometry(1,1,h,8,1,false); const a=g.attributes.position;
  for(let i=0;i<a.count;i++){const t=(a.getY(i)/h+.5);a.setX(i,a.getX(i)*(bottom+(top-bottom)*t)/2);a.setZ(i,a.getZ(i)*d/2);}
  g.computeVertexNormals();return mesh(g,m,p,parent);
}
function bar(from,to,width,m,parent) {
  const a=new THREE.Vector3(...from),b=new THREE.Vector3(...to),v=b.clone().sub(a);
  const o=mesh(new THREE.CylinderGeometry(width*.78,width,v.length(),6),m,null,parent);
  o.position.copy(a.add(b).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize()); return o;
}
function ribbon(points,radius,m,parent) {
  return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),18,radius,5,false),m,null,parent);
}

export function createCharacter(kind='customer',options={}) {
  if(kind==='visionary')return createVisionary(options);
  const p={...(palettes[kind]||palettes.customer),...(options.palette||{})};
  const group=new THREE.Group();group.name='character-'+kind;
  const body=new THREE.Group();group.add(body);
  const skin=mat(p.skin),coat=mat(p.coat),cloth=mat(p.cloth),pants=mat(p.trousers),hair=mat(p.hair);
  const skinDark=mat(new THREE.Color(p.skin).multiplyScalar(.68));
  const seam=mat(new THREE.Color(p.coat).multiplyScalar(.64));
  const highlight=mat(new THREE.Color(p.coat).multiplyScalar(1.17));
  const grinner=kind==='grinner',female=kind==='second',officer=kind==='officer'||kind==='officer2';
  const torso=new THREE.Group();torso.position.y=1.15;body.add(torso);
  tapered(.40,.34,.50,.25,coat,[0,.045,0],torso);
  tapered(.35,.33,.15,.245,pants,[0,.93,0],body);
  box(.35,.038,.258,seam,[0,-.19,0],torso);
  box(.052,.048,.018,mat(0x939381,.38),[0,-.198,.142],torso);
  // Underlayer, zipper, angular collar and stitched pockets.
  box(.119,.33,.025,cloth,[0,.094,.132],torso);
  box(.007,.42,.012,mat(0xb9ac8a,.5),[0,.026,.154],torso,.002);
  for(const s of [-1,1]){
    const collar=box(.085,.12,.036,highlight,[s*.078,.224,.14],torso);collar.rotation.z=s*.35;
    box(.105,.115,.018,seam,[s*.112,.025,.137],torso);
    box(.098,.023,.023,highlight,[s*.112,.079,.151],torso,.003);
    box(.011,.011,.012,mat(0xc4af82,.4),[s*.112,.069,.169],torso,.002);
    box(.006,.25,.004,highlight,[s*.175,-.027,.1],torso,.001);
  }
  if(kind==='first'||kind==='customer') {
    box(.095,.039,.01,mat(0xceb784),[-.114,.165,.159],torso,.002);
    box(.066,.005,.009,black,[-.114,.169,.167],torso,.001);
    box(.041,.005,.009,black,[-.125,.159,.167],torso,.001);
  }
  if(kind==='shadow'||grinner){
    const tie=box(.031,.24,.013,mat(grinner?0x342e28:0x59433e),[0,.075,.159],torso,.002);tie.rotation.z=.02;
    box(.043,.035,.02,mat(0x5b4c40),[0,.208,.16],torso,.003);
  }
  if(kind==='trapped') {
    oval(.17,.17,.13,cloth,[0,1.43,-.05],body);
    for(const s of [-1,1])bar([s*.066,1.41,.16],[s*.073,1.21,.167],.006,ivory,body);
    for(let i=0;i<5;i++)box(.016,.04,.006,mat(0x8ba8aa),[-.15+i*.071,1.07+(i%2)*.04,.142],body,.002);
  }
  const arms=[],elbows=[],legs=[],knees=[];
  for(const s of [-1,1]){
    const arm=new THREE.Group();arm.position.set(s*.255,1.39,0);body.add(arm);arms.push(arm);
    oval(.112,.135,.12,coat,[0,-.04,0],arm);
    tapered(.178,.139,.285,.17,coat,[0,-.172,0],arm);
    const elbow=new THREE.Group();elbow.position.y=-.312;arm.add(elbow);elbows.push(elbow);
    tapered(.143,.112,grinner?.31:.245,.14,coat,[0,grinner?-.14:-.11,0],elbow);
    box(.125,.042,.143,seam,[0,grinner?-.286:-.233,0],elbow);
    const handY=grinner?-.36:-.308;
    box(.085,.13,.073,skin,[0,handY,.006],elbow,.016);
    oval(.028,.049,.028,skin,[-s*.052,handY+.016,.024],elbow);
    for(let i=0;i<3;i++)box(.006,.043,.006,skinDark,[-.022+i*.022,handY-.022,.045],elbow,.001);
    arm.rotation.z=s*.07;
    const leg=new THREE.Group();leg.position.set(s*.105,.87,0);body.add(leg);legs.push(leg);
    tapered(.174,.14,.37,.19,pants,[0,-.17,0],leg);
    const knee=new THREE.Group();knee.position.y=-.35;leg.add(knee);knees.push(knee);
    tapered(.14,.12,.365,.155,pants,[0,-.17,0],knee);
    box(.13,.045,.165,seam,[0,-.337,.005],knee);
    // Shoes rest exactly on the floor at neutral pose.
    box(.155,.03,.29,sole,[0,-.855,.057],leg,.007);
    box(.15,.105,.275,black,[0,-.793,.057],leg,.022);
    for(let i=0;i<3;i++)box(.08,.006,.009,mat(0x77746a),[0,-.747,.073+i*.027],leg,.001);
  }
  oval(.066,.102,.067,skin,[0,1.485,0],body);
  const head=new THREE.Group();head.position.set(0,1.60,.014);body.add(head);
  oval(.139,.188,.128,skin,[0,.015,0],head,2);
  oval(.11,.079,.105,skin,[0,-.098,.025],head,1);
  for(const s of [-1,1]){
    oval(.029,.053,.029,skin,[s*.142,.002,0],head);
    oval(.012,.028,.014,skinDark,[s*.163,.003,.006],head);
    oval(.045,.039,.017,skinDark,[s*.058,.038,.111],head);
    oval(.032,.016,.009,ivory,[s*.056,.038,.128],head);
    oval(.012,.014,.007,black,[s*.054,.038,.137],head);
    box(.058,.012,.015,hair,[s*.059,.076,.117],head,.002).rotation.z=s*.09;
    ribbon([[s*.031,.011,.126],[s*.058,.008,.13],[s*.081,.015,.119]],.0035,skinDark,head);
  }
  oval(.023,.043,.039,skin,[0,-.008,.127],head);
  oval(.028,.017,.027,skin,[0,-.032,.153],head);
  const normalMouth=new THREE.Group();head.add(normalMouth);
  ribbon([[-.041,-.073,.123],[0,-.078,.135],[.041,-.073,.123]],.006,skinDark,normalMouth);
  oval(.039,.012,.013,skin,[0,-.092,.117],normalMouth);
  oval(.143,.103,.132,hair,[0,.139,-.008],head);
  box(.054,.116,.09,hair,[-.116,.073,-.035],head,.012);
  box(.043,.101,.09,hair,[.119,.079,-.037],head,.012);
  for(let i=0;i<6;i++){
    const lock=box(.051,.065+((i%3)*.012),.055,hair,[-.117+i*.046,.139+(i%2)*.014,.081],head,.01);
    lock.rotation.z=-.28+i*.055;
  }
  if(kind==='first'||kind==='customer'){
    const cap=mat(0x3f5147);oval(.15,.09,.142,cap,[0,.184,-.012],head);
    const visor=box(.245,.02,.14,cap,[0,.15,.146],head,.016);visor.rotation.x=-.09;
    box(.058,.039,.012,mat(0xb2ac81),[0,.21,.119],head,.002);
    for(const s of [-1,1])box(.045,.038,.014,hair,[s*.059,-.051,.116],head,.006);
  }
  if(female){
    oval(.079,.11,.088,hair,[0,.084,-.162],head);
    oval(.058,.16,.06,hair,[0,-.056,-.182],head);
    for(const s of [-1,1])oval(.012,.022,.007,mat(0xc3a76a,.3),[s*.149,-.035,.02],head);
    box(.30,.075,.28,cloth,[0,1.43,.016],body,.015);
    const scarf=box(.085,.26,.035,cloth,[-.087,1.28,.177],body,.01);scarf.rotation.z=-.14;
  }
  if(officer){
    const navy=mat(0x20354b), leather=mat(0x141c25,.53),gold=mat(0xd2b36b,.32);
    const badge=(parent,x,y,z,size)=>{
      const shape=new THREE.Shape();shape.moveTo(-.45,.5);shape.lineTo(.45,.5);shape.lineTo(.5,-.04);
      shape.quadraticCurveTo(.38,-.4,0,-.65);shape.quadraticCurveTo(-.38,-.4,-.5,-.04);shape.closePath();
      const shield=mesh(new THREE.ExtrudeGeometry(shape,{depth:.055,bevelEnabled:false}),gold,[x,y,z],parent);shield.scale.setScalar(size);
      oval(size*.18,size*.2,size*.045,navy,[x,y-.03*size,z+.072*size],parent,1);
      return shield;
    };
    // Peaked cap, shield badge, epaulettes and duty equipment distinguish police at distance.
    const cap=mesh(new THREE.CylinderGeometry(.158,.151,.092,12),navy,[0,.214,-.013],head);
    cap.scale.z=.91;
    box(.272,.035,.25,leather,[0,.166,-.004],head,.014);
    const visor=box(.252,.022,.161,leather,[0,.151,.145],head,.02);visor.rotation.x=-.13;
    badge(head,0,.21,.137,.055);
    badge(torso,-.11,.139,.163,.072);
    box(.084,.025,.018,gold,[.112,.133,.163],torso,.002);
    box(.064,.005,.004,navy,[.112,.133,.174],torso,.001);
    box(.38,.072,.272,leather,[0,.963,0],body,.007);
    box(.066,.046,.024,gold,[0,.963,.151],body,.004);
    for(const s of [-1,1]){
      box(.12,.027,.2,navy,[s*.218,1.465,.003],body,.004);
      box(.047,.014,.055,gold,[s*.229,1.484,.025],body,.002);
      box(.083,.113,.055,leather,[s*.145,.943,.153],body,.007);
      box(.025,.106,.09,navy,[s*.09,-.13,.047],arms[s===-1?0:1],.005);
      box(.027,.015,.052,gold,[s*.101,-.13,.061],arms[s===-1?0:1],.002);
    }
    box(.069,.102,.05,leather,[-.15,1.39,.153],body,.005);
    bar([-.17,1.43,.161],[-.17,1.52,.161],.006,black,body);
    for(let i=0;i<3;i++)box(.042,.006,.005,mat(0x65727c),[-.15,1.38+i*.013,.182],body,.001);
    const pouch=box(.085,.151,.1,leather,[.244,.926,.002],body,.01);pouch.rotation.z=-.08;
    if(typeof document!=='undefined'){
      const canvas=document.createElement('canvas');canvas.width=256;canvas.height=64;
      const ctx=canvas.getContext('2d');ctx.fillStyle='#d8dfdf';ctx.font='bold 49px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('POLICE',128,34);
      const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
      const lettering=new THREE.MeshStandardMaterial({map:texture,transparent:true,depthWrite:false,roughness:.85});
      const back=mesh(new THREE.PlaneGeometry(.275,.069),lettering,[0,1.342,-.132],body);back.rotation.y=Math.PI;
      mesh(new THREE.PlaneGeometry(.09,.023),lettering,[.112,1.247,.166],body);
    }
    if(kind==='officer2'){
      for(const s of [-1,1])box(.045,.025,.016,hair,[s*.028,-.053,.143],head,.006);
      group.scale.set(1.035,1.03,1.035);
    }
  }
  // The alternate face is geometry, so the CCTV reveal reads at any resolution.
  const monsterFace=new THREE.Group();head.add(monsterFace);monsterFace.visible=false;
  const voidMat=new THREE.MeshBasicMaterial({color:0x030504});
  const toothMat=new THREE.MeshStandardMaterial({color:0xf0eccd,emissive:0x8a8060,emissiveIntensity:.45,roughness:.6});
  const eyeGlow=new THREE.MeshBasicMaterial({color:0xece7af});
  const smile=new THREE.Shape();
  smile.moveTo(-.144,-.018);smile.quadraticCurveTo(0,-.068,.144,-.018);
  smile.quadraticCurveTo(.112,-.153,0,-.158);smile.quadraticCurveTo(-.112,-.153,-.144,-.018);
  mesh(new THREE.ShapeGeometry(smile,18),voidMat,[0,0,.153],monsterFace);
  for(let i=0;i<13;i++){
    const x=-.125+i*.0208,curve=Math.pow(x/.13,2);
    const top=-.058+.034*curve,bottom=-.137+.055*curve;
    const t=box(.0165,.045-.018*curve,.013,toothMat,[x,top-.014,.161],monsterFace,.002);t.rotation.z=-x*1.8;
    const b=box(.015,.035-.012*curve,.013,toothMat,[x,bottom+.01,.164],monsterFace,.002);b.rotation.z=x*1.4;
  }
  for(const s of [-1,1]){
    oval(.048,.035,.014,voidMat,[s*.059,.04,.143],monsterFace);
    oval(.013,.023,.01,eyeGlow,[s*.061,.045,.158],monsterFace);
    ribbon([[s*.141,-.025,.15],[s*.151,.005,.12],[s*.13,.029,.116]],.006,skinDark,monsterFace);
  }
  if(grinner){group.scale.set(.98,1.09,.98);head.rotation.z=.06;}
  else if(female)group.scale.set(.96,.97,.96);
  if(options.scale!==undefined)group.scale.multiplyScalar(options.scale);
  if(options.position)group.position.set(...options.position);
  let walking=false,grinning=false,walkBlend=0,elapsed=0;
  const phase={first:.3,trapped:1.8,grinner:.1,second:2.5,shadow:3.9}[kind]||0;
  const api={
    group,head,body,arms,legs,
    setGrinning(value){grinning=!!value&&!officer;monsterFace.visible=grinning;normalMouth.visible=!grinning;},
    setWalking(value){walking=!!value;},
    setVisible(value){group.visible=!!value;},
    update(dt,time){
      elapsed+=Number.isFinite(dt)?dt:0.016;const t=Number.isFinite(time)?time:elapsed;
      walkBlend=THREE.MathUtils.damp(walkBlend,walking?1:0,9,Math.min(dt||.016,.1));
      const speed=kind==='trapped'?11:7.2,step=Math.sin(t*speed+phase),other=Math.sin(t*speed+phase+Math.PI);
      body.position.y=Math.abs(Math.cos(t*speed+phase))*.023*walkBlend+Math.sin(t*1.7+phase)*.004;
      torso.rotation.z=step*.025*walkBlend;
      head.rotation.y=Math.sin(t*.47+phase)*.035*(1-walkBlend);
      head.rotation.z=(grinner?.065:0)+Math.sin(t*.8+phase)*.012;
      head.rotation.x=(grinning?-.08:0)+Math.sin(t*1.2+phase)*.013;
      legs[0].rotation.x=step*.48*walkBlend;legs[1].rotation.x=other*.48*walkBlend;
      knees[0].rotation.x=Math.max(0,-step)*.49*walkBlend;knees[1].rotation.x=Math.max(0,-other)*.49*walkBlend;
      arms[0].rotation.x=other*.35*walkBlend+Math.sin(t*1.3+phase)*.018;
      arms[1].rotation.x=step*.35*walkBlend-Math.sin(t*1.3+phase)*.018;
      elbows[0].rotation.x=-.08-Math.abs(step)*.18*walkBlend;
      elbows[1].rotation.x=-.08-Math.abs(other)*.18*walkBlend;
      if(kind==='trapped'&&!walking){arms[0].rotation.x=-.35;arms[1].rotation.x=-.4;body.position.x=Math.sin(t*29)*.003;}
      if(grinning){head.rotation.z+=Math.sin(t*7)*.013;}
    }
  };
  group.userData.character=api;
  return api;
}

// An inhuman silhouette with 47 eyes; instancing keeps the eyes inexpensive.
function createVisionary(options={}) {
  const group=new THREE.Group();group.name='character-visionary';
  const body=new THREE.Group();group.add(body);
  const dark=new THREE.MeshStandardMaterial({color:0x10191e,emissive:0x030708,emissiveIntensity:.3,roughness:.53,metalness:.15,flatShading:true});
  const ridge=mat(0x1d2d31,.68),feetMat=mat(0x091012,.8);
  const torso=new THREE.Group();torso.position.set(0,1.58,0);body.add(torso);
  tapered(.47,.25,.77,.29,dark,[0,0,0],torso);
  oval(.255,.13,.153,dark,[0,.31,0],torso);
  oval(.075,.18,.076,dark,[0,1.99,0],body);
  const head=new THREE.Group();head.position.set(0,2.17,.01);body.add(head);
  oval(.143,.286,.135,dark,[0,.018,0],head,2);
  oval(.117,.12,.12,dark,[0,-.175,.013],head);
  for(const s of [-1,1]){
    ribbon([[s*.15,1.24,.1],[s*.22,1.55,.13],[s*.18,1.86,.1]],.013,ridge,body);
    ribbon([[s*.08,-.2,.105],[s*.13,.018,.1],[s*.07,.245,.069]],.009,ridge,head);
  }
  const arms=[],elbows=[],legs=[],knees=[],banks=[];
  const eyeGeometry=new THREE.IcosahedronGeometry(1,2);
  const rimMat=new THREE.MeshStandardMaterial({color:0x273b3e,roughness:.53});
  const whiteMat=new THREE.MeshStandardMaterial({color:0xe6e0b9,emissive:0xb3aa79,emissiveIntensity:.65,roughness:.34});
  const pupilMat=new THREE.MeshBasicMaterial({color:0x051116});
  const irisMat=new THREE.MeshStandardMaterial({color:0x6b927d,emissive:0x345e54,emissiveIntensity:.35,roughness:.35});
  const stamp=new THREE.Object3D(),base=new THREE.Object3D(),offset=new THREE.Vector3();
  const eyeBank=(parent,specs)=>{
    const rims=new THREE.InstancedMesh(eyeGeometry,rimMat,specs.length);
    const whites=new THREE.InstancedMesh(eyeGeometry,whiteMat,specs.length);
    const irises=new THREE.InstancedMesh(eyeGeometry,irisMat,specs.length);
    const pupils=new THREE.InstancedMesh(eyeGeometry,pupilMat,specs.length);
    for(const part of [rims,whites,irises,pupils]){part.frustumCulled=false;parent.add(part);}
    const records=specs.map(([x,y,z,r=.05,yaw=0,roll=0],i)=>{
      base.position.set(x,y,z);base.rotation.set(0,yaw,roll);base.scale.set(1,1,1);base.updateMatrix();
      const orientation=base.quaternion.clone(),center=base.position.clone();
      stamp.position.copy(center);stamp.quaternion.copy(orientation);stamp.scale.set(r*1.27,r*.87,r*.58);stamp.updateMatrix();rims.setMatrixAt(i,stamp.matrix);
      stamp.position.copy(center).add(offset.set(0,0,r*.19).applyQuaternion(orientation));stamp.scale.set(r,r*.66,r*.48);stamp.updateMatrix();whites.setMatrixAt(i,stamp.matrix);
      return {r,center,orientation,phase:i*2.399+banks.length*1.7};
    });
    irises.instanceMatrix.setUsage(THREE.DynamicDrawUsage);pupils.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    banks.push({irises,pupils,records});
  };
  eyeBank(head,[
    [0,.207,.083,.043],[-.066,.137,.113,.04,-.3,-.17],[.063,.127,.119,.043,.3,.13],
    [0,.044,.139,.061],[-.075,-.029,.111,.042,-.38,-.2],[.073,-.034,.119,.04,.35,.19],
    [0,-.116,.121,.042],[-.054,-.183,.089,.03,-.3,.2],[.055,-.179,.092,.03,.3,-.22],
    [-.127,.064,.024,.039,-1.28],[.128,.045,.021,.043,1.28],[0,.09,-.132,.043,Math.PI]
  ]);
  eyeBank(torso,[
    [0,.289,.15,.06],[-.116,.208,.134,.044,-.2,.17],[.121,.19,.132,.051,.2,-.19],
    [0,.105,.149,.046],[-.117,.017,.137,.05,-.2,-.14],[.111,-.023,.136,.043,.2,.24],
    [0,-.103,.149,.059],[-.077,-.213,.121,.039,-.2],[.076,-.226,.121,.035,.2],
    [0,-.314,.126,.039],[-.204,.181,.031,.045,-1.25],[.207,.143,.028,.044,1.25],
    [-.081,.138,-.137,.046,Math.PI],[.087,-.073,-.14,.043,Math.PI],[0,-.227,-.133,.039,Math.PI]
  ]);
  for(const s of [-1,1]){
    const arm=new THREE.Group();arm.position.set(s*.285,1.88,0);body.add(arm);arms.push(arm);
    oval(.105,.14,.11,dark,[0,-.035,0],arm);
    tapered(.15,.09,.43,.13,dark,[s*.017,-.25,.005],arm);
    const elbow=new THREE.Group();elbow.position.set(s*.035,-.45,.005);arm.add(elbow);elbows.push(elbow);
    oval(.061,.07,.059,ridge,[0,0,0],elbow);
    tapered(.098,.064,.48,.10,dark,[0,-.254,.014],elbow);
    oval(.068,.118,.045,dark,[0,-.548,.026],elbow);
    for(let f=0;f<4;f++){
      const x=(f-1.5)*.029;
      ribbon([[x,-.603,.025],[x*1.35,-.71-(1-Math.abs(f-1.5)/2)*.046,.045],[x*1.5,-.76-(1-Math.abs(f-1.5)/2)*.038,.084]],.012,dark,elbow);
    }
    ribbon([[-s*.045,-.531,.028],[-s*.091,-.59,.04],[-s*.107,-.642,.082]],.015,dark,elbow);
    eyeBank(arm,[[0,-.065,.098,.049],[s*.019,-.219,.071,.041],[s*.025,-.356,.065,.035]]);
    eyeBank(elbow,[[0,-.112,.064,.04],[0,-.272,.066,.035],[0,-.438,.065,.032],[0,-.557,.066,.032]]);
    const leg=new THREE.Group();leg.position.set(s*.105,1.18,0);body.add(leg);legs.push(leg);
    tapered(.16,.105,.52,.16,dark,[0,-.25,-.012],leg);
    const knee=new THREE.Group();knee.position.set(0,-.52,-.005);leg.add(knee);knees.push(knee);
    tapered(.105,.069,.53,.106,dark,[0,-.25,0],knee);
    box(.105,.099,.225,feetMat,[0,-.605,.052],knee,.018);
    eyeBank(leg,[[0,-.135,.083,.035],[0,-.341,.076,.033],[s*.025,-.457,.07,.031]]);
  }
  // Torn, narrow strips preserve a recognizable standing/walking silhouette.
  for(let i=0;i<5;i++){
    const x=(i-2)*.062,strip=new THREE.Shape();strip.moveTo(x-.037,1.26);strip.lineTo(x+.037,1.26);
    strip.lineTo(x+.025,.73+(i%2)*.16);strip.lineTo(x-.016,.88-(i%3)*.10);strip.closePath();
    mesh(new THREE.ShapeGeometry(strip),new THREE.MeshStandardMaterial({color:0x10191e,roughness:.75,side:THREE.DoubleSide}),[0,0,-.11],body);
  }
  if(options.scale!==undefined)group.scale.multiplyScalar(options.scale);
  if(options.position)group.position.set(...options.position);
  let walking=false,walkBlend=0,elapsed=0,intense=false;
  const api={group,head,body,arms,legs,
    setVisible(value){group.visible=!!value;},setWalking(value){walking=!!value;},setGrinning(value){intense=!!value;},
    update(dt,time){
      const delta=Number.isFinite(dt)?Math.max(0,Math.min(dt,.1)):.016;elapsed+=delta;const t=Number.isFinite(time)?time:elapsed;
      walkBlend=THREE.MathUtils.damp(walkBlend,walking?1:0,6,delta);const gait=Math.sin(t*4.9);
      body.position.y=Math.abs(Math.cos(t*4.9))*.021*walkBlend;
      body.rotation.z=Math.sin(t*.72)*.018;head.rotation.z=-.08+Math.sin(t*.87)*.037;
      head.rotation.y=Math.sin(t*.43)*.055;head.rotation.x=-.07+Math.sin(t*.65)*.025;
      torso.rotation.y=Math.sin(t*.67)*.026;
      for(let i=0;i<2;i++){
        const s=i===0?-1:1,wave=gait*s;
        legs[i].rotation.x=wave*.28*walkBlend;knees[i].rotation.x=Math.max(0,-wave)*.29*walkBlend;
        arms[i].rotation.x=-wave*.19*walkBlend+Math.sin(t*.9+i)*.027;
        arms[i].rotation.z=s*(.07+Math.sin(t*1.13+i)*.025);elbows[i].rotation.x=-.055+Math.sin(t*.7+i)*.035;
      }
      whiteMat.emissiveIntensity=(intense?.95:.65)+Math.sin(t*.85)*.035;
      for(const bank of banks){
        bank.records.forEach(({r,center,orientation,phase},i)=>{
          const px=Math.sin(t*.53+phase)*r*.22,py=Math.cos(t*.41+phase)*r*.11;
          stamp.quaternion.copy(orientation);stamp.position.copy(center).add(offset.set(px,py,r*.65).applyQuaternion(orientation));
          stamp.scale.set(r*.39,r*.40,r*.065);stamp.updateMatrix();bank.irises.setMatrixAt(i,stamp.matrix);
          stamp.position.copy(center).add(offset.set(px,py,r*.706).applyQuaternion(orientation));
          stamp.scale.set(r*(intense?.11:.17),r*.27,r*.035);stamp.updateMatrix();bank.pupils.setMatrixAt(i,stamp.matrix);
        });
        bank.irises.instanceMatrix.needsUpdate=true;bank.pupils.instanceMatrix.needsUpdate=true;
      }
    }
  };
  group.userData.character=api;api.update(0,0);return api;
}

export function createShadow() {
  const group=new THREE.Group();group.name='stray-shadow';
  const ink=new THREE.MeshBasicMaterial({color:0x020506,transparent:true,opacity:.96,depthWrite:false});
  const edge=new THREE.MeshBasicMaterial({color:0x061012,transparent:true,opacity:.28,depthWrite:false});
  const core=new THREE.Group();group.add(core);
  const disc=(x,z,rx,rz,m=ink,parent=core)=>{
    const o=mesh(new THREE.CircleGeometry(1,24),m,[x,.022,z],parent);o.rotation.x=-Math.PI/2;o.scale.set(rx,rz,1);o.castShadow=false;o.receiveShadow=false;return o;
  };
  disc(0,-.35,.39,.72);disc(0,.31,.24,.32);disc(0,.45,.18,.22);
  disc(0,-.2,.49,.97,edge);
  // Long articulated flat arms and splayed fingers lead the crawl toward +Z.
  const limbs=[];
  for(const s of [-1,1]){
    const arm=new THREE.Group();arm.position.set(s*.22,0,-.04);core.add(arm);limbs.push(arm);
    const upper=disc(s*.24,.2,.115,.43,ink,arm);upper.rotation.z=s*.82;
    const fore=disc(s*.43,.66,.085,.43,ink,arm);fore.rotation.z=-s*.16;
    disc(s*.48,1,.16,.19,ink,arm);
    for(let f=0;f<5;f++){
      const finger=disc(s*(.34+f*.067),1.17+(2-Math.abs(2-f))*.054,.026,.21-(Math.abs(2-f))*.025,ink,arm);
      finger.rotation.z=s*(f-2)*.13;
    }
    const leg=disc(s*.22,-1.03,.14,.57);leg.rotation.z=s*.31;
    const foot=disc(s*.34,-1.47,.12,.33);foot.rotation.z=s*.25;
  }
  const eyeMat=new THREE.MeshBasicMaterial({color:0xb6d9c5,transparent:true,opacity:.72,depthWrite:false});
  for(const s of [-1,1])disc(s*.073,.49,.025,.047,eyeMat);
  let progress=0,elapsed=0;
  return {group, setProgress(value){progress=THREE.MathUtils.clamp(value,0,1);},update(dt,time){
    elapsed+=dt||.016;const t=Number.isFinite(time)?time:elapsed;
    limbs[0].position.z=Math.sin(t*4)*.12;limbs[1].position.z=Math.sin(t*4+Math.PI)*.12;
    limbs[0].rotation.y=Math.sin(t*4)*.11;limbs[1].rotation.y=Math.sin(t*4+Math.PI)*.11;
    core.scale.x=1+Math.sin(t*2.7)*.035;core.scale.z=1+Math.cos(t*4)*.035;
    eyeMat.opacity=.50+progress*.3+Math.sin(t*8)*.07;
  }};
}
