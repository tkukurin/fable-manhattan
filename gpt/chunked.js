<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
  }
}
</script>

<script type="module">
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// shared procedural city constants: meters, z=south/north, x=west/east, y=up
const TAU=Math.PI*2,L=21500,V=(x,y,z)=>new THREE.Vector3(x,y,z),O=new THREE.Object3D(),C=new THREE.Color();
const city={roads:[],buildings:[],updaters:[],mats:{},lod:{},params:{traffic:1,boats:1,quality:1,light:"golden"},dusk:0};
const rnd=i=>{let x=Math.sin(i*127.1+311.7)*43758.5453;return x-Math.floor(x)};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),mix=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,x)=>{x=clamp((x-a)/(b-a),0,1);return x*x*(3-2*x)};
const streetZ=s=>-6900+s*80;
const widthAt=z=>{let t=(z+L/2)/L;return mix(600,3400,smooth(.03,.36,t))-620*smooth(.78,1,t)+160*Math.sin(t*TAU*1.8)};
const inIsland=(x,z)=>Math.abs(x)<widthAt(z)/2-35;
const inPark=(x,z)=>z>streetZ(59)&&z<streetZ(110)&&x>-430&&x<430;
const mat=(c,o={})=>new THREE.MeshStandardMaterial({color:c,roughness:.8,metalness:0,...o});
function box(s,x,z,sx,h,sz,m,y=0){let b=new THREE.Mesh(new THREE.BoxGeometry(sx,h,sz),m);b.position.set(x,y+h/2,z);b.castShadow=b.receiveShadow=true;s.add(b);return b}

// renderer, camera and orbit controls active immediately across the whole zoom range
function boot(){
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(38,innerWidth/innerHeight,.8,80000);
  scene.background=new THREE.Color(0xf4c88b);scene.fog=new THREE.FogExp2(0xd9b27e,.000045);
  const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:"high-performance"});
  renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;document.body.style.margin=0;document.body.appendChild(renderer.domElement);
  const controls=new OrbitControls(camera,renderer.domElement);
  Object.assign(controls,{enableDamping:true,dampingFactor:.055,zoomSpeed:.7,panSpeed:.65,minDistance:18,maxDistance:33000,maxPolarAngle:1.49});
  addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
  return {scene,camera,renderer,controls,clock:new THREE.Clock()};
}

// first frame: complete island from high southwest, sun low over New Jersey
const PRESETS={
  hero:{p:V(-7200,9300,-14300),t:V(100,0,700)},
  downtown:{p:V(-2700,1900,-10600),t:V(-120,80,-9000)},
  midtown:{p:V(-640,360,streetZ(45)-1150),t:V(210,120,streetZ(45))},
  park:{p:V(-1600,2700,streetZ(84)-900),t:V(0,0,streetZ(84))},
  bridges:{p:V(4200,1600,-8000),t:V(500,70,-7600)},
  gwb:{p:V(-4100,1500,streetZ(181)+1200),t:V(0,80,streetZ(110))}
};
function heroView(){let p=PRESETS.hero;city.camera.position.copy(p.p);city.controls.target.copy(p.t);city.controls.update()}

// golden hour, noon and dusk modes with progressive window ignition
function addLight(scene){
  city.hemi=new THREE.HemisphereLight(0xffe4bd,0x263044,.9);scene.add(city.hemi);
  city.sun=new THREE.DirectionalLight(0xffb35c,3.3);city.sun.position.set(-9000,5200,-6500);city.sun.castShadow=true;
  Object.assign(city.sun.shadow.camera,{left:-12000,right:12000,top:12000,bottom:-12000,far:22000});city.sun.shadow.mapSize.set(2048,2048);scene.add(city.sun);
}
function setLightMode(m){
  city.params.light=m;city.duskStart=city.clock?.elapsedTime||0;
  if(m==="noon"){city.sun.position.set(-1000,9000,-2000);city.sun.intensity=2.4;city.hemi.intensity=1.2}
  else if(m==="dusk"){city.sun.position.set(-10000,1600,-3000);city.sun.intensity=1.05;city.hemi.intensity=.45}
  else{city.sun.position.set(-9000,5200,-6500);city.sun.intensity=3.3;city.hemi.intensity=.9}
}
function updateLight(t){
  let target=city.params.light==="dusk"?smooth(0,9,t-city.duskStart):0;city.dusk=mix(city.dusk,target,.055);
  city.mats.buildings?.userData.shader?.uniforms.uDusk&&(city.mats.buildings.userData.shader.uniforms.uDusk.value=city.dusk);
  city.mats.bridgeLights?.forEach(m=>m.emissiveIntensity=2.8*city.dusk);
}

// Hudson and East rivers as procedural moving glitter sheets
function addRivers(scene){
  const m=new THREE.ShaderMaterial({uniforms:{uTime:{value:0},uSparkle:{value:1}},vertexShader:`varying vec3 w;void main(){vec4 W=modelMatrix*vec4(position,1.);w=W.xyz;gl_Position=projectionMatrix*viewMatrix*W;}`,fragmentShader:`varying vec3 w;uniform float uTime,uSparkle;void main(){float a=sin(w.x*.011+uTime)*sin(w.z*.017-uTime*1.3);float g=pow(max(0.,sin(w.x*.07+w.z*.045+uTime*2.)),18.)*uSparkle;vec3 c=mix(vec3(.035,.13,.20),vec3(1.,.62,.20),g*.85);gl_FragColor=vec4(c+a*.025,1.);}`});
  const water=new THREE.Mesh(new THREE.PlaneGeometry(16500,27000),m);water.rotation.x=-Math.PI/2;water.position.y=0;scene.add(water);
  city.mats.water=m;city.updaters.push(t=>m.uniforms.uTime.value=t);
}

// complete tapering Manhattan island outline, procedural but macro-geographically honest
function addIsland(scene){
  const sh=new THREE.Shape(),left=[],right=[];
  for(let i=0;i<=80;i++){let z=-L/2+i*L/80,w=widthAt(z)/2;left.push([-w,z]);right.unshift([w,z])}
  sh.moveTo(left[0][0],left[0][1]);[...left.slice(1),...right].forEach(p=>sh.lineTo(p[0],p[1]));sh.closePath();
  const g=new THREE.ShapeGeometry(sh);g.rotateX(Math.PI/2);
  city.island=new THREE.Mesh(g,mat(0x3d4d34,{roughness:.95,side:THREE.DoubleSide}));city.island.position.y=2;scene.add(city.island);
}

// Brooklyn, Queens, New Jersey rooftops fading into haze, harbor, and Statue of Liberty hint
function addContext(scene){
  const m=mat(0x8f7f6c,{transparent:true,opacity:.22,roughness:.9}),im=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),m,1600);
  for(let i=0;i<1600;i++){let e=rnd(i)>.5?1:-1,z=mix(-L/2,L/2,rnd(i+1)),x=e*(widthAt(z)/2+900+2500*rnd(i+2)),h=mix(10,90,rnd(i+3));O.position.set(x,h/2,z+300*(rnd(i+4)-.5));O.scale.set(mix(20,90,rnd(i+5)),h,mix(20,110,rnd(i+6)));O.updateMatrix();im.setMatrixAt(i,O.matrix)}
  scene.add(im);let sm=mat(0xd6c9ae,{roughness:.6});box(scene,-1850,-L/2+900,80,8,80,sm,4);box(scene,-1850,-L/2+900,18,110,18,sm,8);
  let torch=new THREE.Mesh(new THREE.ConeGeometry(18,70,12),sm);torch.position.set(-1850,160,-L/2+900);scene.add(torch);
}

// real street grid: avenues, crosstown streets, Lower Manhattan irregularity
function addRoadSegment(scene,p0,p1,w=18,kind="street"){
  const dx=p1.x-p0.x,dz=p1.z-p0.z,len=Math.hypot(dx,dz),a=Math.atan2(dx,dz);
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,1.2,len),city.mats.road||(city.mats.road=mat(0x191c1e,{roughness:.96})));
  mesh.position.set((p0.x+p1.x)/2,4,(p0.z+p1.z)/2);mesh.rotation.y=a;scene.add(mesh);
  city.roads.push({p0:p0.clone(),p1:p1.clone(),w,len,kind});return mesh;
}
function addStreetGrid(scene){
  for(let z=-5600;z<L/2-350;z+=80){let w=widthAt(z)*.92;if(inPark(0,z)){addRoadSegment(scene,V(-w/2,4,z),V(-470,4,z),16,"cross");addRoadSegment(scene,V(470,4,z),V(w/2,4,z),16,"cross")}else addRoadSegment(scene,V(-w/2,4,z),V(w/2,4,z),16,"cross")}
  for(let x=-1450;x<=1450;x+=260){if(Math.abs(x)<430){addRoadSegment(scene,V(x,4,-5600),V(x,4,streetZ(59)),22,"avenue");addRoadSegment(scene,V(x,4,streetZ(110)),V(x,4,L/2-350),22,"avenue")}else addRoadSegment(scene,V(x,4,-5600),V(x,4,L/2-350),22,"avenue")}
  for(let i=0;i<85;i++){let z=mix(-L/2+400,-5600,rnd(i)),w=widthAt(z)*.8,x=mix(-w/2,w/2,rnd(i+2)),len=mix(120,500,rnd(i+3)),a=mix(-.6,.6,rnd(i+4)),d=V(Math.sin(a)*len/2,0,Math.cos(a)*len/2);addRoadSegment(scene,V(x-d.x,4,z-d.z),V(x+d.x,4,z+d.z),14,"lower")}
}

// Broadway cutting diagonally through the island
function addBroadway(scene){
  const p=[V(-40,4,-L/2+250),V(-260,4,-7600),V(-60,4,streetZ(14)),V(290,4,streetZ(42)),V(-230,4,streetZ(72)),V(60,4,L/2-600)];
  for(let i=0;i<p.length-1;i++)addRoadSegment(scene,p[i],p[i+1],30,"broadway");
}

// Central Park as complete sub-world: rectangle, reservoir, lakes, meadows, paths, trees
function disk(scene,x,z,rx,rz,m,y=6,n=48){let g=new THREE.CircleGeometry(1,n);g.rotateX(-Math.PI/2);let d=new THREE.Mesh(g,m);d.position.set(x,y,z);d.scale.set(rx,1,rz);scene.add(d);return d}
function path(scene,pts,w=5){let c=new THREE.CatmullRomCurve3(pts),g=new THREE.TubeGeometry(c,48,w,6,false);scene.add(new THREE.Mesh(g,city.mats.path||(city.mats.path=mat(0xb9a675))))}
function addCentralPark(scene){
  const green=mat(0x235b2d,{roughness:.9}),water=mat(0x183d52,{roughness:.35,metalness:.2}),meadow=mat(0x4f8a36,{roughness:.9}),z0=streetZ(59),z1=streetZ(110),cz=(z0+z1)/2;
  box(scene,0,cz,860,2,z1-z0,green,5);disk(scene,0,streetZ(92),310,520,water,8);disk(scene,-170,streetZ(72),170,90,water,8);disk(scene,150,streetZ(102),120,80,water,8);
  box(scene,-120,streetZ(80),300,1,430,meadow,8);box(scene,190,streetZ(65),210,1,240,meadow,8);box(scene,120,streetZ(98),260,1,210,meadow,8);
  path(scene,[V(-330,10,z0+150),V(-280,10,cz),V(-320,10,z1-150)],6);path(scene,[V(330,10,z0+200),V(200,10,cz),V(340,10,z1-160)],6);path(scene,[V(-250,10,cz-700),V(0,10,cz),V(260,10,cz+680)],5);
  const im=new THREE.InstancedMesh(new THREE.ConeGeometry(8,28,6),mat(0x183f22,{roughness:.95}),2200);
  for(let i=0;i<2200;i++){let x=mix(-400,400,rnd(i)),z=mix(z0,z1,rnd(i+3));if(Math.abs(x)<300&&Math.abs(z-streetZ(92))<500)continue;O.position.set(x,25,z);O.scale.setScalar(mix(.7,1.5,rnd(i+8)));O.updateMatrix();im.setMatrixAt(i,O.matrix)}scene.add(im);
}

// piers, West Side Highway, FDR, green pockets, ballfields and special urban strips
function addPiersHighwaysSpecials(scene){
  const pier=mat(0x6e6559,{roughness:.88}),green=mat(0x2d6834,{roughness:.9});
  for(let z=-9600;z<streetZ(60);z+=360){let w=widthAt(z)/2;box(scene,-w-120,z,240,7,46,pier,8);if(z<-6400||z>streetZ(20))box(scene,w+90,z,180,7,38,pier,8)}
  for(let z=-L/2+700;z<L/2-900;z+=360){addRoadSegment(scene,V(-widthAt(z)/2+55,7,z),V(-widthAt(z+360)/2+55,7,z+360),34,"highway");addRoadSegment(scene,V(widthAt(z)/2-55,7,z),V(widthAt(z+360)/2-55,7,z+360),32,"highway")}
  box(scene,-420,streetZ(4),260,2,220,green,7);box(scene,-60,streetZ(42),250,2,120,green,7);box(scene,-widthAt(streetZ(96))/2+80,streetZ(96),110,2,1900,green,7);
  box(scene,-80,-9300,150,2,110,green,7);box(scene,100,streetZ(205),420,2,260,green,7);disk(scene,0,streetZ(203),160,80,mat(0x496b3c),8);
}

// procedural building material: window grid, sun glints, dusk interior warmth
function makeBuildingMaterial(){
  const m=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.55,metalness:.18});m.userData.uniforms={uDusk:{value:0},uWin:{value:1}};
  m.onBeforeCompile=s=>{Object.assign(s.uniforms,m.userData.uniforms);m.userData.shader=s;
    s.vertexShader=s.vertexShader.replace("#include <common>","#include <common>\nvarying vec3 vW;").replace("#include <project_vertex>",`vec4 mvPosition=vec4(transformed,1.0);
#ifdef USE_INSTANCING
mvPosition=instanceMatrix*mvPosition;
#endif
vW=(modelMatrix*mvPosition).xyz;mvPosition=modelViewMatrix*mvPosition;gl_Position=projectionMatrix*mvPosition;`);
    s.fragmentShader=s.fragmentShader.replace("#include <common>","#include <common>\nvarying vec3 vW;uniform float uDusk,uWin;").replace("#include <emissivemap_fragment>",`#include <emissivemap_fragment>
vec2 cell=floor(vW.xz*.055)+floor(vW.y*.085);float r=fract(sin(dot(cell,vec2(12.9898,78.233)))*43758.5453);
float win=step(.64,fract(vW.x*.11))*step(.46,fract(vW.y*.075))*uWin;float lit=win*step(1.08-uDusk*.95,r+.18*sin(vW.y*.07));
totalEmissiveRadiance+=vec3(1.,.56,.22)*lit;diffuseColor.rgb*=1.+win*.22;`);
  };return m;
}

// district height logic: Downtown, Midtown, tenements, Harlem, Inwood ridge
function heightAt(x,z,i){
  const d=smooth(-10400,-9500,z)*(1-smooth(-7600,-6200,z)),m=smooth(streetZ(25),streetZ(38),z)*(1-smooth(streetZ(65),streetZ(78),z));
  const row=Math.exp(-((z-streetZ(57))**2)/(2*420**2))*smooth(-700,700,x),up=smooth(streetZ(100),streetZ(145),z)*(1-smooth(streetZ(180),L/2,z));
  return 14+rnd(i)*52+d*(80+rnd(i+1)*300)+m*(70+rnd(i+2)*360)+row*(180+rnd(i+3)*420)+up*(20+rnd(i+4)*85);
}
function buildingColor(x,z,i){
  const tall=heightAt(x,z,i)>140,p=tall?[0x293744,0x445a66,0x26313b,0xb8c3c7]:[0x8b4e38,0xa66a48,0xd4c3a3,0x6f756d,0xb9b1a1];
  return new THREE.Color(p[Math.floor(rnd(i+7)*p.length)]).offsetHSL(0,0,(rnd(i+9)-.5)*.08);
}

// tens of thousands of instanced buildings with block-ish footprints and varied rooflines
function addProceduralBuildings(scene,N=26000){
  const mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),city.mats.buildings=makeBuildingMaterial(),N);mesh.frustumCulled=false;
  let n=0,tries=0;while(n<N&&tries<N*4){tries++;let z=mix(-L/2+250,L/2-450,rnd(tries)),w=widthAt(z)*.92,x=mix(-w/2,w/2,rnd(tries+7));if(!inIsland(x,z)||inPark(x,z))continue;
    z=z<streetZ(14)?z:Math.round(z/80)*80+mix(-28,28,rnd(tries+1));x=Math.round(x/52)*52+mix(-9,9,rnd(tries+2));if(!inIsland(x,z)||inPark(x,z))continue;
    let h=heightAt(x,z,tries),sx=mix(18,68,rnd(tries+3)),sz=mix(18,75,rnd(tries+4));O.position.set(x,5+h/2,z);O.scale.set(sx,h,sz);O.rotation.set(0,z<streetZ(10)?mix(-.5,.5,rnd(tries+5)):0,0);O.updateMatrix();
    mesh.setMatrixAt(n,O.matrix);mesh.setColorAt(n,buildingColor(x,z,tries));city.buildings.push({x,z,h,sx,sz});n++}
  mesh.count=n;mesh.instanceColor.needsUpdate=true;scene.add(mesh);city.buildingsMesh=mesh;
}

// merged district meshes for far-tier island readability
function addFarDistrictMeshes(scene){
  const m=mat(0x46515a,{transparent:true,opacity:.72,roughness:.8}),im=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),m,900);let n=0;
  for(let z=-L/2+500;z<L/2-500;z+=360)for(let x=-widthAt(z)/2+120;x<widthAt(z)/2-120;x+=220){if(inPark(x,z))continue;let h=heightAt(x,z,n)*.72;O.position.set(x,h/2+3,z);O.scale.set(180,h,300);O.updateMatrix();im.setMatrixAt(n++,O.matrix)}
  im.count=n;scene.add(im);city.lod.far=im;
}

// landmark set: One WTC, Empire State, Chrysler, Flatiron, supertalls, UN, Grand Central, Met
function tower(s,x,z,sx,sz,h,m){return box(s,x,z,sx,h,sz,m,6)}
function spire(s,x,z,h,r,m,y){let q=new THREE.Mesh(new THREE.ConeGeometry(r,h,10),m);q.position.set(x,y+h/2,z);s.add(q);return q}
function addLandmarks(scene){
  const glass=mat(0x506777,{metalness:.55,roughness:.25}),dark=mat(0x202935,{metalness:.55,roughness:.22}),stone=mat(0xc5b89f,{roughness:.68}),greenGlass=mat(0x38585d,{metalness:.45,roughness:.3});
  tower(scene,-350,-9550,95,95,540,glass);spire(scene,-350,-9550,150,22,glass,550);
  for(let i=0;i<14;i++)tower(scene,mix(-550,420,rnd(i)),mix(-9800,-7900,rnd(i+1)),mix(40,95,rnd(i+2)),mix(40,100,rnd(i+3)),mix(100,330,rnd(i+4)),rnd(i)>.5?glass:dark);
  tower(scene,80,streetZ(34),88,88,380,stone);spire(scene,80,streetZ(34),90,20,stone,390);
  tower(scene,440,streetZ(42),74,74,320,greenGlass);spire(scene,440,streetZ(42),155,28,greenGlass,326);
  let f=new THREE.Mesh(new THREE.CylinderGeometry(1,1,92,3),stone);f.scale.set(70,1,150);f.rotation.y=.35;f.position.set(-70,58,streetZ(23));scene.add(f);
  [[-260,57,420],[0,57,470],[210,58,430],[380,59,390]].forEach(a=>tower(scene,a[0],streetZ(a[1]),56,70,a[2],dark));
  tower(scene,widthAt(streetZ(42))/2-150,streetZ(42),44,220,170,greenGlass);tower(scene,315,streetZ(42),260,180,52,stone);
  tower(scene,455,streetZ(82),180,420,48,stone);
}

// major bridges visible: Brooklyn, Manhattan, Williamsburg, Queensboro, RFK, George Washington
function addBridge(scene,z,x0,x1,h=130){
  const m=city.mats.bridge||(city.mats.bridge=mat(0x746f66,{metalness:.2,roughness:.55})),mid=(x0+x1)/2,len=Math.abs(x1-x0),sg=Math.sign(x1-x0);
  box(scene,mid,z,len,12,28,m,48);[x0+sg*330,x1-sg*330].forEach(x=>box(scene,x,z,45,h,45,m,48));
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(x0,70,z),V(mid,h+75,z),V(x1,70,z)]),32,5,6),m));
  const lm=city.mats.bridgeLight||(city.mats.bridgeLight=new THREE.MeshStandardMaterial({color:0xffd68a,emissive:0xffaa44,emissiveIntensity:0}));city.mats.bridgeLights??=[];city.mats.bridgeLights.push(lm);
  const im=new THREE.InstancedMesh(new THREE.SphereGeometry(7,8,4),lm,64);for(let i=0;i<64;i++){O.position.set(mix(x0,x1,i/63),62,z+(i%2?18:-18));O.scale.setScalar(1);O.updateMatrix();im.setMatrixAt(i,O.matrix)}scene.add(im);
}
function addBridges(scene){
  const E=z=>widthAt(z)/2+80,W=z=>-widthAt(z)/2-80;
  [-8450,-7920,-6500,streetZ(59),streetZ(125)].forEach((z,i)=>addBridge(scene,z,E(z),E(z)+mix(2200,3200,i/4),mix(105,160,i/4)));
  addBridge(scene,streetZ(178),W(streetZ(178)),W(streetZ(178))-3400,185);
}

// rooftop water-tower tank farms catching golden-hour light
function addRooftopWaterTowers(scene,N=2300){
  const im=new THREE.InstancedMesh(new THREE.CylinderGeometry(1,1,1,8),mat(0x6b4d31,{roughness:.7}),N);let n=0,len=city.buildings.length;
  for(let i=0;n<N&&i<len*2;i++){let b=city.buildings[(i*17)%len];if(b.h>230||rnd(i)<.55)continue;
    O.position.set(b.x+mix(-b.sx*.25,b.sx*.25,rnd(i+1)),b.h+22,b.z+mix(-b.sz*.25,b.sz*.25,rnd(i+2)));O.scale.set(mix(5,10,rnd(i+3)),mix(12,26,rnd(i+4)),mix(5,10,rnd(i+5)));O.updateMatrix();im.setMatrixAt(n++,O.matrix)}
  im.count=n;scene.add(im);city.waterTowers=im;
}

// traffic streams: taxis, brake ripples, headlights, avenue/crosstown speed differences
function addTraffic(scene,N=2600){
  const mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(10,4,5),new THREE.MeshStandardMaterial({vertexColors:true,roughness:.45,emissive:0x111111}),N),cars=[];
  for(let i=0;i<N;i++){let r=city.roads[Math.floor(rnd(i)*city.roads.length)];cars.push({r,u:rnd(i+1),lane:mix(-r.w*.35,r.w*.35,rnd(i+2)),speed:(r.kind==="avenue"||r.kind==="highway"?34:18)*mix(.55,1.6,rnd(i+3)),phase:rnd(i+4)*TAU});mesh.setColorAt(i,new THREE.Color(r.kind==="avenue"&&rnd(i+5)>.35?0xffc400:rnd(i+6)>.5?0xffffff:0x9b1d1d))}
  scene.add(mesh);city.traffic=mesh;
  city.updaters.push((t,dt)=>{mesh.count=Math.floor(N*city.params.traffic*city.params.quality);for(let i=0;i<mesh.count;i++){let c=cars[i],r=c.r,dx=r.p1.x-r.p0.x,dz=r.p1.z-r.p0.z;c.u=(c.u+c.speed*dt/r.len)%1;let x=r.p0.x+dx*c.u+dz/r.len*c.lane,z=r.p0.z+dz*c.u-dx/r.len*c.lane;O.position.set(x,8,z);O.rotation.set(0,Math.atan2(dx,dz),0);O.scale.setScalar(1);O.updateMatrix();mesh.setMatrixAt(i,O.matrix);C.set(city.dusk>.4&&Math.sin(t*8+c.phase)>.7?0xff3322:0xffc400);if(i%3)C.set(0xffffff);mesh.setColorAt(i,C)}mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true});
}

// rivers alive: ferries, barges, tour boats and wakes
function addBoats(scene,N=90){
  const boat=new THREE.InstancedMesh(new THREE.BoxGeometry(42,12,14),mat(0xf2efe2,{roughness:.42}),N),wake=new THREE.InstancedMesh(new THREE.BoxGeometry(1,.08,1),mat(0xffffff,{transparent:true,opacity:.22}),N);
  const routes=[[V(-2300,7,-L/2-900),V(-2100,7,L/2+900)],[V(2200,7,L/2+700),V(1900,7,-L/2-800)],[V(-2700,7,-9300),V(3000,7,-8400)]],boats=[];
  for(let i=0;i<N;i++){let r=routes[Math.floor(rnd(i)*routes.length)];boats.push({r,u:rnd(i+1),speed:mix(35,95,rnd(i+2)),off:mix(-180,180,rnd(i+3))})}
  scene.add(boat,wake);city.updaters.push((t,dt)=>{let count=Math.floor(N*city.params.boats*city.params.quality);boat.count=wake.count=count;for(let i=0;i<count;i++){let b=boats[i],a=b.r[0],d=b.r[1].clone().sub(a),len=d.length();b.u=(b.u+b.speed*dt/len)%1;d.normalize();let right=V(d.z,0,-d.x),p=a.clone().add(d.multiplyScalar(b.u*len)).add(right.multiplyScalar(b.off));O.position.copy(p);O.rotation.set(0,Math.atan2(d.x,d.z),0);O.updateMatrix();boat.setMatrixAt(i,O.matrix);O.position.add(d.multiplyScalar(-65));O.scale.set(90,.08,24);O.updateMatrix();wake.setMatrixAt(i,O.matrix)}boat.instanceMatrix.needsUpdate=wake.instanceMatrix.needsUpdate=true});
}

// helicopters, birds over park, jet on approach and contrail
function addAirLife(scene){
  const heli=new THREE.InstancedMesh(new THREE.BoxGeometry(45,10,12),mat(0x202020),12),birds=new THREE.InstancedMesh(new THREE.ConeGeometry(3,8,3),mat(0x111111),180);
  const jet=box(scene,5200,-9400,90,18,38,mat(0xe8e8e8),1500),trail=box(scene,5600,-9500,520,4,8,mat(0xffffff,{transparent:true,opacity:.35}),1510);
  scene.add(heli,birds);city.updaters.push(t=>{for(let i=0;i<12;i++){let z=mix(-L/2,L/2,(t*.018+rnd(i))%1),side=i%2?1:-1,x=side*(widthAt(z)/2+320);O.position.set(x,350+80*Math.sin(t+i),z);O.rotation.set(0,side>0?Math.PI:0,0);O.updateMatrix();heli.setMatrixAt(i,O.matrix)}
    for(let i=0;i<180;i++){O.position.set(mix(-430,430,rnd(i))+Math.sin(t+rnd(i))*15,80+40*rnd(i+2),mix(streetZ(59),streetZ(110),rnd(i+3)));O.scale.setScalar(mix(.7,1.6,rnd(i+4)));O.updateMatrix();birds.setMatrixAt(i,O.matrix)}
    let u=(t*.025)%1;jet.position.set(mix(6200,-5400,u),1500-350*u,mix(-9600,-7800,u));trail.position.copy(jet.position).add(V(420,12,-60));heli.instanceMatrix.needsUpdate=birds.instanceMatrix.needsUpdate=true});
}

// cloud shadows crossing districts
function addCloudShadows(scene,N=6){
  const m=new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.11,depthWrite:false}),im=new THREE.InstancedMesh(new THREE.CircleGeometry(1,32),m,N);scene.add(im);
  city.updaters.push(t=>{for(let i=0;i<N;i++){O.position.set(mix(-2600,2600,(rnd(i)+t*.006)%1),9,mix(-L/2,L/2,(rnd(i+5)+t*.004)%1));O.rotation.set(-Math.PI/2,0,0);O.scale.set(mix(600,1500,rnd(i+2)),mix(300,850,rnd(i+3)),1);O.updateMatrix();im.setMatrixAt(i,O.matrix)}im.instanceMatrix.needsUpdate=true});
}

// closest tier: cornices, fire escapes, rooftop HVAC, awnings, tree pits, steam
function put(g,x,y,z,sx,sy,sz,m){let b=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),m);b.position.set(x,y,z);g.add(b);return b}
function addNearInspectionTier(scene){
  city.near=new THREE.Group();city.steam=[];scene.add(city.near);
  city.updaters.push(t=>{refreshNear(city.camera);city.steam.forEach((s,i)=>{s.position.y=s.userData.y+Math.sin(t*1.7+i)*5;s.material.opacity=.12+.1*Math.sin(t*2+i)})});
}
function refreshNear(camera){
  let key=`${Math.round(camera.position.x/180)},${Math.round(camera.position.z/180)},${camera.position.y<950}`;if(key===city.nearKey)return;city.nearKey=key;city.near.clear();city.steam=[];if(camera.position.y>950)return;
  const iron=mat(0x111111),hvac=mat(0x888b8a),awn=mat(0xaa3333),leaf=mat(0x1c5c2d),steam=mat(0xffffff,{transparent:true,opacity:.16});
  city.buildings.filter(b=>(b.x-camera.position.x)**2+(b.z-camera.position.z)**2<360000).slice(0,70).forEach((b,i)=>{put(city.near,b.x,b.h+12,b.z,16,10,20,hvac);put(city.near,b.x,b.h+4,b.z,b.sx*.9,4,b.sz*.9,mat(0x333333));
    if(rnd(i)>.55){let c=new THREE.Mesh(new THREE.CylinderGeometry(7,7,20,8),mat(0x6b4d31));c.position.set(b.x,b.h+24,b.z);city.near.add(c)}
    for(let f=0;f<Math.min(5,b.h/28);f++)put(city.near,b.x+b.sx/2+1,24+f*18,b.z,2,3,b.sz*.52,iron);put(city.near,b.x,12,b.z+b.sz/2+2,b.sx*.45,5,5,awn)});
  city.roads.filter(r=>(r.p0.distanceTo(camera.position)+r.p1.distanceTo(camera.position))<1800).slice(0,18).forEach((r,i)=>{for(let j=0;j<4;j++){let u=(j+.5)/4,p=r.p0.clone().lerp(r.p1,u);put(city.near,p.x,5,p.z,9,3,9,leaf);let s=new THREE.Mesh(new THREE.SphereGeometry(7,8,6),steam);s.position.set(p.x,13,p.z);s.userData.y=13;city.steam.push(s);city.near.add(s)}})
}

// LOD crossfades: far merged districts, mid instancing, near bespoke detail, no hard popping
function fade(mesh,a){if(!mesh)return;mesh.visible=a>.02;mesh.traverse?mesh.traverse(o=>{if(o.material){o.material.transparent=true;o.material.opacity=a}}):(mesh.material.transparent=true,mesh.material.opacity=a)}
function updateLOD(camera){
  const h=camera.position.y;fade(city.lod.far,smooth(2400,15000,h));fade(city.buildingsMesh,.55+.45*(1-smooth(18000,31000,h)));
  if(city.waterTowers)city.waterTowers.visible=h<6500;if(city.traffic)city.traffic.visible=h<5200;city.near&&(city.near.visible=h<1000);
}

// camera presets with smooth flights: hero, downtown, midtown, park, bridges, GWB
function gotoPreset(name){
  let p=PRESETS[name]||PRESETS.hero;city.fly={u:0,fp:city.camera.position.clone(),ft:city.controls.target.clone(),tp:p.p.clone(),tt:p.t.clone()};
}
function updateFly(dt){
  if(!city.fly)return;let f=city.fly;f.u=clamp(f.u+dt*.55,0,1);let e=smooth(0,1,f.u);city.camera.position.lerpVectors(f.fp,f.tp,e);city.controls.target.lerpVectors(f.ft,f.tt,e);if(f.u===1)city.fly=null;
}

// compact controls: light, traffic density, river density, photo mode, quality, reset
function compactControls(){
  const el=document.createElement("div");Object.assign(el.style,{position:"fixed",right:"10px",bottom:"10px",padding:"6px",background:"#0008",color:"#fff",font:"12px system-ui",borderRadius:"8px"});
  el.innerHTML=`<button data-p="hero">reset</button><button data-p="downtown">downtown</button><button data-p="midtown">midtown</button><button data-p="park">park</button><button data-p="bridges">bridges</button><button data-p="gwb">gwb</button>
  <select id=l><option value=golden>golden</option><option value=noon>noon</option><option value=dusk>dusk</option></select>
  traffic <input id=t type=range min=.1 max=1 step=.1 value=1> river <input id=b type=range min=.1 max=1 step=.1 value=1>
  <select id=q><option>high</option><option>medium</option><option>low</option></select><button id=photo>photo</button>`;
  document.body.appendChild(el);el.onclick=e=>e.target.dataset.p&&gotoPreset(e.target.dataset.p);
  el.querySelector("#l").oninput=e=>setLightMode(e.target.value);el.querySelector("#t").oninput=e=>city.params.traffic=+e.target.value;el.querySelector("#b").oninput=e=>city.params.boats=+e.target.value;el.querySelector("#q").oninput=e=>setQuality(e.target.value);el.querySelector("#photo").onclick=photoMode;
  addEventListener("keydown",e=>({r:"hero",1:"hero",2:"downtown",3:"midtown",4:"park",5:"bridges",6:"gwb"}[e.key]&&gotoPreset({r:"hero",1:"hero",2:"downtown",3:"midtown",4:"park",5:"bridges",6:"gwb"}[e.key])));
}

// quality selector degrades density, window variation and sparkle before island completeness
function setQuality(q){
  const v={low:{d:.6,w:.45,p:1},medium:{d:.82,w:.7,p:1.35},high:{d:1,w:1,p:2}}[q]||{d:1,w:1,p:2};
  city.params.quality=v.d;city.renderer.setPixelRatio(Math.min(devicePixelRatio,v.p,2));
  city.mats.buildings?.userData.shader?.uniforms.uWin&&(city.mats.buildings.userData.shader.uniforms.uWin.value=v.w);
  city.mats.water&&(city.mats.water.uniforms.uSparkle.value=v.w);
}

// photo mode: render current view at clamped high DPR and save
function photoMode(){
  const old=city.renderer.getPixelRatio();city.renderer.setPixelRatio(Math.min(devicePixelRatio,2));city.renderer.render(city.scene,city.camera);
  const a=document.createElement("a");a.href=city.renderer.domElement.toDataURL("image/png");a.download="procedural-manhattan.png";a.click();city.renderer.setPixelRatio(old);
}

// animation loop: continuous world, no loading seams
function animate(){
  requestAnimationFrame(animate);let dt=city.clock.getDelta(),t=city.clock.elapsedTime;
  city.controls.update();updateFly(dt);updateLight(t);updateLOD(city.camera);city.updaters.forEach(f=>f(t,dt));city.renderer.render(city.scene,city.camera);
}

// assemble the whole-island procedural scene
Object.assign(city,boot());
addLight(city.scene);setLightMode("golden");addRivers(city.scene);addIsland(city.scene);addContext(city.scene);
addStreetGrid(city.scene);addBroadway(city.scene);addPiersHighwaysSpecials(city.scene);addCentralPark(city.scene);
addFarDistrictMeshes(city.scene);addProceduralBuildings(city.scene);addRooftopWaterTowers(city.scene);
addLandmarks(city.scene);addBridges(city.scene);addTraffic(city.scene);addBoats(city.scene);addAirLife(city.scene);addCloudShadows(city.scene);
addNearInspectionTier(city.scene);compactControls();heroView();animate();
</script>
