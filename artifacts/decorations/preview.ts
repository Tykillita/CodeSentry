import * as THREE from 'three';
import {RectAreaLightUniformsLib} from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import {createStudioDecorations} from '../../src/components/scene/studio-decorations.ts';
const delayed=new URLSearchParams(location.search).has('deferred');
const originalFontLoad=document.fonts.load.bind(document.fonts);
const fontStyleReady=delayed?new Promise<void>(resolve=>setTimeout(resolve,1600)).then(()=>import('@fontsource/noto-serif-jp/400.css')):import('@fontsource/noto-serif-jp/400.css');
if(delayed)document.fonts.load=async(font,text)=>{await fontStyleReady;return originalFontLoad(font,text);};
RectAreaLightUniformsLib.init();
const scene=new THREE.Scene();scene.background=new THREE.Color('#e9dfca');
const camera=new THREE.PerspectiveCamera(35,innerWidth/innerHeight,.001,100);
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;document.body.prepend(renderer.domElement);
scene.add(new THREE.AmbientLight('#ffffff',.35),new THREE.HemisphereLight('#fff9ef','#858270',.6));
const key=new THREE.DirectionalLight('#fff3dc',2.3);key.position.set(2,3,4);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-2;key.shadow.camera.right=2;key.shadow.camera.top=3;key.shadow.camera.bottom=-2;key.shadow.bias=-.0001;scene.add(key,key.target);
const fill=new THREE.RectAreaLight('#e3ecf7',5,.7,.86);fill.position.set(-2,1,2);fill.lookAt(0,0,0);scene.add(fill);
const woodCanvas=document.createElement('canvas');woodCanvas.width=woodCanvas.height=64;const ctx=woodCanvas.getContext('2d')!;ctx.fillStyle='#b39777';ctx.fillRect(0,0,64,64);for(let i=0;i<64;i+=3){ctx.fillStyle=i%2?'#8f7256':'#bd9f7c';ctx.fillRect(i,0,1,64);}const wood=new THREE.CanvasTexture(woodCanvas);wood.colorSpace=THREE.SRGBColorSpace;wood.wrapS=wood.wrapT=THREE.RepeatWrapping;
const contactCanvas=document.createElement('canvas');contactCanvas.width=contactCanvas.height=64;const c=contactCanvas.getContext('2d')!,fade=c.createRadialGradient(32,32,0,32,32,32);fade.addColorStop(0,'rgba(255,255,255,.6)');fade.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=fade;c.fillRect(0,0,64,64);const contact=new THREE.CanvasTexture(contactCanvas);
const decor=createStudioDecorations({wood,contact});scene.add(decor.group);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(5,5),new THREE.MeshStandardMaterial({color:'#e9dfca',roughness:1}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
const wall=new THREE.Mesh(new THREE.PlaneGeometry(4,4),new THREE.MeshStandardMaterial({color:'#e9dfca',roughness:1}));wall.receiveShadow=true;scene.add(wall);
let selected:'bonsai'|'ikebana'|'scroll'='bonsai',angle=.30;
const box=new THREE.Box3(),center=new THREE.Vector3();
let renderCount=0;const loadHistory:{phase:string;glyphReady:boolean;assets:number;version:number}[]=[];
function render(){renderer.render(scene,camera);renderCount++;const status={...decor.status,metrics:decor.metrics,selected,drawCalls:renderer.info.render.calls,renderCount,anchors:{bonsai:decor.bonsai.position.toArray(),ikebana:decor.ikebana.position.toArray(),scroll:decor.scroll.position.toArray()}};document.body.dataset.status=JSON.stringify(status);document.body.dataset.ready=String(decor.status.phase==='ready');if(loadHistory.at(-1)?.version!==decor.status.version){loadHistory.push({phase:decor.status.phase,glyphReady:decor.status.glyphReady,assets:decor.status.loaded.length,version:decor.status.version});document.body.dataset.loadHistory=JSON.stringify(loadHistory);}}
function frame(){const asset=decor[selected];for(const name of ['bonsai','ikebana','scroll'] as const)decor[name].visible=name===selected;asset.updateWorldMatrix(true,true);box.setFromObject(asset);box.getCenter(center);const size=box.getSize(new THREE.Vector3()),height=Math.max(size.y,size.x/camera.aspect)*1.25,reach=height/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)));camera.position.set(center.x+Math.sin(angle)*reach,center.y+reach*(selected==='bonsai'?.20:.07),center.z+Math.cos(angle)*reach);camera.lookAt(center);camera.updateProjectionMatrix();floor.position.set(center.x,box.min.y-.001,center.z);floor.visible=selected!=='scroll';wall.position.set(center.x,center.y,box.min.z-.001);wall.visible=selected==='scroll';key.position.set(center.x+1.3,center.y+2,center.z+3);key.target.position.copy(center);fill.position.set(center.x-1,center.y+.3,center.z+1.6);fill.lookAt(center);render();}
document.querySelectorAll<HTMLButtonElement>('[data-object]').forEach(button=>button.addEventListener('click',()=>{selected=button.dataset.object as typeof selected;angle=selected==='scroll'?0:.30;frame();}));
document.getElementById('turn')!.addEventListener('click',()=>{angle+=.65;frame();});
document.getElementById('lifecycle')!.addEventListener('click',async()=>{
  const ephemeral=createStudioDecorations({wood,contact});let notifications=0;
  const pending=ephemeral.loadDecorations(()=>{notifications++;});const before=notifications;ephemeral.dispose();await pending;
  const cachedCount=decor.status.loaded.length;await decor.loadDecorations(render);
  document.body.dataset.lifecycle=JSON.stringify({disposed:ephemeral.status.phase,notificationsBefore:before,notificationsAfter:notifications,disposedCleanly:notifications===before,cachedAssets:decor.status.loaded.length,noDuplicateAssets:cachedCount===decor.status.loaded.length});
});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;renderer.setSize(innerWidth,innerHeight);frame();});
frame();void decor.loadDecorations(()=>{frame();});
