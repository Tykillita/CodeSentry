import * as THREE from 'three';
import type { createTree } from './tree-model';

// chooses where each project hangs from the tree. Coordinates are
// tree-local (before the tree group's turn), like the tree model itself.
type TreeModel=ReturnType<typeof createTree>;
export type HangingSize={width:number;height:number;cord:number;forward:number};
export type HangingSlot={
  id:number;anchor:THREE.Vector3;tangent:THREE.Vector3;branchRadius:number;
  center:THREE.Vector3;yaw:number;pitch:number;
  /** Points inside the hanging volume, on the close-up sight lines, and on the line from the home view. */
  blockers:number;sight:number;hidden:number;
};
export type SlotOverride={id:number;yaw?:number;pitch?:number};
/** Tanzaku: a long, narrow festival strip tied to the branch by a short cord. */
export const STRIP:HangingSize={width:.13,height:.95,cord:.12,forward:.12};
export const FRAMING_PITCH=THREE.MathUtils.degToRad(8);
/** Approximate home camera in tree space; strips must read from the opening view too. */
const HOME_VIEW=new THREE.Vector3(.6,2,16);
/**
 * Frozen route, reviewed stop by stop. Ids are candidate indexes, stable because
 * the tree is seeded. Empty means the automatic route.
 */
export const CURATED_SLOTS:SlotOverride[]=[{id:0},{id:8},{id:581},{id:596},{id:1956},{id:347},{id:59},{id:140},{id:2613},{id:2674},{id:2599},{id:2897},{id:2930},{id:153},{id:27},{id:21}];

type Obstacle={point:THREE.Vector3;radius:number};
function obstaclesOf(model:TreeModel) {
  const obstacles:Obstacle[]=[];
  for(const branch of model.branches) {
    if(branch.root||branch.level>4)continue;
    const curve=new THREE.CatmullRomCurve3(branch.points,false,'centripetal');
    const steps=branch.level<=1?48:branch.level===2?12:5;
    for(let i=0;i<=steps;i++)obstacles.push({point:curve.getPoint(i/steps),radius:Math.max(.02,branch.radius*(1-i/steps*.8))});
  }
  for(const flower of model.flowers)obstacles.push({point:flower.position,radius:.07});
  return obstacles;
}
/** Where the camera sits for a close-up: in front, a little below, looking up. */
export function framingPosition(center:THREE.Vector3,yaw:number,pitch:number,reach:number,out=new THREE.Vector3()) {
  return out.set(Math.sin(yaw)*Math.cos(pitch),-Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)).multiplyScalar(reach).add(center);
}
const ray=new THREE.Ray(),corner=new THREE.Vector3(),closest=new THREE.Vector3(),down=new THREE.Vector3();
function sightBlockers(size:HangingSize,center:THREE.Vector3,yaw:number,camera:THREE.Vector3,obstacles:Obstacle[]) {
  let hits=0;const right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
  for(const [sx,sy] of [[-.5,-.5],[.5,-.5],[-.5,.5],[.5,.5],[0,0]]) {
    corner.copy(center).addScaledVector(right,sx*size.width).add(down.set(0,sy*size.height,0));
    ray.origin.copy(camera);ray.direction.subVectors(corner,camera);const length=ray.direction.length();ray.direction.normalize();
    for(const {point,radius} of obstacles) {
      const along=ray.direction.dot(closest.subVectors(point,camera));
      if(along<.2||along>length-.08)continue;
      if(ray.closestPointToPoint(point,closest).distanceTo(point)<radius+.015)hits++;
    }
  }
  return hits;
}
/** Close-up distance for a hanging piece filling ~55% of the view height (fov 42°). */
export const closeReach=(size:HangingSize)=>size.height/(.55*2*Math.tan(THREE.MathUtils.degToRad(21)));

export function slotCandidates(model:TreeModel,size:HangingSize):HangingSlot[] {
  const obstacles=obstaclesOf(model);const slots:HangingSlot[]=[];let id=0;
  for(const branch of model.branches) {
    if(branch.root||branch.level<1||branch.level>3)continue;
    const curve=new THREE.CatmullRomCurve3(branch.points,false,'centripetal');
    for(let t=.22;t<=.96;t+=.04,id++) {
      const anchor=curve.getPoint(t),tangent=curve.getTangent(t);
      // Limbs, secondaries and shoots; only ones running sideways can hold a cord loop.
      if(anchor.y<2.9||anchor.y>7||Math.abs(anchor.x)<.6||Math.abs(tangent.y)>.8)continue;
      const branchRadius=Math.max(.02,branch.radius*(1-t*.8));
      const center=anchor.clone().add(new THREE.Vector3(0,-(branchRadius+size.cord+size.height/2),size.forward));
      const bottom=center.y-size.height/2,top=anchor.y-branchRadius;
      if(bottom<1.6)continue;
      let blockers=0;
      for(const {point} of obstacles) {
        if(point.distanceTo(anchor)<.16)continue;
        if(Math.abs(point.x-center.x)<size.width/2+.05&&point.y>bottom-.05&&point.y<top&&point.z>center.z-.18&&point.z<center.z+.4)blockers++;
      }
      const yaw=THREE.MathUtils.clamp(anchor.x*.06,-.28,.28);
      const pitch=FRAMING_PITCH+THREE.MathUtils.degToRad(THREE.MathUtils.clamp((3.4-center.y)*11,0,12));
      const sight=sightBlockers(size,center,yaw,framingPosition(center,yaw,pitch,closeReach(size)),obstacles);
      const hidden=sightBlockers(size,center,yaw,HOME_VIEW,obstacles);
      slots.push({id,anchor,tangent,branchRadius,center,yaw,pitch,blockers,sight,hidden});
    }
  }
  return slots;
}

/** Climbs the left limb, crosses the crown and descends the right one. */
function route(slots:HangingSlot[]) {
  // A nearest-neighbour walk from each side's lowest piece keeps every hop short.
  const walk=(side:HangingSlot[])=>{
    const rest=[...side].sort((a,b)=>a.center.y-b.center.y);const path:HangingSlot[]=[];
    let current=rest.shift();
    while(current) {
      path.push(current);const from=current;
      rest.sort((a,b)=>a.center.distanceTo(from.center)-b.center.distanceTo(from.center));current=rest.shift();
    }
    return path;
  };
  return [...walk(slots.filter(slot=>slot.center.x<0)),...walk(slots.filter(slot=>slot.center.x>=0)).reverse()];
}
const routeLength=(path:HangingSlot[])=>path.reduce((sum,slot,i)=>i?sum+slot.center.distanceTo(path[i-1].center):0,0);
const cost=(slot:HangingSlot)=>slot.blockers+slot.sight+slot.hidden;

export function chooseSlots(model:TreeModel,size:HangingSize,count=16):HangingSlot[] {
  const candidates=slotCandidates(model,size);
  if(CURATED_SLOTS.length>=count) {
    const byId=new Map(candidates.map(slot=>[slot.id,slot]));
    const curated=CURATED_SLOTS.map(entry=>{
      const slot=byId.get(entry.id);if(!slot)return undefined;
      return {...slot,yaw:entry.yaw??slot.yaw,pitch:entry.pitch??slot.pitch};
    });
    if(curated.every(Boolean))return curated.slice(0,count) as HangingSlot[];
  }
  const usable=candidates.filter(slot=>cost(slot)<=2);
  // Strips spread over the canopy; stacked ones never let a cord cross the piece above.
  const apart=(a:HangingSlot,b:HangingSlot)=>{
    if(a.center.distanceTo(b.center)<.95)return false;
    if(Math.abs(a.center.x-b.center.x)>size.width+.14)return true;
    const [upper,lower]=a.center.y>b.center.y?[a,b]:[b,a];
    return lower.anchor.y+.06<upper.center.y-size.height/2;
  };
  const fits=(slot:HangingSlot,chosen:HangingSlot[])=>chosen.every(other=>apart(slot,other));
  // A single greedy pass wastes room; several seeded orderings keep the fullest, cleanest set.
  let best:HangingSlot[]=[];let bestScore=-Infinity;let seed=9137;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let pass=0;pass<240;pass++) {
    const order=usable.map(slot=>({slot,key:cost(slot)+(pass?random()*3:0)})).sort((a,b)=>a.key-b.key).map(entry=>entry.slot);
    const chosen:HangingSlot[]=[];
    for(const slot of order){if(chosen.length>=count)break;if(fits(slot,chosen))chosen.push(slot);}
    const path=route(chosen);
    // Rewards reaching up into the crown, not only the two low limbs.
    const ys=path.map(slot=>slot.center.y),spread=Math.max(...ys)-Math.min(...ys);
    const score=path.length*100-path.reduce((sum,slot)=>sum+cost(slot),0)*2-routeLength(path)*.4+spread*6;
    if(score>bestScore){best=path;bestScore=score;}
  }
  return best;
}
