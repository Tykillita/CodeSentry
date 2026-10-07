export const CORD_X = 40;
export const GRIP_INSET = 34;
export const BORE_Y = 7;
const clamp = (n: number, low: number, high: number) => Math.min(high, Math.max(low, n));
const number = (n: number) => Math.round(n * 1000) / 1000;
export type Point = {x: number; y: number};
export type ReaderLayout = {
  height: number; gap: number; bow: number; maxGripX: number;
  topOffset: number; bottomOffset: number; topRadius: number; bottomRadius: number;
};
export type ReaderPose = {nodes: readonly number[]; x: number; angle: number};
export type ReaderBounds = {top: number; bottom: number};

export function readerLayout(input: {
  height: number; paperWidth: number; viewportWidth: number;
  topCenter: number; bottomCenter: number; topRadius: number; bottomRadius: number;
}): ReaderLayout {
  const compact = input.viewportWidth < 1100;
  const gap = compact ? 3 : 10, bow = compact ? .4 : 1;
  // Bound the entire wooden silhouette, including its maximum nine-degree tilt.
  const radius = 7 * Math.cos(Math.PI / 20) + 15 * Math.sin(Math.PI / 20);
  const cordRight = (input.viewportWidth + input.paperWidth) / 2 + gap;
  return {
    height: input.height, gap, bow,
    maxGripX: clamp(input.viewportWidth - 2 - cordRight - radius - bow, 0, 6),
    topOffset: input.topCenter, bottomOffset: input.bottomCenter - input.height,
    topRadius: input.topRadius, bottomRadius: input.bottomRadius,
  };
}

export function anchorBounds(layout: ReaderLayout, bounds?: ReaderBounds | null) {
  return {top: (bounds?.top ?? 0) + layout.topOffset, bottom: (bounds?.bottom ?? layout.height) + layout.bottomOffset};
}
export function gripPosition(layout: ReaderLayout, progress: number, bounds?: ReaderBounds | null) {
  const {top, bottom} = anchorBounds(layout, bounds), span = bottom - top;
  return span <= GRIP_INSET * 2 ? (top + bottom) / 2 : top + GRIP_INSET + clamp(progress, 0, 1) * (span - GRIP_INSET * 2);
}
export function readingProgress(layout: ReaderLayout, y: number, offset = 0) {
  const {top, bottom} = anchorBounds(layout);
  return clamp((y - offset - top - GRIP_INSET) / Math.max(1, bottom - top - GRIP_INSET * 2), 0, 1);
}

type Segment = {a: Point; b: Point; c: Point; d: Point};
function segments(points: Point[]): Segment[] {
  // Treat x as a function of y. Linear y control points prevent loops where
  // closely spaced drilled-hole guides meet the more widely spaced masses.
  const slopes = points.map((_, i) => {
    if (!i || i === points.length - 1) return 0;
    return (points[i + 1].x - points[i - 1].x) / Math.max(.001, points[i + 1].y - points[i - 1].y);
  });
  return points.slice(1).map((d, i) => {
    const a = points[i], dy = (d.y - a.y) / 3;
    return {a, b: {x: a.x + slopes[i] * dy, y: a.y + dy}, c: {x: d.x - slopes[i + 1] * dy, y: d.y - dy}, d};
  });
}
function path(curves: Segment[]) {
  if (!curves.length) return '';
  let result = `M${number(curves[0].a.x)} ${number(curves[0].a.y)}`;
  for (const {b, c, d} of curves) result += `C${number(b.x)} ${number(b.y)} ${number(c.x)} ${number(c.y)} ${number(d.x)} ${number(d.y)}`;
  return result;
}
function fibres(curves: Segment[]) {
  let light = '', dark = '', length = 0, previous: Point | undefined;
  for (const {a, b, c, d} of curves) {
    const steps = Math.max(1, Math.ceil(Math.hypot(d.x - a.x, d.y - a.y) / 2));
    for (let i = 0; i <= steps; i++) {
      if (i === 0 && previous) continue;
      const t = i / steps, q = 1 - t;
      const x = q ** 3 * a.x + 3 * q * q * t * b.x + 3 * q * t * t * c.x + t ** 3 * d.x;
      const y = q ** 3 * a.y + 3 * q * q * t * b.y + 3 * q * t * t * c.y + t ** 3 * d.y;
      const dx = 3 * (q * q * (b.x - a.x) + 2 * q * t * (c.x - b.x) + t * t * (d.x - c.x));
      const dy = 3 * (q * q * (b.y - a.y) + 2 * q * t * (c.y - b.y) + t * t * (d.y - c.y));
      if (previous) length += Math.hypot(x - previous.x, y - previous.y);
      const magnitude = Math.max(.001, Math.hypot(dx, dy));
      const twist = Math.sin(length * Math.PI * 2 / 6.5) * .72;
      const command = previous ? 'L' : 'M';
      light += `${command}${number(x + dy / magnitude * twist)} ${number(y - dx / magnitude * twist)}`;
      dark += `${command}${number(x - dy / magnitude * twist)} ${number(y + dx / magnitude * twist)}`;
      previous = {x, y};
    }
  }
  return {light, dark};
}

export function readerGeometry(layout: ReaderLayout, progress: number, pose: ReaderPose, bounds?: ReaderBounds | null) {
  const {top, bottom} = anchorBounds(layout, bounds), span = Math.max(0, bottom - top);
  const y = gripPosition(layout, progress, bounds);
  const position = clamp((y - top) / Math.max(1, span), 0, 1);
  const bow = (u: number) => Math.sin(Math.PI * u) * layout.bow;
  const x = clamp(pose.x, -6, layout.maxGripX) + bow(position);
  const angle = clamp(pose.angle, -9, 9), radians = angle * Math.PI / 180;
  const bore = (localY: number): Point => ({x: CORD_X + x - localY * Math.sin(radians), y: y + localY * Math.cos(radians)});
  const holes = [bore(-BORE_Y), bore(BORE_Y)];
  let points: Point[] = pose.nodes.map((value, i) => {
    const u = i / Math.max(1, pose.nodes.length - 1);
    return {x: CORD_X + ((!i || i === pose.nodes.length - 1) ? 0 : value + bow(u)), y: top + span * u};
  });
  if (span >= GRIP_INSET * 2) {
    points = points.filter((p, i) => !i || i === points.length - 1 || Math.abs(p.y - y) > 18);
    points.push(...holes);points.sort((a, b) => a.y - b.y);
  }
  const curves = segments(points);
  return {
    spine: path(curves), ...fibres(curves), top, bottom, x, y, angle, position, holes,
    gripOpacity: clamp((span - GRIP_INSET * 2) / 24, 0, 1),
    anchorOpacity: clamp((span - 4) / 20, 0, 1),
  };
}

export function anchorWrap(radius: number) {
  // Two turns cross the cylindrical face and meet a knot below the rod.
  const r = Math.max(1, radius);
  return [-2.3, 2.3].map(x => `M${x - 1} ${-r}C${x - 2} ${-r + 2} ${x - 2} ${r - 2} ${x} ${r}C${x + 2} ${r - 2} ${x + 2} ${-r + 2} ${x + 1} ${-r}`).join('');
}
