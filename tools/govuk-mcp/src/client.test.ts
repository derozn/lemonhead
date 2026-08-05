import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { changesSince, HttpGovukContentClient } from './client.ts';
import { buildServer } from './server.ts';

const fixturePath = join(dirname(fileURLToPath(import.meta.url)), 'fixtures/free-childcare.json');
const contentFixture: unknown = JSON.parse(readFileSync(fixturePath, 'utf8'));

function fakeFetch(payload: unknown, status = 200): typeof fetch {
  return () => Promise.resolve(new Response(JSON.stringify(payload), { status }));
}

describe('HttpGovukContentClient', () => {
  it('maps Content API JSON to a cited, structured shape', async () => {
    const client = new HttpGovukContentClient(fakeFetch(contentFixture));
    const content = await client.getContent('/free-childcare-if-working');
    expect(content.url).toBe('https://www.gov.uk/free-childcare-if-working');
    expect(content.publicUpdatedAt).toBe('2026-04-06T09:00:00Z');
    expect(content.parts.map((part) => part.slug)).toEqual([
      'check-youre-eligible',
      'what-youll-get',
    ]);
    expect(content.parts[0]?.bodyHtml).toContain('£2,643.68');
    expect(content.changeHistory).toHaveLength(2);
  });

  it('maps Search API results with absolute URLs', async () => {
    const client = new HttpGovukContentClient(
      fakeFetch({
        results: [
          {
            title: 'Tax-Free Childcare',
            link: '/tax-free-childcare',
            public_timestamp: '2026-05-01T00:00:00Z',
          },
        ],
      }),
    );
    const results = await client.search('childcare');
    expect(results[0]?.url).toBe('https://www.gov.uk/tax-free-childcare');
    expect(results[0]?.publicTimestamp).toBe('2026-05-01T00:00:00Z');
  });

  it('throws on non-OK responses with the URL named', async () => {
    const client = new HttpGovukContentClient(fakeFetch({}, 404));
    await expect(client.getContent('nope')).rejects.toThrow(/404.*nope/);
  });

  it('rejects malformed API payloads (schema-validated boundary)', async () => {
    const client = new HttpGovukContentClient(fakeFetch({ unexpected: true }));
    await expect(client.getContent('x')).rejects.toThrow();
  });
});

describe('changesSince', () => {
  it('compares ISO date-only strings against full timestamps correctly', async () => {
    const client = new HttpGovukContentClient(fakeFetch(contentFixture));
    const content = await client.getContent('free-childcare-if-working');
    expect(changesSince(content, '2026-08-05')).toHaveLength(0);
    expect(changesSince(content, '2026-01-01').map((change) => change.note)).toEqual([
      'Earnings thresholds updated for the 2026 to 2027 tax year.',
    ]);
    expect(changesSince(content, '2024-01-01')).toHaveLength(2);
  });
});

describe('buildServer', () => {
  it('constructs with the three read-only tools registered', () => {
    const server = buildServer(new HttpGovukContentClient(fakeFetch(contentFixture)));
    expect(server).toBeDefined();
  });
});
