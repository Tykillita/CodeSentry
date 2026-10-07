import { Canvas, createPortal, useFrame, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createTree, branchGeometry, petalGeometry, barkTexture, blossomCenterGeometry } from './tree-model';
import { createGardenEnvironment, type GardenEnvironment } from './garden-environment';
import { AmbientWind, toTreeWorld } from './wind-simulation';
import { chooseSlots, STRIP, type HangingSlot } from './hanging-slots';
import { addTreeWind, addPetalOpacity } from './wind-shaders';
import { journey, metaSnapshot, setHoverSlug, subscribeJourney, subscribeMeta } from '../../lib/journey-store';
import { setSceneStatus } from '../../lib/scene-status';
import { MAKIMONO_TEXTURE, STRIP_TEXTURE, areaColor, loadArt, paintMakimono, paintStrip, parchmentFonts } from './parchment-texture';
import { DEFAULT_STYLE, MAKIMONO_STYLES } from './makimono-art';
import { createStudioPose, frameStudio, sampleStudioWalk, STUDIO_NEAR } from './studio-camera';
const dummy=new THREE.Object3D();const tint=new THREE.Color();
type TreeModel=ReturnType<typeof createTree>;
type CameraStop={p:number;position:THREE.Vector3;target:THREE.Vector3};
type ProjectCard={slug:string;order:number;title:string;area:string;areaMark:string;subtitle:string;flow:string[];detail:string};
type Spring={value:number;velocity:number};
const smoothstep=(a:number,b:number,x:number)=>{const t=THREE.MathUtils.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
function spring(state:Spring,target:number,stiffness:number,damping:number,dt:number) {
  state.velocity+=(stiffness*(target-state.value)-damping*state.velocity)*dt;state.value+=state.velocity*dt;
  if(Math.abs(target-state.value)<.0005&&Math.abs(state.velocity)<.0005){state.value=target;state.velocity=0;}
}

/**
 * Discards the sheet beyond its rollers, so a scroll unrolls without stretching.
 * `axis` picks the direction — 'y' opens from the centre, 'x' unrolls left to right.
 */
function addReveal<T extends THREE.Material>(material:T,uniform:{value:number},axis:'x'|'y'='y') {
  material.onBeforeCompile=shader=>{
    shader.uniforms.reveal=uniform;
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vSheet;').replace('#include <begin_vertex>','#include <begin_vertex>\nvSheet=position;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform float reveal;\nvarying vec3 vSheet;')
      .replace('void main() {',axis==='y'?'void main() {\nif(abs(vSheet.y)>reveal)discard;':'void main() {\nif(vSheet.x>reveal)discard;');
  };
  material.customProgramCacheKey=()=>`parchment-reveal-${axis}`;
  return material;
}
type ParchmentHost={action:HTMLElement;panel:HTMLElement|null};
function parchmentHost(slug:string):ParchmentHost|null {
  const host=document.querySelector<HTMLElement>(`[data-parchment-host][data-slug="${slug}"]`);
  const action=host?.querySelector<HTMLElement>('.parchment-action');
  return action?{action,panel:host!.closest<HTMLElement>('[data-panel]')}:null;
}

/** progress at which each panel rests, read from the same layout garden.ts scrolls. */
function panelStops() {
  const panels=[...document.querySelectorAll<HTMLElement>('[data-panel]')];
  const track=document.querySelector<HTMLElement>('#parchment'),viewport=document.querySelector<HTMLElement>('#catalogue');
  const distance=Math.max(1,(track?.scrollWidth??1)-(viewport?.clientWidth??0));
  return panels.map(panel=>Math.min(1,panel.offsetLeft/distance));
}
const UP=new THREE.Vector3(0,1,0),Z_AXIS=new THREE.Vector3(0,0,1);
/** Places a unit cylinder (along Y) between two points. */
function span(mesh:THREE.Object3D,from:THREE.Vector3,to:THREE.Vector3,direction:THREE.Vector3) {
  mesh.position.copy(from).add(to).multiplyScalar(.5);
  direction.subVectors(to,from);mesh.scale.set(1,direction.length(),1);mesh.quaternion.setFromUnitVectors(UP,direction.normalize());
}
const INTERACTIVE='a,button,input,select,textarea,label,dialog,.strip-card,.site-header,.journey-controls,.project-copy,.hero-copy,.closing-copy';

// one tanzaku per project hangs from the tree. The cloth flutters on the CPU,
// the camera can frame each one over its HTML button, and a small raycaster lets
// the page hover and click strips without making the canvas interactive.
function HangingStrips({projects,wind,slots}:{projects:ProjectCard[];wind:AmbientWind;slots:HangingSlot[]}) {
  const {gl,camera,invalidate}=useThree();
  const roots=useRef(new Map<string,THREE.Group>());const meshes=useRef(new Map<string,THREE.Mesh>());
  const cords=useRef(new Map<string,{ring?:THREE.Mesh;drop?:THREE.Mesh}>());
  const assets=useMemo(()=>projects.map((project,index)=>{
    const slot=slots[index%slots.length];
    const canvas=document.createElement('canvas');canvas.width=STRIP_TEXTURE.width;canvas.height=STRIP_TEXTURE.height;
    const content={order:project.order,total:projects.length,area:project.area,areaMark:project.areaMark,title:project.title,flow:project.flow,cta:project.detail};
    paintStrip(canvas,content);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(8,gl.capabilities.getMaxAnisotropy());
    const geometry=new THREE.PlaneGeometry(1,1,2,24);geometry.boundingSphere=new THREE.Sphere(new THREE.Vector3(),1.4);
    const material=new THREE.MeshStandardMaterial({map:texture,side:THREE.DoubleSide,alphaTest:.5,roughness:.92,emissive:new THREE.Color(areaColor(project.areaMark)),emissiveIntensity:0});
    const ring=new THREE.TorusGeometry(slot.branchRadius+.006,.0035,6,24);
    return {project,slot,content,canvas,texture,geometry,material,ring,
      ringQuaternion:new THREE.Quaternion().setFromUnitVectors(Z_AXIS,slot.tangent.clone().normalize()),
      base:new Float32Array(geometry.getAttribute('position').array),weight:wind.flexibility(slot.anchor),
      displacement:new THREE.Vector3(),phase:project.order*1.91,energy:{value:0,velocity:0} as Spring,glow:{value:0,velocity:0} as Spring};
  }),[projects,gl,slots,wind]);
  const shared=useMemo(()=>({cordGeometry:new THREE.CylinderGeometry(.0035,.0035,1,5,1),cordMaterial:new THREE.MeshStandardMaterial({color:'#9e3524',roughness:.85,side:THREE.DoubleSide})}),[]);
  const scratch=useMemo(()=>({hook:new THREE.Vector3(),top:new THREE.Vector3(),direction:new THREE.Vector3()}),[]);
  useEffect(()=>{
    let cancelled=false;
    void parchmentFonts(assets.map(asset=>asset.project.areaMark).join('')).then(()=>{
      if(cancelled)return;
      for(const asset of assets){paintStrip(asset.canvas,asset.content);asset.texture.needsUpdate=true;}
      invalidate();
    });
    // Strip picking: the canvas never takes pointer events, the page stays fully usable.
    const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let pointerType='mouse';
    const pick=(event:MouseEvent)=>{
      if(journey.mode!=='garden'||journey.studio>0||journey.paused)return null;
      if((event.target as Element|null)?.closest?.(INTERACTIVE))return null;
      const rect=gl.domElement.getBoundingClientRect();
      pointer.set(((event.clientX-rect.left)/rect.width)*2-1,-((event.clientY-rect.top)/rect.height)*2+1);
      raycaster.setFromCamera(pointer,camera);
      const hit=raycaster.intersectObjects([...meshes.current.values()],false)[0];
      return (hit?.object.userData.slug as string|undefined)??'';
    };
    const announce=(slug:string,event:MouseEvent)=>{
      setHoverSlug(slug);
      window.dispatchEvent(new CustomEvent('codesentry:strip-hover',{detail:{slug,x:event.clientX,y:event.clientY}}));
    };
    const down=(event:PointerEvent)=>{pointerType=event.pointerType;};
    const move=(event:PointerEvent)=>{if(event.pointerType!=='mouse')return;const slug=pick(event);if(slug!==null&&slug!==journey.hoverSlug)announce(slug,event);};
    const click=(event:MouseEvent)=>{
      const slug=pick(event);if(!slug)return;
      // On touch the first tap previews; the card's button then enters the studio.
      if(pointerType!=='mouse'&&journey.hoverSlug!==slug){announce(slug,event);return;}
      window.dispatchEvent(new CustomEvent('codesentry:strip-open',{detail:{slug}}));
    };
    document.addEventListener('pointerdown',down);document.addEventListener('pointermove',move);document.addEventListener('click',click);
    return ()=>{
      cancelled=true;
      document.removeEventListener('pointerdown',down);document.removeEventListener('pointermove',move);document.removeEventListener('click',click);
      for(const asset of assets){asset.texture.dispose();asset.geometry.dispose();asset.material.dispose();asset.ring.dispose();}
      shared.cordGeometry.dispose();shared.cordMaterial.dispose();
    };
  },[assets,shared,gl,camera,invalidate]);
  useFrame((_,frameDelta)=>{
    const quiet=journey.quiet,dt=quiet?0:Math.min(frameDelta,.05);
    const gust=wind.field.gust,time=wind.field.time;
    const {hook,top,direction}=scratch;
    for(const asset of assets) {
      const {project,slot,geometry,base,displacement,energy,glow}=asset;
      const root=roots.current.get(project.slug),mesh=meshes.current.get(project.slug),cord=cords.current.get(project.slug);
      if(!root||!mesh||!cord?.ring||!cord.drop)continue;
      const active=journey.mode==='garden'&&journey.activePanel===project.order,hovered=journey.hoverSlug===project.slug;
      if(dt===0){energy.value=active?1:0;glow.value=0;}
      else {spring(energy,active?1:0,30,10,dt);spring(glow,hovered?1:active?.45:0,60,14,dt);}
      if(quiet)displacement.set(0,0,0);else wind.field.bend(slot.anchor,asset.weight,displacement);
      root.position.copy(slot.center).add(displacement);root.rotation.set(0,slot.yaw,0);root.scale.set(STRIP.width,STRIP.height,1);
      // Cloth: pinned at the hem, swinging and fluttering more towards the free end.
      const swing=quiet?0:.035+.05*gust+.05*energy.value,flutter=quiet?0:.018+.03*gust+.02*energy.value;
      const position=geometry.getAttribute('position');
      for(let i=0;i<position.count;i++) {
        const x=base[i*3],y=base[i*3+1],free=Math.pow(.5-y,1.6);
        const dx=swing*free*Math.sin(time*1.7+asset.phase+(.5-y)*2.2);
        const dz=flutter*free*Math.sin(time*2.9+asset.phase*1.3+(.5-y)*4.1)+x*.012*free*Math.sin(time*3.3+asset.phase);
        position.setXYZ(i,x+dx/STRIP.width,y,dz);
      }
      position.needsUpdate=true;geometry.computeVertexNormals();
      asset.material.emissiveIntensity=.32*glow.value;
      cord.ring.position.copy(slot.anchor).add(displacement);cord.ring.quaternion.copy(asset.ringQuaternion);
      hook.copy(cord.ring.position);hook.y-=slot.branchRadius+.006;
      top.copy(root.position);top.y+=STRIP.height/2-.02;
      span(cord.drop,hook,top,direction);
    }
    document.documentElement.classList.toggle('parchment-ready',journey.mode==='garden'&&journey.activePanel>=1&&journey.activePanel<=16);
  });
  return <group rotation={[0,-.13,0]}>{assets.map(asset=>{const slug=asset.project.slug;return <group key={slug}>
    <mesh ref={node=>{const entry=cords.current.get(slug)??{};if(node){entry.ring=node;cords.current.set(slug,entry);}}} geometry={asset.ring} material={shared.cordMaterial}/>
    <mesh ref={node=>{const entry=cords.current.get(slug)??{};if(node){entry.drop=node;cords.current.set(slug,entry);}}} geometry={shared.cordGeometry} material={shared.cordMaterial}/>
    <group ref={node=>{if(node)roots.current.set(slug,node);else roots.current.delete(slug);}}>
      <mesh ref={node=>{if(node){node.userData.slug=slug;meshes.current.set(slug,node);}else meshes.current.delete(slug);}} geometry={asset.geometry} material={asset.material} castShadow/>
    </group>
  </group>;})}</group>;
}

/** makimono size on the table, in the pavilion's local units. */
const MAKIMONO={length:.9,depth:.28,radius:.019};
/** lenses — the garden's, and a wider one inside the house. */
const GARDEN_FOV=42;
// inside the house. Sixteen rolled makimono wait on the tray; scrolling lifts
// the current one onto the table and unrolls it left to right, then returns it.
function StudioScrolls({projects,environment}:{projects:ProjectCard[];environment:GardenEnvironment}) {
  const {gl,camera,size,invalidate}=useThree();
  const groups=useRef(new Map<string,THREE.Group>());const sheets=useRef(new Map<string,THREE.Group>());
  const rollers=useRef(new Map<string,[THREE.Group,THREE.Group]>());const stops=useRef<number[]>([]);const entered=useRef(false);const openPanel=useRef('');
  const house=environment.house;
  const assets=useMemo(()=>projects.map((project,index)=>{
    const canvas=document.createElement('canvas');canvas.width=MAKIMONO_TEXTURE.width;canvas.height=MAKIMONO_TEXTURE.height;
    const content={order:project.order,total:projects.length,area:project.area,areaMark:project.areaMark,title:project.title,subtitle:project.subtitle,flow:project.flow,cta:project.detail,slug:project.slug};
    paintMakimono(canvas,content,null);
    // Each scroll's rollers are turned from its own wood, with its own end caps.
    const style=MAKIMONO_STYLES[project.slug]??DEFAULT_STYLE;
    const rod=new THREE.MeshStandardMaterial({color:style.rod,roughness:.6}),cap=new THREE.MeshStandardMaterial({color:style.cap,roughness:.45,metalness:style.cap==='#b99c5f'?.55:.05});
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(8,gl.capabilities.getMaxAnisotropy());
    const reveal={value:0};
    const material=addReveal(new THREE.MeshStandardMaterial({map:texture,emissiveMap:texture,emissive:new THREE.Color('#ffffff'),emissiveIntensity:.42,roughness:1,side:THREE.DoubleSide}),reveal,'x');
    // Pile: rows of 7, 5, 3 and 1 rolls on the tray, lying front to back.
    const rows=[7,5,3,1];let row=0,start=0;while(index>=start+rows[row]){start+=rows[row];row++;}
    const column=index-start,gap=MAKIMONO.radius*2.25;
    const pile=house.points.tray.clone().add(new THREE.Vector3((column-(rows[row]-1)/2)*gap,.035+MAKIMONO.radius*1.45+row*MAKIMONO.radius*1.95,0));
    return {project,content,canvas,texture,material,reveal,pile,motion:{travel:0,open:0},art:null as HTMLImageElement|null,
      svg:parchmentHost(project.slug)?.action.querySelector<SVGSVGElement>('svg.project-art')??null,tie:new THREE.MeshStandardMaterial({color:areaColor(project.areaMark),roughness:.9}),rod,cap};
  }),[projects,gl,house]);
  const shared=useMemo(()=>{
    const sheet=new THREE.PlaneGeometry(1,1,1,1);sheet.translate(.5,0,0);
    return {
      sheet,rod:new THREE.CylinderGeometry(MAKIMONO.radius,MAKIMONO.radius,MAKIMONO.depth+.03,16,1),
      cap:new THREE.CylinderGeometry(MAKIMONO.radius*.75,MAKIMONO.radius*.75,.012,12,1),
      tie:new THREE.CylinderGeometry(MAKIMONO.radius*1.08,MAKIMONO.radius*1.08,.03,16,1,true),
    };
  },[]);
  useEffect(()=>{
    const measure=()=>{stops.current=panelStops();};measure();
    const observer=new ResizeObserver(measure);const track=document.querySelector('#parchment');if(track)observer.observe(track);
    let cancelled=false;
    void parchmentFonts(assets.map(asset=>asset.project.areaMark).join('')).then(async()=>{
      for(const asset of assets){asset.art=await loadArt(asset.svg);if(cancelled)return;paintMakimono(asset.canvas,asset.content,asset.art);asset.texture.needsUpdate=true;}
      invalidate();
    });
    return ()=>{
      cancelled=true;observer.disconnect();
      for(const asset of assets){asset.texture.dispose();asset.material.dispose();asset.tie.dispose();asset.rod.dispose();asset.cap.dispose();}
      Object.values(shared).forEach(value=>value.dispose());
    };
  },[assets,shared,invalidate]);
  const hit=useMemo(()=>({corner:new THREE.Vector3(),button:typeof document==='undefined'?null:document.querySelector<HTMLElement>('#studio-hit')}),[]);
  useFrame(({clock},frameDelta)=>{
    const inside=journey.studio>0;house.setInterior(inside);
    // Re-measure the resting stops on every entry, so a late layout never leaves a scroll rolled.
    if(inside&&!entered.current)stops.current=panelStops();
    if(inside&&house.decorations.status.phase==='idle')void house.loadDecorations(invalidate);
    entered.current=inside;
    if(inside)house.update(clock.elapsedTime,journey.quiet);
    const decor=house.decorations;
    if(gl.domElement.dataset.decorVersion!==String(decor.status.version)){
      gl.domElement.dataset.decorVersion=String(decor.status.version);
      gl.domElement.dataset.decorations=JSON.stringify({status:decor.status,metrics:decor.metrics});
    }
    const spacing=1/17,dt=Math.min(frameDelta,.05);
    // Timed, not scrubbed: the scroll only says which project wants the stand. The
    // roll travels there (~0.9 s), unrolls slowly (~1.8 s), and on leaving rolls up
    // (~0.75 s) before going home. A newcomer waits until that roll is closed.
    const wants=(asset:typeof assets[number])=>{
      if(journey.mode!=='studio'||journey.studio<.85)return false;
      if(journey.quiet)return journey.activePanel===asset.project.order;
      return Math.abs((journey.progress-(stops.current[asset.project.order]??asset.project.order*spacing))/spacing)<.3;
    };
    // The newcomer sets off once the previous roll is rolled up; they pass in the air.
    const leaving=assets.some(asset=>!wants(asset)&&asset.motion.open>0);
    let moving=false;
    let shown:typeof assets[number]|null=null;
    for(const asset of assets) {
      const group=groups.current.get(asset.project.slug),sheet=sheets.current.get(asset.project.slug),pair=rollers.current.get(asset.project.slug);
      if(!group||!sheet||!pair)continue;
      const motion=asset.motion,want=wants(asset);
      if(journey.quiet||journey.mode!=='studio'){motion.travel=want?1:0;motion.open=want?1:0;}
      else if(want){
        if(motion.travel<1){if(!leaving||motion.travel>0)motion.travel=Math.min(1,motion.travel+dt/.9);}
        else motion.open=Math.min(1,motion.open+dt/1.8);
      } else if(motion.open>0)motion.open=Math.max(0,motion.open-dt/.75);
      else motion.travel=Math.max(0,motion.travel-dt/.9);
      if((motion.travel>0&&motion.travel<1)||(motion.open>0&&motion.open<1))moving=true;
      const travel=smoothstep(0,1,motion.travel),open=.5-.5*Math.cos(Math.PI*motion.open);
      const tilt=house.readingTilt;
      const start=house.points.reading.clone().add(new THREE.Vector3(-MAKIMONO.length/2,MAKIMONO.radius*Math.cos(tilt),MAKIMONO.radius*Math.sin(tilt)));
      group.position.lerpVectors(asset.pile,start,travel);group.position.y+=Math.sin(Math.PI*travel)*.16;
      // On the stand the far edge rises towards the reader; on the pile it lies flat.
      group.rotation.set(tilt*travel,0,0);
      const length=open*MAKIMONO.length;asset.reveal.value=open;
      sheet.scale.set(MAKIMONO.length,MAKIMONO.depth,1);sheet.visible=open>.002;
      pair[0].position.x=0;pair[1].position.x=length;
      if(open>.9)shown=asset;
    }
    // Keep rendering while a roll moves, even in on-demand frames.
    if(moving)invalidate();
    // The project's card waits for its makimono: the panel is marked once the roll is fully open.
    const fullyOpen=journey.mode==='studio'?assets.find(asset=>asset.motion.open>=1)?.project.slug??'':'';
    if(fullyOpen!==openPanel.current) {
      document.querySelectorAll('[data-scroll-open]').forEach(panel=>panel.removeAttribute('data-scroll-open'));
      if(fullyOpen)document.getElementById(`proyecto-${fullyOpen}`)?.setAttribute('data-scroll-open','');
      openPanel.current=fullyOpen;
    }
    // One button follows the open makimono on screen, so its click opens the detail.
    const button=hit.button;if(!button)return;
    if(!shown||journey.mode!=='studio'||journey.studio<1){button.hidden=true;return;}
    const group=groups.current.get(shown.project.slug)!;let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
    for(const [x,z] of [[0,-.5],[1,-.5],[0,.5],[1,.5]]) {
      hit.corner.set(x*MAKIMONO.length,-MAKIMONO.radius+.002,z*MAKIMONO.depth);group.localToWorld(hit.corner).project(camera);
      const px=(hit.corner.x+1)/2*size.width,py=(1-hit.corner.y)/2*size.height;
      left=Math.min(left,px);right=Math.max(right,px);top=Math.min(top,py);bottom=Math.max(bottom,py);
    }
    button.hidden=false;button.dataset.detail=shown.project.slug;
    button.style.cssText=`left:${left}px;top:${top}px;width:${right-left}px;height:${bottom-top}px`;
    button.setAttribute('aria-label',`${shown.project.detail}: ${shown.project.title}`);
  });
  return createPortal(<group>{assets.map(asset=>{const slug=asset.project.slug;return <group key={slug} ref={node=>{if(node)groups.current.set(slug,node);else groups.current.delete(slug);}}>
    <group ref={node=>{if(node)sheets.current.set(slug,node);else sheets.current.delete(slug);}} position={[0,-MAKIMONO.radius+.002,0]} rotation={[-Math.PI/2,0,0]}>
      <mesh geometry={shared.sheet} material={asset.material}/>
    </group>
    {([0,1] as const).map(index=><group key={index} ref={node=>{if(!node)return;const pair=rollers.current.get(slug)??[node,node];pair[index]=node;rollers.current.set(slug,pair);}} rotation={[Math.PI/2,0,0]}>
      <mesh geometry={shared.rod} material={asset.rod}/>
      {[-1,1].map(end=><mesh key={end} geometry={shared.cap} material={asset.cap} position={[0,end*(MAKIMONO.depth/2+.02),0]}/>)}
      {index===0&&<mesh geometry={shared.tie} material={asset.tie}/>}
    </group>)}
  </group>;})}</group>,environment.landmarks.pavilion);
}

function CameraJourney({model,environment,slots}:{model:TreeModel;environment:GardenEnvironment;slots:HangingSlot[]}) {
  const {size,camera,gl,invalidate,scene}=useThree();
  const stops=useRef<CameraStop[]>([]);const target=useMemo(()=>new THREE.Vector3(),[]);
  // the garden journey follows splines through every strip, with a pulled-out
  // control point between stops, so travel reads as dolly out, pan, dolly in.
  const paths=useRef<{position:THREE.CatmullRomCurve3;target:THREE.CatmullRomCurve3;at:number[]}|null>(null);
  /** where the open makimono should sit on screen, from the stage of the first project. */
  const studioFrame=useRef({x:.62,y:.55,width:.4});
  const walk=useMemo(()=>({garden:new THREE.Vector3(),gardenTarget:new THREE.Vector3(),localPosition:new THREE.Vector3(),localTarget:new THREE.Vector3(),pose:createStudioPose(),positions:Array.from({length:5},()=>new THREE.Vector3()),targets:Array.from({length:5},()=>new THREE.Vector3())}),[]);
  const root=useMemo(()=>new THREE.Vector3(),[]);const landmark=useMemo(()=>new THREE.Vector3(),[]);const lastSignature=useRef('');
  useEffect(()=>{
    const footer=document.querySelector<HTMLElement>('.journey-controls');
    const header=document.querySelector<HTMLElement>('.site-header');
    const frame=()=>{
      const cam=camera as THREE.PerspectiveCamera;
      cam.aspect=size.width/size.height;cam.fov=GARDEN_FOV;cam.updateProjectionMatrix();
      const bounds=gl.domElement.getBoundingClientRect();
      const footerTop=(footer?.getBoundingClientRect().top??bounds.bottom)-bounds.top;
      const headerBottom=(header?.getBoundingClientRect().bottom??96)-bounds.top;
      const mobile=size.width<600,tablet=size.width<900;
      const height=mobile?Math.min(size.height*.30,footerTop-headerBottom-260):footerTop-headerBottom-28;
      const width=size.width*(mobile?.92:tablet?.57:.50);
      const pixelsPerUnit=Math.max(140,Math.min(height,width/model.width*model.height))/model.height;
      const bleed=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tree-root-bleed'))||2;
      const halfFov=Math.tan(THREE.MathUtils.degToRad(GARDEN_FOV/2));
      const distance=size.height/(2*pixelsPerUnit*halfFov)*1.18;
      // Start at walking height, looking up into the tree. Its root still meets
      // the lower edge, while the garden has a real ground plane and horizon.
      const eye=2;
      const pitch=Math.atan((1+2*bleed/size.height)*halfFov)-Math.atan2(eye,distance);
      const depth=distance*Math.cos(pitch)-eye*Math.sin(pitch);
      const home=new THREE.Vector3((size.width/2-size.width*(mobile?.58:tablet?.70:.735))*2*halfFov*depth/size.height,eye,distance);
      const homeTarget=new THREE.Vector3(home.x,eye+Math.tan(pitch)*distance,0);
      cam.position.copy(home);cam.lookAt(homeTarget);cam.updateMatrixWorld();
      const moon=document.querySelector<HTMLElement>('.moon')?.getBoundingClientRect();
      environment.layout(cam,size.width,size.height,moon?{left:moon.left-bounds.left,top:moon.top-bounds.top,width:moon.width,height:moon.height}:{left:size.width*.50,top:size.height*.12,width:size.width*.4,height:size.width*.4});
      // one stop per strip, framed exactly where the panel's HTML button rests.
      const panels=[...document.querySelectorAll<HTMLElement>('[data-panel]')];const resting=panelStops();
      const slotStops=slots.map((slot,i):CameraStop=>{
        const panel=panels[i+1];const action=panel?.querySelector<HTMLElement>('.parchment-action');
        const panelRect=panel?.getBoundingClientRect(),actionRect=action?.getBoundingClientRect();
        const valid=!!panelRect&&!!actionRect&&actionRect.height>0;
        const screenX=valid?(actionRect!.left-panelRect!.left+actionRect!.width/2)/size.width:.7;
        const screenY=valid?(actionRect!.top-bounds.top+actionRect!.height/2)/size.height:.5;
        const fraction=valid?actionRect!.height/size.height:.55;
        const center=toTreeWorld(slot.center,new THREE.Vector3());
        const towardCamera=toTreeWorld(new THREE.Vector3(Math.sin(slot.yaw)*Math.cos(slot.pitch),-Math.sin(slot.pitch),Math.cos(slot.yaw)*Math.cos(slot.pitch)),new THREE.Vector3()).normalize();
        const forward=towardCamera.clone().negate();
        const right=forward.clone().cross(UP).normalize(),upward=right.clone().cross(forward).normalize();
        const reach=STRIP.height/(fraction*2*halfFov),viewHeight=2*reach*halfFov,viewWidth=viewHeight*size.width/size.height;
        const offset=right.multiplyScalar((screenX-.5)*viewWidth).add(upward.multiplyScalar((.5-screenY)*viewHeight));
        const position=center.clone().addScaledVector(towardCamera,reach).sub(offset);
        return {p:resting[i+1]??(i+1)/17,position,target:position.clone().addScaledVector(forward,reach)};
      });
      stops.current=[{p:0,position:home,target:homeTarget},...slotStops,{p:1,position:home.clone(),target:homeTarget.clone()}];
      const positions:THREE.Vector3[]=[],targets:THREE.Vector3[]=[],at:number[]=[];
      stops.current.forEach((stop,i)=>{
        at.push(positions.length);positions.push(stop.position);targets.push(stop.target);
        const next=stops.current[i+1];
        if(!next||i===0||i===stops.current.length-2)return;
        const outward=stop.position.clone().sub(stop.target).add(next.position.clone().sub(next.target)).normalize();
        const pull=Math.min(1.1,stop.position.distanceTo(next.position)*.35);
        positions.push(stop.position.clone().lerp(next.position,.5).addScaledVector(outward,pull).add(new THREE.Vector3(0,.08,0)));
        targets.push(stop.target.clone().lerp(next.target,.5));
      });
      paths.current={position:new THREE.CatmullRomCurve3(positions,false,'centripetal'),target:new THREE.CatmullRomCurve3(targets,false,'centripetal'),at};
      const stage=panels[1]?.querySelector<HTMLElement>('.parchment-stage')?.getBoundingClientRect(),firstPanel=panels[1]?.getBoundingClientRect();
      if(stage&&firstPanel&&stage.width>0) {
        // A short landscape window can put the CSS stage beneath the footer.
        // Frame the scroll within the unobstructed part of the viewport instead.
        const top=(headerBottom+32)/size.height+.15,bottom=(footerTop-32)/size.height-.15;
        const stageY=(stage.top-bounds.top+stage.height/2)/size.height;
        studioFrame.current={x:(stage.left-firstPanel.left+stage.width/2)/size.width,y:top<=bottom?THREE.MathUtils.clamp(stageY,top,bottom):(headerBottom+footerTop)/size.height/2,width:stage.width/size.width};
      }
      gl.domElement.dataset.footerTop=String(Math.round(footerTop));
      gl.domElement.dataset.environment='shared-world-camera';
      lastSignature.current='';invalidate();
    };
    frame();const observer=new ResizeObserver(frame);if(footer)observer.observe(footer);if(header)observer.observe(header);
    const track=document.querySelector('#parchment');if(track)observer.observe(track);
    return()=>observer.disconnect();
  },[size.width,size.height,camera,gl,model,environment,invalidate,slots]);
  // Negative priority updates the viewpoint before the rest of the scene.
  useFrame(()=>{
    const keys=stops.current,path=paths.current;if(!keys.length||!path)return;
    const cam=camera as THREE.PerspectiveCamera;
    const progress=journey.progress;
    if(journey.quiet) {
      // Without motion the camera cuts straight to the current strip.
      const key=keys[Math.min(journey.activePanel,keys.length-1)];walk.garden.copy(key.position);walk.gardenTarget.copy(key.target);
    } else {
      let index=0;
      while(index<keys.length-2&&progress>keys[index+1].p)index++;
      const raw=THREE.MathUtils.clamp((progress-keys[index].p)/(keys[index+1].p-keys[index].p),0,1);const t=raw*raw*(3-2*raw);
      const last=path.position.points.length-1;
      const u=THREE.MathUtils.lerp(path.at[index],path.at[index+1],t)/last;
      path.position.getPoint(u,walk.garden);path.target.getPoint(u,walk.gardenTarget);
    }
    const studio=journey.studio;let near=.1,studioFov=60;
    if(studio<=0){camera.position.copy(walk.garden);target.copy(walk.gardenTarget);}
    else {
      // Room and viewpoint share local bounds. Furniture keeps its original scale.
      const pavilion=environment.landmarks.pavilion;pavilion.updateWorldMatrix(true,false);
      const house=environment.house;
      // Each project turns the view a little around the table, so every stop shows another corner of the room.
      const yaw=journey.quiet?0:.08*Math.sin(progress*17*1.7);
      frameStudio(house.points.reading,MAKIMONO.length,size.width/size.height,studioFrame.current,yaw,walk.pose,size.width<=600);
      studioFov=walk.pose.fov;
      const positions=walk.positions,targets=walk.targets;
      pavilion.worldToLocal(positions[0].copy(walk.garden));pavilion.worldToLocal(targets[0].copy(walk.gardenTarget));
      positions[1].copy(house.points.front);positions[2].copy(house.points.threshold);positions[3].copy(house.points.inside);positions[4].copy(walk.pose.position);
      targets[1].copy(house.points.door);targets[2].copy(house.points.room);targets[3].copy(house.points.room);targets[4].copy(walk.pose.target);
      sampleStudioWalk(studio,positions,targets,walk.localPosition,walk.localTarget);
      pavilion.localToWorld(camera.position.copy(walk.localPosition));pavilion.localToWorld(target.copy(walk.localTarget));
      house.setOpen(smoothstep(.25,.55,studio));
      near=studio>=1?STUDIO_NEAR:THREE.MathUtils.lerp(.1,STUDIO_NEAR,smoothstep(.45,.85,studio));
    }
    // A wider lens once inside, as a room is seen up close.
    const fov=studio<=0?GARDEN_FOV:THREE.MathUtils.lerp(GARDEN_FOV,studioFov,smoothstep(.55,1,studio));
    if(cam.fov!==fov){cam.fov=fov;cam.updateProjectionMatrix();}
    if(cam.near!==near){cam.near=near;cam.updateProjectionMatrix();}
    // Indoors the open-air light fades and the room's own lamps take over.
    environment.house.setIndoor(studio);
    const indoor=THREE.MathUtils.smoothstep(studio,.3,1);
    const ambient=scene.getObjectByName('garden-ambient') as THREE.AmbientLight|undefined,sky=scene.getObjectByName('garden-sky') as THREE.HemisphereLight|undefined;
    if(ambient)ambient.intensity=THREE.MathUtils.lerp(.85,.18,indoor);
    if(sky)sky.intensity=THREE.MathUtils.lerp(.85,.3,indoor);
    // Close to the strips, fog folds the distant garden into the paper; inside the house it lifts.
    const fog=scene.fog as THREE.Fog|null;
    if(fog&&keys.length>17) {
      const close=smoothstep(0,keys[1].p,progress)*(1-smoothstep(keys[16].p,1,progress))*(1-smoothstep(0,.4,studio));
      fog.near=THREE.MathUtils.lerp(28,7,close)+studio*120;fog.far=THREE.MathUtils.lerp(310,34,close)+studio*360;
      // The pavilion waits off stage during the strip tour and returns for the walk inside.
      const away=close<.4||studio>0;environment.landmarks.pavilion.visible=away;
      const lantern=environment.group.getObjectByName('stone-lantern');if(lantern)lantern.visible=away;
    }
    camera.lookAt(target);camera.updateMatrixWorld();
    const signature=[progress,studio,...camera.position.toArray(),...target.toArray(),cam.fov,cam.near].map(v=>v.toFixed(5)).join(',');
    if(signature!==lastSignature.current) {
      root.set(0,0,0).project(camera);
      gl.domElement.dataset.rootY=String(Math.round((1-root.y)*size.height/2));
      gl.domElement.dataset.sceneProgress=progress.toFixed(6);
      gl.domElement.dataset.cameraPosition=camera.position.toArray().map(v=>v.toFixed(4)).join(',');
      gl.domElement.dataset.cameraTarget=target.toArray().map(v=>v.toFixed(4)).join(',');
      gl.domElement.dataset.studio=studio.toFixed(3);
      gl.domElement.dataset.cameraNear=cam.near.toFixed(4);
      gl.domElement.dataset.cameraFov=cam.fov.toFixed(3);
      gl.domElement.dataset.cameraLocalPosition=studio>0?walk.localPosition.toArray().map(v=>v.toFixed(4)).join(','):'';
      gl.domElement.dataset.studioRoomBounds=JSON.stringify(environment.house.bounds);
      gl.domElement.dataset.studioFrame=JSON.stringify(studioFrame.current);
      gl.domElement.dataset.pose='0,0,0,1,0,-0.13';
      const project=(position:THREE.Vector3)=>{
        landmark.copy(position).project(camera);
        return [Math.round((landmark.x+1)*size.width/2),Math.round((1-landmark.y)*size.height/2)];
      };
      gl.domElement.dataset.landmarks=JSON.stringify({pavilion:project(environment.landmarks.pavilion.position),moon:project(environment.landmarks.moon.position),stone:project(environment.landmarks.stone)});
      lastSignature.current=signature;
    }
  },-1);
  return null;
}

function Tree({model,wind}:{model:TreeModel;wind:AmbientWind}) {
  const petals=useRef<THREE.InstancedMesh>(null!);const centers=useRef<THREE.InstancedMesh>(null!);const buds=useRef<THREE.InstancedMesh>(null!);
  const geometry=useMemo(()=>{
    const value=petalGeometry();const anchors=new Float32Array(model.flowers.length*5*3),weights=new Float32Array(model.flowers.length*5);
    model.flowers.forEach((flower,i)=>{const weight=wind.flexibility(flower.position);for(let j=0;j<5;j++){flower.position.toArray(anchors,(i*5+j)*3);weights[i*5+j]=weight;}});
    value.setAttribute('windAnchor',new THREE.InstancedBufferAttribute(anchors,3));value.setAttribute('windWeight',new THREE.InstancedBufferAttribute(weights,1));return value;
  },[model,wind]);
  const centerGeometry=useMemo(()=>{
    const value=blossomCenterGeometry();const anchors=new Float32Array(model.flowers.length*3),weights=new Float32Array(model.flowers.length);
    model.flowers.forEach((flower,i)=>{flower.position.toArray(anchors,i*3);weights[i]=wind.flexibility(flower.position);});
    value.setAttribute('windAnchor',new THREE.InstancedBufferAttribute(anchors,3));value.setAttribute('windWeight',new THREE.InstancedBufferAttribute(weights,1));return value;
  },[model,wind]);
  const budGeometry=useMemo(()=>{
    const value=new THREE.SphereGeometry(1,6,4);const anchors=new Float32Array(model.buds.length*3),weights=new Float32Array(model.buds.length);
    model.buds.forEach((position,i)=>{position.toArray(anchors,i*3);weights[i]=wind.flexibility(position);});
    value.setAttribute('windAnchor',new THREE.InstancedBufferAttribute(anchors,3));value.setAttribute('windWeight',new THREE.InstancedBufferAttribute(weights,1));return value;
  },[model,wind]);
  const bark=useMemo(barkTexture,[]);
  const branches=useMemo(()=>{
    const position=new THREE.Vector3();
    const pieces=model.branches.map(branch=>{
      const value=branchGeometry(branch),vertices=value.getAttribute('position');const weights=new Float32Array(vertices.count);
      if(branch.level>1)for(let i=0;i<vertices.count;i++){position.fromBufferAttribute(vertices,i);weights[i]=wind.flexibility(position);}
      value.setAttribute('windAnchor',vertices.clone());value.setAttribute('windWeight',new THREE.BufferAttribute(weights,1));return value;
    });
    const merged=mergeGeometries(pieces)!;pieces.forEach(g=>g.dispose());merged.computeBoundingSphere();if(merged.boundingSphere)merged.boundingSphere.radius+=.15;return merged;
  },[model,wind]);
  const materials=useMemo(()=>({
    wood:addTreeWind(new THREE.MeshStandardMaterial({vertexColors:true,map:bark,bumpMap:bark,bumpScale:.025,roughness:.94}),wind.field),
    petals:addTreeWind(new THREE.MeshStandardMaterial({vertexColors:true,roughness:.86,side:THREE.DoubleSide}),wind.field),
    centers:addTreeWind(new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide}),wind.field),
    buds:addTreeWind(new THREE.MeshStandardMaterial({color:'#c990a1',roughness:.88}),wind.field),
  }),[bark,wind]);
  const {invalidate}=useThree();
  useEffect(()=>{
    let n=0;const radial=new THREE.Quaternion();
    model.flowers.forEach((flower,i)=>{
      for(let j=0;j<5;j++) {
        radial.setFromAxisAngle(new THREE.Vector3(0,0,1),j*Math.PI*2/5);
        dummy.position.copy(flower.position);dummy.quaternion.copy(flower.orientation).multiply(radial);dummy.scale.setScalar(flower.scale);dummy.updateMatrix();petals.current.setMatrixAt(n,dummy.matrix);
        tint.set(flower.tint<.18?'#e2b3bf':flower.tint<.55?'#f1d4d9':'#fff9f2');petals.current.setColorAt(n,tint);n++;
      }
      dummy.position.copy(flower.position);dummy.quaternion.copy(flower.orientation);dummy.scale.setScalar(flower.scale);dummy.updateMatrix();centers.current.setMatrixAt(i,dummy.matrix);
    });
    model.buds.forEach((at,i)=>{dummy.position.copy(at);dummy.rotation.set(0,i*.4,.2);dummy.scale.set(.023,.039,.023);dummy.updateMatrix();buds.current.setMatrixAt(i,dummy.matrix);});
    petals.current.instanceMatrix.needsUpdate=true;centers.current.instanceMatrix.needsUpdate=true;buds.current.instanceMatrix.needsUpdate=true;
    if(petals.current.instanceColor)petals.current.instanceColor.needsUpdate=true;invalidate();
    return ()=>{branches.dispose();geometry.dispose();centerGeometry.dispose();budGeometry.dispose();bark.dispose();Object.values(materials).forEach(material=>material.dispose());};
  },[model,branches,geometry,centerGeometry,budGeometry,bark,materials,invalidate]);
  return <group rotation={[0,-.13,0]}>
    <mesh geometry={branches} material={materials.wood}/>
    <instancedMesh ref={petals} args={[geometry,materials.petals,model.flowers.length*5]} frustumCulled={false}/>
    <instancedMesh ref={centers} args={[centerGeometry,materials.centers,model.flowers.length]} frustumCulled={false}/>
    <instancedMesh ref={buds} args={[budGeometry,materials.buds,model.buds.length]} frustumCulled={false}/>
  </group>;
}
function AmbientWindController({model,wind}:{model:TreeModel;wind:AmbientWind}) {
  const {size,gl}=useThree();const lastTelemetry=useRef(-1);const canopy=useMemo(()=>new THREE.Vector3(),[]);
  const sampleTip=useMemo(()=>{
    let anchor=model.flowers[0].position,weight=0;
    for(const flower of model.flowers){const value=wind.flexibility(flower.position);if(value>weight){anchor=flower.position;weight=value;}}
    return {anchor,weight};
  },[model,wind]);
  useEffect(()=>{wind.setCount(size.width<600);},[wind,size.width]);
  useEffect(()=>{
      const changed=()=>{const stopped=journey.quiet||journey.paused||journey.hidden;gl.domElement.dataset.windPaused=String(stopped);if(stopped)wind.resetFrame();};
    changed();return subscribeMeta(changed);
  },[wind,gl]);
  useFrame((_,dt)=>{
    if(journey.quiet||journey.paused||journey.hidden)return;
    wind.setCount(size.width<600);wind.advance(dt);
    if(wind.time-lastTelemetry.current>=.25) {
      const canvas=gl.domElement;const phases={flying:0,resting:0,fading:0};
      for(let i=0;i<wind.petals.count;i++)phases[wind.petals.particles[i].phase]++;
      wind.field.bend(sampleTip.anchor,sampleTip.weight,canopy);
      canvas.dataset.windTime=wind.time.toFixed(4);canvas.dataset.windGust=wind.field.gust.toFixed(4);
      canvas.dataset.petalCount=String(wind.petals.count);canvas.dataset.windQuality=wind.lowQuality?'reduced':'full';
      canvas.dataset.petalPhases=JSON.stringify(phases);canvas.dataset.petalLandings=String(wind.petals.landings);canvas.dataset.petalRecycled=String(wind.petals.recycled);
      canvas.dataset.petalPath=JSON.stringify({position:wind.petals.particles[0].position.toArray(),phase:wind.petals.particles[0].phase,age:wind.petals.particles[0].age});
      canvas.dataset.canopySway=canopy.toArray().map(v=>v.toFixed(5)).join(',');
      lastTelemetry.current=wind.time;
    }
  },-2);
  return null;
}
function FallingPetals({wind}:{wind:AmbientWind}) {
  const mesh=useRef<THREE.InstancedMesh>(null!);const {camera}=useThree();
  const opacity=useMemo(()=>new THREE.InstancedBufferAttribute(new Float32Array(wind.petals.capacity),1).setUsage(THREE.DynamicDrawUsage),[wind]);
  const geometry=useMemo(()=>{const value=petalGeometry();value.translate(0,-.115,-.02);value.setAttribute('petalOpacity',opacity);return value;},[opacity]);
  const material=useMemo(()=>addPetalOpacity(new THREE.MeshStandardMaterial({vertexColors:true,color:'#f6d4dc',roughness:.9,side:THREE.DoubleSide,transparent:true,depthWrite:false})),[]);
  const order=useMemo(()=>Array.from({length:wind.petals.capacity},(_,i)=>i),[wind]);
  const distances=useMemo(()=>new Float32Array(wind.petals.capacity),[wind]);
  useEffect(()=>{mesh.current.instanceMatrix.setUsage(THREE.DynamicDrawUsage);return()=>{geometry.dispose();material.dispose();};},[geometry,material]);
  useFrame(()=>{
    const {particles,count}=wind.petals;mesh.current.count=count;
    // Back-to-front transparency uses render slots, preserving particle IDs.
    order.length=count;
    for(let i=0;i<count;i++){order[i]=i;distances[i]=particles[i].position.distanceToSquared(camera.position);}
    order.sort((a,b)=>distances[b]-distances[a]);
    for(let slot=0;slot<count;slot++) {
      const petal=particles[order[slot]];
      dummy.position.copy(petal.position);dummy.quaternion.copy(petal.orientation);dummy.scale.setScalar(petal.scale);dummy.updateMatrix();mesh.current.setMatrixAt(slot,dummy.matrix);opacity.setX(slot,petal.opacity);
    }
    mesh.current.instanceMatrix.needsUpdate=true;opacity.needsUpdate=true;
  });
  return <instancedMesh ref={mesh} args={[geometry,material,wind.petals.capacity]} frustumCulled={false}/>;
}
function SceneController({onFailure,wind,environment}:{onFailure:()=>void;wind:AmbientWind;environment:GardenEnvironment}) {
  const {camera,size,gl,invalidate,setDpr}=useThree();const first=useRef(true);const revealFrame=useRef(0);const sample=useRef({time:0,frames:0,adapted:false,dropped:false});
  useEffect(()=>{
    const cam=camera as THREE.PerspectiveCamera;
    cam.aspect=size.width/size.height;cam.updateProjectionMatrix();
    setDpr(sample.current.dropped?1:Math.min(window.devicePixelRatio||1,size.width<600?1.25:1.5));invalidate();
  },[camera,size.width,size.height,invalidate,setDpr]);
  useEffect(()=>subscribeJourney(()=>{if(!journey.hidden&&!journey.paused)invalidate();}),[invalidate]);
  useEffect(()=>{
    const canvas=gl.domElement; const lost=(event:Event)=>{event.preventDefault();cancelAnimationFrame(revealFrame.current);setSceneStatus('fallback');onFailure();};
    canvas.addEventListener('webglcontextlost',lost);return()=>{cancelAnimationFrame(revealFrame.current);canvas.removeEventListener('webglcontextlost',lost);document.documentElement.classList.remove('scene-ready');};
  },[gl,onFailure]);
  useFrame((_,dt)=>{
    if(first.current){revealFrame.current=requestAnimationFrame(()=>setSceneStatus('ready'));first.current=false;}
    else if(document.documentElement.dataset.scene==='ready'&&!document.documentElement.classList.contains('scene-ready'))setSceneStatus('ready');
    const s=sample.current;if(!journey.quiet&&!s.adapted&&dt<.3){s.time+=dt;s.frames++;if(s.time>4){const fps=s.frames/s.time;gl.domElement.dataset.initialFps=String(Math.round(fps));gl.domElement.dataset.drawCalls=String(gl.info.render.calls);if(fps<40){s.dropped=true;wind.lowQuality=true;environment.setShadowQuality(false);setDpr(1);}s.adapted=true;}}
    gl.domElement.dataset.shadowMode=environment.shadowState.enabled?'projected':'contact';
    gl.domElement.dataset.shadowMapSize=String(environment.shadowState.mapSize);
    gl.domElement.dataset.shadowUpdates=String(environment.shadowState.revision);
  });return null;
}
function SceneFrameController({quiet}:{quiet:boolean}) {
  const {invalidate}=useThree();
  useEffect(()=>{invalidate();},[invalidate,quiet]);
  return null;
}
export default function SakuraCanvas({projects}:{projects:ProjectCard[]}) {
  useSyncExternalStore(subscribeMeta,metaSnapshot,()=> 'false:false:false');
  const [failed,setFailed]=useState(false);
  const onFailure=useCallback(()=>setFailed(true),[]);
  const model=useMemo(createTree,[]);
  const wind=useMemo(()=>new AmbientWind(model),[model]);
  const environment=useMemo(createGardenEnvironment,[]);
  const slots=useMemo(()=>chooseSlots(model,STRIP,projects.length),[model,projects.length]);
  useEffect(()=>()=>environment.dispose(),[environment]);
  const quiet=journey.quiet;const stopped=journey.paused||journey.hidden;
  if(failed)return null;
  return <Canvas className="scene-canvas" data-motion-mode={quiet?'quiet':'animated'} data-render-loop={stopped?'paused':quiet?'demand':'always'} aria-hidden="true" camera={{position:[0,2,20],fov:42,near:.1,far:360}} dpr={[1,window.innerWidth<600?1.25:1.5]} frameloop={stopped?'never':quiet?'demand':'always'} gl={{alpha:true,antialias:true,powerPreference:'low-power'}} shadows={{type:THREE.PCFShadowMap}} fallback={null}>
    <fog attach="fog" args={['#f3e9d6',28,310]}/>
    <ambientLight name="garden-ambient" intensity={.85}/><hemisphereLight name="garden-sky" args={['#fff9ef','#858270',.85]}/>
    <SceneFrameController quiet={quiet}/><AmbientWindController model={model} wind={wind}/><CameraJourney model={model} environment={environment} slots={slots}/><primitive object={environment.group}/><Tree model={model} wind={wind}/><FallingPetals wind={wind}/><HangingStrips projects={projects} wind={wind} slots={slots}/><StudioScrolls projects={projects} environment={environment}/><SceneController onFailure={onFailure} wind={wind} environment={environment}/>
  </Canvas>;
}
