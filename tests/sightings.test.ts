import { test } from 'node:test';
import assert from 'node:assert/strict';

import { checkAge } from '../src/core/age.ts';
import { parseCoordinate, parseExifDate, provenanceFromExif } from '../src/core/exif.ts';
import {
  applyCorrection,
  applyIdentification,
  countsForLeaderboard,
  coverFor,
  foundTaxonIds,
  groupByTaxon,
  type Sighting,
  type SightingIdentification,
} from '../src/core/sightings.ts';
import { getTaxonomy } from '../src/core/taxonomy/index.ts';
import { resolveGuess } from '../src/core/taxonomy/resolve.ts';
import { MOCK_SCENARIOS } from '../supabase/functions/_shared/identification/mock.ts';
import type { IdentificationResult } from '../supabase/functions/_shared/identification/types.ts';

const tax = getTaxonomy();
const resolve = (g: Parameters<typeof resolveGuess>[1]) => resolveGuess(tax, g);

function sighting(overrides: Partial<Sighting> = {}): Sighting {
  return {
    id: 's1',
    createdAt: '2026-11-08T12:00:00.000Z',
    photoSource: 'camera',
    observedAt: '2026-11-08T12:00:00.000Z',
    observedAtSource: 'capture',
    location: null,
    locationSource: 'none',
    thumbnailUri: 'data:image/jpeg;base64,AAAA',
    status: 'queued',
    attempts: 0,
    shareWithResearch: false,
    ...overrides,
  };
}

const ident = (result: IdentificationResult): SightingIdentification => ({
  provider: 'mock',
  model: null,
  identifiedAt: '2026-11-08T12:00:01.000Z',
  result,
});

const scenario = (pred: (s: (typeof MOCK_SCENARIOS)[number]) => boolean) =>
  JSON.parse(JSON.stringify(MOCK_SCENARIOS.find(pred)!)) as IdentificationResult;

test('a normal identification lands on the tree with the photo kept', () => {
  const { sighting: s, newExtras } = applyIdentification(
    sighting(),
    ident(scenario((x) => x.candidates[0]?.scientificName === 'Felis catus' && !x.containsPeople)),
    resolve,
  );
  assert.equal(s.status, 'identified');
  assert.equal(s.modelTaxonId, 'felis-catus');
  assert.ok(s.thumbnailUri);
  assert.deepEqual(newExtras, []);
});

test('a genus-level ID creates an extra taxon', () => {
  const { sighting: s, newExtras } = applyIdentification(sighting(), ident(scenario((x) => x.candidates[0]?.rank === 'genus')), resolve);
  assert.equal(s.modelTaxonId, 'x-buteo');
  assert.equal(newExtras[0]?.parentId, 'accipitridae');
});

test('photos with people are discarded but the sighting is kept', () => {
  const { sighting: s } = applyIdentification(sighting(), ident(scenario((x) => x.containsPeople)), resolve);
  assert.equal(s.status, 'identified');
  assert.equal(s.thumbnailUri, null);
  assert.equal(s.photoDiscardedReason, 'contains_people');
});

test('inappropriate photos are rejected and deleted', () => {
  const result: IdentificationResult = { isAnimal: true, isRealPhoto: true, containsPeople: false, inappropriate: true, candidates: [] };
  const { sighting: s } = applyIdentification(sighting(), ident(result), resolve);
  assert.equal(s.status, 'rejected');
  assert.equal(s.thumbnailUri, null);
});

test('no animal → no_animal, nothing on the tree', () => {
  const { sighting: s } = applyIdentification(sighting(), ident(scenario((x) => !x.isAnimal)), resolve);
  assert.equal(s.status, 'no_animal');
  assert.equal(foundTaxonIds([s]).size, 0);
});

test('corrections are stored separately from the model answer', () => {
  const identified = applyIdentification(sighting(), ident(scenario((x) => x.candidates[0]?.scientificName === 'Felis catus' && !x.containsPeople)), resolve).sighting;
  const corrected = applyCorrection(identified, 'lynx-rufus');
  assert.equal(corrected.modelTaxonId, 'felis-catus');
  assert.equal(corrected.userTaxonId, 'lynx-rufus');
  assert.deepEqual([...foundTaxonIds([corrected])], ['lynx-rufus']);
  assert.equal(countsForLeaderboard(identified), true);
  assert.equal(countsForLeaderboard(corrected), false, 'corrected finds do not count');
  assert.equal(applyCorrection(corrected, 'felis-catus').userTaxonId, undefined, 'picking the model answer clears it');
});

test('gallery photos never count toward leaderboards', () => {
  const s = applyIdentification(sighting({ photoSource: 'gallery' }), ident(scenario((x) => x.isAnimal && !x.containsPeople)), resolve).sighting;
  assert.equal(countsForLeaderboard(s), false);
});

test('grouping and cover photos', () => {
  const a = sighting({ id: 'a', status: 'identified', modelTaxonId: 'felis-catus', observedAt: '2026-01-01T00:00:00Z' });
  const b = sighting({ id: 'b', status: 'identified', modelTaxonId: 'felis-catus', observedAt: '2026-06-01T00:00:00Z' });
  const c = sighting({ id: 'c', status: 'identified', modelTaxonId: 'felis-catus', observedAt: '2026-09-01T00:00:00Z', thumbnailUri: null });
  const groups = groupByTaxon([a, b, c]);
  assert.deepEqual(groups.get('felis-catus')!.map((s) => s.id), ['c', 'b', 'a']);
  assert.equal(coverFor('felis-catus', groups, {})?.id, 'b', 'newest with a photo');
  assert.equal(coverFor('felis-catus', groups, { 'felis-catus': 'a' })?.id, 'a', 'user choice wins');
});

test('age screen: conservative around the birth month', () => {
  const now = new Date(2026, 10, 8); // Nov 8 2026
  assert.equal(checkAge(2013, 10, now), 'ok'); // turned 13 in October
  assert.equal(checkAge(2013, 11, now), 'too_young'); // birthday may be later this month
  assert.equal(checkAge(2013, 12, now), 'too_young');
  assert.equal(checkAge(1980, 5, now), 'ok');
  assert.equal(checkAge(2027, 1, now), 'invalid');
  assert.equal(checkAge(2026, 12, now), 'invalid');
  assert.equal(checkAge(1800, 1, now), 'invalid');
  assert.equal(checkAge(2000, 13, now), 'invalid');
});

test('EXIF: Android flat keys with rationals', () => {
  const p = provenanceFromExif({
    DateTimeOriginal: '2026:05:04 07:30:00',
    OffsetTimeOriginal: '-04:00',
    GPSLatitude: '39/1,16/1,3000/100',
    GPSLatitudeRef: 'N',
    GPSLongitude: '77/1,38/1,0/1',
    GPSLongitudeRef: 'W',
  });
  assert.equal(p.takenAt, '2026-05-04T11:30:00.000Z');
  assert.ok(Math.abs(p.location!.latitude - 39.275) < 1e-6);
  assert.ok(Math.abs(p.location!.longitude + 77.633333) < 1e-5);
});

test('EXIF: iOS nested dictionaries with decimal degrees', () => {
  const p = provenanceFromExif({
    '{Exif}': { DateTimeOriginal: '2026:07:01 18:00:00', OffsetTimeOriginal: '+02:00' },
    '{GPS}': { Latitude: 52.52, LatitudeRef: 'N', Longitude: 13.405, LongitudeRef: 'E' },
  });
  assert.equal(p.takenAt, '2026-07-01T16:00:00.000Z');
  assert.deepEqual(p.location, { latitude: 52.52, longitude: 13.405 });
});

test('EXIF: junk and null island are ignored', () => {
  assert.deepEqual(provenanceFromExif(null), {});
  assert.deepEqual(provenanceFromExif({ GPSLatitude: 0, GPSLongitude: 0 }), {});
  assert.deepEqual(provenanceFromExif({ DateTimeOriginal: 'yesterday' }), {});
  assert.equal(parseCoordinate('abc'), undefined);
  assert.equal(parseCoordinate([10, 30, 0]), 10.5);
  assert.equal(parseExifDate('1970:01:01 00:00:00'), undefined);
});
