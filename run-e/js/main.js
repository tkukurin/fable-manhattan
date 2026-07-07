// MAIN — renderer, camera, controls, presets, UI, quality governor, loop.
(function(){
const A=window.APP;
A.main=function(THREE,OrbitControls){
const canvas=document.getElementById('c');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.toneMapping=THREE.NoToneMapping;
renderer.setClearColor(0x0b0e14);window.__R=renderer;
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(44,innerWidth/innerHeight,5,90000);
const S=A.initShaders(THREE);
// sky + water
const sky=new THREE.Mesh(new THREE.SphereGeometry(40000,24,12),S.sky());
sky.frustumCulled=false;scene.add(sky);
const water=new THREE.Mesh(new THREE.PlaneGeometry(52000,60000),S.water());
water.rotation.x=-Math.PI/2;water.position.set(-1000,0,10000);scene.add(water);
// build world
const cityH=A.buildCity(THREE,S,scene);
A.buildPark(THREE,S,scene);
const lm=A.buildLandmarks(THREE,S,scene);
A.buildShadows(THREE,S,scene);
const life=A.buildLife(THREE,S,scene,lm.tram);
lm.neckM.uniforms.uGate=S.U.uNight;
// controls
const controls=new OrbitControls(camera,canvas);window.__viewerHook={camera,controls};
controls.enableDamping=true;controls.dampingFactor=0.07;
controls.zoomSpeed=1.05;controls.rotateSpeed=0.55;controls.panSpeed=0.75;
controls.screenSpacePanning=false;
controls.minDistance=55;controls.maxDistance=26000;
controls.maxPolarAngle=1.518;
controls.autoRotate=true;controls.autoRotateSpeed=0.10;
const PRESETS=[
 {p:[-6900,4100,-3100],t:[350,150,10400]},
 {p:[-2450,820,-2400],t:[150,180,1050]},
 {p:[-284,72,5100],t:[-276,120,6800]},
 {p:[-2950,1800,7900],t:[-420,30,10200]},
 {p:[2900,640,300],t:[660,70,2650]},
 {p:[-2100,950,20400],t:[-350,140,15200]},
];
camera.position.set(...PRESETS[0].p);
controls.target.set(...PRESETS[0].t);
controls.update();
let fly=null;
function flyTo(i){
  const P=PRESETS[i];
  fly={t:0,dur:2.8,
    p0:camera.position.clone(),t0:controls.target.clone(),
    p1:new THREE.Vector3(...P.p),t1:new THREE.Vector3(...P.t)};
  fly.arc=Math.min(2600,fly.p0.distanceTo(fly.p1)*0.14);
  controls.enabled=false;
  document.querySelectorAll('#ui [data-v]').forEach(b=>b.classList.toggle('on',+b.dataset.v===i));
}
// UI
const ui=document.getElementById('ui');
document.querySelectorAll('#ui [data-v]').forEach(b=>b.onclick=()=>flyTo(+b.dataset.v));
document.querySelectorAll('#ui [data-l]').forEach(b=>b.onclick=()=>{
  S.setLight(b.dataset.l);
  document.querySelectorAll('#ui [data-l]').forEach(x=>x.classList.toggle('on',x===b));
});
document.getElementById('reset').onclick=()=>flyTo(0);
document.getElementById('photo').onclick=()=>document.body.classList.toggle('photo');
const trfEl=document.getElementById('trf'),btsEl=document.getElementById('bts');
addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();
  if(k>='1'&&k<='6')flyTo(+k-1);
  else if(k==='g')document.querySelector('[data-l="golden"]').click();
  else if(k==='n')document.querySelector('[data-l="noon"]').click();
  else if(k==='d')document.querySelector('[data-l="dusk"]').click();
  else if(k==='r')flyTo(0);
  else if(k==='p')document.body.classList.toggle('photo');
  else if(k==='escape')document.body.classList.remove('photo');
});
let idleT=0;
addEventListener('pointermove',()=>{idleT=0;ui.classList.remove('faded');});
canvas.addEventListener('pointerdown',()=>{controls.autoRotate=false;idleT=0;},{once:false});
// quality
const TIERS=[
 {pr:1,winD:900,spark:0.25,tr:0.4,crowd:0,steam:0,boro:0.45},
 {pr:1.25,winD:1400,spark:0.5,tr:0.6,crowd:0,steam:1,boro:0.7},
 {pr:1.5,winD:2000,spark:0.75,tr:0.85,crowd:1,steam:1,boro:1},
 {pr:2,winD:2500,spark:1,tr:1,crowd:1,steam:1,boro:1},
];
let tier=2,autoQ=true;
function applyTier(){
  const T=TIERS[tier];
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,T.pr));
  S.U.uWinD.value=T.winD;S.U.uSpark.value=T.spark;
  life.setTraffic((+trfEl.value/100)*T.tr*1.2);
  if(life.crowd)life.crowd.visible=!!T.crowd;
  if(life.steam)life.steam.visible=!!T.steam;
  for(const m of cityH.boro)m.count=Math.floor(cityH.boroN*T.boro);
}
document.getElementById('qual').onchange=e=>{
  const v=e.target.value;
  if(v==='auto'){autoQ=true;tier=2;}
  else{autoQ=false;tier=+v;}
  applyTier();
};
trfEl.oninput=()=>life.setTraffic((+trfEl.value/100)*TIERS[tier].tr*1.2);
btsEl.oninput=()=>life.setBoats(+btsEl.value/100);
applyTier();
// resize
function onResize(){
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
}
addEventListener('resize',onResize);onResize();
// loop
const clock=new THREE.Clock();
let t=0,fpsE=document.getElementById('fps'),fAcc=0,fN=0,fT=0,ema=60;
const loadEl=document.getElementById('load');
let frames=0;
const G=A.geo;
function animate(){
  requestAnimationFrame(animate);
  let dt=clock.getDelta();if(dt>0.05)dt=0.05;
  t+=dt;
  S.U.uTime.value=t;S.tick(dt);
  if(fly){
    fly.t+=dt/fly.dur;
    let u=Math.min(1,fly.t);u=u*u*(3-2*u);
    camera.position.lerpVectors(fly.p0,fly.p1,u);
    camera.position.y+=Math.sin(u*Math.PI)*fly.arc;
    controls.target.lerpVectors(fly.t0,fly.t1,u);
    if(fly.t>=1){fly=null;controls.enabled=true;}
  }
  controls.update();
  // clamp target + camera above ground
  const tg=controls.target;
  tg.x=Math.max(-4000,Math.min(4000,tg.x));
  tg.z=Math.max(-5500,Math.min(24000,tg.z));
  tg.y=Math.max(0,Math.min(900,tg.y));
  const ch=G.terrain(camera.position.x,camera.position.z)+5;
  if(camera.position.y<ch)camera.position.y=ch;
  if(camera.position.y<4)camera.position.y=4;
  // dynamic near plane
  const dist=camera.position.distanceTo(tg);
  const near=Math.max(2,Math.min(60,dist*0.01));
  if(Math.abs(near-camera.near)/camera.near>0.3){camera.near=near;camera.updateProjectionMatrix();}
  sky.position.copy(camera.position);
  life.update(t,dt);
  renderer.render(scene,camera);
  // fps
  fAcc+=dt;fN++;fT+=dt;
  if(fAcc>0.5){const fps=fN/fAcc;ema=ema*0.6+fps*0.4;fAcc=0;fN=0;
    fpsE.textContent=Math.round(ema)+' fps';
    if(autoQ&&fT>4){
      if(ema<36&&tier>0){tier--;applyTier();fT=0;}
      else if(ema>56&&tier<3){tier++;applyTier();fT=0;}
    }
  }
  idleT+=dt;if(idleT>4.5)ui.classList.add('faded');
  frames++;
  if(frames===3){loadEl.style.opacity='0';setTimeout(()=>loadEl.remove(),900);}
}
animate();
};
})();
