import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CORD_X,GRIP_INSET,readerLayout,readerGeometry,readingProgress} from '../src/lib/scroll-reader-geometry.ts';

const cases=[];
for(const viewportWidth of [320,390,600,601,768,1024,1100,1280]) {
  const mobile=viewportWidth<=600,paperWidth=Math.min(1000,viewportWidth*(mobile?.88:.95));
  const layout=readerLayout({viewportWidth,paperWidth,height:774,topCenter:mobile?-2:0,bottomCenter:mobile?776:774,topRadius:mobile?8:10,bottomRadius:mobile?8:10});
  for(const progress of [0,.17,.5,.83,1])for(const x of [-6,0,6])for(const angle of [-9,0,9]) {
    const result=readerGeometry(layout,progress,{nodes:Array.from({length:18},(_,i)=>Math.sin(i/17*Math.PI)*x),x,angle});
    assert(!/NaN|Infinity/.test(result.spine+result.light+result.dark));
    const endpoints=[...result.spine.matchAll(/[MC]([\d.-]+) ([\d.-]+)/g)];
    assert.equal(+endpoints[0][1],CORD_X);
    assert(Math.abs(+endpoints[0][2]-result.top)<.0011);
    assert(result.spine.endsWith(` ${CORD_X} ${Math.round(result.bottom*1000)/1000}`),'Last mass remains pinned to the bottom anchor');
    assert.equal(result.bottom,774+(mobile?2:0));
    assert(Math.abs(readingProgress(layout,result.y)-progress)<1e-9,'Grip and pointer coordinates agree across the whole travel');
    const right=(viewportWidth+paperWidth)/2+layout.gap+result.x+7*Math.cos(angle*Math.PI/180)+15*Math.abs(Math.sin(angle*Math.PI/180));
    assert(right<=viewportWidth-2+1e-9,'Wooden silhouette remains inside viewport at maximum tilt');
    assert(result.y-result.top>=GRIP_INSET-1e-9&&result.bottom-result.y>=GRIP_INSET-1e-9,'Grip stays clear of both anchor knots');
    for(const hole of result.holes)assert(result.spine.includes(`${Math.round(hole.x*1000)/1000} ${Math.round(hole.y*1000)/1000}`),'Rope passes through each drilled hole');
    cases.push({viewportWidth,progress,x,angle,right});
  }
  for(const span of [0,4,20,67,68,92]) {
    const result=readerGeometry(layout,.5,{nodes:Array(18).fill(0),x:0,angle:0},{top:(774-span)/2,bottom:(774+span)/2});
    assert(!/NaN|Infinity/.test(result.spine+result.light+result.dark));
    if(span+(mobile?4:0)<=68)assert.equal(result.gripOpacity,0,'Grip is hidden until enough space exists between the knots');
  }
}
fs.mkdirSync('artifacts/reader-cord-integration',{recursive:true});
fs.writeFileSync('artifacts/reader-cord-integration/geometry.json',JSON.stringify({passed:true,cases},null,2));
console.log(`Reader geometry: ${cases.length} combinations passed; anchors, holes, reading coordinates, viewport clearance and collapsed states verified.`);
