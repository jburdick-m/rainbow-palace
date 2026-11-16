import*as THREE from"three";const QS=new URLSearchParams(location.search);const CANOPY=+(QS.get("canopy")??0);const PHOTO_BOUGH=f=>CANOPY&&f.bough&&f.own&&["black_oak","ponderosa"].includes(f.sprite);const BARK_BAKED=QS.get("bark")==="baked";const MANZ=QS.get("manz")==="1";const BB={uBBAx:{value:Array.from({length:128},()=>new THREE.Vector3)},uBBHd:{value:Array.from({length:16},()=>new THREE.Vector4)},uBBR:{value:Array.from({length:16},()=>new THREE.Vector4)},uBBN:{value:0},uBBSlots:{value:1},uBBTex:{value:null}};if(BARK_BAKED){fetch("tex/barkbake/bake.json").then(r=>r.json()).then(j=>{const T=j.trees.slice(0,16);BB.uBBSlots.value=j.slots;BB.uBBN.value=T.length;T.forEach((t,k)=>{BB.uBBHd.value[k].set(Math.min(t.axis.length,8),t.slot,t.L,0);BB.uBBR.value[k].set(t.r[0],t.r[1],t.r[2],0);t.axis.slice(0,8).forEach((a,i)=>BB.uBBAx.value[k*8+i].set(a[0],a[1],a[2]))})}).catch(e=>console.warn("bark bake missing",e.message));new THREE.TextureLoader().load("tex/barkbake/bark_atlas.png",t=>{t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;BB.uBBTex.value=t})}const BB_DECL="varying vec3 vBW;\nuniform vec3 uBBAx[128]; uniform vec4 uBBHd[16], uBBR[16]; uniform int uBBN; uniform float uBBSlots; uniform sampler2D uBBTex;\n";const BB_FRAG=`
{ vec3 pl = vec3(vBW.x + 437.0, 476.25 - vBW.z, vBW.y);
  for (int t = 0; t < 16; t++) { if (t >= uBBN) break;
    vec4 hd = uBBHd[t]; int np = int(hd.x + 0.5); float H = hd.z;
    if (distance(pl, uBBAx[t * 8]) > H + 3.0) continue;
    float best = 1e9, s = 0.0, acc = 0.0; vec3 q = uBBAx[t * 8], T = vec3(0.0, 0.0, 1.0);
    for (int k = 1; k < 8; k++) { if (k >= np) break;
      vec3 a = uBBAx[t * 8 + k - 1], ab = uBBAx[t * 8 + k] - a; float l = length(ab), tt = clamp(dot(pl - a, ab) / max(l * l, 1e-6), 0.0, 1.0);
      vec3 c = a + ab * tt; float dd = length(pl - c); if (dd < best) { best = dd; s = acc + tt * l; q = c; T = ab / max(l, 1e-6); } acc += l; }
    vec4 rr = uBBR[t]; float r = s < 0.5 * H ? mix(rr.x, rr.y, s / (0.5 * H)) : mix(rr.y, rr.z, (s - 0.5 * H) / (0.5 * H));
    float m = (1.0 - smoothstep(r * 1.5, r * 2.0 + 0.1, best)) * (1.0 - smoothstep(H - 1.0, H, s));
    if (m > 0.0) {
      vec3 e1 = normalize(vec3(1.0, 0.0, 0.0) - T.x * T), e2 = cross(T, e1), dv = pl - q;
      float a = fract(atan(dot(dv, e2), dot(dv, e1)) / 6.2831853), v = clamp(s / H, 0.0, 1.0);
      vec4 lo = textureLod(uBBTex, vec2((hd.y + 0.03 + 0.94 * a) / uBBSlots, v), 0.0);
      vec3 det = clamp(bk.rgb / max(textureLod(uBarkTex, vBark, 6.0).rgb, vec3(0.02)), 0.25, 2.5);
      diffuseColor.rgb = mix(diffuseColor.rgb, lo.rgb * det, m * lo.a);   // alpha: the bake's confidence (sky, leaves and unsure texels are 0: tonight's bark there)
    } } }
`;const CANOPY_DENS=+(QS.get("canopydens")??.6);const PER_ROW=256;export const NEAR_DIST=Math.min(Math.max(+(QS.get("near")||80),40),250);const LOD_FADE_S=.4;const TRUNK_FAR=Math.max(200,NEAR_DIST+60);const CLOUD_D0=NEAR_DIST+30,CLOUD_D1=480,CLOUD_KEEP=.4;export const SHRUB_DIST=320;const SHRUB_NEAR=30;const SHRUB_SH_LATCH=25;const ROAD_CLEAR=.3,ROAD_BED=6;const FOL_DIRECT="float folSh = 1.0;\nfloat folEdge( vec4 sc ) { vec2 q = abs( sc.xy / sc.w - 0.5 ) * 2.0; return smoothstep( 0.8, 0.98, max( q.x, q.y ) ); }\n"+THREE.ShaderChunk.lights_lambert_pars_fragment.replace("float dotNL = saturate( dot( geometryNormal, directLight.direction ) );\n	vec3 irradiance = dotNL * directLight.color;",`float nl = dot( geometryNormal, directLight.direction );
	float dotNL = saturate( ( nl + FOL_WRAP ) / ( 1.0 + FOL_WRAP ) ) * mix( 1.0, folSh, FOL_SHADOW );
	float trn = FOL_TRANS * vThk * pow( saturate( dot( geometryViewDir, -directLight.direction ) ), 4.0 ) * saturate( 0.3 - nl ) * mix( 1.0, folSh, FOL_SHADOW_T );
	vec3 tTint = pow( material.diffuseColor / max( dot( material.diffuseColor, vec3( 0.2126, 0.7152, 0.0722 ) ), 1e-3 ), vec3( 0.6 ) );
	vec3 irradiance = ( dotNL + trn * tTint ) * directLight.color;`);const FOL_LIGHTS="vec3 skyIrr = vec3( 0.0 );\nfolSh = vSelf;\n"+THREE.ShaderChunk.lights_fragment_begin.replace(/\? getShadow\( directionalShadowMap\[ i \]([^;]*?)\) : 1\.0;/,"? ( folSh = mix( getShadow( directionalShadowMap[ i ]$1), vSelf, folEdge( vDirectionalShadowCoord[ i ] ) ), 1.0 ) : 1.0;").replace("irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );","{ float hu = 0.5 * dot( geometryNormal, hemisphereLights[ i ].direction ) + 0.5; vec3 sk = hemisphereLights[ i ].skyColor * mix( 0.5, 1.0, hu ); skyIrr += sk; irradiance += sk + hemisphereLights[ i ].groundColor * 0.25 * ( 1.0 - hu ); }");const FOL_AMBIENT=`#include <aomap_fragment>
reflectedLight.indirectDiffuse *= vAO;
totalEmissiveRadiance += FOL_SHEEN * vAO * skyIrr * RECIPROCAL_PI;`;if(!FOL_DIRECT.includes("FOL_WRAP")||!FOL_LIGHTS.includes("folSh = mix( getShadow")||!FOL_LIGHTS.includes("float hu"))console.warn("foliage lighting patch did not apply (three.js chunk changed)");const CHROMA=.62,CHROMA_FALL=.6;const desat=(c,k)=>{const l=.2126*c.r+.7152*c.g+.0722*c.b;c.r=l+(c.r-l)*k;c.g=l+(c.g-l)*k;c.b=l+(c.b-l)*k;return c};const VIEW_MARGIN=3;const NBIN=32;const clsOf=name=>/snag|dead/i.test(name)?2:/oak|shrub|madrone|maple|alder|willow|broad|hardwood/i.test(name)?1:0;const NATURAL={ponderosa:"#55612f",conifer_other:"#34503a",black_oak:"#8c9842",live_oak:"#56633a",tall_shrub:"#666a3a",snag:"#8b857b",incense_cedar:"#4b5a2c",douglas_fir:"#2f4a3a",sugar_pine:"#4a5f36",blue_oak:"#7f8c69",madrone:"#5f7a32",other_hardwood:"#62723a"};const CATEGORY={ponderosa:"#3f9a37",conifer_other:"#1d7b80",black_oak:"#e08a1e",live_oak:"#8e4fc0",tall_shrub:"#e3d23c",snag:"#a0a0a0",incense_cedar:"#b5651d",douglas_fir:"#2a5db0",sugar_pine:"#7bc96f",blue_oak:"#7fa7c9",madrone:"#d6336c",other_hardwood:"#c9a36b"};const PHENO={black_oak:{d:1,fall:"#a99343",spring:"#8aa544"},blue_oak:{d:1,fall:"#7d7155",spring:"#93a873"},other_hardwood:{d:1,fall:"#bfa13a",spring:"#89aa48"}};const PAL_PHOTO=QS.get("pal")==="photo";const NATURAL_PHOTO={ponderosa:"#6c6147",conifer_other:"#555a4b",black_oak:"#808360",live_oak:"#60604e",tall_shrub:"#75715c",snag:"#8b8378",incense_cedar:"#5c5e4a",douglas_fir:"#4c5445",sugar_pine:"#505d46",blue_oak:"#82816f",madrone:"#667751",other_hardwood:"#8b856a"};const ORTHO_LUM_REF={ponderosa:.1008,conifer_other:.097,black_oak:.0983,live_oak:.1258,tall_shrub:.147,snag:.1622,douglas_fir:.0824,incense_cedar:.0947,blue_oak:.1329,other_hardwood:.2461};const PHENO_FALL_PHOTO={black_oak:"#b58f27"};const SHRUB_NATURAL={brush:"#566331",manzanita:"#6f7a4c"};const SHRUB_CATEGORY={brush:"#c8d86a",manzanita:"#d0503a"};const fallbackHue=(i,n)=>new THREE.Color().setHSL((i/Math.max(n,1)+.13)%1,.55,.5).getHexString();export function speciesLegend(man){return(man.species||[]).map((s,i)=>({name:s,color:CATEGORY[s]||"#"+fallbackHue(i,man.species.length)}))}function prng(seed){let a=seed>>>0;return()=>{a=a+1831565813|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}function cardMips(src){const S=src.width,d=src.getContext("2d",{willReadFrequently:true}).getImageData(0,0,S,S).data;let L=new Float32Array(S*S),A=new Float32Array(S*S),sum=0,n=0,cov=0;for(let i=0;i<S*S;i++){A[i]=d[4*i+3]/255;L[i]=d[4*i];if(A[i]>.2&&A[i]<.9){sum+=L[i];n++}if(A[i]>.5)cov++}const g=n?sum/n:160;cov/=S*S;for(let i=0;i<S*S;i++)if(A[i]<=.2)L[i]=g;const levels=[];let w=S;for(;;){const N=w*w;let lo=0,hi=1;for(let it=0;it<14;it++){const t=(lo+hi)/2;let c=0;for(let i=0;i<N;i++)if(A[i]>t)c++;if(c/N>cov)lo=t;else hi=t}const k=.5/Math.max((lo+hi)/2,.001),out=new Uint8ClampedArray(N*4);for(let i=0;i<N;i++){out[4*i]=out[4*i+1]=out[4*i+2]=L[i];out[4*i+3]=Math.min(1,A[i]*k)*255}levels.push(new ImageData(out,w,w));if(w===1)break;const w2=w>>1,L2=new Float32Array(w2*w2),A2=new Float32Array(w2*w2);for(let y=0;y<w2;y++)for(let x=0;x<w2;x++){const i0=2*y*w+2*x;let a=0,la=0,l=0;for(const j of[i0,i0+1,i0+w,i0+w+1]){a+=A[j];la+=L[j]*A[j];l+=L[j]}A2[y*w2+x]=a/4;L2[y*w2+x]=a>1e-4?la/a:l/4}w=w2;L=L2;A=A2}return levels}function mipTexture(canvas){const levels=cardMips(canvas),t=new THREE.Texture(levels[0]);t.mipmaps=levels;t.generateMipmaps=false;t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;t.needsUpdate=true;return t}function setLevels(t,canvas){const levels=cardMips(canvas);t.dispose();t.image=levels[0];t.mipmaps=levels;t.needsUpdate=true}function canvas2d(S){const c=document.createElement("canvas");c.width=c.height=S;return[c,c.getContext("2d",{willReadFrequently:true})]}function placeholderCanvas(leaf){const[c,g]=canvas2d(128),R=prng(leaf?11:22);if(leaf)for(let i=0;i<210;i++){const a=R()*6.283,d=Math.pow(R(),.7)*54,v=175+R()*80|0;g.fillStyle=`rgb(${v},${v},${v})`;g.save();g.translate(64+Math.cos(a)*d,64+Math.sin(a)*d*.9);g.rotate(a+(R()-.5)*1.4);g.beginPath();g.ellipse(0,0,2.5+R()*2.5,4.5+R()*4,0,0,6.283);g.fill();g.restore()}else for(let k=0;k<22;k++){const a0=R()*6.283,d0=Math.pow(R(),.7)*41,cx=64+Math.cos(a0)*d0,cy=64+Math.sin(a0)*d0*.8;for(let i=0;i<40;i++){const a=R()*6.283,l=6+R()*15,v=170+R()*85|0;g.strokeStyle=`rgb(${v},${v},${v})`;g.lineWidth=1.2+R()*.8;g.beginPath();g.moveTo(cx,cy);g.lineTo(cx+Math.cos(a)*l,cy+Math.sin(a)*l*.85);g.stroke()}}return c}function twigTexture(){const[c,g]=canvas2d(256),R=prng(77);g.lineCap="round";const br=(x,y,a,len,w,dep)=>{if(dep>6||len<5)return;const x2=x+Math.cos(a)*len,y2=y+Math.sin(a)*len,v=185+R()*50|0;g.strokeStyle=`rgb(${v},${v},${v})`;g.lineWidth=w;g.beginPath();g.moveTo(x,y);g.quadraticCurveTo((x+x2)/2+(R()-.5)*len*.3,(y+y2)/2+(R()-.5)*len*.3,x2,y2);g.stroke();const n=R()<.35?3:2;for(let k=0;k<n;k++)br(x2,y2,a+(k-(n-1)/2)*(.55+R()*.5)+(R()-.5)*.3,len*(.6+R()*.2),Math.max(w*.66,1.1),dep+1)};for(let k=0;k<4;k++)br(128+(R()-.5)*60,255,-Math.PI/2+(R()-.5)*.9,55+R()*25,5,0);return mipTexture(c)}const spriteCache=new Map;function loadSprite(url,prep){if(!spriteCache.has(url))spriteCache.set(url,new Promise((res,rej)=>{const img=new Image;img.crossOrigin="anonymous";img.onload=()=>res(prep(img));img.onerror=()=>rej(new Error("missing "+url));img.src=url}));return spriteCache.get(url)}function softSprite(img){const S=img.width,[c,g]=canvas2d(S);g.drawImage(img,0,0);const im=g.getImageData(0,0,S,S),d=im.data,L=new Float32Array(S*S);let sum=0,n=0;for(let i=0;i<S*S;i++){L[i]=d[4*i];if(d[4*i+3]>127){sum+=L[i];n++}}const m=n?sum/n:205,f=v=>m+(v-m)*(v>m?.6:.9);for(let y=0;y<S;y++)for(let x=0;x<S;x++){const i=y*S+x,a=d[4*i+3];if(a===0||a>=250)continue;let s=0,k2=0;for(let v=Math.max(y-1,0);v<=Math.min(y+1,S-1);v++)for(let u=Math.max(x-1,0);u<=Math.min(x+1,S-1);u++)if(d[4*(v*S+u)+3]>=250){s+=L[v*S+u];k2++}d[4*i]=k2?s/k2:m}let s2=0;for(let i=0;i<S*S;i++)if(d[4*i+3]>127)s2+=f(d[4*i]);const k=n?m*n/s2:1;for(let i=0;i<d.length;i+=4)d[i]=d[i+1]=d[i+2]=Math.min(255,f(d[i])*k);g.putImageData(im,0,0);return c}function greySprig(img,S=256){const[src,sg]=canvas2d(Math.max(img.width,img.height));sg.drawImage(img,0,0);const sd=sg.getImageData(0,0,img.width,img.height).data;let x0=img.width,y0=img.height,x1=0,y1=0;for(let y=0;y<img.height;y+=2)for(let x=0;x<img.width;x+=2)if(sd[(y*img.width+x)*4+3]>40){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y)}const[c,g]=canvas2d(S),sc=S/Math.max(x1-x0+1,y1-y0+1,1);g.drawImage(src,x0,y0,x1-x0+1,y1-y0+1,(S-(x1-x0+1)*sc)/2,S-(y1-y0+1)*sc,(x1-x0+1)*sc,(y1-y0+1)*sc);const im=g.getImageData(0,0,S,S),d=im.data;let sum=0,n=0;for(let i=0;i<d.length;i+=4)if(d[i+3]>40){sum+=.3*d[i]+.59*d[i+1]+.11*d[i+2];n++}const k=205/Math.max(sum/Math.max(n,1),1);for(let i=0;i<d.length;i+=4){const v=Math.min(255,(.3*d[i]+.59*d[i+1]+.11*d[i+2])*k);d[i]=d[i+1]=d[i+2]=205+(v-205)*.6}g.putImageData(im,0,0);return c}function cardCanvas(img,cover,seed){const layout=K2=>{const R=prng(seed),L=[];for(let k=0;k<K2;k++){const sc=K2===1?.94:.62+.3*R(),x=.5+(R()-.5)*.12*(K2>1),y=.99-.06*R();L.push([x,y,K2===1?0:(k-(K2-1)/2)*(1.6/Math.max(K2,2))+(R()-.5)*.35,R()<.5?-sc:sc,sc])}return L};const draw=(g2,S,L)=>{g2.clearRect(0,0,S,S);for(const[x,y,a,sx,sy]of L){g2.save();g2.translate(S*x,S*y);g2.rotate(a);g2.scale(sx,sy);g2.drawImage(img,-S/2,-S,S,S);g2.restore()}};const[,pg]=canvas2d(128),covOf=L=>{draw(pg,128,L);const d=pg.getImageData(0,0,128,128).data;let n=0;for(let i=3;i<d.length;i+=4)n+=d[i]>127;return n/16384};let K=1,cov=covOf(layout(1));while(cov<cover&&K<14)cov=covOf(layout(++K));const[c,g]=canvas2d(512);draw(g,512,layout(K));return{canvas:c,K,cover:cov}}function boughCanvas(img,f,seed){const S=BOUGH_PX,[c,g]=canvas2d(S),R=prng(seed),rnd=(a,b)=>a+(b-a)*R(),leaf=S*f.leaf,parts=[];g.lineCap="round";g.strokeStyle="rgb(118,112,104)";const twig=(x,y,a,len,w)=>{const x2=x+Math.cos(a)*len,y2=y+Math.sin(a)*len,cx=(x+x2)/2+rnd(-.12,.12)*len,cy=(y+y2)/2+rnd(-.12,.12)*len;g.lineWidth=w;g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(cx,cy,x2,y2);g.stroke();return t=>[(1-t)*(1-t)*x+2*t*(1-t)*cx+t*t*x2,(1-t)*(1-t)*y+2*t*(1-t)*cy+t*t*y2]};const[n,ns]=f.bough,up=-Math.PI/2,base=twig(S/2,S*.995,up+rnd(-.08,.08),S*.1,S/160)(1);for(let k=0;k<n;k++){const a=up+((k+rnd(.25,.75))/n-.5)*1.9,len=S*rnd(.42,.6)*(1-.25*Math.abs(a-up)),at=twig(base[0],base[1],a,len,S/260);parts.push([...at(1),a+rnd(-.4,.4),rnd(.9,1.05)]);{const q=at(rnd(.3,.45));parts.push([q[0],q[1],a+(R()<.5?-1:1)*rnd(.7,1.3),rnd(.7,.9)])}for(let j=0;j<ns;j++){const q=at(.45+.45*(j+rnd(.2,.8))/ns),a2=a+(j%2?-1:1)*(R()<.85?1:-1)*rnd(.6,1.1),e=twig(q[0],q[1],a2,len*rnd(.35,.5),S/400)(1);parts.push([e[0],e[1],a2+rnd(-.4,.4),rnd(.75,1)])}}const m=leaf*.72;for(const[x,y,a,sc]of parts){const tx=Math.min(Math.max(x+Math.cos(a)*leaf*sc*.5,m),S-m),ty=Math.min(Math.max(y+Math.sin(a)*leaf*sc*.5,m),S-m);g.save();g.translate(tx-Math.cos(a)*leaf*sc*.5,ty-Math.sin(a)*leaf*sc*.5);g.rotate(a+Math.PI/2);g.scale(R()<.5?-sc:sc,sc);g.drawImage(img,-leaf/2,-leaf,leaf,leaf);g.restore()}const d=g.getImageData(0,0,S,S).data;let cnt=0;for(let i=3;i<d.length;i+=16)cnt+=d[i]>127;c.cover=cnt/(S*S/4);return c}function massCanvas(img,f,seed){const S=256,[c,g]=canvas2d(S),R=prng(seed),n=f.mass[0],L=S*f.mass[1],parts=[];for(let k=0;k<n;k++){const z=1-2*(k+.5)/n+(R()-.5)*.2,rxy=Math.sqrt(Math.max(1-z*z,.04)),a=k*2.39996+R()*.9;parts.push({x:Math.cos(a)*rxy,y:Math.sin(a)*rxy*(f.cls===0?.8:1),z,turn:(R()-.5)*1.2,len:.62+.3*R(),flip:R()<.5,off:.06+.16*R()})}parts.sort((p,q)=>p.z-q.z);for(const p of parts){const fs=Math.max(Math.hypot(p.x,p.y),.35),ln=L*p.len,r0=p.off*S*.5;g.save();g.filter=`brightness(${(.7+.3*(.5+.5*p.z)).toFixed(3)})`;g.translate(S/2+p.x*r0,S/2+p.y*r0);g.rotate(Math.atan2(p.y,p.x)+Math.PI/2+p.turn*fs);g.scale(p.flip?-1:1,fs);g.drawImage(img,-ln/2,-ln,ln,ln);g.restore()}return c}function familyTextures(f,base,seed,useSprites){const leaf=f.cls!==0,card=mipTexture(placeholderCanvas(leaf)),mass=mipTexture(placeholderCanvas(leaf));const sprig=leaf?"tex/oak_color.png":"tex/pine_color.png";const own=f.own||LIMB_PINE&&(f===FAMILIES.pine||f===FAMILIES.sugar);const only=QS.get("spritesp")?.split(","),dir=!own&&QS.get("spritedir")&&(!only||only.includes(f.sprite))?QS.get("spritedir"):null;const smap=Object.fromEntries((QS.get("spritemap")||"").split(",").filter(Boolean).map(s=>s.split(":")));const std=()=>loadSprite(base+"tex/species/"+f.sprite+".png",softSprite);const src=useSprites?(dir?loadSprite(dir.replace(/\/?$/,"/")+(smap[f.sprite]||f.sprite)+".png",softSprite).catch(()=>std()):std()).catch(e=>{console.warn("species sprite missing, using the fallback sprig:",e.message);return loadSprite(sprig,greySprig)}):loadSprite(sprig,greySprig);if(PHOTO_BOUGH(f)){const im=new Image;im.src="tex/bough/"+f.sprite+".png";im.decode().then(()=>{const[c,g]=canvas2d(1024);g.drawImage(im,0,0,1024,1024);setLevels(card,c);card.userData={K:0,cover:.35}}).catch(e=>console.warn("photo bough missing",e.message));src.then(img=>{if(f.mass)setLevels(mass,massCanvas(img,f,seed+7))}).catch(()=>{});return{card,mass}}src.then(img=>{const bc=f.bough&&boughCanvas(img,f,seed),cc=bc?{canvas:bc,K:0,cover:bc.cover}:cardCanvas(img,f.cover,seed);setLevels(card,cc.canvas);card.userData={K:cc.K,cover:cc.cover};if(f.mass)setLevels(mass,massCanvas(img,f,seed+7))}).catch(e=>console.warn("foliage sprite missing, procedural foliage",e.message));return{card,mass}}function noiseTexture3D(N=64,cells=8){const R=prng(31),lat=Float32Array.from({length:cells**3},()=>R()),d=new Uint8Array(N**3),k=cells/N;const at=(i,j,l)=>lat[(l%cells*cells+j%cells)*cells+i%cells],sm=t2=>t2*t2*(3-2*t2);for(let z=0;z<N;z++)for(let y=0;y<N;y++)for(let x=0;x<N;x++){const fx=x*k,fy=y*k,fz=z*k,i=Math.floor(fx),j=Math.floor(fy),l=Math.floor(fz),u=sm(fx-i),v=sm(fy-j),w=sm(fz-l);const a=at(i,j,l)+(at(i+1,j,l)-at(i,j,l))*u,b=at(i,j+1,l)+(at(i+1,j+1,l)-at(i,j+1,l))*u;const e=at(i,j,l+1)+(at(i+1,j,l+1)-at(i,j,l+1))*u,g=at(i,j+1,l+1)+(at(i+1,j+1,l+1)-at(i,j+1,l+1))*u;const p=a+(b-a)*v,q=e+(g-e)*v;d[(z*N+y)*N+x]=Math.round((p+(q-p)*w)*255)}const t=new THREE.Data3DTexture(d,N,N,N);t.format=THREE.RedFormat;t.wrapS=t.wrapT=t.wrapR=THREE.RepeatWrapping;t.minFilter=t.magFilter=THREE.LinearFilter;t.unpackAlignment=1;t.needsUpdate=true;return t}function hullGeometry(seed,ts,AZ=8,jit=1){const R=prng(seed);const pos=[],nrm=[],uv=[],aC=[],aK=[],idx=[];const push=(cx,cy,cz,nx,ny,nz)=>{pos.push(0,0,0);nrm.push(nx,ny,nz);uv.push(.5,.5);aC.push(cx,cy,cz);aK.push(0,1)};push(0,0,0,0,-1,0);for(let r=0;r<ts.length;r++)for(let k=0;k<AZ;k++){const az=(k+r%2*.5+(R()-.5)*.3*jit)/AZ*Math.PI*2,f=1+(R()*.22-.14)*jit;const x=Math.sin(az),z=-Math.cos(az);push(x*f,ts[r],z*f,x,(ts[r]-.45)*.8,z)}push(0,1,0,0,1,0);const V=(r,k)=>1+r*AZ+(k%AZ+AZ)%AZ,top=1+ts.length*AZ;for(let k=0;k<AZ;k++)idx.push(0,V(0,k),V(0,k+1));for(let r=0;r<ts.length-1;r++)for(let k=0;k<AZ;k++){const a=V(r,k),b=V(r,k+1),c=V(r+1,k+(r%2?1:0)),d=V(r+1,k+(r%2?0:-1));idx.push(a,c,b,a,d,c)}for(let k=0;k<AZ;k++)idx.push(V(ts.length-1,k),top,V(ts.length-1,k+1));return mkGeo({position:pos,normal:nrm,uv,aC,aK},idx)}function mkGeo(attrs,idx){const g=new THREE.BufferGeometry;for(const[k,v]of Object.entries(attrs))g.setAttribute(k,new THREE.Float32BufferAttribute(v,k==="uv"||k==="aK"?2:k==="aR"?1:3));g.setIndex(idx);return g}const FAMILIES={pine:{sprite:"ponderosa",cover:.45,cls:0,tiers:9,per:7,arm:2,drop:.012,rf:1,size:[.9,1.2],elev:[15,55],inner:.5,flat:1,clump:[.42,1.3,2.8],keep:70,mass:[14,.42],cloud:[1.3,.05,1.6,2],cshade:1.66,ctop:1.4},sugar:{sprite:"sugar_pine",cover:.42,cls:0,tiers:8,per:5,arm:3,drop:0,rf:1,size:[.85,1.15],elev:[-5,30],inner:.4,flat:1,clump:[.42,1.3,2.8],keep:70,mass:[13,.44],cloud:[1.3,.05,1.6,2],cshade:1.66,ctop:1.8},fir:{sprite:"douglas_fir",cover:.55,cls:0,tiers:12,per:6,arm:2,drop:.018,rf:.98,size:[.9,1.15],elev:[-30,5],inner:.8,flat:1,clump:[.42,1.2,2.6],keep:60,mass:[15,.42],cloud:[1.3,.05,1.6,2],cshade:1.68,ctop:1.3},cedar:{sprite:"incense_cedar",cover:.55,cls:0,tiers:12,per:6,arm:2,drop:0,rf:.98,size:[.85,1.1],elev:[40,75],inner:.8,flat:0,clump:[.4,1.1,2.4],keep:55,mass:[15,.42],cloud:[1.3,.05,1.6,2],cshade:1.68,ctop:1.8},blackoak:{sprite:"black_oak",cover:.55,cls:1,branches:16,per:12,spread:.14,rf:[.6,1],size:[.9,1.3],elev:[0,60],cap:16,flat:1,inner:12,clump:[.45,1.1,1.8],keep:50,dense:2,mass:[9,.44],cloud:[.85,.12,1.4,1.65],cshade:1.73,ctop:1.1},liveoak:{sprite:"live_oak",cover:.7,cls:1,n:330,rf:[.5,.97],size:[.85,1.15],elev:[10,70],cap:24,flat:1,inner:24,clump:[.38,.9,1.6],keep:35,dense:2,mass:[12,.44],cloud:[.9,.12,1.4,1.65],cshade:2.6,ctop:1.15},blueoak:{sprite:"blue_oak",cover:.45,cls:1,branches:11,per:10,spread:.1,rf:[.5,1],size:[.8,1.05],elev:[5,60],cap:10,flat:1,inner:6,clump:[.42,.9,1.6],keep:40,dense:2,mass:[8,.44],cloud:[.85,.12,1.4,1.65],cshade:1.6,ctop:1.8},shrubtree:{sprite:"manzanita",cover:.55,cls:1,n:50,rf:[.5,.95],size:[.85,1.1],elev:[20,75],cap:6,flat:1,inner:5,clump:[.45,.8,1.8],keep:20,mass:[10,.44],cloud:[.9,.12,1.4,1.65],cshade:2.1,ctop:1.3},brush:{sprite:"brush",cover:.55,cls:1,n:24,rf:[.55,.95],size:[.85,1.15],elev:[30,80],cap:6,flat:1,mass:[10,.44]},manzanita:{sprite:"manzanita",cover:.55,cls:1,n:24,rf:[.55,.95],size:[.85,1.15],elev:[30,80],cap:6,flat:1,mass:[10,.44]},limboak:{sprite:"black_oak",own:1,cls:1,bough:[3,2],leaf:.29,lead:8,sec:8,size:[.85,1.2],elev:[-15,35],clump:[.72,2,3.8],dens:5.6,ctop:1.1},limbblue:{sprite:"blue_oak",own:1,cls:1,bough:[3,2],leaf:.3,lead:8,sec:8,size:[.85,1.2],elev:[-15,35],clump:[.72,2,3.6],dens:5.6,ctop:1.1},limblive:{sprite:"live_oak",own:1,cls:1,bough:[4,2],leaf:.27,lead:8,sec:8,size:[.85,1.2],elev:[-10,40],clump:[.7,2,3.6],dens:7,ctop:1.1},limbpine:{sprite:"ponderosa",own:1,cls:0,bough:[4,2],leaf:.36,lead:5,sec:5,size:[.85,1.2],elev:[5,45],noSkirt:1,clump:[.62,1.8,3.2],dens:10,ctop:1.2,pine:1},snag:{cls:1,branches:4,per:2,spread:.1,rf:[.5,1],size:[.8,1.1],elev:[10,60],cap:1,flat:0}};const FAMILY_OF={ponderosa:"pine",sugar_pine:"sugar",conifer_other:"sugar",douglas_fir:"fir",incense_cedar:"cedar",black_oak:"blackoak",other_hardwood:"blackoak",madrone:"liveoak",live_oak:"liveoak",blue_oak:"blueoak",tall_shrub:"shrubtree"};const LIMB_FAMILIES=["limboak","limblive","limbblue","limbpine"],LIMB_OF={blackoak:1,liveoak:2,blueoak:3,pine:4,sugar:4};const TREE_FAMILIES=["pine","sugar","fir","cedar","blackoak","liveoak","blueoak","shrubtree"];const FORM=[[.85,0,.3],[.6,.5,.3]];const TOP_ALB={cards:[.28,.34],cloud:[.37,.45]};function crownLayout(f,R){const C=[],rnd=(a,b)=>a+(b-a)*R(),cl=(v,a,b)=>Math.min(Math.max(v,a),b),deg=Math.PI/180,el=()=>rnd(f.elev[0],f.elev[1])*deg;if(f.tiers){for(let k=0;k<f.tiers;k++){const t=.02+k/(f.tiers-1)*.92+rnd(-.015,.015),off=R()*6.283,n=Math.max(3,Math.round(f.per*(k>f.tiers-3?.6:1)));for(let i=0;i<n;i++){const az=off+(i+rnd(-.3,.3))/n*6.283,len=rnd(.85,1.05);for(let j=0;j<f.arm;j++)C.push([t+rnd(-.02,.02)-j*f.drop,f.rf*len*(1-j*.28),az+rnd(-.15,.15),rnd(f.size[0],f.size[1])*(1-.1*j),el()])}for(let i=0;i<2;i++)if(R()<f.inner)C.push([t,rnd(.2,.45),R()*6.283,rnd(f.size[0],f.size[1])*.8,el()])}C.push([.97,0,0,.6,80*deg])}else{if(f.branches){for(let b=0;b<f.branches;b++){const az=(b+rnd(-.35,.35))/f.branches*6.283,t0=rnd(.2,.85),r0=rnd(f.rf[0],f.rf[1]);for(let i=0;i<f.per;i++)C.push([cl(t0+rnd(-f.spread,f.spread),.05,.97),cl(r0+rnd(-.18,.12),.25,1),az+rnd(-.35,.35),rnd(f.size[0],f.size[1]),el()])}}else{for(let i=0;i<f.n;i++)C.push([.06+Math.pow(R(),.85)*.88,rnd(f.rf[0],f.rf[1]),R()*6.283,rnd(f.size[0],f.size[1]),el()])}for(let i=0;i<f.cap;i++)C.push([rnd(.82,.98),Math.sqrt(R())*.7,R()*6.283,rnd(f.size[0],f.size[1]),rnd(50,85)*deg]);for(let i=0;i<(f.inner||0);i++)C.push([rnd(.3,.75),rnd(.25,.5),R()*6.283,rnd(f.size[0],f.size[1])*.85,el()])}return C}function cardsGeometry(f,seed){const R=prng(seed),clumps=crownLayout(f,R);const pos=[],nrm=[],uv=[],aC=[],aK=[],idx=[];const A=new THREE.Vector3,T=new THREE.Vector3,B=new THREE.Vector3,N=new THREE.Vector3,H=new THREE.Vector3,Rd=new THREE.Vector3,Y=new THREE.Vector3(0,1,0),v=new THREE.Vector3,X=new THREE.Vector3;for(const[t,rf,az,sz,e]of clumps){const cx=Math.sin(az)*rf,cz=-Math.cos(az)*rf,shade=.62+R()*.5,phi=R()*Math.PI;Rd.set(Math.sin(az+(R()-.5)*.6),0,-Math.cos(az+(R()-.5)*.6));for(let qd=0;qd<2+f.flat;qd++){if(qd<2){A.copy(Rd).multiplyScalar(Math.cos(e)).addScaledVector(Y,Math.sin(e)).normalize();T.set(Rd.z,0,-Rd.x);B.crossVectors(A,T);N.copy(T).multiplyScalar(Math.cos(phi+qd*Math.PI/2)).addScaledVector(B,Math.sin(phi+qd*Math.PI/2)).normalize()}else{const e2=e*.35+(R()-.5)*.3;A.copy(Rd).multiplyScalar(Math.cos(e2)).addScaledVector(Y,Math.sin(e2)).normalize();N.copy(Y).addScaledVector(A,-A.y).normalize()}H.crossVectors(A,N).multiplyScalar(R()<.5?-1:1);const base=pos.length/3;for(const[u0,v0]of[[0,0],[1,0],[1,1],[0,1]]){v.copy(H).multiplyScalar(u0-.5).addScaledVector(A,v0-.5);pos.push(v.x,v.y,v.z);nrm.push(N.x,N.y,N.z);uv.push(u0,v0);aC.push(cx,t,cz);aK.push(sz,shade)}if(X.crossVectors(H,A).dot(N)>0)idx.push(base,base+1,base+2,base,base+2,base+3);else idx.push(base,base+2,base+1,base,base+3,base+2)}}return mkGeo({position:pos,normal:nrm,uv,aC,aK},idx)}function cloudLayout(f,R){const C=[],rnd=(a,b)=>a+(b-a)*R();if(f.tiers){const n=13;for(let k=0;k<n;k++)C.push([.05+.86*(k+rnd(.2,.8))/n,rnd(.5,.76),k*2.39996+rnd(-.3,.3),rnd(.88,1.1)]);C.push([.95,0,0,.72])}else{const n=12;for(let k=0;k<n;k++)C.push([.1+.82*Math.sqrt((k+rnd(.2,.8))/n),rnd(.42,.62),k*2.39996+rnd(-.3,.3),rnd(.88,1.1)]);C.push([.5,0,0,1])}return C}function cloudGeometry(clumps,seed){const R=prng(seed),pos=[],nrm=[],uv=[],aC=[],aK=[],aR=[],idx=[];clumps.forEach(([t,rf,az,sz],k)=>{const cx=Math.sin(az)*rf,cz=-Math.cos(az)*rf,shade=.62+R()*.5,rank=k===clumps.length-1?0:(k*.6180339887+.38)%1;const b=pos.length/3;for(const[u,v]of[[0,0],[1,0],[1,1],[0,1]]){pos.push(u-.5,v-.5,0);nrm.push(0,0,1);uv.push(u,v);aC.push(cx,t,cz);aK.push(sz,shade);aR.push(rank)}idx.push(b,b+1,b+2,b,b+2,b+3)});return mkGeo({position:pos,normal:nrm,uv,aC,aK,aR},idx)}const SHRUB_CLOUD=[[.42,.55,0,1],[.38,.55,1.7,.95],[.46,.55,3.3,1],[.36,.5,4.8,.9],[.72,.1,0,.85]];const LIMB=QS.get("crowns")==="limb";const LIMB_MIN_H=5;const LIMB_PINE=LIMB&&QS.get("pines")!=="0",PINE_GAIN=Math.min(Math.max(+(QS.get("pinegain")||1.7),.5),3);const LIMB_DENS=Math.min(Math.max(+(QS.get("crowndens")||1),.3),2);const LIMB_FLOOR=Math.min(Math.max(+(QS.get("crownfloor")??1),0),2);const FILL_DBG=QS.get("filldbg")==="1",uFillDbg={value:0};const FOL_A2C=!/^(0|near)$/.test(QS.get("a2c")||""),NEAR_A2C=QS.get("a2c")==="near";const uA2C={value:0},FADE_A2C=FOL_A2C&&QS.get("fadea2c")!=="0";const WIND_K=QS.get("windfar")==="0"?[-2,-1,-2,-1]:[8,14,8,14],uWindPx={value:1158},uWindK={value:new THREE.Vector4(...WIND_K)};const LIMB_DBG=QS.get("limbdbg")==="1";const BOUGH_PX=[256,512,1024].includes(+QS.get("boughpx"))?+QS.get("boughpx"):512;const OAKFORM=!!QS.get("oakform")&&!LIMB;function trunkGeometry({stems=1,radial=8,rings=7,limbs=0,stubs=0,limbRad=5,limbRings=3,secs=0,secRad=4,secRings=4,leaders=0}={}){const pos=[],nrm=[],uv=[],ak=[],idx=[];const tube=(kind,k,rad,nr)=>{const base=pos.length/3;for(let r=0;r<nr;r++)for(let q=0;q<=rad;q++){const a=q/rad*Math.PI*2,x=Math.cos(a),z=Math.sin(a);pos.push(x,r/(nr-1),z);nrm.push(x,0,z);uv.push(q/rad,r/(nr-1));ak.push(k,kind)}for(let r=0;r<nr-1;r++)for(let q=0;q<rad;q++){const a=base+r*(rad+1)+q,b=a+rad+1;idx.push(a,b,a+1,b,b+1,a+1)}};for(let k=0;k<stems;k++)tube(0,k,radial,rings);for(let k=0;k<stems*limbs;k++)tube(1,k,limbRad,limbRings);for(let k=0;k<stubs;k++)tube(2,k,3,2);for(let k=0;k<leaders;k++)tube(1,k,limbRad,limbRings);for(let k=0;k<secs;k++)tube(2,k,secRad,secRings);return mkGeo({position:pos,normal:nrm,uv,aC:new Array(pos.length).fill(0),aK:ak},idx)}const LIMB_RINGS={lead:7,sec:4,pine:3};const limbWoodGeometry=()=>trunkGeometry({stems:1,limbs:6,limbRad:6,limbRings:LIMB_RINGS.lead,secs:18,secRad:4,secRings:LIMB_RINGS.sec});const pineWoodGeometry=()=>trunkGeometry({stems:0,leaders:CANOPY?12:6,limbRad:4,limbRings:LIMB_RINGS.pine,secs:CANOPY?36:18,secRad:4,secRings:LIMB_RINGS.pine});function limbCardsGeometry(f,seed){const R=prng(seed),rnd=(a,b)=>a+(b-a)*R(),deg=Math.PI/180;const pos=[],nrm=[],uv=[],aC=[],aK=[],idx=[];const A=new THREE.Vector3,T=new THREE.Vector3,B=new THREE.Vector3,N=new THREE.Vector3,H=new THREE.Vector3,Rd=new THREE.Vector3,Y=new THREE.Vector3(0,1,0),v=new THREE.Vector3,X=new THREE.Vector3,O=new THREE.Vector3;for(let m=0;m<(CANOPY&&f.pine?12:6);m++)for(let j=-1;j<3;j++){const OAKC=CANOPY&&!f.pine,PB=PHOTO_BOUGH(f);const n=(j<0?f.lead:f.sec)*(OAKC?2:1);for(let i=0;i<n;i++){const u=(i+rnd(.15,.85))/n,s=i===n-1?.97:OAKC?(j<0?.3:.12)+(j<0?.65:.82)*Math.pow(u,.9):(j<0?.45:.22)+(j<0?.5:.72)*Math.pow(u,.8);const e=(j===0&&!f.noSkirt?rnd(-45,15):rnd(f.elev[0],f.elev[1]))*deg,yaw=rnd(-1,1),phi=R()*Math.PI;const sz=rnd(f.size[0],f.size[1]),shade=.62+R()*.5;Rd.set(Math.cos(yaw),0,Math.sin(yaw));O.set(rnd(-.06,.06),rnd(-.08,.06),rnd(-.1,.1));for(let qd=0;qd<2+(i%3===0?1:0);qd++){if(qd<2){A.copy(Rd).multiplyScalar(Math.cos(e)).addScaledVector(Y,Math.sin(e)).normalize();T.set(Rd.z,0,-Rd.x);B.crossVectors(A,T);N.copy(T).multiplyScalar(Math.cos(phi+qd*Math.PI/2)).addScaledVector(B,Math.sin(phi+qd*Math.PI/2)).normalize()}else{const e2=e*.35+(R()-.5)*.3;A.copy(Rd).multiplyScalar(Math.cos(e2)).addScaledVector(Y,Math.sin(e2)).normalize();N.copy(Y).addScaledVector(A,-A.y).normalize()}H.crossVectors(A,N).multiplyScalar(R()<.5?-1:1);const base=pos.length/3,qa=i*7+m*3+(j+1)*5+qd&3;for(const[u0,v0]of[[.06,.09],[.94,.09],[.94,.94],[.06,.94]]){v.copy(O).addScaledVector(H,u0-.5).addScaledVector(A,v0-.09);pos.push(v.x,v.y,v.z);nrm.push(N.x,N.y,N.z);uv.push(...PB?[.5*(qa%2)+.5*u0,.5*(qa>>1)+.5*v0]:[u0,v0]);aC.push(m,j,s);aK.push(sz,shade)}if(X.crossVectors(H,A).dot(N)>0)idx.push(base,base+1,base+2,base,base+2,base+3);else idx.push(base,base+2,base+1,base,base+3,base+2)}}}return mkGeo({position:pos,normal:nrm,uv,aC,aK},idx)}const BARK_TILE=[[.9,1.8],[.6,1.2],[.8,.8],[.5,.5],[.45,1.5],[.8,1.6],[.8,1.6],...MANZ?[[.5,1]]:[]];const DBH_CURVE={ponderosa:[.107,.021],sugar_pine:[.107,.021],conifer_other:[.107,.021],douglas_fir:[.107,.021],incense_cedar:[.107,.021],black_oak:[.152,.03],other_hardwood:[.152,.03],blue_oak:[.152,.03],live_oak:[.198,.036],madrone:[.198,.036],tall_shrub:[.076,.015],snag:[.107,.021]};const SURVEYED=id=>id>=9e5&&id<95e4;const TRUNK_OF={ponderosa:[0,.55,1,1],sugar_pine:[0,.55,1,1],conifer_other:[5,.5,1,1],douglas_fir:[5,.5,1,1],incense_cedar:[4,.75,1,1],black_oak:[1,.45,0,2],other_hardwood:[1,.4,0,2],live_oak:[2,.4,0,4],madrone:[2,.35,0,3],blue_oak:[3,.35,0,1],tall_shrub:[MANZ?7:2,.2,0,4],snag:[6,.4,1,1]};const BARK_BAKE=`
varying vec2 vUv;
uniform float uLayer;
float hh(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float vn(vec2 x, vec2 per) {
  vec2 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hh(mod(i, per)), hh(mod(i + vec2(1.0, 0.0), per)), f.x), mix(hh(mod(i + vec2(0.0, 1.0), per)), hh(mod(i + vec2(1.0), per)), f.x), f.y);
}
float fbm(vec2 x, vec2 per) { float s = 0.0, w = 0.5; for (int o = 0; o < 5; o++) { s += w * vn(x, per); x *= 2.0; per *= 2.0; w *= 0.5; } return s / 0.96875; }
vec3 vor(vec2 x, vec2 per) {
  vec2 i = floor(x), f = fract(x); float f1 = 8.0, f2 = 8.0, id = 0.0;
  for (int y = -1; y <= 1; y++) for (int k = -1; k <= 1; k++) {
    vec2 g = vec2(float(k), float(y)), c = mod(i + g, per);
    float d = length(g + vec2(hh(c), hh(c + 17.3)) - f);
    if (d < f1) { f2 = f1; f1 = d; id = hh(c + 41.7); } else if (d < f2) f2 = d;
  }
  return vec3(f1, f2, id);
}
vec3 lin(vec3 c) { return pow(c, vec3(2.2)); }
void main() {
  vec2 uv = vUv; int L = int(uLayer + 0.5); vec3 col; float ht;
  if (L == 0) {
                         
    vec2 w = vec2(fbm(uv * 6.0, vec2(6.0)), fbm(uv * 6.0 + 2.0, vec2(6.0))) - 0.5;
    vec3 v = vor(uv * vec2(5.0, 3.0) + w * 0.9, vec2(5.0, 3.0));
    float e = v.y - v.x + 0.12 * (fbm(uv * vec2(20.0, 10.0), vec2(20.0, 10.0)) - 0.5);   // distance to the plate's edge
    float fur = 1.0 - smoothstep(0.06, 0.2, e), dome = smoothstep(0.0, 0.5, e);
    vec3 fl = vor(uv * vec2(22.0, 16.0) + w * 2.0, vec2(22.0, 16.0));
    float flk = smoothstep(0.0, 0.07, fl.y - fl.x), sc = fbm(uv * vec2(40.0, 20.0), vec2(40.0, 20.0));
    ht = (1.0 - fur) * (0.3 + 0.45 * dome + 0.15 * flk + 0.1 * sc);
    vec3 plate = mix(lin(vec3(0.62, 0.48, 0.37)), lin(vec3(0.57, 0.52, 0.46)), v.z) * mix(0.72, 1.0, flk) * (0.82 + 0.3 * sc) * mix(0.92, 1.06, fl.z);
    col = mix(plate, mix(lin(vec3(0.15, 0.1, 0.075)), lin(vec3(0.34, 0.21, 0.15)), smoothstep(0.85, 0.4, fur)), fur);
  } else if (L == 1) {
                         
    float wv = fbm(uv * vec2(3.0, 2.0), vec2(3.0, 2.0)) - 0.5, x = uv.x * 7.0 + 2.4 * wv + 0.5 * (fbm(uv * vec2(2.0, 6.0), vec2(2.0, 6.0)) - 0.5);
    float c0 = mod(floor(x), 7.0), fx = fract(x), w1 = 0.12 + 0.3 * hh(vec2(c0, 1.7)), w2 = 0.12 + 0.3 * hh(vec2(c0, 5.3));
    float ridge = smoothstep(0.0, w1, fx) * smoothstep(1.0, 1.0 - w2, fx);
    float yb = uv.y * 5.0 + hh(vec2(c0, 3.1)) * 7.0 + 0.45 * (fbm(uv * vec2(8.0, 3.0), vec2(8.0, 3.0)) - 0.5);
    float brk = smoothstep(0.0, 0.1, fract(yb)) * smoothstep(1.0, 0.9, fract(yb)), blk = hh(vec2(c0, mod(floor(yb), 5.0)));
    float d = fbm(uv * vec2(28.0, 18.0), vec2(28.0, 18.0)), pl = ridge * mix(0.15, 1.0, brk);
    ht = pl * (0.5 + 0.3 * d + 0.2 * blk);
    col = mix(lin(vec3(0.09, 0.085, 0.08)), lin(vec3(0.37, 0.35, 0.32)) * (0.72 + 0.38 * d) * (0.78 + 0.4 * blk), smoothstep(0.1, 0.6, pl));
  } else if (L == 2) {
    float n = fbm(uv * 6.0, vec2(6.0));
    vec3 v = vor(uv * vec2(14.0, 10.0) + 0.3 * (vec2(fbm(uv * 4.0, vec2(4.0)), fbm(uv * 4.0 + 5.0, vec2(4.0))) - 0.5), vec2(14.0, 10.0));
    float ck = 1.0 - smoothstep(0.02, 0.07, v.y - v.x), x = uv.x * 7.0 + 1.2 * fbm(uv * vec2(2.0, 3.0), vec2(2.0, 3.0));
    float fis = smoothstep(0.86, 0.97, 1.0 - abs(2.0 * fract(x) - 1.0)) * smoothstep(0.4, 0.6, vn(vec2(x, uv.y * 5.0), vec2(7.0, 5.0)));
    float li = smoothstep(0.64, 0.74, fbm(uv * 5.0 + 3.0, vec2(5.0)));
    ht = 0.7 + 0.2 * n - 0.35 * ck - 0.4 * fis;
    col = lin(vec3(0.44, 0.42, 0.39)) * (0.8 + 0.3 * n) * (0.92 + 0.16 * v.z) * (1.0 - 0.35 * ck) * (1.0 - 0.5 * fis);
    col = mix(col, lin(vec3(0.6, 0.62, 0.55)), li * 0.4);
  } else if (L == 3) {
    vec3 v = vor(uv * vec2(7.0, 5.0), vec2(7.0, 5.0)); float cr = 1.0 - smoothstep(0.02, 0.08, v.y - v.x), n = fbm(uv * 16.0, vec2(16.0));
    ht = (1.0 - cr) * (0.6 + 0.4 * n);
    col = mix(mix(lin(vec3(0.64, 0.63, 0.59)), lin(vec3(0.5, 0.49, 0.46)), v.z) * (0.85 + 0.3 * n), lin(vec3(0.26, 0.25, 0.24)), cr);
  } else if (L == 4) {
    float n = fbm(uv * vec2(12.0, 1.0) + vec2(0.4 * fbm(uv * vec2(3.0, 5.0), vec2(3.0, 5.0)), 0.0), vec2(12.0, 1.0));
    float fib = fbm(uv * vec2(48.0, 3.0), vec2(48.0, 3.0)), rid = smoothstep(0.35, 0.62, n);
    ht = rid * 0.7 + 0.3 * fib;
    col = mix(lin(vec3(0.27, 0.15, 0.1)), lin(vec3(0.62, 0.39, 0.27)), rid * (0.55 + 0.45 * fib));
  } else if (L == 5) {
    float n = fbm(uv * vec2(6.0, 1.5) + vec2(0.4 * fbm(uv * 3.0, vec2(3.0)), 0.0), vec2(6.0, 1.5));
    float rid = smoothstep(0.44, 0.6, n) * smoothstep(0.08, 0.3, vn(uv * vec2(6.0, 7.0), vec2(6.0, 7.0))), d = fbm(uv * 24.0, vec2(24.0));
    ht = rid * (0.75 + 0.25 * d);
    col = mix(lin(vec3(0.2, 0.11, 0.08)), lin(vec3(0.42, 0.34, 0.29)), rid) * (0.8 + 0.4 * d);
  } else if (L == 6) {
    float n = fbm(uv * vec2(20.0, 1.0), vec2(20.0, 1.0)), cr = smoothstep(0.68, 0.74, n), bp = smoothstep(0.6, 0.68, fbm(uv * 3.0, vec2(3.0)));
    col = mix(lin(vec3(0.5, 0.48, 0.45)) * (0.85 + 0.25 * fbm(uv * vec2(40.0, 4.0), vec2(40.0, 4.0))), lin(vec3(0.27, 0.22, 0.18)), bp * 0.8);
    col *= 1.0 - 0.4 * cr; ht = 0.5 + 0.3 * n - 0.4 * cr + 0.2 * bp;
  } else {
                         
    float n = fbm(uv * vec2(3.0, 1.0), vec2(3.0, 1.0)), sk = fbm(uv * vec2(36.0, 2.0), vec2(36.0, 2.0));
    float pv = fbm(uv * vec2(5.0, 3.0) + 0.5 * vec2(fbm(uv * 4.0, vec2(4.0)), 0.0), vec2(5.0, 3.0));
    float pe = smoothstep(0.73, 0.76, pv), rim = smoothstep(0.7, 0.73, pv) - pe;
    col = mix(lin(vec3(0.15, 0.08, 0.065)), lin(vec3(0.29, 0.145, 0.11)), n) * (0.88 + 0.24 * sk);
    col = mix(col, lin(vec3(0.42, 0.36, 0.31)) * (0.85 + 0.3 * sk), pe * 0.6) * (1.0 - 0.4 * rim);
    ht = 0.62 + 0.12 * n + 0.06 * sk + 0.18 * pe - 0.2 * rim;
  }
  gl_FragColor = vec4(col, clamp(ht, 0.0, 1.0));
}`;const BARK_BLIT=`
varying vec2 vUv;
uniform sampler2D tC, tH;
uniform float hasH, uSat, uVal;
void main() { vec3 c = texture2D(tC, vUv).rgb; c = mix(vec3(dot(c, vec3(0.2126, 0.7152, 0.0722))), c, uSat) * uVal; float h = hasH > 0.5 ? texture2D(tH, vUv).r : dot(c, vec3(0.3, 0.59, 0.11)) * 1.6; gl_FragColor = vec4(c, clamp(h, 0.0, 1.0)); }`;function bakeBark(renderer,S=512,over=null){const rt=new THREE.WebGLArrayRenderTarget(S,S,BARK_TILE.length,{colorSpace:THREE.SRGBColorSpace,generateMipmaps:true,minFilter:THREE.LinearMipmapLinearFilter,magFilter:THREE.LinearFilter,wrapS:THREE.RepeatWrapping,wrapT:THREE.RepeatWrapping,anisotropy:4,depthBuffer:false});const mat=new THREE.ShaderMaterial({uniforms:{uLayer:{value:0}},fragmentShader:BARK_BAKE,vertexShader:"varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",depthTest:false,depthWrite:false});const scene=new THREE.Scene,cam=new THREE.Camera,quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),mat);quad.frustumCulled=false;scene.add(quad);const prev=renderer.getRenderTarget();for(let l=0;l<BARK_TILE.length;l++){mat.uniforms.uLayer.value=l;renderer.setRenderTarget(rt,l);renderer.render(scene,cam)}if(over){const bm=new THREE.ShaderMaterial({uniforms:{tC:{value:null},tH:{value:null},hasH:{value:0},uSat:{value:+(QS.get("barksat")||.6)},uVal:{value:+(QS.get("barkval")||.85)}},fragmentShader:BARK_BLIT,vertexShader:"varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",depthTest:false,depthWrite:false});quad.material=bm;for(const[l,im]of Object.entries(over)){if(!im?.c)continue;bm.uniforms.tC.value=im.c;bm.uniforms.tH.value=im.h;bm.uniforms.hasH.value=im.h?1:0;renderer.setRenderTarget(rt,+l);renderer.render(scene,cam)}bm.dispose()}renderer.setRenderTarget(prev);mat.dispose();quad.geometry.dispose();return rt.texture}const GLSL_COMMON=`
attribute float aIdx;
attribute vec3 aC;
attribute vec2 aK;
uniform highp sampler2D uTT;
#ifdef FADE_TEX
uniform highp sampler2D uFade;
#endif
uniform float uExag, uTime, uWind, uSpc, uShade, uWindPx;
uniform vec4 uWindK;
#ifdef FADE_EDGE
uniform float uA2C;
uniform vec3 uEdge;   // a distance fade: out over the last uEdge.y metres before uEdge.x on the ground; z 1 = something else fades in there (the far forest's cards), 0 = nothing does (shrubs)
#endif


uniform float uCamFade, uCamFadeStem;
varying float vCamR;
float camR = -1.0;







uniform float uTop;
uniform vec3 uSunDir;
uniform float uFall, uLeafOff, uSpring;
uniform vec4 uPheno[16];
uniform vec3 uPhenoSpr[16];
varying vec3 vTCol;
varying float vFade;
varying float vFadeOut;
varying float vLeaf;
varying float vAO;
varying float vThk;
varying float vSelf;   // the sun's visibility through the plant's own foliage (selfSun; used beyond the shadow map)
#ifdef POROUS
varying vec3 vNP;
#endif
#ifdef CARDS
varying float vEdge;
#endif
#ifdef CLOUD
varying vec2 vQ;       // billboard-local position in view space (unit disc): the clump's sphere-normal term
#endif




float selfSun(vec3 p, vec3 c, vec3 r) {
  vec3 o = (p + uSunDir * SHADOW_PUSH - c) / r, d = uSunDir / r;
  float a = dot(d, d), b = dot(o, d), k = dot(o, o) - 1.0, disc = b * b - a * k;
  if (disc <= 0.0) return 1.0;
  float sq = sqrt(disc);
  return mix(1.0, 0.25, smoothstep(0.0, 1.5, (sq - b) / a - max(-(sq + b) / a, 0.0)));
}
vec3 shOff = vec3(0.0);   // extra offset of the shadow lookup (the cloud: a clump's outer side, see GLSL_CLOUD)





vec3 limbTint(vec3 c, float d) {
  vec3 t = c * vec3(1.0, 1.0, 0.84); float l = dot(t, vec3(0.2126, 0.7152, 0.0722));
  t = max(l + (t - l) * 1.12, vec3(0.0)) * (dot(c, vec3(0.2126, 0.7152, 0.0722)) / max(l, 1e-4));
  return mix(c, t, min(d, 1.0) * LIMB_TINT);
}
float clumpHash(vec3 c, float k) { return fract(sin(dot(c.xz * 13.1 + c.y * 7.7, vec2(12.9898, 78.233)) + k * 31.7) * 43758.5453); }





vec3 seasonCol(vec3 col, float d, vec3 fall, vec3 spr, float seed, float ch, out float la) {
  float tr = fract(seed * 7.31);
  
  
  la = d > 1.5 ? 0.0 : 1.0 - d * clamp((uLeafOff - 0.2) * 1.25 * (0.7 + 0.6 * tr), 0.0, 1.0);
  d = min(d, 1.0);
  float lvl = tr < 0.3 ? 0.5 * tr : tr < 0.75 ? 0.3 + 0.9 * (tr - 0.3) : 0.8 + 0.6 * (tr - 0.75);
  float fa = smoothstep(ch - 0.12, ch + 0.12, uFall * FALL_GAIN * lvl) * d;
  vec3 fc = fall * (0.82 + 0.36 * fract(seed * 5.1));
  fc = mix(fc, fc * vec3(0.8, 0.6, 0.48), max(smoothstep(0.45, 1.0, fract(seed * 3.3)) * 0.8, uLeafOff * 0.85));
  col = mix(col, fc, fa);
  col *= mix(1.0, 0.92, uFall * (1.0 - d));
  col = mix(col, spr * (0.9 + 0.2 * tr), uSpring * d * 0.7);
  col *= mix(1.0, 1.08, uSpring * (1.0 - d));
  return col;
}

vec3 shrubSeason(vec3 col, float ty, float seed, float ch, out float la) {
  float d = ty < 0.5 ? step(0.7, fract(seed * 9.7)) : 0.0;
  vec3 fall = fract(seed * 4.3) < 0.15 ? vec3(0.17, 0.09, 0.05) : vec3(0.24, 0.19, 0.1);
  return seasonCol(col, d, fall, vec3(0.11, 0.21, 0.045), seed, ch, la);
}
vec4 tf(int k) { int i = int(aIdx + 0.5); return texelFetch(uTT, ivec2((i % PER_ROW) * TEXELS + k, i / PER_ROW), 0); }
vec2 rot2(vec2 v, float c, float s) { return vec2(c * v.x - s * v.y, s * v.x + c * v.y); }






float windPPM() { vec4 w0 = tf(0); return uWindPx / max(distance(cameraPosition, vec3(w0.x, w0.y * uExag, w0.z)), 1.0); }
float windSway() { return uWind * smoothstep(uWindK.x, uWindK.y, windPPM()); }
float windLeaf() { return uWind * smoothstep(uWindK.z, uWindK.w, windPPM()); }
vec2 sway(float h, float y, float seed, vec2 xz) {
#ifdef NO_SWAY
  return vec2(0.0);
#endif
  float yf = clamp(y / max(h, 0.5), 0.0, 1.0);
  return windSway() * yf * yf * (0.012 + 0.0035 * h) * vec2(sin(uTime * 0.55 + seed * 37.0 + xz.x * 0.05) + 0.3 * sin(uTime * 1.3 + seed * 11.0), cos(uTime * 0.45 + seed * 23.0 + xz.y * 0.05));
}

vec3 billboard(vec2 corner, float roll, out vec2 q) {
  q = rot2(corner, cos(roll), sin(roll));
  return vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]) * q.x + vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]) * q.y;
}
`;const GLSL_ENV=`
uniform vec4 uForm;
float rAz(float az, vec4 a, vec4 b) {
  float s = az * 1.2732395;
  int i0 = int(floor(s)) & 7; int i1 = (i0 + 1) & 7;
  float r[8] = float[8](a.x, a.y, a.z, a.w, b.x, b.y, b.z, b.w);
  return mix(r[i0], r[i1], fract(s));
}
float profAt(float t, vec4 p, vec2 q) {
  float k[8] = float[8](p.x * uForm.x, p.x, p.y, p.z, p.w, q.x, q.y, q.y * uForm.y);
  float s = clamp(t, 0.0, 1.0) * 6.0;
  if (s < 0.5) return mix(k[0], k[1], s * 2.0);
  if (s > 5.5) return mix(k[6], k[7], (s - 5.5) * 2.0);
  float u = s - 0.5; int i = int(floor(u));
  return mix(k[1 + i], k[2 + i], fract(u));
}
float azOf(vec2 c) { float az = dot(abs(c), vec2(1.0)) < 1e-4 ? 0.0 : atan(c.x, -c.y); return az < 0.0 ? az + 6.2831853 : az; }


void crownShade(float r, float y, float envF, float cbh, float clen) {
  float rr = r / max(envF, 0.3), ty = clamp((y - cbh) / clen, 0.0, 1.0);
  vAO = mix(0.3, 1.0, smoothstep(0.25, 1.0, max(rr, 1.2 * ty - 0.2))) * mix(0.7, 1.0, ty);
  vThk = mix(0.35, 1.0, smoothstep(0.5, 1.0, rr));
}
`;const GLSL_CROWN=GLSL_ENV+`
uniform vec4 uCrown;
uniform float uDense;  // per family: the layout's clumps per clump normally used (FAMILIES.dense)
uniform float uCardTop;
uniform sampler2D uOakF;
void treeXform(out vec3 P, out vec3 Nrm) {
  vec4 t0 = tf(0), t1 = tf(1), t2 = tf(2), t3 = tf(3), t4 = tf(4), t5 = tf(5), t6 = tf(6), t7 = tf(7);
  float h = t0.w, cbh = t1.x, ravg = t1.y, seed = t1.w;
  float a = seed * 6.2831853, ca = cos(a), sa = sin(a);
  vec3 c = aC; c.xz = rot2(c.xz, ca, sa);
  vec3 p = position; p.xz = rot2(p.xz, ca, sa);
  vec3 nn = normal; nn.xz = rot2(nn.xz, ca, sa);
  vec3 fcol = t6.rgb; float la = 1.0, ch = clumpHash(aC, aK.y);
#ifdef SEASONS
  { vec4 ph = uPheno[int(t6.w + 0.5)]; fcol = seasonCol(fcol, ph.w, ph.rgb, uPhenoSpr[int(t6.w + 0.5)], seed, ch, la); }
#endif
#ifdef TWIG_COL
  fcol = TWIG_COL;   // snag twig fans: weathered silver-grey wood, not the crown's imagery colour
#endif
  float envF = rAz(azOf(c.xz), t2, t3) * profAt(c.y, t4, t5.xy), env = envF * uForm.w;
  float clen = max(h - cbh, 0.5);
  float cs0 = uCrown.x * ravg, csC = clamp(cs0, uCrown.y, uCrown.z);
#ifdef OAK_OPEN
  
  
  float oakF = step(0.5, texelFetch(uOakF, ivec2(int(aIdx + 0.5) % PER_ROW, int(aIdx + 0.5) / PER_ROW), 0).r);
  csC = mix(csC, min(csC, 1.25), oakF);
#endif
  float cs = aK.x * csC * clamp(envF / max(ravg, 0.1), 0.55, 1.0);
  
  
  
  vec3 dc = cameraPosition - vec3(t0.x, t0.y * uExag + cbh + 0.5 * clen, t0.z);
  float sv = max(dc.y, 0.0) / max(length(dc), 1e-3);
  cs *= mix(1.0, uCardTop, sv);
  
  
  if (uCrown.w > 0.0) cs *= step(fract(aK.y * 13.7), clamp(ravg * clen / uCrown.w, 0.45, 1.0) * clamp(cs0 * cs0 / (csC * csC), 1.0, uDense) / uDense);
#ifdef OAK_OPEN
  
  
  cs *= mix(1.0, step(fract(aK.y * 7.31 + seed * 3.7), OAK_OPEN), oakF);
#endif
  
  
  float envH = max(env - 0.5 * cs * (1.0 - sv), 0.35 * env);
  vec3 lp = vec3(c.x * envH, cbh + c.y * clen, c.z * envH);
  lp += p * cs;
  lp.y = min(lp.y, h + 0.4);
  vec3 dv = vec3(lp.x / max(ravg, 0.4), (lp.y - (cbh + 0.45 * clen)) / max(0.5 * clen, 0.4), lp.z / max(ravg, 0.4));
  Nrm = normalize(mix(normalize(dv + vec3(0.0, 0.2, 0.0)), nn, uForm.z));
  crownShade(length(lp.xz), lp.y, envF, cbh, clen);
  vSelf = selfSun(lp, vec3(0.0, cbh + 0.5 * clen, 0.0), vec3(0.88 * ravg, 0.5 * clen, 0.88 * ravg));
  lp.xz += (lp.y - h) * t5.zw;
  lp.xz += sway(h, lp.y, seed, t0.xz);
#ifdef FLUTTER
  lp += windLeaf() * cs * 0.012 * vec3(sin(uTime * 1.6 + seed * 50.0 + c.y * 11.0 + aK.y * 23.0), 0.4 * sin(uTime * 1.1 + aK.y * 17.0), cos(uTime * 1.4 + seed * 31.0 + c.x * 7.0));
#endif
  P = vec3(t0.x, t0.y * uExag, t0.z) + lp;
#ifdef CARDS
  vEdge = abs(dot(nn, normalize(cameraPosition - P)));
  vLeaf = step(ch, la); fcol = mix(vec3(0.09, 0.07, 0.052), fcol, vLeaf);
#else
  vLeaf = la; fcol = mix(vec3(0.10, 0.088, 0.08), fcol, smoothstep(0.0, 0.6, la));
#endif
  vTCol = mix(fcol, t7.rgb, uSpc) * mix(0.9, 1.06, (aK.y - 0.62) * 2.0) * uShade;
#ifdef CARDS
  vTCol *= mix(1.0, uTop, clamp(2.0 * normalize(cameraPosition - P).y - 1.0, 0.0, 1.0));
#endif
#ifdef POROUS
  vNP = lp * 0.8 + seed * 17.0;
#endif
}
`;const GLSL_HERO=GLSL_ENV+`
void treeXform(out vec3 P, out vec3 Nrm) {
  vec4 t0 = tf(0), t1 = tf(1), t2 = tf(2), t3 = tf(3), t4 = tf(4), t5 = tf(5), t6 = tf(6), t7 = tf(7);
  float h = t0.w, cbh = t1.x, ravg = t1.y, seed = t1.w, clen = max(h - cbh, 0.5);
  vec3 w = (modelMatrix * vec4(position, 1.0)).xyz;
  vec3 lp = w - vec3(t0.x, t0.y * uExag, t0.z);     // in the row's crown frame (its ground at y 0)
  lp.xz -= (lp.y - h) * t5.zw;                      // undo the row's lean: the envelope's axis
  float la = 1.0, ch = aK.x; vec3 fcol = t6.rgb;
#ifdef SEASONS
  { vec4 ph = uPheno[int(t6.w + 0.5)]; fcol = seasonCol(fcol, ph.w, ph.rgb, uPhenoSpr[int(t6.w + 0.5)], seed, ch, la); }
#endif
  float envF = rAz(azOf(lp.xz), t2, t3) * profAt((lp.y - cbh) / clen, t4, t5.xy);
  vec3 dv = vec3(lp.x / max(ravg, 0.4), (lp.y - (cbh + 0.45 * clen)) / max(0.5 * clen, 0.4), lp.z / max(ravg, 0.4));
  Nrm = normalize(mix(normalize(dv + vec3(0.0, 0.2, 0.0)), normal, uForm.z));
  crownShade(length(lp.xz), lp.y, envF, cbh, clen);
  vSelf = selfSun(lp, vec3(0.0, cbh + 0.5 * clen, 0.0), vec3(0.88 * ravg, 0.5 * clen, 0.88 * ravg));
  P = position;
  P.xz += sway(h, lp.y, seed, t0.xz);
#ifdef FLUTTER
  P += windLeaf() * 0.012 * vec3(sin(uTime * 1.6 + seed * 50.0 + ch * 23.0), 0.4 * sin(uTime * 1.1 + ch * 17.0), cos(uTime * 1.4 + seed * 31.0 + ch * 7.0));
#endif
  vec3 vd = normalize(cameraPosition - w);
#ifdef CARDS
  vEdge = abs(dot(normal, vd));
  vLeaf = step(ch, la); fcol = mix(vec3(0.09, 0.07, 0.052), fcol, vLeaf);
#endif
  vTCol = mix(fcol, t7.rgb, uSpc) * mix(0.9, 1.06, (aK.y - 0.62) * 2.0) * uShade;
  vTCol *= mix(1.0, uTop, clamp(2.0 * vd.y - 1.0, 0.0, 1.0));
#ifdef POROUS
  vNP = lp * 0.8 + seed * 17.0;
#endif
}
`;const GLSL_CLOUD=GLSL_ENV+`
attribute float aR;
#ifdef LIMBROWS
uniform sampler2D uOakF;
#endif
uniform vec4 uCloud;
void treeXform(out vec3 P, out vec3 Nrm) {
  vec4 t0 = tf(0), t1 = tf(1), t2 = tf(2), t3 = tf(3), t4 = tf(4), t5 = tf(5), t6 = tf(6), t7 = tf(7);
  float h = t0.w, cbh = t1.x, ravg = t1.y, seed = t1.w;
  float a = seed * 6.2831853;
  vec3 c = aC; c.xz = rot2(c.xz, cos(a), sin(a));
  vec3 fcol = t6.rgb; float la = 1.0, ch = clumpHash(aC, aK.y), limbRow = 0.0;
#ifdef LIMBROWS
  float oakF = texelFetch(uOakF, ivec2(int(aIdx + 0.5) % PER_ROW, int(aIdx + 0.5) / PER_ROW), 0).r, pineRow = step(0.15, oakF) * step(oakF, 0.4);
  limbRow = step(0.15, oakF);
#endif
#ifdef SEASONS
  { vec4 ph = uPheno[int(t6.w + 0.5)]; float la2;
    
    vec3 f2 = limbTint(seasonCol(fcol, ph.w, ph.rgb, uPhenoSpr[int(t6.w + 0.5)], seed, 0.25 + 0.5 * ch, la2), ph.w);
    fcol = mix(seasonCol(fcol, ph.w, ph.rgb, uPhenoSpr[int(t6.w + 0.5)], seed, ch, la), f2, limbRow); }
#endif
  float envF = rAz(azOf(c.xz), t2, t3) * profAt(c.y, t4, t5.xy), clen = max(h - cbh, 0.5);
  vec3 vd = vec3(t0.x, t0.y * uExag + cbh + 0.5 * clen, t0.z) - cameraPosition; float dist = length(vd);
  float keep = mix(1.0, CLOUD_KEEP, smoothstep(CLOUD_D0, CLOUD_D1, dist));
  float cs = aK.x * min(uCloud.x * envF + uCloud.y * clen, uCloud.z * max(ravg, 0.5)) * mix(1.0, uCloud.w, abs(vd.y) / max(dist, 1e-3))
           * inversesqrt(keep) * smoothstep(keep + 0.05, keep - 0.05, aR);
#ifdef LIMBROWS
  cs *= mix(1.0, LIMB_FAR, limbRow * (1.0 - smoothstep(CLOUD_D0, CLOUD_D1, dist)));   // sky between a limb crown's far clumps, eased out as the cloud thins
#endif
  vec3 lp = vec3(c.x * envF, cbh + c.y * clen, c.z * envF);
  lp.y = min(max(lp.y, cbh + 0.3 * cs), max(h - 0.35 * cs, cbh + 0.3 * cs));
  vec3 dv = vec3(lp.x / max(ravg, 0.4), (lp.y - (cbh + 0.45 * clen)) / max(0.5 * clen, 0.4), lp.z / max(ravg, 0.4));
  Nrm = normalize(dv + vec3(0.0, 0.2, 0.0));
  
  
  
  float lf = step(ch, la), sOut = 0.45 * cs * lf;
  crownShade(length(lp.xz) + sOut, lp.y, envF, cbh, clen);
  shOff = normalize(dv) * sOut;
  vec2 q; vec3 bb = billboard(position.xy, fract(aK.y * 7.13 + seed * 3.7) * 6.2831853, q) * cs;
  vSelf = selfSun(lp + bb + shOff, vec3(0.0, cbh + 0.5 * clen, 0.0), vec3(0.88 * ravg, 0.5 * clen, 0.88 * ravg));
  lp.xz += (lp.y - h) * t5.zw;
  lp.xz += sway(h, lp.y, seed, t0.xz);
  lp += bb;
  vQ = 2.0 * q;
  P = vec3(t0.x, t0.y * uExag, t0.z) + lp;
  vLeaf = lf; fcol = mix(vec3(0.09, 0.07, 0.052), fcol, vLeaf);
  vTCol = mix(fcol, t7.rgb, uSpc) * mix(0.9, 1.06, (aK.y - 0.62) * 2.0) * uShade;
  vTCol *= mix(1.0, uTop, max(normalize(cameraPosition - P).y, 0.0));
#ifdef LIMBROWS
  
  
  
  vTCol *= mix(1.0, mix(1.0 + 0.45 * (PINE_GAIN - 1.0), 1.0, smoothstep(0.25, 0.75, max(normalize(cameraPosition - P).y, 0.0))), pineRow);
#endif
}
`;const GLSL_STEMFN=`
uniform vec4 uSpT[16];
uniform vec2 uBarkTile[8];
uniform sampler2D uStemHide;  // viewer_dev: per tree, one byte: 255 = a mod draws this tree's wood (stems, limbs, stubs hidden); 1..254 = paint on its bark (setBarkPaint)
#ifdef BARK
varying vec3 vBark;
varying float vPaint;
#endif
float th(float a, float b) { return fract(sin(a * 12.9898 + b * 78.233) * 43758.5453); }

float ringY(float v, float top) {
  float r = v * 6.0, y1 = min(0.12, 0.2 * top), y2 = min(0.55, 0.35 * top), y3 = min(1.5, 0.55 * top);
  return r < 1.0 ? mix(-0.8, y1, r) : r < 2.0 ? mix(y1, y2, r - 1.0) : r < 3.0 ? mix(y2, y3, r - 2.0) : mix(y3, top, (r - 3.0) / 3.0);
}

float stemTaper(float y, float top, float tip) { return mix(1.15, tip, pow(clamp((y + 0.8) / (top + 0.8), 0.0, 1.0), 0.8)); }
`;const GLSL_TRUNK=GLSL_ENV+GLSL_STEMFN+`
uniform sampler2D uOakF;
#ifdef MANZ


vec2 manzCrook(float y, float top, float seed, float k) {
  float g = clamp(y / max(top, 0.5), 0.0, 1.0), a = seed * 40.0 + k * 2.1, A = 0.1 * top;
  vec2 q1 = vec2(cos(a), sin(a)), q2 = vec2(-q1.y, q1.x);
  return q1 * A * (sin(1.9 * 3.1416 * g) + 0.9 * g) + q2 * A * 0.55 * sin(3.1416 * g + 1.0) * g;
}
#endif
void treeXform(out vec3 P, out vec3 Nrm) {
  vec4 t0 = tf(0), t1 = tf(1), t2 = tf(2), t3 = tf(3), t4 = tf(4), t5 = tf(5), t6 = tf(6), t7 = tf(7);
  float h = t0.w, cbh = t1.x, ravg = t1.y, dbh = t1.z, seed = t1.w, cls = t7.w, sp = t6.w;
  vec4 st = uSpT[int(sp + 0.5)];
  float snag = step(1.5, cls), bare = 0.0;
#ifdef SEASONS
  { float pw = uPheno[int(sp + 0.5)].w; bare = pw > 1.5 ? 1.0 : pw * clamp(uLeafOff * 1.3 - 0.3, 0.0, 1.0); }
#endif
  float clen = max(h - cbh, 0.5), broad = step(0.5, cls) * (1.0 - snag);
  
  
  float top = snag > 0.5 ? h : (broad > 0.5 ? cbh + mix(0.3, 0.6, bare) * clen : h * 0.92);
#ifdef OAKFORM
  
  float oak = broad * step(0.5, texelFetch(uOakF, ivec2(int(aIdx + 0.5) % PER_ROW, int(aIdx + 0.5) / PER_ROW), 0).r);
  if (oak > 0.5) top = clamp(0.55 * cbh, min(2.2, 0.4 * h), 5.0);
#endif
  
  
  vec2 cOff = (vec2(0.0, -t2.x) + vec2(0.707, -0.707) * t2.y + vec2(1.0, 0.0) * t2.z + vec2(0.707, 0.707) * t2.w
             + vec2(0.0, 1.0) * t3.x + vec2(-0.707, 0.707) * t3.y + vec2(-1.0, 0.0) * t3.z + vec2(-0.707, -0.707) * t3.w) * 0.25;
  float nS = broad > 0.5 ? min(ravg > 6.5 ? 4.0 : ravg > 4.5 ? 3.0 : ravg > 3.0 ? 2.0 : 1.0, st.w) : 1.0;
#ifdef OAKFORM
  if (oak > 0.5) nS = 1.0;
#endif
#ifdef LIMBROWS
  
  if (texelFetch(uOakF, ivec2(int(aIdx + 0.5) % PER_ROW, int(aIdx + 0.5) / PER_ROW), 0).r > 0.75) nS = 1.0;
#endif
  float kind = aK.y, k = kind > 0.5 && kind < 1.5 ? floor(aK.x / 3.0 + 0.01) : (kind < 0.5 ? aK.x : 0.0);
  float hideR = texelFetch(uStemHide, ivec2(int(aIdx + 0.5) % PER_ROW, int(aIdx + 0.5) / PER_ROW), 0).r, hideK = 1.0 - step(0.998, hideR);   // viewer_dev: a mod draws this tree's wood
#ifdef BARK
  vPaint = hideR * 1.003937 * hideK;
#endif
  float on = step(k + 0.5, nS) * hideK;
  float ang = seed * 6.2831853 + k * 2.39996; vec2 sd = vec2(cos(ang), sin(ang)); float multi = step(1.5, nS);
  vec2 b0 = broad * (cOff * 0.45 + sd * multi * min(0.16 * ravg, 1.1));
  vec2 b1 = broad * (cOff * 0.8 + sd * multi * 0.32 * ravg);
  
  
  float tip = mix(0.35, 0.2, snag);
#ifdef OAKFORM
  tip = mix(tip, 0.7, oak);
#endif
  float r0 = max(0.5 * dbh / pow(nS, 0.35) / stemTaper(min(1.37, 0.4 * top), top, tip), mix(0.04, 0.08, snag));
  float bend = broad * 0.1 * ravg * (th(seed, k) - 0.5);
  vec3 lp, nrm; float vlen, rad;
  if (kind < 0.5) {
    camR = uCamFadeStem;
    float y = ringY(position.y, top), f = clamp((y + 0.8) / (top + 0.8), 0.0, 1.0);
    float flare = 1.0 + st.y * exp(-max(y, 0.0) / 0.35) * (1.0 + 0.35 * sin(atan(position.z, position.x) * 3.0 + seed * 20.0));
    rad = r0 * on * stemTaper(y, top, tip) * flare;
    lp = vec3(position.x * rad, y, position.z * rad);
    lp.xz += mix(b0, b1, f) + vec2(-sd.y, sd.x) * bend * sin(3.1416 * f);
#ifdef MANZ
    if (st.x > 6.5) lp.xz += manzCrook(y, top, seed, k);
#endif
    nrm = vec3(position.x, 0.12, position.z); vlen = y;
  } else {
    vec3 S, d; float L, rs, re;
    if (kind < 1.5) { // limb j of stem k: forks off high on the stem toward the crown's outer third, ending inside the foliage
#ifdef OAKFORM
     if (oak > 0.5) { // limb m of 3-5 (by crown size) from the fork: evenly spaced directions from the row's seed, each ending
                      
      float m = aK.x, nL = ravg > 6.0 ? 5.0 : ravg > 3.5 ? 4.0 : 3.0, u1 = th(seed + m, 3.0), u2 = th(seed + 7.0, m);
      on = step(m + 0.5, nL) * hideK;
      S = vec3(b1.x, top - 0.25, b1.y);
      float la = seed * 6.2831853 + m * 6.2831853 / nL + (u1 - 0.5) * 0.7;
      vec2 dr = vec2(cos(la), sin(la));
      float ye = cbh + clen * (m < 0.5 ? 0.62 : 0.3 + 0.3 * u2), reach = m < 0.5 ? 0.3 : 0.62 + 0.14 * u1;
      float eR = rAz(azOf(dr), t2, t3) * profAt((ye - cbh) / clen, t4, t5.xy);
      vec3 E = vec3(dr.x * reach * eR, ye, dr.y * reach * eR);
      d = E - S; L = length(d); d /= max(L, 1e-3);
      rs = r0 * tip * (m < 0.5 ? 0.95 : 0.85); re = rs * 0.4;
     } else {
#endif
      float j = aK.x - 3.0 * k, u1 = th(seed + j, k + 3.0), u2 = th(seed + k, j + 7.0);
      on *= broad * step(0.5, bare);
      float fs = 0.5 + 0.13 * j + 0.08 * u1, ys = mix(-0.8, top, fs);
      S = vec3(0.0, ys, 0.0); S.xz = mix(b0, b1, fs) + vec2(-sd.y, sd.x) * bend * sin(3.1416 * fs);
#ifdef MANZ
      if (st.x > 6.5) { on = step(k + 0.5, nS) * hideK * broad; S.xz += manzCrook(ys, top, seed, k); }
#endif
      float la = ang + (j - 1.0) * 1.25 + (u1 - 0.5) * 0.9, rr = ravg * (0.42 + 0.3 * u2);
      vec3 E = vec3(cos(la) * rr + cOff.x * 0.6, cbh + clen * (0.4 + 0.3 * u1), sin(la) * rr + cOff.y * 0.6);
      
      float eL = length(E.xz), eR = rAz(azOf(E.xz), t2, t3) * profAt((E.y - cbh) / clen, t4, t5.xy);
      E.xz *= min(1.0, 0.75 * eR / max(eL, 1e-3));
#ifdef MANZ
      if (st.x > 6.5) { E.y = cbh + clen * (0.2 + 0.25 * u1); E.xz *= 0.9; }   // manzanita: its limbs spread through the crown's lower half, where the photos see them
#endif
      d = E - S; L = length(d); d /= max(L, 1e-3);
      rs = r0 * stemTaper(ys, top, tip) * 0.62; re = rs * 0.22;
#ifdef MANZ
      if (st.x > 6.5) { rs *= 1.3; re = rs * 0.35; }
#endif
#ifdef OAKFORM
     }
#endif
    } else {
      float j = aK.x, u1 = th(seed, j + 11.0), u2 = th(seed + 3.0, j);
      float y0 = 1.6, y1 = snag > 0.5 ? h * 0.9 : cbh - 0.3;
      on = st.z * step(y0 + 1.0, y1) * step(0.3, u1) * hideK;
      float ys = mix(y0, y1, fract(0.13 + j * 0.618 + seed * 3.1)), a2 = j * 2.39996 + seed * 40.0;
      d = normalize(vec3(cos(a2), -0.12 - 0.35 * u2, sin(a2)));
      S = vec3(0.0, ys, 0.0) + d * r0 * stemTaper(ys, top, tip) * 0.7;
      L = 0.2 + 0.45 * u2 * u2; rs = clamp(0.03 + 0.05 * dbh, 0.03, 0.07); re = rs * 0.45;
    }
    vec3 ax = normalize(cross(d, vec3(0.0, 1.0, 0.0)) + vec3(1e-4, 0.0, 0.0)), ay = cross(ax, d);
    rad = mix(rs, re, position.y) * on;
    nrm = ax * position.x + ay * position.z;
    lp = S + d * L * position.y + nrm * rad; vlen = L * position.y;
    
    float bw = th(seed + 5.0, aK.x) * 6.2832; vec3 bow = (ax * cos(bw) + ay * sin(bw)) * 0.12;
#ifdef MANZ
    if (st.x > 6.5) bow *= 2.2;
#endif
#ifdef OAKFORM
    if (oak > 0.5) bow = bow * 0.35 + normalize(vec3(0.0, 1.0, 0.0) - d * d.y + vec3(0.0, 1e-3, 0.0)) * 0.15;
#endif
    lp += bow * step(0.5, kind) * step(kind, 1.5) * L * sin(3.1416 * position.y);
  }
  lp.xz += (lp.y - h) * t5.zw;
  lp.xz += sway(h, lp.y, seed, t0.xz);
  P = vec3(t0.x, t0.y * uExag, t0.z) + lp;
  Nrm = normalize(nrm);
  
  vTCol = mix(vec3(0.85 + 0.3 * fract(seed * 13.7)), t7.rgb * 3.0, uSpc * snag);
  vAO = 1.0; vThk = 0.0; vSelf = 1.0;
#ifdef BARK
  vec2 tl = uBarkTile[int(st.x + 0.5)];
  vBark = vec3(uv.x * max(1.0, floor(6.2832 * (kind < 0.5 ? r0 * 1.1 : rad + 0.02) / tl.x + 0.5)), vlen / tl.y + k * 0.37 + seed * 5.0, st.x);
#endif
}
`;const GLSL_LIMB=GLSL_ENV+`
uniform sampler2D uOakF;
float Lh, Lcbh, Lclen, Lravg, Lseed, LyF, LnL, Llive, Lpine, Ls0;
vec2 Lb0, LbF; vec4 Lra, Lrb, Lp; vec2 Lq;
#ifdef LIMBREC





uniform highp sampler2D uLimbRec;
vec4 lrec(int k) { int i = int(aIdx + 0.5); return texelFetch(uLimbRec, ivec2((i % PER_ROW) * 16 + k, i / PER_ROW), 0); }
vec3 recCtl(vec3 A, vec3 E, vec4 via, float fx, float fy) { return via.w > 0.5 ? 2.0 * via.xyz - 0.5 * (A + E) : vec3(mix(A.x, E.x, fx), mix(A.y, E.y, fy), mix(A.z, E.z, fx)); }
float LrN = 0.0;
#endif






uint LseedU;
float lrand(float key) {
  uint x = LseedU * 0x9E3779B1u + uint(key) * 0x85EBCA77u;
  x ^= x >> 15; x *= 0x2C1B3C6Du; x ^= x >> 12; x *= 0x297A2D39u; x ^= x >> 15;
  return float(x >> 8) * (1.0 / 16777216.0);
}
float envR(vec2 d, float t) { return rAz(azOf(d), Lra, Lrb) * profAt(t, Lp, Lq); }
vec3 xzy(vec2 v, float y) { return vec3(v.x, y, v.y); }
vec3 bez(vec3 A, vec3 C, vec3 E, float s) { float r = 1.0 - s; return r * r * A + 2.0 * r * s * C + s * s * E; }
vec3 bezT(vec3 A, vec3 C, vec3 E, float s) { return 2.0 * (1.0 - s) * (C - A) + 2.0 * s * (E - C); }


vec3 limbPt(vec3 A, vec3 C, vec3 E, float s, float id) {
  vec3 ch = E - A, sd = normalize(cross(ch, vec3(0.0, 1.0, 0.0)) + vec3(1e-4, 0.0, 0.0)), up = normalize(cross(sd, ch));
  float ph = lrand(448.0 + id) * 6.2831853;
  return bez(A, C, E, s) + (sd * sin(ph + 7.5 * s) + up * 0.6 * sin(1.7 * ph + 5.3 * s)) * 0.035 * length(ch) * 4.0 * s * (1.0 - s);
}
void limbSetup(vec4 t0, vec4 t1, vec4 t2, vec4 t3, vec4 t4, vec4 t5) {
  Lh = t0.w; Lcbh = t1.x; Lravg = t1.y; Lseed = t1.w; Lclen = max(Lh - Lcbh, 0.5); Lra = t2; Lrb = t3; Lp = t4; Lq = t5.xy;
  LseedU = uint(clamp(Lseed, 0.0, 0.999999) * 1048576.0);
  float fl = texelFetch(uOakF, ivec2(int(aIdx + 0.5) % PER_ROW, int(aIdx + 0.5) / PER_ROW), 0).r;
  Llive = step(0.4, fl) * step(fl, 0.75); Lpine = step(fl, 0.4);
  
  vec2 cOff = (vec2(0.0, -t2.x) + vec2(0.707, -0.707) * t2.y + vec2(1.0, 0.0) * t2.z + vec2(0.707, 0.707) * t2.w
             + vec2(0.0, 1.0) * t3.x + vec2(-0.707, 0.707) * t3.y + vec2(-1.0, 0.0) * t3.z + vec2(-0.707, -0.707) * t3.w) * 0.25;
  Lb0 = cOff * 0.45;
  LyF = Llive > 0.5 ? clamp(0.5 * Lcbh, 0.8, 2.4) : min(max(0.5 * Lcbh, 1.8), max(0.3 * Lh, 1.8));
  LbF = mix(Lb0, cOff * 0.8, (LyF + 0.8) / (Lcbh + 0.3 * Lclen + 0.8));   // the fork sits on the line GLSL_TRUNK's stem follows
  LnL = Lravg > 4.5 ? 4.0 : 3.0;
#ifdef CANOPY_ON
  if (Llive < 0.5) LnL = Lravg > 5.5 ? 6.0 : Lravg > 3.5 ? 5.0 : 4.0;   // canopy: the photos show many heavy limbs through a black oak's crown (the porch oak: 5-6 from below)
#endif
  
#ifdef CANOPY_ON
  if (Lpine > 0.5) { Lb0 = vec2(0.0); LbF = vec2(0.0); LyF = Lcbh; LnL = clamp(floor(Lclen / 0.9), 6.0, 12.0); return; }
#endif
  if (Lpine > 0.5) { Lb0 = vec2(0.0); LbF = vec2(0.0); LyF = Lcbh; LnL = clamp(floor(Lclen / 1.7), 3.0, 6.0); return; }
#ifdef LIMBREC
  vec4 r0 = lrec(0);
  if (r0.y > 0.0) { LyF = r0.y; LbF = lrec(1).y > 0.5 ? r0.zw : mix(Lb0, cOff * 0.8, (LyF + 0.8) / (Lcbh + 0.3 * Lclen + 0.8)); }
  LrN = r0.x; LnL = max(LnL, LrN);
#endif
}



void pineBranch(float m, float k, out vec3 A, out vec3 C, out vec3 E) {
  float u1 = lrand(256.0 + 4.0 * m + k), u2 = lrand(320.0 + 4.0 * m + k), u3 = lrand(384.0 + 4.0 * m + k);
  float t = (m + 0.25 + 0.5 * u1) / LnL * 0.9 + 0.04, az = Lseed * 6.2831853 + m * 2.39996 + (k + (u2 - 0.5) * 0.6) * 1.5707963;
  vec2 d = vec2(sin(az), -cos(az));
  float y0 = Lcbh + t * Lclen, len = mix(0.75, 1.0, u3) * envR(d, t), rise = mix(-0.22, 0.35, smoothstep(0.1, 0.9, t)) * len;
  A = vec3(0.0, y0, 0.0);
  E = xzy(d * len, min(y0 + rise + 0.12 * len, Lh - 0.3));
  C = xzy(d * len * 0.55, y0 + 0.5 * rise - 0.14 * len);
}
void leader(float m, out vec3 A, out vec3 C, out vec3 E) {
  if (Lpine > 0.5) { pineBranch(m, 0.0, A, C, E); return; }
  float az0 = Lseed * 6.2831853 + 2.0 + lrand(1.0), t0 = mix(0.86, 0.74, Llive);
  vec2 d0 = vec2(sin(az0), -cos(az0));
  A = vec3(LbF.x, LyF, LbF.y);
  E = xzy(d0 * mix(0.25, 0.4, Llive) * envR(d0, t0), Lcbh + t0 * Lclen);
  C = xzy(mix(A.xz, E.xz, 0.3) - d0 * 0.08 * Lravg, mix(A.y, E.y, 0.6));
#ifdef LIMBREC
  if (LrN > 0.5) {   // measured limbs: the ends (and via points) are the record's, the curves between stay the form's
    E = lrec(2).xyz; C = recCtl(A, E, lrec(8), 0.3, 0.6);
    if (m < 0.5) return;
    if (m < LrN - 0.5) {
      vec4 r = lrec(2 + int(m + 0.5));
      A = limbPt(A, C, E, r.w > 0.0 ? clamp((r.w - LyF) / max(E.y - LyF, 0.5), 0.0, 0.85) : max(m - 2.0, 0.0) * 0.09, 0.0);
      E = r.xyz; C = recCtl(A, E, lrec(8 + int(m + 0.5)), mix(0.36, 0.45, Llive), mix(0.68, 0.6, Llive));
      return;
    }
  }   // (an unmeasured leader of a measured tree: the form's own, off the measured trunk line)
#endif
  if (m < 0.5) return;
  float u1 = lrand(16.0 + m), u2 = lrand(32.0 + m);
  A = limbPt(A, C, E, max(m - 2.0, 0.0) * 0.09, 0.0);
  float az = Lseed * 6.2831853 + (m - 1.0 + (u1 - 0.5) * 0.5) * 6.2831853 / max(LnL - 1.0, 1.0);
  vec2 d = vec2(sin(az), -cos(az));
#ifdef CANOPY_ON
  float t = mix(mix(0.25, 0.65, u2), mix(0.3, 0.7, u2), Llive);
  E = xzy(d * mix(mix(0.62, 0.88, u1), mix(0.5, 0.74, u1), Llive) * envR(d, t), Lcbh + t * Lclen);
#else
  float t = mix(mix(0.45, 0.8, u2), mix(0.3, 0.7, u2), Llive);
  E = xzy(d * mix(0.5, 0.74, u1) * envR(d, t), Lcbh + t * Lclen);
#endif
  C = xzy(mix(A.xz, E.xz, mix(0.36, 0.45, Llive)), mix(A.y, E.y, mix(0.68, 0.6, Llive)));
}

void secondary(float m, float j, out vec3 A, out vec3 C, out vec3 E) {
  if (Lpine > 0.5) { Ls0 = 0.0; pineBranch(m, j + 1.0, A, C, E); return; }
  vec3 a, c, e; leader(m, a, c, e);
  float u1 = lrand(64.0 + 4.0 * m + j), u2 = lrand(128.0 + 4.0 * m + j), u3 = lrand(192.0 + 4.0 * m + j);
  Ls0 = 0.34 + 0.2 * j + 0.08 * (u3 - 0.5);
  A = limbPt(a, c, e, Ls0, m);
  vec2 dl = e.xz - a.xz; dl /= max(length(dl), 1e-3);
  float ang = (mod(j + m, 2.0) < 0.5 ? 1.0 : -1.0) * (0.45 + 0.6 * u1);
  float t = j < 0.5 ? mix(0.04, 0.3, u2) : j < 1.5 ? mix(0.3, 0.65, u2) : mix(0.6, 0.92, u2);
  if (m < 0.5) { ang = j * 2.1 + u1 * 1.2; t = mix(0.66, 0.95, u2); }   // the top leader's own branches go all round, high: the crown's top
#ifdef CANOPY_ON
  float reach = m < 0.5 ? mix(0.5, 0.8, u3) : mix(0.8, 1.0, u3);   // canopy: the top's branches stop short of the outline (the splats' tops are narrow)
#else
  float reach = mix(0.8, 1.0, u3);
#endif
  vec2 d = rot2(dl, cos(ang), sin(ang));
  E = xzy(d * reach * envR(d, t), Lcbh + t * Lclen);
  C = 0.5 * (A + E) + vec3(0.0, 0.2 * length(E.xz - A.xz) + 0.4 * max(A.y - E.y, 0.0), 0.0);
}
`;const GLSL_LIMBCROWN=GLSL_LIMB+`
uniform vec4 uLimbC;
uniform float uCardTop;
void treeXform(out vec3 P, out vec3 Nrm) {
  vec4 t0 = tf(0), t1 = tf(1), t2 = tf(2), t3 = tf(3), t4 = tf(4), t5 = tf(5), t6 = tf(6), t7 = tf(7);
  limbSetup(t0, t1, t2, t3, t4, t5);
  float h = Lh, cbh = Lcbh, ravg = Lravg, seed = Lseed, clen = Lclen, m = aC.x, j = aC.y, s = aC.z;
  vec3 A, C, E;
  if (j < -0.5) leader(m, A, C, E); else secondary(m, j, A, C, E);
  vec3 bp = limbPt(A, C, E, s, j < -0.5 ? m : 10.0 + 3.0 * m + j), tg = bezT(A, C, E, s);
  
  vec2 od = normalize(tg.xz / max(length(tg.xz), 1e-3) + bp.xz / max(ravg, 0.5) + vec2(1e-3, 0.0));
  
  vec2 te = normalize(normalize(vec2(length(tg.xz), tg.y) + vec2(1e-3, 0.0)) + vec2(2.0, 0.0));
  vec3 p = vec3(position.x * te.x - position.y * te.y, position.x * te.y + position.y * te.x, position.z);
  vec3 nn = vec3(normal.x * te.x - normal.y * te.y, normal.x * te.y + normal.y * te.x, normal.z);
  p = vec3(p.x * od.x - p.z * od.y, p.y, p.x * od.y + p.z * od.x);
  nn = vec3(nn.x * od.x - nn.z * od.y, nn.y, nn.x * od.y + nn.z * od.x);
  vec3 fcol = t6.rgb; float la = 1.0, ch = clumpHash(aC, aK.y);
#ifdef SEASONS
  
  
  { vec4 ph = uPheno[int(t6.w + 0.5)]; float la2; fcol = limbTint(seasonCol(fcol, ph.w, ph.rgb, uPhenoSpr[int(t6.w + 0.5)], seed, 0.25 + 0.5 * ch, la2), ph.w); seasonCol(t6.rgb, ph.w, ph.rgb, uPhenoSpr[int(t6.w + 0.5)], seed, ch, la); }
#endif
  
  
  float cs0 = clamp(uLimbC.x * ravg, uLimbC.y, uLimbC.z);
#ifdef CANOPY_ON
  float share = clamp(uLimbC.w * ravg * (ravg + clen) / (LnL * 32.0 * cs0 * cs0), Lpine > 0.5 ? 0.12 : 0.06, 1.0);   // canopy: the splats' crowns are half sky; the floor was 0.3
#else
  float share = clamp(uLimbC.w * ravg * (ravg + clen) / (LnL * 32.0 * cs0 * cs0), 0.3, 1.0);
#endif
  
  float rank = 0.85 * clamp((0.97 - s) / (j < -0.5 ? 0.52 : 0.75), 0.0, 1.0) + 0.15 * fract(aK.y * 13.7);
#ifdef CANOPY_ON
  if (Lpine < 0.5) rank = s > 0.96 ? 0.0 : mix(rank, fract(aK.y * 13.7 + aC.z * 3.1), 0.6);   // canopy: foliage all along the limbs (the splats' crowns are leafy through, not a shell); the tip's bough always (it hides the limb's end)
#endif
  float cs = aK.x * cs0 * step(m + 0.5, LnL) * step(rank, share);
  vec3 dc = cameraPosition - vec3(t0.x, t0.y * uExag + cbh + 0.5 * clen, t0.z);
  cs *= mix(1.0, uCardTop, max(dc.y, 0.0) / max(length(dc), 1e-3));
  vec3 lp = bp + p * cs;
  lp.y = min(lp.y, h + 0.4);
  float envF = envR(lp.xz, (lp.y - cbh) / clen);
#ifdef CANOPY_ON
  lp.xz *= min(1.0, 1.12 * max(envF, 0.15 * ravg) / max(length(lp.xz), 1e-3));
#else
  lp.xz *= min(1.0, 1.12 * max(envF, 0.3 * ravg) / max(length(lp.xz), 1e-3));
#endif
  vec3 dv = vec3(lp.x / max(ravg, 0.4), (lp.y - (cbh + 0.45 * clen)) / max(0.5 * clen, 0.4), lp.z / max(ravg, 0.4));
  Nrm = normalize(mix(normalize(dv + vec3(0.0, 0.2, 0.0)), nn, uForm.z));
  crownShade(length(lp.xz), lp.y, envF, cbh, clen);
  vSelf = selfSun(lp, vec3(0.0, cbh + 0.5 * clen, 0.0), vec3(0.88 * ravg, 0.5 * clen, 0.88 * ravg));
  lp.xz += (lp.y - h) * t5.zw;
  lp.xz += sway(h, lp.y, seed, t0.xz);
#ifdef FLUTTER
  lp += windLeaf() * cs * 0.012 * vec3(sin(uTime * 1.6 + seed * 50.0 + s * 11.0 + aK.y * 23.0), 0.4 * sin(uTime * 1.1 + aK.y * 17.0), cos(uTime * 1.4 + seed * 31.0 + m * 7.0));
#endif
  P = vec3(t0.x, t0.y * uExag, t0.z) + lp;
  vEdge = abs(dot(nn, normalize(cameraPosition - P)));
  vLeaf = step(ch, la); fcol = mix(vec3(0.09, 0.07, 0.052), fcol, vLeaf);
  vTCol = mix(fcol, t7.rgb, uSpc) * mix(0.9, 1.06, (aK.y - 0.62) * 2.0) * uShade;
  
  
  vTCol *= mix(1.0, uTop, max(normalize(cameraPosition - P).y, 0.0));
  vTCol *= mix(1.0, mix(1.0, 1.0 / PINE_GAIN, smoothstep(0.25, 0.75, max(normalize(cameraPosition - P).y, 0.0))), Lpine);   // a pine's lift eases out looking down (see GLSL_CLOUD)
}
`;const GLSL_LIMBWOOD=GLSL_LIMB+GLSL_STEMFN+`
void treeXform(out vec3 P, out vec3 Nrm) {
  vec4 t0 = tf(0), t1 = tf(1), t2 = tf(2), t3 = tf(3), t4 = tf(4), t5 = tf(5), t6 = tf(6), t7 = tf(7);
  limbSetup(t0, t1, t2, t3, t4, t5);
  float dbh = t1.z, seed = Lseed, top = LyF, tip = 0.72;
  vec4 st = uSpT[int(t6.w + 0.5)];
  float hideR = texelFetch(uStemHide, ivec2(int(aIdx + 0.5) % PER_ROW, int(aIdx + 0.5) / PER_ROW), 0).r, on = 1.0 - step(0.998, hideR);
#ifdef BARK
  vPaint = hideR * 1.003937 * on;
#endif
  float r0 = max(0.5 * dbh / stemTaper(min(1.37, 0.4 * top), top, tip), 0.04), rF = r0 * tip;
  float kind = aK.y, vlen, rad, around; vec3 lp, nrm;
  if (kind < 0.5) {
    camR = uCamFadeStem;
    float y = ringY(position.y, top), f = clamp((y + 0.8) / (top + 0.8), 0.0, 1.0);
    float flare = 1.0 + st.y * exp(-max(y, 0.0) / 0.35) * (1.0 + 0.35 * sin(atan(position.z, position.x) * 3.0 + seed * 20.0));
    rad = r0 * on * stemTaper(y, top, tip) * flare;
    lp = vec3(position.x * rad, y, position.z * rad);
    lp.xz += mix(Lb0, LbF, f);
    nrm = vec3(position.x, 0.12, position.z); vlen = y; around = r0 * 1.1;
  } else {
    
    vec3 A, C, E; float rs, re, m, id, s = (kind < 1.5 ? 0.9 : 0.62) * position.y, rl = 0.7 * rF;
    if (kind < 1.5) { m = aK.x; id = m; leader(m, A, C, E); rs = m < 0.5 ? rF : rl; re = max(0.3 * rl, 0.03); }
    else { m = floor(aK.x / 3.0 + 0.01); id = 10.0 + aK.x; secondary(m, aK.x - 3.0 * m, A, C, E); float rm = m < 0.5 ? rF : rl; rs = 0.62 * mix(rm, max(0.3 * rl, 0.03), pow(Ls0, 0.8)); re = 0.025; }
    on *= step(m + 0.5, LnL);
    if (Lpine > 0.5) { rs = clamp(0.08 * dbh + 0.015, 0.025, 0.08); re = 0.012; s = 0.85 * position.y; }   // thin branches, ending inside their tip's tuft
    vec3 c = limbPt(A, C, E, s, id), T = normalize(bezT(A, C, E, s) + vec3(0.0, 1e-4, 0.0));
    vec3 ax = normalize(cross(T, vec3(0.0, 1.0, 0.0)) + vec3(1e-4, 0.0, 0.0)), ay = cross(ax, T);
    rad = mix(rs, re, pow(position.y, 0.8)) * on;
    nrm = ax * position.x + ay * position.z;
    lp = c + nrm * rad; vlen = s * (length(C - A) + length(E - C)); around = max(rs, 0.03);   // the bark tiles by the limb's own girth (0.7 of it stretched the checks of live oak bark into blocks)
  }
  lp.xz += (lp.y - Lh) * t5.zw;
  lp.xz += sway(Lh, lp.y, seed, t0.xz);
  P = vec3(t0.x, t0.y * uExag, t0.z) + lp;
  Nrm = normalize(nrm);
  vTCol = vec3(0.85 + 0.3 * fract(seed * 13.7)) * mix(1.0, LIMB_DARK * mix(1.0, 0.8, Llive), kind < 0.5 ? smoothstep(0.0, 1.0, clamp(lp.y / top, 0.0, 1.0)) : 1.0);   // live oak's pale bark a step darker still
  vAO = 1.0; vThk = 0.0; vSelf = 1.0;
#ifdef BARK
  vec2 tl = uBarkTile[int(st.x + 0.5)];
  vBark = vec3(uv.x * max(1.0, floor(6.2832 * around / tl.x + 0.5)), vlen / tl.y + aK.x * 0.37 + seed * 5.0, st.x);
#endif
}
`;const GLSL_SHRUB_CARDS=`
void treeXform(out vec3 P, out vec3 Nrm) {
  vec4 s0 = tf(0), s1 = tf(1), s2 = tf(2), s3 = tf(3);
  float h = s0.w, r = s1.x, seed = s1.z;
  float a = seed * 6.2831853, ca = cos(a), sa = sin(a);
  vec3 c = aC; c.xz = rot2(c.xz, ca, sa);
  vec3 p = position; p.xz = rot2(p.xz, ca, sa);
  vec3 nn = normal; nn.xz = rot2(nn.xz, ca, sa);
  vec3 fcol = s2.rgb; float la = 1.0, ch = clumpHash(aC, aK.y);
#ifdef SEASONS
  fcol = shrubSeason(fcol, s1.y, seed, ch, la);
#endif
  float cs = aK.x * clamp(0.65 * min(r, h), 0.32, 1.6);
  float prof = sqrt(max(1.0 - c.y * c.y * 0.8, 0.05));
  float er = max(r * prof - 0.45 * cs, 0.3 * r);
  vec3 lp = vec3(c.x * er, (0.1 + 0.82 * c.y) * h, c.z * er) + p * cs;
  lp.y = min(lp.y, h * 1.05);
  vec3 dv = vec3(lp.x / max(r, 0.3), (lp.y - 0.35 * h) / max(0.65 * h, 0.3), lp.z / max(r, 0.3));
  Nrm = normalize(mix(normalize(dv + vec3(0.0, 0.3, 0.0)), nn, CARD_N));
  vSelf = selfSun(lp, vec3(0.0, 0.45 * h, 0.0), vec3(r, 0.55 * h, r));
  lp.xz += sway(h + 2.0, lp.y, seed, s0.xz) * 0.5;
#ifdef FLUTTER
  lp += windLeaf() * cs * 0.012 * vec3(sin(uTime * 1.8 + seed * 50.0 + c.y * 11.0 + aK.y * 23.0), 0.0, cos(uTime * 1.5 + seed * 31.0 + c.x * 7.0));
#endif
  P = vec3(s0.x, s0.y * uExag, s0.z) + lp;
  float rr = clamp(length(c.xz), 0.0, 1.0);
  vAO = mix(0.45, 1.0, smoothstep(0.2, 1.0, max(rr, c.y))) * mix(0.75, 1.0, c.y); vThk = mix(0.4, 1.0, rr);
  vEdge = abs(dot(nn, normalize(cameraPosition - P)));
  vLeaf = step(ch, la); fcol = mix(vec3(0.09, 0.07, 0.052), fcol, vLeaf);
  vTCol = mix(fcol, s3.rgb, uSpc) * mix(0.9, 1.06, (aK.y - 0.62) * 2.0) * uShade;
}
`;const GLSL_SHRUB_CLOUD=`
void treeXform(out vec3 P, out vec3 Nrm) {
  vec4 s0 = tf(0), s1 = tf(1), s2 = tf(2), s3 = tf(3);
  float h = s0.w, r = s1.x, seed = s1.z;
  float a = seed * 6.2831853;
  vec3 c = aC; c.xz = rot2(c.xz, cos(a), sin(a));
  vec3 fcol = s2.rgb; float la = 1.0, ch = clumpHash(aC, aK.y);
#ifdef SEASONS
  fcol = shrubSeason(fcol, s1.y, seed, ch, la);
#endif
  float cs = aK.x * clamp(1.15 * max(r, 0.6 * h), 0.35, 3.2);
  vec3 lp = vec3(c.x * r, c.y * h, c.z * r);
  lp.y = min(max(lp.y, 0.3 * cs), max(h - 0.32 * cs, 0.3 * cs));
  vec3 dv = vec3(lp.x / max(r, 0.3), (lp.y - 0.35 * h) / max(0.65 * h, 0.3), lp.z / max(r, 0.3));
  Nrm = normalize(dv + vec3(0.0, 0.3, 0.0));
  float rr = clamp(length(c.xz), 0.0, 1.0);
  vAO = mix(0.5, 1.0, smoothstep(0.1, 0.9, max(rr, c.y))) * mix(0.75, 1.0, c.y); vThk = mix(0.4, 1.0, rr);
  vec2 q; vec3 bb = billboard(position.xy, fract(aK.y * 7.13 + seed * 3.7) * 6.2831853, q) * cs;
  vSelf = selfSun(lp + bb, vec3(0.0, 0.45 * h, 0.0), vec3(r, 0.55 * h, r));
  lp.xz += sway(h + 2.0, lp.y, seed, s0.xz) * 0.5;
  lp += bb;
#ifdef POROUS
  vNP = (lp - uSunDir * dot(lp, uSunDir)) * 0.8 + seed * 17.0;   // across the sun's rays: a hole runs through every clump
#endif
  vQ = 2.0 * q;
  P = vec3(s0.x, s0.y * uExag, s0.z) + lp;
  vLeaf = step(ch, la); fcol = mix(vec3(0.09, 0.07, 0.052), fcol, vLeaf);
  vTCol = mix(fcol, s3.rgb, uSpc) * mix(0.9, 1.06, (aK.y - 0.62) * 2.0) * uShade;
}
`;const GLSL_FRAG_HEAD=`
varying vec3 vTCol;
varying float vFade;
varying float vFadeOut;
varying float vLeaf;
varying float vAO;
varying float vThk;
varying float vSelf;
varying float vCamR;
#ifdef CARDS
varying float vEdge;
#endif
#ifdef CLOUD
varying vec2 vQ;
#endif
uniform sampler2D uTwig;
#ifdef FADE_EDGE
uniform vec3 uEdge; uniform float uA2C;
#endif
#ifdef BARK
uniform highp sampler2DArray uBarkTex;
varying vec3 vBark;
varying float vPaint; uniform vec3 uBarkPaint;

vec3 bumpN(vec3 p, vec3 n, vec2 dH) {
  vec3 sx = dFdx(p), sy = dFdy(p), r1 = cross(sy, n), r2 = cross(n, sx);
  float det = dot(sx, r1);
  vec3 g = abs(det) * n - sign(det) * (dH.x * r1 + dH.y * r2);
  return dot(g, g) > 1e-20 ? normalize(g) : n;
}
#endif
`;const SCREEN_DITHER="fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))))";const A2C_DITHER="((mod(gl_FragCoord.x, 2.0) < 1.0 ? (mod(gl_FragCoord.y, 2.0) < 1.0 ? -0.375 : 0.375) : (mod(gl_FragCoord.y, 2.0) < 1.0 ? 0.125 : -0.125)) * 0.25)";const SHADOW_ONLY=new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:false,depthTest:false});const SHADOW_ONLY_FRONT=Object.assign(SHADOW_ONLY.clone(),{shadowSide:THREE.FrontSide});let keySeq=0;function makeMaterials(xformGLSL,defines,uniforms,opts={}){const key=opts.key||"veg"+keySeq++;if(uniforms.uEdge)uniforms.uA2C=uA2C;const D=Object.assign({PER_ROW,TEXELS:8,...uniforms.uEdge?{FADE_EDGE:1}:{},...FILL_DBG&&opts.map?{FILL_DBG:1}:{},...CANOPY?{CANOPY_ON:1}:{},...MANZ?{MANZ:1}:{},LIMB_TINT:(+(QS.get("limbtint")??1)).toFixed(2),FALL_GAIN:PAL_PHOTO?"1.95":"1.18",SHADOW_PUSH:"0.4",NEAR_D:NEAR_DIST.toFixed(1),FADE_WD:"20.0",SEASONS:1,BARK_BUMP:"0.035",BARK_AMB:"vec3(2.6, 2.4, 2.05)",FOL_WRAP:"0.4",FOL_TRANS:"1.5",FOL_SHADOW:"0.82",FOL_SHADOW_T:"0.5",FOL_SHEEN:"0.035",CLOUD_SPH:"0.85"},defines);const head=GLSL_COMMON+xformGLSL;let mat=opts.shadowFront?SHADOW_ONLY_FRONT:SHADOW_ONLY;const cov=!!opts.map&&(FOL_A2C||NEAR_A2C&&!D.CLOUD&&!uniforms.uEdge);if(opts.depthOnly&&opts.map)mat=Object.assign(mat.clone(),{map:opts.map,alphaTest:opts.alphaTest||.5});if(!opts.depthOnly){mat=new THREE.MeshLambertMaterial({color:16777215,map:opts.map||null,alphaTest:opts.map?opts.alphaTest||.5:0,side:opts.doubleSide?THREE.DoubleSide:THREE.FrontSide,alphaToCoverage:cov});mat.defines=D;mat.onBeforeCompile=sh=>{Object.assign(sh.uniforms,uniforms);sh.vertexShader=sh.vertexShader.replace("#include <common>","#include <common>\n"+head).replace("#include <beginnormal_vertex>",`vec3 tP; vec3 objectNormal; treeXform(tP, objectNormal);
vCamR = camR < 0.0 ? uCamFade : camR;
{ vec4 q0 = tf(0); float dd = distance(cameraPosition, vec3(q0.x, q0.y * uExag + q0.w * 0.5, q0.z));
#ifdef FADE_TEX
  { int i = int(aIdx + 0.5); vFade = 1.0 - texelFetch(uFade, ivec2(i % PER_ROW, i / PER_ROW), 0).r; }
#else
  vFade = clamp((dd - (NEAR_D - FADE_WD)) / FADE_WD, 0.0, 1.0);
#endif
#ifdef FADE_OUT
  vFadeOut = clamp((dd - (FADE_OUT_D - 40.0)) / 40.0, 0.0, 1.0);
#endif
#ifdef FADE_EDGE
  
  vFadeOut = clamp((distance(cameraPosition.xz, q0.xz) - (uEdge.x - uEdge.y)) / max(uEdge.y, 0.01), 0.0, 1.0);
  
  
  
  if (uA2C < 0.5) {
    vec3 eMid = vec3(q0.x, q0.y * uExag + q0.w * 0.5, q0.z);
    tP = eMid + (tP - eMid) * sqrt(1.0 - (uEdge.z > 0.5 ? clamp(2.0 * vFadeOut - 1.0, 0.0, 1.0) : vFadeOut));
    vFadeOut = 0.0;
  }
#endif
}`).replace("#include <begin_vertex>","vec3 transformed = tP;"+(D.BARK&&BARK_BAKED?"\nvBW = (modelMatrix * vec4(tP, 1.0)).xyz;":"")).replace("#include <shadowmap_vertex>",`#ifdef USE_SHADOWMAP
{ vec4 wpKeep = worldPosition; worldPosition.xyz += uSunDir * SHADOW_PUSH + shOff;
#include <shadowmap_vertex>
worldPosition = wpKeep; }
#else
#include <shadowmap_vertex>
#endif`);let fs=sh.fragmentShader.replace("#include <common>","#include <common>\n"+GLSL_FRAG_HEAD).replace("#include <clipping_planes_fragment>",`#include <clipping_planes_fragment>
float camF = vCamR > 0.0 ? smoothstep(0.35 * vCamR, vCamR, length(vViewPosition)) : 1.0;
${cov?"if (camF <= 0.0) discard;":`if (${SCREEN_DITHER} >= camF) discard;`}
#if defined(FADE_NEAR) || defined(FADE_FAR)
{ float dith = ${SCREEN_DITHER};
#ifdef FADE_NEAR
  if (dith < vFade) discard;
#else
  if (dith >= vFade) discard;
#endif
}
#endif
#ifdef FADE_OUT
if (${SCREEN_DITHER} < vFadeOut) discard;
#endif
#ifdef FADE_EDGE
if (${opts.map?"uA2C < 0.5 && ":""}${SCREEN_DITHER} < vFadeOut) discard;
#endif`).replace("#include <color_fragment>",`diffuseColor.rgb *= vTCol;
#ifdef BARK
vec4 bk = texture(uBarkTex, vBark);
diffuseColor.rgb *= bk.rgb;
#endif
#ifdef BARK
diffuseColor.rgb = mix(diffuseColor.rgb, uBarkPaint, vPaint);   // marking paint over the bark (setBarkPaint); the bark's relief still shades it
#endif`);if(D.BARK&&BARK_BAKED){fs=fs.replace("diffuseColor.rgb *= bk.rgb;\n#endif","diffuseColor.rgb *= bk.rgb;\n"+BB_FRAG+"\n#endif").replace("void main() {",BB_DECL+"void main() {");sh.vertexShader=sh.vertexShader.replace("void main() {","varying vec3 vBW;\nvoid main() {");Object.assign(sh.uniforms,BB)}if(opts.map)fs=fs.replace("#include <map_fragment>",`#include <map_fragment>
#if defined(SEASONS) && (defined(CARDS) || defined(CLOUD))
if (vLeaf < 0.5) { vec2 tdx = dFdx(vMapUv), tdy = dFdy(vMapUv); diffuseColor = textureGrad(uTwig, vMapUv, tdx, tdy); }
#endif`);if(D.BARK)fs=fs.replace("#include <normal_fragment_maps>",`#include <normal_fragment_maps>
{ float bkPx = max(length(dFdx(vBark.xy)), length(dFdy(vBark.xy))) * 512.0;
  normal = bumpN(-vViewPosition, normal, vec2(dFdx(bk.a), dFdy(bk.a)) * BARK_BUMP * (1.0 - smoothstep(1.5, 6.0, bkPx))); }`);if(D.BARK)fs=fs.replace("#include <aomap_fragment>","#include <aomap_fragment>\nreflectedLight.indirectDiffuse *= mix(BARK_AMB, vec3(1.0), vPaint);");if(opts.map&&!cov)fs=fs.replace("#include <alphatest_fragment>",`#ifdef USE_ALPHATEST
#ifdef CARDS
diffuseColor.a *= smoothstep(0.03, 0.15, vEdge);
#endif
if (diffuseColor.a < alphaTest) discard;
#endif`);if(cov)fs=fs.replace("#include <alphatest_fragment>",`#ifdef USE_ALPHATEST
#ifdef CARDS
diffuseColor.a *= smoothstep(0.03, 0.15, vEdge);
#endif
diffuseColor.a = min((diffuseColor.a - alphaTest) / max(fwidth(diffuseColor.a), 1e-4) + 0.5, 1.0) * camF;
#ifdef FADE_EDGE


if (uA2C > 0.5 && vFadeOut > 0.0) diffuseColor.a *= clamp((uEdge.z > 0.5 ? 2.0 - 2.0 * vFadeOut : 1.0 - vFadeOut) + ${A2C_DITHER}, 0.0, 1.0);
#endif
if (diffuseColor.a <= 0.0) discard;
#endif`);if(D.FILL_DBG){sh.uniforms.uFillDbg=uFillDbg;fs=fs.replace("void main() {","uniform float uFillDbg;\nvoid main() {\nif (uFillDbg > 0.5) { if (uFillDbg > 1.5 && texture2D(map, vMapUv).a < 0.5) discard; gl_FragColor = vec4(1.0 / 255.0, 0.0, 0.0, 1.0); return; }")}if(opts.foliage)fs=fs.replace("#include <lights_lambert_pars_fragment>",FOL_DIRECT).replace("#include <lights_fragment_begin>",FOL_LIGHTS).replace("#include <aomap_fragment>",FOL_AMBIENT);if(opts.doubleSide)fs=fs.replace("#include <normal_fragment_begin>",`float faceDirection = 1.0;
vec3 normal = normalize(vNormal);
#ifdef CLOUD
normal = normalize(normal + CLOUD_SPH * vec3(vQ, sqrt(max(1.0 - dot(vQ, vQ), 0.0))));
#endif
vec3 nonPerturbedNormal = normal;`);sh.fragmentShader=fs};mat.customProgramCacheKey=()=>key;mat.userData.u=uniforms}const depth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,map:opts.map||null,alphaTest:opts.map?opts.alphaTest||.5:0});depth.defines={...D,NO_SWAY:1};depth.onBeforeCompile=sh=>{Object.assign(sh.uniforms,uniforms);sh.vertexShader=sh.vertexShader.replace("#include <common>","#include <common>\n"+head).replace("#include <begin_vertex>","vec3 tP, tN; treeXform(tP, tN); vec3 transformed = tP;");if(D.POROUS)sh.fragmentShader=sh.fragmentShader.replace("#include <common>","#include <common>\nvarying vec3 vNP;\nvarying float vLeaf;\nuniform highp sampler3D uNoise;\nuniform float uPorous;").replace("#include <clipping_planes_fragment>",`#include <clipping_planes_fragment>
{ float pk = uPorous;
#ifdef SEASONS
  pk += (1.0 - vLeaf) * 0.45;
#endif
  if (texture(uNoise, vNP * POROUS_F).r < pk) discard; }`)};depth.customProgramCacheKey=()=>key+"d";return{mat,depth}}class LodFader{constructor(n,hyst){this.hyst=hyst;this.w=new Uint8Array(PER_ROW*Math.max(1,Math.ceil(n/PER_ROW)));const t=this.tex=new THREE.DataTexture(this.w,PER_ROW,this.w.length/PER_ROW,THREE.RedFormat,THREE.UnsignedByteType);t.minFilter=t.magFilter=THREE.NearestFilter;t.generateMipmaps=false;t.unpackAlignment=1;t.needsUpdate=true;this.dirty=false}at(i,d,D,step){const w0=this.w[i],tgt=d<D-this.hyst||d<D+this.hyst&&w0>=128?255:0;if(w0!==tgt){this.w[i]=tgt>w0?Math.min(255,w0+step):Math.max(0,w0-step);this.dirty=true}return this.w[i]}flush(){if(this.dirty){this.tex.needsUpdate=true;this.dirty=false}}}const A2C_MASK=r=>{r.state.buffers.color.setMask(true);r.getContext().colorMask(true,true,true,false)};const A2C_UNMASK=r=>r.getContext().colorMask(true,true,true,true);class InstSet{constructor(geo,mats,cap,opts={}){const g=new THREE.InstancedBufferGeometry;g.index=geo.index;for(const k in geo.attributes)g.setAttribute(k,geo.attributes[k]);this.attr=new THREE.InstancedBufferAttribute(new Float32Array(Math.max(cap,1)),1);this.attr.setUsage(THREE.DynamicDrawUsage);g.setAttribute("aIdx",this.attr);g.instanceCount=0;this.geo=g;this.mesh=new THREE.Mesh(g,mats.mat);this.mesh.customDepthMaterial=mats.depth;this.mesh.frustumCulled=false;this.mesh.matrixAutoUpdate=false;this.mesh.visible=false;this.mesh.renderOrder=opts.order??0;this.n=0;if(opts.shadowOnly){this.mesh.castShadow=true;this.mesh.receiveShadow=false;this.mesh.onBeforeRender=()=>{g.instanceCount=0};this.mesh.onBeforeShadow=()=>{g.instanceCount=this.n}}else{this.mesh.castShadow=false;this.mesh.receiveShadow=true;if(mats.mat.alphaToCoverage){this.mesh.onBeforeRender=A2C_MASK;this.mesh.onAfterRender=A2C_UNMASK}}this.ids=this.attr.array}commit(n,upload=true){this.n=n;this.geo.instanceCount=n;this.mesh.visible=n>0;if(upload&&n>0){this.attr.clearUpdateRanges();this.attr.addUpdateRange(0,n);this.attr.needsUpdate=true}}}function dataTexture(arr,count,texels){const rows=Math.max(1,Math.ceil(count/PER_ROW));const data=new Float32Array(PER_ROW*texels*rows*4);data.set(arr);const t=new THREE.DataTexture(data,PER_ROW*texels,rows,THREE.RGBAFormat,THREE.FloatType);t.minFilter=t.magFilter=THREE.NearestFilter;t.generateMipmaps=false;t.needsUpdate=true;return t}const srgbToLin=v=>v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4);function imageryCol(col,base,name,ir,ig,ib){if(PAL_PHOTO){const li=.2126*ir+.7152*ig+.0722*ib,lref=ORTHO_LUM_REF[name]||li;return col.copy(base).multiplyScalar(li>.001?Math.min(Math.max(Math.sqrt(li/lref),.8),1.25):1)}const w=ir+ig+ib>.003?.45:0;return col.setRGB(base.r*(1-w)+ir*1.35*w,base.g*(1-w)+ig*1.35*w,base.b*(1-w)+ib*1.35*w)}export const FAR_STRIDE=8,FAR_TYPE={pine:0,conifer:1,oak:2,liveoak:3,shrub:4},FAR_BURN={scorched:8,torched:16},FAR_PHOTO=32;const FAR_FIX=QS.get("farfix")==="0"?[0,1,2,3,4].map(()=>[1,1,1,0]):[[1.376,1.585,1.879,.25],[1,1,1,0],[1.118,1.21,1.465,.25],[1.458,1.453,1.504,.25],[1.735,1.51,1.709,0]];const FAR_FIX_D=[60,400];const FAR_SPECIES=["ponderosa","douglas_fir","black_oak","live_oak","tall_shrub"];const farRGB=v=>{const p=Math.max(Math.round(v||0),0);return[srgbToLin((p>>16&255)/255),srgbToLin((p>>8&255)/255),srgbToLin((p&255)/255)]};const FAR_TYPE_OF={ponderosa:0,sugar_pine:0,conifer_other:0,snag:0,douglas_fir:1,incense_cedar:1,black_oak:2,blue_oak:2,other_hardwood:2,live_oak:3,madrone:3,tall_shrub:4};const FAR_CELLS=[["ponderosa",.42,t=>t<.4?.5+.5*Math.sin(Math.PI/2*t/.4):Math.sqrt(Math.max(1-((t-.4)/.66)**2,0)),46,.34,0],["douglas_fir",.2,t=>1-.9*t,60,.3,0],["black_oak",.4,t=>t<.38?.62+.38*Math.sin(Math.PI/2*t/.38):Math.sqrt(Math.max(1-((t-.38)/.66)**2,0)),44,.36,1],["live_oak",.22,t=>t<.3?.8+.2*t/.3:Math.sqrt(Math.max(1-((t-.3)/.72)**2,0)),64,.32,1],["manzanita",.05,t=>Math.sqrt(Math.max(1-(t*.95)**2,0)),40,.4,0]];function farAtlas(base){const S=1024,CW=256,CH=512,[c,g]=canvas2d(S),tex=mipTexture(c);Promise.all(FAR_CELLS.map(f=>loadSprite(base+"tex/species/"+f[0]+".png",softSprite).catch(()=>null))).then(imgs=>{g.clearRect(0,0,S,S);g.lineCap="round";FAR_CELLS.forEach(([,cb,prof,n,size,forks],k)=>{const R=prng(4e3+k),x0=k%4*CW,y0=Math.floor(k/4)*CH,img=imgs[k],yb=y0+CH*(1-cb),hw=CW*.36,sz=CW*size;g.save();g.beginPath();g.rect(x0,y0,CW,CH);g.clip();g.strokeStyle="rgb(128,104,84)";g.lineWidth=CW*.024;if(forks)for(const sgn of[-1,1]){g.lineWidth=CW*.017;g.beginPath();g.moveTo(x0+CW/2,yb+CH*cb*.25);g.lineTo(x0+CW/2+sgn*hw*.45,yb-(yb-y0)*.45);g.stroke()}if(!img){g.restore();return}const parts=[];for(let i=0;i<n;i++){const t=.03+.94*Math.pow(R(),.9),w=prof(t)*hw,x=(R()*2-1)*w*.82,depth=R();parts.push([x,t,depth,(R()-.5)*1.2+Math.atan2(x,hw)*.9])}parts.sort((a,b)=>a[2]-b[2]);for(const[x,t,depth,rot]of parts){const y=yb-t*(yb-y0-sz*.25);g.save();g.filter=`brightness(${(.55+.25*depth+.25*t).toFixed(3)})`;g.translate(x0+CW/2+x,y+sz*.3);g.rotate(rot);g.drawImage(img,-sz/2,-sz,sz,sz);g.restore()}g.restore();if(img){const tx=(1+(k>>1))*CW,ty=CH+(k&1)*CW,m=Math.round(n*.7),ps=[];g.save();g.beginPath();g.arc(tx+CW/2,ty+CW/2,CW*.49,0,6.2832);g.clip();for(let i=0;i<m;i++){const a=R()*6.2832,d=Math.sqrt((i+.5)/m)*CW*.27;ps.push([a,d])}ps.sort((p,q)=>q[1]-p[1]);for(const[a,d]of ps){g.save();g.filter=`brightness(${(1-.4*d/(CW*.27)).toFixed(3)})`;g.translate(tx+CW/2+Math.cos(a)*d,ty+CW/2+Math.sin(a)*d);g.rotate(a+Math.PI/2+(R()-.5)*.8);g.drawImage(img,-sz*.4,-sz*.55,sz*.8,sz*.8);g.restore()}g.restore()}});setLevels(tex,c)});return tex}export class FarForest{constructor(veg){const S=veg.shared,man=veg.man;this.veg=veg;this.W2=man.W/2;this.H2=man.H/2;this.tiles=new Map;this.count=0;this.uFarNear={value:new THREE.Vector2(0,18)};this.nearR=0;this.outer=null;this.uFarReach={value:new THREE.Vector4(0,0,0,0)};this.uFarFadeK={value:.15};this.group=new THREE.Group;this.group.name="farForest";const K=+(QS.get("fark")||.55),lin=(hex,k)=>desat(new THREE.Color(hex),k),nat=n=>PAL_PHOTO&&NATURAL_PHOTO[n]||NATURAL[n];this.base=FAR_SPECIES.map(n=>[n,new THREE.Color(nat(n)||"#4a5a32")]);this.tint=new THREE.Color;this.cols=[lin(nat("ponderosa"),1).multiplyScalar(K*1.66*(1+.45*(PINE_GAIN-1))),lin(nat("douglas_fir"),1).multiplyScalar(K*1.68),lin(nat("black_oak"),1).multiplyScalar(K*1.73),lin(nat("live_oak"),1).multiplyScalar(K*2.6).multiply(new THREE.Color(.92,1,1.04)),lin(SHRUB_NATURAL.manzanita,CHROMA).multiplyScalar(K*1.4)];{const f=lin(PAL_PHOTO&&PHENO_FALL_PHOTO.black_oak||PHENO.black_oak.fall,CHROMA_FALL),l0=.2126*f.r+.7152*f.g+.0722*f.b;f.b*=.84;const l=.2126*f.r+.7152*f.g+.0722*f.b;f.setRGB(Math.max(l+(f.r-l)*1.12,0),Math.max(l+(f.g-l)*1.12,0),Math.max(l+(f.b-l)*1.12,0)).multiplyScalar(K*1.73*l0/l);this.fall=f}this.uFarFix={value:FAR_FIX.map(f=>new THREE.Vector4(...f))};this.uFarFixD={value:new THREE.Vector2(.001,.002)};const U={uFarFix:this.uFarFix,uFarFixD:this.uFarFixD,uA2C,uFarNear:this.uFarNear,uFarReach:this.uFarReach,uFarFadeK:this.uFarFadeK,uFarCol:{value:this.cols},uFarFall:{value:this.fall},uFall:S.uFall||{value:0},uLeafOff:S.uLeafOff||{value:0},uExag:S.uExag};const mat=this.mat=new THREE.MeshLambertMaterial({map:farAtlas(veg.base),alphaTest:.5,side:THREE.DoubleSide,alphaToCoverage:FOL_A2C});mat.onBeforeCompile=sh=>{Object.assign(sh.uniforms,U);sh.vertexShader=sh.vertexShader.replace("#include <common>",`#include <common>
attribute vec4 aTree, aTree2;
attribute vec4 aTint;   // the row's own colour against its type's (bytes: 128 = the same; a: the row carries one, FAR_PHOTO)
uniform vec3 uFarCol[5]; uniform vec3 uFarFall; uniform float uFall, uLeafOff, uExag, uFarFadeK, uA2C; uniform vec2 uFarNear; uniform vec4 uFarReach;
uniform vec4 uFarFix[5]; uniform vec2 uFarFixD;
varying vec3 vFarCol; varying float vFarFade;`).replace("#include <beginnormal_vertex>",`vec3 fBase = vec3(aTree.x, aTree.y * uExag, aTree.z);
vec2 fD = normalize(cameraPosition.xz - fBase.xz + vec2(1e-4, 0.0));
vec3 objectNormal = normalize(vec3(fD.x * 0.5, 0.85, fD.y * 0.5));   // lit mostly from above, a little from the camera's side`).replace("#include <begin_vertex>",`int fT = int(aTree2.y + 0.5);

float fFix = uFarFixD.y > 0.0 ? 1.0 - smoothstep(uFarFixD.x, uFarFixD.y, distance(cameraPosition.xz, fBase.xz)) : 1.0;
float fW = max(2.7 * aTree2.x, 0.24 * aTree.w) * (1.0 - uFarFix[fT].a * fFix);   // the crown fills about 0.8 of the picture's width
vec3 transformed = fBase + vec3(fD.y, 0.0, -fD.x) * (position.x * fW) + vec3(0.0, position.y * aTree.w, 0.0);


float fCap = step(0.5, position.z);
if (fCap > 0.5) {
  float cb = fT == 0 ? 0.42 : fT == 1 ? 0.2 : fT == 2 ? 0.4 : fT == 3 ? 0.22 : 0.05, yc = aTree.w * mix(cb, 1.0, 0.6);
  float dn = normalize(cameraPosition - (fBase + vec3(0.0, yc, 0.0))).y, sc = 2.9 * aTree2.x * smoothstep(0.34, 0.64, dn);
  transformed = fBase + vec3((uv.x - 0.5) * sc, yc, (0.5 - uv.y) * sc);
}
vFarCol = uFarCol[fT] * (aTint.rgb * 1.9921875) * (0.82 + 0.36 * fract(aTree2.z * 13.7));

if (fT == 2) vFarCol = mix(vFarCol, uFarFall * (0.82 + 0.36 * fract(aTree2.z * 5.1)), uFall * smoothstep(0.12, 0.4, fract(aTree2.z * 7.31))) * mix(1.0, 0.55, uLeafOff);


vFarCol *= mix(vec3(1.0), uFarFix[fT].rgb, max(fFix, step(0.5, aTint.a)));

vFarCol = mix(vFarCol, vec3(0.2, 0.115, 0.055) * (0.8 + 0.4 * fract(aTree2.z * 5.1)), step(0.5, aTree2.w) * 0.9);
vFarCol = mix(vFarCol, vec3(0.022, 0.02, 0.018), step(1.5, aTree2.w));`).replace("#include <uv_vertex>",`#include <uv_vertex>

vMapUv = vec2((mod(aTree2.y + 0.5, 4.0) - 0.5 + (fract(aTree2.z * 7.0) < 0.5 ? uv.x : 1.0 - uv.x)) / 4.0, 1.0 - (floor((aTree2.y + 0.5) / 4.0) + 1.0 - uv.y) / 2.0);
if (position.z > 0.5) vMapUv = vec2((1.0 + floor((aTree2.y + 0.5) / 2.0) + uv.x) / 4.0, 1.0 - (2.0 + mod(floor(aTree2.y + 0.5), 2.0) + 1.0 - uv.y) / 4.0);`).replace("#include <project_vertex>",`float fDist = distance(cameraPosition.xz, fBase.xz); vFarFade = 1.0;
float fR = 1.0;
if (uFarNear.x > 0.0) {
  vFarFade = min(2.0 * clamp((fDist - (uFarNear.x - uFarNear.y)) / max(uFarNear.y, 0.01), 0.0, 1.0), 1.0);
  if (uA2C < 0.5) { fR = sqrt(vFarFade); vFarFade = step(0.0001, vFarFade); }
}
if (uFarReach.y > 0.0) {
  float k = fract(aTree2.z * 91.7 + 0.37), tall = smoothstep(8.0, 30.0, aTree.w);
  float D = fT == 4 ? mix(uFarReach.z, uFarReach.w, k) : mix(uFarReach.x, uFarReach.y, clamp(0.55 * k + 0.45 * tall, 0.0, 1.0));
  
  
  
  float fG = 1.0 - smoothstep(D * (1.0 - uFarFadeK), D, fDist);
  if (uA2C > 0.5) vFarFade *= fG; else fR *= sqrt(fG);
}
if (fR < 1.0) { vec3 fMid = fBase + vec3(0.0, 0.5 * aTree.w, 0.0); transformed = fMid + (transformed - fMid) * fR; if (fR <= 0.0) vFarFade = 0.0; }
if (vFarFade <= 0.0) transformed = fBase;
#include <project_vertex>`);sh.fragmentShader=sh.fragmentShader.replace("#include <common>","#include <common>\nvarying vec3 vFarCol; varying float vFarFade; uniform float uA2C;").replace("#include <clipping_planes_fragment>",`#include <clipping_planes_fragment>
if (uA2C < 0.5 && vFarFade < 1.0 && ${SCREEN_DITHER} >= vFarFade) discard;`).replace("#include <alphatest_fragment>",`#include <alphatest_fragment>
if (uA2C > 0.5 && vFarFade < 1.0) { diffuseColor.a *= clamp(vFarFade + ${A2C_DITHER}, 0.0, 1.0); if (diffuseColor.a <= 0.0) discard; }`).replace("#include <color_fragment>","diffuseColor.rgb *= vFarCol;")};mat.customProgramCacheKey=()=>"farforest";const q=new THREE.BufferGeometry;q.setAttribute("position",new THREE.Float32BufferAttribute([-.5,0,0,.5,0,0,.5,1,0,-.5,1,0,-.5,0,1,.5,0,1,.5,1,1,-.5,1,1],3));q.setAttribute("normal",new THREE.Float32BufferAttribute(new Array(8).fill([0,1,0]).flat(),3));q.setAttribute("uv",new THREE.Float32BufferAttribute([0,0,1,0,1,1,0,1,0,0,1,0,1,1,0,1],2));q.setIndex([0,1,2,0,2,3,4,5,6,4,6,7]);this.quad=q}addTile(key,rows,count=Math.floor(rows.length/FAR_STRIDE)){this.removeTile(key);const a=new Float32Array(count*4),b=new Float32Array(count*4),c8=new Uint8Array(count*4),lo=[1e9,1e9,1e9],hi=[-1e9,-1e9,-1e9];for(let i=0;i<count;i++){const o=i*FAR_STRIDE,x=rows[o]-this.W2,y=rows[o+2]||0,z=-(rows[o+1]-this.H2),h=Math.min(Math.max(rows[o+3]||1,.5),90),r=Math.min(Math.max(rows[o+4]||.3*h,.2),Math.max(.6*h,1.5),25);const t=Math.max(Math.round(rows[o+5]||0),0),ty=Math.min(t&7,4);a.set([x,y,z,h],4*i);b.set([r,ty,rows[o+6]||i*.6180339%1,Math.min(t>>3&3,2)],4*i);if(t&FAR_PHOTO){const[n,base]=this.base[ty],k=imageryCol(this.tint,base,n,...farRGB(rows[o+7]));c8.set([Math.min(Math.round(128*k.r/Math.max(base.r,1e-4)),255),Math.min(Math.round(128*k.g/Math.max(base.g,1e-4)),255),Math.min(Math.round(128*k.b/Math.max(base.b,1e-4)),255),255],4*i)}else c8.set([128,128,128,0],4*i);lo[0]=Math.min(lo[0],x-r);lo[1]=Math.min(lo[1],y);lo[2]=Math.min(lo[2],z-r);hi[0]=Math.max(hi[0],x+r);hi[1]=Math.max(hi[1],y+h);hi[2]=Math.max(hi[2],z+r)}const g=new THREE.InstancedBufferGeometry;g.index=this.quad.index;for(const k in this.quad.attributes)g.setAttribute(k,this.quad.attributes[k]);g.setAttribute("aTree",new THREE.InstancedBufferAttribute(a,4));g.setAttribute("aTree2",new THREE.InstancedBufferAttribute(b,4));g.setAttribute("aTint",new THREE.InstancedBufferAttribute(c8,4,true));g.instanceCount=count;const c=new THREE.Vector3((lo[0]+hi[0])/2,(lo[1]+hi[1])/2,(lo[2]+hi[2])/2);g.boundingSphere=new THREE.Sphere(c,count?Math.hypot(hi[0]-lo[0],hi[1]-lo[1],hi[2]-lo[2])/2:0);g.boundingBox=new THREE.Box3(new THREE.Vector3(...lo),new THREE.Vector3(...hi));const mesh=new THREE.Mesh(g,this.mat);mesh.matrixAutoUpdate=false;mesh.castShadow=false;mesh.receiveShadow=false;mesh.userData.count=count;mesh.userData.rows=rows;mesh.onBeforeRender=A2C_MASK;mesh.onAfterRender=A2C_UNMASK;this.tiles.set(key,mesh);this.group.add(mesh);this.count+=count;this.nearAt=null;return mesh}setNear(radius=120,cap=6e3,band=18){this.nearR=Math.max(radius,0);this.nearAt=null;this.band=Math.min(Math.max(band,.01),Math.max(this.nearR,.01));if(!this.nearR){this.uFarNear.value.set(0,this.band);this.uFarFixD.value.set(.001,.002);if(this.outer)this.outer.group.visible=false;return}this.uFarFixD.value.set(this.nearR+FAR_FIX_D[0],this.nearR+FAR_FIX_D[1]);this.uEdge||={value:new THREE.Vector3(1e9,18,1)};this.uEdge.value.set(this.nearR,this.band,1);if(!this.outer||this.outer.N<cap){if(this.outer)this.veg.group.remove(this.outer.group);const v=this.veg,man={...v.man,trees:{...v.man.trees||{},count:cap},__donors:null,__stems:null,__oakform:null,__treeshapes:null,__treecol:null};this.outer=new Vegetation(man,new ArrayBuffer(cap*v.stride*4),null,v.shared,{share:v,edge:this.uEdge});this.outer.skip.fill(1);this.outer.group.name="farForestNear";v.group.add(this.outer.group)}this.outer.group.visible=true;this.outer.maxDist=this.nearR;this.cap=cap;this.buf=new Float32Array(cap*FAR_STRIDE)}update(camera,frustum,sh){if(!this.nearR||!this.outer)return;const cx=camera.position.x,cz=camera.position.z;if(!this.nearAt||(cx-this.nearAt[0])**2+(cz-this.nearAt[1])**2>625){const R=this.nearR+30,R2=R*R,e0=cx+this.W2,n0=this.H2-cz,buf=this.buf;let n=0;for(const m of this.tiles.values()){const b=m.geometry.boundingBox;if(cx<b.min.x-R||cx>b.max.x+R||cz<b.min.z-R||cz>b.max.z+R)continue;const rows=m.userData.rows,cnt=m.userData.count;for(let i=0;i<cnt&&n<this.cap;i++){const o=i*FAR_STRIDE;if((rows[o]-e0)**2+(rows[o+1]-n0)**2<R2){buf.set(rows.subarray(o,o+FAR_STRIDE),n*FAR_STRIDE);if(!buf[n*FAR_STRIDE+6])buf[n*FAR_STRIDE+6]=i*.6180339%1||.5;n++}}}if(n>=this.cap&&!this.warned){this.warned=true;console.warn("far forest: more trees in the near tier than its cap ("+this.cap+"): the rest stay hidden cards")}this.outer.setRows(buf,n);this.nearN=n;this.nearAt=[cx,cz];this.uFarNear.value.set(this.nearR,this.band)}this.outer.update(camera,frustum,sh)}setReach({d0=0,d1=0,shrub=null,fade=.15}={}){this.uFarReach.value.set(d0,d1,shrub?shrub[0]:d0,shrub?shrub[1]:d1);this.uFarFadeK.value=Math.min(Math.max(fade,.01),.9)}setBurn(key,indices,state){const m=this.tiles.get(key);if(!m)return false;const b=m.geometry.attributes.aTree2,rows=m.userData.rows,st=Math.min(Math.max(Math.round(state),0),2);for(const i of indices)if(i>=0&&i<m.userData.count){b.array[4*i+3]=st;const o=i*FAR_STRIDE+5;rows[o]=(Math.max(Math.round(rows[o]||0),0)&39)+8*st}b.needsUpdate=true;this.nearAt=null;return true}removeTile(key){const m=this.tiles.get(key);if(!m)return false;this.group.remove(m);m.geometry.dispose();this.tiles.delete(key);this.count-=m.userData.count;this.nearAt=null;return true}}export class Vegetation{constructor(man,treeBuf,shrubBuf,shared,opts={}){this.man=man;this.shared=shared;this.uEdge=opts.edge||null;shared.uCamFade??={value:0};shared.uCamFadeStem??={value:0};this.group=new THREE.Group;this.treeGroup=new THREE.Group;this.shrubGroup=new THREE.Group;this.group.add(this.treeGroup,this.shrubGroup);this.species=man.species||[];this.useSprites=QS.get("sprites")!=="0";this.base=(QS.get("data")||"../web").replace(/\/+$/,"")+"/";this.uPheno={value:Array.from({length:16},()=>new THREE.Vector4(0,0,0,0))};this.uPhenoSpr={value:Array.from({length:16},()=>new THREE.Vector3)};this.species.forEach((s,i)=>{const p=PHENO[s];if(!p||i>=16)return;const f=desat(new THREE.Color(PAL_PHOTO&&PHENO_FALL_PHOTO[s]||p.fall),CHROMA_FALL),sp=desat(new THREE.Color(p.spring),CHROMA);this.uPheno.value[i].set(f.r,f.g,f.b,p.d);this.uPhenoSpr.value[i].set(sp.r,sp.g,sp.b);const mf=man.__treecol?.phenoFall?.[s];if(mf){const c=desat(new THREE.Color().setRGB(mf[0],mf[1],mf[2]),man.__treecol.desatFall??.85);this.uPheno.value[i].set(c.r,c.g,c.b,p.d)}});const sh0=opts.share||null;this.twigTex=sh0?sh0.twigTex:twigTexture();this.noiseTex=sh0?sh0.noiseTex:noiseTexture3D();this.famTex=sh0?sh0.famTex:{};this.uSpT={value:Array.from({length:16},(_,i)=>new THREE.Vector4(...TRUNK_OF[this.species[i]]||[1,.4,0,2]))};this.uBarkTile={value:Array.from({length:8},(_,i)=>new THREE.Vector2(...BARK_TILE[i]||[1,1]))};const grey=new THREE.DataArrayTexture(new Uint8Array(4*BARK_TILE.length).fill(90),1,1,BARK_TILE.length);grey.needsUpdate=true;this.uBarkTex={value:grey};if(sh0){this.uBarkTex=sh0.uBarkTex;this.uBarkTile=sh0.uBarkTile;this.barkBaked=true}this.uBarkPaint=sh0?sh0.uBarkPaint:{value:new THREE.Color("#55adc0")};this.barkPaint=this.uBarkPaint.value;const bover={};if(!sh0)for(let L=0;L<BARK_TILE.length;L++){const u=QS.get(L?"barkimg"+L:"barkimg");if(u)bover[L]=u}if(Object.keys(bover).length){this.barkOver={ready:false};const ld=new THREE.TextureLoader,get=u=>new Promise(res=>ld.load(u,res,void 0,()=>res(null)));Promise.all(Object.entries(bover).map(([L,u])=>Promise.all([get(u+".png"),QS.get(+L?"barkh"+L:"barkh")==="0"?null:get(u+"_height.png")]).then(([c,h])=>{if(c){c.colorSpace=THREE.SRGBColorSpace;c.wrapS=c.wrapT=THREE.RepeatWrapping;const w=+(QS.get(+L?"barkw"+L:"barkw")||(+L?BARK_TILE[L][0]:.9));this.uBarkTile.value[L].set(w,w*c.image.height/c.image.width)}if(h)h.wrapS=h.wrapT=THREE.RepeatWrapping;return[L,{c,h}]}))).then(es=>{this.barkOver={ready:true,layers:Object.fromEntries(es)}})}this.shrubNear=SHRUB_NEAR;this.shrubFar=SHRUB_DIST;this.uShrubEdge={value:new THREE.Vector3(SHRUB_DIST,40,0)};this.showLimbs=QS.get("limbs")!=="0";this.sets=[];this.initTrees(treeBuf);if(shrubBuf)this.initShrubs(shrubBuf);this.roadsCleared=this.SN&&QS.get("roadveg")!=="0"?this.clearRoads():Promise.resolve(null);for(const st of this.sets)if(!st.mesh.castShadow){const pre=st.mesh.onBeforeRender;st.mesh.onBeforeRender=(r,...a)=>{this.renderer=r;pre.call(st.mesh,r,...a)}}}textures(name,seed){return this.famTex[name]||(this.famTex[name]=familyTextures(FAMILIES[name],this.base,seed,this.useSprites))}setStemHidden(rows){if(!this.stemHide)return;for(let i=0;i<this.stemHide.length;i++)if(this.stemHide[i]===255)this.stemHide[i]=0;for(const i of rows)if(i>=0&&i<this.N)this.stemHide[i]=255;this.stemHideTex.needsUpdate=true;if(this.renderer)this.renderer.shadowMap.needsUpdate=true}setBarkPaint(rows,k=1){if(!this.stemHide)return;const b=Math.round(254*Math.min(Math.max(k,0),1));for(const i of rows)if(i>=0&&i<this.N&&this.stemHide[i]!==255)this.stemHide[i]=b;this.stemHideTex.needsUpdate=true}setHeroHidden(rows,mode=1){for(const i of rows)if(i>=0&&i<this.N)this.heroSkip[i]=mode;if(this.renderer)this.renderer.shadowMap.needsUpdate=true}setRows(rows,count){const D=this.treeTex.image.data,T=this.T,W2=this.man.W/2,H2=this.man.H/2,n=Math.min(count,this.N),tb=[.083,.25,.417,.583,.75,.917],col=new THREE.Color;const spOf=FAR_SPECIES.map(sp=>Math.max(this.species.indexOf(sp),0)),cbK=[.45,.25,.4,.2,.15],base=new THREE.Color;const prOf=[0,1].map(c=>{const p=tb.map(t=>c===0?(1-t)*.95+.05:Math.sqrt(Math.max(Math.sin(Math.PI*(.12+.8*t)),0))),m=Math.max(...p);return p.map((v,k)=>c===0?.55*Math.max(v/m,.12)+.45*(1-.82*tb[k]):.7*Math.max(v/m,.12)+.3*Math.sqrt(Math.max(Math.sin(Math.PI*(.18+.78*tb[k])),0)))});for(let i=0;i<this.N;i++){if(i>=n){this.skip[i]=1;continue}const q=i*FAR_STRIDE,o=i*32,t8=Math.max(Math.round(rows[q+5]||0),0),burn=Math.min(t8>>3&3,2),photo=t8&FAR_PHOTO,ty=Math.min(t8&7,4),spi=spOf[ty],name=this.species[spi]||"",cls=clsOf(name);const h=Math.min(Math.max(rows[q+3]||1,1),90),r=Math.min(Math.max(rows[q+4]||.25*h,.3),Math.max(.6*h,1.5),25);let seed=rows[q+6]||i*.6180339%1;if(burn)seed=(Math.floor(seed*7.31)+.004)/7.31;const cbh=Math.min(!photo&&rows[q+7]>0?rows[q+7]:cbK[ty]*h,.9*h),x=rows[q]-W2,z=-(rows[q+1]-H2),u=rows[q+2]||0;const kc=DBH_CURVE[name]||[.12,.02],dbh=.75*.7*(kc[0]+kc[1]*h)+.25*.03;const j1=.82+.36*(seed*7.31%1),j2=(seed*13.7%1-.5)*.12;base.set(PAL_PHOTO&&NATURAL_PHOTO[name]||NATURAL[name]||"#4a5a32");if(photo)imageryCol(col,base,name,...farRGB(rows[q+7]));else col.copy(base);col.multiplyScalar(j1);col.r*=.9*(1+j2);col.b*=1-j2;if(!PAL_PHOTO)desat(col,CHROMA);if(burn===1)col.setRGB(.2,.115,.055).multiplyScalar(.6*j1);else if(burn===2)col.setRGB(.014,.013,.012);const cc=new THREE.Color(CATEGORY[name]||"#888888"),pr=prOf[cls===0?0:1];D.set([x,u,z,h,cbh,r,dbh,seed,r,r,r,r,r,r,r,r,pr[0],pr[1],pr[2],pr[3],pr[4],pr[5],0,0,col.r,col.g,col.b,spi,cc.r,cc.g,cc.b,cls],o);this.X[i]=x;this.Y[i]=u;this.Z[i]=z;this.Hh[i]=h;this.Rb[i]=r;this.Cb[i]=cbh;this.cls[i]=cls;this.Ra[i]=r;this.Sp[i]=spi;this.Seed[i]=seed;this.Col.set([col.r,col.g,col.b],3*i);this.CatCol.set([cc.r,cc.g,cc.b],3*i);this.fam[i]=this.spFam[spi]??0;this.skip[i]=0;const fo=i*this.stride,I=this.I;this.raw[fo+I.e]=rows[q];this.raw[fo+I.n]=rows[q+1];this.raw[fo+I.u]=u;this.raw[fo+I.h]=h;this.raw[fo+I.cbh]=cbh;this.raw[fo+I.sp]=spi;this.raw[fo+I.id]=98e4+i}if(T)T.set(D.subarray(0,T.length));this.limbOf.fill(0);this.oakF.fill(0);this.treeTex.needsUpdate=true;this.oakTex.needsUpdate=true;if(LIMB)this.syncLimb();else this.limbVer=this.treeTex.version;this.fader.w.fill(0);this.fader.tex.needsUpdate=true;this.camPrev=null;if(this.renderer)this.renderer.shadowMap.needsUpdate=true}setShrubReach(near=SHRUB_NEAR,far=SHRUB_DIST){this.shrubNear=Math.max(near,5);this.shrubFar=Math.max(far,this.shrubNear+45);this.uShrubEdge.value.set(this.shrubFar,40,0);if(this.renderer)this.renderer.shadowMap.needsUpdate=true}farForest(){if(!this._far){this._far=new FarForest(this);this.group.add(this._far.group)}return this._far}farTest(){const rows=new Float32Array(this.N*FAR_STRIDE),D=this.treeTex.image.data;let n=0;for(let i=0;i<this.N;i++){if(this.skip[i]||this.heroSkip[i]===1||this.cls[i]===2)continue;const o=i*32;rows.set([D[o]+this.man.W/2,this.man.H/2-D[o+2],D[o+1],D[o+3],D[o+5],FAR_TYPE_OF[this.species[this.Sp[i]]]??2,D[o+7],D[o+4]],n++*FAR_STRIDE)}this.farForest().addTile("fartest",rows,n);this.treeGroup.visible=false;if(QS.get("fartest")==="2")this._far.setNear(+(QS.get("farnear")||120));return n}syncLimb(){const D=this.treeTex.image.data,T=this.T,tb=[.083,.25,.417,.583,.75,.917];const cm=o=>[(.707*D[o+9]+D[o+10]+.707*D[o+11]-.707*D[o+13]-D[o+14]-.707*D[o+15])*.25,(-D[o+8]-.707*D[o+9]+.707*D[o+11]+D[o+12]+.707*D[o+13]-.707*D[o+15])*.25];let changed=false;this.nLimb=[0,0,0,0,0];const W2=this.man.W/2,H2=this.man.H/2,F=this.raw,I=this.I,fin=Number.isFinite,recOf=new Map,rad=Math.PI/180;if(this.shapes.length){if(!this.idRow){this.idRow=new Map;for(let i=0;i<this.N;i++)this.idRow.set(F[i*this.stride+I.id],i)}for(const r of this.shapes){const i=this.idRow.get(r.id);if(i===void 0||this.heroSkip[i]===1)continue;const o=i*32,fo=i*this.stride;recOf.set(i,r);changed=true;const sp=r.species?this.species.indexOf(r.species):-1;if(sp>=0&&sp!==this.Sp[i]){let j=-1;for(let k=0;k<this.N&&j<0;k++)if(this.Sp[k]===sp&&!this.skip[k]&&!this.donorRow[k]&&Math.round(F[k*this.stride+I.sp])===sp)j=k;if(j>=0){const b=j*32;for(const k of[16,17,18,19,20,21,24,25,26,27,28,29,30,31])D[o+k]=D[b+k];this.cls[i]=this.cls[j];this.Sp[i]=sp;if(this.fam)this.fam[i]=this.fam[j];F[fo+I.sp]=sp;this.Col.set(this.Col.subarray(3*j,3*j+3),3*i);this.CatCol.set(this.CatCol.subarray(3*j,3*j+3),3*i);this.limbOf[i]=0;this.oakF[i]=0}}if(fin(r.h)){D[o+3]=this.Hh[i]=F[fo+I.h]=Math.max(r.h,1)}const h=D[o+3];if(fin(r.cbh)){D[o+4]=this.Cb[i]=F[fo+I.cbh]=Math.min(Math.max(r.cbh,0),.9*h)}if(r.radii){let rs=0,rb=0;for(let k=0;k<8;k++){const v=Math.min(Math.max(+r.radii[k]||.3,.3),25);D[o+8+k]=F[fo+I.r0+k]=v;rs+=v;rb=Math.max(rb,v)}D[o+5]=this.Ra[i]=rs/8;this.Rb[i]=rb}if(fin(r.dbh)&&D[o+6]>.002)D[o+6]=r.dbh;if(fin(r.fallTurn)){const want=.08+.6*Math.min(Math.max(r.fallTurn,0),1),s0=D[o+7],tr=(s0*7.31%1+1)%1;let s1=s0+(want-tr)/7.31;if(s1<0)s1+=1/7.31;D[o+7]=this.Seed[i]=s1}if(fin(r.u)){D[o+1]=this.Y[i]=r.u}let top=r.top;const ax=this.cls[i]!==1&&fin(r.leanDeg)&&fin(r.leanAz)?[Math.tan(Math.min(Math.abs(r.leanDeg),30)*rad)*Math.sin(r.leanAz*rad),Math.tan(Math.min(Math.abs(r.leanDeg),30)*rad)*Math.cos(r.leanAz*rad)]:null;if(!top&&r.stem&&ax)top=[r.stem[0]+h*ax[0],r.stem[1]+h*ax[1]];if(top){D[o]=this.X[i]=top[0]-W2;D[o+2]=this.Z[i]=-(top[1]-H2);F[fo+I.e]=top[0];F[fo+I.n]=top[1]}if(r.stem){const c=this.cls[i]===1?cm(o):[0,0];D[o+22]=(D[o]+.45*c[0]-(r.stem[0]-W2))/h;D[o+23]=(D[o+2]+.45*c[1]+(r.stem[1]-H2))/h}else if(ax){D[o+22]=ax[0];D[o+23]=-ax[1]}if(T)for(let k=0;k<32;k++)T[o+k]=D[o+k]}}for(let i=0;i<this.N;i++){if(!LIMB)break;const o=i*32,h=D[o+3],rec=recOf.get(i);let lf0=LIMB_OF[FAMILY_OF[this.species[this.Sp[i]]]]||0;if(lf0===4&&!LIMB_PINE)lf0=0;const lform=lf0&&this.cls[i]===(lf0===4?0:1)&&h>=LIMB_MIN_H&&!this.donorRow[i]&&!(this.uPheno.value[Math.round(D[o+27])]?.w>1.5)?lf0:0;this.nLimb[lform]++;const flag=!lform?0:lform===4?64:(rec&&rec.clump!==null?rec.clump:lform===2)?128:255;if(this.oakF[i]!==flag){this.oakF[i]=flag;changed=true}if(lform===this.limbOf[i])continue;changed=true;this.limbOf[i]=lform;if(!lform)continue;if(lform===4){tb.forEach((t,k)=>{D[o+16+k]=t<.4?.5+.5*Math.sin(Math.PI/2*t/.4):Math.sqrt(1-((t-.4)/.68)**2)});if(T)for(let k=16;k<22;k++)T[o+k]=D[o+k];continue}const c0=cm(o),fl=rec?.radii?0:(lform===2?.16:.14)*h*LIMB_FLOOR;let rs=0,rb=0;for(let k=8;k<16;k++){D[o+k]=Math.max(D[o+k],Math.min(fl,D[o+k]+1.5));rs+=D[o+k];rb=Math.max(rb,D[o+k])}D[o+5]=rs/8;this.Ra[i]=rs/8;this.Rb[i]=rb;const c1=cm(o);D[o+22]+=.45*(c1[0]-c0[0])/h;D[o+23]+=.45*(c1[1]-c0[1])/h;tb.forEach((t,k)=>{D[o+16+k]=lform===2?t<.3?.8+.2*t/.3:CANOPY?Math.pow(Math.max(1-((t-.3)/.7)**2,0),.75):Math.sqrt(1-((t-.3)/.72)**2):t<.38?.62+.38*Math.sin(Math.PI/2*t/.38):CANOPY?Math.pow(Math.max(1-((t-.38)/.62)**2,0),.75):Math.sqrt(1-((t-.38)/.66)**2)});if(T)for(let k=5;k<24;k++)T[o+k]=D[o+k]}if(this.limbRec&&recOf.size){const L=this.limbRec.image.data;L.fill(0);for(const[i,r]of recOf){if(!this.limbOf[i]||this.limbOf[i]===4)continue;const o=i*32,q=i*64,h=D[o+3],cbh=D[o+4],clen=Math.max(h-cbh,.5),lx=D[o+22],lz=D[o+23],c=cm(o);const froms=r.limbs.map(l=>l.from).filter(fin),fH=fin(r.forkH)?r.forkH:froms.length?Math.min(...froms):NaN;const yF=fin(fH)?Math.min(Math.max(fH,.5),.8*h):this.oakF[i]===128?Math.min(Math.max(.5*cbh,.8),2.4):Math.min(Math.max(.5*cbh,1.8),Math.max(.3*h,1.8));const kf=(yF+.8)/(cbh+.3*clen+.8),hasLean=fin(r.leanDeg)&&fin(r.leanAz),tl=hasLean?Math.tan(Math.min(Math.abs(r.leanDeg),45)*rad)*yF:0;const fk=hasLean?[.45*c[0]+tl*Math.sin(r.leanAz*rad)-yF*lx,.45*c[1]-tl*Math.cos(r.leanAz*rad)-yF*lz]:[c[0]*(.45+.35*kf),c[1]*(.45+.35*kf)];const env=(x,z,t)=>{let az=Math.atan2(x,-z);if(az<0)az+=2*Math.PI;const sA=az*4/Math.PI,j0=Math.floor(sA)&7,fr=sA-Math.floor(sA),u=Math.min(Math.max(t,.083),.917)*6-.5,k0=Math.min(Math.floor(u),4);return(D[o+8+j0]+(D[o+8+(j0+1&7)]-D[o+8+j0])*fr)*(D[o+16+k0]+(D[o+17+k0]-D[o+16+k0])*(u-k0))};L.set([r.limbs.length,fin(fH)?yF:0,fk[0],fk[1],r.clump?2:1,hasLean?1:0,0,0],q);let e0=null;r.limbs.forEach((l,k)=>{const a=l.az*rad,dx=Math.sin(a),dz=-Math.cos(a),y=Math.min(Math.max(l.h,yF+.5),h),from=k&&e0&&fin(l.from)?Math.min(Math.max((l.from-yF)/Math.max(e0[1]-yF,.5),0),.85):0;const sx=fk[0]+(e0?from*(e0[0]-fk[0]):0),sz=fk[1]+(e0?from*(e0[2]-fk[1]):0),ys=yF+(e0?from*(e0[1]-yF):0);let e=[sx+l.reach*dx-(y-ys)*lx,y,sz+l.reach*dz-(y-ys)*lz],via=null;if(y<cbh+.2*clen){via=e;const t=k?.5+.25*(k*.618%1):.86,ye=cbh+t*clen,grow=(ye-ys)/Math.max(y-ys,.5);let ex=sx+l.reach*dx*Math.min(grow,2.2),ez=sz+l.reach*dz*Math.min(grow,2.2);const rr=Math.hypot(ex,ez),R=(k?.62:.3)*env(ex,ez,t);if(rr>R){ex*=R/rr;ez*=R/rr}e=[ex,ye,ez]}if(!k)e0=e;L.set([e[0],e[1],e[2],k&&fin(l.from)?Math.max(l.from,yF):0],q+8+4*k);if(via)L.set([via[0],via[1],via[2],1],q+32+4*k)})}this.limbRec.needsUpdate=true}if(changed){this.treeTex.needsUpdate=true;this.oakTex.needsUpdate=true;if(this.renderer)this.renderer.shadowMap.needsUpdate=true}this.limbVer=this.treeTex.version}fillCount(renderer,scene,camera){if(!FILL_DBG)return null;const gl=renderer.getContext(),w=gl.drawingBufferWidth,h=gl.drawingBufferHeight,px=new Uint8Array(w*h*4),out={};const vis=new Map,mats=new Map,bg=scene.background,cc=renderer.getClearColor(new THREE.Color),ca=renderer.getClearAlpha(),sh=renderer.shadowMap.enabled;scene.traverse(o=>{if(o.isMesh||o.isPoints||o.isLine||o.isSprite){vis.set(o,o.visible);o.visible=false}});for(const s of this.sets){const m=s.mesh.material;if(!m.map||!m.defines?.FILL_DBG||s.mesh.castShadow)continue;s.mesh.visible=s.n>0;if(!mats.has(m)){mats.set(m,[m.blending,m.transparent,m.depthTest,m.depthWrite,m.alphaToCoverage]);m.blending=THREE.AdditiveBlending;m.transparent=true;m.depthTest=false;m.depthWrite=false;m.alphaToCoverage=false;m.needsUpdate=true}}scene.background=null;renderer.setClearColor(0,1);renderer.shadowMap.enabled=false;for(const[mode,name]of[[1,"rasterized"],[2,"passed"]]){uFillDbg.value=mode;renderer.setRenderTarget(null);renderer.clear();renderer.render(scene,camera);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,px);let n=0;for(let i=0;i<px.length;i+=4)n+=px[i];out[name]=+(n/1e6).toFixed(2)}uFillDbg.value=0;scene.background=bg;renderer.setClearColor(cc,ca);renderer.shadowMap.enabled=sh;for(const[m,v]of mats){[m.blending,m.transparent,m.depthTest,m.depthWrite,m.alphaToCoverage]=v;m.needsUpdate=true}for(const[o,v]of vis)o.visible=v;out.screen=+(w*h/1e6).toFixed(2);return out}setLimbs(on){this.showLimbs=!!on}rowOfId(id){const s=this.stride,k=this.I.id,F=this.raw;for(let i=0;i<this.N;i++)if(F[i*s+k]===id)return i;return-1}heroCrown(mesh,row,{castShadow=true,porous=.25}={}){const g=mesh.geometry,n=g.attributes.position.count,map=mesh.material.map||null;g.setAttribute("aIdx",new THREE.BufferAttribute(new Float32Array(n).fill(row),1));if(!g.attributes.aK)g.setAttribute("aK",g.attributes.uv1||new THREE.BufferAttribute(new Float32Array(2*n).fill(.87),2));if(map?.image&&map.image.width===map.image.height&&!map.userData.heroMips){const[c,cx]=canvas2d(map.image.width);cx.drawImage(map.image,0,0);setLevels(map,c);map.generateMipmaps=false;map.minFilter=THREE.LinearMipmapLinearFilter;map.anisotropy=4;map.userData.heroMips=true}const m=makeMaterials(GLSL_HERO,{SHADOW_PUSH:"1.6",FLUTTER:1,CARDS:1,POROUS:1,POROUS_F:"0.3"},this.uniforms(this.treeTex,{uShade:{value:1.65},uForm:{value:new THREE.Vector4(...FORM[1],1)},uTop:{value:TOP_ALB.cards[1]},uNoise:{value:this.noiseTex},uPorous:{value:porous}}),{map,doubleSide:true,foliage:true,key:"veghero"});mesh.material=m.mat;mesh.customDepthMaterial=m.depth;mesh.castShadow=castShadow;mesh.receiveShadow=true;mesh.onBeforeRender=A2C_MASK;mesh.onAfterRender=A2C_UNMASK;return mesh}uniforms(tex,extra){const S=this.shared;return Object.assign({uWindPx,uWindK,...this.uEdge?{uEdge:this.uEdge}:{},uTT:{value:tex},uOakF:{value:this.oakTex||null},uExag:S.uExag,uTime:S.uTime,uWind:S.uWind,uSpc:S.uSpc,uSunDir:S.uSunDir,uCamFade:S.uCamFade,uCamFadeStem:S.uCamFadeStem,uShade:{value:1},uDense:{value:1},uCardTop:{value:1},uTop:{value:1},uFall:S.uFall||{value:0},uLeafOff:S.uLeafOff||{value:0},uSpring:S.uSpring||{value:0},uPheno:this.uPheno,uPhenoSpr:this.uPhenoSpr,uTwig:{value:this.twigTex}},extra)}initTrees(buf){const man=this.man,tm=man.trees||{},stride=tm.stride||32;const F=new Float32Array(buf),N=Math.min(tm.count??Infinity,Math.floor(F.length/stride));const f=tm.fields||[];const fi=(name,def2)=>{const i=f.indexOf(name);return i>=0?i:def2};const I={e:fi("e",0),n:fi("n",1),u:fi("u",2),h:fi("h",3),cbh:fi("cbh",4),cd:fi("cd",5),dbh:fi("dbh",6),ld:fi("lean_deg",7),la:fi("lean_az",8),r0:fi("rN",9),p0:fi("p0",17),sp:fi("species",23),conf:fi("conf",24),r:fi("r",25),seed:fi("seed",28),leafoff:fi("leafoff",29),id:fi("id",30),fl:fi("flags",fi("reserved",31))};const flag=i=>Math.round(F[i*stride+I.fl])||0,FL={hidden:1,crownOnly:2,dbh:4,one:8,foot:16,multi:32,done:64,donorWood:128};this.FL=FL;this.rowFlag=flag;const noStem=[];let finished=false;for(let i=0;i<N&&!finished;i++)finished=flag(i)!==0;this.N=N;this.raw=F;this.stride=stride;this.I=I;this.oakF=new Uint8Array(PER_ROW*Math.max(1,Math.ceil(N/PER_ROW)));this.oakTex=new THREE.DataTexture(this.oakF,PER_ROW,this.oakF.length/PER_ROW,THREE.RedFormat,THREE.UnsignedByteType);this.oakTex.minFilter=this.oakTex.magFilter=THREE.NearestFilter;this.oakTex.generateMipmaps=false;this.oakTex.unpackAlignment=1;this.limbOf=new Uint8Array(N);this.nLimb=[0,0,0,0,0];this.donorRow=new Uint8Array(N);{const S=man.__treeshapes,fin2=Number.isFinite,pair=v=>Array.isArray(v)&&v.length===2&&fin2(v[0])&&fin2(v[1])?v:null;this.shapes=(Array.isArray(S)?S:S?.trees||[]).filter(r=>r&&fin2(r.row??r.tree_id)).map(r=>({id:r.row??r.tree_id,species:r.species||null,stem:pair(r.stem),top:pair(r.top),u:r.u,dbh:r.dbh,fallTurn:r.fall?.turn,h:r.h??r.crown?.top_h,cbh:r.crown?.base_h,radii:r.crown?.r8?.length===8?r.crown.r8:null,leanDeg:r.lean?.deg,leanAz:r.lean?.az,clump:r.form?r.form==="clump":null,forkH:r.fork_h,limbs:(r.limbs||[]).map(l=>({az:l.az,reach:l.reach,from:l.from_h,h:fin2(l.h)?l.h:fin2(l.elev)&&fin2(l.reach)?(fin2(l.from_h)?l.from_h:r.fork_h)+l.reach*Math.tan(l.elev*Math.PI/180):NaN})).filter(l=>fin2(l.az)&&fin2(l.reach)&&fin2(l.h)).sort((a,b)=>b.h-a.h).slice(0,6)}))}if(this.shapes.length&&LIMB)this.limbRec=dataTexture(new Float32Array(0),N,16);const oakRows=this.man.__oakform?.rows||[];if(oakRows.length){const at=new Map;for(let i=0;i<N;i++)at.set(F[i*stride+I.id],i);for(const d of oakRows){const i=at.get(d.tree_id),ov=d.row_override;if(i===void 0||!ov||flag(i)&FL.done)continue;const o=i*stride;for(const k of["h","cbh","cd","dbh"])if(Number.isFinite(ov[k]))F[o+I[k]]=ov[k];if(ov.radii?.length===8)for(let k=0;k<8;k++)F[o+I.r0+k]=ov.radii[k];if(ov.prof?.length===6)for(let k=0;k<6;k++)F[o+I.p0+k]=ov.prof[k]}}const heroOv=new Map;for(const d of this.man.__donors?.list||[]){const ov=d.row_override;if(!ov)continue;for(let i=0;i<N;i++)if(F[i*stride+I.id]===d.tree_id){const o=i*stride;heroOv.set(i,ov);if(flag(i)&FL.done)break;for(const k of["e","n","h","cbh","cd"])if(Number.isFinite(ov[k]))F[o+I[k]]=ov[k];if(ov.radii?.length===8)for(let k=0;k<8;k++)F[o+I.r0+k]=ov.radii[k];if(ov.prof?.length===6)for(let k=0;k<6;k++)F[o+I.p0+k]=ov.prof[k];if(Number.isFinite(ov.lean_deg))F[o+I.ld]=ov.lean_deg;if(Number.isFinite(ov.lean_az))F[o+I.la]=ov.lean_az;break}}const stemOv=new Map;for(const[k,v]of Object.entries(this.man.__stems||{}))stemOv.set(+k,{e:v[0],n:v[1],hide:false});for(const d of this.man.__donors?.list||[])stemOv.set(d.tree_id,{e:d.base_enu[0],n:d.base_enu[1],u:d.base_enu[2],hide:true});this.nStemOv=0;const W2=man.W/2,H2=man.H/2,ns=this.species.length;const T=new Float32Array(N*32);this.X=new Float32Array(N);this.Y=new Float32Array(N);this.Z=new Float32Array(N);this.Hh=new Float32Array(N);this.Rb=new Float32Array(N);this.Cb=new Float32Array(N);this.cls=new Uint8Array(N);this.Ra=new Float32Array(N);this.Sp=new Uint8Array(N);this.Seed=new Float32Array(N);this.Col=new Float32Array(N*3);this.CatCol=new Float32Array(N*3);this.skip=new Uint8Array(N);this.heroSkip=new Uint8Array(N);for(const l of this.man.__oakform?.lobes||[]){const i=this.rowOfId(l.tree_id);if(i>=0)this.heroSkip[i]=1}this.lodOverride=null;const nat=this.species.map(s=>new THREE.Color(PAL_PHOTO&&NATURAL_PHOTO[s]||NATURAL[s]||"#4a5a32"));const cat=this.species.map((s,i)=>new THREE.Color(CATEGORY[s]||"#"+fallbackHue(i,ns)));const def=new THREE.Color("#4a5a32"),col=new THREE.Color;const tb=[.083,.25,.417,.583,.75,.917];const fin=v=>Number.isFinite(v)?v:0;const slot={};let nVirt=0;const vslot=(base,tag)=>{const key=base+":"+tag;if(key in slot)return slot[key];const k=this.species.length+nVirt;if(k>=16)return slot[key]=base;nVirt++;this.uPheno.value[k].copy(this.uPheno.value[base]);this.uPhenoSpr.value[k].copy(this.uPhenoSpr.value[base]);this.uSpT.value[k].copy(this.uSpT.value[base]);if(tag==="one")this.uSpT.value[k].w=1;else this.uPheno.value[k].w=2;return slot[key]=k};const iBlue=this.species.indexOf("blue_oak"),iSnag=this.species.indexOf("snag");let inSavanna=()=>false;if(iBlue>=0&&iSnag>=0){const hard=new Set(["black_oak","live_oak","other_hardwood","blue_oak","madrone"].map(s=>this.species.indexOf(s))),C=30,cells=new Map;const key=(a,b)=>(a+512)*2048+b+512,at=(j,k)=>F[j*stride+k];for(let j=0;j<N;j++)if(hard.has(Math.round(at(j,I.sp)))){const k=key(Math.floor(at(j,I.e)/C),Math.floor(at(j,I.n)/C));(cells.get(k)||cells.set(k,[]).get(k)).push(j)}inSavanna=(e,n)=>{let nb=0,nh=0;for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)for(const j of cells.get(key(Math.floor(e/C)+a,Math.floor(n/C)+b))||[]){if(Math.hypot(at(j,I.e)-e,at(j,I.n)-n)>C)continue;nh++;if(Math.round(at(j,I.sp))===iBlue)nb++}return nb>=2&&nb>=.6*nh}}this.nLeaflessBlue=0;for(let i=0;i<N;i++){const o=i*stride,g=k=>F[o+k];const spData=Math.max(0,Math.round(fin(g(I.sp)))),id=fin(g(I.id));const leaflessBlue=spData===iSnag&&(finished?!!(flag(i)&256):fin(g(I.conf))<.5&&inSavanna(g(I.e),g(I.n)));this.nLeaflessBlue+=leaflessBlue;const spi=leaflessBlue?iBlue:spData,name=this.species[spi]||"";const cls=clsOf(name);const fl=flag(i),done=!!(fl&FL.done);let h=Math.max(fin(g(I.h)),1);let cbh=Math.min(Math.max(fin(g(I.cbh)),0),h*.9);if(!done&&h-cbh<.8)cbh=h*.4;const cd=fin(g(I.cd))>.2?g(I.cd):Math.max(1.5,h*.3);if(OAKFORM&&name==="black_oak"&&cls===1&&h>=8&&cbh>=2)this.oakF[i]=255;const r8=[];let rs=0,rn=0;for(let k=0;k<8;k++){const v=fin(g(I.r0+k));r8.push(v);if(v>.05){rs+=v;rn++}}const rFill=rn?rs/rn:cd/2;for(let k=0;k<8;k++)r8[k]=done&&r8[k]>0?r8[k]:Math.min(Math.max(r8[k]>.05?r8[k]:rFill,.3),25);const ravg=r8.reduce((a,b)=>a+b,0)/8;let pr=[];let pmax=0;for(let k=0;k<6;k++){const v=fin(g(I.p0+k));pr.push(v);pmax=Math.max(pmax,v)}if(pmax<.15)pr=tb.map(t2=>cls===0?(1-t2)*.95+.05:Math.sqrt(Math.max(Math.sin(Math.PI*(.12+.8*t2)),0))),pmax=Math.max(...pr);pr=pr.map(v=>Math.max(v/pmax,.12));if(cls===0)pr=pr.map((v,k)=>.55*v+.45*(1-.82*tb[k]));else if(cls===1)pr=pr.map((v,k)=>.7*v+.3*Math.sqrt(Math.max(Math.sin(Math.PI*(.18+.78*tb[k])),0)));if(cls===2)pr=pr.map(()=>.3);const ld=Math.min(Math.abs(fin(g(I.ld))),done?31:18)*Math.PI/180,la=fin(g(I.la))*Math.PI/180,tl=Math.tan(ld);let seed=fin(g(I.seed))||i*.6180339%1;const tcRow=this.man.__treecol?.rows?.[i],hov=heroOv.get(i),hFall=Number.isFinite(hov?.fall)?hov.fall:-1;if(hFall>=0||tcRow&&tcRow[3]>=0){const want=Math.min(Math.max((hFall>=0?hFall:tcRow[3])/(.85*1.18),0),.95);const tr=want<.15?want/.5:want<.3?want<.225?.299:.3:want<.705?.3+(want-.3)/.9:want<.8?want<.7525?.7499:.75:Math.min(.75+(want-.8)/.6,.999);seed=(Math.floor(seed*7.31)+tr)/7.31;if(hFall>=0){let bs=-1;for(let k=0;k<7;k++){const s=(k+tr)/7.31,sc=(s*3.3%1<.45?1:0)+s*5.1%1;if(sc>bs){bs=sc;seed=s}}}}let x=g(I.e)-W2,z=-(g(I.n)-H2),u=fin(g(I.u));let leanX=tl*Math.sin(la),leanZ=-tl*Math.cos(la),hideTrunk=false;const so=stemOv.get(id);if(so&&done){hideTrunk=so.hide;this.nStemOv++;if(so.hide)this.donorRow[i]=1}else if(so){const xs=so.e-W2,zs=-(so.n-H2),LMAX=.36;const bk=cls===1?.25*.45:0;const box=bk*(.707*r8[1]+r8[2]+.707*r8[3]-.707*r8[5]-r8[6]-.707*r8[7]);const boz=bk*(-r8[0]-.707*r8[1]+.707*r8[3]+r8[4]+.707*r8[5]-.707*r8[7]);let lx=(x+box-xs)/h,lz=(z+boz-zs)/h;const lm=Math.hypot(lx,lz);if(lm>LMAX){const k=LMAX/lm;x=xs+(x-xs)*k;z=zs+(z-zs)*k;lx*=k;lz*=k}leanX=lx;leanZ=lz;hideTrunk=so.hide;this.nStemOv++;if(so.hide)this.donorRow[i]=1;if(Number.isFinite(so.u))u=so.u}const base=nat[spi]||def;const ir=srgbToLin(Math.min(Math.max(fin(g(I.r)),0),1)),ig=srgbToLin(Math.min(Math.max(fin(g(I.r+1)),0),1)),ib=srgbToLin(Math.min(Math.max(fin(g(I.r+2)),0),1));const j1=.82+.36*(seed*7.31%1),j2=(seed*13.7%1-.5)*.12;imageryCol(col,base,name,ir,ig,ib).multiplyScalar(j1);col.r*=.9*(1+j2);col.b*=1-j2;if(!PAL_PHOTO)desat(col,CHROMA);if(tcRow){col.setRGB(tcRow[0],tcRow[1],tcRow[2]).multiplyScalar(.94+.12*(seed*5.77%1));desat(col,this.man.__treecol.desat??.9)}if(hov?.col?.length===3)col.setRGB(hov.col[0],hov.col[1],hov.col[2]);const cc=cat[spData]||def;const t=T.subarray(i*32,i*32+32);const kc=DBH_CURVE[name]||[.12,.02],curve=kc[0]+kc[1]*h,d0=Math.max(fin(g(I.dbh)),.03);const surveyed=SURVEYED(id)&&name!=="tall_shrub";const dbh=hideTrunk||fl&FL.crownOnly?.001:fl&FL.dbh&&fin(g(I.dbh))>.002?g(I.dbh):surveyed?.92*curve:d0+.75*Math.max(.7*curve-d0,0);const spTex=leaflessBlue?vslot(spi,"bare"):(fl&FL.one||!(fl&FL.multi)&&surveyed)&&cls===1?vslot(spi,"one"):spi;t.set([x,u,z,h,cbh,ravg,dbh,seed,...r8,...pr.slice(0,4),pr[4],pr[5],leanX,leanZ,col.r,col.g,col.b,spTex,cc.r,cc.g,cc.b,cls]);this.X[i]=x;this.Y[i]=u;this.Z[i]=z;this.Hh[i]=h;this.Rb[i]=Math.max(...r8);this.Cb[i]=cbh;this.cls[i]=cls;this.Ra[i]=ravg;this.Sp[i]=spi;this.Seed[i]=seed;this.Col.set([col.r,col.g,col.b],3*i);this.CatCol.set([cc.r,cc.g,cc.b],3*i);if(fl&FL.hidden){this.skip[i]=1;t[0]=1e6;t[2]=1e6;t[3]=.01;t[6]=.001;this.X[i]=1e6;this.Z[i]=1e6;this.Hh[i]=.01;this.Rb[i]=0}else if(fl&(FL.crownOnly|FL.donorWood))noStem.push(i)}this.treeTex=dataTexture(T,N,8);this.oakTex.needsUpdate=true;this.T=T;if(LIMB||this.shapes.length)this.syncLimb();this.fader=new LodFader(N,3);const U=extra=>this.uniforms(this.treeTex,extra);const add=(s,grp=this.treeGroup)=>{this.sets.push(s);grp.add(s.mesh);return s};const form=(cls,envK=1)=>({value:new THREE.Vector4(...FORM[cls],envK)});this.fams=TREE_FAMILIES.map((name,k)=>{const f2=FAMILIES[name],tx=this.textures(name,501+k*101);const open=OAKFORM&&name==="blackoak";const cards=makeMaterials(GLSL_CROWN,{SHADOW_PUSH:"1.6",FADE_NEAR:1,FADE_TEX:1,FLUTTER:1,CARDS:1,...open?{OAK_OPEN:(+(QS.get("oakopen")||.55)).toFixed(2)}:{}},U({uFade:{value:this.fader.tex},uShade:{value:1.65},uForm:form(f2.cls),uCrown:{value:new THREE.Vector4(...f2.clump,f2.keep)},uDense:{value:f2.dense||1},uCardTop:{value:f2.ctop||1},uTop:{value:TOP_ALB.cards[f2.cls]}}),{map:tx.card,doubleSide:true,foliage:true,key:open?"vegcardsopen":"vegcards"});const cloud=makeMaterials(GLSL_CLOUD,{SHADOW_PUSH:"1.6",FADE_FAR:1,FADE_TEX:1,CLOUD:1,CLOUD_D0:CLOUD_D0.toFixed(1),CLOUD_D1:CLOUD_D1.toFixed(1),CLOUD_KEEP:CLOUD_KEEP.toFixed(2),...LIMB?{LIMBROWS:1,LIMB_FAR:(+(QS.get("limbfar")||.74)).toFixed(2),PINE_GAIN:PINE_GAIN.toFixed(2)}:{}},U({uFade:{value:this.fader.tex},uShade:{value:f2.cshade},uForm:form(f2.cls),uCloud:{value:new THREE.Vector4(...f2.cloud)},uTop:{value:TOP_ALB.cloud[f2.cls]}}),{map:tx.mass,doubleSide:true,foliage:true,key:"vegcloud"});return{name,cards:add(new InstSet(cardsGeometry(f2,100+k*17),cards,N,{order:1})),cloud:add(new InstSet(cloudGeometry(cloudLayout(f2,prng(700+k)),800+k),cloud,N,{order:2}))}});if(LIMB){this.limbCards=LIMB_FAMILIES.map((name,k)=>{const f2=FAMILIES[name],tx=this.textures(name,1501+k*101);return add(new InstSet(limbCardsGeometry(f2,1600+k*17),makeMaterials(GLSL_LIMBCROWN,{SHADOW_PUSH:"1.6",FADE_NEAR:1,FADE_TEX:1,FLUTTER:1,CARDS:1,PINE_GAIN:PINE_GAIN.toFixed(2),...this.limbRec?{LIMBREC:1}:{}},U({uLimbRec:{value:this.limbRec||null},uFade:{value:this.fader.tex},uShade:{value:1.65*(f2.pine?PINE_GAIN:1)},uForm:form(f2.cls),uLimbC:{value:CANOPY&&!f2.pine?new THREE.Vector4(...f2.clump.map(x=>x*.5),f2.dens*LIMB_DENS*CANOPY_DENS):CANOPY?new THREE.Vector4(...f2.clump.map(x=>x*.7),f2.dens*LIMB_DENS*.6):new THREE.Vector4(...f2.clump,f2.dens*LIMB_DENS)},uCardTop:{value:f2.ctop},uTop:{value:TOP_ALB.cloud[f2.cls]}}),{map:tx.card,doubleSide:true,foliage:true,key:"veglimbcards"}),N,{order:1}))})}const famIdx=Object.fromEntries(TREE_FAMILIES.map((n,k)=>[n,k]));const spFam=this.species.map(sp=>famIdx[FAMILY_OF[sp]||(clsOf(sp)===0?"sugar":"blackoak")]);this.fam=Uint8Array.from(this.Sp,sp=>spFam[sp]??0);this.spFam=spFam;const hullLo=hullGeometry(3,[0,.3,.65,.92]);this.shadow=[0,1].map(c=>add(new InstSet(hullLo,makeMaterials(GLSL_CROWN,{POROUS:1,POROUS_F:"0.3"},U({uForm:form(c,.88),uCrown:{value:new THREE.Vector4(0,0,0,0)},uNoise:{value:this.noiseTex},uPorous:{value:(QS.get("look")==="dreamy"?[.5,.58]:[.32,.42])[c]}}),{depthOnly:true,shadowFront:true,key:"vegshadow"}),N,{shadowOnly:true})));const hullHi=hullGeometry(5,[0,.12,.3,.5,.7,.86,.96],12,0);this.envelope=[0,1].map(c=>add(new InstSet(hullHi,makeMaterials(GLSL_CROWN,{},U({uForm:form(c),uCrown:{value:new THREE.Vector4(0,0,0,0)}}),{key:"vegenv"}),N,{order:1})));const hideN=PER_ROW*Math.max(1,Math.ceil(N/PER_ROW));this.stemHide=new Uint8Array(hideN);this.stemHideTex=new THREE.DataTexture(this.stemHide,PER_ROW,hideN/PER_ROW,THREE.RedFormat,THREE.UnsignedByteType);for(const i of noStem)this.stemHide[i]=255;this.stemHideTex.minFilter=this.stemHideTex.magFilter=THREE.NearestFilter;this.stemHideTex.generateMipmaps=false;this.stemHideTex.unpackAlignment=1;this.stemHideTex.needsUpdate=true;const TU=()=>U({uSpT:this.uSpT,uBarkTile:this.uBarkTile,uBarkTex:this.uBarkTex,uBarkPaint:this.uBarkPaint,uForm:form(1),uStemHide:{value:this.stemHideTex}});const trunkB=trunkGeometry({stems:4,limbs:3,...OAKFORM?{limbRad:6,limbRings:5}:{}}),trunkC=trunkGeometry({stubs:8}),trunkLo=trunkGeometry({radial:5,rings:3}),trunkLoB=trunkGeometry({stems:4,radial:5,rings:3});const OK=OAKFORM?{OAKFORM:1}:LIMB?{LIMBROWS:1}:{};const trunkM=makeMaterials(GLSL_TRUNK,{BARK:1,...OK},TU()),farM=makeMaterials(GLSL_TRUNK,{BARK:1,FADE_NEAR:1,NEAR_D:TRUNK_FAR.toFixed(1),FADE_WD:"20.0",...OK},TU()),shM=makeMaterials(GLSL_TRUNK,{...OK},TU(),{depthOnly:true});this.trunksB=add(new InstSet(trunkB,trunkM,N,{order:1}));this.trunksC=add(new InstSet(trunkC,trunkM,N,{order:1}));this.trunksFar=add(new InstSet(trunkLo,farM,N,{order:2}));this.trunksFarB=add(new InstSet(trunkLoB,farM,N,{order:2}));this.trunkShadow=add(new InstSet(trunkLo,shM,N,{shadowOnly:true}));this.trunkShadowB=add(new InstSet(trunkLoB,shM,N,{shadowOnly:true}));if(LIMB){const lwM=makeMaterials(GLSL_LIMBWOOD,{BARK:1,LIMB_DARK:(+(QS.get("limbdark")||.5)).toFixed(2),...this.limbRec?{LIMBREC:1}:{}},Object.assign(TU(),{uLimbRec:{value:this.limbRec||null}}),{key:"veglimbwood"});this.limbWood=add(new InstSet(limbWoodGeometry(),lwM,N,{order:1}));this.pineWood=add(new InstSet(pineWoodGeometry(),lwM,N,{order:1}))}this.snags=add(new InstSet(trunkC,trunkM,N,{order:1}));this.snagTw=add(new InstSet(cardsGeometry(FAMILIES.snag,300),makeMaterials(GLSL_CROWN,{SHADOW_PUSH:"0.8",TWIG_COL:"vec3(0.3, 0.29, 0.27)"},U({uShade:{value:.8},uForm:form(1),uCrown:{value:new THREE.Vector4(.4,.6,1.3,30)}}),{map:this.twigTex,doubleSide:true}),N,{order:1}));this.key=new Uint8Array(N);this.keyF=new Uint8Array(N);this.tmp=new Float32Array(Math.max(N,1));this.cnt=new Uint32Array(NBIN+1);this.counts={near:0,far:0,shrubs:0,shadow:0}}initShrubs(buf){const man=this.man,sm=man.shrubs||{},stride=sm.stride||9;const F=new Float32Array(buf),N=Math.min(sm.count??Infinity,Math.floor(F.length/stride));const W2=man.W/2,H2=man.H/2,types=man.shrub_types||[];const T=new Float32Array(N*16);this.SX=new Float32Array(N);this.SY=new Float32Array(N);this.SZ=new Float32Array(N);this.SN=N;this.shrubOff=new Uint8Array(N);this.shrubEdits=0;const nat=types.map(t=>new THREE.Color(SHRUB_NATURAL[t]||"#5d6a37"));const cat=types.map((t,i)=>new THREE.Color(SHRUB_CATEGORY[t]||"#"+fallbackHue(i+3,types.length+3)));const def=new THREE.Color("#5d6a37"),col=new THREE.Color;this.shrubTypeOf=new Uint8Array(N);const cw=Math.min(Math.max(Number(QS.get("shrubcol")??sm.colour_weight??.3)||0,0),1);for(let i=0;i<N;i++){const o=i*stride,x=F[o]-W2,z=-(F[o+1]-H2),u=F[o+2]||0;const h=Math.min(Math.max(F[o+3]||1,.2),8),r=Math.min(Math.max(F[o+4]||h*.6,.2),8),ty=Math.max(0,Math.round(F[o+5]||0));const seed=(i*.7548776+.1)%1;const base=nat[ty]||def;const ir=srgbToLin(F[o+6]||0),ig=srgbToLin(F[o+7]||0),ib=srgbToLin(F[o+8]||0),w=ir+ig+ib>.003?cw:0;desat(col.setRGB(base.r*(1-w)+ir*w,base.g*(1-w)+ig*w,base.b*(1-w)+ib*w).multiplyScalar(.7+.35*(seed*5.3%1)),CHROMA);const c2=cat[ty]||def;T.set([x,u,z,h,r,ty,seed,0,col.r,col.g,col.b,0,c2.r,c2.g,c2.b,0],i*16);this.SX[i]=x;this.SY[i]=u+h*.5;this.SZ[i]=z;this.shrubTypeOf[i]=types[ty]==="manzanita"?1:0}this.shrubTex=dataTexture(T,N,4);const U=extra=>this.uniforms(this.shrubTex,extra);const D={TEXELS:4,SHADOW_PUSH:"0.5",FADE_TEX:1};this.shrubFader=new LodFader(N,1.5);this.shrubKey=new Uint8Array(N);this.shrubKeyF=new Uint8Array(N);this.shrubTmp=new Float32Array(Math.max(N,1));const add=s=>{this.sets.push(s);this.shrubGroup.add(s.mesh);return s};const cloudGeo=cloudGeometry(SHRUB_CLOUD,950);this.shrubSets=["brush","manzanita"].map((name,k)=>{const f=FAMILIES[name],tx=this.textures(name,909+k);return{cards:add(new InstSet(cardsGeometry(f,400+k),makeMaterials(GLSL_SHRUB_CARDS,{...D,FADE_NEAR:1,FLUTTER:1,CARD_N:"0.3",CARDS:1},U({uFade:{value:this.shrubFader.tex},uShade:{value:1.42}}),{map:tx.card,doubleSide:true,foliage:true,key:"vegshrubcards"}),N,{order:3})),cloud:add(new InstSet(cloudGeo,makeMaterials(GLSL_SHRUB_CLOUD,{...D,FADE_FAR:1,CLOUD:1},U({uEdge:this.uShrubEdge,uFade:{value:this.shrubFader.tex},uShade:{value:1.37}}),{map:tx.mass,doubleSide:true,foliage:true,key:"vegshrubcloud"}),N,{order:3.5}))}});this.shrubShadow=add(new InstSet(cloudGeo,makeMaterials(GLSL_SHRUB_CLOUD,{...D,CLOUD:1,POROUS:1,POROUS_F:"0.3"},U({uNoise:{value:this.noiseTex},uPorous:{value:QS.get("look")==="dreamy"?.5:.4}}),{map:this.textures("brush",909).mass,depthOnly:true,shadowFront:true}),N,{shadowOnly:true}))}lodSets(name){const ss=this.shrubSets||[];return{cards:[...this.fams.map(f=>f.cards),...this.limbCards||[]],cloud:this.fams.map(f=>f.cloud),trunks:[this.trunksB,this.trunksC,this.trunksFar,this.trunksFarB,this.snags,this.snagTw,...this.limbWood?[this.limbWood,this.pineWood]:[]],shadow:[...this.shadow,this.trunkShadow,this.trunkShadowB,...this.shrubShadow?[this.shrubShadow]:[]],shrubcards:ss.map(s=>s.cards),shrubcloud:ss.map(s=>s.cloud)}[name]?.map(s=>s.mesh)||[]}sortIds(ids,n,key,tmp=this.tmp){if(n<2)return;const cnt=this.cnt.fill(0);for(let k=0;k<n;k++)cnt[key[ids[k]]+1]++;for(let b=0;b<NBIN;b++)cnt[b+1]+=cnt[b];for(let k=0;k<n;k++){const id=ids[k];tmp[cnt[key[id]]++]=id}ids.set(tmp.subarray(0,n))}update(camera,frustum,sh){const ex=this.shared.uExag.value,cp=camera.position,pl=frustum.planes;const P=pl.map(p=>[p.normal.x,p.normal.y,p.normal.z,p.constant]);const vis=(x,y,z,r)=>{for(let k=0;k<6;k++){const q=P[k];if(q[0]*x+q[1]*y+q[2]*z+q[3]<-r)return false}return true};const solid=this.shared.uSolid?.value>.5,ov=this.lodOverride;if(!this.barkBaked&&this.renderer&&(!this.barkOver||this.barkOver.ready)){this.barkBaked=true;this.uBarkTex.value=bakeBark(this.renderer,512,this.barkOver?.layers)}if(this.shrubVis!==this.shrubGroup.visible){this.shrubVis=this.shrubGroup.visible;if(this.renderer)this.renderer.shadowMap.needsUpdate=true}const now=performance.now(),dt=this.tPrev?Math.min((now-this.tPrev)/1e3,.25):1,jump=!this.camPrev||cp.distanceTo(this.camPrev)>20||ov!==this.ovPrev;this.tPrev=now;(this.camPrev||=cp.clone()).copy(cp);this.ovPrev=ov;const step=jump?255:Math.max(1,Math.round(255*dt/LOD_FADE_S));if((LIMB||this.shapes.length)&&this.limbVer!==this.treeTex.version)this.syncLimb();if(this.treeGroup.visible){const key=this.key,keyF=this.keyF,nearBin=NBIN/NEAR_DIST,farBin=NBIN/1500,fam=this.fam,nF=this.fams.length,fader=this.fader,skip=this.skip,hero=this.heroSkip,vm=this.viewMask;const Dn=ov==="cloud"?-1e9:ov==="cards"?1e9:NEAR_DIST;const cardIds=this.fams.map(f=>f.cards.ids),cloudIds=this.fams.map(f=>f.cloud.ids),nCard=new Uint32Array(nF),nCloud=new Uint32Array(nF);const trB=this.trunksB.ids,trC=this.trunksC.ids,trF=this.trunksFar.ids,trFB=this.trunksFarB.ids,trS=this.trunkShadow.ids,trSB=this.trunkShadowB.ids;const sn=this.snags.ids,st=this.snagTw.ids,shIds=this.shadow.map(s=>s.ids),nSh=[0,0];const envIds=this.envelope.map(s=>s.ids),nEnv=[0,0];let nTB=0,nTC=0,nTF=0,nTFB=0,nTS=0,nTSB=0,nS=0,nSt=0,nSF=0,nLW=0,nPW=0;const lf=this.limbCards?this.limbOf:null,lcIds=lf?this.limbCards.map(s=>s.ids):null,nLC=[0,0,0,0],lwIds=lf?this.limbWood.ids:null,pwIds=lf?this.pineWood.ids:null;const limbsAll=this.showLimbs,limbsBare=(this.shared.uLeafOff?.value||0)>.5;const useSh=sh&&sh.on,lx=sh&&sh.lx,ly=sh&&sh.ly,sc=sh&&sh.c,half=sh?sh.half:0,maxD2=this.maxDist?this.maxDist*this.maxDist:0;for(let i=0;i<this.N;i++){const hs=hero[i];if(skip[i]||hs===1||vm&&vm[i])continue;if(maxD2&&(this.X[i]-cp.x)**2+(this.Z[i]-cp.z)**2>maxD2)continue;const hh=this.Hh[i],x=this.X[i],y=this.Y[i]*ex+hh*.5,z=this.Z[i],r=Math.max(hh*.5,this.Rb[i]),c=this.cls[i];if(useSh){const ox=x-sc.x,oy=y-sc.y,oz=z-sc.z;if(Math.abs(ox*lx.x+oy*lx.y+oz*lx.z)<half+r&&Math.abs(ox*ly.x+oy*ly.y+oz*ly.z)<half+r){if(!hs){if(c===1)trSB[nTSB++]=i;else trS[nTS++]=i}if(c!==2)shIds[c][nSh[c]++]=i}}if(hs)continue;const dx=x-cp.x,dy=y-cp.y,dz=z-cp.z,d=Math.sqrt(dx*dx+dy*dy+dz*dz),on=vis(x,y,z,r+VIEW_MARGIN);const w=fader.at(i,d,Dn,on?step:255);if(!on)continue;if(c===2){if(w>=128){sn[nS++]=i;st[nSt++]=i}else if(d<TRUNK_FAR){trF[nTF++]=i;nSF++}continue}const lfi=lf?lf[i]:0;if(w>=128){if(lfi===4){trC[nTC++]=i;if(limbsAll)pwIds[nPW++]=i}else if(lfi&&(limbsAll||limbsBare&&lfi!==2))lwIds[nLW++]=i;else if(c===1)trB[nTB++]=i;else trC[nTC++]=i}else if(d<TRUNK_FAR){if(c===1)trFB[nTFB++]=i;else trF[nTF++]=i}if(solid){envIds[c][nEnv[c]++]=i;continue}const k=fam[i];if(w>0){key[i]=Math.min(NBIN-1,d*nearBin)|0;if(lfi)lcIds[lfi-1][nLC[lfi-1]++]=i;else cardIds[k][nCard[k]++]=i}if(w<255){keyF[i]=Math.min(NBIN-1,Math.max(0,d-NEAR_DIST)*farBin)|0;cloudIds[k][nCloud[k]++]=i}}fader.flush();let nNear=0,nFar=0;this.fams.forEach((f,k)=>{this.sortIds(cardIds[k],nCard[k],key);f.cards.commit(nCard[k]);this.sortIds(cloudIds[k],nCloud[k],keyF);f.cloud.commit(nCloud[k]);nNear+=nCard[k];nFar+=nCloud[k]});if(lf){this.limbCards.forEach((s,k)=>{this.sortIds(lcIds[k],nLC[k],key);s.commit(nLC[k]);nNear+=nLC[k]});this.limbWood.commit(nLW);this.pineWood.commit(nPW)}this.envelope.forEach((s,c)=>s.commit(nEnv[c]));this.shadow.forEach((s,c)=>s.commit(useSh?nSh[c]:0));this.trunksB.commit(nTB);this.trunksC.commit(nTC);this.trunksFar.commit(nTF);this.trunksFarB.commit(nTFB);this.snags.commit(nS);this.snagTw.commit(nSt);this.trunkShadow.commit(useSh?nTS:0);this.trunkShadowB.commit(useSh?nTSB:0);this.counts.near=nNear+nS;this.counts.far=nFar+nEnv[0]+nEnv[1]+nSF;this.counts.shadow=nSh[0]+nSh[1]}else{this.counts.near=this.counts.far=this.counts.shadow=0}if(this.shrubSets&&this.shrubGroup.visible){const SHRUB_DIST2=this.shrubFar,SHRUB_NEAR2=this.shrubNear;const d2=SHRUB_DIST2*SHRUB_DIST2,ty=this.shrubTypeOf,ss=this.shrubSets,cid=ss.map(s=>s.cards.ids),fid=ss.map(s=>s.cloud.ids),nc=[0,0],nf=[0,0];const fader=this.shrubFader,Dn=SHRUB_NEAR2,off=this.shrubOff,sk=this.shrubKey,skF=this.shrubKeyF,nearBin=NBIN/(SHRUB_NEAR2+2),farBin=NBIN/SHRUB_DIST2;const useSh=sh&&sh.on,lx=sh&&sh.lx,ly=sh&&sh.ly,sc=sh&&sh.c,half=sh?sh.half+4:0,sid=this.shrubShadow.ids,dSh=(SHRUB_DIST2-20)**2;if(useSh&&!(this.shBoxAt&&this.shBoxAt.equals(sc)&&this.shCamAt.distanceToSquared(cp)<SHRUB_SH_LATCH*SHRUB_SH_LATCH)){(this.shBoxAt||=new THREE.Vector3).copy(sc);(this.shCamAt||=new THREE.Vector3).copy(cp)}const sp=useSh?this.shCamAt:cp;let nSs=0,hSs=0;const smk=this.shrubMask;for(let i=0;i<this.SN;i++){if(off[i]||smk&&smk[i])continue;const x=this.SX[i],y=this.SY[i]*ex,z=this.SZ[i],dx=x-cp.x,dy=y-cp.y,dz=z-cp.z,dd=dx*dx+dy*dy+dz*dz;if(useSh){const qx=x-sp.x,qy=y-sp.y,qz=z-sp.z;if(qx*qx+qy*qy+qz*qz<dSh){const ox=x-sc.x,oy=y-sc.y,oz=z-sc.z;if(Math.abs(ox*lx.x+oy*lx.y+oz*lx.z)<half&&Math.abs(ox*ly.x+oy*ly.y+oz*ly.z)<half){sid[nSs++]=i;hSs=hSs*31+i|0}}}const d=Math.sqrt(dd),on=dd<d2&&vis(x,y,z,4),w=fader.at(i,d,Dn,on?step:255),t=ty[i];if(!on)continue;if(w>0){sk[i]=Math.min(NBIN-1,d*nearBin)|0;cid[t][nc[t]++]=i}if(w<255){skF[i]=Math.min(NBIN-1,d*farBin)|0;fid[t][nf[t]++]=i}}fader.flush();ss.forEach((s,t)=>{this.sortIds(cid[t],nc[t],sk,this.shrubTmp);s.cards.commit(nc[t]);this.sortIds(fid[t],nf[t],skF,this.shrubTmp);s.cloud.commit(nf[t])});this.shrubShadow.commit(useSh?nSs:0);if(useSh&&(nSs!==this.nSs||hSs!==this.hSs)){this.nSs=nSs;this.hSs=hSs;if(this.renderer)this.renderer.shadowMap.needsUpdate=true}this.counts.shrubs=nc[0]+nc[1]+nf[0]+nf[1]}else this.counts.shrubs=0;if(this._far)this._far.update(camera,frustum,sh);if(this.renderer&&!this.uEdge){uWindPx.value=1080/(2*Math.tan((camera.fov||50)*Math.PI/360));this.windK=uWindK.value;this.windPx=uWindPx.value}if(this.renderer&&!this.uEdge&&!(performance.now()-(this._a2cAt||-1e9)<1e3)){this._a2cAt=performance.now();const gl=this.renderer.getContext();const fs=this.renderer.__frameSamples;uA2C.value=FADE_A2C&&(fs!==void 0?fs>0:this.renderer.getRenderTarget()===null&&gl.getParameter(gl.SAMPLES)>0)?1:0;this.a2c=uA2C.value}if(LIMB_DBG&&this.limbWood&&!this.uEdge)this.limbDebug(camera)}pick(ray){const ex=this.shared.uExag.value,o=ray.origin,d=ray.direction,T=this.treeTex.image.data,a=d.x*d.x+d.z*d.z;const profAt=(t,o4,f)=>{const k=[T[o4]*f[0],T[o4],T[o4+1],T[o4+2],T[o4+3],T[o4+4],T[o4+5],T[o4+5]*f[1]],s=Math.min(Math.max(t,0),1)*6;if(s<.5)return k[0]+(k[1]-k[0])*s*2;if(s>5.5)return k[6]+(k[7]-k[6])*(s-5.5)*2;const u=s-.5,j=Math.floor(u);return k[1+j]+(k[2+j]-k[1+j])*(u-j)};let best=null;for(let i=0;i<this.N;i++){const snag=this.cls[i]===2,R=snag?.8:this.Rb[i]+.2,cx=this.X[i],cz=this.Z[i],fx=o.x-cx,fz=o.z-cz;let t0=0,t1=Infinity;if(a>1e-9){const b=2*(fx*d.x+fz*d.z),c=fx*fx+fz*fz-R*R,disc=b*b-4*a*c;if(disc<0)continue;const sq=Math.sqrt(disc);t0=(-b-sq)/(2*a);t1=(-b+sq)/(2*a)}else if(fx*fx+fz*fz>R*R)continue;const base=this.Y[i]*ex,y0=base+(snag?0:this.Cb[i]),y1=base+this.Hh[i];if(Math.abs(d.y)>1e-9){const ta=(y0-o.y)/d.y,tb=(y1-o.y)/d.y;t0=Math.max(t0,Math.min(ta,tb));t1=Math.min(t1,Math.max(ta,tb))}else if(o.y<y0||o.y>y1)continue;t0=Math.max(t0,0);if(t1<=t0||best&&t0>=best.t)continue;if(snag){best={i,t:t0};continue}const o8=i*32,f=FORM[this.cls[i]],clen=Math.max(this.Hh[i]-this.Cb[i],.5);for(let k=0;k<16;k++){const t=t0+(t1-t0)*(k+.5)/16;if(best&&t>=best.t)break;const px=fx+d.x*t,pz=fz+d.z*t,rr=Math.hypot(px,pz);let az=Math.atan2(px,-pz);if(az<0)az+=2*Math.PI;const s=az*4/Math.PI,j0=Math.floor(s)&7,j1=j0+1&7,fr=s-Math.floor(s);const env=(T[o8+8+j0]+(T[o8+8+j1]-T[o8+8+j0])*fr)*profAt((o.y+d.y*t-y0)/clen,o8+16,f);if(rr<=env){best={i,t};break}}}return best}envRatio(i,x,y,z){const ex=this.shared.uExag.value,T=this.treeTex.image.data,base=this.Y[i]*ex,yy=y-base,fx=x-this.X[i],fz=z-this.Z[i],rr=Math.hypot(fx,fz);if(yy<-1||yy>this.Hh[i]+1.5)return Infinity;if(this.cls[i]===2||yy<this.Cb[i]-.5)return rr/.8;const o8=i*32,f=FORM[this.cls[i]],clen=Math.max(this.Hh[i]-this.Cb[i],.5);const k=[T[o8+16]*f[0],T[o8+16],T[o8+17],T[o8+18],T[o8+19],T[o8+20],T[o8+21],T[o8+21]*f[1]],s6=Math.min(Math.max((yy-this.Cb[i])/clen,0),1)*6;const prof=s6<.5?k[0]+(k[1]-k[0])*s6*2:s6>5.5?k[6]+(k[7]-k[6])*(s6-5.5)*2:(u=>{const j=Math.floor(u);return k[1+j]+(k[2+j]-k[1+j])*(u-j)})(s6-.5);let az=Math.atan2(fx,-fz);if(az<0)az+=2*Math.PI;const sa=az*4/Math.PI,j0=Math.floor(sa)&7,j1=j0+1&7,fr=sa-Math.floor(sa);return rr/Math.max((T[o8+8+j0]+(T[o8+8+j1]-T[o8+8+j0])*fr)*prof,.3)}_lrand(L,key){let x=Math.imul(L.seedU,2654435761)+Math.imul(key>>>0,2246822519)>>>0;x=(x^x>>>15)>>>0;x=Math.imul(x,739982445)>>>0;x=(x^x>>>12)>>>0;x=Math.imul(x,695872825)>>>0;x=(x^x>>>15)>>>0;return(x>>>8)/16777216}_limbFrame(i){if(!this.limbWood||!this.limbOf[i]||this.skip[i]||this.heroSkip[i]===1)return null;const D=this.treeTex.image.data,o=i*32,fr=Math.fround,mix=(a,b,t)=>a+(b-a)*t;const h=D[o+3],cbh=D[o+4],ravg=D[o+5],seed=D[o+7],clen=Math.max(fr(h-cbh),.5),fl=this.oakF[i]/255;const live=fl>=.4&&fl<=.75,pine=fl<=.4,r=D.subarray(o+8,o+16);const cx=(.707*r[1]+r[2]+.707*r[3]-.707*r[5]-r[6]-.707*r[7])*.25,cz=(-r[0]-.707*r[1]+.707*r[3]+r[4]+.707*r[5]-.707*r[7])*.25;const L={i,o,h,cbh,clen,ravg,dbh:D[o+6],seed,seedU:Math.floor(Math.min(Math.max(seed,0),.999999)*1048576)>>>0,live,pine,r,p:D.subarray(o+16,o+22),rN:0,R:null,q:i*64};L.b0=[cx*.45,cz*.45];L.yF=live?Math.min(Math.max(.5*cbh,.8),2.4):Math.min(Math.max(.5*cbh,1.8),Math.max(.3*h,1.8));const kf=y=>(y+.8)/(cbh+.3*clen+.8);L.bF=[mix(L.b0[0],cx*.8,kf(L.yF)),mix(L.b0[1],cz*.8,kf(L.yF))];L.nL=ravg>4.5?4:3;if(CANOPY&&!live)L.nL=ravg>5.5?6:ravg>3.5?5:4;if(pine){L.b0=[0,0];L.bF=[0,0];L.yF=cbh;L.nL=CANOPY?Math.min(Math.max(Math.floor(fr(clen/fr(.9))),6),12):Math.min(Math.max(Math.floor(fr(clen/fr(1.7))),3),6);return L}if(this.limbRec){const R=this.limbRec.image.data,q=L.q;L.R=R;if(R[q+1]>0){L.yF=R[q+1];L.bF=R[q+5]>.5?[R[q+2],R[q+3]]:[mix(L.b0[0],cx*.8,kf(L.yF)),mix(L.b0[1],cz*.8,kf(L.yF))]}L.rN=R[q];L.nL=Math.max(L.nL,L.rN)}return L}_envR(L,dx,dz,t){let az=Math.abs(dx)+Math.abs(dz)<1e-4?0:Math.atan2(dx,-dz);if(az<0)az+=6.2831853;const s=az*1.2732395,i0=Math.floor(s)&7,f=s-Math.floor(s),p=L.p,k=[p[0]*FORM[1][0],p[0],p[1],p[2],p[3],p[4],p[5],p[5]*FORM[1][1]],u=Math.min(Math.max(t,0),1)*6;let pr;if(u<.5)pr=k[0]+(k[1]-k[0])*u*2;else if(u>5.5)pr=k[6]+(k[7]-k[6])*(u-5.5)*2;else{const w=u-.5,j=Math.floor(w);pr=k[1+j]+(k[2+j]-k[1+j])*(w-j)}return(L.r[i0]+(L.r[i0+1&7]-L.r[i0])*f)*pr}_limbPt(L,c,s,id){const[A,C,E]=c,ch=[E[0]-A[0],E[1]-A[1],E[2]-A[2]],len=Math.hypot(ch[0],ch[1],ch[2]);let sd=[-ch[2]+1e-4,0,ch[0]];const sl=Math.hypot(sd[0],sd[2])||1;sd=[sd[0]/sl,0,sd[2]/sl];let up=[sd[1]*ch[2]-sd[2]*ch[1],sd[2]*ch[0]-sd[0]*ch[2],sd[0]*ch[1]-sd[1]*ch[0]];const ul=Math.hypot(up[0],up[1],up[2])||1;up=up.map(v=>v/ul);const ph=this._lrand(L,448+id)*6.2831853,r=1-s,w=.035*len*4*s*(1-s),a=Math.sin(ph+7.5*s)*w,b=.6*Math.sin(1.7*ph+5.3*s)*w;return[0,1,2].map(k=>r*r*A[k]+2*r*s*C[k]+s*s*E[k]+sd[k]*a+up[k]*b)}_pineBranch(L,m,k){const u1=this._lrand(L,256+4*m+k),u2=this._lrand(L,320+4*m+k),u3=this._lrand(L,384+4*m+k);const t=(m+.25+.5*u1)/L.nL*.9+.04,az=L.seed*6.2831853+m*2.39996+(k+(u2-.5)*.6)*1.5707963,d=[Math.sin(az),-Math.cos(az)];const y0=L.cbh+t*L.clen,len=(.75+.25*u3)*this._envR(L,d[0],d[1],t),tt=Math.min(Math.max((t-.1)/.8,0),1),rise=(-.22+.57*tt*tt*(3-2*tt))*len;return[[0,y0,0],[d[0]*len*.55,y0+.5*rise-.14*len,d[1]*len*.55],[d[0]*len,Math.min(y0+rise+.12*len,L.h-.3),d[1]*len]]}_leader(L,m){if(L.pine)return this._pineBranch(L,m,0);const mix=(a,b,t2)=>a+(b-a)*t2,lv=L.live?1:0,az0=L.seed*6.2831853+2+this._lrand(L,1),t0=mix(.86,.74,lv),d0=[Math.sin(az0),-Math.cos(az0)];let A=[L.bF[0],L.yF,L.bF[1]];const e0=mix(.25,.4,lv)*this._envR(L,d0[0],d0[1],t0);let E=[d0[0]*e0,L.cbh+t0*L.clen,d0[1]*e0],C=[mix(A[0],E[0],.3)-d0[0]*.08*L.ravg,mix(A[1],E[1],.6),mix(A[2],E[2],.3)-d0[1]*.08*L.ravg];const fx=mix(.36,.45,lv),fy=mix(.68,.6,lv),R=L.R,q=L.q;const ctl=(A2,E2,k,gx,gy)=>R[q+32+4*k+3]>.5?[0,1,2].map(c=>2*R[q+32+4*k+c]-.5*(A2[c]+E2[c])):[mix(A2[0],E2[0],gx),mix(A2[1],E2[1],gy),mix(A2[2],E2[2],gx)];if(L.rN>.5){E=[R[q+8],R[q+9],R[q+10]];C=ctl(A,E,0,.3,.6);if(m<.5)return[A,C,E];if(m<L.rN-.5){const w=R[q+8+4*m+3],s0=w>0?Math.min(Math.max((w-L.yF)/Math.max(E[1]-L.yF,.5),0),.85):Math.max(m-2,0)*.09;A=this._limbPt(L,[A,C,E],s0,0);E=[R[q+8+4*m],R[q+9+4*m],R[q+10+4*m]];C=ctl(A,E,m,fx,fy);return[A,C,E]}}if(m<.5)return[A,C,E];const u1=this._lrand(L,16+m),u2=this._lrand(L,32+m);A=this._limbPt(L,[A,C,E],Math.max(m-2,0)*.09,0);const az=L.seed*6.2831853+(m-1+(u1-.5)*.5)*6.2831853/Math.max(L.nL-1,1),d=[Math.sin(az),-Math.cos(az)];const t=CANOPY?mix(mix(.25,.65,u2),mix(.3,.7,u2),lv):mix(mix(.45,.8,u2),mix(.3,.7,u2),lv);const reach=(CANOPY?mix(mix(.62,.88,u1),mix(.5,.74,u1),lv):mix(.5,.74,u1))*this._envR(L,d[0],d[1],t);E=[d[0]*reach,L.cbh+t*L.clen,d[1]*reach];C=[mix(A[0],E[0],fx),mix(A[1],E[1],fy),mix(A[2],E[2],fx)];return[A,C,E]}_secondary(L,m,j){if(L.pine)return[...this._pineBranch(L,m,j+1),0];const mix=(a2,b,t2)=>a2+(b-a2)*t2,c=this._leader(L,m),[a,,e]=c;const u1=this._lrand(L,64+4*m+j),u2=this._lrand(L,128+4*m+j),u3=this._lrand(L,192+4*m+j),s0=.34+.2*j+.08*(u3-.5);const A=this._limbPt(L,c,s0,m);let dx=e[0]-a[0],dz=e[2]-a[2];const dl=Math.max(Math.hypot(dx,dz),.001);dx/=dl;dz/=dl;let ang=((j+m)%2<.5?1:-1)*(.45+.6*u1),t=j<.5?mix(.04,.3,u2):j<1.5?mix(.3,.65,u2):mix(.6,.92,u2);if(m<.5){ang=j*2.1+u1*1.2;t=mix(.66,.95,u2)}const reach=CANOPY&&m<.5?mix(.5,.8,u3):mix(.8,1,u3),ca=Math.cos(ang),sa=Math.sin(ang),d=[ca*dx-sa*dz,sa*dx+ca*dz],er=reach*this._envR(L,d[0],d[1],t);const E=[d[0]*er,L.cbh+t*L.clen,d[1]*er];return[A,[.5*(A[0]+E[0]),.5*(A[1]+E[1])+.2*Math.hypot(E[0]-A[0],E[2]-A[2])+.4*Math.max(A[1]-E[1],0),.5*(A[2]+E[2])],E,s0]}limbCount(i){const L=this._limbFrame(i);if(!L||this.stemHide[i]===255)return null;const bare=(this.shared.uLeafOff?.value||0)>.5&&this.limbOf[i]!==2&&!L.pine;if(!this.showLimbs&&!bare)return null;return{leaders:L.nL,secondaries:3,form:L.pine?"pine":L.live?"liveoak":"oak"}}limbPoint(i,m,j=-1,y=.5,breeze=false){const L=this._limbFrame(i);if(!L||this.stemHide[i]===255||m<0||m>=L.nL||j>2)return null;const lead=j<0,c=lead?this._leader(L,m):this._secondary(L,m,j),sc=L.pine?.85:lead?.9:.62,yc=Math.min(Math.max(y,0),1),s=sc*yc;const nr=(L.pine?LIMB_RINGS.pine:lead?LIMB_RINGS.lead:LIMB_RINGS.sec)-1,k=Math.min(Math.floor(yc*nr),nr-1),f=yc*nr-k,id=lead?m:10+3*m+j;const P0=this._limbPt(L,c,sc*k/nr,id),P1=this._limbPt(L,c,sc*(k+1)/nr,id),P=[0,1,2].map(q=>P0[q]+(P1[q]-P0[q])*f);const taper=(yy,top,tip)=>1.15+(tip-1.15)*Math.pow(Math.min(Math.max((yy+.8)/(top+.8),0),1),.8);const rF=Math.max(.5*L.dbh/taper(Math.min(1.37,.4*L.yF),L.yF,.72),.04)*.72,rl=.7*rF,rm=m<.5?rF:rl,thin=Math.max(.3*rl,.03);let rs=lead?rm:.62*(rm+(thin-rm)*Math.pow(c[3],.8)),re=lead?thin:.025;if(L.pine){rs=Math.min(Math.max(.08*L.dbh+.015,.025),.08);re=.012}const D=this.treeTex.image.data,o=L.o,lx=D[o+22],lz=D[o+23],T=[0,1,2].map(q=>P1[q]-P0[q]),rAt=v=>rs+(re-rs)*Math.pow(v,.8);const dir=new THREE.Vector3(T[0]+T[1]*lx,T[1],T[2]+T[1]*lz).normalize();const S=this.shared,tm=S.uTime.value,yf=Math.min(Math.max(P[1]/Math.max(L.h,.5),0),1),cp=this.camPrev,wd=cp?Math.max(Math.hypot(cp.x-D[o],cp.y-D[o+1]*S.uExag.value,cp.z-D[o+2]),1):1,wk=uWindK.value,wt=Math.min(Math.max((uWindPx.value/wd-wk.x)/Math.max(wk.y-wk.x,1e-6),0),1),sw=breeze?S.uWind.value*wt*wt*(3-2*wt)*yf*yf*(.012+.0035*L.h):0;const sx=sw*(Math.sin(tm*.55+L.seed*37+D[o]*.05)+.3*Math.sin(tm*1.3+L.seed*11)),sz=sw*Math.cos(tm*.45+L.seed*23+D[o+2]*.05);return{p:new THREE.Vector3(D[o]+P[0]+(P[1]-L.h)*lx+sx,D[o+1]*S.uExag.value+P[1],D[o+2]+P[2]+(P[1]-L.h)*lz+sz),r:rAt(k/nr)+(rAt((k+1)/nr)-rAt(k/nr))*f,dir,s}}limbDebug(camera){const cp=camera.position;if(this._dbgAt&&this._dbgAt.distanceToSquared(cp)<225)return;(this._dbgAt||=new THREE.Vector3).copy(cp);const pts=[];for(let i=0;i<this.N;i++){if((this.X[i]-cp.x)**2+(this.Z[i]-cp.z)**2>4900)continue;const n=this.limbCount(i);if(!n)continue;for(let m=0;m<n.leaders;m++)for(let j=-1;j<3;j++)for(const y of[.2,.5,.8,1]){const q=this.limbPoint(i,m,j,y);if(q)pts.push(q.p.x,q.p.y,q.p.z)}}if(!this._dbg){this._dbg=new THREE.Points(new THREE.BufferGeometry,new THREE.PointsMaterial({color:16711935,size:5,sizeAttenuation:false,depthTest:false,fog:false}));this._dbg.frustumCulled=false;this._dbg.renderOrder=99;this.group.add(this._dbg)}this._dbg.geometry.setAttribute("position",new THREE.Float32BufferAttribute(pts,3));this._dbgN=pts.length/3}stemRadius(i,y=1.37){const T=this.treeTex.image.data,o=i*32,h=T[o+3],cbh=T[o+4],ravg=T[o+5],dbh=T[o+6],sp=Math.round(T[o+27]),cls=T[o+31];const st=this.uSpT.value[sp],pw=this.uPheno.value[sp].w,snag=cls>1.5,broad=cls>.5&&!snag,cl=v=>Math.min(Math.max(v,0),1);const bare=pw>1.5?1:pw*cl((this.shared.uLeafOff?.value||0)*1.3-.3),clen=Math.max(h-cbh,.5);const lform=this.limbOf?.[i]===4?0:this.limbOf?.[i]||0,limbs=lform&&this.limbWood&&(this.showLimbs||lform!==2&&bare>.5);const top=limbs?lform===2?Math.min(Math.max(.5*cbh,.8),2.4):Math.min(Math.max(.5*cbh,1.8),Math.max(.3*h,1.8)):snag?h:broad?cbh+(.3+.3*bare)*clen:h*.92,tip=limbs?.72:snag?.2:.35;const stems=limbs||lform&&lform!==2&&this.limbWood||OAKFORM&&broad&&this.oakF?.[i]===255?1:broad?Math.min(ravg>6.5?4:ravg>4.5?3:ravg>3?2:1,st.w):1;const taper=yy=>1.15+(tip-1.15)*Math.pow(cl((yy+.8)/(top+.8)),.8);const r0=Math.max(.5*dbh/Math.pow(stems,.35)/taper(Math.min(1.37,.4*top)),snag?.08:.04);return{r:r0*taper(y)*(1+st.y*Math.exp(-Math.max(y,0)/.35)),stems}}info(i){const F=this.raw,o=i*this.stride,I=this.I,m=this.man,s=this.stemRadius(i,1.37);return{species:this.species[Math.round(F[o+I.sp])]||"?",h:F[o+I.h],cbh:F[o+I.cbh],cd:F[o+I.cd],dbh:2*s.r,stems:s.stems,dbhLidar:F[o+I.dbh],lean:F[o+I.ld],leanAz:F[o+I.la],conf:F[o+I.conf],leafoff:F[o+I.leafoff],id:F[o+I.id],E:(m.E0||0)+F[o+I.e],N:(m.N0||0)+F[o+I.n],Z:(m.Z0||0)+F[o+I.u]+F[o+I.h],x:this.X[i],y:this.Y[i],z:this.Z[i],r:this.Rb[i]}}shrubInfo(i){if(!this.shrubTex||!(i>=0&&i<this.SN))return null;const T=this.shrubTex.image.data,o=i*16,m=this.man;return{e:T[o]+m.W/2,n:m.H/2-T[o+2],u:T[o+1],h:T[o+3],r:T[o+4],type:m.shrub_types?.[T[o+5]]??T[o+5],hidden:!!this.shrubOff[i]}}hideShrub(i){if(!this.shrubTex||!(i>=0&&i<this.SN)||this.shrubOff[i])return false;this.shrubTex.image.data[i*16+3]=0;this.shrubOff[i]=1;this.shrubChanged();return true}editShrub(i,{e,n,r,h,u}={}){if(!this.shrubTex||!(i>=0&&i<this.SN)||this.shrubOff[i])return false;const T=this.shrubTex.image.data,o=i*16,m=this.man,ok=Number.isFinite;if(ok(e))T[o]=e-m.W/2;if(ok(n))T[o+2]=m.H/2-n;if(ok(u))T[o+1]=u;if(ok(h))T[o+3]=Math.min(Math.max(h,.2),8);if(ok(r))T[o+4]=Math.min(Math.max(r,.2),8);this.SX[i]=T[o];this.SZ[i]=T[o+2];this.SY[i]=T[o+1]+T[o+3]*.5;this.shrubChanged();return true}shrubChanged(){this.shrubTex.needsUpdate=true;this.shrubEdits++;if(this.renderer)this.renderer.shadowMap.needsUpdate=true}async clearRoads(){const get=f=>fetch(this.base+f).then(r=>r.ok?r.json():null).catch(()=>null);const data=this.man.roadsDev||await get("roads_all.json")||(this.man.roads?.file?await get(this.man.roads.file):null);if(!data?.roads||!this.shrubTex)return null;const W=this.man.W,H=this.man.H,C=16,NX=Math.ceil(W/C)+1,NY=Math.ceil(H/C)+1,cells=new Map,segs=[];for(const r of data.roads){if(!r.pts||!/^(road|driveway|parking)$/.test(r.kind))continue;const cap=r.kind==="road"?ROAD_BED:Infinity;for(let k=1;k<r.pts.length;k++){const a=r.pts[k-1],b=r.pts[k],hw=Math.min(((r.width?.[k-1]??4)+(r.width?.[k]??4))/2,cap)/2,pad=hw+ROAD_CLEAR+8;const i0=Math.max(0,Math.floor((Math.min(a[0],b[0])-pad)/C)),i1=Math.min(NX-1,Math.floor((Math.max(a[0],b[0])+pad)/C));const j0=Math.max(0,Math.floor((Math.min(a[1],b[1])-pad)/C)),j1=Math.min(NY-1,Math.floor((Math.max(a[1],b[1])+pad)/C));if(i0>i1||j0>j1)continue;const s=segs.push([a[0],a[1],b[0],b[1],hw])-1;for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const key=j*NX+i;(cells.get(key)||cells.set(key,[]).get(key)).push(s)}}}const T=this.shrubTex.image.data,W2=W/2,H2=H/2;let cleared=0,trimmed=0;for(let i=0;i<this.SN;i++){const o=i*16,r=T[o+4],e=T[o]+W2,n=H2-T[o+2];if(this.shrubOff[i]||T[o+3]<.05)continue;const list=cells.get(Math.floor(n/C)*NX+Math.floor(e/C));if(!list)continue;let gap=Infinity;for(const s of list){const[ax,ay,bx,by,hw]=segs[s],dx=bx-ax,dy=by-ay,f=Math.min(1,Math.max(0,((e-ax)*dx+(n-ay)*dy)/(dx*dx+dy*dy||1)));gap=Math.min(gap,Math.hypot(e-ax-dx*f,n-ay-dy*f)-hw)}if(gap-r>=ROAD_CLEAR)continue;const r2=gap-ROAD_CLEAR;if(gap<=0||r2<Math.max(.3,.4*r)){this.hideShrub(i);cleared++}else{this.editShrub(i,{r:r2,h:Math.min(T[o+3],2.6*r2+.5)});trimmed++}}return{cleared,trimmed}}}
