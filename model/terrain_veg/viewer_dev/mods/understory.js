import*as THREE from"three";const QS=new URLSearchParams(location.search);const BASE="../../work/understory/web/";const PRESET={low:{near:0,reach:.6,px:.0045},medium:{near:22,reach:1,px:.0035},auto:{near:22,reach:1,px:.0035},high:{near:30,reach:1.4,px:.003},ultra:{near:34,reach:1.4,px:.0025}};let NEAR=+(QS.get("usnear")||PRESET.medium.near);const USFAR_DEFAULT=700;const USFAR=Math.max(0,+(QS.get("usfar")??USFAR_DEFAULT)||0);const COVK=+(QS.get("uscov")||.55);const PULL=+(QS.get("uspull")??.9);const TOPN=+(QS.get("ustopn")??.8);const STRETCH=+(QS.get("usstretch")||1.35);const GAIN=+(QS.get("usgain")||1.9),BGAIN=+(QS.get("usbgain")||1.3);const FADE=5;const MAX_NEAR_SET=640;const LAYER_PX=512;const loadImage=src=>new Promise(res=>{const im=new Image;im.onload=()=>res(im);im.onerror=()=>res(null);im.src=src});const loadJSON=async src=>{try{const r=await fetch(src);return r.ok?await r.json():null}catch{return null}};const GLSL_FETCH=`
uniform sampler2D uShrubTex;
vec4 sf(float i, int k) { int ii = int(i + 0.5); return texelFetch(uShrubTex, ivec2((ii % 256) * 4 + k, ii / 256), 0); }
float ush(float x) { return fract(sin(x * 12.9898 + 4.1414) * 43758.5453); }
float dither(vec2 p) { return fract(52.9829189 * fract(0.06711056 * p.x + 0.00583715 * p.y)); }
`;const VERT_HEAD_IMP=`
attribute float aI;
attribute float aK;
attribute float aOff;
uniform float uExag, uNear, uFade, uTime, uWind, uFarD, uPxMin;
uniform float uTypeLayer[16];
uniform vec3 uTypeTint[16];
uniform vec4 uVarH[16];
uniform vec4 uVarR[16];
uniform float uHullR[512];
uniform vec4 uMean[16];
uniform vec4 uShape[16];
uniform sampler2D uSkyV;
uniform vec2 uExt;
varying vec3 vQ;
varying vec3 vUvA, vUvB;
varying float vW, vTop, vKeep, vSky, vSeed;
varying vec3 vTint;
varying vec4 vMean, vShape;
`+GLSL_FETCH;const VERT_REC=`
vec4 s0 = sf(aI, 0), s1 = sf(aI, 1);
float h = s0.w, r = s1.x, ty = s1.y, seed = s1.z;
vec3 C = vec3(s0.x, s0.y * uExag + 0.5 * h, s0.z);
vec3 toCam = cameraPosition - C;
float d = length(toCam);
float el = asin(clamp(toCam.y / max(d, 1e-3), -1.0, 1.0));

float elD = degrees(abs(el));
float fA, fB, w;
if (elD < 30.0) { fA = step(0.5, ush(seed * 7.1)); fB = 2.0; w = smoothstep(18.0, 30.0, elD); }
else if (elD < 62.0) { fA = 2.0; fB = 3.0; w = smoothstep(50.0, 62.0, elD); }
else { fA = 3.0; fB = 3.0; w = 0.0; }

int L = int(uTypeLayer[int(ty + 0.5)] + 0.5);
vec4 vh = uVarH[L];
float variant = 0.0, best = 1e9;
for (int k = 0; k < 4; k++) { float e = abs(log(max(vh[k], 0.1) / max(h, 0.1))) + 0.05 * ush(seed * 3.3 + float(k)); if (e < best) { best = e; variant = float(k); } }
float mirror = step(0.5, ush(seed * 5.7)) * 2.0 - 1.0;


int vi = int(variant + 0.5);
r = min(r, US_STRETCH * uVarR[L][vi] * h / max(uVarH[L][vi], 0.1));

vec3 right = normalize(vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]));
vec3 up = normalize(vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]));
float ce = cos(el), se = sin(el);
float sx = r * 1.06, sy = 1.06 * sqrt(0.25 * h * h * ce * ce + r * r * se * se);
float sr = h / max(d, 1.0);
`;const VERT_UV=`

vec2 q = qc;
if (fA > 2.5) { float az = atan(toCam.x, toCam.z); float cz = cos(az), sz = sin(az); q = vec2(cz * q.x - sz * q.y, sz * q.x + cz * q.y); }
float u0 = (0.5 + 0.5 * q.x * mirror) * 0.25, v0 = (0.5 + 0.5 * q.y) * 0.25;
float row = 0.75 - variant * 0.25;
vUvA = vec3(fA * 0.25 + u0, row + v0, float(L));
vUvB = vec3(fB * 0.25 + u0, row + v0, float(L));
vW = w; vSeed = seed;
vTop = 0.5 + 0.5 * qc.y;
vTint = uTypeTint[int(ty + 0.5)] * (0.9 + 0.2 * ush(seed * 9.1));
vMean = uMean[L]; vShape = uShape[L];
vec3 tN = vec3(0.0, 1.0, 0.0);
`;const FRAG_CARD=`
vec4 usCard(vec3 uvl, vec2 apx, vec2 q, vec4 mean, vec4 shape, float top) {
  float lod = 0.5 * log2(max(dot(dFdx(apx), dFdx(apx)), dot(dFdy(apx), dFdy(apx))) + 1e-8);
  float l = clamp(lod, 0.0, 3.0);
  vec4 t = textureLod(uAtlas, uvl, l);
  t.a = clamp(t.a * (1.0 + US_COVK * l), 0.0, 1.0);
  float blob = smoothstep(2.6, 3.6, lod);
  usBlob = blob;
  if (blob > 0.0) {
    vec2 e = (q - vec2(0.0, shape.z)) / (shape.xy * sqrt(shape.w));
    float aB = 1.0 - smoothstep(0.75, 1.0, length(e));
    t = vec4(mix(t.rgb, mean.rgb * US_BGAIN * (0.8 + 0.35 * top), blob), mix(t.a, aB, blob));
  }
  return t;
}
`;const VERT_BODY_IMP=VERT_REC+`


int kk = int(aK + 0.5);
vec2 qc = vec2(0.0);
if (kk > 0) {
  int j = kk - 1, jm = mirror < 0.0 ? (11 - j) % 8 : j;
  float ra = uHullR[(L * 4 + int(fA + 0.5)) * 8 + jm], rb = uHullR[(L * 4 + int(fB + 0.5)) * 8 + jm];
  qc = position.xy * max(ra, rb);
}
float nf = smoothstep(uNear - uFade, uNear, d);
float keep = (1.0 - smoothstep(uFarD * 0.85, uFarD, d)) * smoothstep(uPxMin, uPxMin * 1.8, sr);


vec3 tP = C + right * (qc.x * sx) + up * (qc.y * sy) + normalize(toCam) * min(US_PULL * r, 0.5 * d);
tP.xz += uWind * 0.02 * h * (0.5 + 0.5 * qc.y) * vec2(sin(uTime * 1.3 + seed * 40.0 + C.x * 0.3), cos(uTime * 1.1 + seed * 31.0 + C.z * 0.3));
if (nf <= 0.0 || keep <= 0.0 || aOff > 0.5 || h < 0.2) tP = C;     // the near mesh's, out of range, or hidden: no pixels
vQ = vec3(qc, nf); vKeep = keep;
vSky = textureLod(uSkyV, vec2(C.x / uExt.x + 0.5, 0.5 - C.z / uExt.y), 0.0).r;
`+VERT_UV;const FRAG_HEAD_IMP=`
precision highp sampler2DArray;
uniform sampler2DArray uAtlas;
varying vec3 vQ, vUvA, vUvB, vTint;
varying float vW, vTop, vKeep, vSky, vSeed;
varying vec4 vMean, vShape;
float dither(vec2 p) { return fract(52.9829189 * fract(0.06711056 * p.x + 0.00583715 * p.y)); }
float usBlob = 0.0;
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
`+FRAG_CARD;const FRAG_MAP_IMP=`
float dz = dither(gl_FragCoord.xy);
if (1.0 - dz >= vQ.z) discard;
if (vKeep < 1.0 && hash12(gl_FragCoord.xy + 17.0) >= vKeep) discard;
vec3 uvl = vW > 0.0 && hash12(gl_FragCoord.xy * 1.37 + vSeed * 91.0) < vW ? vUvB : vUvA;
vec4 texelColor = usCard(uvl, vUvA.xy * 512.0, vQ.xy, vMean, vShape, vTop);
texelColor.rgb *= vTint * mix(0.7, 1.0, vSky) * US_GAIN;   // the atlas was rendered with Blender's light baked in: measured at half the lit near mesh
diffuseColor *= texelColor;
`;const VERT_HEAD_NEAR=`
attribute float aI;
attribute float kind;
attribute vec3 color;
uniform float uExag, uNear, uFade, uTime, uWind, uR0, uH0;
varying float vFade, vKind, vTop, vCamD;
varying vec3 vCol, vDome;
varying vec2 vUv2;
`+GLSL_FETCH;const VERT_BODY_NEAR=`
vec4 s0 = sf(aI, 0), s1 = sf(aI, 1);
float h = s0.w, r = s1.x, seed = s1.z;
r = min(r, US_STRETCH * uR0 * h / max(uH0, 0.1));     // as the card: no more than 1.35 x the variant's own width / height
vec3 B = vec3(s0.x, s0.y * uExag, s0.z);
float yaw = s1.w > 0.0 ? s1.w : ush(seed * 2.7) * 6.2832, cy = cos(yaw), sy = sin(yaw);
vec3 lp = vec3(position.x * r, position.y * h, position.z * r);
lp.xz = vec2(cy * lp.x - sy * lp.z, sy * lp.x + cy * lp.z);
vec3 ln = vec3(normal.x, normal.y, normal.z); ln.xz = vec2(cy * ln.x - sy * ln.z, sy * ln.x + cy * ln.z);
float d = length(B + vec3(0.0, 0.5 * h, 0.0) - cameraPosition);
vFade = 1.0 - smoothstep(uNear - uFade, uNear, d);
vKind = kind; vCol = pow(color, vec3(2.2)); vTop = clamp(position.y, 0.0, 1.0);
vec3 dome = normalize(vec3(lp.x, lp.y - 0.45 * h, lp.z) * vec3(1.0, 0.8, 1.0) + 1e-4);
vDome = normalize(mix(ln, dome, kind > 0.5 ? 0.6 : 0.0));
vec3 tP = B + lp;
if (kind > 0.5) tP.xz += uWind * 0.015 * h * vTop * vec2(sin(uTime * 1.5 + seed * 40.0 + B.x * 0.4), cos(uTime * 1.2 + seed * 31.0 + B.z * 0.4));
vec3 tN = vDome;
vUv2 = uv;
vCamD = length(tP - cameraPosition);
`;const FRAG_HEAD_NEAR=`
precision highp sampler2DArray;
uniform sampler2DArray uSprays;
uniform float uLayer;
uniform vec3 uTint;
varying float vFade, vKind, vTop, vCamD;
varying vec3 vCol, vDome;
varying vec2 vUv2;
float dither(vec2 p) { return fract(52.9829189 * fract(0.06711056 * p.x + 0.00583715 * p.y)); }
`;const FRAG_MAP_NEAR=`
if (dither(gl_FragCoord.xy) > vFade) discard;

if (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) > smoothstep(0.45, 1.5, vCamD)) discard;
vec4 texelColor = vec4(vCol, 1.0);
if (vKind > 0.5) { texelColor = texture(uSprays, vec3(vUv2, uLayer)); texelColor.rgb *= uTint * (0.62 + 0.3 * vTop); }
diffuseColor *= texelColor;
`;const FOL_DIRECT=THREE.ShaderChunk.lights_lambert_pars_fragment.replace("float dotNL = saturate( dot( geometryNormal, directLight.direction ) );\n	vec3 irradiance = dotNL * directLight.color;",`float nl = dot( geometryNormal, directLight.direction );
	float dotNL = saturate( ( nl + FOL_WRAP ) / ( 1.0 + FOL_WRAP ) );
	float trn = FOL_TRANS * pow( saturate( dot( geometryViewDir, -directLight.direction ) ), 4.0 ) * saturate( 0.3 - nl );
	vec3 irradiance = ( dotNL + trn ) * directLight.color;`);const FOL_LIGHTS=THREE.ShaderChunk.lights_fragment_begin.replace(/\? getShadow\( directionalShadowMap\[ i \]([^;]*?)\) : 1\.0;/,"? mix( 1.0, getShadow( directionalShadowMap[ i ]$1), FOL_SHADOW ) : 1.0;").replace("irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );","{ float hu = 0.5 * dot( geometryNormal, hemisphereLights[ i ].direction ) + 0.5; irradiance += hemisphereLights[ i ].skyColor * mix( 0.55, 1.0, hu ) + hemisphereLights[ i ].groundColor * 0.25 * ( 1.0 - hu ); }");function foliageMaterial(map,defines,uniforms,vertHead,vertBody,fragHead,fragMap,normalExpr,key){const mat=new THREE.MeshLambertMaterial({alphaTest:.5,alphaToCoverage:true,side:THREE.DoubleSide,map:map||null});mat.defines={FOL_WRAP:"0.45",FOL_TRANS:"0.9",FOL_SHADOW:"0.85",...defines};mat.onBeforeCompile=sh=>{Object.assign(sh.uniforms,uniforms);sh.vertexShader=sh.vertexShader.replace("#include <common>","#include <common>\n"+vertHead).replace("#include <beginnormal_vertex>",vertBody+"\nvec3 objectNormal = tN;").replace("#include <begin_vertex>","vec3 transformed = tP;");sh.fragmentShader=sh.fragmentShader.replace("#include <common>","#include <common>\n"+fragHead).replace("#include <map_fragment>",fragMap).replace("#include <alphatest_fragment>",`diffuseColor.a = (diffuseColor.a - alphaTest) / max(fwidth(diffuseColor.a), 1e-4) + 0.5;
if (diffuseColor.a <= 0.0) discard;`).replace("#include <normal_fragment_begin>","float faceDirection = 1.0;\n"+normalExpr+"\nvec3 nonPerturbedNormal = normal;").replace("#include <lights_lambert_pars_fragment>",FOL_DIRECT).replace("#include <lights_fragment_begin>",FOL_LIGHTS)};mat.customProgramCacheKey=()=>key;return mat}async function layerArray(urls,withHull=false){const n=urls.length,data=new Uint8Array(LAYER_PX*LAYER_PX*4*n),hull=new Float32Array(512).fill(1.42);const mean=[],shape=[];for(let i=0;i<16;i++){mean.push(new THREE.Vector4(.2,.25,.15,1));shape.push(new THREE.Vector4(.8,.8,0,.8))}const c=document.createElement("canvas");c.width=c.height=LAYER_PX;const g=c.getContext("2d",{willReadFrequently:true});let loaded=0;for(let k=0;k<n;k++){const im=urls[k]?await loadImage(urls[k]):null;g.clearRect(0,0,LAYER_PX,LAYER_PX);if(im){g.drawImage(im,0,0,LAYER_PX,LAYER_PX);loaded++}const d=g.getImageData(0,0,LAYER_PX,LAYER_PX).data;for(let y=0;y<LAYER_PX;y++)data.set(d.subarray(y*LAYER_PX*4,(y+1)*LAYER_PX*4),(k*LAYER_PX+(LAYER_PX-1-y))*LAYER_PX*4);if(withHull){const T=LAYER_PX/4;for(let f=0;f<4;f++){const rad=new Float32Array(8);for(let row=0;row<4;row++)for(let y=0;y<T;y+=2)for(let x=0;x<T;x+=2){if(d[4*((row*T+y)*LAYER_PX+f*T+x)+3]<40)continue;const qx=(x+1)/(T/2)-1,qy=1-(y+1)/(T/2),rr=Math.sqrt(qx*qx+qy*qy);let a=Math.atan2(qy,qx)/(Math.PI/4);if(a<0)a+=8;const j0=Math.floor(a)%8,j1=(j0+7)%8,j2=(j0+1)%8;if(rr>rad[j0])rad[j0]=rr;if(rr>rad[j1])rad[j1]=rr;if(rr>rad[j2])rad[j2]=rr}for(let j=0;j<8;j++)hull[(k*4+f)*8+j]=Math.min(1.45,(rad[j]||1)/Math.cos(Math.PI/8)+.05)}let sr=0,sg=0,sb=0,na=0,qxm=0,qy0=1,qy1=-1;const lin=v=>{v/=255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4)};for(let y=0;y<LAYER_PX;y+=2)for(let x=0;x<LAYER_PX/2;x+=2){const o=4*(y*LAYER_PX+x);if(d[o+3]<128)continue;sr+=lin(d[o]);sg+=lin(d[o+1]);sb+=lin(d[o+2]);na++;const qx=Math.abs((x%T+1)/(T/2)-1),qy=1-(y%T+1)/(T/2);if(qx>qxm)qxm=qx;if(qy<qy0)qy0=qy;if(qy>qy1)qy1=qy}if(na){const rx=Math.max(.15,qxm),ry=Math.max(.15,(qy1-qy0)/2),cy=(qy0+qy1)/2;const fill=na*4/(8*Math.PI*rx*ry*(T/2)*(T/2));mean[k]=new THREE.Vector4(sr/na,sg/na,sb/na,1);shape[k]=new THREE.Vector4(rx,ry,cy,Math.min(1,Math.max(.12,1.5*fill)))}}}const t=new THREE.DataArrayTexture(data,LAYER_PX,LAYER_PX,n);t.format=THREE.RGBAFormat;t.type=THREE.UnsignedByteType;t.colorSpace=THREE.SRGBColorSpace;t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;t.generateMipmaps=true;t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;t.anisotropy=4;t.needsUpdate=true;return{tex:t,loaded,hull,mean,shape}}function nearGeometry(lp){const n=lp.pos.length/3,pos=new Float32Array(n*3),nrm=new Float32Array(n*3);for(let i=0;i<n;i++){pos[3*i]=lp.pos[3*i];pos[3*i+1]=lp.pos[3*i+2];pos[3*i+2]=-lp.pos[3*i+1];nrm[3*i]=lp.nrm[3*i];nrm[3*i+1]=lp.nrm[3*i+2];nrm[3*i+2]=-lp.nrm[3*i+1]}const g=new THREE.InstancedBufferGeometry;g.setAttribute("position",new THREE.BufferAttribute(pos,3));g.setAttribute("normal",new THREE.BufferAttribute(nrm,3));g.setAttribute("uv",new THREE.BufferAttribute(new Float32Array(lp.uv),2));g.setAttribute("color",new THREE.BufferAttribute(new Float32Array(lp.col),3));g.setAttribute("kind",new THREE.BufferAttribute(new Float32Array(lp.kind),1));g.setIndex(lp.idx);const ib=new THREE.InstancedBufferAttribute(new Float32Array(MAX_NEAR_SET),1);ib.setUsage(THREE.DynamicDrawUsage);g.setAttribute("aI",ib);g.instanceCount=0;return g}export async function install(V){const veg=V.veg,S=V.shared;if(!veg?.shrubTex)return null;window.__usProgress="kinds";const kinds=await loadJSON(BASE+"kinds.json")||{kinds:[{id:"brush",code:0,model:"manzanita"},{id:"manzanita",code:1,model:"manzanita"}]};const models=[...new Set(kinds.kinds.map(k=>k.model))];const metas=await Promise.all(models.map(m=>loadJSON(BASE+m+"/kind.json")));const lows=await Promise.all(models.map(m=>loadJSON(BASE+m+"/lowpoly.json")));window.__usProgress="atlas";const atlas=await layerArray(models.map(m=>BASE+m+"/impostor.png"),true);window.__usProgress="sprays";const sprays=await layerArray(models.map(m=>BASE+m+"/sprays.png"));const layerOf={};models.forEach((m,i)=>{layerOf[m]=i});const typeLayer=new Float32Array(16),typeTint=[];for(let i=0;i<16;i++)typeTint.push(new THREE.Color(1,1,1));const byCode={};for(const k of kinds.kinds){byCode[k.code]=k;typeLayer[k.code]=layerOf[k.model]??0;if(k.tint)typeTint[k.code].set(k.tint)}const varH=[],varR=[];for(let i=0;i<16;i++){const vs=metas[i]?.variants||[];varH.push(new THREE.Vector4(vs[0]?.h||1,vs[1]?.h||1,vs[2]?.h||1,vs[3]?.h||1));varR.push(new THREE.Vector4(vs[0]?.r||9,vs[1]?.r||9,vs[2]?.r||9,vs[3]?.r||9))}const U={uShrubTex:{value:veg.shrubTex},uExag:S.uExag,uNear:{value:NEAR},uFade:{value:FADE},uTime:S.uTime,uWind:S.uWind||{value:1},uTypeLayer:{value:typeLayer},uTypeTint:{value:typeTint},uAtlas:{value:atlas.tex},uVarH:{value:varH},uVarR:{value:varR},uFarD:{value:USFAR},uPxMin:{value:PRESET.medium.px},uMean:{value:atlas.mean},uShape:{value:atlas.shape}};const USFILL=+(QS.get("usfill")||0)>0;const borrowed={types:0,down:0};let borrowedDown=[];if(USFILL){try{const fb=await fetch(BASE+"fill_types.bin");const ft=fb.ok?new Uint8Array(await fb.arrayBuffer()):null;const SD=veg.shrubTex.image.data;if(ft&&ft.length===veg.SN){for(let i=0;i<ft.length;i++)if(ft[i]!==255){SD[i*16+5]=ft[i];borrowed.types++}veg.shrubTex.needsUpdate=true}else console.warn("understory: fill_types.bin does not match the shrub file ("+(ft?.length??"missing")+" vs "+veg.SN+"): types not borrowed")}catch(e){console.warn("understory: fill_types",e)}borrowedDown=(await loadJSON(BASE+"downwood_borrowed.json"))?.items||[];borrowed.down=borrowedDown.length}const fixes=(await loadJSON(BASE+"shrub_fixes.json"))?.fixes||[];let fixed=0;const fixDown=[];if(fixes.length){const SD=veg.shrubTex.image.data,W2=V.man.W/2,H2=V.man.H/2;for(const f of fixes){let bi=-1,bd=1.5;for(let i=0;i<veg.SN;i++){if(f.was!=null&&(SD[i*16+5]|0)!==f.was)continue;const d=Math.hypot(SD[i*16]+W2-f.e,H2-SD[i*16+2]-f.n);if(d<bd){bd=d;bi=i}}if(bi<0){console.warn("understory: shrub fix found no record",f);continue}const down=kinds.kinds.find(k=>k.code===f.t)?.down;if(f.hide||down)veg.hideShrub?.(bi);if(down)fixDown.push({e:SD[bi*16]+W2,n:H2-SD[bi*16+2],u:SD[bi*16+1],h:f.h??1,r:f.r??1.5,t:f.t,yaw:f.yaw||0});else if(!f.hide){if(f.t!=null)SD[bi*16+5]=f.t;veg.editShrub?.(bi,{h:f.h,r:f.r});veg.shrubTex.needsUpdate=true}fixed++}}window.__usProgress="group";const group=new THREE.Group;group.name="understory";V.scene.add(group);const NREC=veg.SN;const quad=new THREE.InstancedBufferGeometry;const qp=[0,0,0],qn=[0,0,1],qk=[0],qidx=[];for(let k=0;k<8;k++){const a=(k+.5)*Math.PI/4;qp.push(Math.cos(a),Math.sin(a),0);qn.push(0,0,1);qk.push(k+1);qidx.push(0,1+k,1+(k+1)%8)}quad.setAttribute("position",new THREE.BufferAttribute(new Float32Array(qp),3));quad.setAttribute("normal",new THREE.BufferAttribute(new Float32Array(qn),3));quad.setAttribute("uv",new THREE.BufferAttribute(new Float32Array(qp.length/3*2),2));quad.setAttribute("aK",new THREE.BufferAttribute(new Float32Array(qk),1));quad.setIndex(qidx);U.uHullR={value:atlas.hull};const ids=new Float32Array(NREC);for(let i=0;i<NREC;i++)ids[i]=i;quad.setAttribute("aI",new THREE.InstancedBufferAttribute(ids,1));const farOff=new THREE.InstancedBufferAttribute(new Float32Array(NREC),1);farOff.setUsage(THREE.DynamicDrawUsage);quad.setAttribute("aOff",farOff);quad.instanceCount=USFAR>0?NREC:0;const T0=V.terrain;Object.assign(U,{uSkyV:{value:T0?.uniforms?.uAO?.value||T0?.blank||null},uExt:{value:new THREE.Vector2(V.man.W,V.man.H)}});const impMat=foliageMaterial(null,{USE_UV:"",US_COVK:COVK.toFixed(3),US_PULL:PULL.toFixed(3),US_GAIN:GAIN.toFixed(3),US_BGAIN:BGAIN.toFixed(3),US_STRETCH:STRETCH.toFixed(3),US_TOPN:TOPN.toFixed(3)},U,VERT_HEAD_IMP,VERT_BODY_IMP,FRAG_HEAD_IMP,FRAG_MAP_IMP,"vec3 normal = normalize(mix(vec3(vQ.x * 0.8, vQ.y * 0.8, sqrt(max(0.05, 1.0 - 0.64 * dot(vQ.xy, vQ.xy)))), normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz), US_TOPN * usBlob));","us-card-3");impMat.defines.USE_UV="";const impMesh=new THREE.Mesh(quad,impMat);impMesh.name="understory_cards";impMesh.frustumCulled=false;impMesh.castShadow=false;impMesh.receiveShadow=QS.get("usshadow")!=="0";impMesh.renderOrder=3.4;impMesh.visible=USFAR>0;group.add(impMesh);const farMesh=impMesh;const makeNearSets=(src,uTex,uNearV,tag)=>{const sets=[];models.forEach((m,mi)=>{const lps=lows[mi];if(!lps)return;if(src.models&&!src.models.has(m))return;const tint=new THREE.Color(metas[mi]?.tint||"#ffffff");lps.forEach((lp,vi)=>{if(!lp.idx?.length)return;const g=nearGeometry(lp);const vm=metas[mi]?.variants?.[vi]||{};const mat=foliageMaterial(null,{USE_UV:"",US_STRETCH:tag==="down"?"1000.0":STRETCH.toFixed(3)},{...U,uShrubTex:uTex,uNear:uNearV,uSprays:{value:sprays.tex},uLayer:{value:mi},uTint:{value:tint},uR0:{value:vm.r||9},uH0:{value:vm.h||1}},VERT_HEAD_NEAR,VERT_BODY_NEAR,FRAG_HEAD_NEAR,FRAG_MAP_NEAR,"vec3 normal = normalize(vNormal);","us-near-"+tag+"-"+mi);mat.defines.USE_UV="";const mesh=new THREE.Mesh(g,mat);mesh.name=`understory_near_${tag}_${m}_${vi}`;mesh.frustumCulled=false;mesh.castShadow=false;mesh.receiveShadow=true;mesh.renderOrder=3;group.add(mesh);sets.push({model:m,layer:mi,variant:vi,mesh,attr:g.getAttribute("aI"),list:new Float32Array(MAX_NEAR_SET),n:0,tris:lp.tris,h0:lp.h||metas[mi]?.variants?.[vi]?.h||1})})});return sets};const nearSets=makeNearSets({},U.uShrubTex,U.uNear,"shrub");const setsByLayer=models.map((m,mi)=>nearSets.filter(s=>s.layer===mi));const tv=await loadJSON(BASE+"tree_vetoes.json")||{};const vetoes=tv.vetoes||[],overrides=tv.overrides||[];let vetoed=0;const extra=[];if((vetoes.length||overrides.length)&&veg.raw&&veg.I){const st=veg.stride,I=veg.I,want=new Map(vetoes.map(v=>[v.id,{v}]).concat(overrides.map(o=>[o.id,{o}])));const kindCode=Object.fromEntries(kinds.kinds.map(k=>[k.id,k.code]));for(let i=0;i<veg.N;i++){const w=want.get(veg.raw[i*st+I.id]);if(!w)continue;if(w.o&&kindCode[w.o.kind]!=null)extra.push({e:veg.X[i]+V.man.W/2,n:V.man.H/2-veg.Z[i],u:veg.Y[i],h:Math.max(1,veg.Hh[i]),r:Math.max(.6,veg.Ra[i]),t:kindCode[w.o.kind],yaw:0});if(typeof veg.hideTree==="function")veg.hideTree(i,true);else veg.skip[i]=1;vetoed++}if(vetoed&&V.renderer)V.renderer.shadowMap.needsUpdate=true}const DOWN_FAR=120;const dw=((await loadJSON(BASE+"downwood.json"))?.items||[]).concat(extra,borrowedDown,fixDown);const DN=dw.length,DT=new Float32Array(Math.max(1,Math.ceil(DN/256))*256*16);dw.forEach((d,i)=>{DT.set([d.e-V.man.W/2,d.u,-(d.n-V.man.H/2),d.h,d.r,d.t,(i*.7548776+.1)%1,d.yaw||.001],i*16)});const downTex=new THREE.DataTexture(DT,256*4,Math.max(1,Math.ceil(DN/256)),THREE.RGBAFormat,THREE.FloatType);downTex.minFilter=downTex.magFilter=THREE.NearestFilter;downTex.generateMipmaps=false;downTex.needsUpdate=true;const byCodeModel=Object.fromEntries(kinds.kinds.map(k=>[k.code,k.model]));const downModels=new Set(kinds.kinds.filter(k=>k.down).map(k=>k.model).concat(extra.map(x=>byCodeModel[x.t])));const downSets=DN?makeNearSets({models:downModels},{value:downTex},{value:DOWN_FAR+FADE},"down"):[];const downByLayer=models.map((m,mi)=>downSets.filter(s=>s.layer===mi));window.__usProgress="near-built";const oldMeshes=(veg.shrubSets||[]).flatMap(s=>[s.cards.mesh,s.cloud.mesh]);const setOld=on2=>oldMeshes.forEach(m=>{m.layers.set(on2?0:30)});setOld(false);const N=veg.SN,T=veg.shrubTex.image.data,off=veg.shrubOff,hidden=new Uint8Array(N),hideTags=new Map,dhidden=new Uint8Array(Math.max(1,DN));const fr=new THREE.Frustum,pv=new THREE.Matrix4,sph=new THREE.Sphere;const stats={near:0,far:0,nearTris:0,sets:0,hidden:0,ms:0,kinds:models.length,atlasLayers:atlas.loaded,sprayLayers:sprays.loaded,treeVetoes:vetoed,borrowed,fixed};let on=true;const lastCam=new THREE.Vector3(1e9,0,0),lastDir=new THREE.Vector3,curDir=new THREE.Vector3;let frame=0,lastEdits=-1,lastExag=0,lastPreset=null,forcedNear=QS.has("usnear")?NEAR:null,forcedFar=null;const applyPreset=q=>{const p=PRESET[q]||PRESET.medium;NEAR=forcedNear??p.near;U.uNear.value=NEAR;U.uFarD.value=(forcedFar??USFAR)*p.reach;U.uPxMin.value=p.px;stats.preset=q||"medium";stats.near_m=NEAR;stats.usfar_m=USFAR>0?U.uFarD.value:0;stats.farCards=USFAR>0?NREC:0};applyPreset(V.mods?.quality?.preset);const update=()=>{const t0=performance.now();impMesh.visible=USFAR>0&&on&&veg.shrubGroup.visible;if(!on||!veg.shrubGroup.visible){nearSets.concat(downSets).forEach(s=>{s.mesh.geometry.instanceCount=0;s.mesh.visible=false});stats.near=stats.far=0;return}const cam=V.camera,cp=cam.position,ex=S.uExag.value;const q=V.mods?.quality?.preset;if(q!==lastPreset){lastPreset=q;applyPreset(q);lastEdits=-1}cam.getWorldDirection(curDir);frame++;const moved=cp.distanceToSquared(lastCam)>.04||curDir.dot(lastDir)<.9995||veg.shrubEdits!==lastEdits||ex!==lastExag||frame%8===0;if(!moved)return;lastCam.copy(cp);lastDir.copy(curDir);lastEdits=veg.shrubEdits;lastExag=ex;cam.updateMatrixWorld();pv.multiplyMatrices(cam.projectionMatrix,cam.matrixWorldInverse);fr.setFromProjectionMatrix(pv);let nn=0,tris=0;nearSets.forEach(s=>{s.n=0});downSets.forEach(s=>{s.n=0});for(let i=0;i<DN;i++){if(dhidden[i])continue;const o=i*16,x=DT[o],y=DT[o+1]*ex+.5*DT[o+3],z=DT[o+2],r=DT[o+4];const d=Math.hypot(x-cp.x,y-cp.y,z-cp.z);if(d>DOWN_FAR+FADE)continue;sph.center.set(x,y,z);sph.radius=Math.max(r,DT[o+3])*1.2;if(!fr.intersectsSphere(sph))continue;const sets=downByLayer[layerOf[byCode[DT[o+5]|0]?.model]??-1];if(!sets?.length)continue;const s=sets[i%sets.length];if(s.n<MAX_NEAR_SET){s.list[s.n++]=i;nn++;tris+=s.tris}}for(let i=0;i<N;i++){if(off[i]||hidden[i])continue;const o=i*16,h=T[o+3];if(h<.2)continue;const x=T[o],y=T[o+1]*ex+.5*h,z=T[o+2],r=T[o+4];const dx=x-cp.x,dy=y-cp.y,dz=z-cp.z,d=Math.sqrt(dx*dx+dy*dy+dz*dz);if(d>NEAR+2)continue;sph.center.set(x,y,z);sph.radius=Math.max(r,.5*h)*1.15;if(!fr.intersectsSphere(sph))continue;if(d<NEAR){const ty=T[o+5]|0,k=byCode[ty]?layerOf[byCode[ty].model]:0,sets=setsByLayer[k];if(sets&&sets.length){let s=sets[0],best=Infinity;for(const q2 of sets){const e=Math.abs(Math.log((q2.h0||1)/h))+.05*(i*7%11/11);if(e<best){best=e;s=q2}}if(s.n<MAX_NEAR_SET){s.list[s.n++]=i;nn++;tris+=s.tris}}}}let used=0;for(const s of downSets){s.attr.array.set(s.list.subarray(0,s.n));s.attr.clearUpdateRanges();s.attr.addUpdateRange(0,s.n);s.attr.needsUpdate=true;s.mesh.geometry.instanceCount=s.n;s.mesh.visible=s.n>0;if(s.n)used++}for(const s of nearSets){s.attr.array.set(s.list.subarray(0,s.n));s.attr.clearUpdateRanges();s.attr.addUpdateRange(0,s.n);s.attr.needsUpdate=true;s.mesh.geometry.instanceCount=s.n;s.mesh.visible=s.n>0;if(s.n)used++}stats.near=nn;stats.far=USFAR>0?NREC:0;stats.nearTris=tris;stats.sets=used;stats.ms=performance.now()-t0};V.tickers.push(update);window.__usProgress="ticker";let token=0;const api={stats,kinds,models,group,impostor:impMesh,nearSets,setEnabled(v){on=!!v;setOld(!on);if(!on)update()},setNear(m){forcedNear=m==null?null:Math.max(0,+m||0);applyPreset(lastPreset);lastEdits=-1},setBudget(){},setFar(m){forcedFar=m==null?null:Math.max(0,+m||0);applyPreset(lastPreset)},farMesh,get near(){return NEAR},isHidden(i){return!!(off[i]||hidden[i])},kindOf(i){return byCode[T[i*16+5]|0]?.id||null},hideNear(x,z,r,tag=""){const ids2=[],dids=[];for(let i=0;i<N;i++){if(hidden[i])continue;const o=i*16;if(Math.hypot(T[o]-x,T[o+2]-z)<=r){hidden[i]=1;ids2.push(i)}}for(let i=0;i<DN;i++){if(dhidden[i])continue;const o=i*16;if(Math.hypot(DT[o]-x,DT[o+2]-z)<=r){dhidden[i]=1;dids.push(i)}}const tk=++token;hideTags.set(tk,{tag,ids:ids2,dids});stats.hidden+=ids2.length+dids.length;if(ids2.length){ids2.forEach(i=>{farOff.array[i]=1});farOff.needsUpdate=true}if(V.renderer)V.renderer.shadowMap.needsUpdate=true;lastEdits=-1;return tk},restore(tk){const e=hideTags.get(tk);if(!e)return false;e.ids.forEach(i=>{hidden[i]=0});e.dids.forEach(i=>{dhidden[i]=0});hideTags.delete(tk);stats.hidden-=e.ids.length+e.dids.length;if(e.ids.length){e.ids.forEach(i=>{farOff.array[i]=0});farOff.needsUpdate=true}lastEdits=-1;return true},restoreAll(tag){for(const[tk,e]of[...hideTags])if(tag==null||e.tag===tag)api.restore(tk)},objectsNear(x,z,r){const out=[];for(let i=0;i<N;i++){if(off[i]||hidden[i])continue;const o=i*16;const d=Math.hypot(T[o]-x,T[o+2]-z);if(d<=r){const k=byCode[T[o+5]|0];out.push({id:i,kind:/sapling|sprout/.test(k?.id||"")?"sapling":"shrub",type:k?.id||"brush",x:T[o],z:T[o+2],u:T[o+1],h:T[o+3],r:T[o+4],d})}}for(let i=0;i<DN;i++){if(dhidden[i])continue;const o=i*16;const d=Math.hypot(DT[o]-x,DT[o+2]-z);if(d<=r){const k=byCode[DT[o+5]|0];out.push({id:"d"+i,kind:k?.id==="log"?"log":k?.id==="stump"?"stump":"pile",type:k?.id,x:DT[o],z:DT[o+2],u:DT[o+1],h:DT[o+3],r:DT[o+4],len:k?.id==="log"?2*DT[o+4]:void 0,dia:k?.id==="log"?DT[o+3]:void 0,yaw:DT[o+7],d})}}return out},refresh(){update()}};try{const sec=V.ui?.section?.("Understory",{hidden:true});V.ui?.checkbox?.(sec,"Understory models",true,v=>api.setEnabled(v))}catch{}return api}
