import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  createClaudeIdentifier,
  createIdentifierFromEnv,
  createMockIdentifier,
  IdentificationError,
  MOCK_SCENARIOS,
  parseIdentificationResult,
} from '../supabase/functions/_shared/identification/index.ts';

const FAKE_KEY = 'test-key-not-real';
const image = { imageBase64: 'aGVsbG8=', mediaType: 'image/jpeg' as const };

function fakeFetch(status: number, body: unknown, capture?: { url?: string; init?: RequestInit }): typeof fetch {
  return (async (url: string | URL | Request, init?: RequestInit) => {
    if (capture) {
      capture.url = String(url);
      capture.init = init;
    }
    return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;
}

const toolResponse = (input: unknown) => ({
  content: [
    { type: 'text', text: 'Here you go.' },
    { type: 'tool_use', id: 'toolu_1', name: 'report_identification', input },
  ],
});

test('validation accepts snake_case, clamps confidence, and caps candidates', () => {
  const result = parseIdentificationResult({
    is_animal: true,
    is_real_photo: true,
    contains_people: false,
    inappropriate: false,
    candidates: [
      { scientific_name: ' Felis   catus ', common_name: 'House cat', rank: 'species', confidence: 97, lineage: { family: 'Felidae' }, is_domestic: true },
      { scientific_name: 'Lynx rufus', common_name: 'Bobcat', rank: 'species', confidence: 150, lineage: {} },
      { scientific_name: 'Bad', rank: 'not-a-rank', confidence: 0.1 },
      { scientific_name: 'Puma concolor', common_name: 'Cougar', rank: 'species', confidence: -2, lineage: {} },
      { scientific_name: 'Panthera leo', common_name: 'Lion', rank: 'species', confidence: 0.1, lineage: {} },
    ],
  });
  assert.equal(result.candidates.length, 3);
  assert.equal(result.candidates[0].scientificName, 'Felis catus');
  assert.equal(result.candidates[0].confidence, 0.97);
  assert.equal(result.candidates[0].isDomestic, true);
  assert.equal(result.candidates[1].confidence, 1);
  assert.equal(result.candidates[2].confidence, 0);
});

test('validation rejects responses without isAnimal', () => {
  assert.throws(() => parseIdentificationResult({ candidates: [] }), (e) => e instanceof IdentificationError && e.code === 'bad_response');
  assert.throws(() => parseIdentificationResult('nope'), IdentificationError);
});

test('"animal" with no usable candidate is treated as no animal', () => {
  const result = parseIdentificationResult({ isAnimal: true, candidates: [{ junk: true }] });
  assert.equal(result.isAnimal, false);
  assert.deepEqual(result.candidates, []);
});

test('mock identifier is deterministic and covers every scenario shape', async () => {
  const mock = createMockIdentifier();
  const a = await mock.identify(image);
  const b = await mock.identify(image);
  assert.deepEqual(a, b);
  assert.ok(MOCK_SCENARIOS.some((s) => !s.isAnimal));
  assert.ok(MOCK_SCENARIOS.some((s) => s.containsPeople));
  assert.ok(MOCK_SCENARIOS.some((s) => s.candidates[0]?.rank === 'genus'));
  for (const s of MOCK_SCENARIOS) assert.doesNotThrow(() => parseIdentificationResult(s));
});

test('mock results are copies, not shared references', async () => {
  const mock = createMockIdentifier();
  const a = await mock.identify(image);
  a.candidates.length = 0;
  const b = await mock.identify(image);
  assert.deepEqual(b, await createMockIdentifier().identify(image));
});

test('claude identifier sends the key only in the header and forces the tool', async () => {
  const capture: { url?: string; init?: RequestInit } = {};
  const claude = createClaudeIdentifier({
    apiKey: FAKE_KEY,
    model: 'claude-test',
    fetchImpl: fakeFetch(200, toolResponse({
      is_animal: true, is_real_photo: true, contains_people: false, inappropriate: false,
      candidates: [{ scientific_name: 'Turdus migratorius', common_name: 'American robin', rank: 'species', confidence: 0.9, lineage: { class: 'Aves' } }],
    }), capture),
  });
  const result = await claude.identify(image);
  assert.equal(result.candidates[0].commonName, 'American robin');
  assert.equal(capture.url, 'https://api.anthropic.com/v1/messages');
  const headers = capture.init!.headers as Record<string, string>;
  assert.equal(headers['x-api-key'], FAKE_KEY);
  assert.equal(headers['anthropic-version'], '2023-06-01');
  const body = JSON.parse(String(capture.init!.body));
  assert.ok(!JSON.stringify(body).includes(FAKE_KEY), 'key must not be in the body');
  assert.equal(body.model, 'claude-test');
  assert.deepEqual(body.tool_choice, { type: 'tool', name: 'report_identification' });
  assert.equal(body.messages[0].content[0].source.data, image.imageBase64);
  assert.equal(claude.provider, 'claude');
  assert.equal(claude.model, 'claude-test');
});

test('claude errors are classified and never echo the key', async () => {
  const cases: [number, string, boolean][] = [
    [401, 'provider_auth', false],
    [429, 'provider_rate_limited', true],
    [529, 'provider_unavailable', true],
    [500, 'provider_unavailable', true],
    [400, 'provider_rejected', false],
  ];
  for (const [status, code, retryable] of cases) {
    const claude = createClaudeIdentifier({ apiKey: FAKE_KEY, fetchImpl: fakeFetch(status, { error: { message: `echo ${FAKE_KEY}` } }) });
    await assert.rejects(claude.identify(image), (e: unknown) => {
      assert.ok(e instanceof IdentificationError);
      assert.equal(e.code, code);
      assert.equal(e.retryable, retryable);
      assert.ok(!e.message.includes(FAKE_KEY));
      return true;
    });
  }
});

test('claude response without the tool call is a bad response', async () => {
  const claude = createClaudeIdentifier({ apiKey: FAKE_KEY, fetchImpl: fakeFetch(200, { content: [{ type: 'text', text: 'a cat' }] }) });
  await assert.rejects(claude.identify(image), (e: unknown) => e instanceof IdentificationError && e.code === 'bad_response');
});

test('network failures are retryable', async () => {
  const failing = (async () => {
    throw new TypeError('fetch failed');
  }) as unknown as typeof fetch;
  const claude = createClaudeIdentifier({ apiKey: FAKE_KEY, fetchImpl: failing });
  await assert.rejects(claude.identify(image), (e: unknown) => e instanceof IdentificationError && e.retryable);
});

test('registry: defaults to mock, requires a key for claude, rejects unknown providers', () => {
  const env = (vars: Record<string, string>) => (name: string) => vars[name];
  assert.equal(createIdentifierFromEnv(env({})).provider, 'mock');
  assert.equal(createIdentifierFromEnv(env({ IDENTIFIER_PROVIDER: 'CLAUDE', ANTHROPIC_API_KEY: FAKE_KEY })).provider, 'claude');
  assert.throws(() => createIdentifierFromEnv(env({ IDENTIFIER_PROVIDER: 'claude' })), (e) => e instanceof IdentificationError && e.code === 'config');
  assert.throws(() => createIdentifierFromEnv(env({ IDENTIFIER_PROVIDER: 'skynet' })), (e) => e instanceof IdentificationError && e.code === 'config');
  assert.throws(() => createIdentifierFromEnv(env({ IDENTIFIER_PROVIDER: 'http' })), IdentificationError);
  assert.equal(createIdentifierFromEnv(env({ IDENTIFIER_PROVIDER: 'http', IDENTIFIER_HTTP_URL: 'https://example.test/id' })).provider, 'http');
});
