import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { createInteriorTextures } from './interior-textures';
import { STUDIO_ROOM as bounds, STUDIO_OFFSETS } from './studio-layout';
import { createStudioDecorations } from './studio-decorations';
import { createStudioHearth } from './studio-hearth';

/**
 * The studio and entrance use the same local bounds as the exterior pavilion.
 * Pieces sharing a finish are merged into one draw call per material.
 */
/**
 * kendai reading stand on the table. The makimono rests on it, tilted towards
 * whoever kneels at the table, so it reads well from eye level. `center` is the
 * board's top surface under the middle of the scroll.
 */
export const READING_STAND={tilt:.35,front:new THREE.Vector3(0,.695,.1),depth:.32,center:new THREE.Vector3(0,.695+Math.sin(.35)*.16+.006,.1-Math.cos(.35)*.16)};

export function createStudioInterior({wood,contact}:{wood:THREE.Texture;contact:THREE.Texture}) {
  RectAreaLightUniformsLib.init();
  const group=new THREE.Group();group.name='studio-interior';group.visible=false;
  const entrance=new THREE.Group();entrance.name='studio-entrance';
  entrance.position.z=bounds.front-.8;
  const textures=createInteriorTextures();
  const decorations=createStudioDecorations({wood,contact});group.add(decorations.group);
  const hearth=createStudioHearth({contact});group.add(hearth.group);
  const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();
  const geometry=<T extends THREE.BufferGeometry>(value:T)=>{geometries.add(value);return value;};
  const material=<T extends THREE.Material>(value:T)=>{materials.add(value);return value;};
  const standard=(color:string,options:THREE.MeshStandardMaterialParameters={})=>material(new THREE.MeshStandardMaterial({color,roughness:.88,...options}));
  const physical=(color:string,options:THREE.MeshPhysicalMaterialParameters={})=>material(new THREE.MeshPhysicalMaterial({color,roughness:.35,clearcoat:.9,clearcoatRoughness:.18,...options}));
  textures.plaster.repeat.set(3.65,3);textures.smoke.wrapT=THREE.RepeatWrapping;textures.ceiling.repeat.set(bounds.width/2.08,bounds.depth/1.37);textures.fabric.repeat.set(2,2);

  const finish={
    plaster:standard('#ffffff',{map:textures.plaster,bumpMap:textures.plaster,bumpScale:.018,roughness:1}),
    hinoki:standard('#d6b48c',{map:wood,roughness:.7}),
    darkWood:standard('#4a3326',{map:wood,roughness:.75}),
    walnut:standard('#5c3b27',{map:wood,roughness:.55}),
    lacquer:physical('#17110e'),
    lacquerRed:physical('#7c1f17'),
    tatami:standard('#ffffff',{map:textures.tatami,bumpMap:textures.tatami,bumpScale:.008,roughness:1}),
    tatamiEdge:standard('#ffffff',{map:textures.tatamiEdge,roughness:.9}),
    ceiling:standard('#ffffff',{map:textures.ceiling,roughness:.85}),
    fabric:standard('#ffffff',{map:textures.fabric,roughness:1}),
    indigo:standard('#2d3c52',{roughness:1}),
    gold:standard('#ffffff',{map:textures.screen,roughness:.5,metalness:.25,side:THREE.DoubleSide}),
    shoji:standard('#ffffff',{map:textures.shoji,emissive:'#fff3dc',emissiveMap:textures.shoji,emissiveIntensity:.85,roughness:1}),
    glowPaper:standard('#fff1d6',{emissive:'#ffb15e',emissiveIntensity:1.15,roughness:1}),
    ceramic:physical('#e9e1d2'),celadon:physical('#9fb7a2'),tenmoku:physical('#3b2a20'),
    iron:standard('#2b2a29',{roughness:.55,metalness:.65}),
    inkstone:standard('#1c1c1e',{roughness:.45}),
    aluminium:standard('#b9bcc0',{roughness:.32,metalness:.85}),
    keycap:standard('#efe6d2',{roughness:.55}),
    pine:standard('#3a5737',{roughness:.95}),blossom:standard('#f2c9d1',{roughness:.9}),bamboo:standard('#86a05a',{roughness:.7}),
    books:standard('#ffffff',{map:textures.books,roughness:.9}),
    paulownia:standard('#ffffff',{map:textures.paulownia,roughness:.85}),
    cord:standard('#9e3524',{roughness:.85}),cable:standard('#1f1f21',{roughness:.6}),
    stone:standard('#6f6d64',{roughness:.95}),
  };
  const fadeMaterial=material(new THREE.MeshBasicMaterial({map:textures.fade,transparent:true,depthWrite:false,toneMapped:false}));
  const contactMaterial=material(new THREE.MeshBasicMaterial({color:'#3a2a1c',map:contact,transparent:true,opacity:.5,depthWrite:false,toneMapped:false}));
  const smokeMaterial=material(new THREE.MeshBasicMaterial({map:textures.smoke,transparent:true,depthWrite:false,opacity:.55,toneMapped:false,side:THREE.DoubleSide}));
  // The moving wisps rise through a stationary envelope and dissolve at the top.
  smokeMaterial.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 vIncenseUV;').replace('#include <begin_vertex>','#include <begin_vertex>\nvIncenseUV=uv;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 vIncenseUV;').replace('#include <map_fragment>','#include <map_fragment>\ndiffuseColor.a *= smoothstep(0.0,0.12,vIncenseUV.y)*(1.0-smoothstep(0.45,1.0,vIncenseUV.y));');
  };
  smokeMaterial.customProgramCacheKey=()=> 'incense-rising-envelope';
  const norenMaterial=material(new THREE.MeshStandardMaterial({map:textures.noren,alphaTest:.5,side:THREE.DoubleSide,roughness:1}));

  const box=geometry(new THREE.BoxGeometry(1,1,1));
  const plane=geometry(new THREE.PlaneGeometry(1,1));
  const cylinder=geometry(new THREE.CylinderGeometry(1,1,1,14));
  const sphere=geometry(new THREE.SphereGeometry(1,12,8));
  const rounded=geometry(new THREE.ExtrudeGeometry(new THREE.Shape().moveTo(-.5,-.5).lineTo(.5,-.5).lineTo(.5,.5).lineTo(-.5,.5).closePath(),{depth:1,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.07,bevelThickness:.07}));
  rounded.translate(0,0,-.5);
  /** Rounded box with the bevel included in its outer size. */
  const R=(x:number,y:number,z:number)=>[x/1.14,y/1.14,z/1.14];
  const lathe=(profile:number[][],segments=24)=>geometry(new THREE.LatheGeometry(profile.map(([x,y])=>new THREE.Vector2(x,y)),segments));

  const batch=(parent:THREE.Group)=>{
    const pieces=new Map<THREE.Material,THREE.BufferGeometry[]>();const transform=new THREE.Object3D();
    return {
      add(geom:THREE.BufferGeometry,mat:THREE.Material,position:number[],scale:number[]=[1,1,1],rotation:number[]=[0,0,0]) {
        transform.position.fromArray(position);transform.scale.fromArray(scale);transform.rotation.set(rotation[0],rotation[1],rotation[2]);transform.updateMatrix();
        const piece=(geom.index?geom.toNonIndexed():geom.clone());
        for(const name of Object.keys(piece.attributes))if(!['position','normal','uv'].includes(name))piece.deleteAttribute(name);
        if(!piece.getAttribute('uv'))piece.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(piece.getAttribute('position').count*2),2));
        piece.applyMatrix4(transform.matrix);
        const list=pieces.get(mat)??[];list.push(piece);pieces.set(mat,list);
      },
      finish() {
        pieces.forEach((list,mat)=>{
          const merged=mergeGeometries(list);list.forEach(piece=>piece.dispose());
          if(merged){const mesh=new THREE.Mesh(geometry(merged),mat);mesh.receiveShadow=true;mesh.castShadow=mat!==finish.glowPaper&&mat!==finish.shoji;parent.add(mesh);}
        });
      },
    };
  };
  const roomBatch=batch(group),placement=new THREE.Vector3();
  const place=(offset:readonly number[]= [0,0,0])=>placement.fromArray(offset);
  const room={add(geom:THREE.BufferGeometry,mat:THREE.Material,position:number[],scale:number[]=[1,1,1],rotation:number[]=[0,0,0]) {
    roomBatch.add(geom,mat,[position[0]+placement.x,position[1]+placement.y,position[2]+placement.z],scale,rotation);
  },finish:roomBatch.finish};
  const flat=(parent:THREE.Group,mat:THREE.Material,position:number[],size:number[],rotation:number[])=>{
    const mesh=new THREE.Mesh(plane,mat);mesh.position.fromArray(position).add(placement);mesh.scale.set(size[0],size[1],1);mesh.rotation.set(rotation[0],rotation[1],rotation[2]);mesh.renderOrder=2;parent.add(mesh);return mesh;
  };
  const shadowUnder=(parent:THREE.Group,x:number,z:number,width:number,depth:number,y=.373)=>flat(parent,contactMaterial,[x,y,z],[width,depth],[-Math.PI/2,0,0]);

  // ── Architecture: plaster walls, posts, nageshi beam, board ceiling, tatami.
  const wallHeight=bounds.ceiling-bounds.floor,wallY=(bounds.ceiling+bounds.floor)/2,beamY=bounds.ceiling-.35;
  room.add(box,finish.plaster,[0,wallY,bounds.back-.002],[bounds.width,wallHeight,.004]);
  for(const side of [-1,1])room.add(box,finish.plaster,[side*(bounds.right+.002),wallY,bounds.centerZ],[.004,wallHeight,bounds.depth]);
  for(const x of [-1,1])for(const z of [bounds.back+.035,bounds.front-.035])room.add(box,finish.hinoki,[x*(bounds.right-.035),wallY,z],[.07,wallHeight,.07]);
  room.add(box,finish.hinoki,[0,beamY,bounds.back+.017],[bounds.width,.065,.035]);
  for(const side of [-1,1])room.add(box,finish.hinoki,[side*(bounds.right-.017),beamY,bounds.centerZ],[.035,.065,bounds.depth]);
  for(const side of [-1,1])room.add(box,finish.darkWood,[side*(bounds.right-.01),.388,bounds.centerZ],[.015,.035,bounds.depth]);
  room.add(box,finish.darkWood,[0,.388,bounds.back+.012],[bounds.width,.035,.015]);
  room.add(box,finish.ceiling,[0,bounds.ceiling,bounds.centerZ],[bounds.width,.01,bounds.depth]);
  for(let z=bounds.back+.45;z<bounds.front;z+=.8)room.add(box,finish.darkWood,[0,bounds.ceiling-.042,z],[bounds.width,.07,.07]);
  const matWidth=bounds.width/4,matDepth=bounds.depth/6;
  for(let column=0;column<4;column++)for(let row=0;row<6;row++) {
    const x=bounds.left+(column+.5)*matWidth,z=bounds.back+(row+.5)*matDepth;
    room.add(box,finish.tatami,[x,.38,z],[matWidth-.01,.02,matDepth-.005]);
    for(const edge of [-1,1])room.add(box,finish.tatamiEdge,[x,.3915,z+edge*(matDepth/2-.02)],[matWidth-.01,.004,.035]);
  }

  // ── Tokonoma: polished floor board, natural post, scroll, ikebana and incense.
  place(STUDIO_OFFSETS.alcove);
  room.add(box,finish.walnut,[-.58,.41,-.525],[.84,.08,.24]);
  room.add(lathe([[0,0],[.046,0],[.043,.3],[.048,.62],[.041,.95],[.045,1.3],[.04,1.77],[0,1.77]],14),finish.hinoki,[-.13,.37,-.6]);
  room.add(lathe([[0,0],[.04,0],[.05,.03],[.045,.05],[0,.05]]),finish.iron,[-.37,.45,-.52]);
  const smoke=flat(group,smokeMaterial,[-.37,.66,-.52],[.07,.32],[0,0,0]);smoke.name='incense-smoke';

  // ── Chigaidana: lower cupboard, staggered shelves and the top cabinet.
  place(STUDIO_OFFSETS.shelves);
  room.add(box,finish.darkWood,[.21,.495,-.525],[.56,.25,.24]);
  for(const x of [.075,.345])room.add(box,finish.gold,[x,.495,-.402],[.25,.2,.004]);
  room.add(box,finish.darkWood,[.06,1.12,-.525],[.32,.025,.24]);
  room.add(box,finish.darkWood,[.33,1.0,-.525],[.32,.025,.24]);
  room.add(cylinder,finish.darkWood,[.2,1.06,-.47],[.012,.12,.012]);
  room.add(box,finish.darkWood,[.21,1.67,-.525],[.56,.14,.24]);
  for(const x of [.075,.345])room.add(box,finish.gold,[x,1.67,-.402],[.25,.11,.004]);
  room.add(box,finish.paulownia,[.36,1.045,-.53],[.17,.065,.11],[0,.08,0]);
  room.add(box,finish.paulownia,[.37,1.1,-.53],[.14,.05,.1],[0,-.12,0]);
  room.add(box,finish.cord,[.36,1.08,-.53],[.006,.068,.115],[0,.08,0]);
  for(let i=0;i<5;i++)room.add(box,finish.books,[.34,.63+i*.014,-.52],[.13,.012,.18],[0,(i%2?.07:-.05),0]);

  // ── Kaidan-dansu: stepped chest against the back wall, right.
  place(STUDIO_OFFSETS.chest);
  const tiers=[[.47,.36,.55,.785],[.32,.34,.9,.86],[.17,.34,1.24,.935]];
  for(const [width,height,y,x] of tiers) {
    room.add(box,finish.walnut,[x,y,-.485],[width,height,.32]);
    room.add(box,finish.darkWood,[x,y,-.3235],[width-.01,.006,.004]);
    for(const dx of width>.3?[-width/4,width/4]:[0]) {
      room.add(box,finish.iron,[x+dx,y+height/4,-.32],[.055,.008,.012]);
      room.add(box,finish.iron,[x+dx,y-height/4,-.32],[.055,.008,.012]);
    }
  }
  room.add(lathe([[0,0],[.035,0],[.05,.04],[.045,.1],[.025,.13],[.02,.15],[0,.15]]),finish.tenmoku,[.62,.73,-.45]);
  for(let i=0;i<3;i++)room.add(box,finish.books,[.67,.74+i*.016,-.42],[.12,.015,.17],[0,i*.09,0]);

  // ── Byōbu: four gold panels folded in a zigzag along the left wall.
  place(STUDIO_OFFSETS.screen);
  {
    let x=-1.0,z=-.55;const width=.3,height=.95;
    for(let i=0;i<4;i++) {
      const phi=i%2?-.38:.38,nx=x+Math.sin(phi)*width,nz=z+Math.cos(phi)*width;
      const panel=new THREE.PlaneGeometry(width,height);const uv=panel.getAttribute('uv');
      for(let k=0;k<uv.count;k++)uv.setX(k,(i+uv.getX(k))/4);
      room.add(geometry(panel),finish.gold,[(x+nx)/2,.37+height/2+.02,(z+nz)/2],[1,1,1],[0,phi-Math.PI/2,0]);
      room.add(box,finish.lacquer,[(x+nx)/2,.37+height+.02,(z+nz)/2],[.016,.016,width],[0,phi,0]);
      room.add(box,finish.lacquer,[(x+nx)/2,.39,(z+nz)/2],[.016,.03,width],[0,phi,0]);
      x=nx;z=nz;
    }
    shadowUnder(group,-.93,-.02,.3,1.2);
  }

  // ── Digital corner: low desk, closed laptop, wooden mechanical keyboard, mug, tied cable.
  place(STUDIO_OFFSETS.desk);
  room.add(box,finish.walnut,[-.72,.62,.02],[.3,.025,.55]);
  for(const z of [-.23,.27])room.add(box,finish.walnut,[-.72,.495,z],[.28,.23,.025]);
  room.add(rounded,finish.aluminium,[-.73,.64,-.1],R(.21,.014,.3));
  room.add(box,finish.cable,[-.73,.6476,-.1],[.2,.0015,.29]);
  room.add(rounded,finish.walnut,[-.68,.64,.16],R(.09,.02,.25));
  const keys=new THREE.InstancedMesh(box,finish.keycap,48);const key=new THREE.Object3D();let k=0;
  for(let row=0;row<4;row++)for(let column=0;column<12;column++){key.position.set(-.71+row*.019,.654,.055+column*.0195).add(placement);key.scale.set(.015,.008,.016);key.updateMatrix();keys.setMatrixAt(k++,key.matrix);}
  keys.castShadow=true;keys.receiveShadow=true;group.add(keys);
  room.add(lathe([[0,0],[.025,0],[.027,.06],[.025,.065],[0,.065]]),finish.tenmoku,[-.6,.633,-.2]);
  const cablePath=new THREE.CatmullRomCurve3([[-.83,.64,-.2],[-.88,.6,-.26],[-.9,.45,-.3],[-.92,.38,-.38],[-1.0,.378,-.45]].map(p=>new THREE.Vector3(...p)));
  room.add(geometry(new THREE.TubeGeometry(cablePath,24,.0035,6)),finish.cable,[0,0,0]);
  for(const t of [.35,.7]){const p=cablePath.getPoint(t);room.add(cylinder,finish.cord,[p.x,p.y,p.z],[.0065,.012,.0065]);}
  shadowUnder(group,-.72,.02,.42,.7);
  room.add(rounded,finish.fabric,[-.4,.395,.5],R(.42,.05,.44));
  shadowUnder(group,-.4,.5,.6,.6);

  // ── Lacquered table with tea and calligraphy sets, and a sakura sprig.
  place();
  room.add(rounded,finish.lacquer,[0,.672,-.06],R(1.0,.035,.6));
  room.add(box,finish.lacquerRed,[0,.648,-.06],[.98,.012,.58]);
  for(const x of [-.44,.44])for(const z of [-.3,.18])room.add(box,finish.lacquer,[x,.51,z],[.045,.28,.045]);
  shadowUnder(group,0,-.06,1.35,.9);
  {
    const {tilt,front,depth}=READING_STAND,back=front.clone().add(new THREE.Vector3(0,Math.sin(tilt)*depth,-Math.cos(tilt)*depth));
    room.add(box,finish.walnut,[0,(front.y+back.y)/2,(front.z+back.z)/2],[.98,.012,depth],[tilt,0,0]);
    room.add(box,finish.walnut,[0,front.y+.004,front.z+.005],[.98,.016,.012]);
    for(const x of [-.45,.45])room.add(box,finish.walnut,[x,(front.y+back.y)/2-.02,back.z+.03],[.03,back.y-front.y,.04]);
  }
  room.add(rounded,finish.lacquerRed,[.33,.697,-.3],R(.22,.014,.12));
  room.add(lathe([[0,0],[.03,0],[.038,.025],[.032,.045],[.018,.05],[0,.05]]),finish.tenmoku,[.3,.704,-.3]);
  room.add(cylinder,finish.tenmoku,[.345,.725,-.3],[.006,.04,.006],[0,0,-.9]);
  room.add(cylinder,finish.tenmoku,[.3,.73,-.335],[.008,.05,.008],[Math.PI/2,0,0]);
  for(const [x,z] of [[.375,-.33],[.39,-.27]])room.add(lathe([[0,0],[.018,0],[.022,.03],[.02,.031],[0,.031]]),finish.ceramic,[x,.704,z]);
  room.add(box,finish.inkstone,[-.32,.699,-.3],[.12,.018,.07]);
  room.add(box,finish.darkWood,[-.22,.697,-.31],[.03,.014,.05]);
  room.add(cylinder,finish.bamboo,[-.17,.712,-.3],[.0045,.17,.0045],[0,0,Math.PI/2]);
  room.add(cylinder,finish.inkstone,[-.075,.712,-.3],[.0045,.025,.0045],[0,0,Math.PI/2]);
  room.add(lathe([[0,0],[.02,0],[.026,.015],[.012,.03],[.006,.035],[0,.035]]),finish.celadon,[-.42,.69,-.27]);
  // A cut sakura sprig: a dark twig with side shoots and five-petal flowers.
  const sprig=[[-.5,.2],[-.41,.17],[-.31,.135]];
  for(let i=0;i<2;i++){const [x0,z0]=sprig[i],[x1,z1]=sprig[i+1];room.add(cylinder,finish.walnut,[(x0+x1)/2,.6965,(z0+z1)/2],[.0042-i*.0012,Math.hypot(x1-x0,z1-z0),.0042-i*.0012],[0,Math.atan2(-(z1-z0),x1-x0),Math.PI/2]);}
  for(const [x,z,a] of [[-.44,.18,.9],[-.36,.15,-.8]])room.add(cylinder,finish.walnut,[x+Math.sin(a)*.025,.6965,z+Math.cos(a)*.025],[.0022,.05,.0022],[0,Math.atan2(-Math.cos(a),Math.sin(a)),Math.PI/2]);
  for(const [x,z] of [[-.49,.205],[-.46,.15],[-.4,.19],[-.34,.12],[-.31,.15],[-.38,.2]]) {
    for(let petal=0;petal<5;petal++){const a=petal*Math.PI*2/5;room.add(sphere,finish.blossom,[x+Math.cos(a)*.008,.7,z+Math.sin(a)*.008],[.008,.0028,.0055],[0,-a,0]);}
    room.add(sphere,finish.lacquerRed,[x,.7015,z],[.0025,.002,.0025]);
  }

  // ── Tray for the rolled makimono, scroll boxes and bamboo, front right.
  place(STUDIO_OFFSETS.tray);
  room.add(box,finish.darkWood,[.72,.43,.22],[.44,.04,.42]);
  for(const x of [.52,.92])room.add(box,finish.darkWood,[x,.40,.22],[.03,.06,.42]);
  shadowUnder(group,.72,.22,.6,.6);
  for(let i=0;i<3;i++)room.add(box,finish.paulownia,[.62,.41+i*.07,.6],[.3-i*.03,.07,.09],[0,i*.12-.1,0]);
  room.add(lathe([[0,0],[.06,0],[.075,.12],[.07,.14],[0,.14]]),finish.tenmoku,[.92,.37,.6]);
  for(let i=0;i<4;i++)room.add(cylinder,finish.bamboo,[.9+i*.015,.51+.3+i*.02,.6-i*.012],[.009,.62+i*.05,.009],[0,0,(i-1.5)*.05]);
  for(let i=0;i<10;i++)room.add(box,finish.bamboo,[.9+Math.cos(i)*.07,.95+i*.04,.6+Math.sin(i)*.06],[.11,.004,.025],[0,i*.7,.3]);
  shadowUnder(group,.62,.6,.42,.2);shadowUnder(group,.92,.6,.24,.24);

  // ── Andon by the window, and a chōchin hanging from the beam.
  place(STUDIO_OFFSETS.andon);
  room.add(box,finish.darkWood,[.9,.385,-.17],[.2,.03,.2]);
  room.add(box,finish.glowPaper,[.9,.63,-.17],[.17,.42,.17]);
  for(const dx of [-.088,.088])for(const dz of [-.088,.088])room.add(box,finish.darkWood,[.9+dx,.63,-.17+dz],[.012,.48,.012]);
  room.add(box,finish.darkWood,[.9,.865,-.17],[.2,.02,.2]);
  shadowUnder(group,.9,-.17,.32,.32);
  place(STUDIO_OFFSETS.lantern);
  room.add(lathe([[0,-.1],[.06,-.095],[.09,-.05],[.095,0],[.09,.05],[.06,.095],[0,.1]],18),finish.glowPaper,[.42,1.72,-.25]);
  for(const y of [-.1,.1])room.add(cylinder,finish.lacquer,[.42,1.72+y,-.25],[.05,.012,.05]);
  room.add(cylinder,finish.cord,[.42,1.94,-.25],[.003,.32,.003]);

  // ── Shoji window on the right wall, lit from outside.
  place([bounds.right-1.043,0,0]);
  room.add(box,finish.darkWood,[1.028,1.3,.04],[.03,.94,.76]);
  room.finish();
  const windowPaper=flat(group,finish.shoji,[1.011,1.3,.04],[.7,.86],[0,-Math.PI/2,0]);windowPaper.renderOrder=0;
  const lattice=batch(group);
  for(let i=1;i<4;i++)lattice.add(box,finish.darkWood,[1.007+placement.x,1.3,.04-.35+i*.175],[.012,.86,.012]);
  for(let i=1;i<5;i++)lattice.add(box,finish.darkWood,[1.007+placement.x,.87+i*.172,.04],[.012,.012,.7]);
  lattice.finish();
  place();

  // ── Fake ambient occlusion where walls meet floor and ceiling.
  const band=(position:number[],size:number[],rotation:number[])=>flat(group,fadeMaterial,position,size,rotation);
  band([0,.52,bounds.back+.003],[bounds.width,.3],[0,0,Math.PI]);band([0,bounds.ceiling-.15,bounds.back+.003],[bounds.width,.3],[0,0,0]);
  for(const side of [-1,1]) {
    band([side*(bounds.right-.003),.52,bounds.centerZ],[bounds.depth,.3],[0,-side*Math.PI/2,Math.PI]);band([side*(bounds.right-.003),bounds.ceiling-.15,bounds.centerZ],[bounds.depth,.3],[0,-side*Math.PI/2,0]);
    band([side*(bounds.right-.11),.374,bounds.centerZ],[bounds.depth,.22],[-Math.PI/2,0,side*Math.PI/2]);
  }
  band([0,.374,bounds.back+.11],[bounds.width,.22],[-Math.PI/2,0,0]);

  // ── Lights: daylight through the shoji, the andon (static shadows) and the lantern.
  const daylight=new THREE.RectAreaLight('#e3ecf7',5,.7,.86);daylight.position.set(bounds.right-.04,1.3,.04);daylight.lookAt(0,1.1,.04);group.add(daylight);
  const andon=new THREE.PointLight('#f2b36b',1.7,5.2,2);andon.position.set(.9,.68,-.17).add(new THREE.Vector3(...STUDIO_OFFSETS.andon));andon.castShadow=true;
  andon.shadow.mapSize.set(512,512);andon.shadow.bias=-.0005;andon.shadow.normalBias=.025;andon.shadow.radius=4;andon.shadow.autoUpdate=false;group.add(andon);
  const lantern=new THREE.PointLight('#ffb46b',.6,4,2);lantern.position.set(.42,1.66,-.25).add(new THREE.Vector3(...STUDIO_OFFSETS.lantern));group.add(lantern);
  const baseIntensity={daylight:daylight.intensity,andon:andon.intensity,lantern:lantern.intensity};

  // ── Entrance: engawa deck, stepping stones with geta, noren, lantern and pots.
  const outside=batch(entrance);
  for(let i=0;i<6;i++)outside.add(box,finish.hinoki,[0,.352,1.012+i*.049],[bounds.width+.68,.035,.045]);
  outside.add(box,finish.darkWood,[0,.29,1.255],[bounds.width+.7,.08,.06]);
  for(const x of [-2.15,-.7,.7,2.15])outside.add(box,finish.darkWood,[x,.165,1.25],[.06,.33,.06]);
  outside.add(rounded,finish.stone,[0,.11,1.47],R(.62,.2,.34));
  outside.add(rounded,finish.stone,[.04,.03,1.95],R(.5,.06,.36));
  outside.add(rounded,finish.stone,[.18,.03,2.45],R(.44,.06,.32));
  for(const x of [-.06,.06]) {
    outside.add(box,finish.hinoki,[x,.235,1.47],[.085,.02,.2]);
    for(const z of [-.05,.05])outside.add(box,finish.hinoki,[x,.21,1.47+z],[.085,.03,.02]);
    outside.add(geometry(new THREE.TorusGeometry(.028,.004,6,14,Math.PI)),finish.cord,[x,.245,1.42]);
  }
  outside.add(box,finish.darkWood,[1.05,.38,1.12],[.2,.025,.2]);
  outside.add(box,finish.glowPaper,[1.05,.55,1.12],[.16,.3,.16]);
  for(const dx of [-.08,.08])for(const dz of [-.08,.08])outside.add(box,finish.darkWood,[1.05+dx,.55,1.12+dz],[.012,.36,.012]);
  outside.add(lathe([[0,0],[.1,0],[.13,.22],[.12,.25],[0,.25]]),finish.tenmoku,[-1.08,0,1.5]);
  for(let i=0;i<5;i++)outside.add(cylinder,finish.bamboo,[-1.08+(i-2)*.025,.25+.45+i*.03,1.5],[.012,.9+i*.06,.012],[0,0,(i-2)*.05]);
  for(let i=0;i<14;i++)outside.add(box,finish.bamboo,[-1.08+Math.cos(i)*.11,.9+i*.05,1.5+Math.sin(i)*.09],[.16,.005,.035],[0,i*.7,.35]);
  outside.add(lathe([[0,0],[.12,0],[.14,.16],[.13,.18],[0,.18]]),finish.ceramic,[1.2,0,1.55]);
  outside.add(cylinder,finish.darkWood,[1.2,.36,1.55],[.025,.36,.025],[0,0,.2]);
  for(const [x,y,s] of [[1.14,.58,.12],[1.27,.52,.1],[1.2,.66,.09]])outside.add(sphere,finish.pine,[x,y,1.55],[s,s*.45,s*.85]);
  outside.add(cylinder,finish.darkWood,[0,bounds.ceiling-.02,.875],[.008,bounds.doorWidth,.008],[0,0,Math.PI/2]);
  outside.finish();
  shadowUnder(entrance,0,1.47,.8,.5,.004);shadowUnder(entrance,-1.08,1.5,.45,.45,.004);shadowUnder(entrance,1.2,1.55,.45,.45,.004);
  const norenGeometry=geometry(new THREE.PlaneGeometry(bounds.doorWidth-.06,.36,8,6));
  const noren=new THREE.Mesh(norenGeometry,norenMaterial);noren.position.set(0,bounds.ceiling-.21,.88);noren.castShadow=true;entrance.add(noren);
  const norenBase=new Float32Array(norenGeometry.getAttribute('position').array);

  let lastVisible=false;
  return {
    group,entrance,decorations,hearth,
    loadDecorations(invalidate:()=>void){return decorations.loadDecorations(()=>{andon.shadow.needsUpdate=true;invalidate();});},
    /** 0 outside, 1 seated: fades the interior lights in as the camera enters. */
    setIndoor(amount:number) {
      const t=THREE.MathUtils.smoothstep(amount,.35,1);
      daylight.intensity=baseIntensity.daylight*t;andon.intensity=baseIntensity.andon*(.3+.7*t);lantern.intensity=baseIntensity.lantern*t;
      const visible=amount>0;
      if(visible&&!lastVisible)andon.shadow.needsUpdate=true;
      group.visible=visible;lastVisible=visible;
    },
    setQuality(high:boolean) {daylight.visible=high;andon.castShadow=high;andon.shadow.needsUpdate=high;},
    refreshShadows() {andon.shadow.needsUpdate=true;},
    /** Incense smoke drifts and the noren sways; both stop in quiet mode. */
    update(time:number,quiet:boolean) {
      if(quiet)return;
      // Positive UV offset moves the visible texture down the plane: use its inverse.
      textures.smoke.offset.y=-(time*.08)%1;smoke.rotation.y=Math.sin(time*.4)*.6;
      const position=norenGeometry.getAttribute('position');
      for(let i=0;i<position.count;i++) {
        const x=norenBase[i*3],y=norenBase[i*3+1],free=(.18-y)/.36;
        position.setZ(i,.018*free*Math.sin(time*1.6+x*6)+.01*free*Math.sin(time*2.7+x*11));
      }
      position.needsUpdate=true;norenGeometry.computeVertexNormals();
    },
    dispose() {hearth.dispose();decorations.dispose();textures.dispose();geometries.forEach(value=>value.dispose());materials.forEach(value=>value.dispose());keys.dispose();},
  };
}
export type StudioInterior=ReturnType<typeof createStudioInterior>;
