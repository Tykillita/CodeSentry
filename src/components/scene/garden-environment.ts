import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createStudioInterior, READING_STAND } from './house-interior';
import { STUDIO_ROOM as room, createStudioPoints } from './studio-layout';

type ScreenBounds={left:number;top:number;width:number;height:number};
const green='#8c9a88';

function silhouette(points:number[][]) {
  const shape=new THREE.Shape();
  points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));
  shape.lineTo(1,0);shape.lineTo(0,0);shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

// These are world objects. Only a viewport resize lays them out again;
// scrolling changes their projection through the same camera as the tree.
export function createGardenEnvironment() {
  const group=new THREE.Group();group.name='garden-world';
  const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();
  const instances=new Set<THREE.InstancedMesh>();
  const geometry=<T extends THREE.BufferGeometry>(value:T)=>{geometries.add(value);return value;};
  const material=<T extends THREE.Material>(value:T)=>{materials.add(value);return value;};
  const wash=(color:string,opacity:number)=>material(new THREE.MeshBasicMaterial({color,transparent:true,opacity,side:THREE.DoubleSide,depthWrite:false,toneMapped:false}));
  const solid=(color:string)=>material(new THREE.MeshStandardMaterial({color,roughness:1}));
  const addMesh=(parent:THREE.Group,geom:THREE.BufferGeometry,mat:THREE.Material,position:number[],scale:number[]= [1,1,1])=>{
    const mesh=new THREE.Mesh(geom,mat);mesh.position.fromArray(position);mesh.scale.fromArray(scale);parent.add(mesh);return mesh;
  };
  const box=geometry(new THREE.BoxGeometry(1,1,1));
  const circle=geometry(new THREE.CircleGeometry(1,48));
  const sphere=geometry(new THREE.SphereGeometry(1,9,5));

  // Small, deterministic textures give the joinery and stone a surface without
  // downloads. They are created once with the world and released with it.
  const surfaceTexture=(kind:'wood'|'stone'|'shadow')=>{
    const size=256,data=new Uint8Array(size*size*4);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
      const offset=(y*size+x)*4;
      const noise=((Math.imul(x+17,374761393)^Math.imul(y+31,668265263))>>>0)%101/100;
      const grain=kind==='wood'?.92+.045*Math.sin(x*.49+Math.sin(y*.06)*1.7)+.025*noise:.90+.10*noise;
      const shade=Math.round(grain*255);
      data[offset]=data[offset+1]=data[offset+2]=kind==='shadow'?255:shade;
      const radius=Math.hypot((x-127.5)/127.5,(y-127.5)/127.5);
      data[offset+3]=kind==='shadow'?Math.round(255*Math.exp(-3*radius*radius)*Math.pow(Math.max(0,1-radius*radius),.8)):255;
    }
    const value=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);
    value.colorSpace=THREE.SRGBColorSpace;value.wrapS=value.wrapT=THREE.RepeatWrapping;
    value.magFilter=THREE.LinearFilter;value.minFilter=THREE.LinearMipmapLinearFilter;
    value.generateMipmaps=true;value.needsUpdate=true;textures.add(value);return value;
  };
  const woodTexture=surfaceTexture('wood'),stoneTexture=surfaceTexture('stone');
  const wood=material(new THREE.MeshStandardMaterial({color:'#70503b',map:woodTexture,bumpMap:woodTexture,bumpScale:.012,roughness:.93}));
  const darkWood=material(new THREE.MeshStandardMaterial({color:'#493325',map:woodTexture,roughness:.96}));
  const stone=material(new THREE.MeshStandardMaterial({color:'#8b8a7b',map:stoneTexture,bumpMap:stoneTexture,bumpScale:.016,roughness:1}));
  const roofMaterial=material(new THREE.MeshStandardMaterial({color:'#4b5250',map:stoneTexture,roughness:.94}));
  const tileMaterial=material(new THREE.MeshStandardMaterial({color:'#606560',map:stoneTexture,roughness:.94}));
  const recess=material(new THREE.MeshStandardMaterial({color:'#302c26',roughness:1}));
  const paper=material(new THREE.MeshStandardMaterial({color:'#fff3d9',roughness:1,emissive:'#dda465',emissiveIntensity:.07}));
  const contactTexture=surfaceTexture('shadow');
  // Clamp the fading edge so a footprint cannot repeat outside its plane.
  contactTexture.wrapS=contactTexture.wrapT=THREE.ClampToEdgeWrapping;
  const contact=material(new THREE.MeshBasicMaterial({color:'#625749',map:contactTexture,transparent:true,opacity:.28,depthWrite:false,toneMapped:false}));
  const shadowPlane=geometry(new THREE.PlaneGeometry(1,1));
  const shadow=(parent:THREE.Group,width:number,depth:number)=>{
    const mesh=addMesh(parent,shadowPlane,contact,[0,.003,0],[width,depth,1]);mesh.rotation.x=-Math.PI/2;mesh.renderOrder=2;mesh.name='soft-contact-shadow';
  };
  // Joinery with the same finish is merged into one draw call per material.
  const batch=(parent:THREE.Group)=>{
    const pieces=new Map<THREE.Material,THREE.BufferGeometry[]>();
    const transform=new THREE.Object3D();
    return {
      add(geom:THREE.BufferGeometry,mat:THREE.Material,position:number[],scale:number[]=[1,1,1],rotation:number[]=[0,0,0]) {
        transform.position.fromArray(position);transform.scale.fromArray(scale);transform.rotation.set(rotation[0],rotation[1],rotation[2]);transform.updateMatrix();
        const piece=(geom.index?geom.toNonIndexed():geom.clone()).applyMatrix4(transform.matrix);
        const collection=pieces.get(mat)??[];collection.push(piece);pieces.set(mat,collection);
      },
      finish() {
        pieces.forEach((collection,mat)=>{
          const merged=mergeGeometries(collection);
          collection.forEach(piece=>piece.dispose());
          if(merged)addMesh(parent,geometry(merged),mat,[0,0,0]);
        });
      },
    };
  };

  // Four curved roof slopes meet at a short ridge; the underside is closed,
  // so the eaves retain thickness when the shared camera travels around them.
  const roofBase=room.ceiling+.13,roofRidge=.85,roofRun=1.6,roofDepth=2.85;
  const roofHeight=(t:number)=>roofBase+.82*Math.pow(1-t,1.45)+.06*Math.pow(t,8);
  const roofSlope=(t:number)=>-1.189*Math.pow(1-t,.45)+.48*Math.pow(t,7);
  const hipRoof=()=>{
    const positions:number[]=[],uvs:number[]=[],indices:number[]=[];
    for(let layer=0;layer<2;layer++)for(let row=0;row<=12;row++) {
      const t=row/12,x=roofRidge+roofRun*t,z=roofDepth*t,y=roofHeight(t)-layer*.105;
      for(const [px,pz] of [[-x,-z],[x,-z],[x,z],[-x,z]]){positions.push(px,y,pz+room.centerZ);uvs.push((px+2.45)/3.6,(pz+roofDepth)/2.3);}
    }
    for(let layer=0;layer<2;layer++)for(let row=0;row<12;row++)for(let side=0;side<4;side++) {
      const a=layer*52+row*4+side,b=layer*52+row*4+(side+1)%4,c=b+4,d=a+4;
      indices.push(...(layer?[a,d,b,b,d,c]:[a,b,d,b,c,d]));
    }
    for(let side=0;side<4;side++) {
      const a=48+side,b=48+(side+1)%4;indices.push(a,b,a+52,b,b+52,a+52);
    }
    const value=new THREE.BufferGeometry();value.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));value.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));value.setIndex(indices);value.computeVertexNormals();return geometry(value);
  };
  const roundedBox=geometry(new THREE.ExtrudeGeometry(new THREE.Shape()
    .moveTo(-.5,-.5).lineTo(.5,-.5).lineTo(.5,.5).lineTo(-.5,.5).closePath(),
    {depth:1,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.07,bevelThickness:.07}));
  roundedBox.translate(0,0,-.5);
  const cylinder=geometry(new THREE.CylinderGeometry(1,1,1,12));
  // An arched tile surface catches a narrow highlight even at garden scale.
  const tilePositions:number[]=[],tileUVs:number[]=[],tileIndices:number[]=[];
  for(let z=0;z<2;z++)for(let x=0;x<=6;x++) {
    const u=x/6;tilePositions.push((u-.5)*.13,.023*Math.sin(u*Math.PI),(z-.5)*.22);tileUVs.push(u,z);
  }
  for(let x=0;x<6;x++)tileIndices.push(x,x+7,x+1,x+1,x+7,x+8);
  const tile=geometry(new THREE.BufferGeometry());tile.setAttribute('position',new THREE.Float32BufferAttribute(tilePositions,3));tile.setAttribute('uv',new THREE.Float32BufferAttribute(tileUVs,2));tile.setIndex(tileIndices);tile.computeVertexNormals();

  const moon=addMesh(group,circle,material(new THREE.MeshBasicMaterial({color:'#fff9ef',transparent:true,opacity:.74,fog:false,depthWrite:false,toneMapped:false})),[0,40,-160]);moon.name='distant-moon';
  const profiles=[
    [[0,.27],[.08,.48],[.16,.36],[.25,.66],[.31,.57],[.43,1],[.48,.74],[.54,.67],[.63,.36],[.70,.55],[.79,.40],[.88,.62],[1,.44]],
    [[0,.15],[.15,.47],[.23,.34],[.36,.65],[.44,.40],[.53,.68],[.63,.33],[.74,.53],[.84,.30],[.93,.64],[1,.35]],
    [[0,.15],[.12,.36],[.23,.11],[.39,.34],[.52,.21],[.65,.36],[.77,.10],[.89,.30],[1,.18]],
  ];
  const ridges=profiles.map((points,i)=>{
    const mesh=addMesh(group,geometry(silhouette(points)),wash(green,[.18,.19,.14][i]),[0,0,[-125,-70,-34][i]]);
    mesh.name=['far-mountains','middle-hills','garden-bank'][i];return mesh;
  });

  const ground=addMesh(group,geometry(new THREE.PlaneGeometry(220,220)),wash('#e5ddc8',.42),[0,-.035,-32]);
  ground.rotation.x=-Math.PI/2;ground.name='garden-floor';
  // The original paper wash stays unlit; this layer contributes only shadows.
  const shadowReceiver=addMesh(group,ground.geometry,material(new THREE.ShadowMaterial({color:'#625749',opacity:.24,depthWrite:false,toneMapped:false})),[0,-.030,-32]);
  shadowReceiver.rotation.x=-Math.PI/2;shadowReceiver.receiveShadow=true;shadowReceiver.renderOrder=1;shadowReceiver.name='sand-shadow-receiver';
  const rakePoints:number[]=[];
  // Wide rows converge toward the horizon; concentric strokes settle the roots.
  for(let z=-65;z<16;z+=1.7)for(let x=-46;x<46;x+=1.5) {
    const height=.012,shift=Math.sin(x*.22+z*.035)*.10;
    rakePoints.push(x,height,z+shift,x+1.5,height,z+Math.sin((x+1.5)*.22+z*.035)*.10);
  }
  for(let r=1.25;r<4.3;r+=.24)for(let i=0;i<72;i++) {
    const a=i/72*Math.PI*2,b=(i+1)/72*Math.PI*2;
    rakePoints.push(Math.cos(a)*r,.017,Math.sin(a)*r*.72,Math.cos(b)*r,.017,Math.sin(b)*r*.72);
  }
  const rakeGeometry=geometry(new THREE.BufferGeometry());rakeGeometry.setAttribute('position',new THREE.Float32BufferAttribute(rakePoints,3));
  const raking=new THREE.LineSegments(rakeGeometry,material(new THREE.LineBasicMaterial({color:'#9b9983',transparent:true,opacity:.14,depthWrite:false})));
  raking.name='raked-sand';raking.renderOrder=3;group.add(raking);

  const stones=new THREE.InstancedMesh(sphere,solid('#b4b19d'),28);stones.name='stepping-stones';
  const stoneContacts=new THREE.InstancedMesh(shadowPlane,contact,28);stoneContacts.name='stone-contact-shadows';stoneContacts.renderOrder=2;instances.add(stoneContacts);
  const matrix=new THREE.Object3D();const stonePositions:THREE.Vector3[]=[];
  for(let i=0;i<28;i++) {
    const z=13-i*1.9,x=-3.1+Math.sin(i*.34)*1.1;
    matrix.position.set(x,.045,z);matrix.rotation.set(0,i*.73,0);matrix.scale.set(.44+(i%3)*.07,.08,.36+(i%2)*.05);matrix.updateMatrix();stones.setMatrixAt(i,matrix.matrix);
    stonePositions.push(matrix.position.clone());
    matrix.position.y=.003;matrix.rotation.set(-Math.PI/2,0,i*.73);matrix.scale.set(matrix.scale.x*2.7,matrix.scale.z*2.7,1);matrix.updateMatrix();stoneContacts.setMatrixAt(i,matrix.matrix);
  }
  stones.instanceMatrix.needsUpdate=true;stoneContacts.instanceMatrix.needsUpdate=true;stoneContacts.computeBoundingSphere();group.add(stones,stoneContacts);
  const rootContact=new THREE.Group();rootContact.name='tree-root-contact';rootContact.scale.set(1.15,1,.85);group.add(rootContact);shadow(rootContact,2.6,2.6);

  const pavilion=new THREE.Group();pavilion.name='single-roof-pavilion';group.add(pavilion);
  const houseParts=batch(pavilion);
  // Raised veranda, exposed posts and recessed panels give the house depth.
  const wallHeight=room.ceiling-room.floor,wallY=(room.ceiling+room.floor)/2;
  houseParts.add(box,stone,[0,.12,room.centerZ],[room.width+.57,.24,room.depth+.47]);
  houseParts.add(box,wood,[0,.29,room.centerZ],[room.width+.7,.16,room.depth+.60]);
  houseParts.add(box,wood,[0,wallY,room.back-.065],[room.width+.22,wallHeight,.12]);
  for(const side of [-1,1]) {
    houseParts.add(box,wood,[side*(room.right+.06),wallY,room.centerZ],[.12,wallHeight,room.depth]);
    for(const z of [room.back-.145,room.front+.08])houseParts.add(box,darkWood,[side*(room.right+.14),wallY,z],[.13,wallHeight+.1,.13]);
    houseParts.add(box,darkWood,[side*(room.doorWidth/2+.045),wallY,room.front+.05],[.09,wallHeight,.12]);
    houseParts.add(box,paper,[side*1.26,1.62,room.front+.01],[1.39,1.60,.045]);
    houseParts.add(box,paper,[side*(room.right+.132),1.62,room.centerZ],[.035,1.60,2.5]);
    // Front and side shoji lattice; the wood remains visible around the paper.
    for(let i=0;i<8;i++) {
      houseParts.add(box,wood,[side*(.565+i*.198),1.62,room.front+.043],[.022,1.64,.035]);
      houseParts.add(box,wood,[side*(room.right+.156),1.62,room.centerZ-1.25+i*2.5/7],[.035,1.64,.022]);
    }
    for(let i=0;i<7;i++) {
      const y=.82+i*1.6/6;
      houseParts.add(box,wood,[side*1.26,y,room.front+.049],[1.42,.025,.035]);
      houseParts.add(box,wood,[side*(room.right+.156),y,room.centerZ],[.035,.025,2.53]);
    }
    houseParts.add(box,wood,[side*1.26,.62,room.front+.03],[1.44,.50,.10]);
    houseParts.add(box,wood,[side*1.26,2.66,room.front+.03],[1.44,.48,.10]);
    houseParts.add(box,darkWood,[0,room.ceiling-.03,side>0?room.front+.08:room.back-.145],[room.width+.46,.13,.15]);
    houseParts.add(box,darkWood,[side*(room.right+.12),room.ceiling-.03,room.centerZ],[.13,.13,room.depth+.225]);
    for(let i=0;i<3;i++)houseParts.add(box,darkWood,[side*1.26,.43+i*.18,room.front+.089],[1.4,.015,.023]);
  }
  // the front shoji is its own group so it can slide open; the dark doorway hides once it does.
  const doorway=addMesh(pavilion,box,recess,[0,1.57,room.front-.015],[room.doorWidth-.04,2.4,.06]);doorway.name='doorway-shadow';
  const door=new THREE.Group();door.name='sliding-shoji';pavilion.add(door);
  const doorParts=batch(door);
  doorParts.add(box,wood,[0,1.57,room.front+.02],[.84,2.4,.06]);
  doorParts.add(box,paper,[0,1.86,room.front+.062],[.74,1.40,.025]);
  for(const x of [-.37,0,.37])doorParts.add(box,darkWood,[x,1.85,room.front+.08],[.022,1.44,.028]);
  for(let i=0;i<5;i++)doorParts.add(box,darkWood,[0,1.14+i*.36,room.front+.08],[.76,.025,.028]);
  doorParts.add(box,darkWood,[.355,1.03,room.front+.082],[.025,.10,.035]);
  doorParts.finish();
  houseParts.add(box,recess,[0,room.ceiling+.05,room.centerZ],[room.width+.45,.10,room.depth+.3]);
  for(let x=-room.right-.10;x<=room.right+.10;x+=.23)houseParts.add(box,wood,[x,room.ceiling+.09,room.centerZ],[.055,.08,room.depth+.69]);
  houseParts.finish();
  const roof=addMesh(pavilion,hipRoof(),roofMaterial,[0,0,0]);roof.name='curved-hip-roof';
  const tiles:THREE.Matrix4[]=[];
  const tileTransform=new THREE.Object3D();
  for(const side of [-1,1])for(let row=0;row<22;row++) {
    const t=.05+row*.043,halfX=roofRidge+roofRun*t,halfZ=roofDepth*t;
    for(let x=-halfX+.085;x<halfX-.06;x+=.14) {
      tileTransform.position.set(x,roofHeight(t)+.014,room.centerZ+side*halfZ);
      tileTransform.rotation.set(-side*Math.atan(roofSlope(t)/roofDepth),0,0);tileTransform.updateMatrix();tiles.push(tileTransform.matrix.clone());
    }
    for(let z=-halfZ+.085;z<halfZ-.06;z+=.14) {
      tileTransform.position.set(side*halfX,roofHeight(t)+.014,room.centerZ+z);
      tileTransform.rotation.set(0,side*Math.PI/2,side*Math.atan(roofSlope(t)/roofRun));tileTransform.updateMatrix();tiles.push(tileTransform.matrix.clone());
    }
  }
  const tiledRoof=new THREE.InstancedMesh(tile,tileMaterial,tiles.length);tiledRoof.name='individual-roof-tiles';
  tiles.forEach((value,i)=>tiledRoof.setMatrixAt(i,value));tiledRoof.instanceMatrix.needsUpdate=true;tiledRoof.computeBoundingSphere();pavilion.add(tiledRoof);instances.add(tiledRoof);
  const ridgeParts=batch(pavilion);
  ridgeParts.add(cylinder,tileMaterial,[0,roofHeight(0),room.centerZ],[.074,1.94,.074],[0,0,Math.PI/2]);
  for(const side of [-1,1])ridgeParts.add(cylinder,roofMaterial,[side*.97,roofHeight(0)+.01,room.centerZ],[.091,.035,.091],[0,0,Math.PI/2]);
  ridgeParts.finish();
  const houseContact=new THREE.Group();houseContact.position.z=room.centerZ;pavilion.add(houseContact);shadow(houseContact,4.9,5.4);

  // the studio inside the house and its entrance live in house-interior.ts.
  const studio=createStudioInterior({wood:woodTexture,contact:contactTexture});
  pavilion.add(studio.group,studio.entrance);
  const house={
    door,doorway,interior:studio.group,bounds:room,decorations:studio.decorations,loadDecorations:studio.loadDecorations,
    /** Local points of the walk in: in front of the steps, the threshold, the seat and the table. */
    points:createStudioPoints(READING_STAND.center),
    readingTilt:READING_STAND.tilt,
    setOpen(amount:number){door.position.x=-.86*amount;doorway.visible=amount<.04;},
    setInterior(visible:boolean){if(!visible)studio.setIndoor(0);},
    /** 0 outside, 1 seated: the sun dims and the room's own lights take over. */
    setIndoor(amount:number){sunlight.intensity=THREE.MathUtils.lerp(2.4,.5,THREE.MathUtils.smoothstep(amount,.3,1));studio.setIndoor(amount);},
    update:studio.update,
  };

  const lantern=new THREE.Group();lantern.name='stone-lantern';group.add(lantern);
  const lampParts=batch(lantern);
  lampParts.add(roundedBox,stone,[0,.055,0],[.46,.085,.46]);
  lampParts.add(cylinder,stone,[0,.17,0],[.19,.16,.19]);
  lampParts.add(cylinder,stone,[0,.46,0],[.097,.44,.097]);
  lampParts.add(cylinder,stone,[0,.70,0],[.18,.085,.18]);
  lampParts.add(roundedBox,stone,[0,.77,0],[.38,.085,.38]);
  // Four posts support the cap; there is no box behind the openings.
  for(const x of [-.146,.146])for(const z of [-.146,.146])lampParts.add(box,stone,[x,.955,z],[.062,.30,.062]);
  lampParts.add(roundedBox,stone,[0,1.11,0],[.39,.07,.39]);
  lampParts.add(cylinder,recess,[0,.833,0],[.105,.025,.105]);
  const flame=geometry(new THREE.SphereGeometry(1,10,8));
  const glow=material(new THREE.MeshStandardMaterial({color:'#fff3d9',emissive:'#dda465',emissiveIntensity:1.5,roughness:1}));
  lampParts.add(flame,glow,[0,.93,0],[.058,.081,.058]);
  const capProfile=[new THREE.Vector2(0,1.30),new THREE.Vector2(.10,1.285),new THREE.Vector2(.17,1.23),new THREE.Vector2(.29,1.19),new THREE.Vector2(.305,1.195),new THREE.Vector2(.29,1.15),new THREE.Vector2(0,1.15)];
  const cap=geometry(new THREE.LatheGeometry(capProfile.reverse(),4,Math.PI/4));
  lampParts.add(cap,stone,[0,0,0]);
  lampParts.add(cylinder,stone,[0,1.32,0],[.07,.06,.07]);
  lampParts.add(flame,stone,[0,1.385,0],[.062,.078,.062]);
  lampParts.finish();shadow(lantern,.85,.85);
  const light=new THREE.PointLight('#dda465',.12,.80,2);light.position.set(0,.93,0);lantern.add(light);

  // Only static architecture and stones enter the cached shadow map. The
  // moving canopy and petals keep their existing lightweight wind materials.
  const shadowCasters:THREE.Mesh[]=[stones];stones.castShadow=stones.receiveShadow=true;
  for(const object of [pavilion,lantern])object.traverse(child=>{
    // the studio has its own lights; the coarse sun map caused stripes indoors.
    for(let parent:THREE.Object3D|null=child;parent;parent=parent.parent)if(parent===studio.group)return;
    if(child instanceof THREE.Mesh&&child.material instanceof THREE.MeshStandardMaterial) {
      child.receiveShadow=true;
      child.castShadow=child!==tiledRoof&&child.material!==glow;
      if(child.castShadow)shadowCasters.push(child);
    }
  });
  const sunlight=new THREE.DirectionalLight('#fff4e5',2.4);sunlight.name='garden-sunlight';sunlight.castShadow=true;
  sunlight.shadow.autoUpdate=false;sunlight.shadow.intensity=.72;sunlight.shadow.radius=3;
  sunlight.shadow.bias=-.00015;sunlight.shadow.normalBias=.018;
  group.add(sunlight,sunlight.target);
  const shadowState={enabled:true,mapSize:2048,revision:0};
  const lightDirection=new THREE.Vector3(-5,12,16).normalize();
  const fitShadows=(width:number)=>{
    const mapSize=width<600?1024:2048;
    if(shadowState.mapSize!==mapSize){sunlight.shadow.dispose();sunlight.shadow.map=null;}
    shadowState.mapSize=mapSize;sunlight.shadow.mapSize.set(mapSize,mapSize);
    group.updateWorldMatrix(true,true);
    const bounds=new THREE.Box3();shadowCasters.forEach(mesh=>bounds.expandByObject(mesh));
    bounds.getCenter(sunlight.target.position);sunlight.position.copy(sunlight.target.position).addScaledVector(lightDirection,80);
    sunlight.updateWorldMatrix(true,false);sunlight.target.updateWorldMatrix(true,false);sunlight.shadow.updateMatrices(sunlight);
    const lightBounds=new THREE.Box3(),point=new THREE.Vector3(),floorPoint=new THREE.Vector3();
    for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]) {
      point.set(x,y,z);floorPoint.copy(point).addScaledVector(lightDirection,-(y+.030)/lightDirection.y);
      lightBounds.expandByPoint(point.applyMatrix4(sunlight.shadow.camera.matrixWorldInverse));
      lightBounds.expandByPoint(floorPoint.applyMatrix4(sunlight.shadow.camera.matrixWorldInverse));
    }
    const camera=sunlight.shadow.camera;
    camera.left=lightBounds.min.x-.7;camera.right=lightBounds.max.x+.7;
    camera.bottom=lightBounds.min.y-.7;camera.top=lightBounds.max.y+.7;
    camera.near=Math.max(.1,-lightBounds.max.z-5);camera.far=-lightBounds.min.z+5;camera.updateProjectionMatrix();
    sunlight.shadow.needsUpdate=shadowState.enabled;shadowState.revision++;
  };

  const ray=new THREE.Vector3();
  const onDepthPlane=(camera:THREE.PerspectiveCamera,x:number,y:number,z:number)=>{
    ray.set(x*2-1,1-y*2,.5).unproject(camera).sub(camera.position).normalize();
    return camera.position.clone().addScaledVector(ray,(z-camera.position.z)/ray.z);
  };
  return {
    group,
    shadowState,
    setShadowQuality(enabled:boolean) {
      studio.setQuality(enabled);
      if(shadowState.enabled===enabled)return;
      shadowState.enabled=enabled;sunlight.castShadow=enabled;shadowReceiver.visible=enabled;
      sunlight.shadow.needsUpdate=enabled;
      if(!enabled){sunlight.shadow.dispose();sunlight.shadow.map=null;}
    },
    landmarks:{moon,pavilion,farMountain:ridges[0],stone:stonePositions[9]},
    house,
    layout(camera:THREE.PerspectiveCamera,width:number,height:number,moonBounds:ScreenBounds) {
      const center=onDepthPlane(camera,(moonBounds.left+moonBounds.width/2)/width,(moonBounds.top+moonBounds.height/2)/height,-160);
      const edge=onDepthPlane(camera,(moonBounds.left+moonBounds.width)/width,(moonBounds.top+moonBounds.height/2)/height,-160);
      moon.position.copy(center);moon.scale.setScalar(center.distanceTo(edge));
      ridges.forEach((ridge,i)=>{
        const z=ridge.position.z;
        const left=onDepthPlane(camera,-.18,.92,z),right=onDepthPlane(camera,1.18,.92,z);
        const span=right.x-left.x;
        ridge.position.set(left.x,0,z);ridge.scale.set(span,span*[.15,.10,.055][i],1);
      });
      const house=onDepthPlane(camera,width<600?.85:.82,.91,-14);
      pavilion.position.set(house.x,0,-14);pavilion.rotation.y=-.12;pavilion.scale.setScalar(width<600?.68:.90);
      lantern.position.set(house.x-3.4,0,-4.2);
      fitShadows(width);studio.setQuality(shadowState.enabled&&width>=600);
    },
    dispose(){studio.dispose();sunlight.shadow.dispose();geometries.forEach(value=>value.dispose());materials.forEach(value=>value.dispose());textures.forEach(value=>value.dispose());instances.forEach(value=>value.dispose());stones.dispose();},
  };
}

export type GardenEnvironment=ReturnType<typeof createGardenEnvironment>;
