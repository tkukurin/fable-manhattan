// GEO — Manhattan geography, pure data/math. Grid space: +z north (Manhattan north), +x east, y up. Meters.
(function(){
const A = window.APP;
function rng(seed){let a=seed>>>0;return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const clamp=(v,a,b)=>v<a?a:v>b?b:v, lerp=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,x)=>{x=clamp((x-a)/(b-a),0,1);return x*x*(3-2*x);};

// ---- coastline: control tables (z, westX, eastX) ----
const CZ=[ -80,   0,  250,  600, 1000, 1500, 2000, 2600, 2900, 3200, 3600, 4300, 5000, 5900, 6550, 6800, 7900, 9000,10500,11980,13300,14500,15700,16900,17900,19000,20000,20800,21400,21560];
const CW=[ -10, -60, -420, -560, -640, -700, -720, -780, -820, -900,-1300,-1750,-1780,-1850,-1870,-1865,-1830,-1810,-1780,-1740,-1720,-1680,-1600,-1480,-1380,-1300,-1150, -950, -780, -700];
const CE=[  10,  60,  380,  560,  700,  850, 1050, 1250, 1520, 1650, 1750, 1900, 1750, 1600, 1480, 1560, 1450, 1400, 1420, 1380, 1300, 1050,  800,  520,  380,  250,   60, -350, -600, -660];
function tabAt(zs,vs,z){
  if(z<=zs[0])return vs[0]; const n=zs.length; if(z>=zs[n-1])return vs[n-1];
  let i=1; while(zs[i]<z)i++;
  const t=(z-zs[i-1])/(zs[i]-zs[i-1]);
  const p0=vs[Math.max(0,i-2)],p1=vs[i-1],p2=vs[i],p3=vs[Math.min(n-1,i+1)];
  const t2=t*t,t3=t2*t; // catmull-rom
  return 0.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t2+(-p0+3*p1-3*p2+p3)*t3);
}
const edgeW=z=>tabAt(CZ,CW,z), edgeE=z=>tabAt(CZ,CE,z);
const L=21560;
function inIsland(x,z,m){m=m||0;if(z<-60+m||z>L-m)return false;const w=edgeW(z),e=edgeE(z);return x>w+m&&x<e-m;}

// ---- terrain ----
const g2=(x,z,cx,cz,r,h)=>h*Math.exp(-((x-cx)*(x-cx)+(z-cz)*(z-cz))/(r*r));
function terrain(x,z){
  const w=edgeW(z),e=edgeE(z);
  const dEdge=Math.min(x-w,e-x); if(dEdge<=0||z<0||z>L)return 6;
  const ef=smooth(0,150,dEdge)* smooth(-60,320,z)*smooth(L,L-320,z);
  let h=0;
  if(z>11500){
    const u=(x-w)/Math.max(1,e-w);
    h+=18*smooth(12100,12700,z)*smooth(13900,13200,z)*smooth(0.55,0.25,u);                 // Morningside plateau
    h+=46*smooth(15400,16800,z)*smooth(19600,18400,z)*Math.exp(-Math.pow((u-0.34)/0.30,2)); // Washington Heights ridge
    h+=g2(x,z,-1100,19050,330,52)+g2(x,z,-1020,20500,520,46)+g2(x,z,-850,21000,400,30);     // Fort Tryon, Inwood Hill
    h+=g2(x,z,170,16350,260,22);                                                            // Highbridge
  }
  if(z>7900&&z<12100&&x>-840&&x<0){ h+=g2(x,z,-640,11480,300,13)+g2(x,z,-500,9600,180,8)+g2(x,z,-200,10900,220,6)+g2(x,z,-600,8600,200,4); }
  h+=g2(x,z,-1650,10500,700,5); // Riverside rise
  return 6+h*ef;
}

// ---- street grid ----
const streetZ=n=>4300+(n-14)*80;
const WIDE=new Set([14,23,34,42,57,72,79,86,96,106,110,116,125,135,145,155,158,165,168,175,181,187,196,204]);
const STREETS=[]; // {z,w,two,n}
for(let n=1;n<=204;n++){
  const z=streetZ(n); if(z>19560&&n<200)continue;
  const wDe=WIDE.has(n); STREETS.push({z:z,w:wDe?24:15,two:wDe,n:n});
}
STREETS.push({z:19420,w:24,two:true,n:900},{z:20180,w:22,two:true,n:901},{z:20700,w:15,two:false,n:902}); // Dyckman,207th,215th
for(let z=19580;z<=20100;z+=85)STREETS.push({z,w:14,two:false,n:903}); // Inwood grid
STREETS.push({z:20280,w:14,two:false,n:904},{z:20380,w:14,two:false,n:905},{z:20480,w:14,two:false,n:906},{z:20590,w:14,two:false,n:907});
// lower Manhattan named crossings
STREETS.push({z:3400,w:26,two:true,n:800},{z:3000,w:24,two:true,n:801},{z:2600,w:26,two:true,n:802},
  {z:2150,w:16,two:true,n:803},{z:1500,w:20,two:true,n:804},{z:900,w:16,two:true,n:805},{z:640,w:14,two:true,n:806},{z:300,w:16,two:true,n:807});

// avenues: straight (x const) unless pts
const AVENUES=[
 {name:'FDRs',x:0,w:0,skip:1},
 {name:'1st',x:1120,z0:3400,z1:13350,w:22,dir:1},
 {name:'2nd',x:840,z0:3400,z1:14450,w:22,dir:-1},
 {name:'3rd',x:560,z0:3200,z1:15850,w:22,dir:1},
 {name:'Lex',x:420,z0:4860,z1:14950,w:17,dir:-1},
 {name:'Park',x:280,z0:3560,z1:15050,w:32,dir:0},
 {name:'Mad',x:140,z0:5020,z1:15150,w:17,dir:1},
 {name:'5th',x:0,z0:4020,z1:15450,w:22,dir:-1},
 {name:'6th',x:-280,z0:2800,z1:7900,w:22,dir:1},
 {name:'7th',x:-560,z0:3450,z1:7900,w:22,dir:-1},
 {name:'ACP',x:-560,z0:12100,z1:16050,w:26,dir:0},
 {name:'8CPW',x:-840,z0:3750,z1:12100,w:24,dir:1},
 {name:'FDoug',x:-840,z0:12100,z1:16750,w:24,dir:0},
 {name:'9Col',x:-1120,z0:3800,z1:12140,w:22,dir:-1},
 {name:'10Am',x:-1400,z0:3800,z1:19100,w:22,dir:1},
 {name:'11WE',x:-1680,z0:4950,z1:12180,w:22,dir:-1},
 {name:'12th',x:-1845,z0:5620,z1:7550,w:20,dir:0},
 {name:'York',x:1400,z0:7420,z1:10460,w:17,dir:0},
 {name:'AveA',x:1400,z0:3400,z1:4300,w:16,dir:1},
 {name:'AveB',x:1590,z0:3400,z1:4300,w:16,dir:-1},
 {name:'AveC',x:1760,z0:3450,z1:4260,w:16,dir:1},
 {name:'Lenox',x:-280,z0:12100,z1:15450,w:26,dir:0},
 {name:'ManhAv',x:-1000,z0:12140,z1:13300,w:15,dir:1},
 {name:'EastEnd',x:1560,z0:9500,z1:10380,w:16,dir:0},
 {name:'Bwy',pts:[[-70,140],[-75,900],[-45,1800],[15,2600],[55,3400],[85,4050],[55,4360],[0,5020],[-280,5880],[-560,6540],[-840,7900],[-1080,8700],[-1180,9620],[-1240,10800],[-1300,11800],[-1385,12820],[-1420,13380],[-1300,14520],[-1195,15700],[-1050,16900],[-985,17900],[-950,19000],[-700,20000],[-520,20650],[-420,21100]],w:24,dir:-1},
 {name:'StNich',pts:[[-700,12180],[-830,13180],[-1050,15700],[-1180,16900],[-1235,17420]],w:20,dir:0},
 {name:'RivDr',rside:1,w:17,dir:0},
];
function polyX(pts,z){ if(z<=pts[0][1])return pts[0][0]; for(let i=1;i<pts.length;i++){ if(z<=pts[i][1]){const t=(z-pts[i-1][1])/(pts[i][1]-pts[i-1][1]);return lerp(pts[i-1][0],pts[i][0],t);} } return pts[pts.length-1][0]; }
const bwayX=z=>polyX(AVENUES.find(a=>a.name==='Bwy').pts,z);
const stnX=z=>{const a=AVENUES.find(a=>a.name==='StNich');return(z<a.pts[0][1]||z>a.pts[a.pts.length-1][1])?1e9:polyX(a.pts,z);};

// ---- parks / green ----
const PK=(x0,z0,x1,z1,kind)=>({x0,z0,x1,z1,kind});
const PARKS=[
 PK(-840,7900,0,11980,'cp'),
 PK(-160,4000,150,4190,'green'),   // Washington Sq
 PK(50,4340,300,4560,'green'),     // Union Sq
 PK(0,5020,220,5330,'green'),      // Madison Sq
 PK(-430,6270,-280,6430,'green'),  // Bryant
 PK(1120,3760,1440,4060,'green'),  // Tompkins Sq
 PK(-90,1580,140,1800,'green'),    // City Hall
 PK(-700,-40,700,320,'green'),     // Battery
 PK(1430,4340,1900,4940,'stuygreen'), // Stuy Town pad
 PK(1490,3400,1900,4340,'esriver'),   // East River Park strip
 PK(-2000,9180,-1720,12900,'riverside'),
 PK(-1010,12180,-830,13120,'forest'), // Morningside
 PK(-920,13580,-700,14420,'forest'),  // St Nicholas Pk
 PK(-810,14900,-560,15580,'forest'),  // Jackie Robinson
 PK(-80,13180,140,13600,'green'),     // Marcus Garvey
 PK(60,15900,400,19100,'forest'),     // Highbridge Pk
 PK(-1290,18700,-900,19420,'forest'), // Fort Tryon
 PK(-1340,19700,-660,21350,'forest'), // Inwood Hill
 PK(-660,20780,-380,21100,'green'),   // Isham/fields
 PK(-1520,15540,-1240,15940,'cemetery'), // Trinity cemetery
 PK(-260,12180,-80,12580,'green'),    // Morningside east add'l
];
function inPark(x,z){for(const p of PARKS){if(x>p.x0&&x<p.x1&&z>p.z0&&z<p.z1)return p.kind;}return null;}
const CPRK={x0:-840,z0:7900,x1:0,z1:11980};
const RESV={cx:-420,cz:10480,rx:310,rz:430};
const LAKE={cx:-540,cz:9260,rx:230,rz:150};

// ---- reserved pads (landmarks & campuses & projects) x0,z0,x1,z1 ----
const LMPADS=[
 [-760,880,-380,1400],   // WTC site
 [-160,1560,60,1740],    // Woolworth/City hall west? Woolworth block
 [230,1800,470,2000],    // Municipal
 [-120,4960,120,5110],   // Flatiron block wedge zone
 [-60,5740,240,5980],    // ESB block
 [140,6280,420,6700],    // GCT + MetLife + One Vanderbilt
 [330,6480,530,6680],    // Chrysler
 [1380,6560,1750,7000],  // UN
 [-700,6480,-460,7050],  // Times Sq towers
 [-500,6520,-300,6700],  // BofA/Bryant west
 [-330,6760,-40,7100],   // Rockefeller
 [-350,7620,300,7900],   // 57th supertall row
 [-1010,7760,-760,7980], // Columbus circle/TimeWarner
 [-1810,5620,-1380,6100],// Hudson Yards + Javits
 [-820,5680,-580,5890],  // MSG
 [-240,9600,0,9990],     // Met (in park edge)
 [-1060,9440,-830,9700], // AMNH
 [-980,8880,-830,9040],  // Dakota
 [-980,9260,-830,9400],  // San Remo
 [-980,10120,-830,10280],// Beresford
 [-980,10600,-830,10760],// El Dorado
 [-200,7820,0,7980],     // Plaza / GM
 [-160,10400,0,10580],   // Guggenheim
 [-1700,12420,-1420,12900], // Riverside church/Grant
 [-1500,12280,-1140,12780], // Columbia
 [-1240,12180,-1020,12440], // St John Divine
 [-1020,14100,-760,14480],  // City College
 [180,15660,420,16060],     // Polo Grounds towers pad
 [-1330,16620,-1000,17100], // NYP medical
 [-1200,18920,-1000,19180], // Cloisters
 [-1000,20700,-680,21120],  // Baker field
 [340,4340,520,4560],       // ConEd
 [60,660,320,960],          // Wall st cluster pads (procedural boost allowed)
];
// projects: {x,z,w,d,n,h,seed}
const PROJECTS=[
 {x:1660,z:4640,w:420,d:560,n:26,h:42},   // Stuy Town + Cooper Vlg
 {x:1620,z:3760,w:260,d:620,n:12,h:44},   // Wald/Riis
 {x:790,z:1930,w:300,d:260,n:7,h:40},     // Smith houses
 {x:-1210,z:5240,w:200,d:300,n:6,h:38},   // Chelsea-Elliott
 {x:-1520,z:7300,w:220,d:280,n:6,h:56},   // Amsterdam
 {x:960,z:12980,w:280,d:340,n:8,h:44},    // Jefferson
 {x:700,z:13420,w:260,d:300,n:8,h:46},    // Carver
 {x:900,z:13760,w:280,d:300,n:8,h:52},    // Johnson
 {x:-660,z:13720,w:240,d:300,n:7,h:44},   // St Nicholas hses
 {x:-1080,z:13920,w:260,d:320,n:8,h:48},  // Grant/Manhattanville
 {x:150,z:13350,w:200,d:260,n:5,h:40},    // Taft
 {x:1080,z:13520,w:180,d:260,n:5,h:44},   // Wagner
 {x:300,z:14700,w:220,d:280,n:6,h:42},    // Lincoln
 {x:300,z:15860,w:220,d:380,n:4,h:94},    // Polo Grounds towers (tall)
 {x:240,z:19720,w:280,d:300,n:7,h:42},    // Dyckman
 {x:-950,z:11700,w:200,d:420,n:7,h:46},   // Douglass
];
function inRect(x,z,r){return x>r[0]&&z>r[1]&&x<r[2]&&z<r[3];}
function reserved(x,z){
  if(inPark(x,z))return true;
  for(const r of LMPADS)if(inRect(x,z,r))return true;
  for(const p of PROJECTS)if(x>p.x-p.w/2-20&&x<p.x+p.w/2+20&&z>p.z-p.d/2-20&&z<p.z+p.d/2+20)return true;
  if(Math.abs(x-bwayX(z))<26)return true;
  const sx=stnX(z); if(Math.abs(x-sx)<24)return true;
  if(z>9180&&x<edgeW(z)+150)return true;   // Riverside strip
  if(x>edgeE(z)-70||x<edgeW(z)+55)return true; // shore roads
  return false;
}

// ---- districts → building recipe ----
// pal: 0 darkglass 1 bluglass 2 limestone 3 brick 4 brownstone 5 white terracotta 6 project 7 civic 8 panel
function districts(x,z,r,onAve){
  let pal,h;
  const pick=(a,b,c)=>{const q=r();return q<0.55?a:q<0.85?b:c;};
  if(z<1600){ // FiDi
    const core=Math.exp(-((x-140)*(x-140)+(z-830)*(z-830))/(420*420));
    h=22+r()*r()*70+r()*r()*230*core; pal=h>90?pick(0,2,5):pick(2,5,3);
    if(r()<0.10*core)h=180+r()*90;
  } else if(z<2600){ h=16+r()*r()*55; pal=pick(3,2,7); if(Math.abs(x-40)<220&&r()<0.2)h=70+r()*110; }
  else if(z<3450){ h=16+r()*20; pal=pick(3,3,5); if(Math.abs(x-bwayX(z))<160)h=26+r()*36,pal=5; }
  else if(z<4300){ h=11+r()*17; pal=pick(4,3,3); if(x>-200&&x<300&&z<4200&&r()<0.3)h=30+r()*28,pal=2; }
  else if(z<5620){ h=onAve?26+r()*r()*72:11+r()*20; pal=onAve?pick(2,5,0):pick(3,4,5); }
  else if(z<7900){
    const core=x>-740&&x<380&&z>5680;
    if(core){h=48+r()*r()*170; const q2=r(); pal=q2<0.42?0:q2<0.8?2:1; if(r()<0.02)h=235+r()*85;}
    else if(x<-1100){h=20+r()*42; pal=pick(3,8,0); if(z>7300&&r()<0.12){h=90+r()*120;pal=0;}}
    else {h=onAve?36+r()*r()*95:16+r()*26; pal=pick(2,0,5);}
  } else if(z<11980){
    if(x>0){ h=onAve?40+r()*r()*78:12+r()*11; pal=onAve?pick(2,8,0):pick(4,3,2); }
    else { h=onAve?36+r()*r()*66:13+r()*11; pal=onAve?pick(2,2,8):pick(4,3,4); }
  } else if(z<13400){ h=15+r()*22; pal=pick(3,6,4); if(z>13100&&r()<0.1){h=55+r()*80;pal=0;} }
  else if(z<15700){ h=14+r()*20; pal=pick(3,3,4); if(onAve)h+=10+r()*14; }
  else if(z<19300){ h=20+r()*24; pal=pick(3,6,3); if(onAve)h+=8; }
  else { h=15+r()*16; pal=pick(3,6,4); }
  if(onAve&&z>4300)h*=1.22;
  return {pal,h};
}

// ---- shared registries filled during build ----
A.geo={
  rng,clamp,lerp,smooth,L,edgeW,edgeE,inIsland,terrain,streetZ,STREETS,AVENUES,polyX,bwayX,stnX,
  PARKS,inPark,CPRK,RESV,LAKE,LMPADS,PROJECTS,reserved,districts,tabAt,
  LANES:[],   // {pts:[[x,y,z]...], speed, jitter, spacing, taxi}
  SHADOWS:[], // {x,z,w,d,h,rot}
  NECK:[],    // necklace light points [x,y,z]
  SUSP:[],    // suspender line segment pairs
  WTOWERS:[], HVAC:[], TREES:[], // instanced pools
};
})();
