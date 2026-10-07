import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { STUDIO_OFFSETS } from './studio-layout';

/** Small glazed hibachi and cast-iron kettle, built at the original floor anchor. */
export function createStudioHearth({contact}:{contact:THREE.Texture}) {
  const group=new THREE.Group();group.name='studio-hibachi';
  group.position.set(-.82,.392,.56).add(new THREE.Vector3(...STUDIO_OFFSETS.hearth));
  const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();
  const G=<T extends THREE.BufferGeometry>(value:T)=>{geometries.add(value);return value;};
  const M=<T extends THREE.Material>(value:T)=>{materials.add(value);return value;};
  let seed=62019;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const surface=(kind:'glaze'|'iron'|'ash'|'coal')=>{
    const size=256,data=new Uint8Array(size*size*4);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
      const i=(y*size+x)*4,grain=random(),cloud=Math.sin(x*.063+Math.sin(y*.044)*2)*Math.sin(y*.049)+Math.sin(x*.019+y*.023)*.5;
      if(kind==='glaze') {
        const tone=cloud*6+(grain-.5)*7;
        data[i]=55+tone;data[i+1]=42+tone*.86;data[i+2]=32+tone*.8;
      } else if(kind==='iron') {
        const tone=47+cloud*3+grain*13;
        data[i]=tone+2;data[i+1]=tone+1;data[i+2]=tone;
      } else if(kind==='ash') {
        const tone=169+cloud*13+(grain-.5)*24;
        data[i]=tone+10;data[i+1]=tone+6;data[i+2]=tone;
      } else {
        const crack=Math.abs(Math.sin(x*.21+Math.sin(y*.11)*2))<.12;
        const tone=crack?12:29+cloud*3+grain*12;
        data[i]=tone+2;data[i+1]=tone;data[i+2]=tone-1;
      }
      data[i+3]=255;
    }
    const texture=new THREE.DataTexture(data,size,size);texture.colorSpace=THREE.SRGBColorSpace;
    texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;
    texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=4;texture.needsUpdate=true;textures.add(texture);
    return texture;
  };
  const bump=(source:THREE.Texture)=>{const texture=source.clone();texture.colorSpace=THREE.NoColorSpace;texture.needsUpdate=true;textures.add(texture);return texture;};
  const glazeMap=surface('glaze'),ironMap=surface('iron'),ashMap=surface('ash'),coalMap=surface('coal');
  const glaze=M(new THREE.MeshPhysicalMaterial({map:glazeMap,bumpMap:bump(glazeMap),bumpScale:.0005,roughness:.34,clearcoat:.55,clearcoatRoughness:.24}));
  const innerClay=M(new THREE.MeshStandardMaterial({color:'#514339',roughness:.94}));
  const iron=M(new THREE.MeshStandardMaterial({map:ironMap,bumpMap:bump(ironMap),bumpScale:.00028,roughness:.68,metalness:.48}));
  const wornIron=M(new THREE.MeshStandardMaterial({color:'#6a6051',roughness:.56,metalness:.55}));
  const ash=M(new THREE.MeshStandardMaterial({map:ashMap,bumpMap:bump(ashMap),bumpScale:.0007,roughness:1}));
  const coal=M(new THREE.MeshStandardMaterial({map:coalMap,bumpMap:bump(coalMap),bumpScale:.0011,roughness:1}));
  const ember=M(new THREE.MeshStandardMaterial({color:'#542719',emissive:'#c74b1f',emissiveIntensity:.38,roughness:1}));
  const dark=M(new THREE.MeshStandardMaterial({color:'#151513',roughness:1}));
  const mesh=(parent:THREE.Group,name:string,geometry:THREE.BufferGeometry,material:THREE.Material,position:number[]=[0,0,0])=>{
    const value=new THREE.Mesh(geometry,material);value.name=name;value.position.fromArray(position);value.castShadow=true;value.receiveShadow=true;parent.add(value);return value;
  };
  const lathe=(profile:number[][],segments=64)=>{
    const curve=new THREE.CatmullRomCurve3(profile.map(([r,y])=>new THREE.Vector3(r,y,0)),false,'centripetal');
    return G(new THREE.LatheGeometry(curve.getPoints(profile.length*3).map(p=>new THREE.Vector2(Math.max(0,p.x),p.y)),segments));
  };
  const batch=(parent:THREE.Group,name:string,material:THREE.Material)=>{
    const pieces:THREE.BufferGeometry[]=[];
    return {add(geometry:THREE.BufferGeometry){if(geometry.index){pieces.push(geometry.toNonIndexed());geometry.dispose();}else pieces.push(geometry);},finish(){if(!pieces.length)return;const combined=mergeGeometries(pieces);pieces.forEach(p=>p.dispose());if(combined)mesh(parent,name,G(combined),material);}};
  };
  const path=(points:number[][],radius:number)=>new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),false,'centripetal'),24,radius,8,false);

  // Hollow vessel: rounded lip, fired surface, inner lining and a recessed ash bed.
  mesh(group,'glazed-hibachi-shell',lathe([[.088,0],[.105,.007],[.124,.037],[.136,.091],[.137,.15],[.131,.177],[.124,.184],[.119,.181],[.118,.175],[.122,.15],[.119,.102]]),glaze);
  mesh(group,'hibachi-foot',lathe([[.085,.002],[.089,.005],[.090,.012],[.083,.016]]),innerClay);
  const liner=mesh(group,'fired-inner-lining',lathe([[.119,.177],[.117,.166],[.108,.125],[.092,.085]]),innerClay);
  liner.material.side=THREE.DoubleSide;
  const bed=G(new THREE.CircleGeometry(.118,64)),bedPosition=bed.getAttribute('position');
  for(let i=0;i<bedPosition.count;i++) {
    const x=bedPosition.getX(i),y=bedPosition.getY(i),r=Math.hypot(x,y);
    bedPosition.setZ(i,.003*Math.sin(x*46+y*29)+.002*Math.cos(y*61)-.004*(1-r/.118));
  }
  bed.computeVertexNormals();mesh(group,'uneven-ash-bed',bed,ash,[0,.153,0]).rotation.x=-Math.PI/2;
  const grainGeometry=G(new THREE.IcosahedronGeometry(1,0)),dummy=new THREE.Object3D();
  const grains=new THREE.InstancedMesh(grainGeometry,ash,100);grains.name='loose-ash-grains';grains.receiveShadow=true;
  for(let i=0;i<grains.count;i++) {
    const angle=random()*Math.PI*2,r=.068+random()*.047;
    dummy.position.set(Math.cos(angle)*r,.155+random()*.002,Math.sin(angle)*r);
    dummy.rotation.set(random(),random(),random());dummy.scale.set(.0015+random()*.0015,.0006+random()*.0007,.0015+random()*.0015);dummy.updateMatrix();grains.setMatrixAt(i,dummy.matrix);
  }
  grains.computeBoundingSphere();group.add(grains);
  const logs=batch(group,'charcoal-pieces',coal),embers=batch(group,'buried-embers',ember),flakes=batch(group,'charcoal-ash-flakes',ash);
  for(let i=0;i<7;i++) {
    const angle=i*Math.PI*2/7+.2,x=Math.cos(angle)*.043,z=Math.sin(angle)*.043;
    const log=new THREE.CylinderGeometry(.012,.014,.05,9,4),position=log.getAttribute('position');
    for(let j=0;j<position.count;j++) {
      const y=position.getY(j),a=Math.atan2(position.getZ(j),position.getX(j)),warp=1+.12*Math.sin(a*3+y*80+i);
      position.setXYZ(j,position.getX(j)*warp,y,position.getZ(j)*warp);
    }
    log.computeVertexNormals();log.rotateZ(Math.PI/2);log.rotateY(angle+.35);log.translate(x,.165,z);logs.add(log);
    const glow=grainGeometry.clone();glow.scale(.008,.004,.009);glow.translate(x*.86,.156,z*.86);embers.add(glow);
    for(let j=0;j<4;j++) {
      const flake=grainGeometry.clone();flake.scale(.002+random()*.002,.0007,.003+random()*.002);flake.rotateY(random()*Math.PI);flake.translate(x+(random()-.5)*.023,.177+random()*.001,z+(random()-.5)*.012);flakes.add(flake);
    }
  }
  logs.finish();embers.finish();flakes.finish();

  // Three iron feet and a ring actually support the kettle above the charcoal.
  const trivet=batch(group,'three-legged-trivet',iron);
  const ring=new THREE.TorusGeometry(.045,.0028,8,48);ring.rotateX(Math.PI/2);ring.translate(0,.209,0);trivet.add(ring);
  for(let i=0;i<3;i++) {
    const a=i*Math.PI*2/3+.4,x=Math.cos(a),z=Math.sin(a);
    trivet.add(path([[x*.060,.155,z*.060],[x*.057,.193,z*.057],[x*.044,.212,z*.044],[x*.033,.214,z*.033]],.003));
  }
  trivet.finish();
  const kettle=new THREE.Group();kettle.name='tetsubin-kettle';kettle.position.y=.212;kettle.rotation.y=-.35;group.add(kettle);
  const kettleProfile=[[.035,0],[.053,.004],[.068,.019],[.075,.041],[.075,.054],[.071,.072],[.062,.085],[.050,.092],[.046,.093],[.042,.087]];
  mesh(kettle,'cast-iron-kettle-body',lathe(kettleProfile),iron);
  const bottom=mesh(kettle,'kettle-bottom',G(new THREE.CircleGeometry(.035,32)),iron);bottom.rotation.x=Math.PI/2;
  mesh(kettle,'separate-kettle-lid',lathe([[0,.092],[.044,.092],[.049,.094],[.050,.097],[.045,.099],[.025,.103],[.012,.104],[0,.104]]),iron);
  mesh(kettle,'lid-finial',lathe([[0,.104],[.005,.104],[.006,.109],[.009,.114],[.007,.122],[0,.126]],24),iron);
  const lidRim=mesh(kettle,'worn-lid-rim',G(new THREE.TorusGeometry(.0485,.0007,6,64)),wornIron,[0,.097,0]);lidRim.rotation.x=Math.PI/2;
  const vent=mesh(kettle,'lid-steam-hole',G(new THREE.CircleGeometry(.0014,10)),dark,[.017,.1035,.006]);vent.rotation.x=-Math.PI/2;

  // Raised cast-iron dots follow the belly rather than floating over its silhouette.
  const reliefGeometry=G(new THREE.SphereGeometry(1,6,4)),relief=new THREE.InstancedMesh(reliefGeometry,iron,440);
  relief.name='cast-iron-arare-relief';relief.castShadow=true;relief.receiveShadow=true;
  const outer=new THREE.CatmullRomCurve3(kettleProfile.map(([r,y])=>new THREE.Vector3(r,y,0)),false,'centripetal').getPoints(400);
  let dot=0;
  for(let row=0;row<10;row++) {
    const y=.019+row*.0065;
    const upper=outer.findIndex(p=>p.y>=y),p0=outer[upper-1],p1=outer[upper];
    const radius=THREE.MathUtils.lerp(p0.x,p1.x,(y-p0.y)/(p1.y-p0.y))+.0003;
    for(let column=0;column<44;column++) {
      const a=(column+(row%2)*.5)*Math.PI*2/44;
      dummy.position.set(Math.sin(a)*radius,y,Math.cos(a)*radius);dummy.rotation.set(0,a,0);dummy.scale.set(.00135,.00135,.00085);dummy.updateMatrix();relief.setMatrixAt(dot++,dummy.matrix);
    }
  }
  relief.computeBoundingSphere();kettle.add(relief);

  // Hollow tapered spout: separate inner wall and a visible open mouth.
  const spoutCurve=new THREE.CatmullRomCurve3([[.060,.041,0],[.078,.047,0],[.093,.064,0],[.100,.085,0],[.103,.090,0]].map(p=>new THREE.Vector3(...p)),false,'centripetal');
  const frames=spoutCurve.computeFrenetFrames(24,false),positions:number[]=[],uv:number[]=[],indices:number[]=[],stride=13,rings=25;
  for(let wall=0;wall<2;wall++)for(let i=0;i<rings;i++)for(let j=0;j<stride;j++) {
    const t=i/24,a=j/12*Math.PI*2,r=.015*(1-t)+.006*t-(wall?.0015:0);
    const p=spoutCurve.getPoint(t).addScaledVector(frames.normals[i],Math.cos(a)*r).addScaledVector(frames.binormals[i],Math.sin(a)*r);
    positions.push(p.x,p.y,p.z);uv.push(j/12,t);
    if(i<24&&j<12){const n=wall*rings*stride+i*stride+j;indices.push(...(wall?[n,n+stride,n+1,n+1,n+stride,n+stride+1]:[n,n+1,n+stride,n+1,n+stride+1,n+stride]));}
  }
  for(let j=0;j<12;j++){const a=24*stride+j,b=rings*stride+a;indices.push(a,b,a+1,a+1,b,b+1);}
  const spout=G(new THREE.BufferGeometry());spout.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));spout.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));spout.setIndex(indices);spout.computeVertexNormals();mesh(kettle,'hollow-curved-spout',spout,iron);
  const hollow=mesh(kettle,'spout-interior',G(new THREE.CircleGeometry(.0046,16)),dark,spoutCurve.getPoint(.89).toArray());hollow.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),spoutCurve.getTangent(.89));
  const handle=batch(kettle,'arched-kettle-handle',iron),mounts=batch(kettle,'handle-lugs-and-rivets',wornIron);
  handle.add(path([[-.057,.076,0],[-.066,.101,0],[-.059,.153,0],[-.033,.181,0],[0,.188,0],[.036,.177,0],[.060,.150,0],[.065,.102,0],[.057,.076,0]],.0034));handle.finish();
  for(const side of [-1,1]) {
    const lug=new THREE.TorusGeometry(.005,.002,6,16);lug.rotateY(Math.PI/2);lug.translate(side*.061,.076,0);mounts.add(lug);
    const rivet=grainGeometry.clone();rivet.scale(.003,.004,.004);rivet.translate(side*.065,.076,0);mounts.add(rivet);
  }
  mounts.finish();
  const contactMaterial=M(new THREE.MeshBasicMaterial({color:'#34271d',map:contact,transparent:true,opacity:.38,depthWrite:false,toneMapped:false}));
  const shadow=mesh(group,'hibachi-contact-shadow',G(new THREE.PlaneGeometry(.4,.4)),contactMaterial,[0,.0001,0]);shadow.rotation.x=-Math.PI/2;shadow.castShadow=false;
  const metrics={meshes:0,triangles:0};
  group.traverse(object=>{if(object instanceof THREE.Mesh){metrics.meshes++;metrics.triangles+=(object.geometry.index?.count??object.geometry.getAttribute('position').count)/3*(object instanceof THREE.InstancedMesh?object.count:1);}});
  group.userData.hearth=metrics;
  let alive=true;
  return {group,kettle,metrics,dispose(){if(!alive)return;alive=false;group.traverse(object=>{if(object instanceof THREE.InstancedMesh)object.dispose();});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}};
}
