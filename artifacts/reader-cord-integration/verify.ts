import {createParchmentPhysics} from '../../src/lib/parchment-physics';
import {initScrollReader} from '../../src/lib/scroll-reader';

const dialog=document.querySelector<HTMLDialogElement>('#project-dialog')!;
const reader=dialog.querySelector<HTMLElement>('.scroll-reader')!;
const sheet=dialog.querySelector<HTMLElement>('.scroll-sheet')!;
const body=dialog.querySelector<HTMLElement>('#project-dialog-body')!;
const host=dialog.querySelector<HTMLElement>('.scroll-reader-control')!;
const attachments=dialog.querySelector<SVGSVGElement>('.reader-attachments')!;
const status=document.querySelector<HTMLElement>('#fixture-status')!;
const run=document.querySelector<HTMLButtonElement>('#run-contracts')!;
let quiet=false;
const frame=()=>new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
const sleep=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));
const assert=(ok:unknown,message:string)=>{if(!ok)throw new Error(message);};
const data=(element:HTMLElement,key:string)=>JSON.parse(element.dataset[key]||'{}');
const results:{name:string;passed:boolean;detail?:unknown}[]=[];
const check=(name:string,detail?:unknown)=>results.push({name,passed:true,detail});
body.innerHTML=Array.from({length:18},(_,i)=>`<section class="detail-section"><h2>Sección ${i+1}</h2><p>El papel conserva su contenido, la lectura y los enlaces al descansar.</p><a href="#seccion-${i}">Enlace ${i+1}</a></section>`).join('');
let control=initScrollReader({dialog,sheet,locale:'es',isQuiet:()=>quiet})!;
let physics=createParchmentPhysics({dialog,reader,sheet,rollers:[...dialog.querySelectorAll<HTMLElement>('.dialog-roller')],isQuiet:()=>quiet,geometry:value=>control.setPaperMotion(value)});
const settled=()=>assert(!reader.querySelector('.paper-physics-screen')&&sheet.style.opacity===''&&sheet.style.clipPath==='','Original HTML restored');
const open=()=>{if(!dialog.open)dialog.showModal();control.setEnabled(false);control.refresh();return physics.open();};
dialog.querySelector('#fixture-close')!.addEventListener('click',()=>{physics.cancel();dialog.close();});

run.addEventListener('click',async()=>{
  run.disabled=true;status.textContent='Comprobando…';results.length=0;
  try {
    dialog.showModal();await frame();await document.fonts.ready;await frame();
    const opening=open();await sleep(900);
    const clones=[...reader.querySelectorAll<HTMLElement>('.paper-band-viewport')];
    assert(clones.length===(innerWidth<=600?12:16),'Responsive band count');
    assert(clones.every(clone=>clone.textContent===sheet.textContent&&!clone.querySelector('[id],[autofocus]')),'Snapshot content and ID isolation');
    assert(reader.querySelector<HTMLElement>('.paper-physics-screen')!.inert,'Visual layer inert');
    assert(host.getAttribute('aria-disabled')==='true','Slider disabled during opening');
    const anchorGroups=[...attachments.querySelectorAll<SVGGElement>('[data-reader-anchor]')];
    const rodBoxes=[...dialog.querySelectorAll('.dialog-roller')].map(rod=>rod.getBoundingClientRect());
    assert(anchorGroups.every((group,i)=>Math.abs(group.getScreenCTM()!.f-(rodBoxes[i].top+rodBoxes[i].height/2))<.6),'Anchor loops follow the rod centres during curvature');
    assert(+getComputedStyle(attachments).zIndex>+getComputedStyle(dialog.querySelector('.dialog-roller')!).zIndex,'Front turns cross the wooden rod faces');
    assert(+getComputedStyle(host).zIndex<+getComputedStyle(reader.querySelector('.paper-physics-screen')!).zIndex,'Curved paper can occlude the suspended cord');
    check('temporary native-content surface',data(reader,'paperPhysics'));
    const before=data(reader,'paperPhysics');opening.cancel();const closing=physics.close();
    const after=data(reader,'paperPhysics');assert(Math.abs(before.progress-after.progress)<1e-8,'Interrupted pose continuity');
    opening.cancel();assert(closing.playState==='running','Cancelling a stale handle cannot cancel its replacement');
    assert(await opening.finished===true,'Cancelled opening settles');await closing.finished;settled();
    check('interrupt opening and continue closing from current pose');
    dialog.close();await frame();

    const full=open();await full.finished;settled();control.setEnabled(true);
    sheet.scrollTop=sheet.scrollHeight-sheet.clientHeight;sheet.dispatchEvent(new Event('scroll'));await frame();
    assert(host.getAttribute('aria-valuenow')==='100','Reading percentage exact');
    host.dispatchEvent(new KeyboardEvent('keydown',{key:'Home',bubbles:true,cancelable:true}));assert(sheet.scrollTop===0,'Home is immediate');
    host.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true}));assert(sheet.scrollTop===40,'Arrow step is 40px');
    await sleep(1400);assert(data(host,'cordPhysics').running===false,'Cord stops RAF at rest');
    assert(data(host,'cordPhysics').x===0&&data(host,'cordPhysics').angle===0,'Exact cord rest');
    check('native reading, percentage, keyboard and inactive rest',data(reader,'paperPhysics'));

    const capture=new Set<number>();
    const originalCapture=host.setPointerCapture.bind(host),originalHas=host.hasPointerCapture.bind(host),originalRelease=host.releasePointerCapture.bind(host);
    host.setPointerCapture=id=>{capture.add(id);};host.hasPointerCapture=id=>capture.has(id);host.releasePointerCapture=id=>{capture.delete(id);};
    const box=host.getBoundingClientRect(),geometry=data(host,'readerGeometry'),span=geometry.bottom-geometry.top-68;
    const send=(type:string,id:number,y:number,primary=true)=>host.dispatchEvent(new PointerEvent(type,{pointerId:id,pointerType:'touch',isPrimary:primary,button:0,bubbles:true,cancelable:true,clientX:box.left+40,clientY:box.top+y}));
    send('pointerdown',7,geometry.top+34);send('pointermove',7,geometry.top+34+span*.55);
    assert(Math.abs(+host.getAttribute('aria-valuenow')! -55)<.2,'Synthetic touch follows the new coordinate mapping');
    send('pointerdown',8,geometry.top+34,false);send('lostpointercapture',8,geometry.top+34,false);send('pointercancel',8,geometry.top+34,false);
    assert(capture.has(7)&&host.hasAttribute('data-dragging'),'Secondary touch does not interrupt primary touch');
    send('pointercancel',7,geometry.top+34);assert(capture.size===0&&!host.hasAttribute('data-dragging'),'Touch cancellation releases capture');
    send('pointerdown',7,geometry.top+34);send('lostpointercapture',7,geometry.top+34);assert(capture.size===0&&!host.hasAttribute('data-dragging'),'Lost capture cancels drag');
    host.setPointerCapture=originalCapture;host.hasPointerCapture=originalHas;host.releasePointerCapture=originalRelease;
    check('touch coordinate mapping, secondary contacts, cancellation and lost capture');

    const changed=open();await sleep(80);body.append(document.createElement('hr'));await changed.finished;settled();
    check('project replacement settles active motion');
    const resized=open();await sleep(80);sheet.style.height=`${sheet.clientHeight-7}px`;physics.resize();await resized.finished;settled();sheet.style.height='';await frame();
    check('resize settles active motion');
    const font=open();await sleep(80);document.fonts.dispatchEvent(new Event('loadingdone'));await font.finished;settled();
    check('late fonts settle active motion');
    const image=document.createElement('img');image.width=40;image.height=16;image.alt='Imagen tardía de prueba';body.prepend(image);sheet.scrollTop=0;await frame();
    const media=open();await sleep(80);image.src='data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="16"%3E%3Crect width="40" height="16" fill="tan"/%3E%3C/svg%3E';await media.finished;settled();
    check('late visible images return to live HTML');image.remove();await frame();

    const visibility=open();await sleep(180);
    Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));
    const paused=data(reader,'paperPhysics').frames;await sleep(160);assert(data(reader,'paperPhysics').frames===paused,'Hidden page suspends paper');
    delete (document as unknown as {hidden?:boolean}).hidden;document.dispatchEvent(new Event('visibilitychange'));await visibility.finished;settled();
    check('page visibility suspends and resumes without a large timestep');
    const external=open();await sleep(80);dialog.close();await external.finished;await frame();
    const reopened=open();assert(data(reader,'paperPhysics').progress===0,'A truly closed dialog reopens from a closed roll');reopened.cancel();dialog.close();await reopened.finished;await frame();
    check('external close resolves motion and resets the next opening');
    quiet=true;const reduced=open();await reduced.finished;settled();control.setEnabled(true);
    host.dispatchEvent(new KeyboardEvent('keydown',{key:'End',bubbles:true,cancelable:true}));await frame();
    assert(data(host,'cordPhysics').x===0&&data(host,'cordPhysics').running===false,'Reduced motion has no oscillation');
    check('reduced motion preserves immediate reading');quiet=false;

    const preserved=body.innerHTML;body.innerHTML='<p>Una hoja breve.</p>';sheet.scrollTop=0;await frame();
    const brief=open();await brief.finished;control.setEnabled(true);assert(host.hidden,'No slider when the complete sheet fits');settled();
    assert(attachments.hasAttribute('data-reader-hidden'),'Short paper hides both attachment groups');
    check('short paper hides an unnecessary cord control');body.innerHTML=preserved;await frame();

    const teardown=open();await frame();physics.destroy();control.destroy();await teardown.finished;settled();
    assert(!dialog.hasAttribute('data-reader-ready'),'Reader teardown restores native fallback');
    assert(attachments.hasAttribute('data-reader-hidden'),'Teardown hides attachments');
    control=initScrollReader({dialog,sheet,locale:'es',isQuiet:()=>quiet})!;
    physics=createParchmentPhysics({dialog,reader,sheet,rollers:[...dialog.querySelectorAll<HTMLElement>('.dialog-roller')],isQuiet:()=>quiet,geometry:value=>control.setPaperMotion(value)});
    control.setEnabled(true);sheet.scrollTop=0;host.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true}));
    assert(sheet.scrollTop===40,'Reinitialization has one key listener');
    check('teardown resolves promises and reinitialization has no duplicate listeners');
    dialog.close();reader.dataset.testReport=JSON.stringify({passed:true,results});status.textContent=`Correcto: ${results.length} contratos comprobados`;
  } catch(error) {
    delete (document as unknown as {hidden?:boolean}).hidden;document.dispatchEvent(new Event('visibilitychange'));
    physics.cancel();dialog.close();reader.dataset.testReport=JSON.stringify({passed:false,results,error:String(error)});status.textContent=String(error);
  } finally {run.disabled=false;}
});

document.querySelector('#check-contrast')!.addEventListener('click',()=>{
  // The browser capability cannot emulate OS media preferences. Apply the
  // actual compiled forced-colors declarations to verify their rendering.
  const declarations:string[]=[];
  const collect=(rules:CSSRuleList)=>{for(const rule of [...rules]){
    if(rule instanceof CSSMediaRule&&rule.conditionText.includes('forced-colors')) {
      for(const item of [...rule.cssRules])if(item instanceof CSSStyleRule&&item.selectorText.includes('.reader-'))declarations.push(item.cssText);
    } else if('cssRules' in rule)collect((rule as CSSGroupingRule).cssRules);
  }};
  for(const stylesheet of [...document.styleSheets])collect(stylesheet.cssRules);
  const style=document.createElement('style');style.dataset.contrastEmulation='';style.textContent=declarations.join('\n');document.head.append(style);
  quiet=true;dialog.showModal();sheet.scrollTop=0;control.setEnabled(true);host.focus({preventScroll:true});
  const css=(selector:string)=>getComputedStyle(dialog.querySelector(selector)!);
  const report={mode:'compiled CSS emulation; OS preference unchanged',rules:declarations.length,cord:css('.reader-cord-base').stroke,wood:css('.reader-wood-base').fill,shadow:css('.reader-cord-shadow').display,fibres:css('.reader-cord-fibres').display,wrap:css('.reader-wrap').stroke,outline:css('.reader-wrap-outline').stroke,focus:css('.reader-focus').stroke};
  reader.dataset.contrastReport=JSON.stringify(report);
});
dialog.querySelector('#fixture-close')!.addEventListener('click',()=>{document.querySelector('[data-contrast-emulation]')?.remove();quiet=false;});
