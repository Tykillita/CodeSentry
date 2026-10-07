import * as THREE from 'three';
import { STUDIO_ROOM } from './studio-layout.ts';

export const STUDIO_NEAR=.04;
export type StudioFrame={x:number;y:number;width:number};
export type StudioPose={position:THREE.Vector3;target:THREE.Vector3;fov:number;tilt:number};
export const createStudioPose=():StudioPose=>({position:new THREE.Vector3(),target:new THREE.Vector3(),fov:60,tilt:28});

/** Fit the existing scroll into its HTML stage without putting the observer outside. */
export function frameStudio(reading:THREE.Vector3,length:number,aspect:number,frame:StudioFrame,yaw:number,out:StudioPose,closeReading=false) {
  const room=STUDIO_ROOM,baseWidth=Math.max(.22,frame.width*(closeReading?1.02:.78));
  aspect=Math.max(.1,Number.isFinite(aspect)?aspect:1);
  const sy=Math.sin(yaw),cy=Math.cos(yaw);
  const place=(fov:number,fraction:number)=>{
    const lens=Math.tan(THREE.MathUtils.degToRad(fov/2));
    const reach=Math.max(1.05,length/(fraction*2*lens*aspect)),vertical=2*lens*(frame.y-.5);
    // Start at 28 degrees; lower the viewing angle when a tall viewport needs distance.
    const heightAngle=Math.asin(THREE.MathUtils.clamp((1.75-reading.y)/(reach*Math.hypot(1,vertical)),-1,1))-Math.atan(vertical);
    const tilt=THREE.MathUtils.clamp(heightAngle,THREE.MathUtils.degToRad(5),THREE.MathUtils.degToRad(28));
    const st=Math.sin(tilt),ct=Math.cos(tilt),offsetX=(frame.x-.5)*2*reach*lens*aspect,offsetY=(.5-frame.y)*2*reach*lens;
    out.position.set(reading.x+sy*(reach*ct+offsetY*st)-cy*offsetX,reading.y+reach*st-offsetY*ct,reading.z+cy*(reach*ct+offsetY*st)+sy*offsetX);
    out.target.copy(out.position).add(new THREE.Vector3(-sy*ct,-st,-cy*ct).multiplyScalar(reach));
    out.fov=fov;out.tilt=THREE.MathUtils.radToDeg(tilt);
  };
  const fits=()=>out.position.x>=room.left+room.margin&&out.position.x<=room.right-room.margin&&out.position.z>=room.back+room.margin&&out.position.z<=room.front-room.margin&&out.position.y>=room.floor+room.margin&&out.position.y<=1.75+1e-8;
  for(let fov=60;fov<=68;fov+=2){place(fov,baseWidth);if(fits())return out;}
  // On extreme aspect ratios the scroll can grow a little, while the walls stay intact.
  for(let fraction=baseWidth*1.06;fraction<=Math.max(1.5,baseWidth);fraction*=1.06){place(68,fraction);if(fits())return out;}
  // Degenerate viewports still get a finite, safe pose and retain the HTML detail action.
  const direction=new THREE.Vector3().subVectors(out.target,out.position);
  out.position.clamp(new THREE.Vector3(room.left+room.margin,room.floor+room.margin,room.back+room.margin),new THREE.Vector3(room.right-room.margin,1.75,room.front-room.margin));
  out.target.copy(out.position).add(direction);
  return out;
}

const ease=(t:number)=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
/** Local-space walk: each segment stays in the entrance corridor or the convex room. */
export function sampleStudioWalk(amount:number,positions:readonly THREE.Vector3[],targets:readonly THREE.Vector3[],position:THREE.Vector3,target:THREE.Vector3) {
  const times=[0,.45,.72,.86,1];let segment=0;
  while(segment<3&&amount>times[segment+1])segment++;
  const t=ease((amount-times[segment])/(times[segment+1]-times[segment]));
  position.copy(positions[segment]).lerp(positions[segment+1],t);
  target.copy(targets[segment]).lerp(targets[segment+1],t);
}
