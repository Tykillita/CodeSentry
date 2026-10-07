import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { barkTexture, petalGeometry, blossomCenterGeometry } from './tree-model.ts';
import { STUDIO_OFFSETS, STUDIO_ROOM } from './studio-layout.ts';

const V=(p:readonly number[])=>new THREE.Vector3(p[0],p[1],p[2]);
const UP=new THREE.Vector3(0,1,0);
const seeded=(seed:number)=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};

/** Real geometry and shared photographic surfaces, in the original local anchors. */
export function createStudioDecorations({wood,contact}:{wood:THREE.Texture;contact:THREE.Texture}) {
  const group=new THREE.Group();group.name='studio-decorations';
  const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();
  const G=<T extends THREE.BufferGeometry>(value:T)=>{geometries.add(value);return value;};
  const M=<T extends THREE.Material>(value:T)=>{materials.add(value);return value;};
  const T=<T extends THREE.Texture>(value:T)=>{textures.add(value);return value;};
  const standard=(color:string,options:THREE.MeshStandardMaterialParameters={})=>M(new THREE.MeshStandardMaterial({color,roughness:.9,...options}));
  const mesh=(parent:THREE.Group,name:string,geometry:THREE.BufferGeometry,material:THREE.Material,position:number[]=[0,0,0])=>{
    const value=new THREE.Mesh(geometry,material);value.name=name;value.position.fromArray(position);value.castShadow=true;value.receiveShadow=true;parent.add(value);return value;
  };
  const lathe=(profile:number[][],segments=40)=>G(new THREE.LatheGeometry(profile.map(([x,y])=>new THREE.Vector2(x,y)),segments));
  const batch=(parent:THREE.Group,material:THREE.Material,name:string)=>{
    const pieces:THREE.BufferGeometry[]=[];const transform=new THREE.Object3D();
    return {
      add(geometry:THREE.BufferGeometry,position:THREE.Vector3,scale=new THREE.Vector3(1,1,1),orientation=new THREE.Quaternion()) {
        transform.position.copy(position);transform.scale.copy(scale);transform.quaternion.copy(orientation);transform.updateMatrix();
        pieces.push(geometry.clone().applyMatrix4(transform.matrix));
      },
      finish(){if(!pieces.length)return;const combined=mergeGeometries(pieces);pieces.forEach(p=>p.dispose());if(combined)mesh(parent,name,G(combined),material);},
    };
  };
  const random=seeded(71023),sphere=G(new THREE.SphereGeometry(1,8,6));
  const ceramic=M(new THREE.MeshPhysicalMaterial({color:'#9fb7a2',roughness:.32,clearcoat:.8,clearcoatRoughness:.2}));
  const contactMaterial=M(new THREE.MeshBasicMaterial({color:'#3a2a1c',map:contact,transparent:true,opacity:.3,depthWrite:false,toneMapped:false}));
  const contactPlane=G(new THREE.PlaneGeometry(1,1));
  const footprint=(parent:THREE.Group,width:number,depth:number)=>{const shadow=mesh(parent,'soft-contact',contactPlane,contactMaterial,[0,.0001,0]);shadow.rotation.x=-Math.PI/2;shadow.scale.set(width,depth,1);shadow.castShadow=false;};
  const potMaterial=M(new THREE.MeshPhysicalMaterial({color:'#3b2a20',roughness:.38,clearcoat:.65,clearcoatRoughness:.23}));
  const pineBark=standard('#70503b',{map:wood,bumpMap:wood,bumpScale:.0007,roughness:.94});
  const cherry=T(barkTexture()),cherryBark=standard('#594334',{map:cherry,bumpMap:cherry,bumpScale:.00025,roughness:.92});
  const needlesMaterial=standard('#ffffff',{vertexColors:true,side:THREE.DoubleSide,roughness:.95});
  const petalsMaterial=standard('#ffffff',{vertexColors:true,side:THREE.DoubleSide,roughness:.84,emissive:'#f2c9d1',emissiveIntensity:.025});
  const flowerCenterMaterial=standard('#ffffff',{vertexColors:true,roughness:.8});
  const sepalsMaterial=standard('#66794d',{roughness:1});
  const budMaterial=standard('#e4b5bf',{roughness:.87});

  const grain=new Uint8Array(128*128*4),weave=new Uint8Array(128*128*4);
  for(let y=0;y<128;y++)for(let x=0;x<128;x++) {
    const i=(y*128+x)*4,n=random();grain[i]=35+n*21;grain[i+1]=26+n*14;grain[i+2]=17+n*10;grain[i+3]=255;
    const tone=231+(x%4===0?9:0)-(y%4===0?9:0)+(random()-.5)*9;weave[i]=weave[i+1]=weave[i+2]=tone;weave[i+3]=255;
  }
  const soilTexture=T(new THREE.DataTexture(grain,128,128));soilTexture.colorSpace=THREE.SRGBColorSpace;soilTexture.needsUpdate=true;
  const weaveTexture=T(new THREE.DataTexture(weave,128,128));weaveTexture.wrapS=weaveTexture.wrapT=THREE.RepeatWrapping;weaveTexture.repeat.set(4,9);weaveTexture.needsUpdate=true;
  const soilMaterial=standard('#ffffff',{map:soilTexture,roughness:1}),mossMaterial=standard('#425634',{roughness:1});
  const clothMaterial=standard('#86937e',{map:weaveTexture,bumpMap:weaveTexture,bumpScale:.00025,roughness:1});
  const woodMaterial=standard('#70503b',{map:wood,roughness:.68}),darkWoodMaterial=standard('#493325',{map:wood,roughness:.75});
  const cordMaterial=standard('#695342',{roughness:1});

  /** Tapered tubes follow their curves exactly; children grow from parent points. */
  const tube=(curve:THREE.CatmullRomCurve3,radius:number,segments=16,sides=8)=>{
    const frames=curve.computeFrenetFrames(segments,false),positions:number[]=[],uv:number[]=[],indices:number[]=[];
    const length=curve.getLength(),phase=random()*6;
    for(let i=0;i<=segments;i++) {
      const t=i/segments,center=curve.getPointAt(t),r=radius*(1-.92*t)*(1+.22*Math.exp(-t*20));
      for(let j=0;j<=sides;j++) {
        const angle=j/sides*Math.PI*2,ridge=1+.06*Math.sin(angle*5+phase+t*7);
        const point=center.clone().addScaledVector(frames.normals[i],Math.cos(angle)*r*ridge).addScaledVector(frames.binormals[i],Math.sin(angle)*r*ridge);
        positions.push(point.x,point.y,point.z);uv.push(j/sides,t*length/.08);
        if(i<segments&&j<sides){const a=i*(sides+1)+j;indices.push(a,a+1,a+sides+1,a+1,a+sides+2,a+sides+1);}
      }
    }
    for(const [row,reverse] of [[0,true],[segments,false]] as const) {
      const c=curve.getPointAt(row/segments),at=positions.length/3;positions.push(c.x,c.y,c.z);uv.push(.5,row/segments);
      for(let j=0;j<sides;j++){const a=row*(sides+1)+j;indices.push(...(reverse?[at,a+1,a]:[at,a,a+1]));}
    }
    const value=new THREE.BufferGeometry();value.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));value.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));value.setIndex(indices);value.computeVertexNormals();return value;
  };
  const branch=(collector:ReturnType<typeof batch>,points:THREE.Vector3[],radius:number,segments=16,sides=8)=>{
    const curve=new THREE.CatmullRomCurve3(points,false,'centripetal'),geometry=tube(curve,radius,segments,sides);
    collector.add(geometry,new THREE.Vector3());geometry.dispose();return curve;
  };

  // Bonsai: glazed pot, granular soil, exposed roots and individually oriented pine needles.
  const bonsai=new THREE.Group();bonsai.name='shelf-bonsai';bonsai.position.set(.04,1.133,-.52).add(V(STUDIO_OFFSETS.shelves));group.add(bonsai);
  footprint(bonsai,.20,.16);
  const pot=mesh(bonsai,'bonsai-pot',lathe([[.048,0],[.060,.003],[.076,.020],[.079,.032],[.077,.037],[.070,.037],[.068,.030],[.054,.010]]),potMaterial);pot.scale.set(1.08,1,.86);
  const potBottom=mesh(bonsai,'bonsai-pot-bottom',G(new THREE.CircleGeometry(.052,32)),potMaterial,[0,.001,0]);potBottom.rotation.x=Math.PI/2;potBottom.scale.set(1.08,.86,1);
  const soil=mesh(bonsai,'bonsai-soil',G(new THREE.CircleGeometry(.068,40)),soilMaterial,[0,.0305,0]);soil.rotation.x=-Math.PI/2;soil.scale.set(1.08,.86,1);
  const gravel=new THREE.InstancedMesh(sphere,soilMaterial,64),moss=new THREE.InstancedMesh(sphere,mossMaterial,18),dummy=new THREE.Object3D();
  for(let i=0;i<64;i++){const angle=random()*Math.PI*2,r=Math.sqrt(random())*.062;dummy.position.set(Math.cos(angle)*r,.031+random()*.001,Math.sin(angle)*r*.86);dummy.scale.set(.0018+random()*.0017,.001+random()*.001,.0018+random()*.0017);dummy.rotation.set(random(),random(),random());dummy.updateMatrix();gravel.setMatrixAt(i,dummy.matrix);}
  dummy.rotation.set(0,0,0);
  for(let i=0;i<18;i++){const angle=random()*Math.PI*2,r=.018+random()*.033;dummy.position.set(Math.cos(angle)*r,.032,Math.sin(angle)*r*.86);dummy.scale.set(.003+random()*.005,.001,.003+random()*.004);dummy.updateMatrix();moss.setMatrixAt(i,dummy.matrix);}
  gravel.name='bonsai-gravel';moss.name='bonsai-moss';gravel.receiveShadow=moss.receiveShadow=true;bonsai.add(gravel,moss);
  const bonsaiBranches=batch(bonsai,pineBark,'bonsai-trunk-and-branches');
  const trunk=branch(bonsaiBranches,[[.008,.032,0],[-.013,.058,.004],[.012,.094,-.004],[.017,.137,-.002],[.003,.173,.002],[.005,.210,.004]].map(V),.008,24,12);
  for(let i=0;i<5;i++){const angle=i*Math.PI*2/5+.3;branch(bonsaiBranches,[trunk.getPoint(.08),V([Math.cos(angle)*.021,.035,Math.sin(angle)*.019]),V([Math.cos(angle)*.035,.031,Math.sin(angle)*.030])],.0034,6,7);}
  const limbs=[
    branch(bonsaiBranches,[trunk.getPoint(.36),V([-.038,.124,.008]),V([-.075,.146,.014])],.0042,12),
    branch(bonsaiBranches,[trunk.getPoint(.45),V([.039,.124,-.014]),V([.075,.137,-.009])],.0037,12),
    branch(bonsaiBranches,[trunk.getPoint(.72),V([-.020,.181,.013]),V([-.047,.192,.016])],.003,10),
    branch(bonsaiBranches,[trunk.getPoint(.88),V([.022,.204,-.004]),V([.036,.213,.007])],.0022,10),
  ];
  const needleGeometry=G(new THREE.BufferGeometry());needleGeometry.setAttribute('position',new THREE.Float32BufferAttribute([-.5,0,0,.5,0,0,0,1,0,0,0,-.5,0,0,.5,0,1,0],3));
  needleGeometry.setAttribute('color',new THREE.Float32BufferAttribute([.65,.76,.59,.65,.76,.59,.91,1,.82,.65,.76,.59,.65,.76,.59,.91,1,.82],3));needleGeometry.computeVertexNormals();
  const needles=new THREE.InstancedMesh(needleGeometry,needlesMaterial,2400),shade=new THREE.Color();let needleIndex=0;
  for(let cluster=0;cluster<5;cluster++)for(let shoot=0;shoot<24;shoot++) {
    const parent=cluster===4?trunk:limbs[cluster],base=parent.getPoint(.55+random()*.44);
    const tip=base.clone().add(V([(random()-.5)*.044,.008+random()*.011,(random()-.5)*.044]));
    branch(bonsaiBranches,[base,base.clone().lerp(tip,.55).add(V([0,.003,0])),tip],.00065,4,5);
    for(let pair=0;pair<10;pair++)for(let twin=0;twin<2;twin++) {
      const angle=random()*Math.PI*2,up=.15+random()*.75,direction=new THREE.Vector3(Math.cos(angle),up,Math.sin(angle)).normalize();
      dummy.position.copy(base).lerp(tip,.45+random()*.55);dummy.quaternion.setFromUnitVectors(UP,direction);dummy.scale.set(.0005+random()*.00025,.013+random()*.012,.0005);dummy.updateMatrix();
      needles.setMatrixAt(needleIndex,dummy.matrix);shade.set('#3a5737').lerp(new THREE.Color('#68834b'),random()*.7);needles.setColorAt(needleIndex++,shade);
    }
  }
  bonsaiBranches.finish();needles.name='individual-pine-needles';needles.castShadow=true;needles.receiveShadow=true;needles.instanceMatrix.needsUpdate=true;needles.computeBoundingSphere();bonsai.add(needles);

  // Ikebana: each flower's pedicel grows from a parent branch, with a cupped corolla.
  const ikebana=new THREE.Group();ikebana.name='sakura-ikebana';ikebana.position.set(-.83,.45,-.53).add(V(STUDIO_OFFSETS.alcove));group.add(ikebana);
  footprint(ikebana,.16,.14);
  mesh(ikebana,'ikebana-vase',lathe([[0,0],[.03,0],[.05,.05],[.055,.11],[.035,.17],[.03,.2],[.024,.2],[.021,.19]]),ceramic);
  const mouth=mesh(ikebana,'vase-water',G(new THREE.CircleGeometry(.021,24)),standard('#253029',{roughness:.35}),[0,.19,0]);mouth.rotation.x=-Math.PI/2;
  const stems=batch(ikebana,cherryBark,'sakura-branches');
  const mainStems=[
    branch(stems,[[0,.19,0],[.012,.28,.010],[-.005,.415,.014],[.043,.575,.009]].map(V),.0035,22,8),
    branch(stems,[[-.004,.19,0],[-.035,.29,-.008],[-.075,.385,.008],[-.116,.473,.019]].map(V),.0027,18,8),
    branch(stems,[[.004,.19,0],[.031,.275,-.016],[.065,.347,-.030],[.094,.421,-.020]].map(V),.0025,18,8),
  ];
  const petal=G(petalGeometry()),position=petal.getAttribute('position'),uv=new Float32Array(position.count*2);
  for(let i=0;i<position.count;i++){uv[i*2]=.5+position.getX(i)/.16;uv[i*2+1]=.08+.84*(position.getY(i)-.025)/.184;}
  petal.setAttribute('uv',new THREE.BufferAttribute(uv,2));
  const petals=new THREE.InstancedMesh(petal,petalsMaterial,60),centers=new THREE.InstancedMesh(G(blossomCenterGeometry()),flowerCenterMaterial,12);
  const sepals=new THREE.InstancedMesh(G(new THREE.ConeGeometry(.0038,.008,5)),sepalsMaterial,12);
  const buds=new THREE.InstancedMesh(lathe([[0,0],[.003,0],[.005,.006],[.0055,.011],[.003,.017],[0,.019]],12),budMaterial,6);
  let flowerIndex=0,petalIndex=0,budIndex=0;
  for(let stemIndex=0;stemIndex<3;stemIndex++) {
    const stem=mainStems[stemIndex];
    for(const t of [.48,.65,.82,1]) {
      const base=stem.getPoint(t),end=base.clone().add(V([(random()-.5)*.055,.010+random()*.022,.008+random()*.028]));
      branch(stems,[base,base.clone().lerp(end,.55).add(V([0,.003,0])),end],.0011,5,6);
      const orientation=new THREE.Quaternion().setFromEuler(new THREE.Euler((random()-.5)*.8,(random()-.5)*1.0,random()*Math.PI*2));
      for(let petalNumber=0;petalNumber<5;petalNumber++) {
        dummy.position.copy(end);dummy.quaternion.copy(orientation).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),petalNumber*Math.PI*2/5));
        const scale=.102+(random()-.5)*.012;dummy.scale.set(scale,scale,scale);dummy.updateMatrix();petals.setMatrixAt(petalIndex++,dummy.matrix);
      }
      dummy.position.copy(end);dummy.quaternion.copy(orientation);dummy.scale.setScalar(.105);dummy.updateMatrix();centers.setMatrixAt(flowerIndex,dummy.matrix);
      dummy.position.copy(end).add(new THREE.Vector3(0,0,-.004).applyQuaternion(orientation));dummy.quaternion.copy(orientation).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI/2));dummy.scale.setScalar(1);dummy.updateMatrix();sepals.setMatrixAt(flowerIndex++,dummy.matrix);
    }
    for(const t of [.38,.91]) {
      const base=stem.getPoint(t),end=base.clone().add(V([stemIndex===1?-.018:.015,.022,-.008]));branch(stems,[base,base.clone().lerp(end,.6),end],.0008,4,5);
      dummy.position.copy(end);dummy.quaternion.setFromUnitVectors(UP,end.clone().sub(base).normalize());dummy.scale.setScalar(.8+random()*.25);dummy.updateMatrix();buds.setMatrixAt(budIndex++,dummy.matrix);
    }
  }
  stems.finish();
  for(const [value,name] of [[petals,'sakura-petals'],[centers,'sakura-stamens'],[sepals,'sakura-sepals'],[buds,'sakura-buds']] as const){value.name=name;value.castShadow=true;value.receiveShadow=true;value.instanceMatrix.needsUpdate=true;value.computeBoundingSphere();ikebana.add(value);}

  // A solid textile mounting and separate paper sheet retain the old scroll dimensions.
  const scroll=new THREE.Group();scroll.name='tokonoma-scroll';scroll.position.set(-.58+STUDIO_OFFSETS.alcove[0],1.3,STUDIO_ROOM.back+.004);group.add(scroll);
  const sheet=(width:number,height:number,thickness:number,columns:number,rows:number,paper=false)=>{
    const positions:number[]=[],uv:number[]=[],indices:number[]=[],stride=columns+1,count=stride*(rows+1);
    for(let side=0;side<2;side++)for(let row=0;row<=rows;row++)for(let col=0;col<=columns;col++) {
      const u=col/columns,v=row/rows,x=(u-.5)*width,y=(v-.5)*height;
      const bow=paper?.0015+Math.pow(Math.abs(u-.5)*2,5)*.003+.0005*Math.sin(v*13+u*4):.00035*Math.sin(v*19+u*3);
      positions.push(x,y,bow+(side?-.5:.5)*thickness);uv.push(u,v);
      if(row<rows&&col<columns){const a=side*count+row*stride+col,b=a+1,c=a+stride,d=c+1;indices.push(...(side?[a,c,b,b,c,d]:[a,b,c,b,d,c]));}
    }
    const edge=(a:number,b:number)=>indices.push(a,a+count,b,b,a+count,b+count);
    for(let col=0;col<columns;col++){edge(col+1,col);edge(rows*stride+col,rows*stride+col+1);}
    for(let row=0;row<rows;row++){edge(row*stride,(row+1)*stride);edge((row+1)*stride+columns,row*stride+columns);}
    const result=new THREE.BufferGeometry();result.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));result.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));result.setIndex(indices);result.computeVertexNormals();return G(result);
  };
  mesh(scroll,'woven-scroll-mounting',sheet(.3,.66,.0016,10,24),clothMaterial);
  const paperCanvas=document.createElement('canvas');paperCanvas.width=512;paperCanvas.height=1024;
  const inkCanvas=document.createElement('canvas');inkCanvas.width=512;inkCanvas.height=1024;
  const paperTexture=T(new THREE.CanvasTexture(paperCanvas));paperTexture.colorSpace=THREE.SRGBColorSpace;paperTexture.anisotropy=4;
  const paperMaterial=standard('#ffffff',{map:paperTexture,roughness:.97});
  mesh(scroll,'washi-calligraphy',sheet(.249,.495,.0008,12,24,true),paperMaterial,[0,0,.002]);
  const rodGeometry=G(new THREE.CylinderGeometry(.006,.006,.34,20));
  const roller=mesh(scroll,'bottom-scroll-roller',rodGeometry,woodMaterial,[0,-.323,.006]);roller.rotation.z=Math.PI/2;
  const bar=mesh(scroll,'upper-scroll-bar',G(new THREE.CylinderGeometry(.004,.004,.302,16)),woodMaterial,[0,.327,.003]);bar.rotation.z=Math.PI/2;
  for(const side of [-1,1]){const cap=mesh(scroll,'roller-cap',G(new THREE.CylinderGeometry(.008,.008,.012,16)),darkWoodMaterial,[side*.175,-.323,.006]);cap.rotation.z=Math.PI/2;}
  for(const side of [-1,1]){const path=new THREE.CatmullRomCurve3([V([side*.11,.326,0]),V([side*.064,.35,.001]),V([0,.365,-.001])]);mesh(scroll,'suspension-cord',G(new THREE.TubeGeometry(path,12,.0009,5,false)),cordMaterial);}
  const peg=mesh(scroll,'scroll-hanging-peg',G(new THREE.CylinderGeometry(.003,.003,.007,12)),darkWoodMaterial,[0,.365,-.002]);peg.rotation.x=Math.PI/2;

  let alive=true,washiImage:CanvasImageSource|null=null,loading:Promise<void>|null=null;
  const listeners=new Set<()=>void>();
  const status={phase:'idle',loaded:[] as string[],glyph:'守',glyphReady:false,version:0};
  const notify=()=>{if(!alive)return;status.version++;listeners.forEach(callback=>callback());};
  const repaintPaper=()=>{
    if(!alive)return;const context=paperCanvas.getContext('2d')!,ink=inkCanvas.getContext('2d')!,noise=seeded(9321);
    context.fillStyle='#f4ead6';context.fillRect(0,0,512,1024);
    if(washiImage){context.globalAlpha=.65;context.drawImage(washiImage,0,0,512,512);context.drawImage(washiImage,0,512,512,512);context.globalAlpha=1;}
    ink.clearRect(0,0,512,1024);ink.font='400 360px "Noto Serif JP","Yu Mincho",serif';ink.textAlign='center';ink.textBaseline='middle';ink.fillStyle='#9f3f2a';ink.fillText('守',256,492);
    const pixels=ink.getImageData(0,0,512,1024);
    for(let i=0;i<pixels.data.length;i+=4)if(pixels.data[i+3]){const n=noise();pixels.data[i]+=Math.round((n-.5)*9);pixels.data[i+1]+=Math.round((n-.5)*5);pixels.data[i+3]*=.80+n*.20;if(n<.0015)pixels.data[i+3]*=.2;}
    ink.putImageData(pixels,0,0);context.save();context.shadowColor='#9f3f2a28';context.shadowBlur=1;context.drawImage(inkCanvas,0,0);context.restore();paperTexture.needsUpdate=true;
  };
  repaintPaper();
  const bump=(source:THREE.Texture,repeat?:THREE.Vector2)=>{const value=T(source.clone());value.colorSpace=THREE.NoColorSpace;if(repeat){value.wrapS=value.wrapT=THREE.RepeatWrapping;value.repeat.copy(repeat);}value.needsUpdate=true;return value;};
  const loadDecorations=(invalidate:()=>void)=>{
    if(!alive)return Promise.resolve();listeners.add(invalidate);if(loading){invalidate();return loading;}
    status.phase='loading';notify();const loader=new THREE.TextureLoader();
    const load=async(name:string,apply:(texture:THREE.Texture)=>void)=>{
      const texture=await loader.loadAsync(`/media/studio/decor-${name}-v1.webp`);
      if(!alive){texture.dispose();return;}T(texture);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;apply(texture);status.loaded.push(name);notify();
    };
    loading=Promise.allSettled([
      load('bark',texture=>{texture.wrapS=texture.wrapT=THREE.RepeatWrapping;pineBark.map=texture;pineBark.bumpMap=bump(texture);pineBark.color.set('#ffffff');pineBark.needsUpdate=true;}),
      load('petal',texture=>{petalsMaterial.map=texture;petalsMaterial.bumpMap=bump(texture);petalsMaterial.bumpScale=.0001;petalsMaterial.alphaTest=.08;petalsMaterial.needsUpdate=true;}),
      load('washi',texture=>{washiImage=texture.image as HTMLImageElement;paperMaterial.bumpMap=bump(texture,new THREE.Vector2(1,2));paperMaterial.bumpScale=.0002;paperMaterial.needsUpdate=true;repaintPaper();}),
      document.fonts.load('400 360px "Noto Serif JP"','守').then(()=>{if(!alive)return;status.glyphReady=true;repaintPaper();notify();}),
    ]).then(results=>{if(!alive)return;status.phase=results.every(result=>result.status==='fulfilled')?'ready':'partial';notify();});
    return loading;
  };
  const metrics={needles:needles.count,flowers:centers.count,petals:petals.count,buds:buds.count,meshes:0,triangles:0};
  group.traverse(object=>{if(object instanceof THREE.Mesh){metrics.meshes++;metrics.triangles+=(object.geometry.index?.count??object.geometry.getAttribute('position').count)/3*(object instanceof THREE.InstancedMesh?object.count:1);}});
  group.userData.decorations={status,metrics};
  return {group,bonsai,ikebana,scroll,status,metrics,loadDecorations,
    dispose(){if(!alive)return;alive=false;status.phase='disposed';listeners.clear();group.traverse(object=>{if(object instanceof THREE.InstancedMesh)object.dispose();});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());},
  };
}
export type StudioDecorations=ReturnType<typeof createStudioDecorations>;
