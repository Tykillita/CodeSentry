import type { Locale } from '../data/ui';
import { CordDynamics, bounded, PHYSICS_STEP, type PaperGeometry } from './parchment-physics';
import { CORD_X, anchorWrap, gripPosition, readerGeometry, readerLayout, readingProgress } from './scroll-reader-geometry';

type Options = {
  dialog: HTMLDialogElement;
  sheet: HTMLElement;
  locale: Locale;
  isQuiet: () => boolean;
};
export type ScrollReaderControl = {
  refresh: () => void;
  setEnabled: (enabled: boolean) => void;
  destroy: () => void;
  setPaperMotion: (geometry: PaperGeometry | null) => void;
};
const controls = new WeakMap<HTMLDialogElement, ScrollReaderControl>();
const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

/** The sheet owns the scroll position; this control only reads and seeks it. */
export function initScrollReader({dialog, sheet, locale, isQuiet}: Options): ScrollReaderControl | undefined {
  const existing = controls.get(dialog);
  if (existing) return existing;
  const host = dialog.querySelector<HTMLElement>('.scroll-reader-control');
  const art = host?.querySelector<SVGSVGElement>('svg');
  const grip = host?.querySelector<SVGGElement>('[data-reader-grip]');
  const tilt = host?.querySelector<SVGGElement>('[data-reader-tilt]');
  const cord = host?.querySelectorAll<SVGPathElement>('[data-reader-cord]');
  const fibreLight = host?.querySelector<SVGPathElement>('[data-reader-fibre="light"]');
  const fibreDark = host?.querySelector<SVGPathElement>('[data-reader-fibre="dark"]');
  const shadowClip = host?.querySelector<SVGRectElement>('[data-reader-shadow-clip]');
  const attachments = dialog.querySelector<SVGSVGElement>('.reader-attachments');
  const anchorTop = attachments?.querySelector<SVGGElement>('[data-reader-anchor="top"]');
  const anchorBottom = attachments?.querySelector<SVGGElement>('[data-reader-anchor="bottom"]');
  const rollers = [...dialog.querySelectorAll<HTMLElement>('.dialog-roller')];
  const content = dialog.querySelector<HTMLElement>('#project-dialog-body');
  if (!host || !art || !grip || !tilt || !cord?.length || !content || !fibreLight || !fibreDark || !shadowClip || !attachments || !anchorTop || !anchorBottom || rollers.length!==2) return;

  const events = new AbortController();
  let enabled = false, destroyed = false, frame = 0, height = 0, maximum = 0, progress = 0;
  const dynamics = new CordDynamics();
  const paper = dialog.querySelector<HTMLElement>('.scroll-reader');
  let motionFrame = 0, motionAt = 0, lastTop = sheet.scrollTop;
  let paperBounds: PaperGeometry | null = null;
  let pointer: { id: number; offset: number; lastY: number } | undefined;
  let layout = readerLayout({height:0,paperWidth:0,viewportWidth:window.innerWidth,topCenter:0,bottomCenter:0,topRadius:0,bottomRadius:0});
  const blocked = () => destroyed || !enabled || !dialog.open || maximum <= 1;
  const yAt = () => gripPosition(layout,progress,paperBounds);

  function stopMotion() {cancelAnimationFrame(motionFrame); motionFrame = 0; motionAt = 0;}
  function animate() {
    if (destroyed || !dialog.open || document.hidden || isQuiet()) {stopMotion();dynamics.reset();return;}
    if (!motionFrame && dynamics.moving) motionFrame = requestAnimationFrame(tick);
  }
  function tick(time: number) {
    motionFrame = 0;
    if (destroyed || !dialog.open || document.hidden || isQuiet()) {stopMotion();dynamics.reset();render();return;}
    dynamics.update(motionAt ? (time - motionAt) / 1000 : PHYSICS_STEP);motionAt = time;
    if(!dynamics.moving&&!pointer&&!paperBounds)dynamics.reset();
    render();
    if (dynamics.moving) {if(!motionFrame)motionFrame = requestAnimationFrame(tick);}else motionAt = 0;
  }

  function render() {
    progress = maximum > 1 ? clamp(sheet.scrollTop / maximum) : 0;
    const delta = sheet.scrollTop - lastTop;lastTop = sheet.scrollTop;
    if (delta && enabled && !paperBounds && !isQuiet()) {dynamics.impulse(delta / Math.max(100, height) * 22);animate();}
    if (isQuiet()) {dynamics.reset();stopMotion();}
    const shape = readerGeometry(layout,progress,{nodes:dynamics.nodes.map(node=>node.value),x:dynamics.grip.value,angle:dynamics.rotation.value},paperBounds);
    const {y,top,bottom}=shape;
    dynamics.position = shape.position;
    cord!.forEach(path => path.setAttribute('d',shape.spine));
    fibreLight!.setAttribute('d',shape.light);fibreDark!.setAttribute('d',shape.dark);
    grip!.setAttribute('transform', `translate(${CORD_X} ${y})`);
    grip!.style.opacity = String(shape.gripOpacity);
    tilt!.setAttribute('transform', `translate(${shape.x} 0) rotate(${shape.angle})`);
    anchorTop!.setAttribute('transform',`translate(${CORD_X} ${top})`);
    anchorBottom!.setAttribute('transform',`translate(${CORD_X} ${bottom}) scale(1 -1)`);
    attachments!.style.opacity=String(shape.anchorOpacity);
    shadowClip!.setAttribute('y',String(paperBounds?.top??0));
    shadowClip!.setAttribute('height',String(Math.max(0,(paperBounds?.bottom??height)-(paperBounds?.top??0))));
    paper?.style.setProperty('--paper-edge', String(Math.abs(dynamics.edge.value)));
    host!.style.setProperty('--reader-y', `${y}px`);
    host!.dataset.progress = progress.toFixed(6);
    const percent = Math.round(progress * 1000) / 10;
    const text = locale === 'es' ? `${Math.round(percent)}% leído` : `${Math.round(percent)}% read`;
    host!.setAttribute('aria-valuenow', String(percent));
    host!.setAttribute('aria-valuetext', text);
    host!.dataset.cordPhysics = JSON.stringify({nodes:18,x:dynamics.grip.value,angle:dynamics.rotation.value,running:!!motionFrame||dynamics.moving,top,bottom});
    host!.dataset.readerGeometry=JSON.stringify({gap:layout.gap,maxX:layout.maxGripX,visualX:shape.x,y,holes:shape.holes,top,bottom});
  }
  function releasePointer() {
    const captured = pointer;
    pointer = undefined;
    if (captured && host!.hasPointerCapture(captured.id)) host!.releasePointerCapture(captured.id);
    delete host!.dataset.dragging;
    dynamics.release();
    if (!destroyed) {animate();render();}
  }
  function refresh() {
    if (destroyed) return;
    maximum = Math.max(0, sheet.scrollHeight - sheet.clientHeight);
    const sheetStyle=getComputedStyle(sheet);
    height = Number.parseFloat(sheetStyle.height) || sheet.clientHeight;
    const rollerStyles=rollers.map(roller=>getComputedStyle(roller));
    const radii=rollerStyles.map((style,i)=>(Number.parseFloat(style.height)||rollers[i].offsetHeight)/2);
    const dialogHeight=Number.parseFloat(getComputedStyle(dialog).height)||height;
    const readerOffset=paper?.offsetTop??0;
    layout=readerLayout({
      height,paperWidth:Number.parseFloat(sheetStyle.width)||sheet.offsetWidth,
      viewportWidth:window.innerWidth,
      // offsetTop rounds fractional short-sheet heights to whole pixels.
      topCenter:(Number.parseFloat(rollerStyles[0].top)||0)+radii[0]-readerOffset,
      bottomCenter:dialogHeight-(Number.parseFloat(rollerStyles[1].bottom)||0)-radii[1]-readerOffset,
      topRadius:radii[0],bottomRadius:radii[1],
    });
    const visible = dialog.open && height > 0 && maximum > 1;
    if (!visible && document.activeElement === host) sheet.querySelector<HTMLElement>('button, a[href]')?.focus({preventScroll: true});
    host!.hidden = !visible;
    attachments!.toggleAttribute('data-reader-hidden',!visible);
    art!.setAttribute('viewBox', `0 0 44 ${Math.max(48, height)}`);
    attachments!.setAttribute('viewBox', `0 0 44 ${Math.max(48,height)}`);
    [anchorTop!,anchorBottom!].forEach((anchor,i)=>{
      const radius=i?layout.bottomRadius:layout.topRadius;
      anchor.querySelectorAll('[data-reader-wrap]').forEach(path=>path.setAttribute('d',anchorWrap(radius)));
      anchor.querySelector('[data-reader-knot]')?.setAttribute('transform',`translate(0 ${radius+2})`);
    });
    shadowClip!.setAttribute('width',String(CORD_X-layout.gap));
    host!.querySelector('.reader-cord-shadow')?.setAttribute('transform',`translate(${-layout.gap-2} 2)`);
    const disabled = blocked();
    host!.setAttribute('aria-disabled', String(disabled));
    host!.tabIndex = disabled ? -1 : 0;
    if (disabled || pointer) releasePointer();
    if (!dialog.open) {dynamics.reset();stopMotion();paperBounds=null;}
    render();
  }
  function scheduleRefresh() {
    if (destroyed || frame) return;
    frame = requestAnimationFrame(() => {frame = 0; refresh();});
  }
  function seek(value: number) {
    sheet.scrollTop = clamp(value, 0, maximum);
    render();
  }
  function fromY(clientY: number, offset = 0) {
    const rect = host!.getBoundingClientRect();
    // Opening transforms scale the dialog. Input is disabled then; this also
    // keeps coordinate mapping correct if an ancestor ever applies a scale.
    const local = (clientY - rect.top) * height / Math.max(1, rect.height);
    return readingProgress(layout,local,offset);
  }
  function down(event: PointerEvent) {
    if (pointer || blocked() || event.button !== 0 || !event.isPrimary) return;
    delete host!.dataset.keyboardFocus;
    host!.dataset.pointerFocus='';
    event.preventDefault(); host!.focus({preventScroll: true});
    maximum = Math.max(0, sheet.scrollHeight - sheet.clientHeight);
    const onGrip = event.target instanceof Element && !!event.target.closest('[data-reader-grip]');
    const rect = host!.getBoundingClientRect();
    const local = (event.clientY - rect.top) * height / Math.max(1, rect.height);
    pointer = {id: event.pointerId, offset: onGrip ? local - yAt() : 0, lastY: event.clientY};
    host!.setPointerCapture(event.pointerId);
    host!.dataset.dragging = '';
    if (!onGrip) seek(fromY(event.clientY) * maximum);
  }
  function move(event: PointerEvent) {
    if (!pointer || pointer.id !== event.pointerId || blocked()) return;
    const rect = host!.getBoundingClientRect();
    const localX=(event.clientX-rect.left)*44/Math.max(1,rect.width);
    dynamics.drive(isQuiet() ? 0 : bounded((localX-CORD_X)*.35,-6,layout.maxGripX),isQuiet() ? 0 : bounded((event.clientY-pointer.lastY)*.65,-9,9));
    animate();
    pointer.lastY = event.clientY;
    seek(fromY(event.clientY, pointer.offset) * maximum);
  }
  function key(event: KeyboardEvent) {
    delete host!.dataset.pointerFocus;
    host!.dataset.keyboardFocus='';
    if (blocked() || event.altKey || event.ctrlKey || event.metaKey) return;
    const steps: Record<string, number> = {ArrowUp: -40, ArrowLeft: -40, ArrowDown: 40, ArrowRight: 40, PageUp: -sheet.clientHeight * .85, PageDown: sheet.clientHeight * .85};
    let next: number;
    if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = maximum;
    else if (event.key in steps) next = sheet.scrollTop + steps[event.key];
    else return;
    event.preventDefault(); event.stopPropagation(); releasePointer(); seek(next);
  }
  function wheel(event: WheelEvent) {
    if (blocked() || event.ctrlKey || !event.deltaY) return;
    event.preventDefault();
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? sheet.clientHeight : 1;
    seek(sheet.scrollTop + event.deltaY * unit);
  }
  function setEnabled(value: boolean) {
    enabled = value;
    refresh();
  }
  function setPaperMotion(value: PaperGeometry | null) {
    paperBounds=value;
    if(host!.hidden){dynamics.reset();stopMotion();render();return;}
    if(value) {dynamics.drive(bounded(value.impulse*.6,-6,6),bounded(value.impulse,-9,9));animate();}
    else {dynamics.release();animate();}
    render();
  }
  function destroy() {
    if (destroyed) return;
    releasePointer(); destroyed = true;
    cancelAnimationFrame(frame);stopMotion();dynamics.reset(); events.abort(); observer.disconnect(); changes.disconnect();
    paper?.style.removeProperty('--paper-edge');
    delete dialog.dataset.readerReady;
    host!.hidden = true; host!.tabIndex = -1; host!.setAttribute('aria-disabled', 'true');
    delete host!.dataset.pointerFocus;
    delete host!.dataset.keyboardFocus;
    attachments!.setAttribute('data-reader-hidden','');
    controls.delete(dialog);
  }
  const signal = events.signal;
  const observer = new ResizeObserver(scheduleRefresh);
  observer.observe(sheet); observer.observe(content);
  const changes = new MutationObserver(scheduleRefresh);
  changes.observe(content, {childList: true, subtree: true});
  sheet.addEventListener('scroll', render, {passive: true, signal});
  content.addEventListener('load', scheduleRefresh, {capture: true, signal});
  host.addEventListener('pointerdown', down, {signal});
  host.addEventListener('pointermove', move, {signal});
  host.addEventListener('pointerup', event => {if (pointer?.id === event.pointerId) releasePointer();}, {signal});
  host.addEventListener('pointercancel', event => {if (pointer?.id === event.pointerId) releasePointer();}, {signal});
  host.addEventListener('lostpointercapture', event => {if (pointer?.id === event.pointerId) releasePointer();}, {signal});
  host.addEventListener('keydown', key, {signal});
  host.addEventListener('focus', () => {
    if(!host!.hasAttribute('data-pointer-focus')&&host!.matches(':focus-visible'))host!.dataset.keyboardFocus='';
  }, {signal});
  host.addEventListener('blur', () => {delete host!.dataset.pointerFocus;delete host!.dataset.keyboardFocus;}, {signal});
  host.addEventListener('wheel', wheel, {passive: false, signal});
  dialog.addEventListener('close', () => {if(!dialog.open)setEnabled(false);}, {signal});
  window.addEventListener('resize', scheduleRefresh, {signal});
  window.addEventListener('pagehide', event => {if (!event.persisted) destroy(); else releasePointer();}, {signal});
  window.addEventListener('pageshow', scheduleRefresh, {signal});
  document.addEventListener('astro:before-swap', destroy, {signal});
  document.fonts.addEventListener('loadingdone', scheduleRefresh, {signal});
  document.addEventListener('visibilitychange',()=>{stopMotion();dynamics.reset();if(!document.hidden)render();},{signal});
  void document.fonts.ready.then(scheduleRefresh);
  const control = {refresh, setEnabled, setPaperMotion, destroy};
  controls.set(dialog, control);
  dialog.dataset.readerReady = '';
  refresh();
  return control;
}
