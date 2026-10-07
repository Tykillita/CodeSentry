import * as THREE from 'three';

export type Branch={points:THREE.Vector3[];radius:number;level:number;root?:boolean;seed:number};
export type Blossom={position:THREE.Vector3;orientation:THREE.Quaternion;scale:number;tint:number};
function rng(seed:number){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
const point=(v:number[])=>new THREE.Vector3(...v as [number,number,number]);
const curveOf=(branch:Branch)=>new THREE.CatmullRomCurve3(branch.points,false,'centripetal');

export function createTree() {
  const random=rng(8126);const branches:Branch[]=[];const flowers:Blossom[]=[];const buds:THREE.Vector3[]=[];
  const add=(points:THREE.Vector3[],radius:number,level:number,root=false)=>{
    const branch={points,radius,level,root,seed:random()*100};branches.push(branch);return branch;
  };
  // Every fork grows from its parent's curve, including the flowering shoots.
  const trunk=add([[0,0,0],[-.09,.75,.04],[.06,1.65,.08],[.18,2.6,0],[.49,3.4,-.08],[.84,4.35,-.05],[.75,5.35,.15],[1.3,6.45,.22],[1.65,7.3,.2]].map(point),.34,0);
  const limb=(parent:Branch,t:number,points:number[][],radius:number)=>add([curveOf(parent).getPoint(t),...points.map(point)],radius,1);
  const left=limb(trunk,.32,[[-.85,3.35,.12],[-2.2,4.25,.25],[-3.45,5.25,.12],[-4.05,5.95,.2]],.20);
  const right=limb(trunk,.37,[[1.3,3.45,-.15],[2.65,4.1,-.28],[3.7,4.9,-.05],[4.15,5.75,.12]],.185);
  limb(trunk,.55,[[-.5,4.9,-.2],[-1.5,5.85,-.25],[-2.2,6.8,-.1],[-2.45,7.35,.05]],.125);
  limb(trunk,.65,[[1.65,5.45,-.28],[2.7,6.05,-.15],[3.25,6.8,.04]],.10);
  limb(trunk,.78,[[.30,6.55,.15],[-.55,7.25,.3],[-.9,8.0,.25]],.081);
  limb(left,.56,[[-1.95,5.15,.58],[-1.65,6.15,.68],[-1.8,7.05,.57]],.084);
  limb(left,.72,[[-3.0,5.75,-.4],[-3.45,6.7,-.5],[-3.4,7.15,-.4]],.056);
  limb(right,.52,[[2.15,4.8,.75],[2.75,5.6,.9],[3.5,6.1,.65]],.075);
  limb(right,.73,[[3.55,4.6,.65],[4.2,4.9,.9],[4.55,5.25,.8]],.051);
  // Buttress roots widen into a shared ground plane instead of a cut tube.
  for(let i=0;i<5;i++) {
    const angle=i*Math.PI*2/5+.25;const reach=.46+random()*.32;
    add([new THREE.Vector3(Math.cos(angle)*.16,.43,Math.sin(angle)*.16),new THREE.Vector3(Math.cos(angle)*.35,.15,Math.sin(angle)*.35),new THREE.Vector3(Math.cos(angle)*reach,.018,Math.sin(angle)*reach)],.125+random()*.04,1,true);
  }
  for(const parent of branches.filter(b=>!b.root)) {
    const curve=curveOf(parent);const count=parent.level===0?3:4;
    for(let i=0;i<count;i++) {
      const t=.34+(i+.25+random()*.35)/count*.60;const origin=curve.getPoint(t);
      const tangent=curve.getTangent(t);const side=(i%2?-1:1)*(parent.points.at(-1)!.x<0?-1:1);
      const direction=new THREE.Vector3(side*(.35+random()*.6),.7+random()*.6,(random()-.5)*1.25).addScaledVector(tangent,.30);
      const end=origin.clone().add(direction);
      const secondary=add([origin,origin.clone().lerp(end,.48).add(new THREE.Vector3(0,.1,0)),end],Math.max(.019,parent.radius*(1-t)*.47),2);
      const secondaryCurve=curveOf(secondary);
      for(let j=0;j<3;j++) {
        const start=secondaryCurve.getPoint(.34+j*.25);const tip=start.clone().add(new THREE.Vector3((j%2?-1:1)*(.3+random()*.4),.35+random()*.45,(random()-.5)*.8));
        const shoot=add([start,start.clone().lerp(tip,.58).add(new THREE.Vector3(0,.05,0)),tip],.012+random()*.004,3);
        const shootCurve=curveOf(shoot);
        for(let k=0;k<2;k++) {
          const at=shootCurve.getPoint(.5+k*.33);const last=at.clone().add(new THREE.Vector3((random()-.5)*.5,.18+random()*.35,(random()-.5)*.45));
          add([at,at.clone().lerp(last,.55),last],.0065,4);
        }
      }
    }
  }
  for(const branch of branches.filter(b=>b.level>=3)) {
    const curve=curveOf(branch);
    for(let i=0;i<2;i++) {
      const at=curve.getPoint(.45+i*.4);const count=branch.level===4?3:2;
      for(let j=0;j<count;j++) {
        const angle=random()*Math.PI*2;const spread=.045+random()*.095;
        const offset=new THREE.Vector3(Math.cos(angle)*spread,(random()-.35)*spread,Math.sin(angle)*spread);
        const normal=new THREE.Vector3((random()-.5)*1.4,(random()-.5)*1.3,.4+random()*.9).normalize();
        const orientation=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),normal);
        orientation.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),angle));
        const position=at.clone().add(offset);
        add([at.clone(),at.clone().lerp(position,.55),position.clone()],.003,5);
        flowers.push({position,orientation,scale:.46+random()*.43,tint:random()});
      }
      if(random()<.32)buds.push(at.clone().add(new THREE.Vector3(.035,.04,.025)));
    }
  }
  const crown=[...branches.flatMap(b=>b.points),...flowers.map(f=>f.position)];
  const minX=Math.min(...crown.map(p=>p.x))-.22,maxX=Math.max(...crown.map(p=>p.x))+.22;
  return {branches,flowers,buds,height:Math.max(...crown.map(p=>p.y))+.24,width:maxX-minX,minX,maxX};
}

export function branchGeometry(branch:Branch) {
  const curve=curveOf(branch);const segments=branch.level===0?52:branch.level===1?32:branch.level===5?2:10;
  const sides=branch.level===0?24:branch.level===1?14:branch.level===5?3:7;
  const frames=curve.computeFrenetFrames(segments,false);const length=curve.getLength();
  const positions:number[]=[];const colors:number[]=[];const uv:number[]=[];const indices:number[]=[];
  const shade=new THREE.Color();const dark=new THREE.Color('#4f4941');const light=new THREE.Color('#8b7c69');
  for(let i=0;i<=segments;i++) {
    const t=i/segments;const p=curve.getPointAt(t);
    const flare=branch.level===0?1+.85*Math.exp(-t*25):1;
    const taper=branch.root?1-t*.90:Math.pow(1-t,.86)*.96+.04;
    const radius=branch.radius*taper*flare;
    for(let j=0;j<=sides;j++) {
      const angle=j/sides*Math.PI*2;
      const ridge=1+.075*Math.sin(angle*5+branch.seed)+.035*Math.sin(angle*11+t*9+branch.seed);
      const v=p.clone().addScaledVector(frames.normals[i],Math.cos(angle)*radius*ridge).addScaledVector(frames.binormals[i],Math.sin(angle)*radius*ridge);
      if(branch.root)v.y=Math.max(0,v.y);
      positions.push(v.x,v.y,v.z);
      shade.copy(dark).lerp(light,.38+.18*Math.sin(angle*3+branch.seed)+.07*Math.sin(t*21));
      colors.push(shade.r,shade.g,shade.b);uv.push(j/sides,length*t/2.1);
      if(i<segments&&j<sides){const a=i*(sides+1)+j,b=a+1;indices.push(a,b,a+sides+1,b,b+sides+1,a+sides+1);}
    }
  }
  const base=positions.length/3;const p=branch.points[0];positions.push(p.x,p.y,p.z);colors.push(.2,.17,.14);uv.push(.5,0);
  for(let j=0;j<sides;j++)indices.push(base,j+1,j);
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}

export function barkTexture() {
  const random=rng(912);const width=256,height=512;const data=new Uint8Array(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++) {
    const grain=(random()-.5)*19+Math.sin(x*.18+Math.sin(y*.023))*5;
    const i=(y*width+x)*4;data[i]=202+grain;data[i+1]=194+grain;data[i+2]=181+grain;data[i+3]=255;
  }
  // Cherry bark's horizontal lenticels have irregular spacing and lengths.
  for(let mark=0;mark<240;mark++) {
    const x=Math.floor(random()*width),y=Math.floor(random()*height);const span=4+Math.floor(random()*29);const depth=random()<.3?2:1;
    for(let dy=0;dy<depth;dy++)for(let dx=0;dx<span;dx++) {
      const i=(((y+dy)%height)*width+(x+dx)%width)*4;const fade=Math.sin(dx/span*Math.PI);
      const tone=dy===0?35:226;
      for(let c=0;c<3;c++)data[i+c]=data[i+c]*(1-fade*.5)+tone*fade*.5;
    }
  }
  const texture=new THREE.DataTexture(data,width,height);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;return texture;
}

export function petalGeometry() {
  // Cupped petals with a shallow cleft and a blush fading towards the tip.
  const positions:number[]=[];const colors:number[]=[];const indices:number[]=[];
  const rows=5,columns=6;const blush=new THREE.Color('#df9eac'),ivory=new THREE.Color('#fff4ed');
  for(let i=0;i<=rows;i++)for(let j=0;j<=columns;j++) {
    const t=i/rows,u=j/columns*2-1;const width=Math.pow(Math.sin(t*Math.PI*.90),.72)*.071;
    const notch=i===rows?.017*Math.exp(-u*u*28):0;
    positions.push(u*width,.025+t*.184-notch,.032*t*t+.018*u*u*Math.sin(t*Math.PI));
    const color=blush.clone().lerp(ivory,Math.min(1,t*1.5));colors.push(color.r,color.g,color.b);
    if(i<rows&&j<columns){const a=i*(columns+1)+j,b=a+1;indices.push(a,b,a+columns+1,b,b+columns+1,a+columns+1);}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}

export function blossomCenterGeometry() {
  const positions:number[]=[];const indices:number[]=[];const colors:number[]=[];
  const pink=new THREE.Color('#bd7f86'),gold=new THREE.Color('#d9b875');
  const triangle=(a:THREE.Vector3,b:THREE.Vector3,c:THREE.Vector3,tint:THREE.Color)=>{
    const n=positions.length/3;[a,b,c].forEach(v=>{positions.push(v.x,v.y,v.z);colors.push(tint.r,tint.g,tint.b);});indices.push(n,n+1,n+2);
  };
  for(let i=0;i<7;i++) {
    const angle=i*Math.PI*2/7;const x=Math.cos(angle)*.027,y=Math.sin(angle)*.027;
    triangle(new THREE.Vector3(-.003,0,.009),new THREE.Vector3(x-.003,y,.047),new THREE.Vector3(x+.003,y,.047),pink);
    triangle(new THREE.Vector3(x-.006,y-.004,.048),new THREE.Vector3(x+.006,y-.004,.048),new THREE.Vector3(x,y+.006,.052),gold);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}
