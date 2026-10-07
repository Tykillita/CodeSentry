import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PaperDynamics,CordDynamics} from '../src/lib/parchment-physics.ts';

const results=[];
for(const fps of [30,60,120]) {
  for(const opening of [true,false]) {
    const paper=new PaperDynamics(opening,opening?.5:0);
    let elapsed=0,peak=0,completeAt=0;
    const samples=[];
    for(let frame=1;frame<=fps*4;frame++) {
      paper.update(1/fps);elapsed=frame/fps;
      for(const state of [paper.progress,paper.bow,paper.ripple])assert(Number.isFinite(state.value)&&Number.isFinite(state.velocity));
      for(let i=0;i<=24;i++){assert(Math.abs(paper.depth(i/24))<=48.00001);assert(Math.abs(paper.angle(i/24,500))<=32);peak=Math.max(peak,Math.abs(paper.depth(i/24)));}
      for(const height of [180,500,774])for(const bands of [12,16])for(let i=0;i<bands;i++) {
        const scale=Math.min(1,height/550);
        const angle=Math.atan((paper.depth((i+1)/bands)-paper.depth(i/bands))*scale/(height/bands))*180/Math.PI;
        assert(Math.abs(angle)<=32,'Short paper secants respect the curvature limit');
      }
      if(paper.complete&&!completeAt)completeAt=elapsed;
      if(frame%fps===0)samples.push([paper.progress.value,paper.bow.value,paper.ripple.value]);
    }
    assert(completeAt<=(opening?3.2:1.3)+1/fps);assert(peak>10);
    results.push({kind:opening?'opening':'closing',fps,completeAt,peak,samples});
  }
  const cord=new CordDynamics();cord.position=.37;cord.drive(6,9);
  for(let i=0;i<fps/2;i++)cord.update(1/fps);
  cord.release();cord.impulse(22);
  let time=0;
  while(cord.moving&&time<2) {
    cord.update(1/fps);time+=1/fps;
    for(const node of cord.nodes)assert(Number.isFinite(node.value)&&Number.isFinite(node.velocity)&&Math.abs(node.value)<=6);
    assert.equal(cord.nodes[0].value,0);assert.equal(cord.nodes[17].value,0);
    assert(Math.abs(cord.grip.value)<=6);assert(Math.abs(cord.rotation.value)<=9);assert(Math.abs(cord.edge.value)<=4);
  }
  assert(!cord.moving);assert(time<=1.2+1/fps+1e-8);
  cord.reset();assert(cord.nodes.every(n=>n.value===0&&n.velocity===0));assert.equal(cord.grip.value,0);
  results.push({kind:'cord-release',fps,settle:time});
  // Very long browser frame gaps cannot destabilize the solver.
  const gap=new CordDynamics();gap.impulse(28);gap.update(20);assert(gap.nodes.every(n=>Number.isFinite(n.value)));
}
for(const direction of [true,false]) {
  const initial=new PaperDynamics(direction);
  for(let i=0;i<90;i++)initial.update(1/120);
  const interrupted=new PaperDynamics(!direction,0,initial.pose);
  assert.deepEqual(interrupted.pose,initial.pose,'Changing direction starts from the current position and velocity');
  for(let i=0;i<400&&!interrupted.complete;i++)interrupted.update(1/120);
  assert(interrupted.complete,'Interrupted motion finishes within its deadline');
}
for(const kind of ['opening','closing']) {
  const runs=results.filter(r=>r.kind===kind);
  for(let i=1;i<runs.length;i++)for(let sample=0;sample<4;sample++)for(let axis=0;axis<3;axis++)assert(Math.abs(runs[0].samples[sample][axis]-runs[i].samples[sample][axis])<1e-7);
}
fs.mkdirSync('artifacts/parchment-physics',{recursive:true});
fs.writeFileSync('artifacts/parchment-physics/solver.json',JSON.stringify({passed:true,results},null,2));
console.log('Paper and 18-point cord: finite, bounded and deterministic at 30/60/120 Hz; rest and long-frame-gap checks passed.');
