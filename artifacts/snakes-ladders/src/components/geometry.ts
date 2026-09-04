/** Drawing helpers for snakes and ladders, in board cell units. */
import type { Point } from "@/game/board";

const f = (n: number) => n.toFixed(3);

/** Catmull-Rom spline through the points, as an SVG path. */
function smoothPath(pts: Point[]): string {
  if (pts.length < 2) return "";
  let d = `M ${f(pts[0].x)} ${f(pts[0].y)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C ${f(c1.x)} ${f(c1.y)}, ${f(c2.x)} ${f(c2.y)}, ${f(p2.x)} ${f(p2.y)}`;
  }
  return d;
}

export interface SnakeShape {
  path: string;
  head: Point;
  /** Unit vector pointing out of the head, away from the body. */
  facing: Point;
  /** Unit vector across the head. */
  across: Point;
}

/** A wavy body from the head square to the tail square. */
export function snakeShape(head: Point, tail: Point, seed: number): SnakeShape {
  const dx = tail.x - head.x;
  const dy = tail.y - head.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const waves = Math.max(1, Math.round(len / 2.4)) + 0.5;
  const amp = Math.min(0.4, 0.1 + len * 0.05);
  const n = Math.max(10, Math.round(len * 4));
  const phase = seed % 2 === 0 ? 0 : Math.PI;
  const pts: Point[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const off = amp * Math.sin(phase + t * waves * Math.PI * 2) * Math.sin(Math.PI * t);
    pts.push({ x: head.x + dx * t + nx * off, y: head.y + dy * t + ny * off });
  }
  const second = pts[1];
  const fx = head.x - second.x;
  const fy = head.y - second.y;
  const fl = Math.hypot(fx, fy) || 1;
  const facing = { x: fx / fl, y: fy / fl };
  return { path: smoothPath(pts), head, facing, across: { x: -facing.y, y: facing.x } };
}

export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface LadderShape {
  rails: [Segment, Segment];
  rungs: Segment[];
}

export function ladderShape(bottom: Point, top: Point): LadderShape {
  const dx = top.x - bottom.x;
  const dy = top.y - bottom.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  const half = 0.2;
  const rail = (s: number): Segment => ({
    x1: bottom.x + px * s,
    y1: bottom.y + py * s,
    x2: top.x + px * s,
    y2: top.y + py * s,
  });
  const rungs: Segment[] = [];
  const spacing = 0.48;
  for (let d = 0.28; d <= len - 0.28; d += spacing) {
    const cx = bottom.x + ux * d;
    const cy = bottom.y + uy * d;
    rungs.push({ x1: cx - px * half, y1: cy - py * half, x2: cx + px * half, y2: cy + py * half });
  }
  return { rails: [rail(-half), rail(half)], rungs };
}
