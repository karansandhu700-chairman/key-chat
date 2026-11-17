/* Key Chat animated backgrounds (loaded only when one is chosen).
   Shaders adapted from React Bits (reactbits.dev, David Haz), licence "MIT + Commons Clause":
   used here inside the app only; not redistributed as a component library.
   Everything runs on the phone's GPU. Nothing is sent anywhere. */
(function(){
"use strict";
const VS=`#version 300 es
out vec2 vUv;
void main(){ vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2)); vUv=p; gl_Position=vec4(p*2.0-1.0,0.0,1.0); }`;
const HEAD=`#version 300 es
precision highp float;
precision highp int;
`;

/* ---------- Shader sources ---------- */
const OKLAB=`
vec3 labToRgb(vec3 lab){
  float l=lab.x+0.3963377774*lab.y+0.2158037573*lab.z;
  float m=lab.x-0.1055613458*lab.y-0.0638541728*lab.z;
  float s=lab.x-0.0894841775*lab.y-1.2914855480*lab.z;
  l=l*l*l; m=m*m*m; s=s*s*s;
  return vec3(4.0767416621*l-3.3077115913*m+0.2309699292*s,-1.2684380046*l+2.6097574011*m-0.3413193965*s,-0.0041960863*l-0.7034186147*m+1.7076147010*s);
}
vec3 encode(vec3 c){ c=clamp(c,0.0,1.0); return mix(c*12.92,1.055*pow(c,vec3(1.0/2.4))-0.055,step(0.0031308,c)); }
`;

const GRAIN=HEAD+`
uniform float uAspect,uTime,uExtent,uBands,uSoftness,uFlow,uScale,uSilk,uContrast,uSaturation,uGrain;
uniform vec3 uRamp[8]; uniform int uCount; uniform int uType; uniform vec2 uDir,uSeed;
in vec2 vUv; out vec4 outColor;
vec2 hash2(vec2 p){ vec3 q=fract(vec3(p.xyx)*vec3(0.1031,0.103,0.0973)); q+=dot(q,q.yzx+33.33); return fract((q.xx+q.yz)*q.zy)*2.0-1.0; }
float noise(vec2 p){ vec2 i=floor(p),f=fract(p); vec2 u=f*f*f*(f*(f*6.0-15.0)+10.0);
  float a=dot(hash2(i),f),b=dot(hash2(i+vec2(1,0)),f-vec2(1,0)),c=dot(hash2(i+vec2(0,1)),f-vec2(0,1)),d=dot(hash2(i+vec2(1,1)),f-vec2(1,1));
  return 0.5+0.5*mix(mix(a,b,u.x),mix(c,d,u.x),u.y); }
vec2 drift(vec2 p,float t){
  vec2 w1=vec2(noise(p*0.85+vec2(t*0.11,t*0.07)),noise(p*0.85+vec2(4.1,1.7)-vec2(t*0.08,t*0.12)));
  vec2 w2=vec2(noise(p*1.55+w1*1.8+vec2(1.3,7.1)+t*0.05),noise(p*1.55+w1*1.8+vec2(6.4,2.2)-t*0.06));
  return (w1-0.5)*1.1+(w2-0.5)*0.55; }
vec2 warp(vec2 p){ vec2 q=p/uScale;
  if(uType==1){ float turn=uTime*0.35; q=mat2(cos(turn),sin(turn),-sin(turn),cos(turn))*q; } else { q+=vec2(-uDir.y,uDir.x)*uTime*0.45; }
  return p+drift(q+uSeed,uTime)*uFlow*uScale; }
float coord(vec2 p){ vec2 w=warp(p); return uType==1?1.0-length(w)*1.1:dot(w,uDir)/uExtent+0.5; }
`+OKLAB+`
float hash(vec2 p){ vec3 q=fract(vec3(p.xyx)*0.1031); q+=dot(q,q.yzx+33.33); return fract((q.x+q.y)*q.z); }
void main(){
  vec2 p=(vUv-0.5)*vec2(uAspect,1.0);
  float raw=coord(p), s=raw;
  if(uBands>1.0){ s*=uBands; float cy=floor(s); s=fract(s); if(mod(cy,2.0)>0.5) s=1.0-s; }
  s=clamp(s,0.0,1.0);
  float scaled=s*float(uCount-1);
  int index=int(min(floor(scaled),float(uCount-2)));
  float f=scaled-float(index);
  float edge=max(uSoftness*0.5,fwidth(scaled)*0.75);
  float shaped=smoothstep(0.5-edge,0.5+edge,f);
  vec3 from=uRamp[0],to=uRamp[1];
  for(int i=0;i<7;i++){ if(i==index){ from=uRamp[i]; to=uRamp[i+1]; } }
  vec3 lab=mix(from,to,shaped);
  if(uSilk>0.0){
    vec2 grad=vec2(coord(p+vec2(0.004,0.0))-raw,coord(p+vec2(0.0,0.004))-raw)/0.004;
    vec2 slope=grad*sin(3.14159265*clamp(raw,0.0,1.0)*uBands)*uSilk*4.0;
    vec3 normal=normalize(vec3(-slope,1.0));
    vec3 light=normalize(vec3(-uDir.y,uDir.x,1.2));
    float diffuse=dot(normal,light)-light.z;
    lab=uRamp[0]+(lab-uRamp[0])*(1.0+(diffuse*0.35+max(diffuse,0.0)*diffuse*0.6)*uSilk);
  }
  lab.x=(lab.x-0.55)*uContrast+0.55; lab.yz*=uSaturation;
  vec3 color=encode(labToRgb(lab));
  float luma=dot(color,vec3(0.2126,0.7152,0.0722));
  float g=hash(gl_FragCoord.xy)+hash(gl_FragCoord.xy+7.13)-1.0;
  color+=g*uGrain*(0.45+2.2*luma*(1.0-luma));
  outColor=vec4(clamp(color,0.0,1.0),1.0);
}`;

const SILK=HEAD+`
uniform vec2 uView; uniform float uScale,uRotation,uTime,uWave,uRipple,uFold,uNoiseIntensity,uDepth,uSheen,uLightMode;
uniform vec2 uShift,uStep; uniform vec3 uColor,uSheenColor,uLight;
out vec4 outColor;
const float e=2.71828182845904523536;
float noise(vec2 t){ float G=e; vec2 r=(G*sin(G*t)); return fract(r.x*r.y*(1.0+t.x)); }
vec2 rotateUvs(vec2 uv,float a){ float c=cos(a),s=sin(a); return mat2(c,-s,s,c)*uv; }
float silk(vec2 vUv){
  vec2 uv=rotateUvs(vUv*uScale,uRotation); vec2 tex=uv*uScale+uShift; float tO=uTime;
  tex.y+=0.03*uWave*sin(8.0*tex.x-tO);
  return 0.6+0.4*uFold*sin(5.0*(tex.x+tex.y+cos(3.0*tex.x+5.0*tex.y)+0.02*tO)+uRipple*sin(20.0*(tex.x+tex.y-0.1*tO))); }
float softClipF(float x){ return x; }
vec3 softClip(vec3 c){ vec3 over=max(c-0.75,0.0); return min(c,0.75)+0.25*(1.0-exp(-over*4.0)); }
void main(){
  vec2 vUv=gl_FragCoord.xy/uView;
  float pattern=silk(vUv); float rnd=noise(gl_FragCoord.xy);
  float n=clamp((pattern-0.2)/0.8,0.0,1.0);
  float gx=silk(vUv+vec2(uStep.x,0.0))-pattern, gy=silk(vUv+vec2(0.0,uStep.y))-pattern;
  vec3 normal=normalize(vec3(-gx*26.0,-gy*26.0,1.0));
  vec3 toLight=normalize(vec3(uLight.xy,0.85));
  float relief=1.0+(dot(normal,toLight)-toLight.z)*1.8*uDepth;
  vec3 halfway=normalize(toLight+vec3(0.0,0.0,1.0));
  float gloss=pow(max(dot(normal,halfway),0.0),48.0)*smoothstep(0.25,0.85,n);
  float crest=pow(n,5.0);
  float shine=(gloss*0.85+crest*0.4)*uSheen*(1.0+uLight.z*0.6);
  vec3 result;
  if(uLightMode>0.5){
    float fold=smoothstep(0.28,0.9,pattern), specular=smoothstep(0.72,0.98,pattern);
    vec3 shadowColor=uColor*(0.72-0.12*uDepth), bodyColor=min(uColor*1.18,vec3(1.0));
    vec3 lightBase=mix(shadowColor,bodyColor,fold)*mix(1.0,relief,0.6);
    lightBase=mix(lightBase,vec3(1.0),clamp(specular*0.92+shine*0.22,0.0,1.0));
    float fineNoise=noise(gl_FragCoord.xy*0.63+vec2(17.0,41.0));
    float gs=clamp(uNoiseIntensity*0.038,0.0,0.16);
    result=clamp(lightBase+(rnd+fineNoise-1.0)*gs,0.0,1.0);
  } else {
    float grain=rnd/15.0*uNoiseIntensity;
    float floorValue=mix(0.2,0.03,uDepth);
    float curve=uDepth>0.0?pow(n,1.0+1.4*uDepth):n;
    float shade=uDepth>0.0?floorValue+(1.0-floorValue)*curve:pattern;
    vec3 tone=mix(uColor,pow(uColor,vec3(1.45)),(1.0-n)*uDepth);
    vec3 lit=tone*shade*relief-vec3(grain);
    vec3 tint=mix(uColor,uSheenColor,0.8);
    vec3 extra=tint*shine;
    float blend=clamp(uSheen*4.0,0.0,1.0);
    result=mix(clamp(lit,0.0,1.0),clamp(softClip(lit+extra),0.0,1.0),blend);
  }
  outColor=vec4(result,1.0);
}`;

const IRI=HEAD+`
uniform vec2 uResolution; uniform float uTime,uAmplitude,uScale,uRotation,uWarp,uHue,uSaturation,uBrightness,uContrast,uGrain,uSeed;
uniform vec3 uColor; uniform vec2 uMouse; uniform int uDetail;
in vec2 vUv; out vec4 outColor;
vec3 hueRotate(vec3 c,float angle){ const vec3 k=vec3(0.57735027); float ca=cos(angle); return c*ca+cross(k,c)*sin(angle)+k*dot(k,c)*(1.0-ca); }
float hash(vec2 p){ p=fract(p*vec2(443.897,441.423)); p+=dot(p,p.yx+19.19); return fract((p.x+p.y)*p.x); }
void main(){
  float mr=min(uResolution.x,uResolution.y); vec2 aspect=uResolution/mr;
  vec2 uv=(vUv*2.0-1.0)*aspect;
  float c=cos(uRotation),s=sin(uRotation); uv=mat2(c,-s,s,c)*uv/uScale;
  uv+=(uMouse-vec2(0.5))*uAmplitude;
  float d=-uTime*0.5, a=0.0;
  for(int i=0;i<24;i++){ if(i>=uDetail) break; float fi=float(i); a+=cos(fi-d-a*uv.x*uWarp); d+=sin(uv.y*fi+a); }
  d+=uTime*0.5;
  vec3 col=vec3(cos(uv*vec2(d,a))*0.6+0.4,cos(a+d)*0.5+0.5);
  col=cos(col*cos(vec3(d,a,2.5))*0.5+0.5)*uColor;
  col=hueRotate(col,uHue);
  float luma=dot(col,vec3(0.2126,0.7152,0.0722));
  col=mix(vec3(luma),col,uSaturation);
  col=(col-0.5)*uContrast+0.5; col*=uBrightness;
  col+=(hash(gl_FragCoord.xy+uSeed)-0.5)*uGrain*0.12;
  outColor=vec4(clamp(col,0.0,1.0),1.0);
}`;

const SOFT=HEAD+`
uniform vec2 uResolution; uniform float uFlow,uHue,uScale,uBrightness,uNoiseFreq,uNoiseAmp,uBandHeight,uBandSpread,uOctaveDecay,uLayerOffset,uSpectrum,uLightMode,uOpacity;
uniform vec3 uColor1,uColor2;
out vec4 fragColor;
#define TAU 6.28318
vec3 gradientHash(vec3 p){ p=vec3(dot(p,vec3(127.1,311.7,234.6)),dot(p,vec3(269.5,183.3,198.3)),dot(p,vec3(169.5,283.3,156.9)));
  vec3 h=fract(sin(p)*43758.5453123); float phi=acos(2.0*h.x-1.0),theta=TAU*h.y; return vec3(cos(theta)*sin(phi),sin(theta)*cos(phi),cos(phi)); }
float quinticSmooth(float t){ float t2=t*t,t3=t*t2; return 6.0*t3*t2-15.0*t2*t2+10.0*t3; }
vec3 cosineGradient(float t,vec3 a,vec3 b,vec3 c,vec3 d){ return a+b*cos(TAU*(c*t+d)); }
float perlin3D(float amplitude,float frequency,float px,float py,float pz){
  float x=px*frequency,y=py*frequency; float fx=floor(x),fy=floor(y),fz=floor(pz),cx=ceil(x),cy=ceil(y),cz=ceil(pz);
  vec3 g000=gradientHash(vec3(fx,fy,fz)),g100=gradientHash(vec3(cx,fy,fz)),g010=gradientHash(vec3(fx,cy,fz)),g110=gradientHash(vec3(cx,cy,fz));
  vec3 g001=gradientHash(vec3(fx,fy,cz)),g101=gradientHash(vec3(cx,fy,cz)),g011=gradientHash(vec3(fx,cy,cz)),g111=gradientHash(vec3(cx,cy,cz));
  float d000=dot(g000,vec3(x-fx,y-fy,pz-fz)),d100=dot(g100,vec3(x-cx,y-fy,pz-fz)),d010=dot(g010,vec3(x-fx,y-cy,pz-fz)),d110=dot(g110,vec3(x-cx,y-cy,pz-fz));
  float d001=dot(g001,vec3(x-fx,y-fy,pz-cz)),d101=dot(g101,vec3(x-cx,y-fy,pz-cz)),d011=dot(g011,vec3(x-fx,y-cy,pz-cz)),d111=dot(g111,vec3(x-cx,y-cy,pz-cz));
  float sx=quinticSmooth(x-fx),sy=quinticSmooth(y-fy),sz=quinticSmooth(pz-fz);
  float lx00=mix(d000,d100,sx),lx10=mix(d010,d110,sx),lx01=mix(d001,d101,sx),lx11=mix(d011,d111,sx);
  return amplitude*mix(mix(lx00,lx10,sy),mix(lx01,lx11,sy),sz); }
float auroraGlow(float t,vec2 uv){
  float noiseVal=0.0,freq=uNoiseFreq,amp=uNoiseAmp; vec2 sp=uv*uScale;
  for(float i=0.0;i<3.0;i+=1.0){ noiseVal+=perlin3D(amp,freq,sp.x,sp.y,t); amp*=uOctaveDecay; freq*=2.0; }
  float yBand=uv.y*10.0-uBandHeight*10.0;
  return 0.3*max(exp(uBandSpread*(1.0-1.1*abs(noiseVal+yBand))),0.0); }
void main(){
  vec2 uv=gl_FragCoord.xy/uResolution.xy; vec2 field=gl_FragCoord.xy/uResolution.y; float t=0.4*uFlow;
  float glow1=auroraGlow(t,field),glow2=auroraGlow(t+uLayerOffset,field);
  vec3 g1=mix(vec3(1.0),cosineGradient(uv.x+uHue*0.2,vec3(0.5),vec3(0.5),vec3(1.0),vec3(0.3,0.20,0.20)),uSpectrum);
  vec3 g2=mix(vec3(1.0),cosineGradient(uv.x+uHue*0.1,vec3(0.5),vec3(0.5),vec3(2.0,1.0,0.0),vec3(0.5,0.20,0.25)),uSpectrum);
  vec3 col=0.99*glow1*g1*uColor1; col+=0.99*glow2*g2*uColor2; col*=uBrightness;
  float grain=(fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(0.06711056,0.00583715))))-0.5)/255.0;
  if(uLightMode>0.5){
    float energy=max(col.r,max(col.g,col.b)); vec3 hue=clamp(col/max(energy,1e-4),0.0,1.0);
    vec3 average=(glow1*uColor1+glow2*uColor2)/max(glow1+glow2,1e-4);
    float top=max(average.r,max(average.g,average.b)); float spread=top-min(average.r,min(average.g,average.b));
    float core=smoothstep(0.55,1.6,energy); float depth=1.25+0.45*core;
    vec3 tint=mix(average*0.82,pow(average/max(top,1e-4),vec3(depth+0.6)),smoothstep(0.04,0.2,spread));
    float vivid=smoothstep(0.12,0.55,1.0-min(hue.r,min(hue.g,hue.b)))*smoothstep(0.04,0.2,spread);
    vec3 ink=mix(tint,pow(hue,vec3(depth)),vivid)*mix(0.93,0.8,core);
    float density=0.88*(1.0-exp(-1.9*pow(energy,1.7))); density=clamp(density*uOpacity+grain,0.0,1.0);
    fragColor=vec4(ink*density,density);
  } else {
    float alpha=clamp(length(col),0.0,1.0); vec3 color=clamp(col,0.0,1.0);
    fragColor=vec4(clamp(color*alpha+grain,0.0,alpha)*uOpacity,alpha*uOpacity);
  }
}`;

const AUR=HEAD+`
uniform vec2 uResolution; uniform float uTime,uAmplitude,uBlend,uHeight,uScale,uGlow,uBrightness,uOpacity,uLightMode;
uniform vec3 uStops[8]; uniform int uStopCount; uniform int uLayers;
out vec4 outColor;
vec3 permute(vec3 x){ return mod(((x*34.0)+1.0)*x,289.0); }
float snoise(vec2 v){
  const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
  vec2 i=floor(v+dot(v,C.yy)); vec2 x0=v-i+dot(i,C.xx);
  vec2 i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);
  vec4 x12=x0.xyxy+C.xxzz; x12.xy-=i1; i=mod(i,289.0);
  vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));
  vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0); m=m*m; m=m*m;
  vec3 x=2.0*fract(p*C.www)-1.0; vec3 h=abs(x)-0.5; vec3 ox=floor(x+0.5); vec3 a0=x-ox;
  m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);
  vec3 g; g.x=a0.x*x0.x+h.x*x0.y; g.yz=a0.yz*x12.xz+h.yz*x12.yw; return 130.0*dot(m,g); }
float smootherstep(float e0,float e1,float x){ float t=clamp((x-e0)/(e1-e0),0.0,1.0); return t*t*t*(t*(t*6.0-15.0)+10.0); }
vec3 oklabToLinear(vec3 c){
  float l=c.x+0.3963377774*c.y+0.2158037573*c.z, m=c.x-0.1055613458*c.y-0.0638541728*c.z, s=c.x-0.0894841775*c.y-1.2914855480*c.z;
  l=l*l*l; m=m*m*m; s=s*s*s;
  return vec3(4.0767416621*l-3.3077115913*m+0.2309699292*s,-1.2684380046*l+2.6097574011*m-0.3413193965*s,-0.0041960863*l-0.7034186147*m+1.7076147010*s); }
vec3 toSrgb(vec3 c){ c=clamp(c,0.0,1.0); return mix(c*12.92,1.055*pow(c,vec3(1.0/2.4))-0.055,step(0.0031308,c)); }
vec3 ramp(float t){
  float x=clamp(t,0.0,1.0)*float(uStopCount-1); int i=int(min(floor(x),float(uStopCount-2))); float f=x-float(i); f=f*f*(3.0-2.0*f);
  vec3 lch=mix(uStops[i],uStops[i+1],f); lch.x=mix(lch.x,min(lch.x,0.7),uLightMode);
  return toSrgb(oklabToLinear(vec3(lch.x,lch.y*cos(lch.z),lch.y*sin(lch.z)))); }
float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
void main(){
  vec2 frag=gl_FragCoord.xy; float y=1.0-frag.y/uResolution.y; float u=frag.x/uResolution.x;
  float X=(frag.x-uResolution.x*0.5)/uResolution.y; float t=uTime;
  vec3 glow=vec3(0.0); float cover=0.0;
  for(int k=0;k<4;k++){
    if(k>=uLayers) break;
    float layer=float(k), seed=layer*13.7, pace=t*(1.0-layer*0.18);
    float warp=snoise(vec2(X*0.45*uScale+pace*0.02+seed,pace*0.05+seed));
    float wave=snoise(vec2(X*0.75*uScale+warp*0.35-pace*0.03+seed,pace*0.07-seed))*0.72+snoise(vec2(X*1.6*uScale+warp*0.5+pace*0.04-seed,pace*0.1+seed*0.5))*0.28;
    float hem=uHeight+layer*0.07+wave*0.15*uAmplitude;
    float soft=(0.04+uBlend*0.16)*(1.0+layer*0.9);
    float rise=hem-y; float low=-soft-uGlow*0.14; float high=0.26+soft*0.6;
    float body=pow(smootherstep(low,high,rise),1.5+uGlow*0.6);
    float lobes=0.86+0.14*snoise(vec2(X*0.9*uScale-pace*0.025+seed,y*0.3+pace*0.04));
    float alpha=clamp(body*lobes*(layer<0.5?1.0:0.32/layer),0.0,1.0);
    vec3 tint=ramp(u+0.05*sin(pace*0.08+layer*2.3)+layer*0.1+max(rise,0.0)*0.05);
    glow=1.0-(1.0-glow)*(1.0-tint*alpha); cover=1.0-(1.0-cover)*(1.0-alpha);
  }
  float fade=uOpacity; float strength=clamp(uBrightness,0.0,2.0);
  glow*=fade*min(strength,1.0); cover*=fade*min(strength,1.0);
  glow=1.0-pow(1.0-glow,vec3(max(strength,1.0)));
  float dither=(hash(frag)-0.5)/255.0;
  if(uLightMode>0.5){
    vec3 tint=cover>0.0001?glow/cover:vec3(0.0); cover*=smootherstep(0.0,0.25,cover);
    float alpha=cover*0.7; outColor=vec4(tint*alpha+dither,clamp(alpha+dither,0.0,1.0)); return;
  }
  outColor=vec4(glow+dither,clamp(cover+dither,0.0,1.0));
}`;

const CHROME=HEAD+`
uniform vec2 uResolution; uniform float uUnit,uTime,uAmplitude,uDetail,uSharpness,uDepth,uPresence,uRoughness,uExposure,uLight;
uniform vec2 uFrequency,uShift; uniform vec3 uTint;
out vec4 fragColor;
float lamp(vec2 p,vec2 center,vec2 size,float soft){
  vec2 grown=size+soft; vec2 q=(p-center)/grown; q*=q; float d=sqrt(sqrt(dot(q,q)));
  float edge=soft/min(grown.x,grown.y);
  float shape=(1.0-smoothstep(1.0-edge,1.0+edge,d))*(1.0-0.45*d*d);
  return shape*size.x*size.y/(grown.x*grown.y); }
vec3 studio(vec3 r,float blur){
  vec2 p=r.xy/max(r.z+1.0,0.05); p+=uShift*smoothstep(0.3,1.0,length(p));
  float radius=length(p); float soft=0.008+blur; vec2 dir=p/max(radius,1e-3);
  float key=lamp(p,vec2(-0.25,0.42),vec2(0.3,0.12),soft);
  float side=lamp(p,vec2(0.48,0.12),vec2(0.06,0.3),soft);
  float ground=lamp(p,vec2(-0.1,-0.55),vec2(0.45,0.06),soft);
  float rise=smoothstep(-1.0,1.0,dir.y);
  if(uLight>0.5){
    float edge=0.008+blur*0.8;
    float lobe=smoothstep(0.15,0.85,0.5+0.5*sin(atan(dir.y,dir.x)*2.0+0.9));
    float tone=mix(2.4,0.95,smoothstep(0.5-edge,1.0+edge,radius));
    tone=mix(tone,0.02,smoothstep(0.98-edge,1.12+edge,radius));
    tone=mix(tone,mix(0.03,0.3,lobe)*(0.8+0.4*rise),smoothstep(1.15-edge,1.3+edge,radius));
    float width=0.035+edge;
    tone+=2.4*exp(-pow((radius-1.4)/width,2.0))*min(1.0,0.06/width)*(0.6+0.4*rise);
    return vec3(tone)*(1.0-0.5*side)*(1.0-0.3*ground)+0.8*key;
  }
  float width=0.015+soft*2.0;
  float rim=exp(-abs(radius-1.0)/width)*0.031/width*(0.8+smoothstep(-0.5,0.8,p.y));
  float band=1.0-0.95*smoothstep(1.04-soft,1.12+soft,radius);
  float wall=smoothstep(1.25,1.55,radius)*(0.6+0.4*rise);
  float streak=smoothstep(0.2,0.8,0.5+0.5*sin(atan(dir.y,dir.x)*3.0+0.6));
  vec3 color=vec3(0.004,0.004,0.005)+0.02*smoothstep(-0.4,0.6,p.y);
  color+=vec3(1.0,0.97,0.94)*key*4.0+vec3(0.9,0.95,1.0)*side*3.0+ground*1.2;
  color+=vec3(1.0,0.98,0.95)*rim; color*=band;
  return color+vec3(mix(0.45,1.8,streak))*wall; }
vec3 shade(vec2 slope,vec3 v,float blur,vec3 f0){
  float steep=length(slope); slope*=3.0*tanh(steep/3.0)/max(steep,1e-6);
  vec3 n=normalize(vec3(-slope,1.0)); vec3 r=reflect(v,n); float facing=clamp(dot(n,-v),0.0,1.0);
  return studio(r,blur)*(f0+(1.0-f0)*pow(1.0-facing,5.0)); }
vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.0,1.0); }
void main(){
  vec2 frag=gl_FragCoord.xy; vec2 uv=(2.0*frag-uResolution)/uUnit; vec2 p=uv;
  vec2 rowX=vec2(1.0,0.0),rowY=vec2(0.0,1.0); float amplitude=uAmplitude*uPresence;
  for(float i=1.0;i<9.0;i++){
    if(i>uDetail) break;
    float a=amplitude/i; float soften=exp(0.3-0.3*i);
    float argX=i*uFrequency.x*p.y+uTime; p.x+=a*cos(argX); rowX-=a*sin(argX)*i*uFrequency.x*soften*rowY;
    float argY=i*uFrequency.y*p.x+uTime; p.y+=a*cos(argY); rowY-=a*sin(argY)*i*uFrequency.y*soften*rowX;
  }
  float phase=uTime-p.x-p.y; vec2 field=-(rowX+rowY); float density=max(length(field),1e-3); vec2 across=field/density;
  float k=uSharpness; float sn=sin(phase),cs=cos(phase); float th=tanh(k*sn);
  float bevel=(1.0-th*th)/tanh(k); float fade=smoothstep(3.0,9.0,3.14159*uUnit/density); float weight=uDepth*uPresence*fade;
  vec2 slope=k*cs*bevel*weight*across;
  vec2 sweep=-k*bevel*(sn+2.0*k*cs*cs*th)*weight*density*2.0/uUnit*across;
  vec2 stepX=dFdx(slope),stepY=dFdy(slope); vec2 crease=dot(stepX,stepX)>dot(stepY,stepY)?stepX:stepY;
  if(dot(crease,crease)>dot(sweep,sweep)) sweep=crease;
  float bend=length(sweep); float alpha=smoothstep(0.0,0.1,length(slope));
  vec3 f0=mix(vec3(1.0),uTint,smoothstep(0.05,0.6,length(slope)))*0.92;
  vec3 v=normalize(vec3(uv*0.08,-1.0)); float blur=uRoughness*0.35; vec3 light;
  if(bend<0.01){ light=shade(slope,v,blur+bend*0.5,f0); }
  else { light=vec3(0.0); for(float t=-0.375;t<0.4;t+=0.25){ light+=shade(slope+sweep*t,v,blur+bend*0.15,f0); } light*=0.25; }
  vec3 color=pow(aces(light*uExposure),vec3(1.0/2.2));
  float grain=fract(52.9829189*fract(dot(frag,vec2(0.06711056,0.00583715)))); color+=(grain-0.5)/255.0;
  fragColor=vec4(clamp(color,0.0,1.0)*alpha,alpha);
}`;

/* ---------- colour helpers ---------- */
function hex(h){ h=h.replace("#",""); return [0,2,4].map(i=>parseInt(h.substr(i,2),16)/255); }
function lab(h){ const [r,g,b]=hex(h).map(c=>c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4));
  const l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b), m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b), s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);
  return [.2104542553*l+.793617785*m-.0040720468*s, 1.9779984951*l-2.428592205*m+.4505937099*s, .0259040371*l+.7827717662*m-.808675766*s]; }
function lch(L,C,hdeg){ return [L,C,hdeg*Math.PI/180]; }
function flat(a){ const o=[]; a.forEach(v=>o.push.apply(o,v)); while(o.length<24) o.push(0); return new Float32Array(o); }

/* ---------- Effect definitions: shader + per-frame uniforms ---------- */
const FX={
 "fx-grain-l":{frag:GRAIN,speed:.16,light:1,set(u,t,w,h){ u.f("uAspect",w/h);u.f("uTime",t);u.v3("uRamp",flat(["#fff7f0","#ffd9e3","#d6e6ff","#e9ddff","#ffe9c9"].map(lab)));u.i("uCount",5);u.i("uType",0);
   const a=22*Math.PI/180;u.v2("uDir",Math.sin(a),Math.cos(a));u.f("uExtent",w/h*Math.abs(Math.sin(a))+Math.abs(Math.cos(a)));u.f("uBands",1);u.f("uSoftness",.9);u.f("uFlow",.75);u.f("uScale",1);u.f("uSilk",.35);u.v2("uSeed",3.17,1.91);u.f("uContrast",1);u.f("uSaturation",1.1);u.f("uGrain",.035);}},
 "fx-grain-d":{frag:GRAIN,speed:.16,set(u,t,w,h){ u.f("uAspect",w/h);u.f("uTime",t);u.v3("uRamp",flat(["#07070d","#1a1f5c","#5b2a9a","#0f6f86","#2a1038"].map(lab)));u.i("uCount",5);u.i("uType",0);
   const a=22*Math.PI/180;u.v2("uDir",Math.sin(a),Math.cos(a));u.f("uExtent",w/h*Math.abs(Math.sin(a))+Math.abs(Math.cos(a)));u.f("uBands",1);u.f("uSoftness",.9);u.f("uFlow",.75);u.f("uScale",1);u.f("uSilk",.35);u.v2("uSeed",3.17,1.91);u.f("uContrast",1.1);u.f("uSaturation",1.15);u.f("uGrain",.05);}},
 "fx-silk-l":{frag:SILK,speed:1.2,light:1,set(u,t,w,h){ u.v2("uView",w,h);u.f("uScale",1);u.f("uRotation",0);u.f("uTime",t);u.f("uWave",1);u.f("uRipple",1);u.f("uFold",1);u.v2("uShift",0,0);u.v2("uStep",.003,.003);u.v3("uLight",-.5,.6,.3);
   u.f("uNoiseIntensity",1.2);u.f("uDepth",.55);u.f("uSheen",.5);u.f("uLightMode",1);u.c3("uColor","#e7d9cc");u.c3("uSheenColor","#ffffff");}},
 "fx-silk-d":{frag:SILK,speed:1.2,set(u,t,w,h){ u.v2("uView",w,h);u.f("uScale",1);u.f("uRotation",0);u.f("uTime",t);u.f("uWave",1);u.f("uRipple",1);u.f("uFold",1);u.v2("uShift",0,0);u.v2("uStep",.003,.003);u.v3("uLight",-.5,.6,.3);
   u.f("uNoiseIntensity",1.5);u.f("uDepth",.7);u.f("uSheen",.45);u.f("uLightMode",0);u.c3("uColor","#6b4a2e");u.c3("uSheenColor","#ffd9a0");}},
 "fx-iri-l":{frag:IRI,speed:.5,light:1,set(u,t,w,h){ u.v2("uResolution",w,h);u.f("uTime",t);u.v3("uColor",1,1,1);u.v2("uMouse",.5,.5);u.f("uAmplitude",0);u.f("uScale",1.3);u.f("uRotation",0);u.i("uDetail",18);u.f("uWarp",1);u.f("uHue",0);u.f("uSaturation",.75);u.f("uBrightness",1.25);u.f("uContrast",.55);u.f("uGrain",.25);u.f("uSeed",0);}},
 "fx-iri-d":{frag:IRI,speed:.5,set(u,t,w,h){ u.v2("uResolution",w,h);u.f("uTime",t);u.v3("uColor",.5,.7,1);u.v2("uMouse",.5,.5);u.f("uAmplitude",0);u.f("uScale",1.3);u.f("uRotation",0);u.i("uDetail",18);u.f("uWarp",1);u.f("uHue",0);u.f("uSaturation",1);u.f("uBrightness",.5);u.f("uContrast",1.25);u.f("uGrain",.3);u.f("uSeed",0);}},
 "fx-soft-l":{frag:SOFT,speed:.6,light:1,blend:1,set(u,t,w,h){ u.v2("uResolution",w,h);u.f("uFlow",t);u.f("uHue",0);u.f("uScale",1.5);u.f("uBrightness",1);u.c3("uColor1","#7aa8ff");u.c3("uColor2","#e100ff");u.f("uNoiseFreq",2.5);u.f("uNoiseAmp",1);u.f("uBandHeight",.5);u.f("uBandSpread",1);u.f("uOctaveDecay",.1);u.f("uLayerOffset",0);u.f("uSpectrum",.85);u.f("uLightMode",1);u.f("uOpacity",1);}},
 "fx-soft-d":{frag:SOFT,speed:.6,blend:1,set(u,t,w,h){ u.v2("uResolution",w,h);u.f("uFlow",t);u.f("uHue",0);u.f("uScale",1.5);u.f("uBrightness",1);u.c3("uColor1","#f7f7f7");u.c3("uColor2","#e100ff");u.f("uNoiseFreq",2.5);u.f("uNoiseAmp",1);u.f("uBandHeight",.5);u.f("uBandSpread",1);u.f("uOctaveDecay",.1);u.f("uLayerOffset",0);u.f("uSpectrum",.85);u.f("uLightMode",0);u.f("uOpacity",1);}},
 "fx-aur-l":{frag:AUR,speed:.25,light:1,blend:1,set(u,t,w,h){ u.v2("uResolution",w,h);u.f("uTime",t);u.v3("uStops",flat([lch(.85,.14,160),lch(.8,.16,250),lch(.82,.17,330)]));u.i("uStopCount",3);u.f("uAmplitude",1);u.f("uBlend",.6);u.f("uHeight",.62);u.f("uScale",1);u.f("uGlow",.5);u.f("uBrightness",1);u.i("uLayers",3);u.f("uOpacity",.7);u.f("uLightMode",1);}},
 "fx-aur-d":{frag:AUR,speed:.25,blend:1,set(u,t,w,h){ u.v2("uResolution",w,h);u.f("uTime",t);u.v3("uStops",flat([lch(.8,.2,155),lch(.62,.2,265),lch(.7,.22,335)]));u.i("uStopCount",3);u.f("uAmplitude",1);u.f("uBlend",.6);u.f("uHeight",.6);u.f("uScale",1);u.f("uGlow",.5);u.f("uBrightness",.8);u.i("uLayers",3);u.f("uOpacity",1);u.f("uLightMode",0);}},
 "fx-chr-l":{frag:CHROME,speed:.25,light:1,set(u,t,w,h){ u.v2("uResolution",w,h);u.f("uUnit",Math.min(w,h));u.f("uTime",t);u.f("uAmplitude",.3);u.v2("uFrequency",2.5,2.5);u.f("uDetail",6);u.f("uSharpness",1.6);u.f("uDepth",1);u.f("uPresence",1);u.c3("uTint","#f4f6ff");u.v2("uShift",0,0);u.f("uRoughness",.35);u.f("uExposure",.9);u.f("uLight",1);}},
 "fx-chr-d":{frag:CHROME,speed:.25,set(u,t,w,h){ u.v2("uResolution",w,h);u.f("uUnit",Math.min(w,h));u.f("uTime",t);u.f("uAmplitude",.3);u.v2("uFrequency",2.5,2.5);u.f("uDetail",6);u.f("uSharpness",1.6);u.f("uDepth",1);u.f("uPresence",1);u.c3("uTint","#dfe6ff");u.v2("uShift",0,0);u.f("uRoughness",.3);u.f("uExposure",.2);u.f("uLight",0);}}
};

/* ---------- Runtime ---------- */
let canvas,gl,vao,cur=null,prog=null,loc={},raf=0,t0=0,last=0,time=0,key=null,scale=.5,hidden=false,reduce=false,lost=false;
const mq=window.matchMedia?matchMedia("(prefers-reduced-motion: reduce)"):null;
const U={
  f(n,v){ const l=L(n); if(l) gl.uniform1f(l,v); }, i(n,v){ const l=L(n); if(l) gl.uniform1i(l,v); },
  v2(n,a,b){ const l=L(n); if(l) gl.uniform2f(l,a,b); }, v3(n,a,b,c){ const l=L(n); if(!l) return; if(a&&a.length) gl.uniform3fv(l,a); else gl.uniform3f(l,a,b,c); },
  c3(n,h){ const c=hex(h); const l=L(n); if(l) gl.uniform3f(l,c[0],c[1],c[2]); }
};
function L(n){ if(!(n in loc)) loc[n]=gl.getUniformLocation(prog,n); return loc[n]; }
function sh(type,src){ const s=gl.createShader(type); gl.shaderSource(s,src); gl.compileShader(s); if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){ console.warn("fx shader:",gl.getShaderInfoLog(s)); return null; } return s; }
function build(def){
  const v=sh(gl.VERTEX_SHADER,VS), f=sh(gl.FRAGMENT_SHADER,def.frag); if(!v||!f) return null;
  const p=gl.createProgram(); gl.attachShader(p,v); gl.attachShader(p,f); gl.linkProgram(p);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS)){ console.warn("fx link:",gl.getProgramInfoLog(p)); return null; } return p; }
function size(){ const app=document.querySelector(".app")||document.body; const w=Math.max(1,app.clientWidth), h=Math.max(1,app.clientHeight);
  const r=scale*Math.min(window.devicePixelRatio||1,2); canvas.width=Math.max(2,Math.round(w*r)); canvas.height=Math.max(2,Math.round(h*r)); gl.viewport(0,0,canvas.width,canvas.height); }
function draw(){
  if(!cur||!prog) return;
  gl.useProgram(prog);
  if(cur.blend){ gl.enable(gl.BLEND); gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA); } else gl.disable(gl.BLEND);
  gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT);
  cur.set(U,time,canvas.width,canvas.height);
  gl.drawArrays(gl.TRIANGLES,0,3);
}
function frame(now){
  raf=0; if(!cur||hidden||document.hidden) return;
  if(now-last<(window.KC_BATTERY?66:33)){ raf=requestAnimationFrame(frame); return; }           /* ~30 fps keeps the phone cool */
  const dt=Math.min(.05,last?(now-last)/1000:1/30); last=now;
  if(!reduce) time+=dt*cur.speed; draw();
  if(!reduce) raf=requestAnimationFrame(frame);
}
function wake(){ if(!raf&&cur&&!document.hidden) { last=0; raf=requestAnimationFrame(frame); } }
function ensure(){
  if(canvas) return true;
  canvas=document.createElement("canvas"); canvas.id="fxc"; canvas.setAttribute("aria-hidden","true");
  gl=canvas.getContext("webgl2",{alpha:true,antialias:false,premultipliedAlpha:true,powerPreference:"low-power",preserveDrawingBuffer:false});
  if(!gl){ canvas=null; return false; }
  vao=gl.createVertexArray(); gl.bindVertexArray(vao);
  canvas.addEventListener("webglcontextlost",e=>{ e.preventDefault(); lost=true; if(raf) cancelAnimationFrame(raf); raf=0; });
  canvas.addEventListener("webglcontextrestored",()=>{ lost=false; const k=key; prog=null; loc={}; key=null; if(k) start(k); });
  const app=document.querySelector(".app")||document.body; app.insertBefore(canvas,app.firstChild);
  addEventListener("resize",()=>{ if(cur){ size(); draw(); } });
  document.addEventListener("visibilitychange",()=>{ if(document.hidden){ if(raf) cancelAnimationFrame(raf); raf=0; } else wake(); });
  if(mq){ reduce=mq.matches; mq.addEventListener&&mq.addEventListener("change",()=>{ reduce=mq.matches; wake(); }); }
  return true;
}
function start(k){
  const def=FX[k]; if(!def){ stop(); return false; }
  if(!ensure()) return false;
  if(key===k&&prog){ wake(); return true; }
  const p=build(def); if(!p){ stop(); return false; }
  if(prog) gl.deleteProgram(prog);
  prog=p; loc={}; cur=def; key=k; canvas.style.display="block"; time=Math.random()*20; size(); draw(); wake(); return true;
}
function stop(){ if(raf) cancelAnimationFrame(raf); raf=0; cur=null; key=null; if(canvas) canvas.style.display="none"; }
window.KCFX={start,stop,has:k=>k in FX,keys:Object.keys(FX),light:k=>!!(FX[k]&&FX[k].light),supported:()=>{ try{ return !!document.createElement("canvas").getContext("webgl2"); }catch(e){ return false; } }};
})();
