import*as THREE from"three";const CHUNK=256;const NSEG=192;export const LOD_DIST=[90,230,520];const LOD_HYST=6;const BUILD_MS=4;const LOD_KEEP_S=30;const SKY_AO_FLOOR=.18;const ANISO=4;const DET_FAR=.15;const NAT={sat:.75,gain:[1.2,1.2,1.2]},HARD={sat:1,gain:[1.2,1.2,1.2]};const GRADE={duff:NAT,leaf:NAT,grass:NAT,dirt:NAT,gravel:HARD,asphalt:HARD,kkd:{sat:.5,gain:[.6,.62,.62]}};const CAN_RES=1;const CAN_OP={tree:.8,snag:.15,shrub:.6};const DECIDUOUS=new Set(["black_oak","blue_oak"]);const NZ=256;function noiseTexture(){const d=new Uint8Array(NZ*NZ);for(let i=0;i<d.length;i++){let h=Math.imul(i^2654435769,2246822507);h^=h>>>13;h=Math.imul(h,3266489909);d[i]=(h^h>>>16)&255}const t=new THREE.DataTexture(d,NZ,NZ,THREE.RedFormat,THREE.UnsignedByteType);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=t.minFilter=THREE.LinearFilter;t.generateMipmaps=false;t.unpackAlignment=1;t.needsUpdate=true;return t}function detailArray(textures,names){const S=1024,n=textures.length,data=new Uint8Array(S*S*4*n),mean=[];const c=document.createElement("canvas");c.width=c.height=S;const g=c.getContext("2d",{willReadFrequently:true});g.imageSmoothingQuality="high";const lin=new Float32Array(256).map((_,i)=>{const v=i/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});const enc=new Uint8Array(4096).map((_,i)=>{const v=i/4095;return Math.round(255*(v<=.0031308?v*12.92:1.055*v**(1/2.4)-.055))});textures.forEach((t,i)=>{g.clearRect(0,0,S,S);g.drawImage(t.image,0,0,S,S);const px=g.getImageData(0,0,S,S).data,G=GRADE[names[i]];let r=0,gg=0,b=0;for(let k=0;k<px.length;k+=4){let R=lin[px[k]],Gc=lin[px[k+1]],B=lin[px[k+2]];if(G){const Y=.2126*R+.7152*Gc+.0722*B;R=(Y+(R-Y)*G.sat)*G.gain[0];Gc=(Y+(Gc-Y)*G.sat)*G.gain[1];B=(Y+(B-Y)*G.sat)*G.gain[2];px[k]=enc[Math.min(4095,Math.max(0,R*4095+.5)|0)];px[k+1]=enc[Math.min(4095,Math.max(0,Gc*4095+.5)|0)];px[k+2]=enc[Math.min(4095,Math.max(0,B*4095+.5)|0)]}r+=R;gg+=Gc;b+=B}data.set(px,i*S*S*4);mean.push(new THREE.Vector3(r/(S*S),gg/(S*S),b/(S*S)))});const a=new THREE.DataArrayTexture(data,S,S,n);a.colorSpace=THREE.SRGBColorSpace;a.wrapS=a.wrapT=THREE.RepeatWrapping;a.anisotropy=ANISO;a.minFilter=THREE.LinearMipmapLinearFilter;a.magFilter=THREE.LinearFilter;a.generateMipmaps=true;a.needsUpdate=true;return{tex:a,mean}}export class Terrain{constructor(man,dem16,tex,shared,outlines=[]){this.outlines=outlines;const d=man.dem;this.nx=d.nx;this.ny=d.ny;this.res=d.res;this.W=man.W;this.H=man.H;const sc=d.scale??.01,N=this.nx*this.ny;const h=this.h=new Float32Array(N);let mn=Infinity,mx=-Infinity;for(let i=0;i<N;i++){const v=dem16[i]*sc;h[i]=v;if(v<mn)mn=v;if(v>mx)mx=v}this.minH=mn;this.maxH=mx;this.shared=shared;this.skyFloor=SKY_AO_FLOOR;this.grade={sat:NAT.sat,gain:NAT.gain[0]};this.sunGLSL={head:SUN_HEAD,lights:LIGHTS};this.aoOnAmbient=true;this.group=new THREE.Group;this.group.name="terrain";this.normalTex=this.makeNormalTex();this.blank=new THREE.DataTexture(new Uint8Array([128,128,128,255]),1,1);this.blank.needsUpdate=true;this.black=new THREE.DataTexture(new Uint8Array([0,0,0,255]),1,1);this.black.needsUpdate=true;this.white=new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1);this.white.needsUpdate=true;this.uSunVis={value:this.white};this._can={plants:null,key:null};this.loadCanopy(man,tex.base||"");const G=tex.ground;for(const t of[G?.cls,G?.tint,G?.hard,tex.ao])if(t){t.anisotropy=1;t.needsUpdate=true}if(G){const names=man.ground?.order||["duff","leaf","grass","dirt","gravel","asphalt","kkd"].slice(0,G.det.length);const A=detailArray(G.det,names);G.arr=A.tex;G.mean=A.mean;const kf=G.det.length>6?man.ground?.kkd?.file:null;this.kkd={tex:this.black,url:kf?(tex.base||"")+kf:null,ready:Promise.resolve(null)};if(kf)this.kkd.ready=new Promise(res=>new THREE.TextureLoader().load(this.kkd.url,t=>{t.colorSpace=THREE.NoColorSpace;t.anisotropy=4;this.kkd.tex=t;if(this._gU)this._gU.uKkd.value=t;res(t)},void 0,()=>{console.warn("kit-kit-dizze map missing",kf);res(null)}))}this.mode=G?2:tex.ortho?1:0;this._ortho=tex.ortho||null;this._imgUsed=this.mode===1;this.mats=new Set;this._idx=new Map;this._gcT=0;this.material=this.makeMaterial(tex,man);if(G){this.matFar=this.makeMaterial(tex,man,null,false,true);this.matFarHard=this.makeMaterial(tex,man,null,true,true)}this.viewH=1080;this.tiles=man.ortho_tiles?.tiles||{};this.base=tex.base||"";this.chunks=[];const ncx=Math.ceil((this.nx-1)/CHUNK),ncy=Math.ceil((this.ny-1)/CHUNK);for(let cj=0;cj<ncy;cj++)for(let ci=0;ci<ncx;ci++){const i0=ci*CHUNK,i1=Math.min(i0+CHUNK,this.nx-1),j0=cj*CHUNK,j1=Math.min(j0+CHUNK,this.ny-1);let lo=Infinity,hi=-Infinity;for(let j=j0;j<=j1;j+=4)for(let i=i0;i<=i1;i+=4){const v=h[j*this.nx+i];if(v<lo)lo=v;if(v>hi)hi=v}const tile=this.tiles[`${ci}_${cj}`]||null;const hr=G?.hard?G.hardRect:null,e0=(i0+.5)*this.res,e1=(i1+.5)*this.res,n0=this.H-(j1+.5)*this.res,n1=this.H-(j0+.5)*this.res;const hard=!!hr&&e0<hr[2]&&e1>hr[0]&&n0<hr[3]&&n1>hr[1];const mat=tile||hard?this.makeMaterial(tex,man,tile?.rect||null,hard):this.material;this.chunks.push({i0,i1,j0,j1,lo,hi,x0:this.sx(i0),x1:this.sx(i1),z0:this.sz(j0),z1:this.sz(j1),levels:[],seen:[],cur:-1,mesh:null,tile,hard,far:false,mat,hiTex:null,hiLoading:false})}}sx(i){return(i+.5)*this.res-this.W/2}sz(j){return(j+.5)*this.res-this.H/2}heightAt(e,n){const fx=Math.min(Math.max(e/this.res-.5,0),this.nx-1.001);const fy=Math.min(Math.max((this.H-n)/this.res-.5,0),this.ny-1.001);const x0=fx|0,y0=fy|0,tx=fx-x0,ty=fy-y0,nx=this.nx,h=this.h;const a=h[y0*nx+x0]*(1-tx)+h[y0*nx+x0+1]*tx;const b=h[(y0+1)*nx+x0]*(1-tx)+h[(y0+1)*nx+x0+1]*tx;return a*(1-ty)+b*ty}heightAtScene(x,z){return this.heightAt(x+this.W/2,this.H/2-z)}loadCanopy(man,base){const get=f=>f?fetch(base+f).then(r=>r.ok?r.arrayBuffer():null).catch(()=>null):Promise.resolve(null);Promise.all([get(man.trees?.file),get(man.shrubs?.file)]).then(([tb,sb])=>{const out=[],sp=man.species||[];if(tb&&man.trees?.fields){const F=Object.fromEntries(man.trees.fields.map((k,i)=>[k,i])),st=man.trees.stride,T=new Float32Array(tb);for(let o=0;o+st<=T.length;o+=st){let r=0;for(let k=0;k<8;k++)r+=T[o+F.rN+k];const h=T[o+F.h],cbh=T[o+F.cbh],clen=Math.max(h-cbh,.5),name=sp[T[o+F.species]|0];out.push(T[o+F.e],T[o+F.n],T[o+F.u],cbh+.5*clen,Math.max(.88*r/8,.3),.5*clen,name==="snag"?CAN_OP.snag:CAN_OP.tree,DECIDUOUS.has(name)?1:0)}}if(sb&&man.shrubs?.fields){const F=Object.fromEntries(man.shrubs.fields.map((k,i)=>[k,i])),st=man.shrubs.stride,S=new Float32Array(sb);for(let o=0;o+st<=S.length;o+=st){const h=S[o+F.h];if(h<.4)continue;out.push(S[o+F.e],S[o+F.n],S[o+F.u],.5*h,Math.max(S[o+F.r],.3),.5*h,CAN_OP.shrub,0)}}if(out.length)this._can.plants=new Float32Array(out)})}bakeSun(r){const C=this._can,P=C.plants,S=this.shared,sun=S.uSunDir.value,ex=S.uExag.value,lo=S.uLeafOff?.value||0,k=C.key;if(!P||k&&k[0]===sun.x&&k[1]===sun.y&&k[2]===sun.z&&k[3]===ex&&k[4]===lo)return;C.key=[sun.x,sun.y,sun.z,ex,lo];const n=P.length/8,hz=Math.hypot(sun.x,sun.z);if(!C.mesh){const g=new THREE.InstancedBufferGeometry;g.setAttribute("position",new THREE.BufferAttribute(new Float32Array([-1,-1,0,1,-1,0,1,1,0,-1,1,0]),3));g.setIndex([0,1,2,0,2,3]);C.attr=new THREE.InstancedBufferAttribute(new Float32Array(n*4),4);C.op=new THREE.InstancedBufferAttribute(new Float32Array(n),1);g.setAttribute("aC",C.attr);g.setAttribute("aOp",C.op);g.instanceCount=n;C.u={uDir:{value:new THREE.Vector2},uExt:{value:new THREE.Vector2(this.W,this.H)}};const m=new THREE.ShaderMaterial({uniforms:C.u,depthTest:false,depthWrite:false,toneMapped:false,blending:THREE.CustomBlending,blendEquation:THREE.AddEquation,blendSrc:THREE.ZeroFactor,blendDst:THREE.SrcColorFactor,vertexShader:`attribute vec4 aC; attribute float aOp; uniform vec2 uDir, uExt; varying vec2 vQ; varying float vOp;
void main() { vQ = position.xy; vOp = aOp; vec2 p = aC.xy + uDir * position.x * aC.z + vec2(-uDir.y, uDir.x) * position.y * aC.w; gl_Position = vec4(p / uExt * 2.0 - 1.0, 0.0, 1.0); }`,fragmentShader:`varying vec2 vQ; varying float vOp;
void main() { float q = dot(vQ, vQ); if (q >= 1.0 || vOp <= 0.0) discard; gl_FragColor = vec4(vec3(1.0 - vOp * sqrt(1.0 - q)), 1.0); }`});C.mesh=new THREE.Mesh(g,m);C.mesh.frustumCulled=false;C.scene=new THREE.Scene;C.scene.add(C.mesh);C.cam=new THREE.Camera;C.rt=new THREE.WebGLRenderTarget(Math.ceil(this.W/CAN_RES),Math.ceil(this.H/CAN_RES),{format:THREE.RedFormat,type:THREE.UnsignedByteType,depthBuffer:false,generateMipmaps:true,minFilter:THREE.LinearMipmapLinearFilter,magFilter:THREE.LinearFilter})}const de=hz>1e-4?-sun.x/hz:0,dn=hz>1e-4?sun.z/hz:1,tanEl=Math.max(sun.y,.05)/Math.max(hz,1e-4);const A=C.attr.array,O=C.op.array,bare=Math.min(Math.max(lo,0),1);for(let i=0,o=0;i<n;i++,o+=8){const e=P[o],nn=P[o+1],zc=P[o+2]*ex+P[o+3],a=P[o+4],b=P[o+5];let d=P[o+3]/tanEl;for(let k2=0;k2<2;k2++)d=Math.max(0,(zc-this.heightAt(e+de*d,nn+dn*d)*ex)/tanEl);A[i*4]=e+de*d;A[i*4+1]=nn+dn*d;A[i*4+2]=Math.sqrt(a*a+(b/tanEl)**2);A[i*4+3]=a;O[i]=P[o+6]*(P[o+7]?1-.85*bare:1)}C.attr.needsUpdate=true;C.op.needsUpdate=true;C.u.uDir.value.set(de,dn);const prev=r.getRenderTarget(),cc=r.getClearColor(new THREE.Color),ca=r.getClearAlpha();r.setRenderTarget(C.rt);r.setClearColor(16777215,1);r.clear(true,false,false);r.render(C.scene,C.cam);r.setRenderTarget(prev);r.setClearColor(cc,ca);this.uSunVis.value=C.rt.texture}makeNormalTex(){const{nx,ny,res,h}=this,data=new Uint8Array(nx*ny*2);for(let j=0;j<ny;j++){const jn=Math.max(j-1,0),js=Math.min(j+1,ny-1),dr=j===0||j===ny-1?1:2;const outRow=(ny-1-j)*nx;for(let i=0;i<nx;i++){const iw=Math.max(i-1,0),ie=Math.min(i+1,nx-1),dc=i===0||i===nx-1?1:2;const dhde=(h[j*nx+ie]-h[j*nx+iw])/(dc*res);const dhdn=(h[jn*nx+i]-h[js*nx+i])/(dr*res);const L=Math.hypot(dhde,1,dhdn),o=(outRow+i)*2;data[o]=Math.round((-dhde/L*.5+.5)*255);data[o+1]=Math.round((dhdn/L*.5+.5)*255)}}const t=new THREE.DataTexture(data,nx,ny,THREE.RGFormat,THREE.UnsignedByteType);t.unpackAlignment=1;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=4;t.needsUpdate=true;return t}makeMaterial(tex,man,hiRect=null,hard=false,far=false){const segs=[[],[]];let budget=NSEG;for(const o of this.outlines){let pts=o.pts;const step=Math.max(1,Math.ceil((pts.length-1)/Math.max(budget,8)));budget-=Math.ceil((pts.length-1)/step);if(step>1)pts=pts.filter((_,i)=>i%step===0).concat([pts[pts.length-1]]);for(let i=0;i<pts.length-1;i++)segs[o.kind?1:0].push(new THREE.Vector4(pts[i][0],pts[i][1],pts[i+1][0],pts[i+1][1]))}const all=segs[0].concat(segs[1]).slice(0,NSEG);while(all.length<NSEG)all.push(new THREE.Vector4);const u={uSeg:{value:all},uSegR:{value:Math.min(segs[0].length,NSEG)},uSegN:{value:Math.min(segs[0].length+segs[1].length,NSEG)},uNrm:{value:this.normalTex},uOrtho:{value:tex.ortho||this.blank},uAO:{value:tex.ao||this.blank},uUseOrtho:this._uUse||={value:tex.ortho?1:0},uHasAO:this._uAO||={value:tex.ao?1:0},uExt:{value:new THREE.Vector2(this.W,this.H)},uHRange:{value:new THREE.Vector2(this.minH,this.maxH)},uExag:this.shared.uExag,uSunDir:this.shared.uSunDir||{value:new THREE.Vector3(0,1,0)},uHi:{value:this.blank||null},uHasHi:{value:0},uHiRect:{value:new THREE.Vector4(...hiRect||[0,0,1,1])},uSunVis:this.uSunVis};const G=tex.ground,B=this.blank,S=this.shared,NL=G?G.det.length:6;this._gU||={uGround:{value:G?1:0},uCls:{value:G?.cls||B},uTint:{value:G?.tint||B},uHard:{value:G?.hard||B},uHardRect:{value:new THREE.Vector4(...G?.hardRect||[0,0,1,1])},uGreen:S.uGreen||{value:0},uLeafOff:S.uLeafOff||{value:0},uSpring:S.uSpring||{value:0},uDet:{value:G?.arr||null},uKkd:{value:this.kkd?.tex||this.black},uNz:{value:G?noiseTexture():null},uKkdNear:{value:new THREE.Vector4(0,0,0,0)},uGS:{value:G?G.tile:new Array(NL).fill(2)},uGM:{value:G?G.mean:Array.from({length:NL},()=>new THREE.Vector3(.2,.15,.1))},uGT:{value:this.tintRef(man,G)},uSpg:{value:G?.spg||B},uSpgRect:{value:new THREE.Vector4(...G?.spgRect||[0,0,1,1])},uSpgAmt:{value:G?.spg?1:0},uLookG:{value:new THREE.Vector4(1,1,0,0)},uLookD:{value:0}};Object.assign(u,this._gU);if(!this.uniforms)this.uniforms=u;const m=new THREE.MeshLambertMaterial;m.userData.td={NL,kkd:NL>6,hard:!!(hard&&G?.hard),far,ao:!!tex.ao,ol:segs[0].length+segs[1].length>0,spg:!!G?.spg};m.defines=this.defsFor(this.mode,m.userData.td);m.onBeforeCompile=sh=>{Object.assign(sh.uniforms,u);sh.vertexShader=sh.vertexShader.replace("#include <common>","#include <common>\nuniform vec2 uExt;\nvarying vec2 vEN;\nvarying float vU;\n#if GMODE == 2\nuniform sampler2D uTint;\nvarying vec3 vTint;\n#endif").replace("#include <beginnormal_vertex>","vec3 objectNormal = vec3(0.0, 1.0, 0.0);").replace("#include <begin_vertex>","#include <begin_vertex>\nvEN = vec2(position.x + 0.5 * uExt.x, 0.5 * uExt.y - position.z);\nvU = position.y;\n#if GMODE == 2\nvTint = textureLod(uTint, vEN / uExt, 0.0).rgb;\n#endif");sh.fragmentShader=sh.fragmentShader.replace("#include <common>","#include <common>\n"+FRAG_HEAD).replace("#include <map_fragment>",FRAG_ALBEDO).replace("#include <normal_fragment_maps>",`
vec2 nxz = texture2D(uNrm, tuv).rg * 2.0 - 1.0;
float nyy = sqrt(max(1.0 - dot(nxz, nxz), 0.0));
normal = normalize((viewMatrix * vec4(normalize(vec3(nxz.x * uExag, nyy, nxz.y * uExag)), 0.0)).xyz);`).replace("#include <lights_fragment_begin>",LIGHTS).replace("#include <aomap_fragment>","#include <aomap_fragment>\nreflectedLight.indirectDiffuse *= gSky;").replace("#include <emissivemap_fragment>","#include <emissivemap_fragment>\n"+FRAG_OUTLINES)};m.customProgramCacheKey=()=>"terrain-v11";m.userData.u=u;this.mats.add(m);return m}tintRef(man,G){const ref=man.ground?.tint_ref,names=["duff","leaf","grass","dirt"];const out=names.map((k,i)=>ref?.[k]?new THREE.Vector3(...ref[k]):(G?.mean?.[i]?.clone()||new THREE.Vector3(.2,.15,.1)).multiplyScalar(ref?1:1.8));out.push(out.reduce((a,v)=>a.add(v),new THREE.Vector3).multiplyScalar(.25));return out}defsFor(mode,t){const d={GMODE:mode,NL:t.NL,NSEG,SKY_AO_FLOOR:SKY_AO_FLOOR.toFixed(3),DET_FAR:DET_FAR.toFixed(3)};if(mode===2){if(t.kkd)d.HAS_KKD=1;if(t.hard)d.HAS_HARD=1;if(t.far)d.FAR_ONLY=1;if(t.spg)d.HAS_SPG=1}if(t.ao)d.HAS_AO=1;if(mode!==1)d.HAS_SUNVIS=1;if(t.ol)d.HAS_OUTLINES=1;return d}prewarm(){const o=this._ortho;if(o?.image&&!this._imgUsed&&typeof createImageBitmap==="function"&&!(o.image instanceof ImageBitmap))createImageBitmap(o.image,{imageOrientation:"flipY",premultiplyAlpha:"none"}).then(bm=>{if(this._imgUsed){bm.close();return}o.image=bm;o.flipY=false;o.needsUpdate=true}).catch(()=>{});const{r,scene,cam}=this._rs,sc=this._warm=new THREE.Scene,seen=new Set,g=new THREE.BufferGeometry;g.setAttribute("position",new THREE.BufferAttribute(new Float32Array(9),3));for(const mode of[0,1,2]){if(mode===this.mode||mode===2&&!this._gU?.uDet.value)continue;for(const m of this.mats){const d=this.defsFor(mode,m.userData.td),k=JSON.stringify(d);if(seen.has(k))continue;seen.add(k);const p=new THREE.MeshLambertMaterial;p.defines=d;p.onBeforeCompile=m.onBeforeCompile;p.customProgramCacheKey=m.customProgramCacheKey;const o2=new THREE.Mesh(g,p);o2.receiveShadow=true;sc.add(o2)}}r.compileAsync?.(sc,cam,scene).then(()=>{for(const o2 of sc.children)r.properties.get(o2.material).currentProgram?.getUniforms()}).catch(()=>{})}indexFor(nc,nr,nv){const key=nc*65536+nr;let a=this._idx.get(key);if(a)return a;const nq=(nc-1)*(nr-1),idx=nv>65535?new Uint32Array(nq*6+(nc+nr-2)*12):new Uint16Array(nq*6+(nc+nr-2)*12);let k=0;for(let r=0;r<nr-1;r++)for(let q=0;q<nc-1;q++){const a0=r*nc+q,b=a0+nc,c=a0+1,d=b+1;idx[k++]=a0;idx[k++]=b;idx[k++]=c;idx[k++]=b;idx[k++]=d;idx[k++]=c}let vb=nc*nr;const edge=(n,at,flip)=>{for(let i=0;i<n-1;i++){const t0=at(i),t1=at(i+1),b0=vb+i,b1=vb+i+1;if(flip){idx[k++]=t0;idx[k++]=b0;idx[k++]=t1;idx[k++]=t1;idx[k++]=b0;idx[k++]=b1}else{idx[k++]=t0;idx[k++]=t1;idx[k++]=b0;idx[k++]=t1;idx[k++]=b1;idx[k++]=b0}}vb+=n};edge(nc,q=>q,false);edge(nc,q=>(nr-1)*nc+q,true);edge(nr,r=>r*nc,true);edge(nr,r=>r*nc+nc-1,false);a=new THREE.BufferAttribute(idx,1);this._idx.set(key,a);return a}buildLevel(c,step){const{nx,h}=this;const idxs=(a,b)=>{const o=[];for(let i=a;i<b;i+=step)o.push(i);o.push(b);return o};const cols=idxs(c.i0,c.i1),rows=idxs(c.j0,c.j1),nc=cols.length,nr=rows.length;const skirt=1+step*1,nv=nc*nr+2*(nc+nr);const pos=new Float32Array(nv*3);let p=0;for(let r=0;r<nr;r++)for(let q=0;q<nc;q++){pos[p++]=this.sx(cols[q]);pos[p++]=h[rows[r]*nx+cols[q]];pos[p++]=this.sz(rows[r])}const hang=v=>{pos[p++]=pos[v*3];pos[p++]=pos[v*3+1]-skirt;pos[p++]=pos[v*3+2]};for(let q=0;q<nc;q++)hang(q);for(let q=0;q<nc;q++)hang((nr-1)*nc+q);for(let r=0;r<nr;r++)hang(r*nc);for(let r=0;r<nr;r++)hang(r*nc+nc-1);const g=new THREE.BufferGeometry;g.setAttribute("position",new THREE.BufferAttribute(pos,3));g.setIndex(this.indexFor(nc,nr,nv));g.computeBoundingBox();g.computeBoundingSphere();const m=new THREE.Mesh(g,c.mat||this.material);m.castShadow=false;m.receiveShadow=true;m.matrixAutoUpdate=false;m.renderOrder=5;m.onBeforeRender=this._obr||=(r,scene,cam)=>{this.viewH=r.getContext().drawingBufferHeight||this.viewH;this._rs||={r,scene,cam,t:performance.now()}};return m}update(cam){const want=this._gU?.uGround.value>.5&&this._gU.uDet.value?2:this._uUse?.value>.5?1:0;if(want!==this.mode){this.mode=want;this._imgUsed||=want===1;for(const m of this.mats){m.defines=this.defsFor(want,m.userData.td);m.needsUpdate=true}}const ex=this.shared.uExag.value,cp=cam.position,now=performance.now(),pend=[];if(!this._warm&&this._rs&&now-this._rs.t>3e3)this.prewarm();if(this._rs)this.bakeSun(this._rs.r);const dFar=this.mode===2&&this.matFar?1.05*DET_FAR*this.viewH*(cam.zoom||1)/(2*Math.tan(THREE.MathUtils.degToRad(cam.fov||50)/2)):Infinity;const lv=d=>d<LOD_DIST[0]?0:d<LOD_DIST[1]?1:d<LOD_DIST[2]?2:3;for(const c of this.chunks){const dx=Math.max(c.x0-cp.x,0,cp.x-c.x1),dz=Math.max(c.z0-cp.z,0,cp.z-c.z1);const dy=Math.max(c.lo*ex-cp.y,0,cp.y-c.hi*ex);const d=Math.hypot(dx,dy,dz);let lvl=lv(d);if(lvl>c.cur&&c.cur>=0)lvl=Math.max(c.cur,lv(d-LOD_HYST));this.updateHi(c,d);c.far=d>dFar;if(lvl===c.cur){c.seen[lvl]=now;this.setMat(c);continue}if(c.levels[lvl]||!c.mesh||lvl===0)this.show(c,lvl,now);else pend.push([lvl<c.cur?d:d+1e4,c,lvl])}if(pend.length){pend.sort((a,b)=>a[0]-b[0]);const t0=performance.now();for(const[,c,lvl]of pend){this.show(c,lvl,now);if(performance.now()-t0>BUILD_MS)break}}if(now-this._gcT>2e3){this._gcT=now;this.evict(now)}}show(c,lvl,now){if(!c.levels[lvl])c.levels[lvl]=this.buildLevel(c,1<<lvl);if(c.mesh)this.group.remove(c.mesh);c.mesh=c.levels[lvl];c.cur=lvl;c.seen[lvl]=now;this.group.add(c.mesh);this.setMat(c)}setMat(c){c.mesh.material=c.far?c.hard?this.matFarHard:this.matFar:c.mat}evict(now){for(const c of this.chunks)for(let l=0;l<c.levels.length;l++){const m=c.levels[l];if(m&&l!==c.cur&&now-(c.seen[l]||0)>LOD_KEEP_S*1e3){m.geometry.setIndex(null);m.geometry.dispose();c.levels[l]=void 0}}}updateHi(c,d){if(!c.tile)return;const HI_IN=180,HI_OUT=260,U=c.mat.userData.u;const free=t=>{t.dispose();if(!THREE.Cache.enabled)t.image?.close?.()};if(d<HI_IN&&!c.hiTex&&!c.hiLoading&&this.mode===1){c.hiLoading=true;const ld=this._bml||=typeof createImageBitmap==="function"?new THREE.ImageBitmapLoader().setOptions({imageOrientation:"flipY",premultiplyAlpha:"none"}):new THREE.TextureLoader;ld.load(this.base+c.tile.file,im=>{const t=im.isTexture?im:new THREE.Texture(im);t.flipY=!!im.isTexture;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;t.needsUpdate=true;c.hiLoading=false;if(this.mode!==1){free(t);return}c.hiTex=t;if(U){U.uHi.value=t;U.uHasHi.value=1}},void 0,()=>{c.hiLoading=false;c.tile=null})}else if((d>HI_OUT||this.mode!==1)&&c.hiTex){if(U){U.uHasHi.value=0;U.uHi.value=this.blank}free(c.hiTex);c.hiTex=null}}raycast(ray,maxDist=4e3){const ex=this.shared.uExag.value,o=ray.origin,d=ray.direction;let prevT=0,step=2;const above=t=>{const x=o.x+d.x*t,z=o.z+d.z*t;return o.y+d.y*t-this.heightAtScene(x,z)*ex};if(above(0)<0)return null;for(let t=step;t<maxDist;t+=step){const x=o.x+d.x*t,z=o.z+d.z*t;if(Math.abs(x)>this.W/2+50||Math.abs(z)>this.H/2+50){if(t>50&&d.y>=0)return null}if(above(t)<0){let a=prevT,b=t;for(let k=0;k<20;k++){const m=(a+b)/2;if(above(m)<0)b=m;else a=m}return b}prevT=t;step=Math.min(8,1+t*.01)}return null}}const SUN_HEAD=`float gVis = 1.0;   // the sun through the crowns (canopy sun map) where the shadow map doesn't reach: read in the lights loop
#ifdef HAS_SUNVIS
uniform sampler2D uSunVis;

float gEdge(vec4 sc) { vec2 q = abs(sc.xy / sc.w - 0.5) * 2.0; return smoothstep(0.8, 0.98, max(q.x, q.y)); }
#endif`;const FRAG_HEAD=`
uniform sampler2D uNrm, uAO;
uniform float uExag;
uniform vec2 uExt, uHRange;
uniform vec3 uSunDir;
uniform vec4 uLookG;
uniform float uLookD;
varying vec2 vEN;
varying float vU;
#if GMODE == 1
uniform sampler2D uOrtho, uHi;
uniform float uHasHi;
uniform vec4 uHiRect;
#endif
#ifdef HAS_OUTLINES
uniform vec4 uSeg[NSEG];
uniform int uSegR, uSegN;
#endif
${SUN_HEAD}
#if GMODE == 2
uniform sampler2D uCls;
uniform highp sampler2DArray uDet;
varying vec3 vTint;
uniform float uGreen, uLeafOff, uSpring;
#ifdef HAS_HARD
uniform sampler2D uHard;
uniform vec4 uHardRect;
#endif
#ifdef HAS_SPG
uniform sampler2D uSpg;
uniform vec4 uSpgRect;
uniform float uSpgAmt;
#endif
uniform float uGS[NL];
uniform vec3 uGM[NL];
uniform vec3 uGT[5];
#ifdef HAS_KKD
uniform sampler2D uKkd;
uniform vec4 uKkdNear;
float gUnder = 1.0;   // the carpet layer's brightness: < 1 under the 3D tufts (set in groundAlb, read in gLook)
#endif
const vec3 LW = vec3(0.2126, 0.7152, 0.0722);

float gHash(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }


uniform sampler2D uNz;
float gNoise(vec2 p) { vec2 i = floor(p), f = fract(p); return textureLod(uNz, (i + f * f * (3.0 - 2.0 * f) + 0.5) / ${NZ.toFixed(1)}, 0.0).r; }


vec3 gTex(float L, vec2 p, vec2 dx, vec2 dy, float sel) {
  float s = uGS[int(L)];
  vec3 a = vec3(0.0), b = vec3(0.0);
  if (sel < 0.98) a = textureGrad(uDet, vec3(p / s, L), dx / s, dy / s).rgb;
  if (sel > 0.02) {
    const mat2 R = mat2(0.8, -0.6, 0.6, 0.8); float s2 = s * 1.37;
    b = textureGrad(uDet, vec3(R * p / s2 + 0.31, L), R * dx / s2, R * dy / s2).rgb;
  }
  return mix(a, b, clamp((sel - 0.02) / 0.96, 0.0, 1.0));
}

float crackDist(vec2 p, float cell) {
  vec2 q = p / cell + (vec2(gNoise(p * 1.7), gNoise(p * 1.7 + 9.2)) - 0.5) * 0.45;
  vec2 i = floor(q), f = fract(q); float d1 = 9.0, d2 = 9.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 o = vec2(float(x), float(y)), r = o + 0.15 + 0.7 * vec2(gHash(i + o), gHash(i + o + 31.7)) - f;
    float d = dot(r, r); if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
  }
  return 0.5 * (sqrt(d2) - sqrt(d1)) * cell;
}





vec3 asphalt(vec3 c, vec2 p, float ch, float edgeK, float fp, float ao) {
  float fresh = smoothstep(0.31, 0.24, ch), worn = smoothstep(0.49, 0.42, ch) * (1.0 - fresh);
  c = mix(c, uGM[5], 0.35 * worn);
  c *= (0.62 + 0.76 * ch) * (0.92 + 0.16 * (gNoise(p * 0.31) * 0.6 + gNoise(p * 1.3 + 3.1) * 0.4));
  c = mix(c, c * vec3(0.9, 0.93, 1.0) * 0.82, fresh);
  c = mix(c, max(c * 1.1 + (c - uGM[5]) * 0.7, vec3(0.0)), edgeK * 0.7);
  
  
  if (fp < 0.035) {
    float aa = max(fp, 0.002), k = (1.0 - smoothstep(0.02, 0.035, fp)) * (1.0 - fresh) * min(1.0, 0.009 / (0.004 + aa));
    float cr = (1.0 - smoothstep(0.0, 0.003 + aa, crackDist(p, 1.9))) * smoothstep(0.35, 0.6, gNoise(p * 0.7 + 4.0));
    if (ch > 0.52 && fp < 0.02) cr = max(cr, (1.0 - smoothstep(0.0, 0.002 + aa, crackDist(p + 11.3, 0.45))) * smoothstep(0.52, 0.62, ch) * 0.8);
    c *= 1.0 - 0.4 * cr * k;
  }
  
  
  
  float lit = edgeK + 0.4 * clamp((ch - 0.5) * 6.0, 0.0, 1.0) + 0.3 * (1.0 - ao);
  if (fp < 0.03) {
    vec2 nc = p / 0.3, ni = floor(nc), nf = fract(nc) - 0.5;
    float g1 = gHash(ni + 5.3), g2 = gHash(ni + 2.9), g3 = gHash(ni + 7.7), pn = 0.12 + 0.45 * lit;
    if (g1 < pn) {
      float hl = 0.2 + 0.13 * g2, a0 = g3 * 6.283, w = 0.0067, f = fp / 0.3, nv = 0.0;
      vec2 b = (vec2(g2, g3) - 0.5) * 0.2 - vec2(cos(a0), sin(a0)) * hl;
      for (int j = 0; j < 2; j++) {
        float aj = a0 + (float(j) - 0.5) * (0.12 + 0.25 * g1 / pn);
        vec2 dir = vec2(cos(aj), sin(aj)), r = nf - b;
        float t = dot(r, dir), d = abs(dot(r, vec2(-dir.y, dir.x)));
        nv = max(nv, (1.0 - smoothstep(0.0, 0.5 * (w + f) + 1e-4, d)) * step(0.0, t) * (1.0 - smoothstep(2.0 * hl - 0.03, 2.0 * hl, t)));
      }
      c = mix(c, uGM[0] * vec3(1.1, 0.88, 0.7) * mix(1.3, 0.6, gHash(ni + 4.4)), nv * min(1.0, 1.5 * w / f) * (1.0 - smoothstep(0.02, 0.03, fp)));
    }
  }
  
  
  
  vec2 lc = p / 0.15, li = floor(lc), lf = fract(lc) - 0.5;
  float h1 = gHash(li + 3.7), h2 = gHash(li + 8.1), h3 = gHash(li + 1.3), h4 = gHash(li + 6.1);
  float pk = 0.025 + 0.13 * lit, hl = (0.015 + 0.035 * h3 * h3) / 0.15;   // keep probability; half the leaf's length (cells)
  float an = h2 * 6.283, cs = cos(an), sn = sin(an), aw = fp / 0.15 + 0.01;
  vec2 q = mat2(cs, -sn, sn, cs) * (lf - (vec2(h2, h4) - 0.5) * 2.0 * max(0.46 - hl, 0.0));
  float xl = q.x / hl, hw = hl / (1.7 + 0.6 * h4) * sqrt(max(1.0 - xl * xl, 0.0)) * (0.84 + 0.22 * cos(xl * 7.5 + h1 * 40.0));
  float lv = step(h1, pk) * (1.0 - smoothstep(hw - aw, hw + aw, abs(q.y))) * (1.0 - smoothstep(1.0 - aw / hl, 1.0 + aw / hl, abs(xl)));
  lv = mix(lv, pk * 0.06, smoothstep(0.012, 0.04, fp));
  vec3 lb = uGM[1], leaf = mix(lb * vec3(1.0, 0.93, 0.85), vec3(dot(lb, LW)) * vec3(1.0, 0.94, 0.86), 0.5 + 0.5 * h4) * (0.55 + 0.45 * h2);
  leaf *= (0.78 + 0.35 * smoothstep(-1.0, 1.0, q.y * (1.7 + 0.6 * h4) / hl)) * (1.0 + 0.12 * (1.0 - smoothstep(0.0, aw + 0.004, abs(q.y))));
  return mix(c, leaf, lv);
}


vec3 gGrass(vec3 c) { return mix(c, c * (vec3(0.075, 0.15, 0.03) / uGM[2]), uGreen); }
vec3 gKkdTint() { return mix(vec3(1.0), vec3(1.14, 0.86, 0.62), uLeafOff * 0.45) * mix(vec3(1.0), vec3(0.96, 1.06, 0.92), uSpring * 0.6); }
vec3 gLook(vec3 c, float L, vec2 p, vec3 hc, float edgeK, float fp, float ao) {
  if (L == 2.0) return gGrass(c);
#ifdef HAS_KKD
  if (L == 6.0) return c * gKkdTint() * gUnder;
#endif
  return c;
}





#define TOP2(w, i) if (w > b1) { b3 = max(b3, b2); b2 = b1; i2 = i1; b1 = w; i1 = i; } else if (w > b2) { b3 = max(b3, b2); b2 = w; i2 = i; } else b3 = max(b3, w);
vec3 groundAlb(vec2 p, vec2 tuv, float ao) {
  vec4 cw = texture2D(uCls, tuv);
  float w0 = cw.r, w1 = cw.g, w2 = cw.b, w3 = 1.0 - cw.a, w4 = 0.0, w5 = 0.0, w6 = 0.0;
  float sMain = w0 + w1 + w2 + w3;
  if (sMain < 1e-3) { w3 = 1.0; sMain = 1.0; }
  vec2 dx = dFdx(p), dy = dFdy(p);
  float lx = length(dx), ly = length(dy), fp = max(lx, ly);
  float fpE = max(min(lx, ly), fp * 0.25);
  vec3 hc = vec3(0.0, 0.0, 0.5); float edgeK = 0.0;
#ifdef HAS_HARD
  vec2 huv = (p - uHardRect.xy) / (uHardRect.zw - uHardRect.xy);
  if (huv.x > 0.0 && huv.y > 0.0 && huv.x < 1.0 && huv.y < 1.0) hc = texture2D(uHard, huv).rgb;
  
  float a = hc.g;
  if (a > 0.0 && a < 0.999) {
    edgeK = 1.0 - smoothstep(0.4, 0.95, a);
    a = mix(a, smoothstep(0.38, 0.62, a + (gNoise(p * 7.0) * 0.6 + gNoise(p * 23.0) * 0.4 - 0.5) * 0.7), 1.0 - smoothstep(0.03, 0.12, fp));
  }
  w4 = hc.r; w5 = a;
#endif
  float hard = min(w4 + w5, 1.0), kk = 0.0;
#ifdef HAS_KKD
  
  float kc = texture2D(uKkd, tuv).r;
  kk = kc * (1.0 - hard);
#ifndef FAR_ONLY
  if (kk > 0.004 && fp < 0.5) {
    float kn = gNoise(p * 1.1) * 0.55 + gNoise(p * 3.3 + 7.0) * 0.45;
    kk = min(mix(kk, smoothstep(0.3, 0.7, kk + (kn - 0.5) * 0.8), 1.0 - smoothstep(0.12, 0.5, fp)), 1.0 - hard);
  }
  
  
  if (uKkdNear.w > 0.0 && kk > 0.004) {
    float kd = length(p - vec2(cameraPosition.x + 0.5 * uExt.x, 0.5 * uExt.y - cameraPosition.z));
    gUnder = 1.0 - uKkdNear.w * (1.0 - smoothstep(uKkdNear.x, uKkdNear.z, kd)) * smoothstep(0.25, 0.6, kc);
  }
#endif
  kk *= step(0.004, kk);
  w6 = kk;
#endif
  float k = (1.0 - hard - kk) / max(sMain, 1e-3);
  w0 *= k; w1 *= k; w2 *= k; w3 *= k;
  
  vec3 expect = uGT[0] * w0 + uGT[1] * w1 + uGT[2] * w2 + uGT[3] * w3 + uGT[4] * (w4 + w5 + w6);
  vec3 col = uGM[0] * w0 + uGM[1] * w1 + gGrass(uGM[2]) * w2 + uGM[3] * w3 + uGM[4] * w4 + uGM[5] * (0.62 + 0.76 * hc.b) * w5;
#ifdef HAS_KKD
  col += uGM[6] * gKkdTint() * gUnder * w6;
#endif
#ifdef HAS_SPG
  vec3 gBase = col;   // the layer mix's mean: the detail below is carried over the splat ground as its ratio to this
#endif
#ifndef FAR_ONLY
  float far = max(smoothstep(DET_FAR * 0.6, DET_FAR, fpE), uLookD);
  if (far < 0.999) {
    float b1 = w0, i1 = 0.0, b2 = -1.0, i2 = 0.0, b3 = 0.0;
    TOP2(w1, 1.0) TOP2(w2, 2.0) TOP2(w3, 3.0) TOP2(w4, 4.0) TOP2(w5, 5.0)
#ifdef HAS_KKD
    TOP2(w6, 6.0)
#endif
    float a1 = b1 - b3, a2 = max(b2 - b3, 0.0);
    
    float sel = smoothstep(0.485, 0.515, gNoise(p * 0.11) * 0.7 + gNoise(p * 0.43) * 0.3);
    vec3 c1 = gTex(i1, p, dx, dy, sel), c2 = uGM[int(i2)];
    float h1 = a1 + 0.22 * dot(c1, LW) / dot(uGM[int(i1)], LW) + (i1 == 6.0 ? 0.1 : 0.0), h2 = -1.0;
    
    
    if (a2 > max(a1 - 0.6, 0.01)) { c2 = gTex(i2, p, dx, dy, sel); h2 = a2 + 0.22 * dot(c2, LW) / dot(uGM[int(i2)], LW) + (i2 == 6.0 ? 0.1 : 0.0); }
    float ma = max(h1, h2) - 0.15, e1 = max(h1 - ma, 0.0), e2 = max(h2 - ma, 0.0);
    c1 = gLook(c1, i1, p, hc, edgeK, fp, ao);
    if (e2 > 0.0) c2 = gLook(c2, i2, p, hc, edgeK, fp, ao);
#ifdef HAS_HARD
    
    if (i1 == 5.0) c1 = asphalt(c1, p, hc.b, edgeK, fp, ao); else if (i2 == 5.0 && e2 > 0.0) c2 = asphalt(c2, p, hc.b, edgeK, fp, ao);
#endif
    col = mix((c1 * e1 + c2 * e2) / max(e1 + e2, 1e-4), col, far);
  }
#endif
  
  
  
  
  vec3 r = vTint / max(expect, vec3(0.01));
  float lr = max(dot(r, LW), 0.05); vec3 chr = clamp(r / lr, 0.75, 1.3);
  float air = smoothstep(0.08, 0.3, fpE), keep = (1.0 - 0.7 * hard) * (1.0 - 0.8 * w6);
  float amt = mix(mix(0.6, 0.25, clamp(w0 + w1, 0.0, 1.0)), 0.8, air) * keep;
  vec3 res = col * mix(vec3(1.0), chr, amt) * mix(1.0, clamp(pow(lr, mix(0.5, 0.8, air)), mix(0.8, 0.6, air), mix(1.25, 1.6, air)), amt);
#ifdef HAS_SPG
  
  
  
  
  vec2 suv = (p - uSpgRect.xy) / (uSpgRect.zw - uSpgRect.xy);
  if (uSpgAmt > 0.0 && suv.x > 0.0 && suv.y > 0.0 && suv.x < 1.0 && suv.y < 1.0) {
    vec4 sg = texture2D(uSpg, suv);
    vec3 grain = clamp(col / max(gBase, vec3(0.005)), 0.3, 3.0);
    grain = mix(vec3(1.0), grain, 0.85);
    float sa = sg.a * uSpgAmt * (1.0 - 0.6 * hard);
    res = mix(res, sg.rgb * grain, sa);
  }
#endif
  return res;
}
#endif
`;const FRAG_ALBEDO=`
vec2 tuv = vEN / uExt;
#ifdef HAS_AO
float aoS = texture2D(uAO, tuv).r;
#else
float aoS = 1.0;
#endif
float gSky = mix(max(SKY_AO_FLOOR, uLookG.z), 1.0, aoS);
#ifdef HAS_SUNVIS
gVis = mix(texture2D(uSunVis, tuv).r, 1.0, uLookG.w);
#endif
#if GMODE == 2
diffuseColor.rgb = groundAlb(vEN, tuv, aoS);
{ float lkY = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722)); diffuseColor.rgb = (lkY + (diffuseColor.rgb - lkY) * uLookG.x) * uLookG.y; }
#elif GMODE == 1
vec3 alb = texture2D(uOrtho, tuv).rgb * 1.08;
if (uHasHi > 0.5) {
  vec2 huv = (vEN - uHiRect.xy) / (uHiRect.zw - uHiRect.xy);
  if (all(greaterThanEqual(huv, vec2(0.0))) && all(lessThanEqual(huv, vec2(1.0)))) alb = texture2D(uHi, huv).rgb * 1.08;
}
diffuseColor.rgb = alb;
#else
float hf = clamp((vU - uHRange.x) / max(uHRange.y - uHRange.x, 1.0), 0.0, 1.0);


diffuseColor.rgb = mix(vec3(0.20, 0.19, 0.16), vec3(0.30, 0.28, 0.24), hf);
{
  vec2 rn = texture2D(uNrm, tuv).rg * 2.0 - 1.0;
  vec3 wn = normalize(vec3(rn.x * uExag, sqrt(max(1.0 - dot(rn, rn), 0.0)), rn.y * uExag));
  diffuseColor.rgb *= 0.35 + 0.85 * max(dot(wn, uSunDir), 0.0) / max(uSunDir.y, 0.3);
}
#endif
`;const LIGHTS=THREE.ShaderChunk.lights_fragment_begin.replace(/directLight\.color \*= \( directLight\.visible && receiveShadow \) \? (getShadow\( directionalShadowMap\[ i \][^;]*?\)) : 1\.0;(\s*)#endif/,"#ifdef HAS_SUNVIS$2directLight.color *= ( directLight.visible && receiveShadow ) ? mix( $1, gVis, gEdge( vDirectionalShadowCoord[ i ] ) ) : 1.0;$2#else$2directLight.color *= ( directLight.visible && receiveShadow ) ? $1 : 1.0;$2#endif$2#else$2directLight.color *= gVis;$2#endif");if(!LIGHTS.includes("gEdge("))console.warn("terrain: canopy sun patch did not apply (three.js lights chunk changed)");const FRAG_OUTLINES=`
#ifdef HAS_OUTLINES
{
  float dR = 1e9, dP = 1e9; vec2 sR = vec2(1.0, 0.0), sP = vec2(1.0, 0.0);
  for (int i = 0; i < NSEG; i++) {
    if (i >= uSegN) break;
    vec4 sg = uSeg[i]; vec2 pa = vEN - sg.xy, ba = sg.zw - sg.xy;
    float d = length(pa - ba * clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0));
    if (i < uSegR) { if (d < dR) { dR = d; sR = ba; } } else if (d < dP) { dP = d; sP = ba; }
  }
  
  
  vec2 ex = dFdx(vEN), ey = dFdy(vEN), nR = normalize(vec2(-sR.y, sR.x) + 1e-6), nP = normalize(vec2(-sP.y, sP.x) + 1e-6);
  float pR = dR / max(length(vec2(dot(ex, nR), dot(ey, nR))), 1e-4), pP = dP / max(length(vec2(dot(ex, nP), dot(ey, nP))), 1e-4);
  float LR = 1.0 - smoothstep(0.7, 1.5, pR), LP = 1.0 - smoothstep(1.0, 2.0, pP);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.0), max(LR, LP) * 0.6);
  totalEmissiveRadiance += vec3(0.75, 0.9, 1.0) * LR * 0.9 + vec3(1.0, 0.75, 0.15) * LP * 1.4;
}
#endif
`;
