import * as THREE from 'three';

// procedural surfaces for the studio. Each is painted once into a small
// canvas with a fixed seed, so the room looks the same on every visit.
function randomSource(seed:number){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function canvas(width:number,height:number,paint:(context:CanvasRenderingContext2D,random:()=>number)=>void,seed:number,repeat=false) {
  const element=document.createElement('canvas');element.width=width;element.height=height;
  paint(element.getContext('2d')!,randomSource(seed));
  const texture=new THREE.CanvasTexture(element);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
  if(repeat)texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  return texture;
}

export function createInteriorTextures() {
  const tatami=canvas(512,512,(context,random)=>{
    context.fillStyle='#c9bb83';context.fillRect(0,0,512,512);
    // Woven rush: fine rows with warm and green variation.
    for(let y=0;y<512;y+=4) {
      const tone=random();context.fillStyle=`rgba(${tone<.5?'120,110,58':'228,214,150'},${.12+random()*.18})`;context.fillRect(0,y,512,2);
      context.fillStyle='rgba(70,62,30,.18)';context.fillRect(0,y+3,512,1);
    }
    for(let x=0;x<512;x+=64){context.fillStyle='rgba(70,62,30,.12)';context.fillRect(x,0,1,512);}
    for(let i=0;i<220;i++){context.fillStyle=`rgba(255,248,210,${random()*.12})`;context.fillRect(random()*512,random()*512,8+random()*30,1.5);}
  },3311,true);
  const tatamiEdge=canvas(256,32,(context)=>{
    context.fillStyle='#2f3a2e';context.fillRect(0,0,256,32);
    context.fillStyle='rgba(214,190,120,.55)';
    for(let x=4;x<256;x+=16){context.beginPath();context.moveTo(x,16);context.lineTo(x+6,8);context.lineTo(x+12,16);context.lineTo(x+6,24);context.closePath();context.fill();}
  },11,true);
  const plaster=canvas(512,512,(context,random)=>{
    context.fillStyle='#d9c7a3';context.fillRect(0,0,512,512);
    // Tsuchikabe: clay grain, a few straw fibres and soft mottling.
    for(let i=0;i<9000;i++){const v=random();context.fillStyle=`rgba(${v<.5?'120,92,58':'250,238,212'},${.05+random()*.08})`;context.fillRect(random()*512,random()*512,1+random()*2,1+random()*2);}
    for(let i=0;i<160;i++){context.strokeStyle=`rgba(150,112,58,${.15+random()*.2})`;context.lineWidth=.8;const x=random()*512,y=random()*512,a=random()*Math.PI;context.beginPath();context.moveTo(x,y);context.lineTo(x+Math.cos(a)*(6+random()*14),y+Math.sin(a)*(6+random()*14));context.stroke();}
    for(let i=0;i<30;i++){const x=random()*512,y=random()*512,r=40+random()*90;const g=context.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(${random()<.5?'160,128,86':'246,232,204'},.10)`);g.addColorStop(1,'rgba(0,0,0,0)');context.fillStyle=g;context.fillRect(x-r,y-r,r*2,r*2);}
  },4027,true);
  const ceiling=canvas(512,512,(context,random)=>{
    for(let i=0;i<8;i++){const x=i*64;const tone=150+Math.round(random()*24);context.fillStyle=`rgb(${tone},${tone-36},${tone-74})`;context.fillRect(x,0,64,512);
      for(let k=0;k<26;k++){context.strokeStyle=`rgba(80,52,30,${.1+random()*.15})`;context.lineWidth=1+random()*1.4;const off=x+random()*64;context.beginPath();context.moveTo(off,0);context.bezierCurveTo(off+random()*8-4,170,off+random()*8-4,340,off+random()*6-3,512);context.stroke();}
      context.fillStyle='rgba(40,26,14,.5)';context.fillRect(x,0,2,512);}
  },5101,true);
  const fabric=canvas(256,256,(context,random)=>{
    context.fillStyle='#7a3328';context.fillRect(0,0,256,256);
    for(let y=0;y<256;y+=2){context.fillStyle=`rgba(255,220,200,${.03+random()*.04})`;context.fillRect(0,y,256,1);}
    for(let x=0;x<256;x+=2){context.fillStyle=`rgba(30,8,4,${.04+random()*.05})`;context.fillRect(x,0,1,256);}
  },77,true);
  const screen=canvas(1024,512,(context,random)=>{
    const gold=context.createLinearGradient(0,0,1024,512);gold.addColorStop(0,'#cfae63');gold.addColorStop(.5,'#e6cd88');gold.addColorStop(1,'#bf9c55');
    context.fillStyle=gold;context.fillRect(0,0,1024,512);
    // Gold leaf squares, then a sakura branch in ink and pink.
    context.strokeStyle='rgba(120,90,40,.18)';context.lineWidth=1;
    for(let x=0;x<1024;x+=64)for(let y=0;y<512;y+=64)context.strokeRect(x+random()*2,y+random()*2,64,64);
    context.strokeStyle='#3a2a20';context.lineCap='round';
    const branch=(x:number,y:number,angle:number,length:number,width:number,depth:number)=>{
      const ex=x+Math.cos(angle)*length,ey=y+Math.sin(angle)*length;
      context.lineWidth=width;context.beginPath();context.moveTo(x,y);context.quadraticCurveTo((x+ex)/2+random()*30-15,(y+ey)/2+random()*30-15,ex,ey);context.stroke();
      if(depth<=0){for(let i=0;i<5;i++){context.fillStyle=`rgba(${232+random()*20},${170+random()*30},${180+random()*20},.92)`;context.beginPath();context.arc(ex+random()*26-13,ey+random()*26-13,5+random()*6,0,Math.PI*2);context.fill();}return;}
      for(let i=0;i<2;i++)branch(ex,ey,angle+(random()-.5)*1.3,length*.68,width*.62,depth-1);
    };
    branch(-20,470,-.55,330,22,4);branch(1060,80,2.7,260,14,3);
  },6113);
  const shoji=canvas(512,512,(context,random)=>{
    context.fillStyle='#fbf1dc';context.fillRect(0,0,512,512);
    for(let i=0;i<500;i++){context.fillStyle=`rgba(200,170,120,${random()*.06})`;context.fillRect(random()*512,random()*512,4+random()*10,1);}
    // The shadow of a branch outside, softened as if seen through the paper.
    context.filter='blur(5px)';context.strokeStyle='rgba(120,98,70,.35)';context.lineCap='round';
    const branch=(x:number,y:number,angle:number,length:number,width:number,depth:number)=>{
      const ex=x+Math.cos(angle)*length,ey=y+Math.sin(angle)*length;
      context.lineWidth=width;context.beginPath();context.moveTo(x,y);context.lineTo(ex,ey);context.stroke();
      if(depth<=0){context.fillStyle='rgba(120,98,70,.22)';for(let i=0;i<4;i++){context.beginPath();context.arc(ex+random()*30-15,ey+random()*30-15,7+random()*8,0,Math.PI*2);context.fill();}return;}
      for(let i=0;i<2;i++)branch(ex,ey,angle+(random()-.5)*1.1,length*.7,width*.65,depth-1);
    };
    branch(540,60,2.6,200,14,4);context.filter='none';
  },7019);
  const books=canvas(256,128,(context,random)=>{
    const colors=['#2f3f5a','#6f2f28','#c9b48a','#3d4a3a','#8a6a3c'];
    for(let x=0;x<256;){const w=10+random()*18;context.fillStyle=colors[Math.floor(random()*colors.length)];context.fillRect(x,0,w,128);
      context.fillStyle='rgba(255,240,210,.5)';context.fillRect(x+2,20,w-4,2);context.fillRect(x+2,100,w-4,2);
      context.fillStyle='rgba(0,0,0,.25)';context.fillRect(x+w-1,0,1,128);x+=w;}
  },8231,true);
  const paulownia=canvas(256,256,(context,random)=>{
    context.fillStyle='#d8c19a';context.fillRect(0,0,256,256);
    for(let i=0;i<60;i++){context.strokeStyle=`rgba(150,118,74,${.12+random()*.15})`;context.lineWidth=1;const y=random()*256;context.beginPath();context.moveTo(0,y);context.bezierCurveTo(80,y+random()*8-4,170,y+random()*8-4,256,y+random()*8-4);context.stroke();}
  },9137,true);
  const noren=canvas(512,256,(context)=>{
    context.fillStyle='#253a5a';context.fillRect(0,0,512,256);
    context.fillStyle='rgba(255,255,255,.04)';for(let y=0;y<256;y+=3)context.fillRect(0,y,512,1);
    context.fillStyle='#f4ead6';context.font='400 150px "Noto Serif JP","Yu Mincho",serif';context.textAlign='center';context.textBaseline='middle';context.fillText('守',256,140);
    // The slit between the two panels.
    context.clearRect(252,40,8,216);
  },1);
  noren.premultiplyAlpha=false;
  const smoke=canvas(64,256,(context,random)=>{
    for(let i=0;i<40;i++){const y=256-i*6,x=32+Math.sin(i*.45)*10+random()*4;const g=context.createRadialGradient(x,y,0,x,y,6+i*.25);g.addColorStop(0,`rgba(255,255,255,${.22*(1-i/40)})`);g.addColorStop(1,'rgba(255,255,255,0)');context.fillStyle=g;context.fillRect(x-14,y-14,28,28);}
  },2);
  const fade=canvas(16,128,(context)=>{
    const g=context.createLinearGradient(0,0,0,128);g.addColorStop(0,'rgba(20,12,6,.55)');g.addColorStop(1,'rgba(20,12,6,0)');context.fillStyle=g;context.fillRect(0,0,16,128);
  },3);
  const all=[tatami,tatamiEdge,plaster,ceiling,fabric,screen,shoji,books,paulownia,noren,smoke,fade];
  return {tatami,tatamiEdge,plaster,ceiling,fabric,screen,shoji,books,paulownia,noren,smoke,fade,dispose(){all.forEach(texture=>texture.dispose());}};
}
export type InteriorTextures=ReturnType<typeof createInteriorTextures>;
