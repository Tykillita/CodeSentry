const initialQuiet=typeof document!=='undefined'&&document.documentElement.classList.contains('quiet');
export type JourneyMode='garden'|'studio';
export const journey = { progress:0, activePanel:0, activeSlug:'', closingSlug:'', quiet:initialQuiet, paused:false, hidden:false,
  /** garden strips or the studio table; `studio` runs 0→1 while the camera walks into the house. */
  mode:'garden' as JourneyMode, studio:0, hoverSlug:'' };
const listeners=new Set<()=>void>();
const metaListeners=new Set<()=>void>();
export function subscribeJourney(fn:()=>void) { listeners.add(fn); return ()=>{listeners.delete(fn);}; }
export function subscribeMeta(fn:()=>void) { metaListeners.add(fn); return ()=>{metaListeners.delete(fn);}; }
export function setProgress(progress:number) { journey.progress=Math.min(1,Math.max(0,progress)); listeners.forEach(fn=>fn()); }
export function setActivePanel(index:number,slug:string) {
  if(journey.activePanel===index&&journey.activeSlug===slug)return;
  journey.activePanel=index;journey.activeSlug=slug;listeners.forEach(fn=>fn());
}
/** Rolls a project's scroll shut before its detail opens; an empty slug lets it unroll again. */
export function setClosingSlug(slug:string) {
  if(journey.closingSlug===slug)return;
  journey.closingSlug=slug;listeners.forEach(fn=>fn());
}
export function setStudio(mode:JourneyMode,studio:number) {
  if(journey.mode===mode&&journey.studio===studio)return;
  journey.mode=mode;journey.studio=Math.min(1,Math.max(0,studio));listeners.forEach(fn=>fn());
}
export function setHoverSlug(slug:string) {
  if(journey.hoverSlug===slug)return;
  journey.hoverSlug=slug;listeners.forEach(fn=>fn());
}
export function setMeta(patch:Partial<Omit<typeof journey,'progress'|'activePanel'|'activeSlug'|'closingSlug'|'mode'|'studio'|'hoverSlug'>>) {
  Object.assign(journey,patch); metaListeners.forEach(fn=>fn()); listeners.forEach(fn=>fn());
}
export function metaSnapshot() { return `${journey.quiet}:${journey.paused}:${journey.hidden}`; }
