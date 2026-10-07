import { initScrollReader } from '../../src/lib/scroll-reader';

const dialog=document.querySelector<HTMLDialogElement>('#project-dialog')!;
const sheet=dialog.querySelector<HTMLElement>('.scroll-sheet')!;
const content=dialog.querySelector<HTMLElement>('#project-dialog-body')!;
const host=dialog.querySelector<HTMLElement>('.scroll-reader-control')!;
const options={dialog,sheet,locale:'es' as const,isQuiet:()=>false};
const control=initScrollReader(options)!;
const history:unknown[]=[];
const settle=()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
const snapshot=()=>({height:sheet.clientHeight,max:sheet.scrollHeight-sheet.clientHeight,top:sheet.scrollTop,hidden:host.hidden,disabled:host.getAttribute('aria-disabled'),tabIndex:host.tabIndex,value:host.getAttribute('aria-valuenow'),native:getComputedStyle(sheet).scrollbarWidth});
const publish=()=>{document.body.dataset.state=JSON.stringify(snapshot());document.body.dataset.history=JSON.stringify(history);};
function short(){content.innerHTML='<h2 id="project-dialog-title">Lectura breve</h2><p>El contenido cabe completo en el papel.</p>';}
function long(){content.innerHTML='<h2 id="project-dialog-title">Lectura continua</h2>'+Array.from({length:24},(_,i)=>`<section style="padding:24px 0;border-top:1px solid #25313633"><h3>Sección ${i+1}</h3><p>Una hoja de papel que se lee de forma continua mientras el cordón conserva la posición.</p></section>`).join('');}
dialog.showModal();long();control.setEnabled(true);
sheet.addEventListener('scroll',publish,{passive:true});
document.getElementById('short')!.addEventListener('click',async()=>{short();await settle();history.push({case:'fits',...snapshot()});publish();});
document.getElementById('long')!.addEventListener('click',async()=>{long();sheet.scrollTop=0;await settle();history.push({case:'overflows',...snapshot()});publish();});
document.getElementById('late')!.addEventListener('click',async()=>{
  short();await settle();history.push({case:'before-image',...snapshot()});publish();
  const figure=document.createElement('figure');figure.className='detail-gallery';
  const image=new Image();image.alt='Superficie de papel para comprobar el tamaño tardío';figure.append(image);content.append(figure);
  image.addEventListener('load',async()=>{await settle();history.push({case:'after-image',...snapshot(),imageReady:image.naturalWidth>0});publish();},{once:true});
  setTimeout(()=>{image.src='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1600"><rect width="800" height="1600" fill="#e8ddc8"/><path d="M40 50H760M40 800H760M40 1550H760" stroke="#6e4a31"/></svg>');},150);
});
document.getElementById('audit')!.addEventListener('click',async()=>{
  long();sheet.scrollTop=0;await settle();
  const duplicate=initScrollReader(options);
  host.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true}));
  const result:Record<string,unknown>={sameInstance:duplicate===control,singleKeyStep:sheet.scrollTop===40};
  const ephemeral=dialog.cloneNode(true) as HTMLDialogElement;
  ephemeral.removeAttribute('open');ephemeral.style.position='fixed';ephemeral.style.top='-10000px';document.body.append(ephemeral);
  const testSheet=ephemeral.querySelector<HTMLElement>('.scroll-sheet')!,testHost=ephemeral.querySelector<HTMLElement>('.scroll-reader-control')!;
  ephemeral.show();
  const test=initScrollReader({dialog:ephemeral,sheet:testSheet,locale:'es',isQuiet:()=>false})!;test.setEnabled(true);
  // Only synthetic touch events mock pointer capture. Real mouse capture and
  // dragging are verified separately through the browser's actual input API.
  const capture=new Set<number>();
  testHost.setPointerCapture=id=>{capture.add(id);};testHost.hasPointerCapture=id=>capture.has(id);testHost.releasePointerCapture=id=>{capture.delete(id);};
  const box=testHost.getBoundingClientRect(),height=testSheet.clientHeight;
  const send=(type:string,id:number,y:number,primary=true)=>testHost.dispatchEvent(new PointerEvent(type,{pointerId:id,pointerType:'touch',isPrimary:primary,button:0,bubbles:true,cancelable:true,clientX:box.left+22,clientY:box.top+y}));
  testSheet.scrollTop=0;test.refresh();
  send('pointerdown',7,24);send('pointermove',7,24+(height-48)*.55);
  result.syntheticTouchMoved=Math.abs(Number(testHost.getAttribute('aria-valuenow'))-55)<.2;
  send('pointerdown',8,24,false);send('lostpointercapture',8,24,false);send('pointercancel',8,24,false);
  result.secondaryTouchIgnored=testHost.hasAttribute('data-dragging')&&capture.has(7)&&!capture.has(8);
  send('pointercancel',7,24);
  result.cancelReleased=!testHost.hasAttribute('data-dragging')&&capture.size===0;
  send('pointerdown',7,24);send('lostpointercapture',7,24);
  result.lostCaptureReleased=!testHost.hasAttribute('data-dragging')&&capture.size===0;
  test.destroy();test.destroy();testSheet.scrollTop=0;
  testHost.dispatchEvent(new KeyboardEvent('keydown',{key:'End',bubbles:true,cancelable:true}));
  result.destroyRemovedEvents=testSheet.scrollTop===0;
  result.destroyRestoredNative=!ephemeral.hasAttribute('data-reader-ready')&&testHost.hidden;
  ephemeral.remove();
  document.body.dataset.audit=JSON.stringify(result);publish();
});
await settle();publish();
