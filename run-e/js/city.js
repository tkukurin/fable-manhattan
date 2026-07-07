// CITY — ground, roads(+traffic lanes), parks, trees, procedural buildings, boroughs, shadows.
(function(){
const A=window.APP;
const PALS=[
 [['#2b3541','#33404e','#27313d','#3a4a5c','#42505f'],0.85], // 0 dark glass
 [['#28414a','#2e4b52','#24424e','#356066'],0.80],           // 1 blue-green glass
 [['#b3a58c','#c0b299','#a99b82','#cbbda4','#b8a684'],0.30], // 2 limestone
 [['#8f5340','#9d5d47','#7c4736','#a4674e','#6f3f30'],0.18], // 3 brick
 [['#6e4a3a','#7a5342','#5f4032','#83604d'],0.15],           // 4 brownstone
 [['#d9d0bf','#e3dac9','#cfc6b4','#d6c9b2'],0.32],           // 5 terracotta white
 [['#96705a','#8a6650','#9c7660'],0.20],                     // 6 project brick
 [['#9a968c','#a8a49a','#8f8b81'],0.25],                     // 7 civic gray
 [['#b9bcc0','#c8cbd0','#aeb3ba'],0.55],                     // 8 modern panel
];
function hex(h){const n=parseInt(h.slice(1),16);return[(n>>16&255)/255,(n>>8&255)/255,(n&255)/255];}
A.buildCity=function(THREE,S,scene){
const G=A.geo,r=G.rng(20260704);
const H={boro:[],chunks:[],treeM:[],clutter:[]};
const BI=[]; // building instances {x,y,z,sx,sy,sz,rot,c:[3],i:[4]}
const pcol=(pal,rr)=>{const arr=PALS[pal][0];const c=hex(arr[(rr()*arr.length)|0]);const v=0.8+rr()*0.22;return[c[0]*v,c[1]*v,c[2]*v];};
const addB=(x,z,w,d,h,rot,pal,rr,opts)=>{
  opts=opts||{};
  const ty=G.terrain(x,z), y=ty-1.5, glass=PALS[pal][1]*(0.85+rr()*0.3);
  const seed=rr(), lit=0.6+rr()*0.8;
  let em=0; if((pal===2||pal===5)&&rr()<0.07)em=2;
  const c=opts.c||pcol(pal,rr);
  const rec={x,y,z,sx:w,sy:h+1.5,sz:d,rot,c,i:[seed,glass,lit,em]};
  BI.push(rec); G.SHADOWS.push(rec);
  if(h>85&&!opts.flat){ // setbacks
    const w2=w*(0.58+rr()*0.14),d2=d*(0.58+rr()*0.14),h2=h*(0.42+rr()*0.2);
    BI.push({x,y:y+h*0.98,z,sx:w2,sy:h2,sz:d2,rot,c,i:[seed+0.31,glass,lit,em]});
    if(h>170){BI.push({x,y:y+h*0.98+h2*0.95,z,sx:w2*0.55,sy:h2*0.55,sz:d2*0.55,rot,c,i:[seed+0.57,glass,lit,em]});}
  }else if(h>45&&(pal===2||pal===5)&&rr()<0.6){
    BI.push({x,y:y+h,z,sx:w*0.72,sy:h*0.35,sz:d*0.72,rot,c,i:[seed+0.31,glass,lit,em]});
  }
  const topY=ty+h*(h>85?1.4:(h>45&&(pal===2||pal===5)?1.35:1.0));
  if(h>18&&h<95&&pal>=2&&pal<=6&&rr()<0.45)
    G.WTOWERS.push({x:x+(rr()-0.5)*w*0.5,z:z+(rr()-0.5)*d*0.5,y:ty+h-1,s:2.4+rr()*1.4});
  if(h>22&&rr()<0.4)
    G.HVAC.push({x:x+(rr()-0.5)*w*0.55,z:z+(rr()-0.5)*d*0.55,y:ty+h-0.5,s:2+rr()*3,h:1.5+rr()*2});
};
// ================= ROADS =================
const RS={pos:[],uv:[],w:[],idx:[]};
function road(pts,w,lift,elevFn){
  // pts [[x,z],...] ; adds strip + returns polyline w/ y for lanes
  const P=[];let total=0;
  for(let i=0;i<pts.length;i++){
    const p=pts[i];
    let y=(elevFn?elevFn(p[0],p[1]):G.terrain(p[0],p[1]))+lift;
    if(i>0)total+=Math.hypot(p[0]-pts[i-1][0],p[1]-pts[i-1][1]);
    P.push([p[0],y,p[1],total]);
  }
  const base=RS.pos.length/3;
  for(let i=0;i<P.length;i++){
    const p=P[i],q=P[Math.min(i+1,P.length-1)],o=P[Math.max(i-1,0)];
    let dx=q[0]-o[0],dz=q[2]-o[2];const l=Math.hypot(dx,dz)||1;dx/=l;dz/=l;
    const nx=-dz,nz=dx,hw=w/2;
    RS.pos.push(p[0]+nx*hw,p[1],p[2]+nz*hw, p[0]-nx*hw,p[1],p[2]-nz*hw);
    RS.uv.push(-hw,p[3], hw,p[3]); RS.w.push(w,w);
    if(i<P.length-1){const b=base+i*2;RS.idx.push(b,b+1,b+2, b+1,b+3,b+2);}
  }
  return P;
}
function lane(P,off,dir,speed,opts){
  opts=opts||{};
  const pts=[];const n=P.length;
  for(let k=0;k<n;k++){
    const j=dir>0?k:n-1-k, p=P[j],q=P[Math.min(j+1,n-1)],o=P[Math.max(j-1,0)];
    let dx=q[0]-o[0],dz=q[2]-o[2];const l=Math.hypot(dx,dz)||1;dx/=l;dz/=l;
    pts.push([p[0]-dz*off,p[1]+0.55,p[2]+dx*off]);
  }
  G.LANES.push({pts,speed,taxi:opts.taxi||0.16,spacing:opts.spacing||34});
}
// avenues
for(const av of G.AVENUES){
  if(av.skip)continue;
  let pts;
  if(av.pts)pts=av.pts.map(p=>[p[0],p[1]]);
  else if(av.rside){pts=[];for(let z=9180;z<=19560;z+=260)pts.push([G.edgeW(z)+105,z]);}
  else{pts=[];for(let z=av.z0;z<=av.z1;z+=180)pts.push([av.x,z]);if(pts[pts.length-1][1]<av.z1)pts.push([av.x,av.z1]);}
  const P=road(pts,av.w,0.30);
  const taxi=(av.name==='Bwy'||av.x===0||Math.abs(av.x||99)<600)?0.32:0.15;
  if(av.dir===0){lane(P,-4.6,1,10.5,{taxi,spacing:46});lane(P,-1.6,1,11.5,{taxi,spacing:46});lane(P,1.6,-1,10.5,{taxi,spacing:46});lane(P,4.6,-1,11.5,{taxi,spacing:46});}
  else{const d=av.dir;lane(P,-4.5,d,10,{taxi,spacing:44});lane(P,0,d,12,{taxi,spacing:44});lane(P,4.5,d,10.5,{taxi,spacing:44});}
}
// cross streets
const TRANSV=new Set([66,79,86,97]);
for(const st of G.STREETS){
  const z=st.z,wE=G.edgeW(z)+52,eE=G.edgeE(z)-52;
  if(eE-wE<80)continue;
  let segs=[[wE,eE]];
  const inPk=z>7900&&z<11980;
  if(inPk&&!TRANSV.has(st.n))segs=[[wE,-856],[14,eE]];
  if(st.n>=1&&st.n<=13)segs=[[-450,eE]]; // below 14th: east side grid only
  for(const sg of segs){
    if(sg[1]-sg[0]<60)continue;
    const pts=[];for(let x=sg[0];x<=sg[1];x+=Math.max(60,(sg[1]-sg[0])/6))pts.push([x,z]);
    if(pts[pts.length-1][0]<sg[1])pts.push([sg[1],z]);
    const P=road(pts,st.w,0.42+((st.n%3)*0.05));
    if(st.two){lane(P,-3.2,1,8,{spacing:74});lane(P,3.2,-1,8,{spacing:74});}
    else{const d=(st.n%2===0)?1:-1;if((st.n%3)!==0)lane(P,0,d,8.5,{spacing:72});}
  }
}
// lower manhattan verticals
const LOWV=[[[-250,300],[-250,2800]],[[230,1450],[230,2600]],[[320,2600],[380,3450]],[[820,300],[900,1500]]];
for(const lv of LOWV){const pts=[];const n=5;for(let i=0;i<=n;i++)pts.push([lv[0][0]+(lv[1][0]-lv[0][0])*i/n,lv[0][1]+(lv[1][1]-lv[0][1])*i/n]);
 const P=road(pts,16,0.36);lane(P,-1.7,1,8,{}),lane(P,1.7,-1,8,{});}
// highways
{ // West Side Hwy + Henry Hudson viaduct
  const pts=[];for(let z=200;z<=20400;z+=240){pts.push([G.edgeW(z)+42,z]);}
  const P=road(pts,19,0.36,(x,z)=>{const t=G.terrain(x,z);const v=10*A.geo.smooth(12350,12750,z)*A.geo.smooth(13650,13250,z);return t+v;});
  lane(P,-6.2,1,24,{spacing:64});lane(P,-3.2,1,26,{spacing:64});lane(P,3.2,-1,26,{spacing:64});lane(P,6.2,-1,24,{spacing:64});
}
{ // FDR + Harlem River Drive
  const pts=[];for(let z=140;z<=17200;z+=240){pts.push([G.edgeE(z)-36,z]);}
  const P=road(pts,18,0.36,(x,z)=>{const t=G.terrain(x,z);const v=9*A.geo.smooth(1350,1750,z)*A.geo.smooth(9400,9000,z);return t+v;});
  lane(P,-5.8,1,23,{spacing:62});lane(P,-2.9,1,25,{spacing:62});lane(P,2.9,-1,25,{spacing:62});lane(P,5.8,-1,23,{spacing:62});
  for(let z=1500;z<=9100;z+=90){const x=G.edgeE(z)-36;BI.push({x,y:G.terrain(x,z)-1,z,sx:3,sy:10.5,sz:3,rot:0,c:[0.42,0.42,0.44],i:[0.5,0,0.5,0]});}
}
// park transverse + drives visual (loop drive drawn in canvas; transverses are streets above)
const roadGeo=new THREE.BufferGeometry();
roadGeo.setAttribute('position',new THREE.Float32BufferAttribute(RS.pos,3));
roadGeo.setAttribute('uv',new THREE.Float32BufferAttribute(RS.uv,2));
roadGeo.setAttribute('aW',new THREE.Float32BufferAttribute(RS.w,1));
roadGeo.setIndex(RS.idx);
const roadMesh=new THREE.Mesh(roadGeo,S.road());roadMesh.renderOrder=1;roadMesh.frustumCulled=false;
scene.add(roadMesh);H.road=roadMesh;
// ================= GROUND =================
{
  const NZ=440,NU=27,pos=[],col=[],idx=[];
  const cGrid=hex('#726d64'),cGreen=hex('#42642f'),cForest=hex('#324f26'),cCem=hex('#4f6b3a'),cSand=hex('#67615a');
  for(let i=0;i<=NZ;i++){
    const z=-60+(21620/NZ)*i,w=G.edgeW(z),e=G.edgeE(z);
    for(let j=0;j<NU;j++){
      let x,y,c;
      if(j===0){x=w-26;y=-2.5;c=cSand;}
      else if(j===NU-1){x=e+26;y=-2.5;c=cSand;}
      else{
        const u=(j-1)/(NU-3);x=w+(e-w)*u;y=G.terrain(x,z);
        const pk=G.inPark(x,z);
        c=pk?(pk==='forest'?cForest:pk==='cemetery'?cCem:cGreen):cGrid;
        if(!pk){
          if(z<320)c=cGreen;
          else if(x<w+130&&z>150&&z<1500)c=cGreen;
          else{const n=(Math.sin(x*0.01)*Math.sin(z*0.013)+1)*0.5;c=[cGrid[0]*(0.9+n*0.2),cGrid[1]*(0.9+n*0.2),cGrid[2]*(0.9+n*0.2)];}
        }
      }
      pos.push(x,y,z);col.push(c[0],c[1],c[2]);
    }
  }
  for(let i=0;i<NZ;i++)for(let j=0;j<NU-1;j++){
    const a=i*NU+j,b=a+NU;idx.push(a,b,a+1, a+1,b,b+1);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute('aCol',new THREE.Float32BufferAttribute(col,3));
  g.setIndex(idx);
  const m=new THREE.Mesh(g,S.ground());m.frustumCulled=false;scene.add(m);
}
// borough ground slabs
function slab(x0,z0,x1,z1,cHex,n){
  const c=hex(cHex),pos=[],col=[],idx=[];const N=n||8;
  for(let i=0;i<=N;i++)for(let j=0;j<=N;j++){
    const x=x0+(x1-x0)*j/N,z=z0+(z1-z0)*i/N;
    pos.push(x,3.2,z);const v=0.85+((i*7+j*13)%10)*0.03;col.push(c[0]*v,c[1]*v,c[2]*v);
  }
  for(let i=0;i<N;i++)for(let j=0;j<N;j++){const a=i*(N+1)+j,b=a+N+1;idx.push(a,b,a+1,a+1,b,b+1);}
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute('aCol',new THREE.Float32BufferAttribute(col,3));
  g.setIndex(idx);
  const m=new THREE.Mesh(g,S.ground());scene.add(m);return m;
}
const eShore=z=>z<150?G.edgeE(150)+700+(150-z)*0.55:G.edgeE(z)+(z<2000?700:z<4000?620:z<7500?900:z<11600?760:z<13300?820:270);
const wShore=z=>G.edgeW(z)-1300;
function shoreRibbon(shoreFn,dir,steps,z0,z1,cHex){
  const c=hex(cHex),pos=[],col=[],idx=[];
  const NZr=Math.max(8,Math.round((z1-z0)/260));
  for(let i=0;i<=NZr;i++){
    const z=z0+(z1-z0)*i/NZr;const sx=shoreFn(Math.max(-4000,Math.min(z,21560)));
    for(let j=0;j<steps.length;j++){
      pos.push(sx+steps[j]*dir,3.1,z);
      const v=0.82+(((i*7+j*13)%11))*0.03;
      col.push(c[0]*v,c[1]*v,c[2]*v);
    }
  }
  const NS=steps.length;
  for(let i=0;i<NZr;i++)for(let j=0;j<NS-1;j++){const a=i*NS+j,b=a+NS;idx.push(a,b,a+1,a+1,b,b+1);}
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute('aCol',new THREE.Float32BufferAttribute(col,3));
  g.setIndex(idx);
  const m=new THREE.Mesh(g,S.ground());m.frustumCulled=false;scene.add(m);return m;
}
const STP=[0,60,180,420,900,1800,3400,6000,9500,14000,20000];
shoreRibbon(eShore,1,STP,-2600,21900,'#454138');      // Brooklyn/Queens/Bronx east
shoreRibbon(wShore,-1,STP,-4600,21900,'#48443c');     // New Jersey
slab(1500,-4900,20000,-2550,'#3f3b34',5);             // south Brooklyn
slab(-22000,22280,20000,34000,'#454b3d',6);           // Bronx/Riverdale north
slab(5100,-10000,20000,-4880,'#3f3b34',4);
// Palisades cliffs wedge (NJ, z north)
{
  const pos=[],col=[],idx=[];const cTop=hex('#4a5c38'),cFace=hex('#6b5a48');
  let vi=0;
  for(let z=8800;z<=21800;z+=400){
    const xe=G.edgeW(Math.min(z,21500))-1300;
    const h=70*A.geo.smooth(8800,10500,z);
    pos.push(xe,3.5,z, xe-260,3.5+h,z, xe-1400,6+h,z);
    col.push(cFace[0],cFace[1],cFace[2], cTop[0],cTop[1],cTop[2], cTop[0]*0.9,cTop[1]*0.9,cTop[2]*0.9);
    if(vi>0){const b=(vi-1)*3;idx.push(b,b+3,b+1, b+1,b+3,b+4, b+1,b+4,b+2, b+2,b+4,b+5);}
    vi++;
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute('aCol',new THREE.Float32BufferAttribute(col,3));
  g.setIndex(idx);const m=new THREE.Mesh(g,S.ground());scene.add(m);
}
// ================= PROCEDURAL BUILDINGS =================
function avesAt(z){
  const xs=[];
  for(const av of G.AVENUES){
    if(av.skip)continue;
    if(av.pts){const p=av.pts;if(z>=p[0][1]&&z<=p[p.length-1][1])xs.push({x:G.polyX(p,z),w:av.w});}
    else if(av.rside){if(z>=9180&&z<=19560)xs.push({x:G.edgeW(z)+105,w:av.w});}
    else if(z>=av.z0&&z<=av.z1)xs.push({x:av.x,w:av.w});
  }
  xs.push({x:G.edgeW(z)+52,w:18},{x:G.edgeE(z)-52,w:18});
  xs.sort((a,b)=>a.x-b.x);
  return xs;
}
// grid zone rows
const rows=G.STREETS.filter(s=>s.z>3440&&s.z<20800).sort((a,b)=>a.z-b.z);
for(let ri=0;ri<rows.length-1;ri++){
  const s0=rows[ri],s1=rows[ri+1];const gap=s1.z-s0.z;
  if(gap<50||gap>170)continue;
  const zm=(s0.z+s1.z)/2;
  const xs=avesAt(zm);
  for(let ai=0;ai<xs.length-1;ai++){
    const xa=xs[ai].x+xs[ai].w/2+5,xb=xs[ai+1].x-xs[ai+1].w/2-5;
    const W=xb-xa;if(W<34)continue;
    const zN=s1.z-s1.w/2-2,zS=s0.z+s0.w/2+2;
    for(const side of[0,1]){
      let cur=xa+2;
      while(cur<xb-11){
        const near5th=zm>5600&&zm<7950&&xa>-800&&xb<420;
        let lw=near5th?24+r()*34:12+r()*16;
        if(cur<xa+6||cur+lw>xb-16)lw+=7;
        lw=Math.min(lw,xb-cur-2);
        if(lw<10)break;
        const cx=cur+lw/2;
        const dep=Math.min((zN-zS)*0.47,15+r()*13);
        const cz=side?zN-dep/2:zS+dep/2;
        if(!(zm<4360&&cx<-430)&&!G.reserved(cx,cz)&&G.inIsland(cx,cz,45)){
          const onAve=(cur<xa+8)||(cur+lw>xb-14);
          const d=G.districts(cx,zm,r,onAve);
          addB(cx,cz,lw-2.2,dep,d.h,0,d.pal,r);
        }
        cur+=lw+ (r()<0.12?3:0.4);
      }
    }
  }
}
// irregular zones (downtown + village)
const ZONES=[
 {z0:60,z1:1620,rot:0.34,px:92,pz:148},
 {z0:1620,z1:2620,rot:0.10,px:100,pz:170},
 {z0:2620,z1:3450,rot:-0.06,px:95,pz:185},
 {z0:3450,z1:4360,rot:-0.33,px:88,pz:150,x1:-430},
];
for(const Z of ZONES){
  const cz=(Z.z0+Z.z1)/2,co=Math.cos(Z.rot),si=Math.sin(Z.rot);
  const halfZ=(Z.z1-Z.z0)/2;
  // rotated street lattice roads
  for(let q=-30;q<=30;q++){
    // family A (cross-ish)
    const pts=[];let has=false;
    for(let s=-2400;s<=2400;s+=110){
      const lx=s,lz=q*Z.pz;
      const x=lx*co-lz*si, z=cz+lx*si+lz*co;
      if(z>Z.z0-40&&z<Z.z1+40&&G.inIsland(x,z,60)&&(Z.x1===undefined||x<Z.x1)){pts.push([x,z]);has=true;}
      else if(has){break;}
    }
    if(pts.length>2){const P=road(pts,12,0.5);if(q%2===0)lane(P,0,q%4===0?1:-1,7,{spacing:46});}
  }
  for(let q=-30;q<=30;q++){
    const pts=[];let has=false;
    for(let s=-2400;s<=2400;s+=110){
      const lx=q*Z.px,lz=s;
      const x=lx*co-lz*si, z=cz+lx*si+lz*co;
      if(z>Z.z0-40&&z<Z.z1+40&&G.inIsland(x,z,60)&&(Z.x1===undefined||x<Z.x1)){pts.push([x,z]);has=true;}
      else if(has){break;}
    }
    if(pts.length>2)road(pts,12,0.5);
  }
  // blocks
  for(let qx=-40;qx<=40;qx++)for(let qz=-40;qz<=40;qz++){
    const lx=qx*Z.px+Z.px/2, lz=qz*Z.pz+Z.pz/2;
    const x=lx*co-lz*si, z=cz+lx*si+lz*co;
    if(z<Z.z0+20||z>Z.z1-20)continue;
    if(!G.inIsland(x,z,60)||(Z.x1!==undefined&&x>Z.x1))continue;
    if(G.reserved(x,z))continue;
    const nb=2+(r()*4|0);
    for(let b=0;b<nb;b++){
      const ox=(r()-0.5)*(Z.px-38),oz=(r()-0.5)*(Z.pz-44);
      const bx=x+ox*co-oz*si, bz=z+ox*si+oz*co;
      if(!G.inIsland(bx,bz,50)||G.reserved(bx,bz))continue;
      const d=G.districts(bx,bz,r,r()<0.25);
      addB(bx,bz,13+r()*17,13+r()*15,d.h,Z.rot+(r()-0.5)*0.04,d.pal,r);
    }
  }
}
// projects (cruciform towers on green)
for(const p of G.PROJECTS){
  const rr=G.rng((p.x*7+p.z)|0);
  const cols=Math.ceil(Math.sqrt(p.n)),rowsN=Math.ceil(p.n/cols);
  let k=0;
  for(let i=0;i<rowsN;i++)for(let j=0;j<cols;j++){
    if(k++>=p.n)break;
    const x=p.x-p.w/2+p.w*(j+0.5)/cols+(rr()-0.5)*14;
    const z=p.z-p.d/2+p.d*(i+0.5)/rowsN+(rr()-0.5)*14;
    const h=p.h*(0.85+rr()*0.3),c=pcol(6,rr);
    const ty=G.terrain(x,z);
    const rec={x,y:ty-1.5,z,sx:30,sy:h+1.5,sz:13,rot:0,c,i:[rr(),0.2,1.1,0]};
    BI.push(rec);G.SHADOWS.push(rec);
    BI.push({x,y:ty-1.5,z,sx:13,sy:h+1.5,sz:30,rot:0,c,i:[rr(),0.2,1.1,0]});
    if(rr()<0.5)G.WTOWERS.push({x:x+(rr()-0.5)*10,z:z+(rr()-0.5)*10,y:ty+h-1,s:2.6});
  }
  // green pad on ground: little trees
  for(let t=0;t<p.n*2;t++)G.TREES.push({x:p.x+(rr()-0.5)*p.w,z:p.z+(rr()-0.5)*p.d,s:4+rr()*3,c:1});
}
// ================= boroughs instanced =================
{
  const rb=G.rng(777);
  const REC=[];
  const addBoro=(x,z,w,d,h,c)=>REC.push({x,z,w,d,h,c});
  // Brooklyn/Queens field
  for(let z=-4300;z<24000;z+=95){
    const x0=z>21900?-3400:eShore(Math.max(-4200,Math.min(z,21560)))+60;
    for(let x=x0;x<8600;x+=80){
      if(rb()<0.30)continue;
      let h=8+rb()*rb()*18;
      const lic=x>2350&&x<3250&&z>7800&&z<8700, dbk=x>2400&&x<3600&&z>-1600&&z<-300, wb=x>2200&&x<3000&&z>2900&&z<4100;
      if(lic&&rb()<0.25)h=40+rb()*rb()*180;
      if(dbk&&rb()<0.3)h=50+rb()*rb()*120;
      if(wb&&rb()<0.15)h=30+rb()*60;
      const v=0.75+rb()*0.5;
      addBoro(x+(rb()-0.5)*30,z+(rb()-0.5)*30,24+rb()*34,24+rb()*34,h,h>40?[0.24*v,0.29*v,0.33*v]:[0.36*v,0.30*v,0.26*v]);
    }
  }
  // Bronx north of Harlem river
  for(let z=22300;z<26500;z+=110)for(let x=-3600;x<2000;x+=110){
    if(rb()<0.5)continue;const v=0.75+rb()*0.5;
    addBoro(x,z,22+rb()*24,22+rb()*24,7+rb()*14,[0.35*v,0.30*v,0.25*v]);
  }
  // New Jersey
  for(let z=-3800;z<22000;z+=100){
    const x1=wShore(Math.max(0,Math.min(z,21500)))-80;
    for(let x=x1;x>-9000;x-=84){
      if(rb()<0.45)continue;
      if(z>8800&&x>x1-1500)continue; // palisades top gap
      let h=6+rb()*rb()*14;
      const jc=x<-3050&&x>-4100&&z>200&&z<1900, ho=z>2600&&z<5400&&x>x1-1800;
      if(jc&&rb()<0.3)h=50+rb()*rb()*190;
      if(ho&&rb()<0.1)h=20+rb()*30;
      const v=0.75+rb()*0.5;
      addBoro(x+(rb()-0.5)*30,z+(rb()-0.5)*30,24+rb()*34,24+rb()*34,h,h>40?[0.25*v,0.29*v,0.34*v]:[0.35*v,0.30*v,0.26*v]);
    }
  }
  const geo=new THREE.BoxGeometry(1,1,1);geo.translate(0,0.5,0);
  const n=REC.length;
  const mesh=new THREE.InstancedMesh(geo,S.boro(),n);
  const col=new Float32Array(n*3),sd=new Float32Array(n);
  const M=new THREE.Matrix4();
  for(let i=0;i<n;i++){
    const b=REC[i];
    M.makeScale(b.w,b.h,b.d);M.setPosition(b.x,3.2,b.z);
    mesh.setMatrixAt(i,M);
    col[i*3]=b.c[0];col[i*3+1]=b.c[1];col[i*3+2]=b.c[2];sd[i]=rb();
  }
  geo.setAttribute('aCol',new THREE.InstancedBufferAttribute(col,3));
  geo.setAttribute('aSeed',new THREE.InstancedBufferAttribute(sd,1));
  mesh.frustumCulled=false;mesh.instanceMatrix.needsUpdate=true;
  scene.add(mesh);H.boro.push(mesh);H.boroN=n;
}
// ================= instantiate island buildings in z-chunks =================
{
  const CH=2000, chunks=new Map();
  for(const b of BI){const k=Math.max(0,Math.min(10,(b.z/CH)|0));(chunks.get(k)||chunks.set(k,[]).get(k)).push(b);}
  const Q=new THREE.Quaternion(),E=new THREE.Euler(),M=new THREE.Matrix4(),P=new THREE.Vector3(),SC=new THREE.Vector3();
  for(const[k,arr]of chunks){
    const geo=new THREE.BoxGeometry(1,1,1);geo.translate(0,0.5,0);
    const n=arr.length;
    const mesh=new THREE.InstancedMesh(geo,S.bld(),n);
    const col=new Float32Array(n*3),info=new Float32Array(n*4);
    for(let i=0;i<n;i++){
      const b=arr[i];
      E.set(0,b.rot,0);Q.setFromEuler(E);P.set(b.x,b.y,b.z);SC.set(b.sx,b.sy,b.sz);
      M.compose(P,Q,SC);mesh.setMatrixAt(i,M);
      col[i*3]=b.c[0];col[i*3+1]=b.c[1];col[i*3+2]=b.c[2];
      info[i*4]=b.i[0];info[i*4+1]=b.i[1];info[i*4+2]=b.i[2];info[i*4+3]=b.i[3];
    }
    geo.setAttribute('aCol',new THREE.InstancedBufferAttribute(col,3));
    geo.setAttribute('aInfo',new THREE.InstancedBufferAttribute(info,4));
    geo.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,180,k*CH+CH/2),3400);
    mesh.instanceMatrix.needsUpdate=true;
    scene.add(mesh);H.chunks.push(mesh);
  }
}
// ================= roof clutter =================
{
  const wt=G.WTOWERS,n=wt.length;
  const cyl=new THREE.CylinderGeometry(1,1,1.6,7);cyl.translate(0,0.8,0);
  const cone=new THREE.CylinderGeometry(0.1,1.15,0.7,7);cone.translate(0,2.0,0);
  const merged=mergeGeos(THREE,[cyl,cone]);
  const mesh=new THREE.InstancedMesh(merged,S.boat(),n);
  const col=new Float32Array(n*3);
  const M=new THREE.Matrix4();
  for(let i=0;i<n;i++){
    const t=wt[i];M.makeScale(t.s,t.s,t.s);M.setPosition(t.x,t.y,t.z);mesh.setMatrixAt(i,M);
    const v=0.8+((i*13)%10)*0.045;col[i*3]=0.32*v;col[i*3+1]=0.22*v;col[i*3+2]=0.16*v;
  }
  merged.setAttribute('aCol',new THREE.InstancedBufferAttribute(col,3));
  mesh.frustumCulled=false;mesh.instanceMatrix.needsUpdate=true;scene.add(mesh);H.clutter.push(mesh);
  // hvac
  const hv=G.HVAC,n2=hv.length;
  const bx=new THREE.BoxGeometry(1,1,1);bx.translate(0,0.5,0);
  const mesh2=new THREE.InstancedMesh(bx,S.boat(),n2);
  const col2=new Float32Array(n2*3);
  for(let i=0;i<n2;i++){
    const t=hv[i];M.makeScale(t.s,t.h,t.s*0.7);M.setPosition(t.x,t.y,t.z);mesh2.setMatrixAt(i,M);
    const v=0.55+((i*7)%10)*0.03;col2[i*3]=v;col2[i*3+1]=v;col2[i*3+2]=v*1.05;
  }
  bx.setAttribute('aCol',new THREE.InstancedBufferAttribute(col2,3));
  mesh2.frustumCulled=false;mesh2.instanceMatrix.needsUpdate=true;scene.add(mesh2);H.clutter.push(mesh2);
}
H.BI=BI;
return H;
};
function mergeGeos(THREE,geos){
  let pos=[],norm=[],uv=[],idx=[],off=0;
  for(const g of geos){
    const gg=g.index?g.toNonIndexed():g;
    const p=gg.attributes.position.array,nm=gg.attributes.normal.array,u=gg.attributes.uv?gg.attributes.uv.array:null;
    for(let i=0;i<p.length;i++){pos.push(p[i]);norm.push(nm[i]);}
    if(u)for(let i=0;i<u.length;i++)uv.push(u[i]);else for(let i=0;i<p.length/3*2;i++)uv.push(0);
  }
  const out=new THREE.BufferGeometry();
  out.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  out.setAttribute('normal',new THREE.Float32BufferAttribute(norm,3));
  out.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  return out;
}
A.mergeGeos=mergeGeos;
// ================= PARK + TREES (needs canvas) =================
A.buildPark=function(THREE,S,scene){
  const G=A.geo,r=G.rng(5150);
  const{x0,z0,x1,z1}=G.CPRK,dx=x1-x0,dz=z1-z0;
  const cv=document.createElement('canvas');cv.width=512;cv.height=2048;
  const c=cv.getContext('2d');
  const X=x=>((x-x0)/dx)*512, Y=z=>(1-(z-z0)/dz)*2048;
  c.fillStyle='#4d7a3c';c.fillRect(0,0,512,2048);
  for(let i=0;i<900;i++){c.fillStyle=`rgba(${30+r()*40|0},${70+r()*50|0},${25+r()*35|0},0.35)`;
    const x=r()*512,y=r()*2048,s=6+r()*26;c.beginPath();c.arc(x,y,s,0,7);c.fill();}
  const ell=(cx,cz,rx,rz,fill)=>{c.fillStyle=fill;c.beginPath();c.ellipse(X(cx),Y(cz),rx/dx*512,rz/dz*2048,0,0,7);c.fill();};
  // woods
  ell(-560,9350,210,190,'#3d6428');ell(-620,11540,240,300,'#3b6226');ell(-250,11700,150,150,'#3d6428');
  // meadows
  ell(-560,8560,150,190,'#6f9e4e');ell(-420,9770,190,240,'#73a251');ell(-420,11180,170,220,'#6f9e4e');
  ell(-190,8900,90,140,'#78a757');ell(-650,10100,90,150,'#78a757');
  // ballfields
  const diamond=(x,z)=>{const px=X(x),py=Y(z);c.fillStyle='#c9b083';c.beginPath();c.arc(px,py,8,0,7);c.fill();
    c.fillStyle='#b89f74';c.fillRect(px-2.5,py-2.5,5,5);};
  for(const[fx,fz]of[[-480,9700],[-380,9850],[-460,9920],[-330,9700],[-480,11120],[-380,11260],[-340,11080],[-560,8280],[-660,8300]])diamond(fx,fz);
  // waters
  ell(-140,8060,90,80,'#3d5a74');
  c.fillStyle='#3d5a74';c.beginPath();
  c.ellipse(X(-540),Y(9250),230/dx*512,120/dz*2048,-0.4,0,7);c.fill();
  c.beginPath();c.ellipse(X(-660),Y(9180),100/dx*512,70/dz*2048,0.3,0,7);c.fill();
  ell(-460,9500,60,45,'#3d5a74');
  ell(-160,11800,110,90,'#3d5a74');
  // reservoir
  const R=G.RESV;
  c.fillStyle='#8f887a';c.beginPath();c.ellipse(X(R.cx),Y(R.cz),(R.rx+10)/dx*512,(R.rz+10)/dz*2048,0,0,7);c.fill();
  c.fillStyle='#3d5a74';c.beginPath();c.ellipse(X(R.cx),Y(R.cz),R.rx/dx*512,R.rz/dz*2048,0,0,7);c.fill();
  // drives loop
  c.strokeStyle='#6f6f68';c.lineWidth=4;c.beginPath();
  c.moveTo(X(-760),Y(8120));c.lineTo(X(-760),Y(11700));c.quadraticCurveTo(X(-740),Y(11890),X(-500),Y(11900));c.lineTo(X(-300),Y(11890));c.quadraticCurveTo(X(-90),Y(11870),X(-90),Y(11600));c.lineTo(X(-90),Y(8300));c.quadraticCurveTo(X(-90),Y(8050),X(-320),Y(8030));c.lineTo(X(-600),Y(8020));c.quadraticCurveTo(X(-750),Y(8040),X(-760),Y(8120));c.stroke();
  // transverses
  c.strokeStyle='#7e7e76';c.lineWidth=4;
  for(const n of[66,79,86,97]){const z=G.streetZ(n);c.beginPath();c.moveTo(0,Y(z));c.lineTo(512,Y(z));c.stroke();}
  // paths
  c.strokeStyle='rgba(170,158,132,0.45)';c.lineWidth=1.6;
  for(let i=0;i<60;i++){
    const ax=r()*512,ay=r()*2048,bx=ax+(r()-0.5)*200,by=ay+(r()-0.5)*300;
    c.beginPath();c.moveTo(ax,ay);c.quadraticCurveTo((ax+bx)/2+(r()-0.5)*80,(ay+by)/2,bx,by);c.stroke();
  }
  c.fillStyle='#c9b89a';c.fillRect(X(-440)-5,Y(9430)-5,10,10); // Bethesda
  c.fillStyle='#a8a49a';c.fillRect(X(-470)-4,Y(9570)-4,8,8);   // Belvedere
  c.fillStyle='#9aa08f';c.fillRect(X(-140)-8,Y(8210)-6,16,12); // Zoo
  c.fillStyle='#7fae5b';c.fillRect(X(-130)-10,Y(11480)-8,20,16); // Conservatory
  const tex=new THREE.CanvasTexture(cv);tex.anisotropy=4;tex.colorSpace=THREE.SRGBColorSpace;
  // draped overlay
  const NX=36,NZ2=150,pos=[],uv=[],idx=[];
  for(let i=0;i<=NZ2;i++)for(let j=0;j<=NX;j++){
    const x=x0+dx*j/NX,z=z0+dz*i/NZ2;
    pos.push(x,G.terrain(x,z)+0.25,z);uv.push(j/NX,i/NZ2);
  }
  for(let i=0;i<NZ2;i++)for(let j=0;j<NX;j++){const a=i*(NX+1)+j,b=a+NX+1;idx.push(a,b,a+1,a+1,b,b+1);}
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  g.setIndex(idx);
  const m=new THREE.Mesh(g,S.park(tex));m.renderOrder=1;scene.add(m);
  // reservoir + lake real water
  const wm=S.water();
  const disc=new THREE.CircleGeometry(1,28);disc.rotateX(-Math.PI/2);
  const res=new THREE.Mesh(disc,wm);res.scale.set(R.rx,1,R.rz);res.position.set(R.cx,6.55,R.cz);scene.add(res);
  const lk=new THREE.Mesh(disc,wm);lk.scale.set(225,1,115);lk.rotation.y=0.4;lk.position.set(-540,6.5,9250);scene.add(lk);
  // trees
  const T=G.TREES;
  const inEll=(x,z,cx,cz,rx,rz)=>((x-cx)*(x-cx))/(rx*rx)+((z-cz)*(z-cz))/(rz*rz)<1;
  for(let i=0;i<23000;i++){
    const x=x0+r()*dx,z=z0+r()*dz;
    if(inEll(x,z,R.cx,R.cz,R.rx+20,R.rz+20))continue;
    if(inEll(x,z,-540,9250,240,130)||inEll(x,z,-140,8060,100,90)||inEll(x,z,-160,11800,120,100))continue;
    const woods=inEll(x,z,-560,9350,220,200)||inEll(x,z,-620,11540,250,310);
    if(!woods){
      if(inEll(x,z,-560,8560,150,190)||inEll(x,z,-420,9770,190,240)||inEll(x,z,-420,11180,170,220))
        {if(r()<0.85)continue;}
      else if(r()<0.42)continue;
    }
    T.push({x,z,s:5+r()*5,c:woods?2:(r()<0.5?0:1)});
  }
  for(let z=z0+15;z<z1;z+=17){T.push({x:x0+6+r()*8,z,s:5+r()*3,c:0});T.push({x:x1-6-r()*8,z,s:5+r()*3,c:0});}
  // other parks
  for(const p of G.PARKS){
    if(p.kind==='cp')continue;
    const area=(p.x1-p.x0)*(p.z1-p.z0);
    const dense=p.kind==='forest'?0.0028:(p.kind==='riverside'?0.0016:0.001);
    const n=Math.min(3200,area*dense);
    for(let i=0;i<n;i++){
      const x=p.x0+r()*(p.x1-p.x0),z=p.z0+r()*(p.z1-p.z0);
      if(!G.inIsland(x,z,10))continue;
      T.push({x,z,s:4+r()*4.5,c:p.kind==='forest'?2:(r()<0.5?0:1)});
    }
  }
  // instantiate trees
  const geo=new THREE.IcosahedronGeometry(1,1);geo.scale(1,0.82,1);geo.translate(0,0.62,0);
  const n=T.length;
  const mesh=new THREE.InstancedMesh(geo,S.tree(),n);
  const col=new Float32Array(n*3);
  const M=new THREE.Matrix4();
  const CS=[[0.20,0.37,0.16],[0.26,0.44,0.19],[0.14,0.29,0.12]];
  for(let i=0;i<n;i++){
    const t=T[i];const y=G.terrain(t.x,t.z);
    M.makeScale(t.s*(0.8+((i*7)%10)*0.05),t.s,t.s*(0.8+((i*13)%10)*0.05));
    M.setPosition(t.x,y,t.z);mesh.setMatrixAt(i,M);
    const cc=CS[t.c],v=0.82+((i*11)%12)*0.032;
    col[i*3]=cc[0]*v;col[i*3+1]=cc[1]*v;col[i*3+2]=cc[2]*v;
  }
  geo.setAttribute('aCol',new THREE.InstancedBufferAttribute(col,3));
  mesh.frustumCulled=false;mesh.instanceMatrix.needsUpdate=true;scene.add(mesh);
  // Trinity cemetery gravestones
  {
    const cg=new THREE.BoxGeometry(1.1,1.4,0.25);cg.translate(0,0.7,0);
    const gn=380;const gm=new THREE.InstancedMesh(cg,S.boat(),gn);
    const gcol=new Float32Array(gn*3);
    for(let i=0;i<gn;i++){
      const x=-1500+r()*250,z=15560+r()*360;
      M.makeScale(1,0.8+r()*0.7,1);M.setPosition(x,G.terrain(x,z),z);gm.setMatrixAt(i,M);
      const v=0.62+r()*0.25;gcol[i*3]=v;gcol[i*3+1]=v;gcol[i*3+2]=v*0.96;
    }
    cg.setAttribute('aCol',new THREE.InstancedBufferAttribute(gcol,3));
    gm.frustumCulled=false;scene.add(gm);
  }
  return mesh;
};
// ================= SHADOWS (after landmarks add theirs) =================
A.buildShadows=function(THREE,S,scene){
  const G=A.geo,SH=G.SHADOWS;
  const pos=[],idx=[];
  const cs=[[-0.5,-0.5],[0.5,-0.5],[0.5,0.5],[-0.5,0.5]];
  for(const f of[0,1])for(const c of cs)pos.push(c[0],f,c[1]);
  idx.push(0,1,2,0,2,3, 4,5,6,4,6,7);
  for(let e=0;e<4;e++){const a=e,b=(e+1)%4;idx.push(a,b,b+4, a,b+4,a+4);}
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  geo.setIndex(idx);
  const n=SH.length;
  const mesh=new THREE.InstancedMesh(geo,S.shadow(),n);
  const Q=new THREE.Quaternion(),E=new THREE.Euler(),M=new THREE.Matrix4(),P=new THREE.Vector3(),SC=new THREE.Vector3();
  for(let i=0;i<n;i++){
    const b=SH[i];
    E.set(0,b.rot||0,0);Q.setFromEuler(E);P.set(b.x,b.y,b.z);SC.set(b.sx,b.sy,b.sz);
    M.compose(P,Q,SC);mesh.setMatrixAt(i,M);
  }
  mesh.frustumCulled=false;mesh.renderOrder=2;mesh.instanceMatrix.needsUpdate=true;
  scene.add(mesh);
  return mesh;
};
})();
