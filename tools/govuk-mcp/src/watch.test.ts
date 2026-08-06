import { describe, expect, it } from 'vitest';

import type { GovukContent } from './client.ts';
import { assessPage, calendarFindings, latestRetrievedOn, runWatch } from './watch.ts';

function content(
  publicUpdatedAt: string | undefined,
  changes: [string, string][] = [],
): GovukContent {
  return {
    url: 'https://www.gov.uk/tax-free-childcare',
    basePath: '/tax-free-childcare',
    title: 'Tax-Free Childcare',
    documentType: 'guide',
    publicUpdatedAt,
    changeHistory: changes.map(([publicTimestamp, note]) => ({ publicTimestamp, note })),
    parts: [],
    bodyHtml: undefined,
  };
}

const page = { path: 'tax-free-childcare', label: 'TFC', paramsFiles: ['params/x.ts'] };
const TODAY = '2026-08-05';

describe('latestRetrievedOn', () => {
  it('finds the newest retrievedOn across citation blocks', () => {
    expect(
      latestRetrievedOn([
        "a retrievedOn: '2026-04-06' b retrievedOn: '2026-08-05'",
        "c retrievedOn: '2025-09-01'",
      ]),
    ).toBe('2026-08-05');
    expect(latestRetrievedOn(['no dates here'])).toBeUndefined();
  });
});

describe('assessPage', () => {
  it('stays quiet when the page has not changed since verification', () => {
    expect(assessPage(page, content('2026-04-06T09:00:00Z'), '2026-08-05', TODAY)).toBeNull();
  });

  it('flags a page updated after the params retrieval date, quoting change notes', () => {
    const finding = assessPage(
      page,
      content('2026-09-01T08:00:00Z', [['2026-09-01T08:00:00Z', 'Caps updated.']]),
      '2026-08-05',
      '2026-09-02',
    );
    expect(finding?.title).toBe('rule-change: tax-free-childcare');
    expect(finding?.body).toContain('Caps updated.');
    expect(finding?.body).toContain('/verify-rule');
  });

  it('notes when a schema has no change_history rather than staying silent', () => {
    const finding = assessPage(page, content('2026-09-01T08:00:00Z'), '2026-08-05', '2026-09-02');
    expect(finding?.body).toContain('no change_history');
  });

  it('uses the polling window for unmapped pages', () => {
    const unmapped = { path: 'help-with-childcare-costs', label: 'Landscape' };
    expect(assessPage(unmapped, content('2026-08-04T00:00:00Z'), undefined, TODAY)).not.toBeNull();
    expect(assessPage(unmapped, content('2026-07-01T00:00:00Z'), undefined, TODAY)).toBeNull();
  });

  it('ignores pages with no update timestamp', () => {
    expect(assessPage(page, content(undefined), '2026-01-01', TODAY)).toBeNull();
  });
});

describe('calendarFindings', () => {
  it('fires only on the trigger date', () => {
    const triggers = [{ month: 12, day: 15, note: 'DfE rates day.' }];
    expect(calendarFindings(triggers, '2026-12-15')).toHaveLength(1);
    expect(calendarFindings(triggers, '2026-12-14')).toHaveLength(0);
  });
});

describe('runWatch', () => {
  it('collects page findings, fetch failures, and calendar reminders', async () => {
    const client = {
      getContent: (path: string) => {
        if (path === 'broken') return Promise.reject(new Error('410 gone'));
        return Promise.resolve(content('2026-09-01T08:00:00Z'));
      },
      search: () => Promise.resolve([]),
    };
    const findings = await runWatch(
      client,
      {
        pages: [page, { path: 'broken', label: 'Moved page' }],
        calendar: [{ month: 9, day: 2, note: 'Check.' }],
      },
      () => "retrievedOn: '2026-08-05'",
      '2026-09-02',
    );
    expect(findings.map((finding) => finding.kind)).toEqual(['change', 'change', 'reminder']);
    expect(findings[1]?.title).toContain('unreachable');
  });
});
