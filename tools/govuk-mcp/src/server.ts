import { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';

import { changesSince } from './client.ts';
import type { GovukContentClient } from './client.ts';

function asText(payload: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }] };
}

/**
 * Three tools, all read-only, all returning source URL + public_updated_at
 * alongside content. Routing rules live in docs/ai/routing.md: this server is
 * for gov.uk structured content and change history; legislation goes to Lex;
 * arbitrary pages go to native WebFetch.
 */
export function buildServer(client: GovukContentClient): McpServer {
  const server = new McpServer({ name: 'govuk', version: '0.0.0' });

  server.registerTool(
    'govuk_get_content',
    {
      description:
        'Fetch a GOV.UK page as structured JSON: title, per-section parts (slug + HTML body), public_updated_at, and the human-written change history. Use for verify-on-encode research and rule-change triage.',
      inputSchema: z.object({
        path: z
          .string()
          .describe('GOV.UK path, e.g. "free-childcare-if-working" or "tax-free-childcare"'),
      }),
    },
    async ({ path }) => asText(await client.getContent(path)),
  );

  server.registerTool(
    'govuk_search',
    {
      description:
        'Search GOV.UK. Returns titles, URLs, descriptions, and public timestamps. Use to discover which guidance pages exist for a topic before fetching them.',
      inputSchema: z.object({
        keywords: z.string(),
        count: z.number().int().min(1).max(50).optional(),
      }),
    },
    async ({ keywords, count }) => asText(await client.search(keywords, count)),
  );

  server.registerTool(
    'govuk_diff_since',
    {
      description:
        'Change-history entries for a GOV.UK page newer than an ISO date. The workhorse for "has this rule changed since we encoded it": pass the retrievedOn date from the params file citation.',
      inputSchema: z.object({
        path: z.string(),
        sinceIsoDate: z.string().describe('ISO date, e.g. "2026-08-05"'),
      }),
    },
    async ({ path, sinceIsoDate }) => {
      const content = await client.getContent(path);
      return asText({
        url: content.url,
        publicUpdatedAt: content.publicUpdatedAt,
        sinceIsoDate,
        changes: changesSince(content, sinceIsoDate),
      });
    },
  );

  return server;
}
