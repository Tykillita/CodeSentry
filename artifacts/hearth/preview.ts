import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { createStudioHearth } from '../../src/components/scene/studio-hearth';

RectAreaLightUniformsLib.init();
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;document.body.prepend(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#e9dfca');
const camera=new THREE.PerspectiveCamera(35,innerWidth/innerHeight,.001,10);
scene.add(new THREE.AmbientLight('#ffffff',.35),new THREE.HemisphereLight('#fff9ef','#858270',.6));
const key=new THREE.DirectionalLight('#fff3dc',2.3);key.position.set(1,2,2);key.castShadow=true;
key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-1;key.shadow.camera.right=1;key.shadow.camera.top=1;key.shadow.camera.bottom=-1;key.shadow.bias=-.00002;
scene.add(key,key.target);
const fill=new THREE.RectAreaLight('#e3ecf7',5,.7,.86);fill.position.set(-1,1,1);fill.lookAt(0,0,0);scene.add(fill);
const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
const ctx=canvas.getContext('2d')!,fade=ctx.createRadialGradient(32,32,0,32,32,32);fade.addColorStop(0,'rgba(255,255,255,.6)');fade.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=fade;ctx.fillRect(0,0,64,64);
const contact=new THREE.CanvasTexture(canvas),hearth=createStudioHearth({contact});hearth.group.position.set(0,0,0);scene.add(hearth.group);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(20,20),new THREE.MeshStandardMaterial({color:'#c7ba8d',roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.0003;floor.receiveShadow=true;scene.add(floor);
let angle=-.4;
function render(){
  const center=new THREE.Vector3(0,.193,0),distance=.86;
  camera.position.set(Math.sin(angle)*distance,.193+distance*.45,Math.cos(angle)*distance);camera.lookAt(center);camera.updateProjectionMatrix();
  renderer.render(scene,camera);document.body.dataset.metrics=JSON.stringify({...hearth.metrics,drawCalls:renderer.info.render.calls,textures:renderer.info.memory.textures,geometries:renderer.info.memory.geometries});
}
document.getElementById('turn')!.addEventListener('click',()=>{angle+=.7;render();});
document.getElementById('dispose')!.addEventListener('click',()=>{
  const before={...renderer.info.memory};let contactDisposed=false;
  const onContactDispose=()=>{contactDisposed=true;};contact.addEventListener('dispose',onContactDispose);
  const temporary=createStudioHearth({contact});temporary.group.position.set(.5,0,0);scene.add(temporary.group);renderer.render(scene,camera);
  const during={...renderer.info.memory};scene.remove(temporary.group);temporary.dispose();temporary.dispose();renderer.render(scene,camera);
  contact.removeEventListener('dispose',onContactDispose);const after={...renderer.info.memory};
  document.body.dataset.lifecycle=JSON.stringify({before,during,after,sharedContactRetained:!contactDisposed,noRetainedAllocations:before.textures===after.textures&&before.geometries===after.geometries});
});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;renderer.setSize(innerWidth,innerHeight);render();});
render();
