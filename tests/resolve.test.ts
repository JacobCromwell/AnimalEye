import { test } from 'node:test';
import assert from 'node:assert/strict';

import { getTaxonomy } from '../src/core/taxonomy/index.ts';
import { resolveGuess } from '../src/core/taxonomy/resolve.ts';
import { MOCK_SCENARIOS } from '../supabase/functions/_shared/identification/mock.ts';
import type { TaxonGuess } from '../supabase/functions/_shared/identification/types.ts';

const tax = getTaxonomy();

function guess(scientificName: string, rank: TaxonGuess['rank'], lineage: TaxonGuess['lineage'] = {}): TaxonGuess {
  return { scientificName, commonName: scientificName, rank, confidence: 0.9, lineage, isDomestic: false };
}

test('exact scientific names resolve to the curated node', () => {
  const r = resolveGuess(tax, guess('Lynx rufus', 'species'));
  assert.deepEqual(r, { taxonId: 'lynx-rufus', inTree: true, anchorId: 'lynx-rufus' });
});

test('names are matched case- and whitespace-insensitively', () => {
  assert.equal(resolveGuess(tax, guess('  lynx   RUFUS ', 'species')).taxonId, 'lynx-rufus');
});

test('synonyms and trinomials resolve to the species', () => {
  assert.equal(resolveGuess(tax, guess('Canis lupus familiaris', 'subspecies')).taxonId, 'canis-familiaris');
  assert.equal(resolveGuess(tax, guess('Trachemys scripta elegans', 'subspecies')).taxonId, 'trachemys-scripta');
  assert.equal(resolveGuess(tax, guess('Picoides pubescens', 'species')).taxonId, 'dryobates-pubescens');
});

test('a family-level guess resolves to the family node', () => {
  const r = resolveGuess(tax, guess('Accipitridae', 'family', { class: 'Aves', order: 'Accipitriformes' }));
  assert.equal(r.taxonId, 'accipitridae');
  assert.equal(r.inTree, true);
});

test('"some kind of hawk" becomes an extra branch under Hawks & eagles', () => {
  const r = resolveGuess(
    tax,
    guess('Buteo', 'genus', { class: 'Aves', order: 'Accipitriformes', family: 'Accipitridae', genus: 'Buteo' }),
  );
  assert.equal(r.inTree, false);
  assert.equal(r.anchorId, 'accipitridae');
  assert.equal(r.taxonId, 'x-buteo');
  assert.equal(r.extra?.rank, 'genus');
});

test('a species outside the curated tree hangs off its family', () => {
  const r = resolveGuess(
    tax,
    guess('Bubo scandiacus', 'species', { class: 'Aves', order: 'Strigiformes', family: 'Strigidae', genus: 'Bubo' }),
  );
  assert.equal(r.inTree, false);
  assert.equal(r.anchorId, 'strigidae');
});

test('an unknown snake lands in Snakes, not Lizards, via its family', () => {
  const r = resolveGuess(
    tax,
    guess('Lampropeltis getula', 'species', { class: 'Reptilia', order: 'Squamata', family: 'Colubridae' }),
  );
  assert.equal(r.anchorId, 'snakes');
});

test('an unknown whale lands in Marine mammals, not Hoofed mammals', () => {
  const r = resolveGuess(
    tax,
    guess('Eschrichtius robustus', 'species', { class: 'Mammalia', order: 'Artiodactyla', family: 'Eschrichtiidae' }),
  );
  assert.equal(r.anchorId, 'marine-mammals');
});

test('a guess with no known lineage hangs off the root', () => {
  const r = resolveGuess(tax, guess('Mysteria unknownia', 'species'));
  assert.equal(r.anchorId, 'animals');
  assert.equal(r.inTree, false);
});

test('every mock scenario resolves somewhere below the root', () => {
  for (const scenario of MOCK_SCENARIOS) {
    for (const candidate of scenario.candidates) {
      const r = resolveGuess(tax, candidate);
      assert.notEqual(r.anchorId, 'animals', `${candidate.scientificName} fell through to the root`);
    }
  }
});
