import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildTaxonomy, getTaxonomy, searchTaxa, speciesInRegion, ancestorsOf } from '../src/core/taxonomy/index.ts';

test('seed taxonomy builds without duplicate ids or ambiguous names', () => {
  assert.doesNotThrow(() => buildTaxonomy());
});

test('seed taxonomy has a healthy number of species, all placed somewhere', () => {
  const tax = getTaxonomy();
  const species = [...tax.nodes.values()].filter((n) => n.rank === 'species');
  assert.ok(species.length >= 250, `expected at least 250 species, got ${species.length}`);
  for (const s of species) {
    assert.equal(s.childIds.length, 0, `${s.id} should be a leaf`);
    assert.ok(s.regions.length > 0 || s.domestic || s.pet, `${s.id} needs regions`);
    assert.ok(s.scientificName && /^[A-Z][a-z]+ [a-z-]+$/.test(s.scientificName), `${s.id} has a binomial name`);
  }
});

test('groups are never empty leaves', () => {
  const tax = getTaxonomy();
  for (const node of tax.nodes.values()) {
    if (node.rank !== 'species') assert.ok(node.childIds.length > 0, `${node.id} is an empty group`);
  }
});

test('house cat, bobcat and mountain lion are neighbors under Cats', () => {
  const tax = getTaxonomy();
  const cats = tax.nodes.get('felidae');
  assert.ok(cats);
  for (const id of ['felis-catus', 'lynx-rufus', 'puma-concolor']) assert.ok(cats.childIds.includes(id), id);
  assert.deepEqual(ancestorsOf(tax, 'felis-catus'), ['felidae', 'carnivores', 'mammals', 'animals']);
  assert.equal(tax.topGroupOf.get('felis-catus'), 'mammals');
});

test('domestic animals appear in every region; wild ones only in theirs', () => {
  const tax = getTaxonomy();
  const cat = tax.nodes.get('felis-catus')!;
  const bobcat = tax.nodes.get('lynx-rufus')!;
  assert.equal(speciesInRegion(cat, 'OC'), true);
  assert.equal(speciesInRegion(bobcat, 'NA'), true);
  assert.equal(speciesInRegion(bobcat, 'EU'), false);
  assert.equal(speciesInRegion(bobcat, 'GLOBAL'), true);
});

test('search ranks common-name prefix matches first', () => {
  const tax = getTaxonomy();
  const hits = searchTaxa(tax, 'bobc');
  assert.equal(hits[0]?.id, 'lynx-rufus');
  const robin = searchTaxa(tax, 'robin').map((h) => h.id);
  assert.ok(robin.includes('turdus-migratorius'));
  assert.ok(robin.includes('erithacus-rubecula'));
  assert.deepEqual(searchTaxa(tax, 'a'), [], 'single letters return nothing');
});
