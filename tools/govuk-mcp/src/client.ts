import { z } from 'zod';

/**
 * All GOV.UK HTTP lives behind this interface (the adapter for the announced
 * GDS exploration of a GraphQL replacement: when the Content API changes,
 * this file changes and nothing else does). Every result carries its source
 * URL and public_updated_at — an uncited government fact is a liability.
 *
 * Content API: https://content-api.publishing.service.gov.uk/ (no auth,
 * courtesy limit 10 req/s). Search API:
 * https://docs.publishing.service.gov.uk/repos/search-api/using-the-search-api.html
 */

const ApiChange = z.object({
  note: z.string(),
  public_timestamp: z.string(),
});

const ApiPart = z.object({
  slug: z.string(),
  title: z.string(),
  body: z.string(),
});

const ApiContent = z.object({
  base_path: z.string(),
  title: z.string(),
  document_type: z.string().optional(),
  public_updated_at: z.string().optional(),
  updated_at: z.string().optional(),
  details: z
    .object({
      body: z.string().optional(),
      parts: z.array(ApiPart).optional(),
      change_history: z.array(ApiChange).optional(),
    })
    .optional(),
});

const ApiSearch = z.object({
  results: z.array(
    z.object({
      title: z.string(),
      link: z.string(),
      description: z.string().optional(),
      public_timestamp: z.string().optional(),
    }),
  ),
});

export interface GovukChange {
  note: string;
  publicTimestamp: string;
}

interface GovukPart {
  slug: string;
  title: string;
  bodyHtml: string;
}

export interface GovukContent {
  url: string;
  basePath: string;
  title: string;
  documentType: string | undefined;
  publicUpdatedAt: string | undefined;
  changeHistory: GovukChange[];
  parts: GovukPart[];
  bodyHtml: string | undefined;
}

export interface GovukSearchResult {
  title: string;
  url: string;
  description: string | undefined;
  publicTimestamp: string | undefined;
}

export interface GovukContentClient {
  getContent(path: string): Promise<GovukContent>;
  search(keywords: string, count?: number): Promise<GovukSearchResult[]>;
}

const USER_AGENT = 'lemonhead-govuk-mcp (+https://github.com/derozn/lemonhead)';

export class HttpGovukContentClient implements GovukContentClient {
  private readonly fetchFn: typeof fetch;

  constructor(fetchFn: typeof fetch = fetch) {
    this.fetchFn = fetchFn;
  }

  private async getJson(url: string): Promise<unknown> {
    const response = await this.fetchFn(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!response.ok) {
      throw new Error(`GOV.UK request failed: ${String(response.status)} for ${url}`);
    }
    return response.json();
  }

  async getContent(path: string): Promise<GovukContent> {
    const basePath = path.replace(/^\/+/, '');
    const raw = await this.getJson(`https://www.gov.uk/api/content/${basePath}`);
    const parsed = ApiContent.parse(raw);
    return {
      url: `https://www.gov.uk/${parsed.base_path.replace(/^\/+/, '')}`,
      basePath: parsed.base_path,
      title: parsed.title,
      documentType: parsed.document_type,
      publicUpdatedAt: parsed.public_updated_at ?? parsed.updated_at,
      changeHistory: (parsed.details?.change_history ?? []).map((change) => ({
        note: change.note,
        publicTimestamp: change.public_timestamp,
      })),
      parts: (parsed.details?.parts ?? []).map((part) => ({
        slug: part.slug,
        title: part.title,
        bodyHtml: part.body,
      })),
      bodyHtml: parsed.details?.body,
    };
  }

  async search(keywords: string, count = 10): Promise<GovukSearchResult[]> {
    const url = `https://www.gov.uk/api/search.json?q=${encodeURIComponent(keywords)}&count=${String(count)}&fields=title,link,description,public_timestamp`;
    const parsed = ApiSearch.parse(await this.getJson(url));
    return parsed.results.map((result) => ({
      title: result.title,
      url: `https://www.gov.uk${result.link.startsWith('/') ? '' : '/'}${result.link}`,
      description: result.description,
      publicTimestamp: result.public_timestamp,
    }));
  }
}

/**
 * Changes to a page since an ISO date. ISO-8601 strings compare
 * lexicographically, including date-only prefixes against full timestamps.
 */
export function changesSince(content: GovukContent, sinceIsoDate: string): GovukChange[] {
  return content.changeHistory.filter((change) => change.publicTimestamp > sinceIsoDate);
}
