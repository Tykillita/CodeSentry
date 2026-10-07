import * as THREE from 'three';
import type { createTree } from './tree-model';

type TreeModel=ReturnType<typeof createTree>;
export type PetalPhase='flying'|'resting'|'fading';
export type PetalState={
  position:THREE.Vector3;velocity:THREE.Vector3;orientation:THREE.Quaternion;
  angularVelocity:THREE.Vector3;age:number;phase:PetalPhase;phaseAge:number;
  drag:number;scale:number;seed:number;restDuration:number;opacity:number;turn:number;
};
export const WIND_STEP=1/60;
export const PETAL_FLOOR=-.005;
const TREE_TURN=-.13;
const cos=Math.cos(TREE_TURN),sin=Math.sin(TREE_TURN);
const clamp=THREE.MathUtils.clamp;
function randomSource(seed:number){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}

export function toTreeWorld(local:THREE.Vector3,out:THREE.Vector3) {
  return out.set(cos*local.x+sin*local.z,local.y,-sin*local.x+cos*local.z);
}

/** Continuous air velocity, shared by the particles and the canopy shaders. */
export class WindField {
  private random=randomSource(4619);
  private nextGust=10+this.random()*8;
  private gustStart=-10;private gustDuration=3;private gustStrength=1.9;
  time=0;gust=0;speed=.45;angle=0;
  readonly uniforms={
    windTime:{value:0},windGust:{value:0},windSpeed:{value:.45},windAngle:{value:0},
  };
  update(time:number) {
    this.time=time;
    while(time>=this.nextGust) {
      this.gustStart=this.nextGust;this.gustDuration=2+this.random()*2;
      this.gustStrength=1.7+this.random()*.7;
      this.nextGust=this.gustStart+this.gustDuration+10+this.random()*8;
    }
    const t=(time-this.gustStart)/this.gustDuration;
    this.gust=t>0&&t<1?Math.sin(t*Math.PI)**2:0;
    this.speed=.45*(1+this.gust*(this.gustStrength-1));
    this.angle=.18*Math.sin(time*.085)+.07*Math.sin(time*.17);
    this.uniforms.windTime.value=time;this.uniforms.windGust.value=this.gust;
    this.uniforms.windSpeed.value=this.speed;this.uniforms.windAngle.value=this.angle;
  }
  sample(position:THREE.Vector3,time:number,out:THREE.Vector3) {
    return out.set(
      -this.speed*Math.cos(this.angle)+.07*Math.sin(position.y*.6+position.z*.31+time*.73),
      .025+this.gust*.25+.085*Math.sin(position.x*.42-position.z*.3+time*.91),
      .06+this.speed*Math.sin(this.angle)+.07*Math.sin(position.x*.43+position.y*.58+time*.54),
    );
  }
  /** Same bounded displacement used in GLSL; input/output in tree coordinates. */
  bend(local:THREE.Vector3,weight:number,out:THREE.Vector3) {
    toTreeWorld(local,out);const x=out.x,y=out.y,z=out.z;
    this.sample(out,this.time,out);out.normalize();
    const wave=.60+.25*Math.sin(this.time*1.35+x*.7+y*.4+z*.25);
    out.multiplyScalar((.08+.07*this.gust)*weight*wave);
    const dx=out.x,dz=out.z;
    return out.set(cos*dx-sin*dz,out.y,sin*dx+cos*dz);
  }
}

/** Continuous flexibility field around the rigid trunk and primary branches. */
export function treeFlexibility(model:TreeModel) {
  const support:THREE.Vector3[]=[];
  model.branches.filter(branch=>branch.level<=1&&!branch.root).forEach(branch=>{
    const curve=new THREE.CatmullRomCurve3(branch.points,false,'centripetal');
    for(let i=0;i<=32;i++)support.push(curve.getPoint(i/32));
  });
  return (position:THREE.Vector3)=>{
    let squared=Infinity;
    for(const point of support)squared=Math.min(squared,point.distanceToSquared(position));
    return THREE.MathUtils.smoothstep(Math.sqrt(squared),.22,1.45);
  };
}

/** Fixed-size particles: no allocations, new meshes or growth during flight. */
export class PetalSystem {
  readonly particles:PetalState[]=[];
  readonly capacity=96;
  count=96;landings=0;recycled=0;
  private readonly random=randomSource(7214);
  private readonly air=new THREE.Vector3();private readonly bend=new THREE.Vector3();
  private readonly euler=new THREE.Euler();private readonly flat=new THREE.Quaternion();
  private readonly emitters:{local:THREE.Vector3;world:THREE.Vector3;weight:number}[];
  constructor(model:TreeModel,wind:WindField,flexibility:ReturnType<typeof treeFlexibility>) {
    this.emitters=model.flowers.map(flower=>({local:flower.position,world:toTreeWorld(flower.position,new THREE.Vector3()),weight:flexibility(flower.position)}));
    for(let i=0;i<this.capacity;i++) {
      const petal:PetalState={position:new THREE.Vector3(),velocity:new THREE.Vector3(),orientation:new THREE.Quaternion(),angularVelocity:new THREE.Vector3(),age:0,phase:'flying',phaseAge:0,drag:1.5,scale:.6,seed:0,restDuration:4,opacity:1,turn:0};
      this.spawn(petal,wind);
      // Distributed ages establish a populated, irregular breeze on entry.
      const age=((i*.61803398875)%1)*30;
      for(let t=-age;t<0;t+=WIND_STEP)this.integrate(petal,WIND_STEP,wind,t);
      this.particles.push(petal);
    }
    this.landings=0;this.recycled=0;
  }
  private spawn(petal:PetalState,wind:WindField) {
    const emitter=this.emitters[Math.floor(this.random()*this.emitters.length)];
    wind.bend(emitter.local,emitter.weight,this.bend);toTreeWorld(this.bend,this.bend);
    petal.position.copy(emitter.world).add(this.bend);
    petal.position.x+=(this.random()-.5)*.08;petal.position.z+=(this.random()-.5)*.08;
    wind.sample(petal.position,wind.time,petal.velocity).multiplyScalar(.35);
    petal.velocity.y=-.035-this.random()*.08;
    petal.seed=this.random()*Math.PI*2;petal.drag=1.2+this.random()*.6;
    petal.scale=.42+this.random()*.4;petal.restDuration=3+this.random()*3;
    petal.angularVelocity.set(.45+this.random()*.5,(this.random()-.5)*.65,.18+this.random()*.45);
    petal.turn=this.random()*Math.PI*2;petal.age=0;petal.phase='flying';petal.phaseAge=0;petal.opacity=0;
    this.euler.set(petal.seed,petal.turn,petal.seed*.6);petal.orientation.setFromEuler(this.euler);
  }
  private integrate(petal:PetalState,dt:number,wind:WindField,time:number) {
    petal.age+=dt;petal.phaseAge+=dt;
    if(petal.phase==='flying') {
      wind.sample(petal.position,time,this.air);
      petal.velocity.x+=(this.air.x-petal.velocity.x)*petal.drag*dt;
      petal.velocity.y+=((this.air.y-petal.velocity.y)*petal.drag-.65+.08*Math.sin(time*2.7+petal.seed))*dt;
      petal.velocity.z+=(this.air.z-petal.velocity.z)*petal.drag*dt;
      petal.position.addScaledVector(petal.velocity,dt);
      petal.turn+=petal.angularVelocity.y*dt;
      this.euler.set(petal.seed+time*petal.angularVelocity.x+.32*Math.sin(time*2.1+petal.seed),petal.turn,petal.seed*.6+time*petal.angularVelocity.z+.20*Math.sin(time*1.7+petal.seed));
      petal.orientation.setFromEuler(this.euler);
      petal.opacity=THREE.MathUtils.smoothstep(petal.age,0,.8);
      if(petal.position.y<=PETAL_FLOOR) {
        petal.position.y=PETAL_FLOOR;petal.phase='resting';petal.phaseAge=0;
        petal.velocity.y=0;petal.velocity.x*=.22;petal.velocity.z*=.22;
        this.landings++;
      } else if(petal.age>48||Math.abs(petal.position.x)>28||Math.abs(petal.position.z)>25) {
        this.spawn(petal,wind);this.recycled++;
      }
    } else {
      // Brief ground sliding, followed by settling to the horizontal floor.
      const damping=Math.exp(-5*dt);petal.velocity.multiplyScalar(damping);
      petal.position.addScaledVector(petal.velocity,dt);petal.position.y=PETAL_FLOOR;
      this.euler.set(-Math.PI/2,0,petal.seed);this.flat.setFromEuler(this.euler);
      petal.orientation.slerp(this.flat,1-Math.exp(-6*dt));
      if(petal.phase==='resting'&&petal.phaseAge>=petal.restDuration) {petal.phase='fading';petal.phaseAge=0;}
      if(petal.phase==='fading') {
        petal.opacity=1-THREE.MathUtils.smoothstep(petal.phaseAge,0,2);
        if(petal.phaseAge>=2){this.spawn(petal,wind);this.recycled++;}
      }
    }
  }
  step(dt:number,wind:WindField) {for(let i=0;i<this.count;i++)this.integrate(this.particles[i],dt,wind,wind.time);}
}

/** Single clock advances both the air field and every animated garden detail. */
export class AmbientWind {
  readonly field=new WindField();
  readonly flexibility:ReturnType<typeof treeFlexibility>;
  readonly petals:PetalSystem;
  time=0;lowQuality=false;
  private accumulator=0;private skipFrame=true;
  constructor(model:TreeModel) {
    this.flexibility=treeFlexibility(model);this.petals=new PetalSystem(model,this.field,this.flexibility);
  }
  setCount(mobile:boolean){this.petals.count=(mobile?32:96)/(this.lowQuality?2:1);}
  resetFrame(){this.accumulator=0;this.skipFrame=true;}
  advance(dt:number) {
    if(this.skipFrame){this.skipFrame=false;return;}
    this.accumulator+=clamp(Number.isFinite(dt)?dt:0,0,WIND_STEP*4);
    let steps=0;
    while(this.accumulator+1e-10>=WIND_STEP&&steps<4) {
      this.time+=WIND_STEP;this.field.update(this.time);this.petals.step(WIND_STEP,this.field);
      this.accumulator-=WIND_STEP;steps++;
    }
  }
}
