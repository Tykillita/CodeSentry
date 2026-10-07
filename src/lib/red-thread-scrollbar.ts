import gsap from 'gsap';
import { journey, subscribeJourney } from './journey-store';

type Options = {
  desktop: MediaQueryList;
  available: () => boolean;
  seek: (progress: number, animated: boolean) => void;
  cancel: () => void;
  valueText: () => string;
};
export type RedThreadControl = { destroy: () => void };
const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

export function initRedThreadScrollbar(options: Options): RedThreadControl | undefined {
  const root = document.documentElement;
  const host = document.getElementById('red-thread');
  const svg = host?.querySelector<SVGSVGElement>('svg');
  const knot = host?.querySelector<SVGGElement>('[data-thread-knot]');
  const paths = host?.querySelectorAll<SVGPathElement>('[data-thread-path]');
  if (!host || !svg || !knot || !paths?.length) return;
  const events = new AbortController();
  let enabled = false, destroyed = false, ticking = false, resizeFrame = 0;
  let height = 900, progress = journey.progress, previousProgress = progress;
  let x = 0, velocity = 0, drive = 0, motionAt = 0, tickAt = 0, sampleAt = performance.now();
  let pointer: { id: number; startY: number; offset: number; onKnot: boolean; moved: boolean } | undefined;

  const blocked = () => !enabled || journey.paused || journey.hidden || document.hidden || root.dataset.loader !== 'done';
  const maximum = () => Math.max(32, height - 30);
  const tipY = () => 32 + progress * (maximum() - 32);
  const fromY = (clientY: number, offset = 0) => clamp((clientY - host.getBoundingClientRect().top - offset - 32) / Math.max(1, maximum() - 32));

  function render() {
    const y = tipY(), bend = journey.quiet ? 0 : x;
    const d = `M18 0C18 ${(y * .30).toFixed(2)} ${(18 - bend * .4).toFixed(2)} ${(y * .73).toFixed(2)} ${(18 + bend).toFixed(2)} ${y.toFixed(2)}`;
    paths!.forEach(path => path.setAttribute('d', d));
    knot!.setAttribute('transform', `translate(${(18 + bend).toFixed(2)} ${y.toFixed(2)}) rotate(${(bend * 1.3).toFixed(2)})`);
    host!.dataset.progress = progress.toFixed(6);
  }
  function stopTick() {
    if (ticking) gsap.ticker.remove(tick);
    ticking = false; tickAt = 0;
  }
  function tick() {
    const now = performance.now(), dt = Math.min(.032, Math.max(.001, (now - tickAt) / 1000));
    tickAt = now;
    const target = now - motionAt < 100 ? drive : 0;
    velocity += (96 * (target - x) - 18 * velocity) * dt;
    x = clamp(x + velocity * dt, -3, 3);
    if (!target && Math.abs(x) < .02 && Math.abs(velocity) < .04) {
      x = velocity = 0; stopTick();
    }
    render();
  }
  function animate() {
    if (blocked() || journey.quiet) { stopTick(); x = velocity = 0; render(); return; }
    if (!ticking) { ticking = true; tickAt = performance.now(); gsap.ticker.add(tick); }
  }
  function releasePointer() {
    if (pointer && host!.hasPointerCapture(pointer.id)) host!.releasePointerCapture(pointer.id);
    pointer = undefined; delete host!.dataset.dragging;
  }
  function sync() {
    if (destroyed) return;
    const now = performance.now();
    progress = clamp(journey.progress);
    if (progress !== previousProgress) {
      drive = clamp((progress - previousProgress) / Math.max(.016, (now - sampleAt) / 1000) * 6, -3, 3);
      previousProgress = progress; sampleAt = now; motionAt = now;
    }
    const percent = String(Math.round(progress * 1000) / 10);
    if (host!.getAttribute('aria-valuenow') !== percent) host!.setAttribute('aria-valuenow', percent);
    const label = `${Math.round(progress * 100)}% · ${options.valueText()}`;
    if (host!.getAttribute('aria-valuetext') !== label) host!.setAttribute('aria-valuetext', label);
    const disabled = blocked();
    host!.setAttribute('aria-disabled', String(disabled)); host!.tabIndex = disabled ? -1 : 0;
    if (disabled) releasePointer();
    animate();
  }
  function measure() {
    if (destroyed) return;
    enabled = options.desktop.matches && options.available();
    const previousWidth = root.clientWidth;
    root.classList.toggle('red-thread-ready', enabled);
    // Removing a classic scrollbar changes the catalogue's available width.
    // Let the existing layout rebuild its offsets before the next interaction.
    if (root.clientWidth !== previousWidth) window.dispatchEvent(new Event('resize'));
    if (enabled) {
      height = Math.max(80, host!.getBoundingClientRect().height);
      svg!.setAttribute('viewBox', `0 0 36 ${height}`);
    } else releasePointer();
    sync();
  }
  function onResize() {
    cancelAnimationFrame(resizeFrame); resizeFrame = requestAnimationFrame(measure);
  }
  function down(event: PointerEvent) {
    if (blocked() || event.button !== 0) return;
    event.preventDefault(); host!.focus({ preventScroll: true }); options.cancel();
    const onKnot = event.target instanceof Element && !!event.target.closest('[data-thread-knot]');
    pointer = { id: event.pointerId, startY: event.clientY, offset: onKnot ? event.clientY - host!.getBoundingClientRect().top - tipY() : 0, onKnot, moved: false };
    host!.setPointerCapture(event.pointerId);
  }
  function move(event: PointerEvent) {
    if (!pointer || pointer.id !== event.pointerId || blocked()) return;
    if (!pointer.moved && Math.abs(event.clientY - pointer.startY) < 2) return;
    pointer.moved = true; host!.dataset.dragging = '';
    options.seek(fromY(event.clientY, pointer.offset), false);
  }
  function up(event: PointerEvent) {
    if (!pointer || pointer.id !== event.pointerId) return;
    const clicked = !pointer.moved && !pointer.onKnot;
    releasePointer();
    if (clicked && !blocked()) options.seek(fromY(event.clientY), true);
  }
  function key(event: KeyboardEvent) {
    if (blocked() || event.altKey || event.ctrlKey || event.metaKey) return;
    const steps: Record<string, number> = { ArrowUp: -.01, ArrowLeft: -.01, ArrowDown: .01, ArrowRight: .01, PageUp: -.10, PageDown: .10 };
    let next: number;
    if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = 1;
    else if (event.key in steps) next = progress + steps[event.key];
    else return;
    event.preventDefault(); event.stopPropagation(); options.seek(clamp(next), false);
  }
  function destroy() {
    if (destroyed) return;
    destroyed = true; releasePointer(); stopTick(); cancelAnimationFrame(resizeFrame);
    events.abort(); unsubscribe(); observer.disconnect(); root.classList.remove('red-thread-ready');
    host!.tabIndex = -1; host!.setAttribute('aria-disabled', 'true');
  }
  const unsubscribe = subscribeJourney(sync);
  const observer = new ResizeObserver(onResize);
  observer.observe(host);
  const signal = events.signal;
  host.addEventListener('pointerdown', down, { signal });
  host.addEventListener('pointermove', move, { signal });
  host.addEventListener('pointerup', up, { signal });
  host.addEventListener('pointercancel', releasePointer, { signal });
  host.addEventListener('lostpointercapture', releasePointer, { signal });
  host.addEventListener('keydown', key, { signal });
  options.desktop.addEventListener('change', onResize, { signal });
  window.addEventListener('resize', onResize, { signal });
  window.addEventListener('pagehide', event => { if (!event.persisted) destroy(); else { releasePointer(); stopTick(); } }, { signal });
  window.addEventListener('pageshow', measure, { signal });
  document.addEventListener('codesentry:loader-done', sync, { signal });
  document.addEventListener('astro:before-swap', destroy, { signal });
  try { measure(); } catch { destroy(); return; }
  return { destroy };
}
