import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { journey, setActivePanel, setClosingSlug, setHoverSlug, setMeta, setProgress, setStudio } from './journey-store';
import { initAudio } from './audio';
import { ui, type Locale } from '../data/ui';
import { makimonoIllustration } from '../components/scene/parchment-texture';
import { DEFAULT_STYLE, MAKIMONO_STYLES } from '../components/scene/makimono-art';
import { initScrollReader } from './scroll-reader';
import { createParchmentPhysics, type PhysicsMotion } from './parchment-physics';

export function initGarden() {
  if(document.documentElement.dataset.gardenInitialized==='true')return;
  document.documentElement.dataset.gardenInitialized='true';
  document.documentElement.classList.add('js');
  // The journey owns its scroll position; shared project hashes are routed below.
  history.scrollRestoration='manual';
  window.scrollTo({top:0,behavior:'instant'});
  gsap.registerPlugin(ScrollTrigger);
  const locale=document.body.dataset.locale as Locale; const t=ui[locale];
  const viewport=document.querySelector<HTMLElement>('#catalogue')!;
  const track=document.querySelector<HTMLElement>('#parchment')!;
  const panels=[...document.querySelectorAll<HTMLElement>('[data-panel]')];
  const projectCopies=panels.map(panel=>panel.querySelector<HTMLElement>('.project-copy'));
  const prev=document.querySelector<HTMLButtonElement>('#previous-panel')!;
  const next=document.querySelector<HTMLButtonElement>('#next-panel')!;
  const motion=document.querySelector<HTMLButtonElement>('#motion-toggle')!;
  const projectDialog=document.querySelector<HTMLDialogElement>('#project-dialog')!;
  const indexDialog=document.querySelector<HTMLDialogElement>('#index-dialog')!;
  const dialogs=[...document.querySelectorAll<HTMLDialogElement>('dialog')];
  const sheet=projectDialog.querySelector<HTMLElement>('.scroll-sheet')!;
  const reader=projectDialog.querySelector<HTMLElement>('.scroll-reader')!;
  const readingControl=initScrollReader({dialog:projectDialog,sheet,locale,isQuiet:()=>journey.quiet});
  const rollers=[...projectDialog.querySelectorAll<HTMLElement>('.dialog-roller')];
  const paperPhysics=createParchmentPhysics({dialog:projectDialog,reader,sheet,rollers,isQuiet:()=>journey.quiet,geometry:value=>readingControl?.setPaperMotion(value)});
  const toast=document.querySelector<HTMLElement>('#status-toast')!;
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
  const desktop=window.matchMedia('(min-width: 900px) and (pointer: fine)');
  let preference:boolean|undefined;
  try {const saved=localStorage.getItem('codesentry:motion:v1');if(saved==='quiet'||saved==='animated')preference=saved==='quiet';} catch { /* Storage can be disabled. */ }
  let active=0, distance=0, offsets:number[]=[]; let tween:gsap.core.Tween|undefined,travelTween:gsap.core.Tween|undefined,entryTween:gsap.core.Timeline|undefined;let initialized=false,halo='';
  let entryNodes:HTMLElement[]=[],entryFrom=0,entryTo=1,entryProgress=0,entryTargetProgress=0,entryTickerActive=false;
  let opening:HTMLElement|null=null; let lockedY=0,lockedX=0,toastTimer=0;
  let openedSlug=''; let pinned=false; let rebuildFrame=0;
  let rebuilding=false,resizePanel:number|null=null;
  const presence:string[]=[];
  let scrollMotion:PhysicsMotion[]=[]; let detailToken=0; let rollingUp=false;
  const position={value:0};
  function notify(message:string) {clearTimeout(toastTimer);toast.textContent=message;toast.classList.add('visible');toastTimer=window.setTimeout(()=>toast.classList.remove('visible'),3600);}
  function tickProjectEntry() {
    if(!entryTween){gsap.ticker.remove(tickProjectEntry);entryTickerActive=false;return;}
    // Cap long frame gaps so a busy 3D frame cannot jump the reveal to its end.
    const elapsed=Math.min(40,Math.max(1,gsap.ticker.deltaRatio(60)*(1000/60)));
    const blend=1-Math.exp(-elapsed/85);
    entryProgress+=(entryTargetProgress-entryProgress)*blend;
    if(Math.abs(entryTargetProgress-entryProgress)<.001)entryProgress=entryTargetProgress;
    entryTween.progress(entryProgress,false);
    if(entryTargetProgress>=1&&entryProgress>=.999)resetProjectEntry();
  }
  function resetProjectEntry() {
    entryTween?.kill();entryTween=undefined;
    if(entryTickerActive){gsap.ticker.remove(tickProjectEntry);entryTickerActive=false;}
    if(entryNodes.length)gsap.set(entryNodes,{clearProps:'transform,opacity,visibility'});
    entryNodes=[];entryProgress=0;entryTargetProgress=0;
  }
  function prepareProjectEntry(panel:HTMLElement,direction:number,from:number,to:number) {
    if(journey.quiet||journey.mode==='studio'||!panel.dataset.slug)return;
    resetProjectEntry();entryFrom=from;entryTo=to;
    const copy=[...panel.querySelectorAll<HTMLElement>('.project-copy .eyebrow, .project-copy .project-position, .project-copy h2, .project-copy .project-subtitle, .project-copy .project-summary, .project-copy .tags, .project-copy .project-actions, .project-copy .platform-label')];
    const figure=panel.querySelector<HTMLElement>('.project-figure');
    entryNodes=[...copy,...(figure?[figure]:[])];
    if(!entryNodes.length)return;
    entryTween=gsap.timeline({paused:true});
    if(copy.length)entryTween.fromTo(copy,{autoAlpha:0,y:16,x:direction*8},{autoAlpha:1,y:0,x:0,duration:.48,stagger:.045,ease:'none',clearProps:'transform,opacity,visibility'},0);
    if(figure)entryTween.fromTo(figure,{autoAlpha:0,x:direction*18,scale:.975},{autoAlpha:1,x:0,scale:1,duration:.68,ease:'none',clearProps:'transform,opacity,visibility'},.04);
    entryTween.progress(0,false);
    entryProgress=0;entryTargetProgress=0;
    gsap.ticker.add(tickProjectEntry);entryTickerActive=true;
  }
  function syncProjectEntry(progress:number) {
    if(!entryTween)return;
    const span=entryTo-entryFrom;
    entryTargetProgress=span?Math.max(0,Math.min(1,(progress-entryFrom)/span)):1;
  }
  function update(value:number) {
    if(rebuilding||resizePanel!==null)return;
    hideCard();
    setProgress(value);
    // Scrub the project reveal with the same progress that drives the track and camera.
    syncProjectEntry(value);
    const x=value*distance;
    if(pinned)track.style.transform=`translate3d(${-x}px,0,0)`;
    // A table scroll can finish opening anywhere inside its selection interval.
    // Counter the track's actual horizontal offset so its card stays at the
    // panel's normal left margin, even before/after the exact resting stop.
    const trackOffset=pinned?x:viewport.scrollLeft;
    projectCopies.forEach((copy,i)=>copy?.style.setProperty('--studio-card-shift',`${trackOffset-(offsets[i]??0)}px`));
    let nearest=0; let delta=Infinity;
    offsets.forEach((at,i)=>{const d=Math.abs(at-x);if(d<delta){nearest=i;delta=d;}});
    // only the panel at rest shows its copy; neighbours peeking at the edge fade
    // out, and two panels cross-fade while the journey moves between them.
    const width=Math.max(1,viewport.clientWidth);
    offsets.forEach((at,i)=>{
      const shift=Math.min(1,Math.max(0,(Math.abs(at-x)/width-.2)/.3));
      const value=(1-shift*shift*(3-2*shift)).toFixed(3);
      if(presence[i]!==value){presence[i]=value;panels[i].style.setProperty('--presence',value);}
    });
    const slug=panels[nearest].dataset.slug||'';
    setActivePanel(nearest,slug);
    if(!initialized||active!==nearest) {
      active=nearest;initialized=true;
      panels.forEach((panel,i)=>{panel.inert=i!==active;panel.setAttribute('aria-hidden',String(i!==active));});
      const label=active===0?t.home:active===17?t.approach:`${String(active).padStart(2,'0')} / 16`;
      document.querySelector<HTMLElement>('#current-project')!.textContent=label;
      prev.disabled=active===0;next.disabled=active===17;
      const lang=document.querySelector<HTMLAnchorElement>('[data-language]')!;
      lang.href=`/${locale==='es'?'en':'es'}/${slug?`#proyecto-${slug}`:''}`;
      document.body.dataset.current=String(active);
    }
    document.querySelector<HTMLElement>('#progress-fill')!.style.transform=`scaleX(${value})`;
    document.body.dataset.progress=value.toFixed(6);
    const smooth=(x:number)=>{const q=Math.min(1,Math.max(0,x));return q*q*(3-2*q);};
    const opacity=1-.68*smooth((value-.94)/.06);
    const signature=opacity.toFixed(4);
    if(signature!==halo){halo=signature;document.documentElement.style.setProperty('--scene-opacity',String(opacity));}
  }
  function jump(index:number) {
    travelTween?.kill();travelTween=undefined;
    resetProjectEntry();
    const target=Math.max(0,Math.min(17,index));const x=offsets[target]||0;
    if(pinned&&tween?.scrollTrigger) {
      const progress=distance?x/distance:0;
      window.scrollTo({top:tween.scrollTrigger.start+x,behavior:'instant'});
      tween.progress(progress);position.value=progress;update(progress);ScrollTrigger.update();
    } else { viewport.scrollTo({left:x,behavior:journey.quiet?'instant':'smooth'}); }
  }
  function cancelTravel() {
    travelTween?.kill();travelTween=undefined;resetProjectEntry();
  }
  function applyProgress(value:number,immediate=false) {
    const progress=Math.max(0,Math.min(1,value));
    const trigger=pinned?tween?.scrollTrigger:undefined;
    if(trigger) {
      window.scrollTo({top:trigger.start+progress*distance,behavior:'instant'});
      ScrollTrigger.update();
      if(immediate) {
        // Flush the previous scrub after reading the new scroll position. A
        // paused, unfinished scrub could otherwise pull a direct seek back.
        trigger.getTween()?.progress(1).pause();
        tween!.progress(progress);position.value=progress;update(progress);
      }
    } else {
      viewport.scrollTo({left:progress*distance,behavior:'instant'});
      update(progress);
    }
  }
  function travelProgress(value:number,options:{slowTravel?:boolean;entryIndex?:number}={}) {
    const to=Math.max(0,Math.min(1,value));
    cancelTravel();
    if(journey.quiet||distance<=0){applyProgress(to,true);return;}
    const trigger=pinned?tween?.scrollTrigger:undefined;
    const from=trigger?Math.max(0,Math.min(1,(window.scrollY-trigger.start)/distance)):distance?viewport.scrollLeft/distance:0;
    const delta=Math.abs(to-from),target=options.entryIndex;
    if(delta<.002){applyProgress(to,true);return;}
    if(target!==undefined&&target!==active)prepareProjectEntry(panels[target],target>active?1:-1,journey.progress,to);
    const path={progress:from};
    const baseDuration=Math.max(1.25,Math.min(5.6,1.25+delta*4.4));
    const duration=options.slowTravel?Math.max(2.2,Math.min(9.2,baseDuration*1.65)):baseDuration;
    travelTween=gsap.to(path,{progress:to,duration,ease:'power1.inOut',onUpdate:()=>{
      applyProgress(path.progress);
    },onComplete:()=>{
      applyProgress(to);
      travelTween=undefined;
    }});
  }
  function travelTo(index:number,options:{animateEntry?:boolean;slowTravel?:boolean}={}) {
    const target=Math.max(0,Math.min(17,index));
    travelProgress(distance?(offsets[target]||0)/distance:0,{slowTravel:options.slowTravel,entryIndex:options.animateEntry?target:undefined});
  }
  function rebuild() {
    const saved=resizePanel??active;resizePanel=null;rebuilding=true;
    travelTween?.kill();travelTween=undefined;
    resetProjectEntry();
    tween?.scrollTrigger?.kill(true);tween?.kill();tween=undefined;
    pinned=desktop.matches&&!journey.quiet;
    document.documentElement.classList.toggle('desktop-journey',pinned);
    track.style.transform='';viewport.scrollLeft=0;
    distance=Math.max(0,track.scrollWidth-viewport.clientWidth);
    offsets=panels.map(panel=>Math.min(distance,panel.offsetLeft));
    if(pinned) {
      position.value=0;
      tween=gsap.to(position,{value:1,ease:'none',onUpdate:()=>update(position.value),scrollTrigger:{trigger:'#journey',pin:viewport,start:'top top',end:()=>`+=${distance}`,scrub:.45,invalidateOnRefresh:true,anticipatePin:1}});
    } else window.scrollTo({top:0,behavior:'instant'});
    rebuilding=false;
    jump(saved); if(!pinned){viewport.scrollLeft=offsets[saved]||0;update(distance?viewport.scrollLeft/distance:0);}
    if(dialogs.some(dialog=>dialog.open)){lockedY=window.scrollY;lockedX=viewport.scrollLeft;tween?.scrollTrigger?.disable(false);}
  }
  function applyMotion() {
    const quiet=preference??reduce.matches;
    document.documentElement.classList.toggle('quiet',quiet);
    setMeta({quiet});
    motion.setAttribute('aria-pressed',String(quiet));motion.setAttribute('aria-label',quiet?t.animated:t.calm);
    readingControl?.refresh();
    paperPhysics.resize();
    rebuild();
  }
  viewport.addEventListener('scroll',()=>{if(!pinned)update(distance?viewport.scrollLeft/distance:0);},{passive:true});
  prev.addEventListener('click',()=>travelTo(active-1,{animateEntry:true}));next.addEventListener('click',()=>travelTo(active+1,{animateEntry:true}));
  motion.addEventListener('click',()=>{preference=!journey.quiet;try{localStorage.setItem('codesentry:motion:v1',preference?'quiet':'animated');}catch{/* Optional preference. */}applyMotion();if(preference)notify(t.quietHelp);});
  function scheduleRebuild() {
    // CSS and ScrollTrigger can emit a transient scroll at zero while changing modes.
    // Remember the selected project before that event and restore it once, next frame.
    resizePanel??=active;cancelAnimationFrame(rebuildFrame);rebuildFrame=requestAnimationFrame(rebuild);
  }
  reduce.addEventListener('change',applyMotion);desktop.addEventListener('change',scheduleRebuild);
  window.addEventListener('resize',scheduleRebuild);
  document.fonts.ready.then(()=>{
    rebuild();
    requestAnimationFrame(()=>{document.documentElement.dataset.gardenReady='true';});
  });
  document.addEventListener('visibilitychange',()=>setMeta({hidden:document.hidden}));
  setMeta({hidden:document.hidden});
  document.addEventListener('keydown',event=>{
    if(dialogs.some(d=>d.open)||event.altKey||event.ctrlKey||event.metaKey||event.target instanceof HTMLInputElement||event.target instanceof HTMLSelectElement||(event.target instanceof Element&&event.target.closest('#red-thread')))return;
    if(studioMoving){event.preventDefault();return;}
    if(event.key==='Escape'&&journey.mode==='studio'){event.preventDefault();exitStudio();return;}
    if(event.key==='ArrowRight'){event.preventDefault();travelTo(active+1,{animateEntry:true});}if(event.key==='ArrowLeft'){event.preventDefault();travelTo(active-1,{animateEntry:true});}
  });
  function show(dialog:HTMLDialogElement) {
    cancelTravel();
    opening=document.activeElement instanceof HTMLElement?document.activeElement:null;
    if(pinned&&tween?.scrollTrigger) {
      const progress=journey.progress;
      tween.scrollTrigger.getTween()?.pause();
      window.scrollTo({top:tween.scrollTrigger.start+progress*distance,behavior:'instant'});
      tween.progress(progress);ScrollTrigger.update();tween.scrollTrigger.disable(false);
    }
    lockedY=window.scrollY;lockedX=viewport.scrollLeft;
    setMeta({paused:true});dialog.showModal();
  }
  let readingAnimation=0;
  function stopScrollMotion() {readingAnimation++;readingControl?.setEnabled(false);scrollMotion.forEach(animation=>animation.cancel());scrollMotion=[];}
  function enableReadingAfterOpen() {
    const token=readingAnimation;
    void Promise.all(scrollMotion.map(animation=>animation.finished)).then(()=>{
      if(token===readingAnimation&&projectDialog.open&&!rollingUp)readingControl?.setEnabled(true);
    },()=>{/* A close or another opening cancelled this reveal. */});
  }
  // The detail opens like a magic scroll: a closed roll travels from the project's
  // scroll to the centre, then both rollers part at once, upwards and downwards.
  function unrollDetail(from:DOMRect|null) {
    stopScrollMotion();
    sheet.scrollTop=0;
    readingControl?.refresh();
    if(journey.quiet){scrollMotion=[projectDialog.animate([{opacity:0},{opacity:1}],{duration:140,easing:'ease-out'})];enableReadingAfterOpen();return;}
    const box=projectDialog.getBoundingClientRect();
    // Unhurried: the closed roll glides to the centre, then parts slowly both ways.
    const delay=from?500:120;
    if(from) {
      const scale=Math.max(.24,Math.min(1,from.width/box.width));
      const dx=from.left+from.width/2-(box.left+box.width/2),dy=from.top+from.height/2-(box.top+box.height/2);
      scrollMotion.push(projectDialog.animate([{transform:`translate(${dx}px,${dy}px) scale(${scale})`,opacity:.2},{transform:'none',opacity:1}],{duration:560,easing:'cubic-bezier(.3,.7,.2,1)'}));
    } else scrollMotion.push(projectDialog.animate([{opacity:0},{opacity:1}],{duration:260,easing:'ease-out'}));
    scrollMotion.push(paperPhysics.open(delay/1000));
    enableReadingAfterOpen();
  }
  function rollUpDetail() {
    stopScrollMotion();
    if(journey.quiet)scrollMotion=[projectDialog.animate([{opacity:1},{opacity:0}],{duration:120,fill:'forwards'})];
    else {
      scrollMotion=[paperPhysics.close()];
    }
    return Promise.all(scrollMotion.map(animation=>animation.finished)).then(()=>true,()=>false);
  }
  function finish(dialog:HTMLDialogElement) {
    if(dialog===projectDialog&&dialog.open) {
      if(rollingUp)return;
      rollingUp=true;const token=++detailToken;
      void rollUpDetail().then(()=>{if(token!==detailToken)return;rollingUp=false;stopScrollMotion();release(dialog);});
      return;
    }
    release(dialog);
  }
  function release(dialog:HTMLDialogElement) {
    dialog.close();setMeta({paused:false});
    setClosingSlug('');document.querySelectorAll<HTMLElement>('.parchment-action[data-rolled]').forEach(action=>{delete action.dataset.rolled;});
    window.scrollTo({top:lockedY,behavior:'instant'});if(!pinned)viewport.scrollLeft=lockedX;
    tween?.scrollTrigger?.enable(false,false);
    if(opening?.isConnected&&opening.tabIndex>=0&&opening.getClientRects().length&&!opening.closest('[inert]'))opening.focus({preventScroll:true});
    else next.focus({preventScroll:true});
  }
  // the studio. A strip (or any project entry) walks the camera into the house;
  // there the same sixteen panels unroll makimono on the table. Leaving walks back
  // out to the same project's strip.
  const studioProxy={value:0};let studioTween:gsap.core.Tween|undefined;let studioMoving=false;
  const card=document.querySelector<HTMLElement>('#strip-card');
  const exitButton=document.querySelector<HTMLElement>('#studio-exit');
  function hideCard() {if(card&&!card.hidden){card.hidden=true;setHoverSlug('');}}
  function animateStudio(to:number,done:()=>void) {
    studioTween?.kill();studioMoving=true;
    studioTween=gsap.to(studioProxy,{value:to,duration:journey.quiet?0:2.8,ease:'power1.inOut',
      onUpdate:()=>setStudio('studio',studioProxy.value),
      onComplete:()=>{studioMoving=false;done();}});
  }
  function enterStudio(slug:string,push=true) {
    const panel=panels.find(p=>p.dataset.slug===slug);if(!panel)return;
    hideCard();cancelTravel();
    const index=panels.indexOf(panel);
    applyProgress(distance?(offsets[index]||0)/distance:0,true);
    if(journey.mode==='studio')return;
    if(push)history.pushState({csStudio:true},'','#estudio');
    document.documentElement.classList.add('studio');if(exitButton)exitButton.hidden=false;
    setStudio('studio',studioProxy.value);
    animateStudio(1,()=>exitButton?.focus({preventScroll:true}));
  }
  function exitStudio(fromHistory=false) {
    if(journey.mode!=='studio')return;
    if(!fromHistory&&history.state?.csStudio){history.back();return;}
    if(exitButton)exitButton.hidden=true;
    const studioHit=document.querySelector<HTMLElement>('#studio-hit');if(studioHit)studioHit.hidden=true;
    animateStudio(0,()=>{setStudio('garden',0);document.documentElement.classList.remove('studio');});
  }
  // The walk in takes the scroll; wheel and touch wait until the camera arrives.
  const blockWhileWalking=(event:Event)=>{if(studioMoving)event.preventDefault();};
  window.addEventListener('wheel',blockWhileWalking,{passive:false});window.addEventListener('touchmove',blockWhileWalking,{passive:false});
  window.addEventListener('codesentry:strip-open',event=>enterStudio((event as CustomEvent<{slug:string}>).detail.slug));
  window.addEventListener('codesentry:strip-hover',event=>{
    const {slug,x,y}=(event as CustomEvent<{slug:string;x:number;y:number}>).detail;
    if(!card)return;
    if(!slug){if(!card.matches(':hover'))card.hidden=true;return;}
    const panel=panels.find(p=>p.dataset.slug===slug);if(!panel)return;
    const eyebrow=panel.querySelector('.project-copy .eyebrow'),mark=eyebrow?.querySelector('.area-mark')?.textContent??'';
    const areaName=(eyebrow?.textContent??'').replace(mark,'').trim();
    card.querySelector('.strip-card-area')!.textContent=mark?`${mark} · ${areaName}`:areaName;
    card.querySelector('.strip-card-title')!.textContent=panel.querySelector('h2')?.textContent??'';
    card.querySelector('.strip-card-subtitle')!.textContent=panel.querySelector('.project-subtitle')?.textContent??'';
    // The same painting the project's makimono carries, on its paper tone; the old SVG only as a fallback.
    const painting=makimonoIllustration(slug),art=painting??panel.querySelector('svg.project-art')?.cloneNode(true);
    const artBox=card.querySelector<HTMLElement>('.strip-card-art')!;artBox.replaceChildren(...(art?[art]:[]));
    artBox.style.setProperty('--art-paper',(MAKIMONO_STYLES[slug]??DEFAULT_STYLE).paper);artBox.classList.toggle('is-painting',!!painting);
    card.querySelector<HTMLElement>('[data-studio]')!.dataset.studio=slug;
    card.hidden=false;
    card.style.left=`${Math.min(x+22,innerWidth-card.offsetWidth-16)}px`;
    card.style.top=`${Math.max(84,Math.min(y-70,innerHeight-card.offsetHeight-90))}px`;
  });
  card?.addEventListener('mouseleave',()=>{if(!journey.hoverSlug||journey.hoverSlug!==card.querySelector<HTMLElement>('[data-studio]')?.dataset.studio)hideCard();});
  function openProject(slug:string,push=true,source?:HTMLElement) {
    const panel=panels.find(p=>p.dataset.slug===slug);if(!panel)return;
    readingControl?.setEnabled(false);
    jump(panels.indexOf(panel));
    // Direct navigation settles immediately before preserving the journey.
    if(!pinned){viewport.scrollLeft=offsets[panels.indexOf(panel)];update(distance?viewport.scrollLeft/distance:0);}
    const content=panel.querySelector<HTMLElement>('[data-detail-content]')!.cloneNode(true) as HTMLElement;
    const title=content.querySelector('h2')!;title.id='project-dialog-title';
    // Prefer a name's CamelCase boundaries before falling back to narrow-screen wrapping.
    const titleParts=(title.textContent??'').split(/(?<=[a-z])(?=[A-Z])/);
    if(titleParts.length>1){title.replaceChildren();titleParts.forEach((part,index)=>{if(index)title.append(document.createElement('wbr'));title.append(document.createTextNode(part));});}
    content.querySelectorAll<HTMLImageElement>('img[data-src]').forEach(img=>{img.src=img.dataset.src!;});
    document.querySelector('#project-dialog-body')!.replaceChildren(content);
    openedSlug=slug;
    if(push)history.pushState({csDetail:true},'',`#proyecto-${slug}`);
    const language=document.querySelector<HTMLAnchorElement>('#detail-language');
    if(language)language.href=`/${locale==='es'?'en':'es'}/#proyecto-${slug}`;
    if(rollingUp){detailToken++;rollingUp=false;stopScrollMotion();unrollDetail(null);}
    else if(!projectDialog.open) {
      // in the studio the detail rises from the open makimono on the table itself.
      const fromTable=source?.id==='studio-hit';
      const action=fromTable?source!:panel.querySelector<HTMLElement>('.parchment-action');const rect=source?action?.getBoundingClientRect():undefined;
      if(action&&rect&&rect.width>0&&!journey.quiet) {
        // Let the project's own scroll roll shut before the scene pauses behind the dialog.
        if(!fromTable){setClosingSlug(slug);action.dataset.rolled='';}
        const token=++detailToken;
        window.setTimeout(()=>{if(token!==detailToken||projectDialog.open)return;show(projectDialog);unrollDetail(action.getBoundingClientRect());sheet.scrollTop=0;},fromTable?0:260);
      } else {show(projectDialog);unrollDetail(null);}
    }
    sheet.scrollTop=0;
    readingControl?.refresh();
    // Replacing the content of an already open, settled dialog has no reveal.
    if(projectDialog.open&&!rollingUp&&scrollMotion.every(animation=>animation.playState==='finished'))readingControl?.setEnabled(true);
  }
  function closeProject() {
    if(history.state?.csDetail){history.back();return;}
    history.replaceState(null,'',location.pathname+location.search);openedSlug='';finish(projectDialog);
  }
  function route() {
    const loader=document.documentElement.dataset.loader;
    if(loader&&loader!=='done')return;
    const hash=decodeURIComponent(location.hash);
    const slug=hash.startsWith('#proyecto-')?hash.slice(10):'';
    if(slug){if(!(projectDialog.open&&openedSlug===slug))openProject(slug,false);}
    else {
      if(projectDialog.open){openedSlug='';finish(projectDialog);}
      if(hash!=='#estudio'&&journey.mode==='studio')exitStudio(true);
      if(hash==='#estudio'&&journey.mode==='garden')enterStudio(journey.activeSlug||panels[1].dataset.slug!,false);
      if(hash==='#inicio')jump(0);if(hash==='#enfoque')jump(17);
    }
  }
  window.addEventListener('popstate',route);window.addEventListener('hashchange',route);
  document.addEventListener('click',event=>{
    const el=(event.target as HTMLElement).closest<HTMLElement>('[data-go],[data-open],[data-detail],[data-index-go],[data-close],[data-studio],[data-studio-exit]');if(!el)return;
    if(el.dataset.go!==undefined){
      event.preventDefault();
      const target=Number(el.dataset.go);
      // inside the studio, the closing "back to the garden" link walks out of the house.
      if(journey.mode==='studio'&&el.closest('.closing'))exitStudio();
      else if(el.classList.contains('brand')||el.closest('.main-nav'))travelTo(target,{slowTravel:true});
      else if(el.hasAttribute('data-travel'))travelTo(target,{slowTravel:true,animateEntry:true});
      else jump(target);
    }
    if(el.dataset.open){const d=document.getElementById(el.dataset.open) as HTMLDialogElement;show(d);}
    // in the garden every project entry walks into the studio; inside, it opens the detail.
    if(el.dataset.detail){if(journey.mode==='studio')openProject(el.dataset.detail,true,el);else enterStudio(el.dataset.detail);}
    if(el.dataset.studio)enterStudio(el.dataset.studio);
    if(el.hasAttribute('data-studio-exit'))exitStudio();
    if(el.dataset.indexGo){finish(indexDialog);const target=Number(el.dataset.indexGo);if(journey.mode==='garden'&&target>=1&&target<=16)enterStudio(panels[target].dataset.slug!);else jump(target);}
    if(el.hasAttribute('data-close')) {const dialog=el.closest('dialog')!;if(dialog===projectDialog)closeProject();else finish(dialog);}
  });
  dialogs.forEach(dialog=>{
    dialog.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&dialog.open){
        event.preventDefault();event.stopPropagation();
        if(dialog===projectDialog)closeProject();else finish(dialog);return;
      }
      if(event.key!=='Tab'||!dialog.open||event.altKey||event.ctrlKey||event.metaKey)return;
      const focusable=[...dialog.querySelectorAll<HTMLElement>('button,a[href],input,select,textarea,[tabindex]')]
        .filter(el=>el.tabIndex>=0&&!el.matches(':disabled')&&!el.closest('[inert],[hidden]')&&el.getClientRects().length>0);
      const first=focusable[0],last=focusable.at(-1);
      if(!first)return;
      if(dialog===projectDialog&&reader.hasAttribute('data-paper-moving')) {
        event.preventDefault();dialog.querySelector<HTMLElement>('[data-close]')?.focus({preventScroll:true});return;
      }
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    });
    dialog.addEventListener('cancel',event=>{event.preventDefault();if(dialog===projectDialog)closeProject();else finish(dialog);});
    // Without recent user activation the browser closes the dialog despite preventDefault;
    // the journey must still resume and the project's scroll unroll again.
    dialog.addEventListener('close',()=>{
      if(!journey.paused||dialogs.some(d=>d.open))return;
      if(dialog===projectDialog){detailToken++;rollingUp=false;stopScrollMotion();openedSlug='';}
      release(dialog);
    });
    dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom){if(dialog===projectDialog)closeProject();else finish(dialog);}});
  });
  const search=document.querySelector<HTMLInputElement>('#project-search')!;
  const area=document.querySelector<HTMLSelectElement>('#area-filter')!;
  const tech=document.querySelector<HTMLSelectElement>('#tech-filter')!;
  const entries=[...document.querySelectorAll<HTMLElement>('[data-index-item]')];
  const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  function filter() {
    const query=normalize(search.value.trim());let count=0;
    entries.forEach(entry=>{const match=normalize(entry.dataset.search!).includes(query)&&(!area.value||entry.dataset.area===area.value)&&(!tech.value||(JSON.parse(entry.dataset.tech!) as string[]).includes(tech.value));entry.hidden=!match;if(match)count++;});
    document.querySelector('#index-count')!.textContent=`${count} ${count===1?(locale==='es'?'proyecto':'project'):t.results}`;document.querySelector<HTMLElement>('#index-empty')!.hidden=count>0;
  }
  search.addEventListener('input',filter);area.addEventListener('change',filter);tech.addEventListener('change',filter);
  document.querySelector('#clear-filters')!.addEventListener('click',()=>{search.value='';area.value='';tech.value='';filter();search.focus();});
  document.querySelector('#copy-link')!.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(new URL(`#proyecto-${openedSlug}`,location.href).href);notify(t.copied);}catch{notify(locale==='es'?'Copia el enlace desde la barra de direcciones.':'Copy the link from the address bar.');}});
  initAudio(locale,notify);applyMotion();
  // This enhancement loads independently: a failed cord module leaves the
  // original scrollbar available and does not stop the garden navigation.
  let redThread:import('./red-thread-scrollbar').RedThreadControl|undefined;
  void import('./red-thread-scrollbar').then(({initRedThreadScrollbar})=>{
    if(!viewport.isConnected)return;
    redThread=initRedThreadScrollbar({
      desktop,available:()=>distance>0,cancel:cancelTravel,
      seek:(value,animated)=>{
        if(animated)travelProgress(value);
        else {cancelTravel();applyProgress(value,true);}
      },
      valueText:()=>{
        const index=journey.activePanel;
        return index===0?t.home:index===17?t.approach:`${index} / 16 · ${panels[index].querySelector('h2')?.textContent||''}`;
      },
    });
  }).catch(()=>document.documentElement.classList.remove('red-thread-ready'));
  import.meta.hot?.dispose(()=>{redThread?.destroy();paperPhysics.destroy();readingControl?.destroy();});
  if(document.documentElement.dataset.loader&&document.documentElement.dataset.loader!=='done')document.addEventListener('codesentry:loader-done',route,{once:true});
  else requestAnimationFrame(route);
  // Exposes only public journey state for the browser's visual inspection.
  Object.assign(window,{codeSentryJourney:{get progress(){return journey.progress;},get panel(){return active;},jump}});
}
