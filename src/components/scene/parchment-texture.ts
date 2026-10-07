import { DEFAULT_STYLE, MAKIMONO_STYLES, paintIllustration, paintMountPattern } from './makimono-art';
// Paints the project scrolls: shared washi paper, an ink illustration taken
// from the page's own SVG, the project flow and an area hanko.
export type ParchmentContent={order:number;total:number;area:string;areaMark:string;title:string;flow:string[];cta:string;slug?:string};
export type ParchmentLayout={compact:boolean;mount?:boolean};

const SERIF='"Noto Serif JP","Yu Mincho","Hiragino Mincho ProN",serif';
const SANS='"Manrope",sans-serif';
const MONO='"IBM Plex Mono",monospace';
export const PARCHMENT_WIDTH=1024;

function randomSource(seed:number){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function surface(width:number,height:number) {
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  return {canvas,context:canvas.getContext('2d')!};
}

const papers=new Map<string,HTMLCanvasElement>();
/** Paper is identical for every project of the same size, so it is painted once. */
function paper(width:number,height:number,framed=true) {
  const key=`${width}x${height}x${framed}`;const cached=papers.get(key);if(cached)return cached;
  const {canvas,context}=surface(width,height);const s=width/PARCHMENT_WIDTH;const random=randomSource(7351);
  const base=context.createLinearGradient(0,0,width,height);base.addColorStop(0,'#fff8e9');base.addColorStop(.5,'#f4e8d1');base.addColorStop(1,'#ebdcc0');
  context.fillStyle=base;context.fillRect(0,0,width,height);
  // Soft horizontal shading reads as a sheet bowing between its rollers.
  const bow=context.createLinearGradient(0,0,width,0);
  bow.addColorStop(0,'rgba(96,68,42,.10)');bow.addColorStop(.18,'rgba(96,68,42,0)');bow.addColorStop(.55,'rgba(255,252,242,.10)');bow.addColorStop(.86,'rgba(96,68,42,0)');bow.addColorStop(1,'rgba(96,68,42,.12)');
  context.fillStyle=bow;context.fillRect(0,0,width,height);
  for(let i=0;i<1100;i++) {
    const x=random()*width,y=random()*height,length=(6+random()*34)*s,angle=(random()-.5)*Math.PI*.9;
    context.strokeStyle=`rgba(${random()<.5?'124,94,62':'255,253,246'},${.035+random()*.07})`;context.lineWidth=(.5+random()*1.1)*s;
    context.beginPath();context.moveTo(x,y);context.quadraticCurveTo(x+Math.cos(angle)*length*.5+(random()-.5)*6*s,y+Math.sin(angle)*length*.5+(random()-.5)*6*s,x+Math.cos(angle)*length,y+Math.sin(angle)*length);context.stroke();
  }
  for(let i=0;i<520;i++){context.fillStyle=`rgba(118,86,54,${.04+random()*.08})`;context.beginPath();context.arc(random()*width,random()*height,(.6+random()*1.6)*s,0,Math.PI*2);context.fill();}
  const age=context.createRadialGradient(width/2,height/2,Math.min(width,height)*.42,width/2,height/2,Math.hypot(width,height)*.56);
  age.addColorStop(0,'rgba(150,108,64,0)');age.addColorStop(1,'rgba(150,108,64,.2)');context.fillStyle=age;context.fillRect(0,0,width,height);
  // The paper darkens where it curls into each roller.
  for(const [from,to] of [[0,58*s],[height,height-58*s]] as const){const curl=context.createLinearGradient(0,from,0,to);curl.addColorStop(0,'rgba(78,52,32,.30)');curl.addColorStop(1,'rgba(78,52,32,0)');context.fillStyle=curl;context.fillRect(0,Math.min(from,to),width,58*s);}
  if(framed){context.strokeStyle='rgba(102,78,51,.26)';context.lineWidth=2*s;context.strokeRect(54*s,74*s,width-108*s,height-148*s);}
  papers.set(key,canvas);return canvas;
}

export function wrapCanvasText(context:CanvasRenderingContext2D,text:string,maxWidth:number) {
  const lines:string[]=[];
  for(const paragraph of text.split(/\n/)) {
    let line='';
    for(const word of paragraph.split(/\s+/)) {
      const candidate=line?`${line} ${word}`:word;
      if(context.measureText(candidate).width<=maxWidth) {line=candidate;continue;}
      if(line)lines.push(line);
      line='';
      for(const character of word) {
        if(line&&context.measureText(line+character).width>maxWidth) {lines.push(line);line=character;}
        else line+=character;
      }
    }
    if(line)lines.push(line);
  }
  return lines;
}
function ellipsize(context:CanvasRenderingContext2D,text:string,maxWidth:number) {
  if(context.measureText(text).width<=maxWidth)return text;
  let value=text;while(value&&context.measureText(`${value}…`).width>maxWidth)value=value.slice(0,-1);
  return `${value.trimEnd()}…`;
}
/** Shrinks until the longest word fits, so a title never breaks inside a word above the minimum size. */
function fitTitle(context:CanvasRenderingContext2D,title:string,maxWidth:number,max:number,min:number,maxLines:number) {
  const words=title.split(/\s+/);
  for(let size=max;size>=min;size-=2) {
    context.font=`400 ${size}px ${SERIF}`;
    if(Math.max(...words.map(word=>context.measureText(word).width))>maxWidth)continue;
    const lines=wrapCanvasText(context,title,maxWidth);
    if(lines.length<=maxLines)return {size,lines};
  }
  context.font=`400 ${min}px ${SERIF}`;
  const lines=wrapCanvasText(context,title,maxWidth);
  if(lines.length>maxLines)lines.splice(maxLines-1,lines.length,ellipsize(context,lines.slice(maxLines-1).join(''),maxWidth));
  return {size:min,lines};
}
function spaced(context:CanvasRenderingContext2D,value:string) {
  const target=context as CanvasRenderingContext2D&{letterSpacing?:string};
  if('letterSpacing' in target)target.letterSpacing=value;
}
function drawArrowUpRight(context:CanvasRenderingContext2D,x:number,baseline:number,size:number,scale:number) {
  context.save();context.lineWidth=1.7*scale;context.lineCap='round';context.lineJoin='round';context.beginPath();
  context.moveTo(x,baseline);context.lineTo(x+size,baseline-size);
  context.moveTo(x+size*.48,baseline-size);context.lineTo(x+size,baseline-size);context.lineTo(x+size,baseline-size*.48);
  context.stroke();context.restore();
}

function hanko(mark:string,size:number,seed:number) {
  const {canvas,context}=surface(Math.ceil(size*1.3),Math.ceil(size*1.3));const random=randomSource(seed);
  context.translate(canvas.width/2,canvas.height/2);context.rotate(-.07);
  const half=size/2,radius=size*.1;
  context.fillStyle='#b8432a';context.beginPath();context.roundRect(-half,-half,size,size,radius);context.fill();
  context.strokeStyle='#f6ead6';context.lineWidth=size*.035;context.beginPath();context.roundRect(-half*.8,-half*.8,size*.8,size*.8,radius*.6);context.stroke();
  context.fillStyle='#f6ead6';context.font=`400 ${size*.52}px ${SERIF}`;context.textAlign='center';context.textBaseline='middle';context.fillText(mark,0,size*.03);
  // Uneven ink: erase specks so the seal reads as stamped rather than drawn.
  context.globalCompositeOperation='destination-out';
  for(let i=0;i<140;i++){context.fillStyle=`rgba(0,0,0,${.18+random()*.5})`;context.beginPath();context.arc((random()-.5)*size,(random()-.5)*size,(.4+random()*1.8)*size/100,0,Math.PI*2);context.fill();}
  for(let i=0;i<6;i++){context.fillStyle='rgba(0,0,0,.22)';context.fillRect(-half+random()*size,-half,size*.012,size);}
  return canvas;
}

/** kakejiku mounting — silk surround, gold ichimonji bands and the two hanging fūtai strips. */
function paintMounted(canvas:HTMLCanvasElement,content:ParchmentContent,art:CanvasImageSource|null,layout:ParchmentLayout) {
  const context=canvas.getContext('2d');if(!context)return;
  const width=canvas.width,height=canvas.height,s=width/PARCHMENT_WIDTH,random=randomSource(4211);
  const inner={x:Math.round(width*.075),y:Math.round(height*.15),w:Math.round(width*.85),h:Math.round(height*.74)};
  const silk=context.createLinearGradient(0,0,width,0);
  silk.addColorStop(0,'#7c8a74');silk.addColorStop(.5,'#94a28b');silk.addColorStop(1,'#7a8872');
  context.fillStyle=silk;context.fillRect(0,0,width,height);
  // Woven texture: fine diagonal threads and a few slubs.
  context.lineWidth=1*s;
  for(let i=-height;i<width;i+=7*s){context.strokeStyle=`rgba(255,250,232,${.035+random()*.03})`;context.beginPath();context.moveTo(i,0);context.lineTo(i+height*.6,height);context.stroke();}
  for(let i=0;i<width+height;i+=11*s){context.strokeStyle=`rgba(38,44,34,${.03+random()*.03})`;context.beginPath();context.moveTo(i,0);context.lineTo(i-height*.6,height);context.stroke();}
  for(let i=0;i<160;i++){context.fillStyle=`rgba(232,226,200,${.05+random()*.08})`;context.fillRect(random()*width,random()*height,(4+random()*16)*s,1.2*s);}
  // Gold ichimonji bands frame the paper above and below.
  const band=Math.round(height*.022);
  for(const y of [inner.y-band,inner.y+inner.h]) {
    const gold=context.createLinearGradient(0,y,0,y+band);gold.addColorStop(0,'#b99c5f');gold.addColorStop(.5,'#d8c28a');gold.addColorStop(1,'#a88b52');
    context.fillStyle=gold;context.fillRect(inner.x,y,inner.w,band);
    context.strokeStyle='rgba(120,92,44,.35)';context.lineWidth=1.5*s;
    for(let x=inner.x+10*s;x<inner.x+inner.w;x+=26*s){context.beginPath();context.arc(x,y+band/2,band*.22,0,Math.PI*2);context.stroke();}
  }
  const sheet=document.createElement('canvas');sheet.width=inner.w;sheet.height=inner.h;
  paintParchment(sheet,content,art,{compact:layout.compact});
  context.save();context.shadowColor='rgba(30,26,18,.35)';context.shadowBlur=6*s;context.drawImage(sheet,inner.x,inner.y);context.restore();
  context.strokeStyle='rgba(40,34,24,.45)';context.lineWidth=1.5*s;context.strokeRect(inner.x,inner.y,inner.w,inner.h);
  // Fūtai: two narrow strips hanging from the top roller over the upper silk.
  for(const centre of [.34,.66]) {
    const x=width*centre-width*.024,w=width*.048,h=inner.y-band-14*s;
    const strip=context.createLinearGradient(x,0,x+w,0);strip.addColorStop(0,'#6b7964');strip.addColorStop(.5,'#83917a');strip.addColorStop(1,'#66745f');
    context.fillStyle=strip;context.fillRect(x,0,w,h);
    context.strokeStyle='rgba(236,224,190,.7)';context.lineWidth=2*s;
    for(const edge of [x+5*s,x+w-5*s]){context.beginPath();context.moveTo(edge,0);context.lineTo(edge,h);context.stroke();}
    context.fillStyle='rgba(30,26,18,.25)';context.fillRect(x,h,w,3*s);
  }
  // Darkened curl where the mounting rolls into each roller.
  for(const [from,to] of [[0,40*s],[height,height-40*s]] as const){const curl=context.createLinearGradient(0,from,0,to);curl.addColorStop(0,'rgba(30,26,18,.35)');curl.addColorStop(1,'rgba(30,26,18,0)');context.fillStyle=curl;context.fillRect(0,Math.min(from,to),width,40*s);}
}

export function paintParchment(canvas:HTMLCanvasElement,content:ParchmentContent,art:CanvasImageSource|null,layout:ParchmentLayout) {
  if(layout.mount){paintMounted(canvas,content,art,layout);return;}
  const context=canvas.getContext('2d');if(!context)return;
  const width=canvas.width,height=canvas.height,s=width/PARCHMENT_WIDTH,margin=104*s,inner=width-margin*2;
  context.clearRect(0,0,width,height);context.drawImage(paper(width,height),0,0);
  context.save();context.textBaseline='alphabetic';
  // Header: area mark, area name and position.
  const headerY=160*s;
  context.textAlign='right';context.fillStyle='#8a6c50';context.font=`400 ${25*s}px ${MONO}`;spaced(context,`${1.5*s}px`);
  const order=`${String(content.order).padStart(2,'0')} / ${content.total}`;context.fillText(order,width-margin,headerY);
  const orderWidth=context.measureText(order).width;
  context.textAlign='left';context.fillStyle='#b8432a';context.font=`400 ${40*s}px ${SERIF}`;spaced(context,'0px');context.fillText(content.areaMark,margin,headerY+4*s);
  context.fillStyle='#8a5a3c';context.font=`400 ${22*s}px ${MONO}`;spaced(context,`${2.4*s}px`);
  context.fillText(ellipsize(context,content.area.toLocaleUpperCase(),inner-orderWidth-84*s),margin+58*s,headerY);spaced(context,'0px');
  context.strokeStyle='rgba(37,49,54,.14)';context.lineWidth=2*s;context.beginPath();context.moveTo(margin,headerY+30*s);context.lineTo(width-margin,headerY+30*s);context.stroke();
  // Title.
  const title=fitTitle(context,content.title,inner,(layout.compact?96:84)*s,46*s,2);
  context.font=`400 ${title.size}px ${SERIF}`;context.fillStyle='#253136';spaced(context,`${-.02*title.size}px`);
  let y=headerY+30*s+title.size*1.12+18*s;
  title.lines.forEach((line,i)=>{if(i)y+=title.size*1.12;context.fillText(line,margin,y);});spaced(context,'0px');
  y+=title.size*.42;
  context.strokeStyle='rgba(217,92,52,.75)';context.lineWidth=5*s;context.lineCap='round';context.beginPath();context.moveTo(margin,y);context.lineTo(margin+72*s,y);context.stroke();context.lineCap='butt';
  // Foot: call to action and seal.
  const seal=118*s,footY=height-118*s;
  const stamp=hanko(content.areaMark,seal,content.order*977);
  context.drawImage(stamp,width-margin-seal*1.12,footY-seal*.98,stamp.width,stamp.height);
  context.strokeStyle='rgba(37,49,54,.14)';context.lineWidth=2*s;context.beginPath();context.moveTo(margin,footY-34*s);context.lineTo(width-margin-seal*1.35,footY-34*s);context.stroke();
  context.fillStyle='#a74a2f';context.font=`400 ${25*s}px ${MONO}`;spaced(context,`${1.2*s}px`);
  const cta=ellipsize(context,content.cta,inner-seal*1.45-26*s),ctaBaseline=footY+4*s;
  context.fillText(cta,margin,ctaBaseline);context.strokeStyle='#a74a2f';
  drawArrowUpRight(context,margin+context.measureText(cta).width+9*s,ctaBaseline-2*s,17*s,s);spaced(context,'0px');
  // Flow steps, from the bottom up so the illustration takes the remaining room.
  const steps=layout.compact?[]:content.flow.slice(0,5);
  const flowBottom=footY-seal*.98-26*s;let rowHeight=66*s;
  const artTop=y+34*s;
  if(flowBottom-steps.length*rowHeight-artTop<230*s)rowHeight=54*s;
  const flowTop=flowBottom-steps.length*rowHeight;
  if(steps.length) {
    const radius=20*s,cx=margin+radius;
    context.strokeStyle='rgba(37,49,54,.22)';context.lineWidth=2*s;context.beginPath();context.moveTo(cx,flowTop+rowHeight/2);context.lineTo(cx,flowTop+rowHeight*(steps.length-.5));context.stroke();
    steps.forEach((step,i)=>{
      const cy=flowTop+rowHeight*(i+.5);
      context.fillStyle=i===steps.length-1?'#d95c34':'#f6ecda';context.strokeStyle=i===steps.length-1?'#d95c34':'rgba(37,49,54,.55)';
      context.beginPath();context.arc(cx,cy,radius,0,Math.PI*2);context.fill();context.stroke();
      context.fillStyle=i===steps.length-1?'#fff8e9':'#3b4744';context.font=`500 ${20*s}px ${MONO}`;context.textAlign='center';context.textBaseline='middle';context.fillText(String(i+1),cx,cy+1*s);
      context.textAlign='left';context.fillStyle='#3b4744';context.font=`500 ${35*s}px ${SANS}`;
      context.fillText(ellipsize(context,step,inner-radius*2-22*s),cx+radius+22*s,cy+1*s);
    });
    context.textBaseline='alphabetic';
  }
  // Illustration fills whatever height is left between title and flow.
  const artBottom=(steps.length?flowTop:flowBottom)-30*s;const artHeight=artBottom-artTop;
  if(artHeight>90*s) {
    const cx=width/2,cy=artTop+artHeight/2;
    const wash=context.createRadialGradient(cx,cy,0,cx,cy,Math.max(inner,artHeight)*.52);
    wash.addColorStop(0,'rgba(232,184,177,.34)');wash.addColorStop(.62,'rgba(232,184,177,.12)');wash.addColorStop(1,'rgba(232,184,177,0)');
    context.fillStyle=wash;context.fillRect(margin-20*s,artTop,inner+40*s,artHeight);
    if(art) {
      const source=art as HTMLImageElement;const aspect=(source.naturalWidth||source.width)/(source.naturalHeight||source.height)||1.65;
      let w=inner,h=w/aspect;if(h>artHeight){h=artHeight;w=h*aspect;}
      context.globalAlpha=.94;context.drawImage(art,cx-w/2,cy-h/2,w,h);context.globalAlpha=1;
    }
  }
  context.restore();
}

const shadeHex=(hex:string,amount:number)=>{const n=parseInt(hex.slice(1),16);const f=(v:number)=>Math.max(0,Math.min(255,Math.round(v+amount*255)));return `rgb(${f(n>>16&255)},${f(n>>8&255)},${f(n&255)})`;};

/** festival colours per area mark, shared by the strips and the makimono ties. */
export const AREA_COLORS:Record<string,string>={'具':'#c8553a','営':'#3f5f7a','商':'#c9a23f','創':'#7d9270'};
export const areaColor=(mark:string)=>AREA_COLORS[mark]??'#c8553a';
export const STRIP_TEXTURE={width:160,height:1152};

/** a tanzaku in its area's cloth, with the area mark and the project name written downwards. */
export function paintStrip(canvas:HTMLCanvasElement,content:ParchmentContent) {
  const context=canvas.getContext('2d');if(!context)return;
  const width=canvas.width,height=canvas.height,s=width/160,random=randomSource(content.order*313);
  context.clearRect(0,0,width,height);
  const color=areaColor(content.areaMark);
  const cloth=context.createLinearGradient(0,0,width,0);
  cloth.addColorStop(0,'rgba(0,0,0,.18)');cloth.addColorStop(.12,'rgba(0,0,0,0)');cloth.addColorStop(.85,'rgba(255,255,255,.06)');cloth.addColorStop(1,'rgba(0,0,0,.2)');
  context.fillStyle=color;context.fillRect(0,0,width,height);context.fillStyle=cloth;context.fillRect(0,0,width,height);
  // Weave and a few slubs.
  for(let y=0;y<height;y+=3*s){context.fillStyle=`rgba(255,250,236,${.03+random()*.04})`;context.fillRect(0,y,width,1*s);}
  for(let x=0;x<width;x+=3*s){context.fillStyle=`rgba(20,14,10,${.03+random()*.04})`;context.fillRect(x,0,1*s,height);}
  for(let i=0;i<40;i++){context.fillStyle=`rgba(255,250,236,${.06+random()*.08})`;context.fillRect(random()*width,random()*height,(3+random()*10)*s,1.4*s);}
  // Folded hem with the cord hole.
  context.fillStyle='rgba(0,0,0,.22)';context.fillRect(0,0,width,58*s);
  context.fillStyle='rgba(255,250,236,.18)';context.fillRect(0,58*s,width,2*s);
  context.fillStyle='rgba(20,14,10,.6)';context.beginPath();context.arc(width/2,26*s,7*s,0,Math.PI*2);context.fill();
  const ink='#fbf3e3';
  context.fillStyle=ink;context.font=`400 ${62*s}px ${SERIF}`;context.textAlign='center';context.textBaseline='middle';
  context.fillText(content.areaMark,width/2,128*s);
  context.fillStyle='rgba(251,243,227,.55)';context.fillRect(width/2-16*s,176*s,32*s,2*s);
  // The name runs down the strip, like a written wish.
  context.save();context.translate(width/2,212*s);context.rotate(Math.PI/2);
  let size=58*s;context.font=`400 ${size}px ${SERIF}`;
  const room=height-212*s-170*s;
  while(context.measureText(content.title).width>room&&size>30*s){size-=2*s;context.font=`400 ${size}px ${SERIF}`;}
  context.textAlign='left';context.fillStyle=ink;context.fillText(ellipsize(context,content.title,room),0,0);
  context.restore();
  context.fillStyle='rgba(251,243,227,.8)';context.font=`400 ${24*s}px ${MONO}`;context.textAlign='center';
  context.fillText(String(content.order).padStart(2,'0'),width/2,height-118*s);
  // Swallowtail cut at the free end.
  context.globalCompositeOperation='destination-out';
  context.beginPath();context.moveTo(0,height);context.lineTo(width/2,height-62*s);context.lineTo(width,height);context.closePath();context.fill();
  context.globalCompositeOperation='source-over';
}

export const MAKIMONO_TEXTURE={width:2048,height:640};
/** The project's makimono painting on its own canvas, at the size it has on the scroll (for previews outside the scene). */
const illustrations=new Map<string,HTMLCanvasElement|null>();
export function makimonoIllustration(slug:string) {
  if(!illustrations.has(slug)){
    const {width,height}=MAKIMONO_TEXTURE,s=height/640,w=Math.round(width*.925),h=Math.round(height*.8);
    illustrations.set(slug,paintIllustration(slug,Math.round(w*.34),Math.round(h-48*s*1.2),MAKIMONO_STYLES[slug]??DEFAULT_STYLE));
  }
  return illustrations.get(slug)??null;
}
/** a horizontal handscroll read left to right — title, illustration, then flow and seal. */
export function paintMakimono(canvas:HTMLCanvasElement,content:ParchmentContent&{subtitle?:string},art:CanvasImageSource|null) {
  const context=canvas.getContext('2d');if(!context)return;
  const width=canvas.width,height=canvas.height,s=height/640,random=randomSource(content.order*97);
  const style=MAKIMONO_STYLES[content.slug??'']??DEFAULT_STYLE;
  // Silk mounting in the project's colour, woven and patterned, sometimes flecked with gold.
  const silk=context.createLinearGradient(0,0,0,height);silk.addColorStop(0,style.mount);silk.addColorStop(.5,shadeHex(style.mount,.06));silk.addColorStop(1,shadeHex(style.mount,-.05));
  context.fillStyle=silk;context.fillRect(0,0,width,height);
  for(let i=-height;i<width;i+=7*s){context.strokeStyle=`rgba(255,250,232,${.03+random()*.03})`;context.lineWidth=1*s;context.beginPath();context.moveTo(i,0);context.lineTo(i+height*.6,height);context.stroke();}
  paintMountPattern(context,style,width,height,s);
  // Cover at the end that rolls first, worn darker along its edge.
  context.fillStyle=style.cover;context.fillRect(0,0,width*.035,height);
  const wear=context.createLinearGradient(0,0,width*.035,0);wear.addColorStop(0,'rgba(0,0,0,.35)');wear.addColorStop(1,'rgba(0,0,0,0)');context.fillStyle=wear;context.fillRect(0,0,width*.035,height);
  const inner={x:Math.round(width*.05),y:Math.round(height*.1),w:Math.round(width*.925),h:Math.round(height*.8)};
  const band=Math.round(height*.03);
  for(const y of [inner.y-band,inner.y+inner.h]){const gold=context.createLinearGradient(0,y,0,y+band);gold.addColorStop(0,'#b99c5f');gold.addColorStop(.5,'#d8c28a');gold.addColorStop(1,'#a88b52');context.fillStyle=gold;context.fillRect(inner.x,y,inner.w,band);}
  context.drawImage(paper(inner.w,inner.h,false),inner.x,inner.y);
  // The paper's own tone, the soft creases left by rolling, and a few age spots.
  context.save();context.globalCompositeOperation='multiply';context.fillStyle=style.paper;context.fillRect(inner.x,inner.y,inner.w,inner.h);context.restore();
  for(let i=1;i<9;i++){const x=inner.x+inner.w*i/9+(random()-.5)*20*s;const crease=context.createLinearGradient(x-14*s,0,x+14*s,0);crease.addColorStop(0,'rgba(90,64,40,0)');crease.addColorStop(.5,`rgba(90,64,40,${.05+random()*.05})`);crease.addColorStop(.52,'rgba(255,252,240,.08)');crease.addColorStop(1,'rgba(90,64,40,0)');context.fillStyle=crease;context.fillRect(x-14*s,inner.y,28*s,inner.h);}
  for(let i=0;i<7;i++){const edge=random()<.5,x=edge?inner.x+random()*inner.w*.12:inner.x+inner.w*(.88+random()*.12),y=inner.y+random()*inner.h,r=(14+random()*40)*s;const spot=context.createRadialGradient(x,y,0,x,y,r);spot.addColorStop(0,`rgba(150,104,52,${.06+random()*.07})`);spot.addColorStop(.7,'rgba(150,104,52,.03)');spot.addColorStop(1,'rgba(150,104,52,0)');context.fillStyle=spot;context.fillRect(x-r,y-r,r*2,r*2);}
  context.strokeStyle='rgba(40,34,24,.4)';context.lineWidth=1.5*s;context.strokeRect(inner.x,inner.y,inner.w,inner.h);
  const pad=48*s,top=inner.y+pad;
  // Section one: area, position, title.
  const one={x:inner.x+pad,w:inner.w*.32-pad*1.5};
  context.textBaseline='alphabetic';context.textAlign='left';
  context.fillStyle='#b8432a';context.font=`400 ${44*s}px ${SERIF}`;context.fillText(content.areaMark,one.x,top+40*s);
  context.fillStyle='#8a5a3c';context.font=`400 ${20*s}px ${MONO}`;spaced(context,`${2.2*s}px`);
  context.fillText(ellipsize(context,content.area.toLocaleUpperCase(),one.w-64*s),one.x+62*s,top+34*s);spaced(context,'0px');
  context.fillStyle='#8a6c50';context.font=`400 ${24*s}px ${MONO}`;context.fillText(`${String(content.order).padStart(2,'0')} / ${content.total}`,one.x,top+92*s);
  const title=fitTitle(context,content.title,one.w,104*s,52*s,2);
  context.fillStyle='#253136';context.font=`400 ${title.size}px ${SERIF}`;
  let y=top+110*s+title.size;title.lines.forEach((line,i)=>{if(i)y+=title.size*1.1;context.fillText(line,one.x,y);});
  y+=title.size*.45;context.strokeStyle=style.accent;context.lineWidth=5*s;context.lineCap='round';context.beginPath();context.moveTo(one.x,y);context.lineTo(one.x+80*s,y);context.stroke();context.lineCap='butt';
  if(content.subtitle){context.fillStyle='#53605d';context.font=`500 ${30*s}px ${SANS}`;wrapCanvasText(context,content.subtitle,one.w).slice(0,2).forEach((line,i)=>context.fillText(line,one.x,y+52*s+i*40*s));}
  // Section two: the project's own ink painting, soaked into the paper.
  const two={x:inner.x+inner.w*.33,w:inner.w*.34,y:inner.y+pad*.6,h:inner.h-pad*1.2};
  const cx=two.x+two.w/2,cy=two.y+two.h/2;
  const painting=content.slug?paintIllustration(content.slug,Math.round(two.w),Math.round(two.h),style):null;
  if(painting){context.save();context.globalCompositeOperation='multiply';context.drawImage(painting,two.x,two.y);context.restore();}
  else {
    const wash=context.createRadialGradient(cx,cy,0,cx,cy,two.w*.55);wash.addColorStop(0,'rgba(232,184,177,.38)');wash.addColorStop(1,'rgba(232,184,177,0)');
    context.fillStyle=wash;context.fillRect(two.x,two.y,two.w,two.h);
    if(art){const source=art as HTMLImageElement;const aspect=(source.naturalWidth||source.width)/(source.naturalHeight||source.height)||1.65;let w=two.w*.92,h=w/aspect;if(h>two.h){h=two.h;w=h*aspect;}context.drawImage(art,cx-w/2,cy-h/2,w,h);}
  }
  context.strokeStyle='rgba(37,49,54,.12)';context.lineWidth=2*s;
  for(const x of [two.x-pad*.4,two.x+two.w+pad*.4]){context.beginPath();context.moveTo(x,inner.y+pad);context.lineTo(x,inner.y+inner.h-pad);context.stroke();}
  // Section three: the flow, then the seal.
  const three={x:inner.x+inner.w*.69,w:inner.w*.29};
  const steps=content.flow.slice(0,5),row=Math.min(64*s,(inner.h-pad*2-150*s)/Math.max(1,steps.length));
  const radius=20*s,lx=three.x+radius;
  context.strokeStyle='rgba(37,49,54,.22)';context.lineWidth=2*s;context.beginPath();context.moveTo(lx,top+row/2);context.lineTo(lx,top+row*(steps.length-.5));context.stroke();
  steps.forEach((step,i)=>{
    const sy=top+row*(i+.5),last=i===steps.length-1;
    context.fillStyle=last?'#d95c34':'#f6ecda';context.strokeStyle=last?'#d95c34':'rgba(37,49,54,.55)';
    context.beginPath();context.arc(lx,sy,radius,0,Math.PI*2);context.fill();context.stroke();
    context.fillStyle=last?'#fff8e9':'#3b4744';context.font=`500 ${19*s}px ${MONO}`;context.textAlign='center';context.textBaseline='middle';context.fillText(String(i+1),lx,sy+1*s);
    context.textAlign='left';context.fillStyle='#3b4744';context.font=`500 ${32*s}px ${SANS}`;context.fillText(ellipsize(context,step,three.w-radius*2-24*s),lx+radius+22*s,sy+1*s);
  });
  context.textBaseline='alphabetic';
  const seal=118*s,stamp=hanko(content.areaMark,seal,content.order*977);
  context.drawImage(stamp,inner.x+inner.w-pad-stamp.width*.95,inner.y+inner.h-pad-stamp.height*.9);
  context.fillStyle='#a74a2f';context.font=`400 ${22*s}px ${MONO}`;spaced(context,`${1.2*s}px`);
  const cta=ellipsize(context,content.cta,three.w-27*s),ctaBaseline=inner.y+inner.h-pad-20*s;
  context.fillText(cta,three.x,ctaBaseline);context.strokeStyle='#a74a2f';
  drawArrowUpRight(context,three.x+context.measureText(cta).width+9*s,ctaBaseline-2*s,17*s,s);spaced(context,'0px');
}

/** Rasterises the page's inline project SVG so the scroll and the HTML fallback share one drawing. */
export async function loadArt(svg:SVGSVGElement|null) {
  if(!svg)return null;
  const clone=svg.cloneNode(true) as SVGSVGElement;const box=svg.viewBox.baseVal;
  const scale=1400/(box?.width||620);
  clone.setAttribute('xmlns','http://www.w3.org/2000/svg');
  clone.setAttribute('width',String(Math.round((box?.width||620)*scale)));clone.setAttribute('height',String(Math.round((box?.height||390)*scale)));
  const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)],{type:'image/svg+xml'}));
  try {const image=new Image();image.src=url;await image.decode();return image;}
  catch {return null;}
  finally {URL.revokeObjectURL(url);}
}

let fonts:Promise<unknown>|undefined;
/** Canvas text uses whatever font is loaded at paint time, so the faces are requested first. */
export function parchmentFonts(sample:string) {
  fonts??=Promise.race([
    Promise.all([
      document.fonts.load(`400 80px "Noto Serif JP"`,sample),
      document.fonts.load(`500 30px "Manrope"`),
      document.fonts.load(`400 22px "IBM Plex Mono"`),
    ]).catch(()=>undefined),
    new Promise(resolve=>setTimeout(resolve,3000)),
  ]);
  return fonts;
}
