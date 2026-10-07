export const PHYSICS_STEP = 1 / 120;
export const bounded = (value: number, low = 0, high = 1) => Math.min(high, Math.max(low, value));
export type SpringState = { value: number; velocity: number };
export function stepSpring(state: SpringState, target: number, stiffness: number, damping: number, dt: number) {
  state.velocity += ((target - state.value) * stiffness - state.velocity * damping) * dt;
  state.value += state.velocity * dt;
}
const smooth = (value: number) => {const q = bounded(value); return q * q * (3 - 2 * q);};
type PaperPose = {progress:SpringState;bow:SpringState;ripple:SpringState};

/** Fixed-step, damped modes drive a continuous paper surface, rather than random flutter. */
export class PaperDynamics {
  progress: SpringState;
  bow: SpringState = {value: 0, velocity: 0};
  ripple: SpringState = {value: 0, velocity: 0};
  elapsed = 0;
  private accumulator = 0;
  private started = false;
  readonly opening: boolean;
  readonly delay: number;
  readonly start: number;
  private readonly resuming: boolean;
  constructor(opening: boolean, delay = 0, pose?:PaperPose) {
    this.opening=opening;this.delay=delay;
    this.progress = pose?{...pose.progress}:{value: opening ? 0 : 1, velocity: 0};
    this.start=this.progress.value;this.resuming=!!pose;
    if(pose){this.bow={...pose.bow};this.ripple={...pose.ripple};}
  }
  update(delta: number) {
    this.accumulator += bounded(delta, 0, 1 / 30);
    while (this.accumulator + 1e-9 >= PHYSICS_STEP) {
      this.accumulator -= PHYSICS_STEP; this.elapsed += PHYSICS_STEP;
      if (this.elapsed < this.delay) continue;
      if (!this.started) {this.started = true; this.ripple.velocity += (this.opening ? -155 : 195)*(this.resuming ? .35 : 1);}
      const duration = this.opening ? 2.05 : .78;
      const drive = smooth((this.elapsed - this.delay) / duration);
      stepSpring(this.progress, this.opening ? this.start+(1-this.start)*drive : this.start*(1-drive), 180, 25, PHYSICS_STEP);
      const wave = Math.sin(Math.PI * bounded(this.progress.value));
      stepSpring(this.bow, wave * 48, 78, 13, PHYSICS_STEP);
      stepSpring(this.ripple, Math.sin(drive * Math.PI * 3) * wave * 15, 90, 11, PHYSICS_STEP);
    }
  }
  get reveal() {return bounded(this.progress.value);}
  get pose():PaperPose {return {progress:{...this.progress},bow:{...this.bow},ripple:{...this.ripple}};}
  get complete() {
    const limit = this.opening ? 3.2 : 1.3;
    const near = Math.abs(this.progress.value - (this.opening ? 1 : 0)) < .001;
    const still = Math.abs(this.progress.velocity) < .004 && Math.abs(this.bow.value) < .5 && Math.abs(this.bow.velocity) < 2 && Math.abs(this.ripple.value) < .5 && Math.abs(this.ripple.velocity) < 2;
    return this.elapsed >= limit || (this.elapsed > this.delay + (this.opening ? 2.35 : .92) && near && still);
  }
  private get surfaceScale() {return 48 / Math.max(48,Math.abs(this.bow.value)+Math.abs(this.ripple.value));}
  depth(u: number) {return (this.bow.value * Math.sin(Math.PI * u) + this.ripple.value * Math.sin(Math.PI * 3 * u))*this.surfaceScale;}
  angle(u: number, height: number) {
    const slope = (this.bow.value * Math.PI * Math.cos(Math.PI * u) + this.ripple.value * Math.PI * 3 * Math.cos(Math.PI * 3 * u))*this.surfaceScale / Math.max(1, height);
    return bounded(Math.atan(slope) * 180 / Math.PI, -32, 32);
  }
}

/** Lateral tension travels between 18 masses; both roller attachments remain pinned. */
export class CordDynamics {
  readonly nodes = Array.from({length: 18}, () => ({value: 0, velocity: 0}));
  readonly grip: SpringState = {value: 0, velocity: 0};
  readonly rotation: SpringState = {value: 0, velocity: 0};
  readonly edge: SpringState = {value: 0, velocity: 0};
  private accumulator = 0;
  private target = 0;
  private turn = 0;
  private age = 2;
  position = 0;
  drive(x: number, angle = 0) {this.target = bounded(x, -6, 6); this.turn = bounded(angle, -9, 9); this.age = 0;}
  release() {this.target = this.turn = 0; this.age = 0;}
  impulse(amount: number) {
    const kick = bounded(amount, -28, 28);
    this.grip.velocity = bounded(this.grip.velocity + kick, -55, 55);
    this.rotation.velocity = bounded(this.rotation.velocity + kick * 2, -85, 85);
    this.edge.velocity = bounded(this.edge.velocity + kick, -35, 35);
    this.nodes.forEach((node, i) => {node.velocity += Math.sin(i / 17 * Math.PI) * kick;});
    this.age = 0;
  }
  update(delta: number) {
    this.accumulator += bounded(delta, 0, 1 / 30);
    while (this.accumulator + 1e-9 >= PHYSICS_STEP) {
      this.accumulator -= PHYSICS_STEP; this.age += PHYSICS_STEP;
      stepSpring(this.grip, this.target, 100, 12, PHYSICS_STEP);
      stepSpring(this.rotation, this.turn, 90, 12, PHYSICS_STEP);
      stepSpring(this.edge, 0, 75, 13, PHYSICS_STEP); this.edge.value = bounded(this.edge.value, -4, 4);
      this.grip.value = bounded(this.grip.value, -6, 6); this.rotation.value = bounded(this.rotation.value, -9, 9);
      const forces = this.nodes.map((node, i) => {
        if (i === 0 || i === 17) return 0;
        const distance = i / 17 - this.position;
        const influence = Math.exp(-distance * distance * 100);
        return -node.value * 65 - node.velocity * 13 + (this.nodes[i - 1].value + this.nodes[i + 1].value - 2 * node.value) * 160 + (this.grip.value - node.value) * influence * 210;
      });
      this.nodes.forEach((node, i) => {
        if (i === 0 || i === 17) {node.value = node.velocity = 0; return;}
        node.velocity += forces[i] * PHYSICS_STEP; node.value = bounded(node.value + node.velocity * PHYSICS_STEP, -6, 6);
      });
      if (this.age > 1.2 && this.target === 0 && this.turn === 0) this.reset();
    }
  }
  get moving() {
    return Math.abs(this.grip.value - this.target) > .015 || Math.abs(this.grip.velocity) > .04 || Math.abs(this.rotation.value - this.turn) > .03 || Math.abs(this.rotation.velocity) > .08 || Math.abs(this.edge.value) > .015 || Math.abs(this.edge.velocity) > .04 || this.nodes.some((n, i) => {
      if (!i || i === 17) return false;
      const weight = Math.exp(-Math.pow(i / 17 - this.position, 2) * 100);
      const force = -n.value * 65 + (this.nodes[i - 1].value + this.nodes[i + 1].value - n.value * 2) * 160 + (this.grip.value - n.value) * weight * 210;
      return Math.abs(n.velocity) > .04 || Math.abs(force) > .3;
    });
  }
  reset() {
    this.nodes.forEach(n => {n.value = n.velocity = 0;});
    this.grip.value = this.grip.velocity = this.rotation.value = this.rotation.velocity = 0;
    this.edge.value = this.edge.velocity = 0;
    this.target = this.turn = 0; this.age = 2; this.accumulator = 0;
  }
}

export type PhysicsMotion = { readonly finished: Promise<unknown>; readonly playState: AnimationPlayState; cancel: () => void };
export type PaperGeometry = {top: number; bottom: number; impulse: number};
type PaperOptions = {
  dialog: HTMLDialogElement; reader: HTMLElement; sheet: HTMLElement; rollers: HTMLElement[];
  isQuiet: () => boolean; geometry: (value: PaperGeometry | null) => void;
};

export function createParchmentPhysics({dialog, reader, sheet, rollers, isQuiet, geometry}: PaperOptions) {
  const events = new AbortController();
  let layer: HTMLElement | undefined, bands: HTMLElement[] = [], active: PhysicsMotion | undefined;
  let model: PaperDynamics | undefined, frame = 0, at = 0, destroyed = false, frames = 0, runningTime = 0;
  let interruptedPose:PaperPose|undefined;
  let width = 0, height = 0, savedOpacity = '', savedClip = '', done: ((cancelled: boolean) => void) | undefined;
  const measure = () => {const css = getComputedStyle(sheet); return {width: Number.parseFloat(css.width), height: Number.parseFloat(css.height)};};
  function clearVisuals() {
    cancelAnimationFrame(frame); frame = 0; at = 0;
    layer?.remove(); layer = undefined; bands = [];
    sheet.style.opacity = savedOpacity;sheet.style.clipPath=savedClip;delete reader.dataset.paperMoving;
    rollers.forEach(roller => {roller.style.transform = ''; roller.style.setProperty('--roller-light', '0px');});
    geometry(null);
  }
  function snapshot() {
    const size = measure(); width = size.width; height = size.height; savedOpacity = sheet.style.opacity;savedClip=sheet.style.clipPath;
    const count = window.innerWidth <= 600 ? 12 : 16;
    layer = document.createElement('div'); layer.className = 'paper-physics-screen'; layer.inert = true; layer.setAttribute('aria-hidden', 'true');
    const camera = document.createElement('div'); camera.className = 'paper-physics-camera';
    const mesh = document.createElement('div'); mesh.className = 'paper-physics-mesh'; camera.append(mesh); layer.append(camera);
    layer.style.height = `${height}px`;
    const images = [...sheet.querySelectorAll<HTMLImageElement>('img')].map(img => {const css=getComputedStyle(img);return {width:Number.parseFloat(css.width),height:Number.parseFloat(css.height)};});
    for (let i = 0; i < count; i++) {
      const band = document.createElement('div'); band.className = 'paper-physics-band';
      band.style.height = `${height / count + 1.5}px`;
      const clone = sheet.cloneNode(true) as HTMLElement; clone.classList.add('paper-band-viewport');
      for (const el of [clone, ...clone.querySelectorAll<HTMLElement>('*')]) {
        for (const attr of [...el.attributes]) if (attr.name === 'id' || attr.name === 'name' || attr.name === 'autofocus' || attr.name === 'tabindex' || attr.name.startsWith('on') || ['data-open', 'data-detail'].includes(attr.name)) el.removeAttribute(attr.name);
      }
      clone.querySelectorAll<HTMLImageElement>('img').forEach((img, index) => {
        img.style.width = `${images[index].width}px`; img.style.height = `${images[index].height}px`; img.removeAttribute('data-src');
      });
      Object.assign(clone.style, {width: `${width}px`, height: `${height}px`, maxHeight: `${height}px`, opacity: '1', overflow: 'hidden', transform: `translateY(${-i * height / count}px)`});
      band.append(clone); mesh.append(band); bands.push(band);
    }
    reader.append(layer);
    for (const band of bands) (band.firstElementChild as HTMLElement).scrollTop = sheet.scrollTop;
    reader.dataset.paperMoving = ''; sheet.style.opacity = '0';
  }
  function paint() {
    if (!model || !layer) return;
    const reveal = model.reveal, top = (1 - reveal) * height / 2, bottom = height - top;
    layer.dataset.stage=reveal<.2?'gathered':reveal<.45?'bending':reveal<.9?'curved':'settling';
    layer.style.clipPath = `inset(${top}px -32px ${top}px -32px)`;
    sheet.style.clipPath=`inset(${top}px 0 ${top}px 0)`;
    bands.forEach((band, i) => {
      const u = i / bands.length,next=(i+1)/bands.length,scale=Math.min(1,height/550),z=model!.depth(u)*scale;
      const angle=Math.atan((model!.depth(next)*scale-z)/(height/bands.length))*180/Math.PI;
      band.style.transform = `translate3d(0,${u * height}px,${z}px) rotateX(${angle}deg) scaleY(${1 / Math.cos(angle * Math.PI / 180)})`;
      band.style.setProperty('--band-shade-top',String(Math.abs(model!.angle(u,height/scale))/32*.14));
      band.style.setProperty('--band-shade-bottom',String(Math.abs(model!.angle(next,height/scale))/32*.14));
    });
    rollers.forEach((roller, i) => {
      const y = (i ? -1 : 1) * top;
      roller.style.transform = `translateY(${y}px)`;
      roller.style.setProperty('--roller-light', `${model!.progress.velocity * 7}px`);
    });
    geometry({top, bottom, impulse: model.progress.velocity * 8});
    reader.dataset.paperPhysics = JSON.stringify({phase: model.opening ? 'opening' : 'closing', progress: reveal, bow: model.bow.value, ripple: model.ripple.value, bands: bands.length, frames});
  }
  function tick(time: number) {
    frame = 0;
    if (!model || destroyed || document.hidden) {at = 0; return;}
    if (isQuiet() || !dialog.open) {finish(false); return;}
    const delta = at ? (time - at) / 1000 : PHYSICS_STEP; at = time;
    runningTime+=Math.max(0,delta);
    model.update(delta); frames++; paint();
    if (model.complete||runningTime>=(model.opening?3.2:1.3)) finish(false);
    else frame = requestAnimationFrame(tick);
  }
  function finish(cancelled: boolean) {
    const complete = done; done = undefined;
    if (!model && !layer) return;
    const opening = model?.opening ?? true;
    interruptedPose=cancelled?model?.pose:undefined;
    clearVisuals(); model = undefined; active = undefined;
    reader.dataset.paperPhysics = JSON.stringify({phase: cancelled ? 'cancelled' : 'flat', progress: opening ? 1 : 0, bands: 0, frames,seconds:runningTime});
    complete?.(cancelled);
  }
  function run(opening: boolean, delay = 0): PhysicsMotion {
    finish(true);changes.takeRecords();frames = 0; at = 0;runningTime=0;
    let state: AnimationPlayState = 'running';
    const finished = new Promise<boolean>(resolve => {done = cancelled => {state = cancelled ? 'idle' : 'finished'; resolve(cancelled);};});
    const handle: PhysicsMotion = {finished, get playState() {return state;}, cancel: () => {if(active===handle)finish(true);}};
    model = new PaperDynamics(opening, delay,interruptedPose);interruptedPose=undefined;active = handle;
    if (destroyed || isQuiet() || !CSS.supports('transform-style', 'preserve-3d')) {finish(false); return handle;}
    try {snapshot(); paint(); frame = requestAnimationFrame(tick);} catch {finish(false);}
    return handle;
  }
  function resize() {
    if (!model) return;
    const size = measure();
    if (Math.abs(size.width - width) > .5 || Math.abs(size.height - height) > .5) finish(false);
  }
  const observer = new ResizeObserver(resize); observer.observe(sheet);
  const content = sheet.querySelector('#project-dialog-body');
  const changes = new MutationObserver(() => {if (model) finish(false);});
  if (content) changes.observe(content, {childList: true});
  const signal = events.signal;
  document.addEventListener('visibilitychange', () => {
    cancelAnimationFrame(frame); frame = 0; at = 0;
    if (!document.hidden && model) frame = requestAnimationFrame(tick);
  }, {signal});
  document.fonts.addEventListener('loadingdone', () => {if (model) finish(false);}, {signal});
  sheet.addEventListener('load', event => {
    if (!model || !(event.target instanceof HTMLImageElement)) return;
    const image = event.target.getBoundingClientRect(), box = sheet.getBoundingClientRect();
    if (image.bottom > box.top && image.top < box.bottom) finish(false);
  }, {capture: true, signal});
  dialog.addEventListener('close', () => {if(!dialog.open){finish(true);interruptedPose=undefined;}}, {signal});
  function destroy() {if (destroyed) return; finish(true);interruptedPose=undefined; destroyed = true; events.abort(); observer.disconnect(); changes.disconnect();}
  window.addEventListener('pagehide', event => {if (!event.persisted) destroy();}, {signal});
  document.addEventListener('astro:before-swap', destroy, {signal});
  return {open: (delay = 0) => run(true, delay), close: () => run(false), cancel: () => active?.cancel(), resize, destroy};
}
