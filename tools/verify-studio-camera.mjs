import assert from 'node:assert/strict';
import * as THREE from 'three';
import {STUDIO_ROOM as room,createStudioPoints} from '../src/components/scene/studio-layout.ts';
import {createStudioPose,frameStudio,sampleStudioWalk,STUDIO_NEAR} from '../src/components/scene/studio-camera.ts';

const reading=new THREE.Vector3(0,.695+Math.sin(.35)*.16+.006,.1-Math.cos(.35)*.16),points=createStudioPoints(reading);
const viewports=[[320,844],[390,844],[874,882],[1440,900],[844,390],[599,900],[600,900],[899,900],[900,900],[2560,1080],[320,1200]];
const camera=new THREE.PerspectiveCamera(),position=new THREE.Vector3(),target=new THREE.Vector3(),corner=new THREE.Vector3();
let poses=0,walkSamples=0;const report=[];
function checkPoint(p,label) {
  assert(p.toArray().every(Number.isFinite),`${label}: finite coordinates`);
  if(p.z<=room.front){
    assert(p.x>room.left&&p.x<room.right,`${label}: side walls`);
    assert(p.z>room.back,`${label}: back wall`);
    assert(p.y>room.floor&&p.y<room.ceiling,`${label}: floor/ceiling`);
  }
  if(Math.abs(p.z-room.front)<.10){
    assert(Math.abs(p.x)<room.doorWidth/2-.04,`${label}: doorway sides`);
    assert(p.y<room.doorTop,`${label}: door lintel`);
  }
}
for(const [width,height] of viewports) {
  const mobile=width<=600,frame={x:mobile?.5:width<900?.695:.611,y:mobile?.591:width<900?.494:.508,width:mobile?.86:width<900?.49:.44};
  for(let project=1;project<=16;project++)for(const quiet of [false,true]) {
    const yaw=quiet?0:.08*Math.sin(project*1.7),pose=frameStudio(reading,.9,width/height,frame,yaw,createStudioPose(),mobile);
    const label=`${width}x${height} project ${project} quiet=${quiet}`;
    checkPoint(pose.position,label);assert(pose.position.z<=room.front-room.margin+1e-8,label);assert(pose.position.y<=1.75+1e-8,label);assert(pose.fov>=60&&pose.fov<=68,label);
    camera.aspect=width/height;camera.fov=pose.fov;camera.near=STUDIO_NEAR/.68;camera.updateProjectionMatrix();camera.position.copy(pose.position);camera.lookAt(pose.target);camera.updateMatrixWorld();
    const projection=reading.clone().project(camera);
    assert(Math.abs((projection.x+1)/2-frame.x)<.015,`${label}: scroll horizontal alignment`);
    assert(Math.abs((1-projection.y)/2-frame.y)<.015,`${label}: scroll vertical alignment`);
    if(mobile) {
      const left=reading.clone().add(new THREE.Vector3(-.45,0,0)).project(camera),right=reading.clone().add(new THREE.Vector3(.45,0,0)).project(camera);
      assert((right.x-left.x)/2>.83,`${label}: mobile scroll remains large enough to read`);
      assert(left.x>-.99&&right.x<.99,`${label}: mobile scroll fits the viewport`);
    }
    for(const x of [-1,1])for(const y of [-1,1])checkPoint(corner.set(x,y,-1).unproject(camera),`${label}: near plane`);
    poses++;
    // Far-left/right garden stops exercise entry from either side of the tree.
    for(const startX of [-18,12]) {
      const positions=[new THREE.Vector3(startX,5,18),points.front,points.threshold,points.inside,pose.position];
      const targets=[new THREE.Vector3(startX,5,15),points.door,points.room,points.room,pose.target];
      for(let step=0;step<=200;step++) {
        const amount=step/200;
        sampleStudioWalk(amount,positions,targets,position,target);
        checkPoint(position,`${label}: walk ${amount}`);
        camera.near=THREE.MathUtils.lerp(.1,STUDIO_NEAR,THREE.MathUtils.smoothstep(amount,.45,.85))/.68;
        camera.fov=THREE.MathUtils.lerp(42,pose.fov,THREE.MathUtils.smoothstep(amount,.55,1));camera.updateProjectionMatrix();
        camera.position.copy(position);camera.lookAt(target);camera.updateMatrixWorld();
        for(const x of [-1,1])for(const y of [-1,1])checkPoint(corner.set(x,y,-1).unproject(camera),`${label}: walk near plane ${amount}`);
        walkSamples++;
      }
    }
    if(project===1&&!quiet)report.push({width,height,fov:pose.fov,tilt:Number(pose.tilt.toFixed(2)),position:pose.position.toArray()});
  }
}
console.log(JSON.stringify({poses,walkSamples,room,viewports:report},null,2));
