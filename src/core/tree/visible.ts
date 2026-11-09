// Decides which part of the tree a user sees.
//
// - Only the root is always open, so a new user sees the top-level groups (Mammals,
//   Birds, …) with a count of what's inside each: the "compact" tree.
// - Every ancestor of a find is opened, so the path to the find is drawn, and the find's
//   siblings (its "neighbors") appear as undiscovered silhouettes.
// - A found group-level taxon ("some kind of hawk") is opened too.
// - Groups with nothing in the user's region are hidden unless they hold a find.
// - The user can "peek" into a collapsed group by tapping it.

import { ancestorsOf, speciesInRegion, type Taxonomy } from '../taxonomy/index.ts';
import type { ExtraTaxon, NodeRank, RegionSetting } from '../taxonomy/types.ts';

export type VisibleKind =
  | 'root'
  | 'branch' // an open group
  | 'collapsed' // a closed group, with a count of what's inside
  | 'found' // a species (or group) the user has found
  | 'unfound'; // a neighbor not found yet (silhouette + name)

export interface VisibleNode {
  id: string;
  label: string;
  scientificName: string | null;
  rank: NodeRank;
  kind: VisibleKind;
  depth: number;
  /** Top-level group id, used for coloring. */
  groupId: string;
  isExtra: boolean;
  /** Species in the user's region under a collapsed group. */
  hiddenCount: number;
  /** Distinct finds at or below this node. */
  foundCount: number;
  children: VisibleNode[];
}

export interface VisibleTreeInput {
  taxonomy: Taxonomy;
  foundIds: ReadonlySet<string>;
  extras: ReadonlyMap<string, ExtraTaxon>;
  region: RegionSetting;
  peekIds?: ReadonlySet<string>;
}

export function buildVisibleTree(input: VisibleTreeInput): VisibleNode {
  const { taxonomy: tax, foundIds, extras, region } = input;
  const peekIds = input.peekIds ?? new Set<string>();

  // Extras grouped by the curated node they hang off.
  const extrasByParent = new Map<string, ExtraTaxon[]>();
  for (const extra of extras.values()) {
    if (!foundIds.has(extra.id)) continue;
    const list = extrasByParent.get(extra.parentId) ?? [];
    list.push(extra);
    extrasByParent.set(extra.parentId, list);
  }

  // Nodes on the path to any find.
  const onFoundPath = new Set<string>();
  for (const id of foundIds) {
    for (const ancestor of ancestorsOf(tax, id, extras)) onFoundPath.add(ancestor);
  }

  // Count in-region species below each node (memoized).
  const regionCount = new Map<string, number>();
  const countInRegion = (id: string): number => {
    const cached = regionCount.get(id);
    if (cached !== undefined) return cached;
    const node = tax.nodes.get(id)!;
    let total = 0;
    if (node.childIds.length === 0) total = node.rank === 'species' && speciesInRegion(node, region) ? 1 : 0;
    else for (const child of node.childIds) total += countInRegion(child);
    regionCount.set(id, total);
    return total;
  };

  const foundBelow = new Map<string, number>();
  const countFound = (id: string): number => {
    const cached = foundBelow.get(id);
    if (cached !== undefined) return cached;
    const node = tax.nodes.get(id);
    let total = foundIds.has(id) ? 1 : 0;
    if (node) for (const child of node.childIds) total += countFound(child);
    for (const extra of extrasByParent.get(id) ?? []) total += foundIds.has(extra.id) ? 1 : 0;
    foundBelow.set(id, total);
    return total;
  };

  const build = (id: string, depth: number): VisibleNode => {
    const node = tax.nodes.get(id)!;
    const isFound = foundIds.has(id);
    const isLeaf = node.childIds.length === 0 && !extrasByParent.has(id);
    const open = depth === 0 || onFoundPath.has(id) || (isFound && !isLeaf) || peekIds.has(id);

    let kind: VisibleKind;
    if (depth === 0) kind = 'root';
    else if (isFound) kind = 'found';
    else if (isLeaf) kind = 'unfound';
    else kind = open ? 'branch' : 'collapsed';

    const children: VisibleNode[] = [];
    if (open) {
      for (const childId of node.childIds) {
        const show = countInRegion(childId) > 0 || foundIds.has(childId) || onFoundPath.has(childId);
        if (show) children.push(build(childId, depth + 1));
      }
      for (const extra of extrasByParent.get(id) ?? []) {
        children.push({
          id: extra.id,
          label: extra.commonName,
          scientificName: extra.scientificName,
          rank: extra.rank,
          kind: 'found',
          depth: depth + 1,
          groupId: tax.topGroupOf.get(id)!,
          isExtra: true,
          hiddenCount: 0,
          foundCount: 1,
          children: [],
        });
      }
    }

    return {
      id,
      label: node.commonName,
      scientificName: node.scientificName,
      rank: node.rank,
      kind,
      depth,
      groupId: tax.topGroupOf.get(id)!,
      isExtra: false,
      hiddenCount: open ? 0 : countInRegion(id),
      foundCount: countFound(id),
      children,
    };
  };

  return build(tax.rootId, 0);
}

/** Flattens a visible tree depth-first. */
export function flattenVisible(root: VisibleNode): VisibleNode[] {
  const out: VisibleNode[] = [];
  const walk = (node: VisibleNode) => {
    out.push(node);
    node.children.forEach(walk);
  };
  walk(root);
  return out;
}
