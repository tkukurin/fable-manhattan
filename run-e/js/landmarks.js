// LANDMARKS — bespoke silhouettes, bridges, piers, islands, billboards. One merged mesh + lines/points.
(function(){
const A=window.APP;
A.buildLandmarks=function(THREE,S,scene){
const G=A.geo,r=G.rng(4242);
G.FLAGS=[];G.STEAM=[];G.BB=[];
const P=[],NR=[],CL=[],GE=[],IX=[];let vbase=0,seedC=0.11;
const hx=h=>{const n=parseInt(h.slice(1),16);return[(n>>16&255)/255,(n>>8&255)/255,(n&255)/255];};
const M4=new THREE.Matrix4(),Q=new THREE.Quaternion(),E=new THREE.Euler(),V=new THREE.Vector3(),SCv=new THREE.Vector3(1,1,1);
function addGeo(geo,x,y,z,ry,c,glass,em){
  seedC=(seedC+0.617)%1;
  E.set(0,ry||0,0);Q.setFromEuler(E);V.set(x,y,z);M4.compose(V,Q,SCv);
  const ps=geo.attributes.position,ns=geo.attributes.normal;
  const idx=geo.index?geo.index.array:null;
  const col=typeof c==='string'?hx(c):c;
  for(let i=0;i<ps.count;i++){
    const lx=ps.getX(i),ly=ps.getY(i),lz=ps.getZ(i);
    const nx=ns.getX(i),ny=ns.getY(i),nz=ns.getZ(i);
    let u,v;
    if(Math.abs(ny)>0.7){u=lx;v=lz;}
    else if(Math.abs(nx)>=Math.abs(nz)){u=lz;v=ly;}
    else{u=lx;v=ly;}
    V.set(lx,ly,lz).applyMatrix4(M4);
    P.push(V.x,V.y,V.z);
    V.set(nx,ny,nz).transformDirection(M4);
    NR.push(V.x,V.y,V.z);
    UVp.push(u+seedC*57.0,v);
    CL.push(col[0],col[1],col[2]);GE.push(glass||0,em||0,seedC);
  }
  if(idx)for(let i=0;i<idx.length;i++)IX.push(idx[i]+vbase);
  else for(let i=0;i<ps.count;i++)IX.push(i+vbase);
  vbase+=ps.count;
}
const UVp=[];
function B(x,z,w,h,d,c,o){ // box on terrain
  o=o||{};const y0=o.y!==undefined?o.y:G.terrain(x,z)-1.5;
  const g=new THREE.BoxGeometry(w,h,d);g.translate(0,h/2,0);
  addGeo(g,x,y0,z,o.ry||0,c,o.glass||0.3,o.em||0);
  if(!o.noSh&&h>12)G.SHADOWS.push({x,y:y0,z,sx:w,sy:h,sz:d,rot:o.ry||0});
  return y0+h;
}
function CYL(x,z,r0,r1,h,c,o){
  o=o||{};const y0=o.y!==undefined?o.y:G.terrain(x,z)-1;
  const g=new THREE.CylinderGeometry(Math.max(r1,0.01),Math.max(r0,0.01),h,o.seg||8);g.translate(0,h/2,0);
  addGeo(g,x,y0,z,o.ry||0,c,o.glass||0.3,o.em||0);
  if(!o.noSh&&h>14)G.SHADOWS.push({x,y:y0,z,sx:r0*1.6,sy:h,sz:r0*1.6,rot:0});
  return y0+h;
}
function SPH(x,y,z,rad,c,o){o=o||{};const g=new THREE.SphereGeometry(rad,10,8);addGeo(g,x,y,z,0,c,o.glass||0.2,o.em||0);}
function PRISM(pts,h,x,z,c,o){ // pts: [[x,z]..] CCW local; extrude up
  o=o||{};const y0=o.y!==undefined?o.y:G.terrain(x,z)-1.5;
  const n=pts.length,pos=[],nor=[],ix=[];
  const top=o.taper?pts.map(p=>{const cx=pts.reduce((s,q)=>s+q[0],0)/n,cz=pts.reduce((s,q)=>s+q[1],0)/n;return[cx+(p[0]-cx)*o.taper,cz+(p[1]-cz)*o.taper];}):pts;
  for(let i=0;i<n;i++){
    const a=pts[i],b=pts[(i+1)%n],a2=top[i],b2=top[(i+1)%n];
    let ex=b[0]-a[0],ez=b[1]-a[1];const l=Math.hypot(ex,ez)||1;
    const nx2=ez/l,nz2=-ex/l;
    const base=pos.length/3;
    pos.push(a[0],0,a[1], b[0],0,b[1], b2[0],h,b2[1], a2[0],h,a2[1]);
    for(let k=0;k<4;k++)nor.push(nx2,0,nz2);
    ix.push(base,base+1,base+2, base,base+2,base+3);
  }
  const base=pos.length/3;
  for(let i=0;i<n;i++){pos.push(top[i][0],h,top[i][1]);nor.push(0,1,0);}
  for(let i=1;i<n-1;i++)ix.push(base,base+i,base+i+1);
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));
  g.setIndex(ix);
  addGeo(g,x,y0,z,o.ry||0,c,o.glass||0.3,o.em||0);
  G.SHADOWS.push({x,y:y0,z,sx:30,sy:h,sz:30,rot:0});
  return y0+h;
}
const FLAG=(x,y,z,c)=>G.FLAGS.push({x,y,z,c:c||0});
const STEAMv=(x,z)=>G.STEAM.push({x,y:G.terrain(x,z)+1,z});
// ============ DOWNTOWN ============
{
  let t=B(-620,1120,58,54,58,'#8f8d86',{glass:0.4}); // 1WTC podium
  const g=new THREE.CylinderGeometry(21,29.5,360,4);g.translate(0,180,0);g.rotateY(Math.PI/4);
  addGeo(g,-620,t,1120,0,hx('#9ec4dd'),0.98,0);
  G.SHADOWS.push({x:-620,y:t,z:1120,sx:42,sy:360,sz:42,rot:0});
  CYL(-620,1120,2.4,0.4,124,'#cfd6dd',{y:t+360,noSh:1});
  B(-505,1255,42,300,42,'#7fa8c4',{glass:0.95});   // 3WTC-ish
  B(-540,990,40,270,40,'#8fb4cc',{glass:0.95});    // 4WTC
  B(-610,1408,38,215,44,'#7d97ac',{glass:0.9});    // 7WTC
  B(-668,1060,29,1.2,29,'#0a0d12',{glass:0.05,noSh:1});B(-668,1175,29,1.2,29,'#0a0d12',{glass:0.05,noSh:1}); // memorial pools
  {const oc=new THREE.SphereGeometry(26,12,8);oc.scale(1,0.3,0.55);addGeo(oc,-655,7,1118,0.3,hx('#e8e6e0'),0.1,0);} // Oculus
  B(30,700,46,26,32,'#d8d2c2',{glass:0.2});FLAG(30,32,700,2); // NYSE
  for(let i=0;i<6;i++)CYL(12+ i*7,690,1.4,1.4,20,'#e0dacb',{noSh:1});
  t=B(-50,1620,44,30,58,'#cfc0a8',{glass:0.28});t=B(-50,1620,26,205,26,'#cfc0a8',{glass:0.3});
  CYL(-50,1620,10,0.5,34,'#4f7b62',{y:t,seg:4,noSh:1}); // Woolworth green cap
  t=B(120,780,32,250,48,'#b9ad94',{glass:0.3});CYL(120,780,14,0.3,30,'#3f6b52',{y:t,seg:4,noSh:1}); // 40 Wall
  t=B(200,690,34,180,34,'#b8b2a4',{glass:0.3});t=B(200,690,20,80,20,'#bdb7a8',{y:t,glass:0.3});CYL(200,690,4,0.2,28,'#c5bfae',{y:t,noSh:1}); // 70 Pine
  B(80,880,62,246,26,'#c6c9cd',{glass:0.6});       // One Chase slab
  B(330,706,30,66,30,'#d5cdb9',{glass:0.3});B(330,706,20,52,20,'#d5cdb9',{y:G.terrain(330,706)+64,glass:0.3,noSh:1});
  B(150,1560,34,262,30,'#b5bcc6',{glass:0.75});    // 8 Spruce
  t=B(350,1900,64,128,22,'#c9c2b0',{glass:0.3});B(350,1900,30,24,16,'#c9c2b0',{y:t,noSh:1});CYL(350,1900,5,0.4,20,'#d4b455',{y:t+24,em:0.35,noSh:1}); // Municipal
  B(30,1706,30,18,40,'#ddd8c8',{glass:0.25});CYL(30,1690,5,0.2,16,'#ddd8c8',{y:G.terrain(30,1700)+16,noSh:1});FLAG(30,36,1700,2); // City Hall
  STEAMv(-100,900);STEAMv(160,1200);STEAMv(60,620);
}
// ============ FLATIRON / MIDTOWN SOUTH ============
PRISM([[2,76],[-30,-4],[14,-4]],86,-8,4986,'#c9b490',{glass:0.3});
{
  let t=B(180,4980,24,150,24,'#dcd6c6',{glass:0.3}); // Met Life clock tower
  B(180,4980,26,6,26,'#dcd6c6',{y:t,noSh:1});CYL(180,4980,8,0.3,26,'#c8b98a',{y:t+6,seg:4,noSh:1});
  G.BB.push({x:168,y:t-18,z:4966,w:10,h:10,ry:Math.PI/4,seed:0.9,clock:1});
  t=B(230,5340,40,140,52,'#c3b394',{glass:0.3});CYL(230,5340,17,0.4,36,'#d9b649',{y:t,seg:4,em:0.5,noSh:1}); // NY Life gold
  t=B(390,4440,26,120,26,'#b8a988',{glass:0.28});B(390,4440,14,16,14,'#b8a988',{y:t,noSh:1});CYL(390,4440,5,0.2,18,'#e8d9a8',{y:t+16,em:0.6,noSh:1}); // ConEd
  B(-350,5880,88,42,58,'#a08873',{glass:0.25});    // Macy's
  B(-330,6352,58,24,42,'#d3cab6',{glass:0.2});     // NYPL
}
// ============ ESB ============
{
  const x=60,z=5862;let t=B(x,z,118,18,60,'#c9bda3',{glass:0.3});
  t=B(x,z,88,28,52,'#c9bda3',{y:t,glass:0.3,noSh:1});
  t=B(x,z,46,222,44,'#cfc3a9',{y:t,glass:0.32,noSh:1});
  G.SHADOWS.push({x,y:G.terrain(x,z)-1.5,z,sx:50,sy:381,sz:46,rot:0});
  t=B(x,z,32,26,30,'#cfc3a9',{y:t,noSh:1});t=B(x,z,22,20,20,'#cfc3a9',{y:t,noSh:1,em:0.9});
  t=CYL(x,z,7,4,26,'#c8c2b2',{y:t,em:0.9,noSh:1});CYL(x,z,1.4,0.3,36,'#cccccc',{y:t,noSh:1});
  FLAG(x-40,G.terrain(x,z)+22,z,2);STEAMv(x-90,z-60);
}
// ============ GRAND CENTRAL AREA ============
{
  B(280,6470,96,36,78,'#c3b294',{glass:0.22,em:0});
  let t=B(280,6408,128,240,34,'#8f9296',{glass:0.55}); // MetLife slab
  t=B(210,6560,62,150,50,'#9fb6c4',{glass:0.9});t=B(210,6560,48,140,40,'#9fb6c4',{y:t,glass:0.9,noSh:1});
  t=B(210,6560,34,80,28,'#9fb6c4',{y:t,glass:0.9,noSh:1});CYL(210,6560,4,0.3,38,'#cfd6dd',{y:t,noSh:1}); // One Vanderbilt
  const x=432,z=6580;t=B(x,z,54,150,54,'#c6c9ce',{glass:0.6});
  t=B(x,z,42,60,42,'#c6c9ce',{y:t,glass:0.6,noSh:1});
  let rr=15;for(let i=0;i<5;i++){t=CYL(x,z,rr,rr-2.4,11,'#c4c9cf',{y:t,seg:10,glass:0.92,em:0.25,noSh:1});rr-=2.9;}
  CYL(x,z,1.2,0.15,40,'#d5d9de',{y:t,noSh:1}); // Chrysler crown+needle
  B(300,6880,60,55,40,'#a3826a',{glass:0.25});B(285,6880,18,135,18,'#a3826a',{y:G.terrain(300,6880)+53,noSh:1});B(320,6880,18,135,18,'#a3826a',{y:G.terrain(300,6880)+53,noSh:1}); // Waldorf twins
  B(330,7150,42,157,25,'#4a3c32',{glass:0.8});     // Seagram
  let ct=B(250,7300,48,272,48,'#dfe2e6',{glass:0.55}); // Citicorp
  PRISM([[-24,-24],[24,-24],[24,24]],40,250,7300,'#dfe2e6',{y:ct,glass:0.4});
  B(1350,7150,32,260,28,'#2e3540',{glass:0.9});    // Trump World
  STEAMv(340,6540);STEAMv(180,6640);STEAMv(420,6800);
}
// ============ UN ============
{
  const t=B(1480,6790,24,152,86,'#5d8f84',{glass:0.97});
  B(1430,6700,58,16,96,'#dad5c8',{glass:0.3});
  const g=new THREE.CylinderGeometry(11,11,58,10,1,false,0,Math.PI);g.rotateZ(Math.PI/2);g.rotateY(Math.PI/2);g.translate(0,16,0);
  addGeo(g,1430,G.terrain(1430,6700)+2,6700,0,hx('#e2ddd0'),0.2,0);
}
// ============ TIMES SQUARE ============
{
  const TS=[[-585,6620,20,110],[-655,6700,42,180],[-515,6760,40,205],[-640,6860,44,235],[-535,6910,42,190],[-600,6975,40,160]];
  for(const[x,z,w,h]of TS){
    B(x,z,w,h,w,r()<0.5?'#28323e':'#37414d',{glass:0.85});
    const y=G.terrain(x,z);
    G.BB.push({x:x+ (x<-590?w/2+1:-w/2-1),y:y+h*0.35,z,w:2,h:h*0.5,ry:Math.PI/2,seed:r(),side:1});
    G.BB.push({x,y:y+h*0.32,z:z+(z<6800?w/2+1:-w/2-1),w:w*0.9,h:h*0.45,ry:0,seed:r()});
  }
  CYL(-585,6620,1,0.2,18,'#cccccc',{y:G.terrain(-585,6620)+110,noSh:1});
  for(let i=0;i<8;i++)STEAMv(-570+(r()-0.5)*150,6700+(r()-0.5)*300);
  let t=B(-380,6620,52,240,52,'#b9cfd8',{glass:0.95});
  t=B(-380,6620,34,90,34,'#b9cfd8',{y:t,glass:0.95,noSh:1});CYL(-380,6620,3,0.2,60,'#cfd6dd',{y:t,noSh:1}); // BofA
}
// ============ ROCKEFELLER + ST PATRICK ============
{
  let t=B(-190,6890,98,180,22,'#c8bda6',{glass:0.4});
  B(-190,6890,72,60,20,'#c8bda6',{y:t,noSh:1});B(-190,6890,44,22,18,'#c8bda6',{y:t+60,noSh:1});
  for(const[x,z,h]of[[-120,6820,60],[-255,6820,60],[-120,6960,70],[-255,6960,90],[-190,6760,45]])B(x,z,36,h,30,'#c2b79f',{glass:0.4});
  B(30,6950,26,26,52,'#e3ddd0',{glass:0.15});
  CYL(20,6928,4,0.4,58,'#e3ddd0',{seg:4,noSh:1});CYL(40,6928,4,0.4,58,'#e3ddd0',{seg:4,noSh:1});
  FLAG(-190,G.terrain(-190,6890)+22,6862,1);
}
// ============ 57th SUPERTALLS ============
{
  B(170,7740,27,425,27,'#e8e6e2',{glass:0.5});      // 432 Park
  let t=B(-160,7762,24,300,17,'#d9cbb8',{glass:0.6});
  t=B(-160,7762,24,80,13,'#d9cbb8',{y:t,glass:0.6,noSh:1});B(-160,7762,24,55,9,'#d9cbb8',{y:t,glass:0.6,noSh:1}); // 111 W57
  B(-270,7770,58,468,30,'#8fb2c9',{glass:0.95});    // CP Tower
  B(-235,7716,42,300,24,'#7da7c9',{glass:0.9});     // One57
  PRISM([[-22,-22],[22,-22],[26,22],[-26,22]],318,-190,7430,'#252c36',{glass:0.9,taper:0.42}); // 53W53
  let h=B(-720,7680,42,26,42,'#8a8578',{glass:0.3});B(-720,7680,36,155,36,'#3a4550',{y:h,glass:0.85,noSh:1}); // Hearst
  B(-975,7880,30,225,55,'#9fc2d8',{glass:0.9});B(-915,7880,30,225,55,'#9fc2d8',{glass:0.9});
  B(-945,7862,70,20,80,'#b0a894',{glass:0.4});      // Time Warner base
  CYL(-880,7900,3,3,22,'#8a8478',{noSh:1});          // Columbus column
  B(-110,7892,52,72,58,'#ded5c2',{glass:0.3});CYL(-110,7892,20,6,16,'#4f7b62',{y:G.terrain(-110,7892)+70,seg:4,noSh:1}); // Plaza
  B(-40,7870,48,196,48,'#e6e3dc',{glass:0.5});      // GM bldg
}
// ============ HUDSON YARDS ============
{
  let t=PRISM([[-34,-30],[34,-30],[40,30],[-40,30]],335,-1560,5870,'#42525e',{glass:0.9,taper:0.55});
  B(-1480,5790,44,300,40,'#4a5a66',{glass:0.9});
  B(-1615,5975,55,285,50,'#3d4d59',{glass:0.85});
  B(-1445,5705,48,262,40,'#556571',{glass:0.9});
  const g=new THREE.CylinderGeometry(14,7,42,9);g.translate(0,21,0);
  addGeo(g,-1532,G.terrain(-1532,5790),5790,0,hx('#b0653a'),0.3,0.25); // Vessel
  B(-1800,5905,62,36,170,'#20282f',{glass:0.92});   // Javits
  CYL(-700,5790,76,72,34,'#8f8b82',{seg:18,glass:0.2}); // MSG
  B(-640,5700,34,150,34,'#9aa2ac',{glass:0.7});B(-760,5700,34,140,34,'#9aa2ac',{glass:0.7});
}
// ============ CENTRAL PARK EDGE / UWS / UES ============
{
  B(-140,9800,138,24,150,'#cfc4ae',{glass:0.25});B(-70,9800,20,18,120,'#b9cfd8',{glass:0.9}); // Met
  B(-460,9570,10,14,10,'#8a8578',{glass:0.1});      // Belvedere
  B(-940,9560,130,30,160,'#a67c66',{glass:0.2});
  B(-940,9480,42,40,42,'#3a4550',{glass:0.9});SPH(-940,G.terrain(-940,9480)+20,9480,13,'#e8e8ea',{glass:0.1,em:0.15}); // AMNH+Planetarium
  let t=B(-905,8952,62,38,62,'#7a5c40',{glass:0.2});B(-905,8952,58,10,58,'#5c422e',{y:t,noSh:1}); // Dakota
  for(const[z,name]of[[9320,0],[10190,0],[10680,0]]){
    const x=-902;let b=B(x,z,64,62,54,'#bfae94',{glass:0.25});
    B(x-18,z,17,52,17,'#bfae94',{y:b,noSh:1});B(x+18,z,17,52,17,'#bfae94',{y:b,noSh:1});
    CYL(x-18,z,8,1,10,'#a8987e',{y:b+52,seg:6,noSh:1});CYL(x+18,z,8,1,10,'#a8987e',{y:b+52,seg:6,noSh:1});
  }
  let gg=G.terrain(-90,10470);
  for(let i=0;i<4;i++)CYL(-90,10470,11+i*2.2,12+i*2.2,5,'#e6e2da',{y:gg+3+i*5,seg:14,glass:0.05,noSh:1});
  B(-130,10470,30,20,24,'#ddd8ce',{glass:0.3});      // Guggenheim
  B(-1100,7990,50,22,44,'#e2dccc',{glass:0.4});B(-1160,7960,40,26,40,'#e2dccc',{glass:0.4});B(-1100,8060,44,24,40,'#e2dccc',{glass:0.4}); // Lincoln Ctr
}
// ============ UPTOWN ============
{
  let t=B(-1560,12690,26,30,44,'#b5aa92',{glass:0.15});B(-1560,12668,21,118,21,'#b5aa92',{glass:0.2});
  t=CYL(-1622,12810,15,15,22,'#c9c2b2',{seg:12,glass:0.15});CYL(-1622,12810,13,9,10,'#c9c2b2',{y:t,seg:12,noSh:1}); // Riverside church + Grant
  t=B(-1330,12520,46,20,46,'#c9c0ac',{glass:0.2});SPH(-1330,t+8,12520,17,'#b9b09a',{});
  for(const[x,z]of[[-1420,12420],[-1240,12420],[-1420,12620],[-1240,12620],[-1330,12350]])B(x,z,42,22,26,'#9c6a50',{glass:0.22,em:0});
  B(-1150,12310,88,34,22,'#b3a88e',{glass:0.12});CYL(-1105,12310,11,9,52,'#b3a88e',{seg:8});SPH(-1195,G.terrain(-1195,12310)+30,12310,14,'#b3a88e',{}); // St John Divine
  for(const[x,z,h]of[[-900,14260,30],[-830,14330,26],[-900,14380,24]])B(x,z,40,h,26,'#4a4a48',{glass:0.15});
  B(-865,14300,14,40,14,'#e6e2d8',{glass:0.1});      // City College tower
  B(-560,13262,26,18,20,'#8f5340',{glass:0.2});B(-575,13252,3,14,8,'#c03028',{em:1.1,noSh:1}); // Apollo
  for(const[x,z,h]of[[-1180,16760,96],[-1130,16860,84],[-1230,16860,110],[-1180,16960,72],[-1080,16800,60]])B(x,z,38,h,30,'#c7c2b8',{glass:0.45});
  let ct=CYL(170,16350,6,5,42,'#a89c86',{seg:8,glass:0.05});CYL(170,16350,6.5,1,6,'#8a7e6a',{y:ct,seg:8,noSh:1}); // Highbridge tower
  B(-1090,19060,30,16,44,'#a49a86',{glass:0.08});B(-1105,19040,13,26,13,'#a49a86',{glass:0.1}); // Cloisters
  // Baker Field
  B(-850,20870,90,10,12,'#3f5da8',{glass:0});B(-895,20930,12,8,70,'#3f5da8',{glass:0});
  const fg=new THREE.BoxGeometry(80,0.8,110);fg.translate(0,0.4,0);addGeo(fg,-845,G.terrain(-845,20930),20930,0,hx('#4d8a3d'),0,0);
}
// ============ EAST RIVER industry + Roosevelt Isl ============
{
  B(1500,4560,70,30,90,'#7a7468',{glass:0.1});
  let sy=G.terrain(1500,4560);
  for(const dx of[-15,15]){CYL(1500+dx,4520,5,4.4,150,'#c8c4bc',{seg:8,noSh:1});}
  B(1430,3340,64,26,70,'#75705f',{glass:0.1});CYL(1430,3310,5,4.4,120,'#c8c4bc',{seg:8});
  // Roosevelt Island
  for(let i=0;i<9;i++){const z=8620+i*230;B(1955,z,34,36+((i*37)%28),52,i%2?'#9c7057':'#adb2ba',{glass:0.4});}
  B(1930,8240,60,26,40,'#3e4e5a',{glass:0.9});
  B(1960,7680,20,12,26,'#8a8276',{glass:0.05});
  CYL(1970,11480,3.4,2.2,15,'#b5aa96',{seg:6});CYL(1970,11480,2,0.3,4,'#b5aa96',{y:G.terrain(1970,11480)+15,noSh:1}); // lighthouse
  B(2380,8060,40,26,4,'#c03028',{glass:0,em:0.9,noSh:1}); // Pepsi sign (LIC shore)
  B(2620,7710,30,20,6,'#b02820',{glass:0,em:0.7,noSh:1});
  // Yankee stadium (Bronx)
  const ys=new THREE.CylinderGeometry(105,112,26,20,1,true);ys.translate(0,13,0);ys.scale(1.25,1,1);
  addGeo(ys,950,4,15950,0,hx('#d8d4c8'),0.15,0);
  const yf=new THREE.CircleGeometry(95,16);yf.rotateX(-Math.PI/2);yf.scale(1.25,1,1);
  addGeo(yf,950,17,15950,0,hx('#4d8a3d'),0,0);
  for(let i=0;i<6;i++){const a=i/6*Math.PI*2;CYL(950+Math.cos(a)*135,15950+Math.sin(a)*112,1.2,1,40,'#9aa0a8',{y:4,noSh:1,em:0.3});}
}
// ============ PIERS / WATERFRONT ============
{
  const pier=(x,z,w,l,ry,shed,c)=>{
    const g=new THREE.BoxGeometry(l,3,w);g.translate(0,1.5,0);addGeo(g,x,0.5,z,ry||0,hx(c||'#8a8072'),0,0);
    if(shed){const s=new THREE.BoxGeometry(l*0.7,9,w*0.62);s.translate(0,7.5,0);addGeo(s,x,0.5,z,ry||0,hx('#c9c6bc'),0.12,0);}
  };
  for(let z=700;z<2300;z+=260)pier(G.edgeW(z)-62,z,26,120,0,z%520<260,'#8a8072');
  for(let i=0;i<4;i++)pier(-1905,4760+i*118,84,150,0,true,'#9a968c'); // Chelsea piers
  pier(-1900,4520,30,110,0,false);
  // Little Island
  for(let i=0;i<10;i++){const a=i/10*6.28;CYL(-1875+Math.cos(a)*30,4310+Math.sin(a)*26,3,4.5,14,'#8f8a80',{y:-2,noSh:1});}
  const li=new THREE.CylinderGeometry(42,36,4,12);li.translate(0,2,0);addGeo(li,-1875,11,4310,0,hx('#4d7a38'),0,0);
  pier(-1925,6560,60,140,0,true,'#9aa0a4');
  // Intrepid
  const hull=new THREE.BoxGeometry(255,16,36);hull.translate(0,8,0);addGeo(hull,-1975,0,6890,0,hx('#6a7078'),0,0);
  const dk=new THREE.BoxGeometry(262,2.5,42);dk.translate(0,17.2,0);addGeo(dk,-1975,0,6890,0,hx('#5a6068'),0,0);
  B(-1955,6905,14,16,10,'#7a8088',{y:19,noSh:1});
  for(let i=0;i<4;i++)B(-2040+i*40,6885,7,2.5,5,'#8a9098',{y:19,noSh:1});
  for(let z=8600;z<12500;z+=500)pier(G.edgeW(z)-40,z,18,70,0,false);
  // Seaport
  pier(945,1300,22,90,0.5,false);pier(985,1390,22,90,0.5,true);
  const sh=new THREE.BoxGeometry(46,6,12);sh.translate(0,3,0);addGeo(sh,960,0.8,1250,0.5,hx('#5a4638'),0,0);
  for(const d of[-14,0,14]){CYL(960+d*Math.cos(0.5),1250-d*Math.sin(0.5),0.5,0.3,34,'#6a5a48',{y:4,noSh:1});}
  pier(880,620,30,80,0,true,'#7ca858'); // ferry terminal
  B(150,80,60,14,40,'#5f8a4a',{glass:0.3}); // Staten Isl ferry terminal
  pier(950,540,26,60,0,false);pier(-1890,5560,30,70,0,false); // heliports
}
// ============ STATUE / ISLANDS ============
{
  B(-2700,-3800,52,14,52,'#8a8578',{glass:0.05});
  let t=CYL(-2700,-3800,17,12,30,'#9a8f7e',{y:14,seg:8});
  t=CYL(-2700,-3800,7,5,26,'#5d8a72',{y:t,seg:8});
  SPH(-2700,t+3,-3800,3.2,'#5d8a72',{});
  const arm=new THREE.CylinderGeometry(1.6,2.2,20,6);arm.translate(0,10,0);arm.rotateZ(-0.5);
  addGeo(arm,-2694,t-6,-3800,0,hx('#5d8a72'),0,0);
  SPH(-2686,t+13,-3800,2,'#ffd890',{em:1.2});
  B(-3050,-2900,70,16,40,'#a05a48',{glass:0.2});
  for(const dx of[-28,28])for(const dz of[-14,14])CYL(-3050+dx,-2900+dz,5,4,24,'#a05a48',{seg:6,noSh:1});
  CYL(600,-1300,62,62,9,'#8f8678',{seg:16,glass:0.05});
  B(640,-1240,40,12,20,'#9c6a50',{glass:0.2});
  for(let i=0;i<4;i++){ // Red Hook cranes
    const x=1900+i*90,z=-880;CYL(x,z,3,3,40,'#c46a28',{noSh:1});
    const bm=new THREE.BoxGeometry(4,50,4);bm.translate(0,25,0);bm.rotateZ(0.6);addGeo(bm,x-8,38,z,0,hx('#c46a28'),0,0);
  }
}
// ============ BRIDGES ============
const SUSP=G.SUSP,NECK=G.NECK;
function deckLine(pts){ // pts [[x,y,z]..] → deck boxes + return
  for(let i=0;i<pts.length-1;i++){
    const a=pts[i],b=pts[i+1];
    const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2];
    const l=Math.hypot(dx,dz),ry=Math.atan2(dx,dz);
    const g=new THREE.BoxGeometry(20,4,l+2);g.translate(0,-2,0);
    const tilt=Math.atan2(dy,l);
    const m=new THREE.Matrix4().makeRotationY(ry).multiply(new THREE.Matrix4().makeRotationX(-tilt));
    // manual: place midpoint
    const g2=g.clone();g2.applyMatrix4(m);
    const mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2,mz=(a[2]+b[2])/2;
    addGeo(g2,mx,my,mz,0,hx('#5a5a5e'),0,0);
  }
}
function laneOn(pts,off,dir,speed){
  const out=[];const n=pts.length;
  for(let k=0;k<n;k++){
    const j=dir>0?k:n-1-k,p=pts[j],q=pts[Math.min(j+1,n-1)],o=pts[Math.max(j-1,0)];
    let dx=q[0]-o[0],dz=q[2]-o[2];const l=Math.hypot(dx,dz)||1;dx/=l;dz/=l;
    out.push([p[0]-dz*off,p[1]+1.1,p[2]+dx*off]);
  }
  G.LANES.push({pts:out,speed,taxi:0.12,spacing:40});
}
function suspBridge(ax,az,bx,bz,deckY,towH,style,endY){
  const dx=bx-ax,dz=bz-az,len=Math.hypot(dx,dz),ux=dx/len,uz=dz/len,px=-uz,pz=ux;
  const t1=0.30,t2=0.70;
  const ga=[ax-ux*230,G.terrain(ax-ux*230,az-uz*230)+1,az-uz*230];
  const gb=[bx+ux*200,endY!==undefined?endY:4,bz+uz*200];
  const pts=[ga,[ax,deckY,az]];
  for(let i=1;i<=8;i++)pts.push([ax+ux*len*i/8,deckY+Math.sin(i/8*Math.PI)*2,az+uz*len*i/8]);
  pts.push([bx,deckY,bz],gb);
  deckLine(pts);
  laneOn(pts,-5.5,1,13);laneOn(pts,-2,1,13);laneOn(pts,2,-1,13);laneOn(pts,5.5,-1,13);
  for(const tt of[t1,t2]){
    const tx=ax+ux*len*tt,tz=az+uz*len*tt;
    if(style==='stone'){
      for(const s of[-1,1]){B(tx+px*s*8,tz+pz*s*8,10,towH,12,'#b3a58c',{y:-2,glass:0,ry:Math.atan2(ux,uz)});}
      const cap=new THREE.BoxGeometry(26,towH*0.35,12);cap.translate(0,towH*0.35/2,0);
      const m=new THREE.Matrix4().makeRotationY(Math.atan2(ux,uz));const cg=cap.clone();cg.applyMatrix4(m);
      addGeo(cg,tx,towH*0.68,tz,0,hx('#b3a58c'),0,0);
    }else{
      for(const s of[-1,1])B(tx+px*s*9,tz+pz*s*9,7,towH,9,'#5f676e',{y:-2,glass:0,ry:Math.atan2(ux,uz)});
      for(const fy of[deckY+2,towH*0.6,towH-6]){
        const bar=new THREE.BoxGeometry(20,4,6);bar.translate(0,2,0);
        const m=new THREE.Matrix4().makeRotationY(Math.atan2(ux,uz));const bg=bar.clone();bg.applyMatrix4(m);
        addGeo(bg,tx,fy,tz,0,hx('#5f676e'),0,0);
      }
    }
  }
  // cables
  const topY=towH-4;
  const cy=t=>{
    if(t<t1)return deckY+6+(topY-deckY-6)*Math.pow(t/t1,2);
    if(t>t2)return deckY+6+(topY-deckY-6)*Math.pow((1-t)/(1-t2),2);
    const m=(t-t1)/(t2-t1);return topY-(topY-(deckY+7))*(1-Math.pow(2*m-1,2));
  };
  for(const s of[-1,1]){
    const cps=[];
    for(let i=0;i<=44;i++){const t=i/44;cps.push(new THREE.Vector3(ax+ux*len*t+px*s*8.5,cy(t),az+uz*len*t+pz*s*8.5));}
    const crv=new THREE.CatmullRomCurve3(cps);
    const tg=new THREE.TubeGeometry(crv,60,style==='stone'?0.9:1.3,4);
    addGeo(tg,0,0,0,0,hx('#3a3d42'),0,0);
    for(let i=0;i<=44;i+=1){const t=i/44;
      if(i%2===0)NECK.push([ax+ux*len*t+px*s*8.5,cy(t)+0.8,az+uz*len*t+pz*s*8.5]);
      if(t>0.04&&t<0.96&&i%1===0){
        const cx=ax+ux*len*t+px*s*8.5,cz=az+uz*len*t+pz*s*8.5;
        SUSP.push([cx,cy(t),cz],[cx,deckY-1,cz]);
      }
    }
  }
}
suspBridge(700,1800,2350,850,38,84,'stone');     // Brooklyn
suspBridge(880,2080,2500,1350,42,102,'steel');   // Manhattan
suspBridge(1620,3080,3000,2650,40,96,'steel');   // Williamsburg
suspBridge(1280,13140,2800,13900,40,92,'steel'); // RFK
suspBridge(-1350,17560,-3250,17560,66,186,'steel',72); // GWB
CYL(-1394,17594,3,2,11,'#b83028',{y:0,seg:8,noSh:1}); // little red lighthouse
// Queensboro (cantilever-ish)
{
  const ax=1420,az=7880,bx=3000,bz=8150;
  const dx=bx-ax,dz=bz-az,len=Math.hypot(dx,dz),ux=dx/len,uz=dz/len;
  const pts=[[ax-ux*220,G.terrain(ax-ux*220,az-uz*220)+1,az-uz*220],[ax,48,az]];
  for(let i=1;i<=8;i++)pts.push([ax+ux*len*i/8,48,az+uz*len*i/8]);
  pts.push([bx,48,bz],[bx+ux*200,5,bz+uz*200]);
  deckLine(pts);laneOn(pts,-4,1,12);laneOn(pts,4,-1,12);
  for(const tt of[0.22,0.42,0.60,0.80]){
    const tx=ax+ux*len*tt,tz=az+uz*len*tt;
    B(tx,tz,8,86,10,'#7a7568',{y:-2,glass:0});
    NECK.push([tx,88,tz]);
  }
  for(let i=0;i<18;i++){const t=0.14+i/18*0.74;const hump=52+26*Math.abs(Math.sin(t*Math.PI*2.4));
    const tx=ax+ux*len*t,tz=az+uz*len*t;
    B(tx,tz,3,hump-46,3,'#7a7568',{y:46,noSh:1,glass:0});NECK.push([tx,hump+1,tz]);}
}
// Hell Gate arch (background)
{
  const ax=2950,az=14150,bx=3620,bz=14640;
  const dx=bx-ax,dz=bz-az,len=Math.hypot(dx,dz),ux=dx/len,uz=dz/len;
  for(let i=0;i<14;i++){const t=i/13;const y=12+58*Math.sin(t*Math.PI);
    B(ax+ux*len*t,az+uz*len*t,4,4,len/13,'#8a4a3a',{y,noSh:1,ry:Math.atan2(ux,uz),glass:0});}
  deckLine([[ax,26,az],[bx,26,bz]]);
  B(ax,az,14,34,14,'#9a8a76',{y:0});B(bx,bz,14,34,14,'#9a8a76',{y:0});
}
// Harlem river small bridges
const HARLEM=[[1210,13960,1800,14200,14],[1150,14620,1700,14750,13],[1050,14980,1600,15100,14],[880,15650,1400,15760,15],[430,16900,1050,17010,36],[380,17070,1000,17180,30],[60,20180,520,20290,10],[-380,21150,-160,21600,9],[-820,21360,-700,21980,36]];
for(const[ax,az,bx,bz,dy]of HARLEM){
  const pts=[[ax-30,G.terrain(ax-30,az-16)+1,az-16],[ax,dy,az],[(ax+bx)/2,dy+2,(az+bz)/2],[bx,dy,bz],[bx+30,4,bz+16]];
  deckLine(pts);laneOn(pts,-2.5,1,10);laneOn(pts,2.5,-1,10);
  B((ax+bx)/2-((bz-az))*0.12,(az+bz)/2+((bx-ax))*0.12,5,dy,5,'#7a7568',{y:-2,noSh:1,glass:0});
  B((ax+bx)/2+((bz-az))*0.12,(az+bz)/2-((bx-ax))*0.12,5,dy,5,'#7a7568',{y:-2,noSh:1,glass:0});
  NECK.push([ax,dy+2,az],[(ax+bx)/2,dy+4,(az+bz)/2],[bx,dy+2,bz]);
}
// High Bridge (stone arches, pedestrian)
{
  const ax=330,az=16560,bx=900,bz=16660;
  const dx=bx-ax,dz=bz-az,len=Math.hypot(dx,dz),ux=dx/len,uz=dz/len;
  deckLine([[ax,34,az],[bx,34,bz]]);
  for(let i=0;i<7;i++){const t=(i+0.5)/7;B(ax+ux*len*t,az+uz*len*t,4,32,8,'#a89878',{y:0,noSh:1,glass:0});}
}
// Roosevelt tram cables + Park Ave viaduct hint
const tram={a:[1310,68,7920],b:[1958,45,7920],towers:[[1430,64],[1700,74],[1890,52]]};
for(const[tx,th]of tram.towers)B(tx,7920,5,th,5,'#8a2e28',{y:4,noSh:1,glass:0});
for(const s of[-1,1]){
  for(let i=0;i<24;i++){
    const t0=i/24,t1=(i+1)/24;
    const y0=tram.a[1]+(tram.b[1]-tram.a[1])*t0+Math.sin(t0*Math.PI)*-6;
    const y1=tram.a[1]+(tram.b[1]-tram.a[1])*t1+Math.sin(t1*Math.PI)*-6;
    SUSP.push([tram.a[0]+(tram.b[0]-tram.a[0])*t0,y0,7918+s*4],[tram.a[0]+(tram.b[0]-tram.a[0])*t1,y1,7918+s*4]);
  }
}
// ============ finalize merged mesh ============
const geo=new THREE.BufferGeometry();
geo.setAttribute('position',new THREE.Float32BufferAttribute(P,3));
geo.setAttribute('normal',new THREE.Float32BufferAttribute(NR,3));
geo.setAttribute('uv',new THREE.Float32BufferAttribute(UVp,2));
geo.setAttribute('aCol',new THREE.Float32BufferAttribute(CL,3));
geo.setAttribute('aGE',new THREE.Float32BufferAttribute(GE,3));
geo.setIndex(IX);
const mesh=new THREE.Mesh(geo,S.lm());mesh.frustumCulled=false;
scene.add(mesh);
// suspender lines
const lg=new THREE.BufferGeometry();
const lp=new Float32Array(SUSP.length*3);
for(let i=0;i<SUSP.length;i++){lp[i*3]=SUSP[i][0];lp[i*3+1]=SUSP[i][1];lp[i*3+2]=SUSP[i][2];}
lg.setAttribute('position',new THREE.BufferAttribute(lp,3));
const lines=new THREE.LineSegments(lg,new THREE.LineBasicMaterial({color:0x3a3f46,transparent:true,opacity:0.42}));
lines.frustumCulled=false;scene.add(lines);
// necklace points
const ng=new THREE.BufferGeometry();
const np=new Float32Array(NECK.length*3),ni=new Float32Array(NECK.length);
for(let i=0;i<NECK.length;i++){np[i*3]=NECK[i][0];np[i*3+1]=NECK[i][1];np[i*3+2]=NECK[i][2];ni[i]=0.5+(i%7)/14;}
ng.setAttribute('position',new THREE.BufferAttribute(np,3));
ng.setAttribute('aI',new THREE.BufferAttribute(ni,1));
const neckM=S.glow('#ffd9a0',0);
const neck=new THREE.Points(ng,neckM);neck.frustumCulled=false;scene.add(neck);
// billboards
let bbMesh=null;
{
  const bp=[],bn=[],buv=[],bs=[],bix=[];let vb=0;
  for(const b of G.BB){
    const hw=b.w/2,hh=b.h/2;
    const cs=Math.cos(b.ry),sn=Math.sin(b.ry);
    const cx=b.x,cy=b.y+hh,cz=b.z;
    const px=cs*hw,pz=-sn*hw;
    bp.push(cx-px,cy-hh,cz-pz, cx+px,cy-hh,cz+pz, cx+px,cy+hh,cz+pz, cx-px,cy+hh,cz-pz);
    for(let k=0;k<4;k++){bn.push(sn,0,cs);bs.push(b.seed);}
    buv.push(0,0, 1,0, 1,1, 0,1);
    bix.push(vb,vb+1,vb+2, vb,vb+2,vb+3);vb+=4;
  }
  const bg=new THREE.BufferGeometry();
  bg.setAttribute('position',new THREE.Float32BufferAttribute(bp,3));
  bg.setAttribute('normal',new THREE.Float32BufferAttribute(bn,3));
  bg.setAttribute('uv',new THREE.Float32BufferAttribute(buv,2));
  bg.setAttribute('aSeed',new THREE.Float32BufferAttribute(bs,1));
  bg.setIndex(bix);
  bbMesh=new THREE.Mesh(bg,S.bill());bbMesh.frustumCulled=false;scene.add(bbMesh);
}
return {tram,neckM,mesh};
};
})();
