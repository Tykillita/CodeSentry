// one hand-painted illustration and one mounting style per makimono.
// Brushwork is stamped along smoothed paths with pressure, dry edges and ink
// bleed; washes are layered soft blots. Everything is seeded, so each scroll
// paints the same way on every visit.

type Pt=[number,number];
export type MountPattern='seigaiha'|'asanoha'|'kikko'|'shippo'|'sayagata'|'ichimatsu'|'kanoko'|'stars'|'yagasuri'|'pixel';
export type MakimonoStyle={
  /** Silk of the mounting, its woven pattern and whether gold leaf flecks it. */
  mount:string;pattern:MountPattern;gold:boolean;
  /** Cover band at the end that rolls first, the paper's tint and the accent of the brushwork. */
  cover:string;paper:string;accent:string;
  /** 3D roller: wood of the rod and the material of its end caps. */
  rod:string;cap:string;
};

export const MAKIMONO_STYLES:Record<string,MakimonoStyle>={
  istargetsleeping:{mount:'#2f3f5a',pattern:'stars',gold:true,cover:'#1f2a3d',paper:'#e9e6dc',accent:'#c9a23f',rod:'#3b2a20',cap:'#e8dfc8'},
  argus:{mount:'#2f5f5b',pattern:'shippo',gold:false,cover:'#1f403d',paper:'#efe9da',accent:'#2a7f86',rod:'#4a3326',cap:'#1d1d1f'},
  cowork:{mount:'#6f8a62',pattern:'asanoha',gold:false,cover:'#4f6a45',paper:'#f1ead6',accent:'#d96a3a',rod:'#7a5235',cap:'#3b281c'},
  span:{mount:'#5f7f45',pattern:'sayagata',gold:false,cover:'#3f5a2c',paper:'#f2ecd8',accent:'#d95c34',rod:'#9a7a4a',cap:'#5f7f45'},
  pams:{mount:'#3e5f86',pattern:'ichimatsu',gold:false,cover:'#2a4566',paper:'#eef0e6',accent:'#9fb02a',rod:'#5c3b27',cap:'#e8dfc8'},
  'legal-docs':{mount:'#6b2a2a',pattern:'kikko',gold:true,cover:'#4a1a1a',paper:'#f3ead3',accent:'#b8432a',rod:'#2a1d16',cap:'#b99c5f'},
  'tecnico-terminal':{mount:'#9a7a3a',pattern:'yagasuri',gold:false,cover:'#6f5526',paper:'#f2e9d2',accent:'#c8553a',rod:'#5c3b27',cap:'#2b2a29'},
  cotizacion:{mount:'#5d3a5a',pattern:'shippo',gold:true,cover:'#3f263e',paper:'#f3ebd8',accent:'#b8432a',rod:'#3b2a20',cap:'#b99c5f'},
  centrovet:{mount:'#a8653a',pattern:'kanoko',gold:false,cover:'#7a4524',paper:'#f4ecd9',accent:'#c8553a',rod:'#8a5a36',cap:'#3b281c'},
  elcontainer:{mount:'#2f5b82',pattern:'seigaiha',gold:false,cover:'#1f3f5e',paper:'#eef0ea',accent:'#2f6fa0',rod:'#4a3326',cap:'#e8dfc8'},
  'apple-stock':{mount:'#2f4a3a',pattern:'sayagata',gold:true,cover:'#1f3328',paper:'#f1ecdb',accent:'#b8432a',rod:'#2a1d16',cap:'#b99c5f'},
  'cocina-anita':{mount:'#a3352a',pattern:'kanoko',gold:false,cover:'#7a2219',paper:'#f5ecd6',accent:'#c8553a',rod:'#2a1d16',cap:'#a3352a'},
  'menu-semanal':{mount:'#b59a63',pattern:'ichimatsu',gold:false,cover:'#8a7342',paper:'#f5eedb',accent:'#b8432a',rod:'#8a5a36',cap:'#3b281c'},
  vigilia:{mount:'#1f2a3d',pattern:'stars',gold:true,cover:'#121a28',paper:'#ebe7dc',accent:'#d99a3a',rod:'#2a1d16',cap:'#b8432a'},
  vidmaker:{mount:'#2b2b2e',pattern:'sayagata',gold:true,cover:'#18181a',paper:'#efebe0',accent:'#c8553a',rod:'#1d1d1f',cap:'#b99c5f'},
  'rex-en-fuga':{mount:'#c29a5a',pattern:'pixel',gold:false,cover:'#8f6c36',paper:'#f4ecd6',accent:'#c8553a',rod:'#8a5a36',cap:'#2b2a29'},
};
export const DEFAULT_STYLE:MakimonoStyle={mount:'#8f9c86',pattern:'asanoha',gold:false,cover:'#6b7a63',paper:'#f3ead6',accent:'#c8553a',rod:'#7d9270',cap:'#3b281c'};

function randomSource(seed:number){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
const rgba=(hex:string,alpha:number)=>{const n=parseInt(hex.slice(1),16);return `rgba(${n>>16&255},${n>>8&255},${n&255},${alpha})`;};
const shade=(hex:string,amount:number)=>{const n=parseInt(hex.slice(1),16);const f=(v:number)=>Math.max(0,Math.min(255,Math.round(v+amount*255)));return `rgb(${f(n>>16&255)},${f(n>>8&255)},${f(n&255)})`;};

/** Ink tools bound to one canvas and seed. */
function inkKit(context:CanvasRenderingContext2D,seed:number) {
  const random=randomSource(seed);
  const smooth=(points:Pt[])=>{
    if(points.length<2)return points;
    const out:Pt[]=[];
    for(let i=0;i<points.length-1;i++) {
      const p0=points[i-1]??points[i],p1=points[i],p2=points[i+1],p3=points[i+2]??p2;
      const steps=Math.max(2,Math.ceil(Math.hypot(p2[0]-p1[0],p2[1]-p1[1])/1.1));
      for(let s=0;s<steps;s++) {
        const t=s/steps,t2=t*t,t3=t2*t;
        out.push([.5*(2*p1[0]+(-p0[0]+p2[0])*t+(2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*t2+(-p0[0]+3*p1[0]-3*p2[0]+p3[0])*t3),
          .5*(2*p1[1]+(-p0[1]+p2[1])*t+(2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*t2+(-p0[1]+3*p1[1]-3*p2[1]+p3[1])*t3)]);
      }
    }
    out.push(points[points.length-1]);return out;
  };
  /** A brush stroke: pressure rises and falls along the path, the tail dries out. */
  const stroke=(points:Pt[],width:number,color:string,{taper=1,alpha=.9,dry=.18}:{taper?:number;alpha?:number;dry?:number}={})=>{
    const samples=smooth(points),n=samples.length;
    context.save();context.fillStyle=color;
    for(let i=0;i<n;i++) {
      const t=n>1?i/(n-1):0,press=1-taper+taper*Math.pow(Math.sin(Math.PI*(.06+.88*t)),.55);
      if(random()<dry*t*t*.9)continue;
      const r=Math.max(.45,width/2*(.3+.7*press)*(.86+random()*.28));
      context.globalAlpha=alpha*(.35+random()*.3);
      context.beginPath();context.arc(samples[i][0]+(random()-.5)*.7,samples[i][1]+(random()-.5)*.7,r,0,Math.PI*2);context.fill();
    }
    context.restore();
  };
  /** Soft layered blots of watercolour. */
  const wash=(cx:number,cy:number,rx:number,ry:number,color:string,alpha=.3,blots=9)=>{
    for(let i=0;i<blots;i++) {
      const x=cx+(random()-.5)*rx*.7,y=cy+(random()-.5)*ry*.7,r=Math.max(rx,ry)*(.35+random()*.45);
      context.save();context.translate(x,y);context.scale(1,ry/rx);
      const g=context.createRadialGradient(0,0,0,0,0,r);g.addColorStop(0,rgba(color,alpha*.5));g.addColorStop(.7,rgba(color,alpha*.22));g.addColorStop(1,rgba(color,0));
      context.fillStyle=g;context.fillRect(-r,-r,r*2,r*2);context.restore();
    }
  };
  const fill=(points:Pt[],color:string,alpha=.85)=>{
    context.save();context.globalAlpha=alpha;context.fillStyle=color;context.beginPath();
    smooth(points).forEach(([x,y],i)=>i?context.lineTo(x+(random()-.5)*.8,y+(random()-.5)*.8):context.moveTo(x,y));
    context.closePath();context.fill();context.restore();
  };
  const arc=(cx:number,cy:number,rx:number,ry:number,from=0,to=Math.PI*2,steps=40):Pt[]=>Array.from({length:steps+1},(_,i)=>{const a=from+(to-from)*i/steps;return [cx+Math.cos(a)*rx,cy+Math.sin(a)*ry];});
  const box=(x:number,y:number,w:number,h:number,width:number,color:string,alpha=.85)=>{
    const o=width*.8;
    stroke([[x-o,y],[x+w+o,y+(random()-.5)]],width,color,{alpha});stroke([[x+w,y-o],[x+w+(random()-.5),y+h+o]],width,color,{alpha});
    stroke([[x+w+o,y+h],[x-o,y+h+(random()-.5)]],width,color,{alpha});stroke([[x,y+h+o],[x+(random()-.5),y-o]],width,color,{alpha});
  };
  const dot=(x:number,y:number,r:number,color:string,alpha=.9)=>{context.save();context.globalAlpha=alpha;context.fillStyle=color;context.beginPath();context.arc(x,y,r,0,Math.PI*2);context.fill();context.restore();};
  const pixel=(x:number,y:number,size:number,color:string)=>{context.save();context.fillStyle=color;context.globalAlpha=.82+random()*.15;context.fillRect(x+random()*.6,y+random()*.6,size-.8,size-.8);context.restore();};
  return {random,stroke,wash,fill,arc,box,dot,pixel,context};
}

const INK='#1f1a17',GREY='#6f6a62',PAPER_LIGHT='#f7f1e3';
type Kit=ReturnType<typeof inkKit>;
type Painter=(kit:Kit,w:number,h:number,style:MakimonoStyle)=>void;

const mountains=(k:Kit,w:number,h:number,baseline:number,color:string,alpha=.32)=>{
  const ridge:Pt[]=[[-10,baseline]];let x=-10;
  while(x<w+20){x+=30+k.random()*50;ridge.push([x,baseline-(.08+k.random()*.22)*h]);}
  k.fill([...ridge,[w+20,h+10],[-10,h+10]],color,alpha);
  k.stroke(ridge,2.2,INK,{alpha:.35,dry:.4});
};

const PAINTERS:Record<string,Painter>={
  // Models resting: a red-crowned crane asleep on one leg, head tucked in, under a full moon.
  istargetsleeping(k,w,h,s){
    // Night sky and bands of mist.
    k.wash(w*.5,h*.22,w*.62,h*.26,'#3f5a7a',.3,14);
    for(const [y,a] of [[.5,.18],[.66,.14]] as const)k.wash(w*.5,h*y,w*.7,h*.05,'#5a7590',a,10);
    // Full moon with a soft halo.
    k.wash(w*.76,h*.26,h*.22,h*.22,'#f2e6c0',.5,8);
    k.fill(k.arc(w*.76,h*.26,h*.13,h*.13),'#e9d9a6',.9);k.wash(w*.76,h*.26,h*.13,h*.13,s.accent,.35,5);
    // Still water, ripples and the crane's reflection.
    k.wash(w*.5,h*.9,w*.6,h*.08,'#4a6b86',.22,8);
    for(let i=0;i<7;i++){const y=h*(.84+(i%3)*.035),x=w*(.12+i*.12);k.stroke([[x,y],[x+w*(.05+(i%2)*.03),y]],1.4,'#2f4a62',{alpha:.45,taper:.8});}
    k.wash(w*.44,h*.9,w*.07,h*.04,'#2b2b2e',.18,5);
    // Reeds at the water's edge.
    for(let i=0;i<6;i++){const x=w*(.06+i*.025),lean=(i-2.5)*.012;k.stroke([[x,h*.92],[x+w*lean,h*.62],[x+w*lean*2,h*(.42+(i%3)*.05)]],2,'#3b3f34',{alpha:.75});if(i%2===0)k.stroke([[x+w*lean*2,h*(.42+(i%3)*.05)],[x+w*lean*2,h*(.38+(i%3)*.05)]],4.5,'#5a4a32',{alpha:.85,taper:.4});}
    // The crane: white body left unpainted, soft grey shading underneath.
    const [cx,cy]=[w*.44,h*.47];
    const body:Pt[]=[[cx-w*.13,cy+h*.02],[cx-w*.09,cy-h*.08],[cx,cy-h*.1],[cx+w*.09,cy-h*.06],[cx+w*.13,cy+h*.02],[cx+w*.06,cy+h*.1],[cx-w*.05,cy+h*.1]];
    k.fill(body,PAPER_LIGHT,1);k.wash(cx,cy+h*.06,w*.11,h*.04,'#8a8f98',.45,6);
    k.stroke([...body,body[0]],2.4,INK,{alpha:.75,taper:.25,dry:.25});
    // Black tertial plumes falling over the tail.
    for(let i=0;i<5;i++)k.stroke([[cx+w*(.04+i*.012),cy-h*.04],[cx+w*(.12+i*.01),cy+h*.02],[cx+w*(.15+i*.012),cy+h*(.1+i*.012)]],7-i*.6,INK,{alpha:.95,taper:.85});
    // Black neck curled back, head resting on the back, red crown, beak tucked.
    k.stroke([[cx-w*.1,cy-h*.06],[cx-w*.11,cy-h*.14],[cx-w*.06,cy-h*.17],[cx-w*.01,cy-h*.13]],9,INK,{alpha:.95,taper:.35});
    k.fill(k.arc(cx+w*.005,cy-h*.125,w*.022,h*.03),PAPER_LIGHT,1);k.stroke(k.arc(cx+w*.005,cy-h*.125,w*.022,h*.03),1.8,INK,{alpha:.8,taper:.2});
    k.fill(k.arc(cx+w*.005,cy-h*.145,w*.012,h*.012),'#c8302a',.95);
    k.stroke([[cx+w*.024,cy-h*.12],[cx+w*.07,cy-h*.105]],3,'#5a5148',{alpha:.85,taper:.6});
    // One leg down into the water, the other folded under the body.
    k.stroke([[cx-w*.005,cy+h*.09],[cx-w*.01,cy+h*.27],[cx-w*.012,cy+h*.4]],2.4,'#2b2b2e',{alpha:.9,taper:.2});
    k.stroke([[cx-w*.012,cy+h*.2],[cx-w*.003,cy+h*.21]],3.6,'#2b2b2e',{taper:0});
    k.stroke([[cx+w*.02,cy+h*.09],[cx+w*.05,cy+h*.15],[cx+w*.02,cy+h*.18]],2.2,'#2b2b2e',{alpha:.85});
  },
  // A guardian's many eyes: a peacock eye watching a ring of connected devices.
  argus(k,w,h,s){
    const cx=w*.5,cy=h*.5;
    for(let i=0;i<46;i++){const a=i/46*Math.PI*2;k.stroke([[cx+Math.cos(a)*h*.15,cy+Math.sin(a)*h*.15],[cx+Math.cos(a)*h*.29,cy+Math.sin(a)*h*.27]],1,'#2f5f5b',{alpha:.5,dry:.4});}
    k.wash(cx,cy,h*.24,h*.21,s.accent,.55,10);
    k.fill(k.arc(cx,cy,h*.15,h*.13),'#c9a23f',.55);k.fill(k.arc(cx,cy,h*.1,h*.09),'#2a5f8a',.8);k.fill(k.arc(cx+3,cy,h*.045,h*.045),INK,.95);
    k.stroke(k.arc(cx,cy,h*.15,h*.13),2,INK,{taper:.2,alpha:.7});
    const nodes:Pt[]=Array.from({length:7},(_,i)=>{const a=i/7*Math.PI*2-.4;return [cx+Math.cos(a)*w*.38,cy+Math.sin(a)*h*.36];});
    nodes.forEach((p,i)=>{
      const q=nodes[(i+1)%nodes.length];
      for(let t=0;t<1;t+=.08)k.stroke([[p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t],[p[0]+(q[0]-p[0])*(t+.04),p[1]+(q[1]-p[1])*(t+.04)]],1.4,GREY,{alpha:.7,taper:0});
      k.stroke([[p[0],p[1]],[cx+(p[0]-cx)*.42,cy+(p[1]-cy)*.42]],1,GREY,{alpha:.35,taper:0});
      k.box(p[0]-13,p[1]-10,26,18,2,INK);k.stroke([[p[0]-5,p[1]+12],[p[0]+5,p[1]+12]],1.6,INK);
      if(i===2)k.dot(p[0]+13,p[1]-11,5,'#c8553a');
    });
  },
  // Working together: three koi circling the same lily pad, a bridge to the shore.
  cowork(k,w,h,s){
    k.wash(w*.5,h*.52,w*.46,h*.38,'#6f9a96',.38,14);
    for(const r of [.2,.28,.36])k.stroke(k.arc(w*.5,h*.52,w*r,h*r*.62,0,Math.PI*2,60),1,'#4f7a76',{alpha:.25,taper:0,dry:.5});
    k.fill(k.arc(w*.5,h*.52,w*.08,h*.08,.3,Math.PI*1.9),'#5f8a52',.75);k.dot(w*.52,h*.5,5,'#e9b8c6',.9);
    for(const [x,y,r] of [[.2,.3,.05],[.8,.72,.06],[.75,.28,.04]] as const)k.fill(k.arc(w*x,h*y,w*r,h*r*1.2,.4,Math.PI*1.85),'#6f9a5a',.55);
    const colors=[s.accent,'#f4f0e6','#2b2b2e'];
    for(let i=0;i<3;i++) {
      const a=i/3*Math.PI*2+.5,x=w*.5+Math.cos(a)*w*.2,y=h*.52+Math.sin(a)*h*.17,dir=a+Math.PI/2;
      const body:Pt[]=[[x-Math.cos(dir)*50,y-Math.sin(dir)*50],[x-Math.cos(dir+.25)*10,y-Math.sin(dir+.25)*10],[x+Math.cos(dir)*48,y+Math.sin(dir)*48]];
      k.stroke(body,28,colors[i],{alpha:.9,taper:.9,dry:0});k.stroke(body,28,INK,{alpha:.16,taper:.9,dry:.3});
      if(i===1)for(let spot=0;spot<3;spot++)k.dot(x+Math.cos(dir)*(spot*16-14),y+Math.sin(dir)*(spot*16-14),5,s.accent,.85);
      const tail=body[0];for(const fin of [.55,-.55])k.stroke([tail,[tail[0]-Math.cos(dir+fin)*26,tail[1]-Math.sin(dir+fin)*26]],8,colors[i===1?2:i],{alpha:.75});
      k.dot(body[2][0]-Math.cos(dir)*8,body[2][1]-Math.sin(dir)*8,2.6,INK);
    }
    k.stroke(k.arc(w*.86,h*.95,w*.16,h*.22,Math.PI*1.05,Math.PI*1.95,30),7,'#b8432a',{taper:.2});
    for(let i=0;i<6;i++){const x=w*(.72+i*.028);k.stroke([[x,h*.75+Math.abs(i-2.5)*-8+18],[x,h*.95]],2,'#7a1f17',{alpha:.6,taper:0});}
  },
  // Daily progress: bamboo growing node by node, and a streak of days.
  span(k,w,h,s){
    k.wash(w*.78,h*.22,h*.12,h*.12,s.accent,.4,6);
    for(const [x,top,width] of [[.28,.12,13],[.42,.26,11],[.55,.4,9]] as const) {
      let y=h*.86;const nodes=Math.round((h*.86-h*top)/58);
      for(let i=0;i<nodes;i++){const next=y-(h*.86-h*top)/nodes;k.stroke([[w*x,y-3],[w*x+1,next+3]],width,'#4f6f3a',{alpha:.85,taper:.25,dry:.1});k.stroke([[w*x-width*.7,next],[w*x+width*.7,next]],2.4,INK,{alpha:.8,taper:0});y=next;}
      for(let j=0;j<4;j++){const ly=h*top+j*14,dir=j%2?1:-1;k.stroke([[w*x,ly],[w*x+dir*40,ly-8+j*6],[w*x+dir*70,ly+6]],6,'#3f5f2c',{alpha:.8});}
    }
    for(let i=0;i<7;i++){const x=w*(.2+i*.1),y=h*.94;k.stroke(k.arc(x,y,10,10),2,INK,{alpha:.75,taper:.2});if(i<5)k.dot(x,y,7,s.accent,.85);}
  },
  // The academy: a padel court from above, two players and the ball's arc.
  pams(k,w,h,s){
    const court:Pt[]=[[w*.2,h*.2],[w*.8,h*.2],[w*.92,h*.88],[w*.08,h*.88]];
    k.fill(court,'#3e6f9a',.24);k.wash(w*.5,h*.55,w*.3,h*.26,'#2f5f86',.18,8);
    court.forEach((p,i)=>k.stroke([p,court[(i+1)%4]],3,PAPER_LIGHT,{alpha:.9,taper:0}));
    court.forEach((p,i)=>k.stroke([p,court[(i+1)%4]],1.2,INK,{alpha:.5,taper:0}));
    k.stroke([[w*.14,h*.54],[w*.86,h*.54]],4,INK,{taper:0});
    for(const y of [.33,.75])k.stroke([[w*(.2-.03*(y-.2)/.68*4),h*y],[w*(.8+.03*(y-.2)/.68*4),h*y]],2,PAPER_LIGHT,{alpha:.8,taper:0});
    k.stroke([[w*.5,h*.33],[w*.5,h*.75]],2,PAPER_LIGHT,{alpha:.8,taper:0});
    for(const [x,y,dir] of [[.36,.38,1],[.64,.74,-1]] as const) {
      k.dot(w*x,h*y-42,11,INK);k.stroke([[w*x,h*y-30],[w*x,h*y+8]],10,INK);
      k.stroke([[w*x-16,h*y+34],[w*x,h*y+8],[w*x+14,h*y+36]],5,INK);
      k.stroke([[w*x,h*y-18],[w*x+dir*28,h*y-26]],5,INK);
      k.stroke(k.arc(w*x+dir*42,h*y-34,14,17),4.5,INK,{taper:.2});k.stroke([[w*x+dir*32,h*y-22],[w*x+dir*28,h*y-26]],4,INK);
    }
    for(let t=0;t<1;t+=.07){const x=w*(.42+t*.18),y=h*(.32+t*.36)-Math.sin(Math.PI*t)*h*.18;k.dot(x,y,1.8,GREY,.7);}
    k.dot(w*.6,h*.68-h*.02,7,s.accent,.95);
  },
  // The case file: bound documents, a seal impression and the key of permissions.
  'legal-docs'(k,w,h,s){
    for(let i=0;i<4;i++) {
      const x=w*(.22+i*.03),y=h*(.22+i*.04),pw=w*.4,ph=h*.56;
      k.context.save();k.context.translate(x+pw/2,y+ph/2);k.context.rotate((i-1.5)*.04);
      k.fill([[-pw/2,-ph/2],[pw/2-24,-ph/2],[pw/2,-ph/2+24],[pw/2,ph/2],[-pw/2,ph/2]],PAPER_LIGHT,.9);
      k.box(-pw/2,-ph/2,pw,ph,1.6,INK,.55);
      if(i===3){for(let l=0;l<6;l++)k.stroke([[-pw/2+20,-ph/2+40+l*22],[pw/2-30-(l%3)*30,-ph/2+40+l*22]],2,GREY,{alpha:.7});}
      k.context.restore();
    }
    k.stroke([[w*.18,h*.54],[w*.7,h*.6]],6,s.accent,{alpha:.8,taper:0});k.stroke([[w*.44,h*.5],[w*.38,h*.66],[w*.5,h*.64]],5,s.accent,{alpha:.75});
    k.fill([[w*.68,h*.6],[w*.82,h*.58],[w*.84,h*.8],[w*.7,h*.82]],'#b8432a',.82);
    k.context.save();k.context.fillStyle=PAPER_LIGHT;k.context.font=`600 ${h*.11}px "Noto Serif JP","Yu Mincho",serif`;k.context.textAlign='center';k.context.textBaseline='middle';k.context.fillText('印',w*.76,h*.7);k.context.restore();
    k.stroke(k.arc(w*.86,h*.3,16,16),4,'#4a4642');k.stroke([[w*.86+16,h*.3],[w*.97,h*.3]],4,'#4a4642',{taper:0});
    for(const x of [.92,.95])k.stroke([[w*x,h*.3],[w*x,h*.35]],3,'#4a4642',{taper:0});
  },
  // Field operations: a winding road through the hills, visits checked along the way.
  'tecnico-terminal'(k,w,h,s){
    mountains(k,w,h,h*.45,'#8a9a86',.3);mountains(k,w,h,h*.6,'#6f8070',.28);
    const road:Pt[]=[[w*.05,h*.95],[w*.3,h*.82],[w*.2,h*.66],[w*.5,h*.58],[w*.72,h*.68],[w*.86,h*.5],[w*.95,h*.42]];
    k.stroke(road,22,'#d9c7a3',{alpha:.85,taper:.6,dry:0});k.stroke(road,1.5,INK,{alpha:.4,taper:0});
    for(let i=0;i<road.length-1;i++){const [a,b]=[road[i],road[i+1]];for(let t=0;t<1;t+=.2)k.stroke([[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t],[a[0]+(b[0]-a[0])*(t+.09),a[1]+(b[1]-a[1])*(t+.09)]],2.4,s.accent,{taper:0});}
    for(const [p,done] of [[road[2],true],[road[4],true],[road[6],false]] as const) {
      const [x,y]=p;k.fill([[x,y],[x-12,y-20],[x-11,y-34],[x,y-40],[x+11,y-34],[x+12,y-20]],done?s.accent:PAPER_LIGHT,.9);
      k.stroke([[x,y],[x-12,y-20],[x-11,y-34],[x,y-40],[x+11,y-34],[x+12,y-20],[x,y]],2,INK,{taper:0});
      if(done)k.stroke([[x-5,y-28],[x-1,y-23],[x+6,y-33]],2.2,PAPER_LIGHT,{taper:0});
    }
    const [tx,ty]=[w*.36,h*.86];
    k.fill([[tx-22,ty-34],[tx+22,ty-34],[tx,ty-46]],'#c9a24a',.85);k.stroke([[tx-24,ty-34],[tx+24,ty-34]],2,INK);
    k.stroke([[tx,ty-32],[tx,ty-8]],7,INK);k.stroke([[tx-6,ty+8],[tx,ty-8],[tx+7,ty+8]],3,INK);
    k.box(tx+8,ty-22,16,12,2,INK);
  },
  // From concepts to the document: a soroban counting, the total underlined in red.
  cotizacion(k,w,h,s){
    const [x,y,fw,fh]=[w*.08,h*.2,w*.42,h*.6];
    k.box(x,y,fw,fh,6,'#3b2a20');k.stroke([[x,y+fh*.32],[x+fw,y+fh*.32]],4,'#3b2a20',{taper:0});
    for(let c=0;c<7;c++) {
      const rx=x+fw*(c+.75)/7.5;k.stroke([[rx,y+4],[rx,y+fh-4]],1.4,GREY,{taper:0});
      const up=k.random()<.5;k.fill(k.arc(rx,up?y+fh*.25:y+fh*.12,13,8),INK,.9);
      const count=Math.floor(k.random()*5);
      for(let b=0;b<4;b++)k.fill(k.arc(rx,b<count?y+fh*(.42+b*.1):y+fh*(.62+b*.1),13,8),b<count?s.accent:INK,.88);
    }
    k.context.save();k.context.translate(w*.72,h*.5);k.context.rotate(.05);
    k.fill([[-w*.17,-h*.36],[w*.17,-h*.36],[w*.17,h*.38],[-w*.17,h*.38]],PAPER_LIGHT,.92);k.box(-w*.17,-h*.36,w*.34,h*.74,1.6,INK,.55);
    for(let l=0;l<6;l++){k.stroke([[-w*.13,-h*.26+l*30],[w*.02,-h*.26+l*30]],2,GREY,{alpha:.7});k.stroke([[w*.07,-h*.26+l*30],[w*.13,-h*.26+l*30]],2,INK,{alpha:.75});}
    k.stroke([[-w*.13,h*.2],[w*.13,h*.2]],2.4,INK);k.stroke([[w*.02,h*.27],[w*.13,h*.27]],4,s.accent,{taper:.3});
    k.context.restore();
  },
  // Care for every pet: a shiba and a tabby sitting together, content, under a little heart.
  centrovet(k,w,h,s){
    k.wash(w*.5,h*.5,w*.42,h*.38,'#f0c9a0',.32,12);
    k.wash(w*.5,h*.86,w*.34,h*.05,'#5a4632',.28,8);
    for(let i=0;i<9;i++){const x=w*(.16+i*.085),y=h*.87;k.stroke([[x,y],[x+(i%2?4:-4),y-14-(i%3)*5]],1.6,'#5f7a45',{alpha:.65});}
    // Shiba: tan coat, cream chest and muzzle, pointed ears, tail curled over the back.
    const dog:Pt[]=[[w*.24,h*.84],[w*.23,h*.66],[w*.27,h*.53],[w*.33,h*.48],[w*.42,h*.52],[w*.44,h*.66],[w*.44,h*.84]];
    k.fill(dog,'#c98a4a',.85);k.fill([[w*.36,h*.52],[w*.42,h*.53],[w*.43,h*.7],[w*.37,h*.74],[w*.34,h*.62]],'#f3e4c8',.95);
    k.stroke([...dog,dog[0]],2.6,INK,{alpha:.8,taper:.2});
    for(const x of [.385,.425]){k.stroke([[w*x,h*.66],[w*x,h*.83]],2.2,INK,{alpha:.75,taper:0});k.fill(k.arc(w*x,h*.84,w*.018,h*.018,Math.PI,Math.PI*2),'#f3e4c8',.95);}
    k.stroke(k.arc(w*.215,h*.56,w*.045,h*.055,-Math.PI*.2,Math.PI*1.45,30),11,'#c98a4a',{alpha:.95,taper:.3});
    k.stroke(k.arc(w*.215,h*.56,w*.045,h*.055,-Math.PI*.2,Math.PI*1.45,30),2.2,INK,{alpha:.65,taper:.3});
    k.stroke(k.arc(w*.215,h*.56,w*.022,h*.026,0,Math.PI*1.6,20),5,'#f3e4c8',{alpha:.95,taper:.3});
    const [dx,dy]=[w*.355,h*.36];
    for(const side of [-1,1]){k.fill([[dx+side*w*.025,dy-h*.05],[dx+side*w*.055,dy-h*.15],[dx+side*w*.07,dy-h*.03]],'#c98a4a',.95);k.stroke([[dx+side*w*.025,dy-h*.05],[dx+side*w*.055,dy-h*.15],[dx+side*w*.07,dy-h*.03]],2,INK,{alpha:.75,taper:0});k.fill([[dx+side*w*.038,dy-h*.06],[dx+side*w*.053,dy-h*.12],[dx+side*w*.06,dy-h*.05]],'#f0c0a8',.8);}
    k.fill(k.arc(dx,dy,w*.075,h*.09),'#c98a4a',.95);k.fill(k.arc(dx,dy+h*.045,w*.045,h*.045),'#f3e4c8',.98);
    k.stroke(k.arc(dx,dy,w*.075,h*.09),2.4,INK,{alpha:.8,taper:.2});
    for(const side of [-1,1])k.stroke(k.arc(dx+side*w*.03,dy-h*.005,w*.013,h*.01,Math.PI*1.1,Math.PI*1.9,10),2.4,INK,{taper:.3});
    k.fill(k.arc(dx,dy+h*.028,w*.011,h*.009),INK,.95);k.stroke([[dx,dy+h*.037],[dx-w*.012,dy+h*.055]],1.6,INK,{taper:0});k.stroke([[dx,dy+h*.037],[dx+w*.012,dy+h*.055]],1.6,INK,{taper:0});
    k.dot(dx-w*.045,dy+h*.035,5,'#e8a090',.55);k.dot(dx+w*.045,dy+h*.035,5,'#e8a090',.55);
    // Tabby: grey coat with stripes, white belly and paws, tail around the paws.
    const cat:Pt[]=[[w*.58,h*.84],[w*.575,h*.68],[w*.6,h*.56],[w*.66,h*.53],[w*.72,h*.58],[w*.735,h*.7],[w*.73,h*.84]];
    k.fill(cat,'#9a948c',.85);k.fill(k.arc(w*.655,h*.7,w*.035,h*.11),'#f7f1e3',.95);
    k.stroke([...cat,cat[0]],2.6,INK,{alpha:.8,taper:.2});
    for(let i=0;i<4;i++)k.stroke([[w*(.705+i*.006),h*(.6+i*.05)],[w*(.73),h*(.62+i*.05)]],3,'#4a4642',{alpha:.7,taper:.8});
    k.stroke([[w*.73,h*.82],[w*.79,h*.84],[w*.77,h*.9],[w*.66,h*.9]],9,'#9a948c',{alpha:.95,taper:.5});
    k.stroke([[w*.73,h*.82],[w*.79,h*.84],[w*.77,h*.9],[w*.66,h*.9]],2,INK,{alpha:.6,taper:.5});
    for(const x of [.635,.675])k.fill(k.arc(w*x,h*.845,w*.016,h*.016,Math.PI,Math.PI*2),'#f7f1e3',.98);
    const [kx,ky]=[w*.655,h*.4];
    for(const side of [-1,1]){const ear:Pt[]=[[kx+side*w*.025,ky-h*.06],[kx+side*w*.05,ky-h*.15],[kx+side*w*.065,ky-h*.035]];k.fill(ear,'#9a948c',.95);k.stroke([...ear,ear[0]],2,INK,{alpha:.75,taper:0});k.fill([[kx+side*w*.036,ky-h*.065],[kx+side*w*.049,ky-h*.12],[kx+side*w*.056,ky-h*.055]],'#f0b8b0',.85);}
    k.fill(k.arc(kx,ky,w*.07,h*.085),'#9a948c',.95);k.fill(k.arc(kx,ky+h*.04,w*.035,h*.035),'#f7f1e3',.95);
    k.stroke(k.arc(kx,ky,w*.07,h*.085),2.4,INK,{alpha:.8,taper:.2});
    for(const dxs of [-.012,0,.012])k.stroke([[kx+w*dxs,ky-h*.085],[kx+w*dxs,ky-h*.055]],2,'#4a4642',{alpha:.7,taper:.6});
    for(const side of [-1,1])k.stroke(k.arc(kx+side*w*.028,ky,w*.012,h*.009,Math.PI*1.1,Math.PI*1.9,10),2.4,INK,{taper:.3});
    k.fill([[kx-w*.007,ky+h*.025],[kx+w*.007,ky+h*.025],[kx,ky+h*.035]],'#d9827a',.95);
    for(const side of [-1,1])for(const t of [-.012,.004])k.stroke([[kx+side*w*.03,ky+h*(.035+t)],[kx+side*w*.085,ky+h*(.025+t*2)]],1,INK,{alpha:.55,taper:.4});
    // A small heart between them.
    const [hx,hy]=[w*.5,h*.2];k.fill([[hx,hy+16],[hx-17,hy-1],[hx-11,hy-13],[hx,hy-6],[hx+11,hy-13],[hx+17,hy-1]],s.accent,.92);
  },
  // A great wave washing a car clean, with soap bubbles in the spray.
  elcontainer(k,w,h,s){
    k.wash(w*.82,h*.2,h*.1,h*.1,'#c8553a',.4,5);
    const wave:Pt[]=[[w*.02,h*.92],[w*.12,h*.6],[w*.3,h*.3],[w*.48,h*.22],[w*.6,h*.3],[w*.56,h*.4],[w*.48,h*.36]];
    k.fill([[w*0,h],...wave,[w*.4,h*.5],[w*.42,h]],s.accent,.75);
    k.stroke(wave,5,INK,{taper:.4});
    for(let i=0;i<8;i++){const p=wave[3+Math.floor(i/3)%3];k.stroke(k.arc(p[0]-20+i*9,p[1]-6,8,6,Math.PI,Math.PI*2,10),2.4,INK,{taper:.3});}
    for(let i=0;i<5;i++)k.stroke([[w*(.05+i*.06),h*.95],[w*(.12+i*.06),h*(.75-i*.06)],[w*(.24+i*.04),h*(.55-i*.05)]],1.5,'#1f3f5e',{alpha:.45,dry:.4});
    const [cx,cy]=[w*.66,h*.76];
    k.fill([[cx-90,cy],[cx-84,cy-24],[cx-50,cy-30],[cx-30,cy-56],[cx+30,cy-56],[cx+54,cy-30],[cx+88,cy-22],[cx+92,cy]],'#e6e1d6',.95);
    k.stroke([[cx-90,cy],[cx-84,cy-24],[cx-50,cy-30],[cx-30,cy-56],[cx+30,cy-56],[cx+54,cy-30],[cx+88,cy-22],[cx+92,cy],[cx-90,cy]],3,INK,{taper:0});
    k.fill([[cx-24,cy-50],[cx-2,cy-50],[cx-2,cy-32],[cx-40,cy-32]],'#7a98b0',.8);k.fill([[cx+4,cy-50],[cx+26,cy-50],[cx+44,cy-32],[cx+4,cy-32]],'#7a98b0',.8);
    for(const x of [-52,52]){k.dot(cx+x,cy+2,17,INK);k.dot(cx+x,cy+2,7,'#9a948a');}
    for(let i=0;i<9;i++)k.stroke(k.arc(cx-60+k.random()*150,cy-70-k.random()*60,4+k.random()*8,4+k.random()*8),1.4,'#2f5b82',{alpha:.7,taper:0});
  },
  // From market records to explorable charts: an apple branch over a ridge of prices.
  'apple-stock'(k,w,h,s){
    for(let i=0;i<6;i++)k.stroke([[w*.05,h*(.3+i*.12)],[w*.95,h*(.3+i*.12)]],.8,GREY,{alpha:.25,taper:0});
    const series:Pt[]=[];let v=.78;for(let i=0;i<=24;i++){v=Math.max(.3,Math.min(.88,v-(.012+.03*(k.random()-.42))));series.push([w*(.05+i*.0375),h*v]);}
    k.fill([...series,[w*.95,h*.95],[w*.05,h*.95]],'#5f8a6a',.22);k.stroke(series,3.2,INK,{taper:.3});
    series.forEach(([x,y],i)=>{if(i%2)return;const up=i>0&&y<series[i-2]?.[1];k.stroke([[x,y-16],[x,y+16]],1.2,INK,{alpha:.6,taper:0});k.stroke([[x,y-8],[x,y+8]],6,up?'#4f8a5a':s.accent,{alpha:.85,taper:0});});
    k.stroke([[w*.02,h*.08],[w*.2,h*.14],[w*.34,h*.12],[w*.46,h*.2]],6,'#4a3326',{taper:.7});
    k.stroke([[w*.2,h*.14],[w*.22,h*.24]],2.4,'#4a3326');k.stroke([[w*.36,h*.13],[w*.38,h*.22]],2.4,'#4a3326');
    for(const [x,y] of [[.22,.31],[.38,.29]] as const){k.wash(w*x,h*y,24,22,'#b8432a',.95,6);k.stroke(k.arc(w*x,h*y,22,20),2,INK,{alpha:.55,taper:.2});k.dot(w*x-7,h*y-7,4,'#f4d0c0',.7);}
    for(const [x,y,a] of [[.12,.06,-.4],[.28,.06,.3],[.42,.12,-.2]] as const)k.stroke([[w*x,h*y],[w*x+Math.cos(a)*36,h*y+Math.sin(a)*18-10],[w*x+Math.cos(a)*62,h*y+Math.sin(a)*14]],9,'#4f7a3a',{alpha:.85});
  },
  // A menu at a glance: a steaming bowl, noodles, egg and chopsticks.
  'cocina-anita'(k,w,h,s){
    for(const x of [.38,.5,.62])k.stroke([[w*x,h*.4],[w*x-12,h*.3],[w*x+10,h*.2],[w*x-6,h*.08]],3,GREY,{alpha:.45,dry:.5});
    k.fill([...k.arc(w*.5,h*.52,w*.3,h*.08,0,Math.PI,30),...k.arc(w*.5,h*.52,w*.3,h*.38,Math.PI,0,30).reverse()],'#2b2b2e',.9);
    k.fill([...k.arc(w*.5,h*.52,w*.3,h*.38,0,Math.PI,40)],s.accent,.85);
    k.stroke(k.arc(w*.5,h*.6,w*.24,h*.12,0,Math.PI,30),4,'#7a1f17',{alpha:.6,taper:0});
    k.fill(k.arc(w*.5,h*.52,w*.29,h*.075),'#d9a85a',.85);
    for(let i=0;i<9;i++)k.stroke([[w*(.28+i*.045),h*.5],[w*(.3+i*.045),h*.53],[w*(.27+i*.05),h*.55]],2.2,'#f2dca0',{alpha:.9,taper:.3});
    k.fill(k.arc(w*.62,h*.5,w*.05,h*.035),PAPER_LIGHT,.95);k.fill(k.arc(w*.62,h*.5,w*.025,h*.02),'#e8a33a',.95);
    for(let i=0;i<10;i++)k.dot(w*(.36+k.random()*.18),h*(.48+k.random()*.06),3,'#5f8a3a',.9);
    k.fill(k.arc(w*.42,h*.5,w*.04,h*.03),'#d98a8a',.85);
    k.stroke([[w*.62,h*.18],[w*.92,h*.6]],5,'#5c3b27',{taper:.2});k.stroke([[w*.67,h*.15],[w*.95,h*.55]],5,'#5c3b27',{taper:.2});
    k.fill(k.arc(w*.5,h*.92,w*.2,h*.03),'#3b2a20',.35);
  },
  // A week in seven bento boxes, today circled.
  'menu-semanal'(k,w,h,s){
    const days='月火水木金土日';
    for(let i=0;i<7;i++) {
      const x=w*(.06+i*.128),y=h*.4,bw=w*.11,bh=h*.42;
      k.context.save();k.context.fillStyle=INK;k.context.font=`400 ${h*.1}px "Noto Serif JP","Yu Mincho",serif`;k.context.textAlign='center';k.context.fillText(days[i],x+bw/2,h*.28);k.context.restore();
      if(i===2)k.stroke(k.arc(x+bw/2,h*.245,h*.085,h*.085),3,s.accent,{taper:.3});
      k.fill([[x,y],[x+bw,y],[x+bw,y+bh],[x,y+bh]],'#2b2b2e',.88);
      k.fill([[x+4,y+4],[x+bw-4,y+4],[x+bw-4,y+bh-4],[x+4,y+bh-4]],'#7a1f17',.55);
      k.stroke([[x+4,y+bh*.5],[x+bw-4,y+bh*.5]],2,'#2b2b2e',{taper:0});k.stroke([[x+bw*.5,y+4],[x+bw*.5,y+bh*.5]],2,'#2b2b2e',{taper:0});
      k.fill(k.arc(x+bw*.5,y+bh*.75,bw*.3,bh*.16),PAPER_LIGHT,.9);
      const foods=['#5f8a3a','#e8a33a','#c8553a','#d98a8a'];
      for(let f=0;f<3;f++)k.dot(x+bw*(.25+(f%2)*.5),y+bh*(.18+Math.floor(f/2)*.15),5+k.random()*3,foods[(i+f)%foods.length],.9);
      k.dot(x+bw*.5,y+bh*.75,4,'#1f1a17',.85);
    }
  },
  // The vigil: a watchtower's light, and two messengers flying out with the news.
  vigilia(k,w,h,s){
    k.wash(w*.5,h*.35,w*.6,h*.4,'#2a3a5a',.35,14);
    for(let i=0;i<14;i++)k.dot(k.random()*w,k.random()*h*.45,1.5,'#e8dfc8',.8);
    k.fill([[w*.3,h*.25],[w*.05,h*.12],[w*.05,h*.45]],s.accent,.25);k.fill([[w*.36,h*.25],[w*.62,h*.06],[w*.7,h*.3]],s.accent,.22);
    mountains(k,w,h,h*.85,'#3a4a5a',.4);
    k.stroke([[w*.28,h*.9],[w*.31,h*.3]],4,INK,{taper:0});k.stroke([[w*.4,h*.9],[w*.37,h*.3]],4,INK,{taper:0});
    for(let i=0;i<6;i++){const y=h*(.85-i*.1);k.stroke([[w*(.282+i*.005),y],[w*(.398-i*.005),y-h*.06]],1.6,INK,{alpha:.7,taper:0});}
    k.fill([[w*.27,h*.3],[w*.34,h*.18],[w*.41,h*.3]],'#3b2a20',.9);
    k.wash(w*.34,h*.25,w*.04,h*.04,'#f2b36b',.95,5);k.dot(w*.34,h*.25,6,'#f7d48a',.95);
    for(const [x,y] of [[.62,.42],[.74,.3]] as const){k.stroke([[w*x-16,h*y-6],[w*x,h*y],[w*x+16,h*y-8]],3,INK);k.box(w*x-3,h*y+2,6,8,1.2,s.accent);}
    k.fill([[w*.8,h*.68],[w*.84,h*.68],[w*.84,h*.64],[w*.88,h*.64],[w*.88,h*.68],[w*.92,h*.68],[w*.92,h*.72],[w*.88,h*.72],[w*.88,h*.76],[w*.84,h*.76],[w*.84,h*.72],[w*.8,h*.72]],'#c8553a',.85);
  },
  // A script becoming video: the brush's ink turns into a strip of film with scenes.
  vidmaker(k,w,h,s){
    k.stroke([[w*.04,h*.2],[w*.12,h*.32]],10,'#c9a24a',{taper:0});k.stroke([[w*.12,h*.32],[w*.16,h*.38]],12,INK,{taper:.8});
    const strip:Pt[]=[[w*.16,h*.4],[w*.3,h*.55],[w*.5,h*.48],[w*.7,h*.56],[w*.96,h*.46]];
    k.stroke(strip,74,'#2b2b2e',{taper:.15,dry:0,alpha:.95});
    const samples=strip.length;
    for(let i=0;i<4;i++) {
      const t=.2+i*.2,seg=Math.floor(t*(samples-1)),f=t*(samples-1)-seg,[ax,ay]=strip[seg],[bx,by]=strip[seg+1];
      const x=ax+(bx-ax)*f,y=ay+(by-ay)*f;
      k.fill([[x-30,y-24],[x+30,y-24],[x+30,y+24],[x-30,y+24]],PAPER_LIGHT,.92);
      if(i===0){k.dot(x+12,y-10,6,s.accent);for(let p=0;p<4;p++)k.pixel(x-24+p*8,y+10,8,'#4f6f3a');}
      if(i===1){for(let p=0;p<3;p++)k.pixel(x-4,y+8-p*8,8,'#5c3b27');for(const [dx,dy] of [[-8,-24],[0,-24],[8,-24],[-8,-16],[8,-16],[0,-32]])k.pixel(x-4+dx,y+8+dy,8,'#4f7a3a');}
      if(i===2){k.pixel(x-4,y-14,8,INK);k.pixel(x-4,y-6,8,'#c8553a');k.pixel(x-12,y+2,8,INK);k.pixel(x+4,y+2,8,INK);}
      if(i===3)k.fill([[x-8,y-12],[x-8,y+12],[x+12,y]],s.accent,.95);
    }
    for(let i=0;i<22;i++){const t=i/21,seg=Math.min(samples-2,Math.floor(t*(samples-1))),f=t*(samples-1)-seg,[ax,ay]=strip[seg],[bx,by]=strip[seg+1];const x=ax+(bx-ax)*f,y=ay+(by-ay)*f;for(const d of [-31,27])k.fill([[x-3,y+d],[x+3,y+d],[x+3,y+d+5],[x-3,y+d+5]],PAPER_LIGHT,.9);}
  },
  // An endless run: a pixel dino mid-jump over a cactus under the sun.
  'rex-en-fuga'(k,w,h,s){
    k.wash(w*.82,h*.22,h*.1,h*.1,s.accent,.6,6);
    k.stroke([[w*.02,h*.84],[w*.98,h*.84]],3,INK,{taper:0});
    for(let i=0;i<14;i++){const x=w*k.random(),y=h*(.87+k.random()*.08);k.stroke([[x,y],[x+6+k.random()*10,y]],1.6,GREY,{alpha:.6,taper:0});}
    const dino=['....XXXXXX','....XOXXXX','....XXXXXX','....XXX...','X..XXXXXX.','XXXXXXX...','.XXXXXX...','..XXXXX...','...XX.XX..','...X...X..'];
    const size=9,ox=w*.28,oy=h*.3;
    dino.forEach((row,r)=>[...row].forEach((c,col)=>{if(c==='X')k.pixel(ox+col*size,oy+r*size,size,INK);if(c==='O')k.pixel(ox+col*size,oy+r*size,size,PAPER_LIGHT);}));
    for(let t=0;t<1;t+=.08){const x=w*(.12+t*.5),y=h*.78-Math.sin(Math.PI*t)*h*.42;k.dot(x,y,1.8,GREY,.7);}
    const cactus=['..X..','X.X..','X.X.X','XXX.X','..XXX','..X..','..X..'];
    cactus.forEach((row,r)=>[...row].forEach((c,col)=>{if(c==='X')k.pixel(w*.56+col*8,h*.84-56+r*8,8,'#4f6f3a');}));
    cactus.forEach((row,r)=>[...row].forEach((c,col)=>{if(c==='X')k.pixel(w*.8+col*7,h*.84-49+r*7,7,'#4f6f3a');}));
    for(const [x,y] of [[.14,.14],[.5,.1]] as const)for(let i=0;i<5;i++)k.pixel(w*x+i*7,h*y+(i%4===0?7:0),7,'#a7a29a');
  },
};

/** Paints the project's illustration on its own transparent canvas, or returns null. */
export function paintIllustration(slug:string,width:number,height:number,style:MakimonoStyle) {
  const painter=PAINTERS[slug];if(!painter)return null;
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const context=canvas.getContext('2d')!;context.lineCap='round';context.lineJoin='round';
  let seed=0;for(const c of slug)seed=(seed*31+c.charCodeAt(0))>>>0;
  painter(inkKit(context,seed||1),width,height,style);
  // Feather every edge, so washes fade into the paper instead of ending in a box.
  context.globalCompositeOperation='destination-in';
  const across=context.createLinearGradient(0,0,width,0);across.addColorStop(0,'rgba(0,0,0,0)');across.addColorStop(.09,'#000');across.addColorStop(.91,'#000');across.addColorStop(1,'rgba(0,0,0,0)');
  context.fillStyle=across;context.fillRect(0,0,width,height);
  const down=context.createLinearGradient(0,0,0,height);down.addColorStop(0,'rgba(0,0,0,0)');down.addColorStop(.1,'#000');down.addColorStop(.9,'#000');down.addColorStop(1,'rgba(0,0,0,0)');
  context.fillStyle=down;context.fillRect(0,0,width,height);
  context.globalCompositeOperation='source-over';
  return canvas;
}

/** Woven pattern of the silk mounting, drawn in a lighter tone of the silk itself. */
export function paintMountPattern(context:CanvasRenderingContext2D,style:MakimonoStyle,width:number,height:number,scale:number) {
  const random=randomSource(911);const light=shade(style.mount,.12),dark=shade(style.mount,-.1);
  context.save();context.globalAlpha=.55;context.strokeStyle=light;context.fillStyle=light;context.lineWidth=1.3*scale;
  const s=26*scale;
  switch(style.pattern) {
    case 'seigaiha':
      for(let y=-s;y<height+s;y+=s*.5)for(let x=-s;x<width+s;x+=s*2)for(const r of [s,s*.7,s*.4]){context.beginPath();context.arc(x+((y/(s*.5))%2?s:0),y,r,Math.PI,0);context.stroke();}
      break;
    case 'shippo':
      for(let y=0;y<height+s;y+=s)for(let x=0;x<width+s;x+=s){context.beginPath();context.arc(x,y,s*.7,0,Math.PI*2);context.stroke();}
      break;
    case 'kikko':
      for(let y=0,row=0;y<height+s;y+=s*.87,row++)for(let x=row%2?s*.75:0;x<width+s;x+=s*1.5){context.beginPath();for(let i=0;i<=6;i++){const a=i*Math.PI/3;context.lineTo(x+Math.cos(a)*s*.48,y+Math.sin(a)*s*.48);}context.stroke();}
      break;
    case 'asanoha':
      for(let y=0,row=0;y<height+s;y+=s*.87,row++)for(let x=row%2?s/2:0;x<width+s;x+=s){for(let i=0;i<6;i++){const a=i*Math.PI/3;context.beginPath();context.moveTo(x,y);context.lineTo(x+Math.cos(a)*s*.5,y+Math.sin(a)*s*.5);context.stroke();}}
      break;
    case 'sayagata':
      for(let y=0;y<height+s;y+=s)for(let x=0;x<width+s;x+=s){context.beginPath();context.moveTo(x,y);context.lineTo(x+s*.5,y);context.lineTo(x+s*.5,y+s*.5);context.lineTo(x+s,y+s*.5);context.moveTo(x+s*.25,y+s*.25);context.lineTo(x+s*.25,y+s);context.stroke();}
      break;
    case 'ichimatsu':
      context.globalAlpha=.22;for(let y=0,r=0;y<height;y+=s,r++)for(let x=r%2?s:0;x<width;x+=s*2)context.fillRect(x,y,s,s);
      break;
    case 'kanoko':
      for(let y=0,r=0;y<height+s;y+=s*.6,r++)for(let x=r%2?s*.35:0;x<width+s;x+=s*.7){context.beginPath();context.arc(x,y,s*.14,0,Math.PI*2);context.stroke();context.fillStyle=dark;context.fillRect(x-1,y-1,2,2);}
      break;
    case 'stars':
      context.fillStyle='#d8c28a';context.globalAlpha=.7;
      for(let i=0;i<width*height/(s*s*1.6);i++){const x=random()*width,y=random()*height,r=(.8+random()*1.6)*scale;context.beginPath();context.arc(x,y,r,0,Math.PI*2);context.fill();if(random()<.2){context.fillRect(x-r*3,y-.5,r*6,1);context.fillRect(x-.5,y-r*3,1,r*6);}}
      break;
    case 'yagasuri':
      for(let x=0,c=0;x<width+s;x+=s*.8,c++)for(let y=(c%2)*s;y<height+s;y+=s*2){context.beginPath();context.moveTo(x,y);context.lineTo(x+s*.4,y+s*.5);context.lineTo(x+s*.8,y);context.moveTo(x,y+s);context.lineTo(x+s*.4,y+s*1.5);context.lineTo(x+s*.8,y+s);context.stroke();}
      break;
    case 'pixel':
      context.globalAlpha=.35;for(let y=0;y<height;y+=s*.5)for(let x=0;x<width;x+=s*.5)if(random()<.18)context.fillRect(x,y,s*.5,s*.5);
      break;
  }
  context.restore();
  if(style.gold) {
    // Kirikane: small cut flakes of gold leaf scattered on the silk.
    context.save();
    for(let i=0;i<70;i++){context.fillStyle=`rgba(${215+random()*25},${185+random()*25},${110+random()*30},${.5+random()*.4})`;const x=random()*width,y=random()*height,sz=(2+random()*5)*scale;context.save();context.translate(x,y);context.rotate(random()*Math.PI);context.fillRect(-sz/2,-sz/4,sz,sz/2);context.restore();}
    context.restore();
  }
}
