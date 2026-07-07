// LIFE — instanced traffic, boats+wakes, helicopters, birds, jet, steam, crowds, street lights, flags, tram.
(function(){
const A=window.APP;
A.buildLife=function(THREE,S,scene,tram){
const G=A.geo,r=G.rng(31415);
const L={};
// ================= TRAFFIC =================
const lanes=[];
for(const ln of G.LANES){
  const pts=ln.pts;if(!pts||pts.length<2)continue;
  let len=0;const cum=[0];
  for(let i=1;i<pts.length;i++){len+=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][2]-pts[i-1][2]);cum.push(len);}
  if(len<60)continue;
  const ns=Math.max(2,Math.ceil(len/25)+1);
  const sm=new Float32Array(ns*5); // x,y,z,dx,dz
  let seg=0;
  for(let i=0;i<ns;i++){
    const d=Math.min(len-0.01,i*len/(ns-1));
    while(seg<pts.length-2&&cum[seg+1]<d)seg++;
    const t=(d-cum[seg])/Math.max(0.01,cum[seg+1]-cum[seg]);
    const p=pts[seg],q=pts[seg+1];
    const x=p[0]+(q[0]-p[0])*t,y=p[1]+(q[1]-p[1])*t,z=p[2]+(q[2]-p[2])*t;
    let dx=q[0]-p[0],dz=q[2]-p[2];const l=Math.hypot(dx,dz)||1;
    sm[i*5]=x;sm[i*5+1]=y;sm[i*5+2]=z;sm[i*5+3]=dx/l;sm[i*5+4]=dz/l;
  }
  lanes.push({sm,ns,len,speed:ln.speed,taxi:ln.taxi,spacing:ln.spacing,hash:r()*6.28});
}
const cars=[];
for(let li=0;li<lanes.length;li++){
  const ln=lanes[li];
  const n=Math.floor(ln.len/ln.spacing);
  for(let i=0;i<n;i++)cars.push({l:li,off:r()*ln.len,sp:0.8+r()*0.4,taxi:r()<ln.taxi,c:r()});
}
for(let i=cars.length-1;i>0;i--){const j=(r()*(i+1))|0;const tmp=cars[i];cars[i]=cars[j];cars[j]=tmp;}
const NC=cars.length;
const carGeo=new THREE.BoxGeometry(2.1,1.5,4.7);carGeo.translate(0,0.75,0);
const carMesh=new THREE.InstancedMesh(carGeo,S.car(),NC);
carMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
carMesh.frustumCulled=false;
const carCol=new Float32Array(NC*3),carV=new Float32Array(NC);
const CPAL=[[0.92,0.92,0.94],[0.75,0.77,0.80],[0.25,0.27,0.30],[0.55,0.12,0.10],[0.16,0.22,0.38],[0.85,0.85,0.82],[0.3,0.3,0.32]];
for(let i=0;i<NC;i++){
  const c=cars[i];
  const col=c.taxi?[0.98,0.72,0.09]:CPAL[(c.c*CPAL.length)|0];
  carCol[i*3]=col[0];carCol[i*3+1]=col[1];carCol[i*3+2]=col[2];carV[i]=1;
}
carGeo.setAttribute('aCol',new THREE.InstancedBufferAttribute(carCol,3));
const carVAttr=new THREE.InstancedBufferAttribute(carV,1);carVAttr.setUsage(THREE.DynamicDrawUsage);
carGeo.setAttribute('aV',carVAttr);
scene.add(carMesh);
let trafficMul=1;
L.setTraffic=m=>{trafficMul=m;carMesh.count=Math.floor(NC*Math.min(1,m));};
const ME=carMesh.instanceMatrix.array;
function updateCars(t){
  const n=carMesh.count;
  for(let i=0;i<n;i++){
    const c=cars[i],ln=lanes[c.l];
    let s=(c.off+t*ln.speed*c.sp)%ln.len;if(s<0)s+=ln.len;
    const fi=s/ln.len*(ln.ns-1),i0=Math.min(ln.ns-2,fi|0),fr=fi-i0;
    const b0=i0*5,b1=b0+5;
    const x=ln.sm[b0]+(ln.sm[b1]-ln.sm[b0])*fr;
    const y=ln.sm[b0+1]+(ln.sm[b1+1]-ln.sm[b0+1])*fr;
    const z=ln.sm[b0+2]+(ln.sm[b1+2]-ln.sm[b0+2])*fr;
    const dx=ln.sm[b0+3],dz=ln.sm[b0+4];
    const o=i*16;
    ME[o]=dz;ME[o+1]=0;ME[o+2]=-dx;ME[o+3]=0;
    ME[o+4]=0;ME[o+5]=1;ME[o+6]=0;ME[o+7]=0;
    ME[o+8]=dx;ME[o+9]=0;ME[o+10]=dz;ME[o+11]=0;
    ME[o+12]=x;ME[o+13]=y;ME[o+14]=z;ME[o+15]=1;
    if((i&3)===((t*10|0)&3)){ // stagger brake updates
      const wv=ln.speed<15?Math.pow(0.5+0.5*Math.sin(s*0.02-t*1.1+ln.hash),1.4):1;
      carV[i]=0.25+0.75*wv;
    }
  }
  carMesh.instanceMatrix.needsUpdate=true;carVAttr.needsUpdate=true;
}
// ================= BOATS =================
function boatGeo(parts){
  const P=[],N=[],C=[],U=[];
  for(const[g,col]of parts){
    const gg=g.index?g.toNonIndexed():g;
    const p=gg.attributes.position.array,nm=gg.attributes.normal.array;
    const c=typeof col==='string'?[parseInt(col.slice(1,3),16)/255,parseInt(col.slice(3,5),16)/255,parseInt(col.slice(5,7),16)/255]:col;
    for(let i=0;i<p.length;i+=3){P.push(p[i],p[i+1],p[i+2]);N.push(nm[i],nm[i+1],nm[i+2]);C.push(c[0],c[1],c[2]);U.push(0,0);}
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(P,3));
  geo.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));
  geo.setAttribute('uv',new THREE.Float32BufferAttribute(U,2));
  geo.setAttribute('aCol',new THREE.Float32BufferAttribute(C,3));
  return geo;
}
const bx=(w,h,d,x,y,z)=>{const g=new THREE.BoxGeometry(w,h,d);g.translate(x||0,(y||0)+h/2,z||0);return g;};
const GEO_FERRY=boatGeo([[bx(16,4,52),'#e07818'],[bx(13,4,40,0,4),'#f0f0e8'],[bx(10,3,28,0,8),'#e07818'],[bx(2,5,2,0,11),'#404448']]);
const GEO_TOUR=boatGeo([[bx(7,2.5,24),'#f0efe8'],[bx(5.5,2.5,16,0,2.5,-1),'#ffffff'],[bx(4,2,8,0,5,-2),'#3a6ea8']]);
const GEO_BARGE=boatGeo([[bx(13,3,56),'#4a4640'],[bx(11,2,48,0,3),'#6a5a3a'],[bx(6,7,8,0,3,-30),'#a03828']]);
const GEO_SAIL=boatGeo([[bx(2.2,1.2,8),'#e8e6da'],[bx(0.25,11,0.25,0,1),'#c8c2b2'],[bx(0.15,9,3.4,0.1,2,2),'#ffffff']]);
// paths
function coastLoop(){
  const pts=[];
  for(let z=300;z<=20900;z+=650)pts.push([G.edgeW(z)-330,z]);
  pts.push([-950,21750],[-250,22050]);
  for(let z=21100;z>=13400;z-=500)pts.push([G.edgeE(z)+140,z]);
  for(let z=13000;z>=400;z-=650)pts.push([G.edgeE(z)+330,z]);
  pts.push([600,-700],[-500,-900],[-1200,-300]);
  return pts;
}
const PATHS=[
 {pts:coastLoop(),closed:true,speed:7.5,type:1,n:3},
 {pts:[[100,-200],[-500,-1500],[-1100,-3400],[-1700,-6200],[-1900,-7500],[-1500,-7900],[-1100,-6800],[-500,-3000],[-100,-800]],closed:true,speed:9,type:0,n:2},
 {pts:[[-2350,5600],[-2700,6300],[-3000,6700],[-3050,7000],[-2700,6800],[-2300,6200],[-2150,5700]],closed:true,speed:8,type:1,n:2},
 {pts:[[850,500],[1400,900],[1800,2200],[1650,3600],[1750,5000],[1500,6300],[1550,7300],[1620,7900],[1500,7000],[1450,5200],[1550,3000],[1300,1200],[900,700]],closed:true,speed:8.5,type:1,n:3},
 {pts:[[-2450,-500],[-2450,3000],[-2500,8000],[-2600,14000],[-2650,17000],[-2600,19000]],closed:false,speed:3.2,type:2,n:3},
 {pts:[[-2000,-1500],[-2450,-3300],[-2900,-3900],[-3100,-3400],[-2700,-2600],[-2200,-900]],closed:true,speed:6,type:1,n:2},
 {pts:[[-900,-1600],[-1600,-2400],[-2100,-2100],[-1700,-1300],[-1100,-1100]],closed:true,speed:4,type:3,n:4},
 {pts:[[-2350,9000],[-2400,12000],[-2450,15000],[-2400,17800],[-2350,12500],[-2300,9600]],closed:true,speed:6.5,type:1,n:2},
 {pts:[[1450,8300],[1760,9200],[1500,10200],[1760,11000],[1450,12100],[1700,12800]],closed:false,speed:7,type:1,n:2},
];
const boats=[];
for(let pi=0;pi<PATHS.length;pi++){
  const pth=PATHS[pi];
  const pts=pth.pts;let len=0;const cum=[0];
  const P2=pth.closed?pts.concat([pts[0]]):pts;
  for(let i=1;i<P2.length;i++){len+=Math.hypot(P2[i][0]-P2[i-1][0],P2[i][1]-P2[i-1][1]);cum.push(len);}
  for(let b=0;b<pth.n;b++)boats.push({pi,P2,cum,len,off:len*b/pth.n+r()*300,speed:pth.speed*(0.9+r()*0.2),type:pth.type,closed:pth.closed});
}
const NB=boats.length;
const TYPG=[GEO_FERRY,GEO_TOUR,GEO_BARGE,GEO_SAIL];
const boatMeshes=[],boatIdx=[[],[],[],[]];
for(let i=0;i<NB;i++)boatIdx[boats[i].type].push(i);
for(let ty=0;ty<4;ty++){
  const n=boatIdx[ty].length;if(!n){boatMeshes.push(null);continue;}
  const m=new THREE.InstancedMesh(TYPG[ty],S.boat(),n);
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);m.frustumCulled=false;
  scene.add(m);boatMeshes.push(m);
}
// wakes
const wakeGeo=new THREE.BufferGeometry();
wakeGeo.setAttribute('position',new THREE.Float32BufferAttribute([-0.5,0,0, 0.5,0,0, 0.5,0,1, -0.5,0,1],3));
wakeGeo.setAttribute('uv',new THREE.Float32BufferAttribute([0,0, 1,0, 1,1, 0,1],2));
wakeGeo.setIndex([0,1,2,0,2,3]);
const wakeMesh=new THREE.InstancedMesh(wakeGeo,S.wake(),NB);
wakeMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);wakeMesh.frustumCulled=false;wakeMesh.renderOrder=3;
scene.add(wakeMesh);
const WE=wakeMesh.instanceMatrix.array,BE=[];
let boatMul=1;
L.setBoats=m=>{boatMul=m;};
function updateBoats(t){
  const cnt=[0,0,0,0];
  const act=Math.ceil(NB*Math.min(1.5,boatMul));
  for(let i=0;i<NB;i++){
    const b=boats[i];
    const m=boatMeshes[b.type];if(!m)continue;
    const slot=cnt[b.type]++;
    let d=(b.off+t*b.speed)%b.len;if(d<0)d+=b.len;
    let seg=0;const cum=b.cum,P2=b.P2;
    while(seg<P2.length-2&&cum[seg+1]<d)seg++;
    const tt=(d-cum[seg])/Math.max(0.01,cum[seg+1]-cum[seg]);
    const p=P2[seg],q=P2[seg+1];
    const x=p[0]+(q[0]-p[0])*tt,z=p[1]+(q[1]-p[1])*tt;
    let dx=q[0]-p[0],dz=q[1]-p[1];const l=Math.hypot(dx,dz)||1;dx/=l;dz/=l;
    const hide=i>=act?0:1;
    const M=new THREE.Matrix4();
    M.set(dz*hide,0,dx*hide,x, 0,hide,0,0.2, -dx*hide,0,dz*hide,z, 0,0,0,1);
    m.setMatrixAt(slot,M);
    // wake
    const wl=b.speed*(10+b.type*2)*hide,ww=(b.type===0?22:b.type===2?16:9)*hide;
    const wo=i*16;
    WE[wo]=dz*ww;WE[wo+1]=0;WE[wo+2]=-dx*ww;WE[wo+3]=0;
    WE[wo+4]=0;WE[wo+5]=1;WE[wo+6]=0;WE[wo+7]=0;
    WE[wo+8]=-dx*wl;WE[wo+9]=0;WE[wo+10]=-dz*wl;WE[wo+11]=0;
    WE[wo+12]=x-dx*10;WE[wo+13]=0.35;WE[wo+14]=z-dz*10;WE[wo+15]=1;
  }
  for(const m of boatMeshes)if(m)m.instanceMatrix.needsUpdate=true;
  wakeMesh.instanceMatrix.needsUpdate=true;
}
// ================= HELICOPTERS =================
const helis=[];
for(let i=0;i<3;i++){
  const g=new THREE.Group();
  const body=new THREE.Mesh(boatGeo([[bx(2.4,2.4,7),'#28303a'],[bx(0.8,1,6,0,0.8,-5),'#28303a']]),S.solid());
  const rotor=new THREE.Mesh(new THREE.BoxGeometry(11,0.12,0.7),S.solid());
  rotor.geometry.setAttribute('aCol',new THREE.Float32BufferAttribute(new Array(rotor.geometry.attributes.position.count*3).fill(0.15),3));
  rotor.position.y=2.8;g.add(body,rotor);
  g.userData={rotor,phase:i*7,riv:i===2};
  scene.add(g);helis.push(g);
}
function updateHelis(t,dt){
  for(const h of helis){
    const u=h.userData,tt=t*0.011+u.phase;
    const zz=(Math.sin(tt)*0.5+0.5)*18500+500;
    const x=u.riv?G.edgeE(zz)+420:G.edgeW(zz)-420-(u.phase*30%200);
    const dirZ=Math.cos(tt)>0?1:-1;
    h.position.set(x,260+40*Math.sin(t*0.2+u.phase),zz);
    h.rotation.y=dirZ>0?0:Math.PI;
    h.rotation.z=0.06*dirZ;
    u.rotor.rotation.y+=dt*28;
  }
}
// ================= JET + CONTRAILS =================
const jetPath={a:[5600,980,-2600],b:[2900,190,15800]};
const jet=new THREE.Mesh(boatGeo([[bx(3.4,3,26),'#e8eaee'],[bx(26,0.8,6,0,0.4,2),'#dfe2e8'],[bx(10,0.8,4,0,2.6,-11),'#dfe2e8'],[bx(0.8,5,4,0,0,-11),'#dfe2e8']]),S.solid());
scene.add(jet);
function ribbon(a,b,w){
  const pos=[],uv=[],ix=[];
  const dx=b[0]-a[0],dz=b[2]-a[2],l=Math.hypot(dx,dz);
  const px=-dz/l*w,pz=dx/l*w;
  const NSEG=60;
  for(let i=0;i<=NSEG;i++){
    const t=i/NSEG,x=a[0]+dx*t,y=a[1]+(b[1]-a[1])*t,z=a[2]+dz*t;
    pos.push(x-px,y,z-pz, x+px,y,z+pz);uv.push(0,t, 1,t);
    if(i<NSEG){const q=i*2;ix.push(q,q+1,q+2, q+1,q+3,q+2);}
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  g.setIndex(ix);
  return g;
}
const jetHead={value:0};
const jetTrail=new THREE.Mesh(ribbon(jetPath.a,jetPath.b,9),S.trail(jetHead));
jetTrail.frustumCulled=false;jetTrail.renderOrder=3;scene.add(jetTrail);
const ct1h={value:0.7},ct2h={value:1.1};
const ct1=new THREE.Mesh(ribbon([-9000,2700,3000],[8000,2800,9000],16),S.trail(ct1h));
const ct2=new THREE.Mesh(ribbon([7000,3100,-2000],[-6000,3000,17000],18),S.trail(ct2h));
ct1.frustumCulled=false;ct2.frustumCulled=false;ct1.renderOrder=3;ct2.renderOrder=3;
scene.add(ct1,ct2);
function updateJet(t){
  const tt=(t*0.008)%1.25;
  jetHead.value=tt;
  const p=jetPath;
  const x=p.a[0]+(p.b[0]-p.a[0])*tt,y=p.a[1]+(p.b[1]-p.a[1])*tt,z=p.a[2]+(p.b[2]-p.a[2])*tt;
  jet.position.set(x,y,z);
  jet.rotation.y=Math.atan2(p.b[0]-p.a[0],p.b[2]-p.a[2]);
  jet.visible=tt<1.0;
  ct1h.value=0.2+((t*0.004)%1.1);ct2h.value=0.3+((t*0.003)%1.2);
}
// ================= BIRDS =================
const NBIRD=64;
const birdGeo=new THREE.BufferGeometry();
birdGeo.setAttribute('position',new THREE.Float32BufferAttribute([-1.3,0,0.5, 0,0,-0.6, 0,0.15,0.15, 1.3,0,0.5, 0,0,-0.6, 0,0.15,0.15],3));
birdGeo.setAttribute('normal',new THREE.Float32BufferAttribute([0,1,0, 0,1,0, 0,1,0, 0,1,0, 0,1,0, 0,1,0],3));
birdGeo.setAttribute('uv',new THREE.Float32BufferAttribute(new Array(12).fill(0),2));
birdGeo.setAttribute('aCol',new THREE.Float32BufferAttribute(new Array(18).fill(0.12),3));
const birdMesh=new THREE.InstancedMesh(birdGeo,S.boat(),NBIRD);
birdMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);birdMesh.frustumCulled=false;
scene.add(birdMesh);
const FLOCKS=[[-420,90,9800,120],[-500,80,11400,90],[500,60,-500,150],[-1050,110,20400,100]];
const birdM=new THREE.Matrix4();
function updateBirds(t){
  for(let i=0;i<NBIRD;i++){
    const f=FLOCKS[i%FLOCKS.length];
    const ph=i*0.7,w=0.14+0.02*(i%5);
    const a=t*w+ph;
    const x=f[0]+Math.cos(a)*f[3]*(1+0.2*Math.sin(ph)),z=f[2]+Math.sin(a)*f[3]*0.7;
    const y=f[1]+Math.sin(t*0.5+ph)*12;
    const dx=-Math.sin(a),dz=Math.cos(a)*0.7;const l=Math.hypot(dx,dz)||1;
    const fl=0.6+0.55*Math.sin(t*9+ph*3);
    birdM.set(dz/l*1.2,0,dx/l*1.2,x, 0,fl,0,y, -dx/l*1.2,0,dz/l*1.2,z, 0,0,0,1);
    birdMesh.setMatrixAt(i,birdM);
  }
  birdMesh.instanceMatrix.needsUpdate=true;
}
// ================= STEAM =================
let steamMesh=null;
{
  const sites=G.STEAM||[];
  if(sites.length){
    const q=new THREE.BufferGeometry();
    q.setAttribute('position',new THREE.Float32BufferAttribute([-0.5,0,0, 0.5,0,0, 0.5,1,0, -0.5,1,0],3));
    q.setAttribute('uv',new THREE.Float32BufferAttribute([0,0, 1,0, 1,1, 0,1],2));
    q.setIndex([0,1,2,0,2,3]);
    const n=sites.length;
    steamMesh=new THREE.InstancedMesh(q,S.steam(),n);
    const sd=new Float32Array(n);
    const M=new THREE.Matrix4();
    for(let i=0;i<n;i++){M.makeTranslation(sites[i].x,sites[i].y,sites[i].z);steamMesh.setMatrixAt(i,M);sd[i]=r();}
    q.setAttribute('aSeed',new THREE.InstancedBufferAttribute(sd,1));
    steamMesh.frustumCulled=false;steamMesh.renderOrder=4;
    scene.add(steamMesh);
  }
}
// ================= CROWDS =================
let crowdPts=null;
{
  const pos=[],ph=[];
  const zones=[[5450,7950,-860,440],[250,1650,-600,700],[2650,3450,-400,600],[4250,4650,-200,400],[13150,13450,-800,300]];
  for(const av of G.AVENUES){
    if(av.skip||av.rside)continue;
    for(const zn of zones){
      const z0=Math.max(zn[0],av.pts?av.pts[0][1]:av.z0),z1=Math.min(zn[1],av.pts?av.pts[av.pts.length-1][1]:av.z1);
      for(let z=z0;z<z1;z+=5.5){
        const x=av.pts?G.polyX(av.pts,z):av.x;
        if(x<zn[2]||x>zn[3])continue;
        for(const s of[-1,1]){
          if(r()<0.35)continue;
          const px=x+s*(av.w/2+2+r()*3.5),pz=z+(r()-0.5)*3;
          pos.push(px,G.terrain(px,pz)+1.0,pz);
          const corner=Math.abs(((z%80)+80)%80-40)>28;
          ph.push(corner?(Math.floor(z/80)*0.13)%1:r());
        }
      }
    }
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute('aP',new THREE.Float32BufferAttribute(ph,1));
  crowdPts=new THREE.Points(g,S.crowd());crowdPts.frustumCulled=false;crowdPts.renderOrder=2;
  scene.add(crowdPts);
}
// ================= STREET LIGHTS =================
{
  const pos=[],ii=[];
  for(const av of G.AVENUES){
    if(av.skip)continue;
    const z0=av.pts?av.pts[0][1]:(av.rside?9200:av.z0),z1=av.pts?av.pts[av.pts.length-1][1]:(av.rside?19500:av.z1);
    let flip=1;
    for(let z=z0;z<z1;z+=46){
      const x=av.rside?G.edgeW(z)+105:(av.pts?G.polyX(av.pts,z):av.x);
      pos.push(x+flip*(av.w/2-1),G.terrain(x,z)+7,z);ii.push(r());flip=-flip;
    }
  }
  for(const st of G.STREETS){
    if(!st.two)continue;
    const wE=G.edgeW(st.z)+60,eE=G.edgeE(st.z)-60;
    for(let x=wE;x<eE;x+=64){
      if(st.z>7900&&st.z<11980&&x>-850&&x<10&&![66,79,86,97].includes(st.n))continue;
      pos.push(x,G.terrain(x,st.z)+7,st.z);ii.push(r());
    }
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute('aI',new THREE.Float32BufferAttribute(ii,1));
  const m=S.glow('#ffb45e',0);m.uniforms.uGate=S.U.uNight;
  const p=new THREE.Points(g,m);p.frustumCulled=false;scene.add(p);
  L.streets=p;
}
// ================= FLAGS =================
{
  const F=G.FLAGS||[];
  if(F.length){
    const pole=new THREE.BoxGeometry(0.2,7,0.2);pole.translate(0,3.5,0);
    const flag=new THREE.PlaneGeometry(3.2,1.8,6,2);flag.translate(1.7,6,0);
    const geo=A.mergeGeos(THREE,[pole,flag]);
    const n=F.length;
    const m=new THREE.InstancedMesh(geo,S.flag(),n);
    const col=new Float32Array(n*3);
    const CC=[[0.75,0.12,0.12],[0.9,0.9,0.95],[0.15,0.2,0.5],[0.9,0.65,0.1]];
    const M=new THREE.Matrix4();
    for(let i=0;i<n;i++){
      M.makeRotationY(r()*6.28);M.setPosition(F[i].x,F[i].y,F[i].z);
      m.setMatrixAt(i,M);
      const c=CC[F[i].c!==undefined?(F[i].c%CC.length):(i%CC.length)];
      col[i*3]=c[0];col[i*3+1]=c[1];col[i*3+2]=c[2];
    }
    geo.setAttribute('aCol',new THREE.InstancedBufferAttribute(col,3));
    m.frustumCulled=false;scene.add(m);
  }
}
// ================= TRAM CABINS =================
const cabins=[];
if(tram){
  for(let i=0;i<2;i++){
    const c=new THREE.Mesh(boatGeo([[bx(3.4,3,5),'#c03028'],[bx(0.3,2,0.3,0,3),'#333333']]),S.solid());
    scene.add(c);cabins.push(c);
  }
}
function updateTram(t){
  if(!tram)return;
  for(let i=0;i<2;i++){
    let tt=((t*0.02+i*0.5)%1);tt=tt<0.5?tt*2:2-tt*2;
    const x=tram.a[0]+(tram.b[0]-tram.a[0])*tt;
    const y=tram.a[1]+(tram.b[1]-tram.a[1])*tt-Math.sin(tt*Math.PI)*6-2.5;
    cabins[i].position.set(x,y,tram.a[2]+(i?4:-4));
  }
}
L.steam=steamMesh;L.crowd=crowdPts;
L.update=function(t,dt){
  updateCars(t);updateBoats(t);updateHelis(t,dt);updateJet(t);updateBirds(t);updateTram(t);
};
return L;
};
})();
