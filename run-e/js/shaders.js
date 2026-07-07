// SHADERS — shared uniform hub + all material factories (custom lighting: sun, cloud shadows, haze, ACES).
(function(){
const A=window.APP;
A.initShaders=function(THREE){
const V3=(x,y,z)=>new THREE.Vector3(x,y,z), C3=(r,g,b)=>new THREE.Color(r,g,b);
const U={
 uTime:{value:0},
 uSunDir:{value:V3(-0.88,0.17,-0.30).normalize()},
 uSunCol:{value:C3(1.30,0.78,0.42)},
 uAmb:{value:C3(0.30,0.36,0.50)},
 uHaze:{value:C3(0.94,0.66,0.44)},
 uHazeD:{value:0.000072},
 uSkyT:{value:C3(0.20,0.34,0.58)},
 uSkyH:{value:C3(1.05,0.62,0.35)},
 uLit:{value:0.12},
 uNight:{value:0},
 uExp:{value:1.08},
 uWinD:{value:2400},
 uSpark:{value:1},
 uShadowVec:{value:V3(3,0,1)},
 uShadowA:{value:0.34},
};
const LIGHTS={
 golden:{sun:[-0.88,0.17,-0.30],sunCol:[1.30,0.78,0.42],amb:[0.26,0.30,0.42],haze:[0.86,0.58,0.38],hazeD:0.000034,skyT:[0.13,0.26,0.50],skyH:[1.02,0.56,0.30],lit:0.12,night:0,exp:1.05},
 noon:{sun:[-0.32,0.80,-0.42],sunCol:[1.12,1.08,1.00],amb:[0.42,0.47,0.55],haze:[0.70,0.78,0.90],hazeD:0.000015,skyT:[0.16,0.38,0.80],skyH:[0.72,0.82,0.95],lit:0.02,night:0,exp:1.0},
 dusk:{sun:[-0.92,0.045,-0.26],sunCol:[0.50,0.23,0.14],amb:[0.06,0.07,0.135],haze:[0.16,0.14,0.24],hazeD:0.000026,skyT:[0.035,0.05,0.13],skyH:[0.85,0.34,0.17],lit:0.40,night:1,exp:0.88},
};
const tgt=JSON.parse(JSON.stringify(LIGHTS.golden));
function setLight(name){Object.assign(tgt,JSON.parse(JSON.stringify(LIGHTS[name])));}
const lv=(o,t,k)=>{o.value.lerp(new THREE.Color(t[k][0],t[k][1],t[k][2]),ST);};
let ST=0;
function tick(dt){
 ST=Math.min(1,dt*1.4); const STs=Math.min(1,dt*0.5);
 U.uSunDir.value.lerp(V3(tgt.sun[0],tgt.sun[1],tgt.sun[2]).normalize(),ST).normalize();
 lv(U.uSunCol,tgt,'sunCol');lv(U.uAmb,tgt,'amb');lv(U.uHaze,tgt,'haze');lv(U.uSkyT,tgt,'skyT');lv(U.uSkyH,tgt,'skyH');
 U.uHazeD.value+= (tgt.hazeD-U.uHazeD.value)*ST;
 U.uLit.value+=(tgt.lit-U.uLit.value)*STs;
 U.uNight.value+=(tgt.night-U.uNight.value)*ST;
 U.uExp.value+=(tgt.exp-U.uExp.value)*ST;
 const sd=U.uSunDir.value, sy=Math.max(sd.y,0.14), k=Math.min(1/Math.tan(Math.asin(Math.min(0.99,sy))),3.8);
 U.uShadowVec.value.set(-sd.x,0,-sd.z).normalize().multiplyScalar(k*(1-U.uNight.value*0.85));
 U.uShadowA.value=0.17*(1-U.uNight.value*0.72);
}
const COMMON=`
uniform float uTime;uniform vec3 uSunDir;uniform vec3 uSunCol;uniform vec3 uAmb;uniform vec3 uHaze;uniform float uHazeD;
uniform float uLit;uniform float uNight;uniform float uExp;uniform float uWinD;uniform vec3 uSkyT;
float hash12(vec2 p){vec3 p3=fract(vec3(p.xyx)*0.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
float vnoise(vec2 p){vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.0-2.0*f);
 float a=hash12(i),b=hash12(i+vec2(1.,0.)),c=hash12(i+vec2(0.,1.)),d=hash12(i+vec2(1.,1.));
 return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}
float cloudShadow(vec2 w){float n=vnoise(w*0.00030+vec2(uTime*0.0045,uTime*0.0027))*0.65+vnoise(w*0.0011+vec2(-uTime*0.006,uTime*0.004))*0.35;return 0.70+0.30*smoothstep(0.32,0.62,n);}
vec3 applyHaze(vec3 c,float d,vec3 rd){float f=1.0-exp(-d*uHazeD);f*=mix(1.0,0.30,clamp(-rd.y*2.8,0.0,1.0));float sw=pow(max(dot(rd,uSunDir)*0.5+0.5,0.0),3.0);vec3 hz=mix(mix(uHaze,uSkyT*1.5,0.48),uHaze*(1.0+1.1*pow(max(dot(rd,uSunDir),0.0),6.0)),sw);return mix(c,hz,clamp(f,0.0,0.92));}
vec3 FIN(vec3 c){c*=uExp;c=clamp((c*(2.51*c+0.03))/(c*(2.43*c+0.59)+0.14),0.0,1.0);return pow(c,vec3(0.4545));}
`;
function mat(vs,fs,opt){
 opt=opt||{};
 const m=new THREE.ShaderMaterial({
  uniforms:Object.assign({},U,opt.uniforms||{}),
  vertexShader:COMMON+vs, fragmentShader:COMMON+fs,
  transparent:!!opt.transparent, depthWrite:opt.depthWrite!==false, side:opt.side||THREE.FrontSide,
  blending:opt.add?THREE.AdditiveBlending:THREE.NormalBlending,
 });
 if(opt.po){m.polygonOffset=true;m.polygonOffsetFactor=opt.po;m.polygonOffsetUnits=opt.po;}
 return m;
}
// ---------- BUILDINGS (instanced + merged landmark variant) ----------
const bldFrag=`
varying vec3 vCol;varying vec4 vInfo;varying vec3 vN;varying vec3 vW;varying vec3 vUvF;
void main(){
 vec3 N=normalize(vN);
 vec3 V=normalize(cameraPosition-vW);float dist=distance(cameraPosition,vW);
 float seed=vInfo.x,glass=vInfo.y,litBias=vInfo.z,em=vInfo.w;
 vec3 base=vCol;float cs=cloudShadow(vW.xz);
 float sun=max(dot(N,uSunDir),0.0)*cs;
 vec3 R=reflect(-uSunDir,N);float rv=max(dot(R,V),0.0);
 vec3 col;
 if(vUvF.z>0.5){
  float n=hash12(floor(vUvF.xy*0.35)+seed);float n2=hash12(floor(vUvF.xy*0.12)+seed*3.1);
  vec3 rc=base*(0.30+0.17*n)*(0.85+0.3*n2);
  if(em>1.5)rc=mix(rc,vec3(0.36,0.55,0.46),0.85);
  col=rc*(uSunCol*sun+uAmb);
 }else{
  float winDetail=1.0-smoothstep(uWinD,uWinD*2.8,dist);
  vec2 g=vec2(vUvF.x/3.35,vUvF.y/3.6);
  vec2 cell=floor(g);vec2 f=fract(g);
  float h=hash12(cell+seed*17.17);
  float win=step(0.18,f.x)*step(f.x,0.86)*step(0.30,f.y)*step(f.y,0.92)*winDetail;
  float ground=1.0-step(4.8,vUvF.y);
  win=max(win,ground*step(0.06,f.x)*step(f.x,0.94)*winDetail*0.9);
  vec3 fac=base*(0.92+0.16*hash12(vec2(cell.y,seed)));
  vec3 facLit=fac*(uSunCol*sun+uAmb*(0.92+0.08*N.y)+uSunCol*0.12*(1.0-sun)*cs);
  facLit*=0.80+0.20*smoothstep(0.0,10.0,vUvF.y);
  vec3 sky=mix(uHaze,uAmb*1.8,0.5);
  float mir=pow(rv,70.0);
  vec3 winC=mix(base*0.30*(uSunCol*sun*0.7+uAmb),sky*(0.40+0.35*h)*(0.55+0.45*cs),glass)*(1.0-uNight*0.52);
  winC+=uSunCol*mir*(0.7+3.6*glass)*(0.30+0.70*h);
  float on=smoothstep(h,h+0.06,uLit*litBias);
  winC=mix(winC,vec3(1.0,0.72,0.42)*(1.0+1.1*h),on*0.94);
  col=mix(facLit,winC,win*(0.82+0.18*h));
  vec3 farFac=mix(facLit,winC*(0.72-0.30*uNight),clamp(glass*0.7+uLit*0.22,0.0,0.85));
  col=mix(col,farFac,(1.0-winDetail)*0.75);
  col+=uSunCol*pow(rv,9.0)*0.05*(1.0-glass);
 }
 if(em>0.0&&em<1.5)col+=vec3(1.0,0.72,0.45)*em*(0.20+0.9*uNight);
 col=applyHaze(col,dist,-V);
 gl_FragColor=vec4(FIN(col),1.0);
}`;
const bldVertI=`
attribute vec3 aCol;attribute vec4 aInfo;
varying vec3 vCol;varying vec4 vInfo;varying vec3 vN;varying vec3 vW;varying vec3 vUvF;
void main(){
 vec3 sc=vec3(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz),length(instanceMatrix[2].xyz));
 vec4 wp=instanceMatrix*vec4(position,1.0);
 vW=(modelMatrix*wp).xyz;
 vN=normalize(mat3(instanceMatrix)*normal);
 float roof=step(0.5,normal.y);
 vec2 f;
 if(abs(normal.x)>0.5)f=vec2(position.z*sc.z,position.y*sc.y);
 else if(abs(normal.z)>0.5)f=vec2(position.x*sc.x,position.y*sc.y);
 else f=vec2(position.x*sc.x,position.z*sc.z);
 f.x+=aInfo.x*63.7;
 vUvF=vec3(f,roof);vCol=aCol;vInfo=aInfo;
 gl_Position=projectionMatrix*viewMatrix*vec4(vW,1.0);
}`;
const bldVertM=`
attribute vec3 aCol;attribute vec3 aGE;
varying vec3 vCol;varying vec4 vInfo;varying vec3 vN;varying vec3 vW;varying vec3 vUvF;
void main(){
 vec4 wp=modelMatrix*vec4(position,1.0);vW=wp.xyz;
 vN=normalize(mat3(modelMatrix)*normal);
 float roof=step(0.75,vN.y);
 vUvF=vec3(uv,roof);vCol=aCol;vInfo=vec4(aGE.z,aGE.x,1.0,aGE.y);
 gl_Position=projectionMatrix*viewMatrix*wp;
}`;
// ---------- BOROUGHS ----------
const boroFrag=`
varying vec3 vCol;varying vec3 vN;varying vec3 vW;varying vec3 vUvF;varying float vSeed;
void main(){
 vec3 N=normalize(vN);vec3 V=normalize(cameraPosition-vW);float dist=distance(cameraPosition,vW);
 float sun=max(dot(N,uSunDir),0.0)*cloudShadow(vW.xz);
 vec3 col=vCol*(uSunCol*sun+uAmb*(0.92+0.08*N.y)+uSunCol*0.10*(1.0-sun));
 if(vUvF.z<0.5&&uNight>0.02){
  vec2 cell=floor(vec2(vUvF.x/3.4,vUvF.y/3.4));
  float h=hash12(cell+vSeed*11.3);
  col+=vec3(1.0,0.72,0.45)*step(0.90,h)*uNight*1.4*(1.0-smoothstep(6000.0,12000.0,dist));
 }
 col=applyHaze(col,dist*1.05,-V);
 gl_FragColor=vec4(FIN(col),1.0);
}`;
const boroVert=`
attribute vec3 aCol;attribute float aSeed;
varying vec3 vCol;varying vec3 vN;varying vec3 vW;varying vec3 vUvF;varying float vSeed;
void main(){
 vec3 sc=vec3(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz),length(instanceMatrix[2].xyz));
 vec4 wp=instanceMatrix*vec4(position,1.0);vW=wp.xyz;
 vN=normalize(mat3(instanceMatrix)*normal);
 float roof=step(0.5,normal.y);
 vec2 f=abs(normal.x)>0.5?vec2(position.z*sc.z,position.y*sc.y):vec2(position.x*sc.x,position.y*sc.y);
 vUvF=vec3(f,roof);vCol=aCol;vSeed=aSeed;
 gl_Position=projectionMatrix*viewMatrix*wp;
}`;
// ---------- GROUND ----------
const groundVert=`
attribute vec3 aCol;varying vec3 vCol;varying vec3 vW;
void main(){vec4 wp=modelMatrix*vec4(position,1.0);vW=wp.xyz;vCol=aCol;gl_Position=projectionMatrix*viewMatrix*wp;}`;
const groundFrag=`
varying vec3 vCol;varying vec3 vW;
void main(){
 vec3 V=normalize(cameraPosition-vW);float dist=distance(cameraPosition,vW);
 float n=vnoise(vW.xz*0.02)*0.5+vnoise(vW.xz*0.14)*0.5;
 vec3 base=vCol*(0.88+0.20*n);
 float gridF=smoothstep(2200.0,4500.0,dist)*(1.0-smoothstep(14000.0,20000.0,dist));
 float gl=max(step(0.90,fract(vW.x/112.0)),step(0.88,fract(vW.z/86.0)));
 base*=1.0-0.13*gl*gridF;
 float sun=max(uSunDir.y,0.0)*cloudShadow(vW.xz);
 vec3 col=base*(uSunCol*sun*0.95+uAmb);
 col=applyHaze(col,dist,-V);
 gl_FragColor=vec4(FIN(col),1.0);
}`;
// ---------- ROADS ----------
const roadVert=`
attribute float aW;varying vec2 vUvM;varying float vW2;varying vec3 vWp;
void main(){vec4 wp=modelMatrix*vec4(position,1.0);vWp=wp.xyz;vUvM=uv;vW2=aW;gl_Position=projectionMatrix*viewMatrix*wp;}`;
const roadFrag=`
varying vec2 vUvM;varying float vW2;varying vec3 vWp;
void main(){
 vec3 V=normalize(cameraPosition-vWp);float dist=distance(cameraPosition,vWp);
 float xm=abs(vUvM.x);
 vec3 asphalt=vec3(0.135,0.135,0.145)*(0.9+0.25*vnoise(vWp.xz*0.15));
 float swE=vW2*0.5-3.6;
 float sw=smoothstep(swE-0.8,swE+0.4,xm);
 vec3 col=mix(asphalt,vec3(0.52,0.51,0.48)*(0.85+0.3*vnoise(vWp.xz*0.3)),sw);
 if(vW2>16.0){
  float f=fract(vUvM.x/3.3+0.5);
  float line=step(abs(f-0.5),0.06)*step(xm,swE-1.0)*step(fract(vUvM.y/16.0),0.55);
  col=mix(col,vec3(0.55,0.5,0.35),line*0.5*(1.0-smoothstep(1500.,3000.,dist)));
 }
 float sun=max(uSunDir.y,0.0)*cloudShadow(vWp.xz);
 col*=(uSunCol*sun*0.9+uAmb);
 col+=vec3(1.0,0.6,0.25)*uNight*0.05*(0.5+0.5*sin(vUvM.y*0.16));
 col=applyHaze(col,dist,-V);
 gl_FragColor=vec4(FIN(col),1.0);
}`;
// ---------- WATER ----------
const waterVert=`
varying vec3 vW;void main(){vec4 wp=modelMatrix*vec4(position,1.0);vW=wp.xyz;gl_Position=projectionMatrix*viewMatrix*wp;}`;
const waterFrag=`
uniform float uSpark;varying vec3 vW;
void main(){
 vec2 p=vW.xz;float t=uTime;
 float n1=vnoise(p*0.010+vec2(t*0.030,t*0.019));
 float n2=vnoise(p*0.043+vec2(-t*0.05,t*0.01));
 float n3=vnoise(p*0.15+vec2(0.0,t*0.11));
 vec3 N=normalize(vec3((n1-0.5)*0.42+(n3-0.5)*0.16,1.0,(n2-0.5)*0.42+(n3-0.5)*0.16));
 vec3 V=normalize(cameraPosition-vW);float dist=distance(cameraPosition,vW);
 vec3 rd=-V;
 vec3 R=reflect(-uSunDir,N);float rv=max(dot(R,V),0.0);
 float fres=pow(1.0-max(dot(V,vec3(0,1,0)),0.0),4.0);
 float sunw=pow(max(dot(normalize(rd.xz),normalize(uSunDir.xz)),0.0),3.0);
 vec3 deep=vec3(0.042,0.075,0.105);
 vec3 skyR=mix(uSkyT*1.05,uHaze*0.95,sunw*0.85);
 float spec=pow(rv,900.0)*8.0+pow(rv,90.0)*0.7;
 float sparkle=pow(rv,220.0)*step(0.60,vnoise(p*0.55+vec2(t*0.35,-t*0.22)))*6.0*uSpark;
 vec3 col=mix(deep,skyR,0.32+0.42*fres)+(spec+sparkle)*uSunCol;
 col+=vec3(1.0,0.55,0.25)*uNight*pow(rv,20.0)*0.12;
 col=applyHaze(col,dist*0.8,rd);
 gl_FragColor=vec4(FIN(col),1.0);
}`;
// ---------- SKY ----------
const skyVert=`varying vec3 vW;void main(){vec4 wp=modelMatrix*vec4(position,1.0);vW=wp.xyz;gl_Position=projectionMatrix*viewMatrix*wp;gl_Position.z=gl_Position.w*0.99999;}`;
const skyFrag=`
uniform vec3 uSkyH;varying vec3 vW;
void main(){
 vec3 dir=normalize(vW-cameraPosition);
 float y=clamp(dir.y,-0.08,1.0);
 float azw=pow(0.5+0.5*dot(normalize(dir.xz),normalize(uSunDir.xz)),1.6);
 vec3 hor=mix(mix(uSkyT,uSkyH,0.38),uSkyH,azw);
 vec3 col=mix(hor,uSkyT,pow(clamp(y*2.0,0.0,1.0),0.62));
 float sa=max(dot(dir,uSunDir),0.0);
 col+=uSunCol*0.22*pow(sa,5.0);
 col+=uSunCol*(pow(sa,1500.0)*26.0+pow(sa,200.0)*1.7);
 col=mix(col,uHaze*0.9,smoothstep(0.04,-0.06,dir.y));
 float cl=vnoise(dir.xz/max(dir.y,0.06)*2.0+vec2(uTime*0.006,0.0));
 col+=uSunCol*0.10*smoothstep(0.55,0.8,cl)*smoothstep(0.0,0.25,dir.y)*(1.0-smoothstep(0.25,0.6,dir.y));
 gl_FragColor=vec4(FIN(col),1.0);
}`;
// ---------- TREES ----------
const treeVert=`
attribute vec3 aCol;varying vec3 vCol;varying vec3 vN;varying vec3 vW;
void main(){
 vec3 p=position;
 vec4 wp=instanceMatrix*vec4(p,1.0);
 wp.xyz+=vec3(sin(uTime*0.9+wp.x*0.1),0.0,cos(uTime*0.8+wp.z*0.1))*0.25*max(position.y,0.0);
 vW=wp.xyz;vN=normalize(mat3(instanceMatrix)*normal);vCol=aCol;
 gl_Position=projectionMatrix*viewMatrix*wp;}`;
const treeFrag=`
varying vec3 vCol;varying vec3 vN;varying vec3 vW;
void main(){
 vec3 N=normalize(vN);vec3 V=normalize(cameraPosition-vW);float dist=distance(cameraPosition,vW);
 float sun=max(dot(N,uSunDir),0.0)*cloudShadow(vW.xz);
 float n=vnoise(vW.xz*0.6);
 vec3 col=vCol*(0.8+0.4*n)*(uSunCol*sun*1.05+uAmb*(0.85+0.15*N.y));
 col=applyHaze(col,dist,-V);
 gl_FragColor=vec4(FIN(col),1.0);}`;
// ---------- CARS ----------
const carVert=`
attribute vec3 aCol;attribute float aV;
varying vec3 vCol;varying float vV;varying vec3 vLp;varying vec3 vW;varying vec3 vN;
void main(){
 float dist=distance(cameraPosition,vec3(instanceMatrix[3].xyz));
 float up=1.0+smoothstep(1200.0,6500.0,dist)*2.4;
 up*=1.0-smoothstep(9000.0,12000.0,dist);
 vec4 wp=instanceMatrix*vec4(position*up,1.0);
 vW=wp.xyz;vN=normalize(mat3(instanceMatrix)*normal);vCol=aCol;vV=aV;vLp=position;
 gl_Position=projectionMatrix*viewMatrix*wp;}`;
const carFrag=`
varying vec3 vCol;varying float vV;varying vec3 vLp;varying vec3 vW;varying vec3 vN;
void main(){
 vec3 N=normalize(vN);vec3 V=normalize(cameraPosition-vW);float dist=distance(cameraPosition,vW);
 float sun=max(dot(N,uSunDir),0.0)*cloudShadow(vW.xz);
 vec3 col=vCol*(uSunCol*sun+uAmb);
 float win=step(0.42,vLp.y)*step(abs(vLp.z),1.4);
 col=mix(col,vec3(0.10,0.12,0.15),win*0.8);
 vec3 R=reflect(-uSunDir,N);col+=uSunCol*pow(max(dot(R,V),0.0),40.0)*0.8;
 float brake=smoothstep(0.55,0.15,vV);
 if(vLp.z<-1.9)col+=vec3(1.0,0.06,0.03)*(0.25+1.1*brake)*(0.35+0.65*uNight)*2.0;
 if(vLp.z>1.9)col+=vec3(1.0,0.95,0.8)*uNight*3.0;
 col=applyHaze(col,dist,-V);
 gl_FragColor=vec4(FIN(col),1.0);}`;
// ---------- BOATS ----------
const boatVert=`
attribute vec3 aCol;varying vec3 vCol;varying vec3 vN;varying vec3 vW;
void main(){vec4 wp=instanceMatrix*vec4(position,1.0);vW=wp.xyz;vN=normalize(mat3(instanceMatrix)*normal);vCol=aCol;
gl_Position=projectionMatrix*viewMatrix*wp;}`;
const solidVert=`
attribute vec3 aCol;varying vec3 vCol;varying vec3 vN;varying vec3 vW;
void main(){vec4 wp=modelMatrix*vec4(position,1.0);vW=wp.xyz;vN=normalize(mat3(modelMatrix)*normal);vCol=aCol;
gl_Position=projectionMatrix*viewMatrix*wp;}`;
const boatFrag=`
varying vec3 vCol;varying vec3 vN;varying vec3 vW;
void main(){
 vec3 N=normalize(vN);vec3 V=normalize(cameraPosition-vW);float dist=distance(cameraPosition,vW);
 float sun=max(dot(N,uSunDir),0.0)*cloudShadow(vW.xz);
 vec3 col=vCol*(uSunCol*sun+uAmb);
 vec3 R=reflect(-uSunDir,N);col+=uSunCol*pow(max(dot(R,V),0.0),30.0)*0.5;
 col+=vCol*uNight*0.15+vec3(1.0,0.8,0.5)*uNight*0.25*step(0.8,fract(vW.y*0.35));
 col=applyHaze(col,dist,-V);
 gl_FragColor=vec4(FIN(col),1.0);}`;
// ---------- WAKES ----------
const wakeVert=`
varying vec2 vUv;varying vec3 vW;
void main(){vec4 wp=instanceMatrix*vec4(position,1.0);vW=wp.xyz;vUv=uv;gl_Position=projectionMatrix*viewMatrix*wp;}`;
const wakeFrag=`
varying vec2 vUv;varying vec3 vW;
void main(){
 float v=vUv.y;float u=vUv.x*2.0-1.0;
 float band=exp(-60.0*pow(abs(u)-v*0.72,2.0));
 float turb=exp(-7.0*u*u)*(1.0-v);
 float foam=vnoise(vec2(u*6.0,v*26.0-uTime*1.4));
 float a=(band*1.0+turb*1.1)*(0.4+0.6*foam)*pow(1.0-v,1.4);
 vec3 col=mix(uAmb*2.0,uSunCol,0.35)*a*1.2;
 gl_FragColor=vec4(col*uExp,a*0.75);
}`;
// ---------- SHADOWS ----------
const shadowVert=`
uniform vec3 uShadowVec;varying float vFade;
void main(){
 vec4 base=instanceMatrix*vec4(position.x,0.0,position.z,1.0);
 float h=length(instanceMatrix[1].xyz);
 vec3 w=base.xyz+uShadowVec*h*position.y;
 w.y=instanceMatrix[3].y+2.1;
 vFade=1.0-position.y*0.55;
 gl_Position=projectionMatrix*viewMatrix*vec4(w,1.0);}`;
const shadowFrag=`
uniform float uShadowA;varying float vFade;
void main(){gl_FragColor=vec4(0.02,0.03,0.08,uShadowA*vFade);}`;
// ---------- STEAM ----------
const steamVert=`
attribute float aSeed;varying vec2 vUv;varying float vSeed;varying float vDist;
void main(){
 vec3 c=vec3(instanceMatrix[3].xyz);
 vec3 right=normalize(vec3(viewMatrix[0][0],viewMatrix[1][0],viewMatrix[2][0]));
 vec3 up=vec3(0,1,0);
 vec3 w=c+right*position.x*10.0+up*position.y*17.0;
 vUv=uv;vSeed=aSeed;vDist=distance(cameraPosition,c);
 gl_Position=projectionMatrix*viewMatrix*vec4(w,1.0);}`;
const steamFrag=`
varying vec2 vUv;varying float vSeed;varying float vDist;
void main(){
 float t=uTime*0.5+vSeed*8.0;
 float n=vnoise(vUv*vec2(3.0,4.0)+vec2(vSeed*7.0,-t))*vnoise(vUv*vec2(7.0,9.0)+vec2(0.0,-t*1.7));
 float a=n*smoothstep(0.0,0.25,vUv.y)*(1.0-vUv.y)*(1.0-abs(vUv.x*2.0-1.0));
 a*=1.0-smoothstep(700.0,1600.0,vDist);
 vec3 col=mix(uAmb*2.2,uSunCol*1.2,0.4);
 gl_FragColor=vec4(col,a*0.5);
}`;
// ---------- BILLBOARDS (Times Sq) ----------
const billVert=`
attribute float aSeed;varying vec2 vUv;varying float vSeed;varying vec3 vW;
void main(){vec4 wp=modelMatrix*vec4(position,1.0);vW=wp.xyz;vUv=uv;vSeed=aSeed;gl_Position=projectionMatrix*viewMatrix*wp;}`;
const billFrag=`
varying vec2 vUv;varying float vSeed;varying vec3 vW;
void main(){
 float t=floor(uTime*0.8)+vSeed*13.0;
 vec2 cell=floor(vUv*vec2(3.0,5.0));
 float h=hash12(cell+t);
 vec3 pal[6];pal[0]=vec3(1.0,0.15,0.3);pal[1]=vec3(0.1,0.55,1.0);pal[2]=vec3(1.0,0.75,0.1);pal[3]=vec3(0.2,1.0,0.6);pal[4]=vec3(0.9,0.2,1.0);pal[5]=vec3(1.0,1.0,1.0);
 vec3 col=pal[int(mod(h*6.0,6.0))];
 float scan=0.8+0.2*sin(vUv.y*80.0+uTime*8.0);
 float stripe=step(0.5,fract(vUv.y*5.0+uTime*(0.2+hash12(vec2(vSeed,1.0)))));
 col*=mix(0.5,1.2,stripe)*scan;
 float dist=distance(cameraPosition,vW);
 col*=(0.9+2.6*uNight);
 col=applyHaze(col,dist,normalize(vW-cameraPosition));
 gl_FragColor=vec4(FIN(col),1.0);
}`;
// ---------- POINTS: crowd / glow ----------
const crowdVert=`
attribute float aP;varying float vA;varying float vP;
void main(){
 vec4 wp=modelMatrix*vec4(position,1.0);
 float dist=distance(cameraPosition,wp.xyz);
 float fade=1.0-smoothstep(500.0,950.0,dist);
 float pulse=0.35+0.65*step(fract(uTime*0.10+aP),0.55);
 vA=fade*pulse;vP=aP;
 gl_PointSize=clamp(420.0/dist,1.0,5.0);
 gl_Position=projectionMatrix*viewMatrix*wp;
 if(vA<0.02)gl_Position=vec4(0.0,0.0,-10.0,1.0);
}`;
const crowdFrag=`
varying float vA;varying float vP;
void main(){
 vec2 d=gl_PointCoord-0.5;if(dot(d,d)>0.25)discard;
 vec3 col=mix(vec3(0.10,0.09,0.10),vec3(0.35,0.22,0.16),fract(vP*7.7));
 gl_FragColor=vec4(col*uExp,vA*0.85);
}`;
const glowVert=`
attribute float aI;varying float vI;
uniform float uGate;
void main(){
 vec4 wp=modelMatrix*vec4(position,1.0);
 float dist=distance(cameraPosition,wp.xyz);
 vI=uGate*(0.5+0.5*aI);
 gl_PointSize=clamp(1050.0/dist*(1.0+aI),1.6,6.5);
 gl_Position=projectionMatrix*viewMatrix*wp;
 if(vI<0.02)gl_Position=vec4(0.0,0.0,-10.0,1.0);
}`;
const glowFrag=`
uniform vec3 uGlowCol;varying float vI;
void main(){
 vec2 d=gl_PointCoord-0.5;float r2=dot(d,d);if(r2>0.25)discard;
 float a=(1.0-r2*4.0);
 gl_FragColor=vec4(uGlowCol*vI*2.2,a*vI);
}`;
// ---------- CONTRAIL / FLAG ----------
const trailVert=`varying vec2 vUv;varying vec3 vW;void main(){vec4 wp=modelMatrix*vec4(position,1.0);vW=wp.xyz;vUv=uv;gl_Position=projectionMatrix*viewMatrix*wp;}`;
const trailFrag=`
uniform float uHead;varying vec2 vUv;varying vec3 vW;
void main(){
 float d=uHead-vUv.y;
 float a=smoothstep(0.0,0.02,d)*exp(-d*6.0)*0.55;
 a*=0.6+0.4*vnoise(vec2(vUv.y*90.0,uTime*0.2));
 vec3 col=mix(uAmb*2.5,uSunCol,0.4);
 gl_FragColor=vec4(col,a);
}`;
const flagVert=`
attribute vec3 aCol;varying vec3 vCol;varying vec3 vW;
void main(){
 vec3 p=position;
 vec4 wp=instanceMatrix*vec4(p,1.0);
 float w=max(p.x,0.0);
 wp.xyz+=vec3(0.0,sin(uTime*4.0+wp.x*0.5+w*2.5)*0.5*w,cos(uTime*3.4+w*3.0)*0.6*w);
 vW=wp.xyz;vCol=aCol;
 gl_Position=projectionMatrix*viewMatrix*wp;}`;
const flagFrag=`
varying vec3 vCol;varying vec3 vW;
void main(){
 float dist=distance(cameraPosition,vW);
 vec3 col=vCol*(uSunCol*max(uSunDir.y,0.3)+uAmb);
 col=applyHaze(col,dist,normalize(vW-cameraPosition));
 gl_FragColor=vec4(FIN(col),1.0);}`;
// ---------- park textured overlay ----------
const parkVert=`varying vec2 vUv;varying vec3 vW;void main(){vec4 wp=modelMatrix*vec4(position,1.0);vW=wp.xyz;vUv=uv;gl_Position=projectionMatrix*viewMatrix*wp;}`;
const parkFrag=`
uniform sampler2D uMap;varying vec2 vUv;varying vec3 vW;
void main(){
 vec3 base=texture2D(uMap,vUv).rgb;
 base=pow(base,vec3(2.2));
 vec3 V=normalize(cameraPosition-vW);float dist=distance(cameraPosition,vW);
 float sun=max(uSunDir.y,0.0)*cloudShadow(vW.xz);
 vec3 col=base*(uSunCol*sun+uAmb);
 col=applyHaze(col,dist,-V);
 gl_FragColor=vec4(FIN(col),1.0);}`;

const S={U,LIGHTS,setLight,tick,COMMON,
 bld:()=>mat(bldVertI,bldFrag,{inst:1}),
 lm:()=>mat(bldVertM,bldFrag),
 boro:()=>mat(boroVert,boroFrag,{inst:1}),
 ground:()=>mat(groundVert,groundFrag,{side:THREE.DoubleSide}),
 road:()=>mat(roadVert,roadFrag,{po:-2}),
 water:()=>mat(waterVert,waterFrag),
 sky:()=>mat(skyVert,skyFrag,{side:THREE.BackSide,depthWrite:false}),
 tree:()=>mat(treeVert,treeFrag,{inst:1}),
 car:()=>mat(carVert,carFrag,{inst:1}),
 boat:()=>mat(boatVert,boatFrag,{inst:1}),
 solid:()=>mat(solidVert,boatFrag),
 wake:()=>mat(wakeVert,wakeFrag,{transparent:true,depthWrite:false,add:true,inst:1}),
 shadow:()=>mat(shadowVert,shadowFrag,{transparent:true,depthWrite:false,po:-4,inst:1}),
 steam:()=>mat(steamVert,steamFrag,{transparent:true,depthWrite:false,inst:1}),
 bill:()=>mat(billVert,billFrag,{side:THREE.DoubleSide}),
 crowd:()=>mat(crowdVert,crowdFrag,{transparent:true,depthWrite:false}),
 glow:(col,gate)=>mat(glowVert,glowFrag,{transparent:true,depthWrite:false,add:true,uniforms:{uGlowCol:{value:new THREE.Color(col)},uGate:{value:gate}}}),
 trail:(u)=>mat(trailVert,trailFrag,{transparent:true,depthWrite:false,uniforms:{uHead:u}}),
 flag:()=>mat(flagVert,flagFrag,{side:THREE.DoubleSide,inst:1}),
 park:(tex)=>mat(parkVert,parkFrag,{uniforms:{uMap:{value:tex}},po:-1}),
};
return S;
};
})();
