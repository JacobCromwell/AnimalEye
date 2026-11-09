// A free, offline identifier for development. It ignores what's actually in the photo
// and returns a plausible answer picked deterministically from the image bytes, so the
// same photo always gets the same answer. Covers the interesting cases on purpose:
// species-level IDs, a genus-level ID ("some kind of hawk"), an animal that isn't in
// the curated tree, a photo with a person in it, and "no animal found".

import type { IdentificationResult, Identifier, IdentifyRequest, TaxonGuess } from './types.ts';

type Scenario = Omit<IdentificationResult, 'candidates'> & { candidates: TaxonGuess[] };

function guess(
  commonName: string,
  scientificName: string,
  rank: TaxonGuess['rank'],
  confidence: number,
  lineage: TaxonGuess['lineage'],
  isDomestic = false,
): TaxonGuess {
  return { commonName, scientificName, rank, confidence, lineage, isDomestic };
}

const MAMMAL = { phylum: 'Chordata', class: 'Mammalia' };
const BIRD = { phylum: 'Chordata', class: 'Aves' };

const animal = (candidates: TaxonGuess[], extra: Partial<Scenario> = {}): Scenario => ({
  isAnimal: true,
  isRealPhoto: true,
  containsPeople: false,
  inappropriate: false,
  candidates,
  ...extra,
});

export const MOCK_SCENARIOS: readonly Scenario[] = [
  animal([
    guess('House cat', 'Felis catus', 'species', 0.97, { ...MAMMAL, order: 'Carnivora', family: 'Felidae', genus: 'Felis', species: 'Felis catus' }, true),
    guess('Bobcat', 'Lynx rufus', 'species', 0.02, { ...MAMMAL, order: 'Carnivora', family: 'Felidae', genus: 'Lynx', species: 'Lynx rufus' }),
  ]),
  animal([
    guess('Dog', 'Canis familiaris', 'species', 0.96, { ...MAMMAL, order: 'Carnivora', family: 'Canidae', genus: 'Canis', species: 'Canis familiaris' }, true),
    guess('Coyote', 'Canis latrans', 'species', 0.03, { ...MAMMAL, order: 'Carnivora', family: 'Canidae', genus: 'Canis', species: 'Canis latrans' }),
  ]),
  animal([
    guess('American robin', 'Turdus migratorius', 'species', 0.93, { ...BIRD, order: 'Passeriformes', family: 'Turdidae', genus: 'Turdus', species: 'Turdus migratorius' }),
    guess('Eurasian blackbird', 'Turdus merula', 'species', 0.04, { ...BIRD, order: 'Passeriformes', family: 'Turdidae', genus: 'Turdus', species: 'Turdus merula' }),
  ]),
  animal([
    guess('Eastern gray squirrel', 'Sciurus carolinensis', 'species', 0.9, { ...MAMMAL, order: 'Rodentia', family: 'Sciuridae', genus: 'Sciurus', species: 'Sciurus carolinensis' }),
    guess('Fox squirrel', 'Sciurus niger', 'species', 0.08, { ...MAMMAL, order: 'Rodentia', family: 'Sciuridae', genus: 'Sciurus', species: 'Sciurus niger' }),
  ]),
  animal([
    guess('White-tailed deer', 'Odocoileus virginianus', 'species', 0.94, { ...MAMMAL, order: 'Artiodactyla', family: 'Cervidae', genus: 'Odocoileus', species: 'Odocoileus virginianus' }),
  ]),
  animal([
    guess('Mallard', 'Anas platyrhynchos', 'species', 0.95, { ...BIRD, order: 'Anseriformes', family: 'Anatidae', genus: 'Anas', species: 'Anas platyrhynchos' }),
  ]),
  animal([
    guess('Monarch', 'Danaus plexippus', 'species', 0.88, { phylum: 'Arthropoda', class: 'Insecta', order: 'Lepidoptera', family: 'Nymphalidae', genus: 'Danaus', species: 'Danaus plexippus' }),
  ]),
  animal([
    guess('Western honey bee', 'Apis mellifera', 'species', 0.86, { phylum: 'Arthropoda', class: 'Insecta', order: 'Hymenoptera', family: 'Apidae', genus: 'Apis', species: 'Apis mellifera' }),
  ]),
  // Not sure of the species: saved as "some kind of hawk".
  animal([
    guess('Buteo hawks', 'Buteo', 'genus', 0.81, { ...BIRD, order: 'Accipitriformes', family: 'Accipitridae', genus: 'Buteo' }),
    guess('Red-tailed hawk', 'Buteo jamaicensis', 'species', 0.45, { ...BIRD, order: 'Accipitriformes', family: 'Accipitridae', genus: 'Buteo', species: 'Buteo jamaicensis' }),
    guess('Red-shouldered hawk', 'Buteo lineatus', 'species', 0.3, { ...BIRD, order: 'Accipitriformes', family: 'Accipitridae', genus: 'Buteo', species: 'Buteo lineatus' }),
  ]),
  // A real species that isn't in the curated tree: it gets its own branch under Owls.
  animal([
    guess('Snowy owl', 'Bubo scandiacus', 'species', 0.92, { ...BIRD, order: 'Strigiformes', family: 'Strigidae', genus: 'Bubo', species: 'Bubo scandiacus' }),
  ]),
  animal([
    guess('Eastern box turtle', 'Terrapene carolina', 'species', 0.84, { phylum: 'Chordata', class: 'Reptilia', order: 'Testudines', family: 'Emydidae', genus: 'Terrapene', species: 'Terrapene carolina' }),
  ]),
  // A person is in the shot: the sighting is kept, the photo is not.
  animal(
    [guess('Dog', 'Canis familiaris', 'species', 0.9, { ...MAMMAL, order: 'Carnivora', family: 'Canidae', genus: 'Canis', species: 'Canis familiaris' }, true)],
    { containsPeople: true },
  ),
  {
    isAnimal: false,
    isRealPhoto: true,
    containsPeople: false,
    inappropriate: false,
    candidates: [],
    notes: 'Mock: no animal found in this photo.',
  },
];

/** FNV-1a over a sample of the string: fast even for multi-megabyte base64. */
export function hashForMock(text: string): number {
  let hash = 0x811c9dc5;
  const step = Math.max(1, Math.floor(text.length / 4096));
  for (let i = 0; i < text.length; i += step) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  hash ^= text.length;
  return hash >>> 0;
}

export interface MockIdentifierOptions {
  /** Artificial latency so the UI's loading states can be seen. */
  delayMs?: number;
}

export function createMockIdentifier(options: MockIdentifierOptions = {}): Identifier {
  const delayMs = options.delayMs ?? 0;
  return {
    provider: 'mock',
    model: null,
    async identify(request: IdentifyRequest): Promise<IdentificationResult> {
      if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
      const scenario = MOCK_SCENARIOS[hashForMock(request.imageBase64) % MOCK_SCENARIOS.length];
      // Return a deep copy so callers can't mutate the shared table.
      return JSON.parse(JSON.stringify(scenario)) as IdentificationResult;
    },
  };
}
