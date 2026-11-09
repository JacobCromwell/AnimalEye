import { test } from 'node:test';
import assert from 'node:assert/strict';

import { getTaxonomy } from '../src/core/taxonomy/index.ts';
import type { ExtraTaxon, RegionSetting } from '../src/core/taxonomy/types.ts';
import { buildVisibleTree, flattenVisible } from '../src/core/tree/visible.ts';
import { layoutFan, radialLabel } from '../src/core/tree/layout.ts';

const tax = getTaxonomy();

function visible(found: string[], region: RegionSetting = 'GLOBAL', extras: ExtraTaxon[] = [], peek: string[] = []) {
  return buildVisibleTree({
    taxonomy: tax,
    foundIds: new Set(found),
    extras: new Map(extras.map((e) => [e.id, e])),
    region,
    peekIds: new Set(peek),
  });
}

const ids = (root: ReturnType<typeof visible>) => new Set(flattenVisible(root).map((n) => n.id));

test('with no finds the tree is compact: the top-level groups, nothing found', () => {
  const nodes = flattenVisible(visible([]));
  assert.equal(nodes.length, 9, 'root + 8 groups');
  assert.ok(nodes.every((n) => n.depth <= 1));
  assert.ok(nodes.every((n) => n.kind !== 'found'));
  const mammals = nodes.find((n) => n.id === 'mammals')!;
  assert.equal(mammals.kind, 'collapsed');
  assert.ok(mammals.hiddenCount > 50);
});

test('finding a house cat opens its path and reveals its neighbors', () => {
  const root = visible(['felis-catus'], 'NA');
  const all = flattenVisible(root);
  const byId = new Map(all.map((n) => [n.id, n]));
  assert.equal(byId.get('felis-catus')?.kind, 'found');
  assert.equal(byId.get('lynx-rufus')?.kind, 'unfound');
  assert.equal(byId.get('puma-concolor')?.kind, 'unfound');
  assert.equal(byId.has('panthera-leo'), false, 'lions are not neighbors in North America');
  assert.equal(byId.get('felidae')?.kind, 'branch');
  assert.equal(byId.get('canidae')?.kind, 'collapsed', 'sibling families stay collapsed');
  assert.equal(byId.get('mammals')?.foundCount, 1);
});

test('the same find in Europe shows European neighbors', () => {
  const found = ids(visible(['felis-catus'], 'EU'));
  assert.ok(found.has('lynx-lynx'));
  assert.ok(!found.has('lynx-rufus'));
});

test('groups with nothing in the region are hidden unless they hold a find', () => {
  assert.ok(!ids(visible([], 'EU', [], ['mammals'])).has('marsupials'));
  assert.ok(ids(visible([], 'OC', [], ['mammals'])).has('marsupials'));
  // A find from elsewhere is always shown on the user's own tree.
  assert.ok(ids(visible(['phascolarctos-cinereus'], 'EU')).has('phascolarctos-cinereus'));
});

test('extras (finds outside the curated tree) get their own branch', () => {
  const snowyOwl: ExtraTaxon = {
    id: 'x-bubo-scandiacus',
    parentId: 'strigidae',
    commonName: 'Snowy owl',
    scientificName: 'Bubo scandiacus',
    rank: 'species',
  };
  const all = flattenVisible(visible(['x-bubo-scandiacus'], 'GLOBAL', [snowyOwl]));
  const owl = all.find((n) => n.id === 'x-bubo-scandiacus');
  assert.equal(owl?.kind, 'found');
  assert.equal(owl?.isExtra, true);
  assert.equal(owl?.groupId, 'birds');
  assert.ok(all.some((n) => n.id === 'strix-varia' && n.kind === 'unfound'), 'owl neighbors revealed');
});

test('extras that were never found are not drawn', () => {
  const ghost: ExtraTaxon = { id: 'x-ghost', parentId: 'strigidae', commonName: 'Ghost', scientificName: 'Ghost', rank: 'species' };
  assert.ok(!ids(visible([], 'GLOBAL', [ghost])).has('x-ghost'));
});

test('peeking opens a collapsed group without finding anything', () => {
  const all = flattenVisible(visible([], 'GLOBAL', [], ['mammals']));
  assert.equal(all.find((n) => n.id === 'mammals')?.kind, 'branch');
  assert.equal(all.find((n) => n.id === 'carnivores')?.kind, 'collapsed');
  assert.ok(all.every((n) => n.kind !== 'found'));
});

test('fan layout: valid coordinates, evenly spaced leaves, one edge per non-root node', () => {
  for (const found of [[], ['felis-catus', 'turdus-migratorius', 'apis-mellifera']]) {
    const layout = layoutFan(visible(found, 'NA'), { leafSpacing: 70 });
    for (const n of layout.nodes) {
      assert.ok(Number.isFinite(n.x) && Number.isFinite(n.y), `${n.node.id} has NaN`);
      assert.ok(n.x >= 0 && n.x <= layout.width, `${n.node.id} x out of bounds`);
      assert.ok(n.y >= 0 && n.y <= layout.height, `${n.node.id} y out of bounds`);
    }
    assert.equal(layout.edges.length, layout.nodes.length - 1);
    const root = layout.nodes.find((n) => n.node.depth === 0)!;
    assert.deepEqual({ x: root.x, y: root.y }, layout.origin);

    const leaves = layout.nodes.filter((n) => n.node.children.length === 0);
    for (let i = 1; i < leaves.length; i++) {
      const a = leaves[i - 1];
      const b = leaves[i];
      const gap = Math.hypot(a.x - b.x, a.y - b.y);
      // Chord between neighbors at different depths can be a bit shorter than the arc.
      assert.ok(gap >= 70 * 0.6, `leaves ${a.node.id} and ${b.node.id} too close (${gap.toFixed(1)}px)`);
    }
  }
});

test('fan layout: every leaf sits on the outer ring, evenly spaced', () => {
  const layout = layoutFan(visible(['felis-catus', 'x-none'], 'NA'), { leafSpacing: 46 });
  const leaves = layout.nodes.filter((n) => n.isLeaf);
  assert.ok(leaves.every((n) => n.radius === layout.outerRadius));
  for (let i = 1; i < leaves.length; i++) {
    const arc = (leaves[i].angle - leaves[i - 1].angle) * layout.outerRadius;
    assert.ok(arc >= 46 - 0.01, `arc ${arc}`);
  }
});

test('fan layout: the starting tree fits a phone screen', () => {
  const layout = layoutFan(visible([]));
  assert.ok(layout.width < 700, `width ${layout.width}`);
});

test('radial labels never render upside down', () => {
  assert.deepEqual(radialLabel(-Math.PI / 4), { rotation: -45, anchor: 'start', flip: false });
  const left = radialLabel((-3 * Math.PI) / 4);
  assert.equal(left.anchor, 'end');
  assert.ok(Math.abs(left.rotation - 45) < 1e-9);
});
