// Fan layout (a radial dendrogram over a half-circle): the root sits at the bottom
// center and branches spread upward, like the concept chart. Open groups sit at a
// distance set by their depth; every leaf (a species, a find, or a collapsed group)
// sits on the outer ring, evenly spaced. Leaf labels run outward along each branch,
// so a leaf only needs about a circle's width of arc. That keeps the tree compact.

import type { VisibleNode } from './visible.ts';

export interface LayoutOptions {
  /** Distance in px between neighboring leaves along the outer ring. */
  leafSpacing?: number;
  /** Minimum distance in px between depth levels. */
  minStep?: number;
  /** Fan start/end in degrees; -90 is straight up. */
  startAngleDeg?: number;
  endAngleDeg?: number;
  /** Room around the drawing for labels. */
  padding?: number;
  /** Length of the trunk drawn below the root. */
  trunkLength?: number;
}

export interface LayoutNode {
  node: VisibleNode;
  parentId: string | null;
  x: number;
  y: number;
  /** Radians; -π/2 points straight up. */
  angle: number;
  radius: number;
  isLeaf: boolean;
}

export interface LayoutEdge {
  id: string;
  fromId: string;
  toId: string;
  /** SVG path data (cubic Bézier). */
  d: string;
  depth: number;
  groupId: string;
}

export interface TreeLayout {
  width: number;
  height: number;
  origin: { x: number; y: number };
  trunk: { x1: number; y1: number; x2: number; y2: number };
  step: number;
  outerRadius: number;
  nodes: LayoutNode[];
  edges: LayoutEdge[];
}

const DEG = Math.PI / 180;
const round = (n: number) => Math.round(n * 10) / 10;

export function layoutFan(root: VisibleNode, options: LayoutOptions = {}): TreeLayout {
  const leafSpacing = options.leafSpacing ?? 46;
  const minStep = options.minStep ?? 110;
  const start = (options.startAngleDeg ?? -172) * DEG;
  const end = (options.endAngleDeg ?? -8) * DEG;
  const padding = options.padding ?? 195;
  const trunkLength = options.trunkLength ?? 90;
  const span = end - start;

  // 1. Leaves in depth-first order, and the deepest level shown.
  const leaves: VisibleNode[] = [];
  let maxDepth = 1;
  const collect = (node: VisibleNode) => {
    maxDepth = Math.max(maxDepth, node.depth);
    if (node.children.length === 0) leaves.push(node);
    else node.children.forEach(collect);
  };
  collect(root);

  // 2. Outer ring big enough for every leaf; depth levels evenly spaced inside it.
  const needed = (Math.max(1, leaves.length) * leafSpacing) / span;
  const step = Math.max(minStep, needed / maxDepth);
  const outerRadius = step * maxDepth;

  // 3. Leaf angles (centered in equal slices), then groups at the midpoint of their children.
  const angleOf = new Map<string, number>();
  const slice = span / Math.max(1, leaves.length);
  leaves.forEach((leaf, i) => angleOf.set(leaf.id, start + slice * (i + 0.5)));
  const assign = (node: VisibleNode): number => {
    if (node.children.length === 0) return angleOf.get(node.id)!;
    const childAngles = node.children.map(assign);
    const angle = (childAngles[0] + childAngles[childAngles.length - 1]) / 2;
    angleOf.set(node.id, angle);
    return angle;
  };
  assign(root);
  if (root.children.length === 0) angleOf.set(root.id, -Math.PI / 2);

  // 4. Positions relative to the root at (0, 0).
  const raw: LayoutNode[] = [];
  const place = (node: VisibleNode, parentId: string | null) => {
    const isLeaf = node.children.length === 0 && node.depth > 0;
    const angle = angleOf.get(node.id)!;
    const radius = isLeaf ? outerRadius : node.depth * step;
    raw.push({ node, parentId, angle, radius, isLeaf, x: radius * Math.cos(angle), y: radius * Math.sin(angle) });
    node.children.forEach((child) => place(child, node.id));
  };
  place(root, null);

  let minX = 0;
  let maxX = 0;
  let minY = 0;
  for (const n of raw) {
    minX = Math.min(minX, n.x);
    maxX = Math.max(maxX, n.x);
    minY = Math.min(minY, n.y);
  }
  const offsetX = padding - minX;
  const offsetY = padding - minY;
  const nodes = raw.map((n) => ({ ...n, x: round(n.x + offsetX), y: round(n.y + offsetY) }));
  const origin = { x: round(offsetX), y: round(offsetY) };
  const byId = new Map(nodes.map((n) => [n.node.id, n]));

  // 5. Curved edges: leave the parent along its own angle, arrive along the child's.
  const polar = (radius: number, angle: number) => ({
    x: round(origin.x + radius * Math.cos(angle)),
    y: round(origin.y + radius * Math.sin(angle)),
  });
  const edges: LayoutEdge[] = [];
  for (const child of nodes) {
    if (!child.parentId) continue;
    const parent = byId.get(child.parentId)!;
    const mid = parent.radius + (child.radius - parent.radius) * 0.5;
    const c1 = polar(mid, parent.angle);
    const c2 = polar(mid, child.angle);
    edges.push({
      id: `${parent.node.id}->${child.node.id}`,
      fromId: parent.node.id,
      toId: child.node.id,
      d: `M${parent.x},${parent.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${child.x},${child.y}`,
      depth: child.node.depth,
      groupId: child.node.groupId,
    });
  }

  return {
    width: round(maxX - minX + padding * 2),
    height: round(origin.y + trunkLength + 24),
    origin,
    trunk: { x1: origin.x, y1: origin.y, x2: origin.x, y2: round(origin.y + trunkLength) },
    step,
    outerRadius,
    nodes,
    edges,
  };
}

/** Rotation (degrees) and anchor so a leaf label reads outward along its branch, never upside down. */
export function radialLabel(angle: number): { rotation: number; anchor: 'start' | 'end'; flip: boolean } {
  const degrees = angle / DEG;
  const flip = degrees < -90; // left half: rotate the other way so text isn't upside down
  return { rotation: flip ? degrees + 180 : degrees, anchor: flip ? 'end' : 'start', flip };
}
