import * as THREE from 'three';

/** Pavilion-local dimensions shared by the shell, furniture anchors and camera. */
export const STUDIO_ROOM={
  width:3.8,depth:4.3,floor:.37,ceiling:2.97,
  left:-1.9,right:1.9,back:-1.5,front:2.8,
  centerZ:.65,doorWidth:.9,doorTop:2.78,margin:.15,
} as const;

export function createStudioPoints(reading:THREE.Vector3) {
  return {
    front:new THREE.Vector3(0,1.45,STUDIO_ROOM.front+2.6),
    threshold:new THREE.Vector3(0,1.38,STUDIO_ROOM.front+.22),
    inside:new THREE.Vector3(0,1.38,STUDIO_ROOM.front-.35),
    seat:new THREE.Vector3(0,1.16,1.2),table:new THREE.Vector3(0,.69,-.06),
    tray:new THREE.Vector3(.72,.45,.22).add(new THREE.Vector3(...STUDIO_OFFSETS.tray)),
    reading:reading.clone(),door:new THREE.Vector3(0,1.25,STUDIO_ROOM.front+.03),
    room:new THREE.Vector3(0,.95,-.35),
  };
}

/** Translate each existing arrangement as a whole; its objects keep their size. */
export const STUDIO_OFFSETS={
  alcove:[-.45,0,-.855],shelves:[.10,0,-.855],chest:[.7,0,-.855],
  screen:[-.7,0,-.3],desk:[-.55,0,0],hearth:[-.5,0,.35],
  tray:[.25,0,.15],andon:[.82,0,0],lantern:[.4,.83,-.15],
} as const;
