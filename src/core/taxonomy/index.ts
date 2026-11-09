import { SEED_TREE, type SeedNode } from './data.ts';
import type { ExtraTaxon, NodeRank, RegionCode, RegionSetting, TaxonNode } from './types.ts';

export * from './types.ts';

export interface Taxonomy {
  rootId: string;
  nodes: ReadonlyMap<string, TaxonNode>;
  /** Lower-cased scientific names, synonyms and match names → node id. */
  nameIndex: ReadonlyMap<string, string>;
  /** Top-level group (child of the root) for every node; the root maps to itself. */
  topGroupOf: ReadonlyMap<string, string>;
  depthOf: ReadonlyMap<string, number>;
}

export function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function normalizeName(name: string): string {
  return name.replace(/\s+/g, ' ').trim().toLowerCase();
}

function idFor(seed: SeedNode): string {
  if (seed.id) return seed.id;
  if (seed.sci) return slugify(seed.sci);
  return slugify(seed.common);
}

/** Builds lookup structures. Throws on duplicate IDs or ambiguous names (a data bug). */
export function buildTaxonomy(seed: SeedNode = SEED_TREE): Taxonomy {
  const nodes = new Map<string, TaxonNode>();
  const nameIndex = new Map<string, string>();
  const topGroupOf = new Map<string, string>();
  const depthOf = new Map<string, number>();

  const addName = (name: string, id: string) => {
    const key = normalizeName(name);
    const existing = nameIndex.get(key);
    if (existing && existing !== id) {
      throw new Error(`Taxonomy name "${name}" maps to both "${existing}" and "${id}"`);
    }
    nameIndex.set(key, id);
  };

  const visit = (node: SeedNode, parentId: string | null, depth: number, topGroup: string | null) => {
    const id = idFor(node);
    if (nodes.has(id)) throw new Error(`Duplicate taxonomy id "${id}"`);
    const taxon: TaxonNode = {
      id,
      parentId,
      commonName: node.common,
      scientificName: node.sci ?? null,
      rank: node.rank as NodeRank,
      matchNames: node.match ?? [],
      synonyms: node.syn ?? [],
      regions: node.regions ?? [],
      domestic: node.domestic ?? false,
      pet: node.pet ?? false,
      childIds: [],
    };
    nodes.set(id, taxon);
    if (parentId) nodes.get(parentId)!.childIds.push(id);
    const group = depth === 0 ? id : depth === 1 ? id : topGroup!;
    topGroupOf.set(id, group);
    depthOf.set(id, depth);
    if (taxon.scientificName) addName(taxon.scientificName, id);
    for (const name of taxon.matchNames) addName(name, id);
    for (const name of taxon.synonyms) addName(name, id);
    for (const child of node.children ?? []) visit(child, id, depth + 1, group);
  };

  visit(seed, null, 0, null);
  return { rootId: idFor(seed), nodes, nameIndex, topGroupOf, depthOf };
}

let defaultTaxonomy: Taxonomy | null = null;
export function getTaxonomy(): Taxonomy {
  if (!defaultTaxonomy) defaultTaxonomy = buildTaxonomy();
  return defaultTaxonomy;
}

export function isSpecies(node: TaxonNode): boolean {
  return node.childIds.length === 0 && node.rank === 'species';
}

/** True if the species is shown in the given region setting. */
export function speciesInRegion(node: TaxonNode, region: RegionSetting): boolean {
  if (region === 'GLOBAL' || node.domestic || node.pet) return true;
  return node.regions.includes(region as RegionCode);
}

export function ancestorsOf(tax: Taxonomy, id: string, extras?: ReadonlyMap<string, ExtraTaxon>): string[] {
  const result: string[] = [];
  let current: string | null | undefined = extras?.get(id)?.parentId ?? tax.nodes.get(id)?.parentId;
  while (current) {
    result.push(current);
    current = tax.nodes.get(current)?.parentId ?? null;
  }
  return result;
}

export interface TaxonLabel {
  id: string;
  commonName: string;
  scientificName: string | null;
  rank: NodeRank;
  isExtra: boolean;
}

/** Display info for a curated node or a user's extra taxon. */
export function labelFor(
  tax: Taxonomy,
  id: string,
  extras?: ReadonlyMap<string, ExtraTaxon>,
): TaxonLabel | null {
  const node = tax.nodes.get(id);
  if (node) {
    return {
      id,
      commonName: node.commonName,
      scientificName: node.scientificName,
      rank: node.rank,
      isExtra: false,
    };
  }
  const extra = extras?.get(id);
  if (extra) {
    return {
      id,
      commonName: extra.commonName,
      scientificName: extra.scientificName,
      rank: extra.rank,
      isExtra: true,
    };
  }
  return null;
}

export interface SearchHit {
  id: string;
  commonName: string;
  scientificName: string | null;
  rank: NodeRank;
  score: number;
}

/** Simple ranked search over common and scientific names (for manual corrections). */
export function searchTaxa(tax: Taxonomy, query: string, limit = 20): SearchHit[] {
  const q = normalizeName(query);
  if (q.length < 2) return [];
  const hits: SearchHit[] = [];
  for (const node of tax.nodes.values()) {
    if (node.id === tax.rootId) continue;
    const common = node.commonName.toLowerCase();
    const sci = (node.scientificName ?? '').toLowerCase();
    let score = 0;
    if (common === q || sci === q) score = 100;
    else if (common.startsWith(q)) score = 80;
    else if (common.split(/[\s-]/).some((word) => word.startsWith(q))) score = 70;
    else if (sci.startsWith(q)) score = 60;
    else if (common.includes(q)) score = 50;
    else if (sci.includes(q)) score = 40;
    else if (node.synonyms.some((s) => s.toLowerCase().includes(q))) score = 30;
    if (score === 0) continue;
    if (node.rank === 'species') score += 5; // corrections are usually to a species
    hits.push({
      id: node.id,
      commonName: node.commonName,
      scientificName: node.scientificName,
      rank: node.rank,
      score,
    });
  }
  hits.sort((a, b) => b.score - a.score || a.commonName.localeCompare(b.commonName));
  return hits.slice(0, limit);
}
