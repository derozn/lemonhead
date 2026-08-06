import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { changesSince, HttpGovukContentClient } from './client.ts';
import type { GovukContent, GovukContentClient } from './client.ts';

/**
 * The rule-change watcher. Deterministic, no LLM anywhere in the path.
 * Stateless by design: pages mapped to params files are compared against the
 * retrieval dates already recorded in those files' citation blocks; unmapped
 * pages report if updated within the polling window. Findings become GitHub
 * issues (never PRs — verify-on-encode is a human act; this only rings the
 * bell). Run nightly by .github/workflows/rule-watch.yml.
 */

export interface WatchPage {
  path: string;
  label: string;
  paramsFiles?: string[];
}

export interface CalendarTrigger {
  month: number;
  day: number;
  note: string;
}

export interface Finding {
  kind: 'change' | 'reminder';
  title: string;
  body: string;
}

/** Latest retrievedOn date across a params file's citation blocks. */
export function latestRetrievedOn(fileContents: string[]): string | undefined {
  const dates = fileContents
    .flatMap((content) => [...content.matchAll(/retrievedOn: '(\d{4}-\d{2}-\d{2})'/g)])
    .map((match) => match[1])
    .filter((date): date is string => date !== undefined)
    .sort();
  return dates.at(-1);
}

/**
 * Decide whether a watched page warrants a finding. Mapped pages: flag when
 * the page changed after we last verified it. Unmapped pages: flag when the
 * page changed within the polling window (stateless nightly cadence).
 */
export function assessPage(
  page: WatchPage,
  content: GovukContent,
  retrievedOn: string | undefined,
  todayIso: string,
  windowDays = 3,
): Finding | null {
  const updated = content.publicUpdatedAt;
  if (updated === undefined) return null;

  const reference =
    retrievedOn ?? new Date(Date.parse(todayIso) - windowDays * 86_400_000).toISOString();
  if (updated <= reference) return null;

  const changes = changesSince(content, reference);
  const notes =
    changes.length > 0
      ? changes.map((change) => `- ${change.publicTimestamp}: ${change.note}`).join('\n')
      : '- (no change_history on this schema; compare the page manually)';
  return {
    kind: 'change',
    title: `rule-change: ${page.path}`,
    body: [
      `**${page.label}**`,
      '',
      `Page: ${content.url}`,
      `public_updated_at: ${updated}`,
      retrievedOn === undefined
        ? `Detected within the ${String(windowDays)}-day polling window.`
        : `Last verified (params retrievedOn): ${retrievedOn}`,
      '',
      'Changes:',
      notes,
      '',
      page.paramsFiles?.length
        ? `Affected params: ${page.paramsFiles.join(', ')}\n\nRun /verify-rule before touching any figure.`
        : 'No params mapping; triage whether this affects the engine.',
    ].join('\n'),
  };
}

export function calendarFindings(triggers: CalendarTrigger[], todayIso: string): Finding[] {
  const month = Number(todayIso.slice(5, 7));
  const day = Number(todayIso.slice(8, 10));
  return triggers
    .filter((trigger) => trigger.month === month && trigger.day === day)
    .map((trigger) => ({
      kind: 'reminder' as const,
      title: `rule-change: calendar reminder ${todayIso}`,
      body: trigger.note,
    }));
}

export async function runWatch(
  client: GovukContentClient,
  watchlist: { pages: WatchPage[]; calendar: CalendarTrigger[] },
  readParams: (path: string) => string,
  todayIso: string,
): Promise<Finding[]> {
  const findings: Finding[] = [];
  for (const page of watchlist.pages) {
    let content: GovukContent;
    try {
      content = await client.getContent(page.path);
    } catch (error) {
      findings.push({
        kind: 'change',
        title: `rule-change: ${page.path} unreachable`,
        body: `Watcher could not fetch ${page.path}: ${error instanceof Error ? error.message : String(error)}. The page may have moved — update watchlist.json.`,
      });
      continue;
    }
    const retrievedOn = page.paramsFiles?.length
      ? latestRetrievedOn(page.paramsFiles.map(readParams))
      : undefined;
    const finding = assessPage(page, content, retrievedOn, todayIso);
    if (finding) findings.push(finding);
  }
  findings.push(...calendarFindings(watchlist.calendar, todayIso));
  return findings;
}

const isMain = process.argv[1] !== undefined && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');
  const watchlist = JSON.parse(
    readFileSync(join(root, 'tools/govuk-mcp/watchlist.json'), 'utf8'),
  ) as { pages: WatchPage[]; calendar: CalendarTrigger[] };
  const today = new Date().toISOString().slice(0, 10);
  const findings = await runWatch(
    new HttpGovukContentClient(),
    watchlist,
    (path) => readFileSync(join(root, path), 'utf8'),
    today,
  );
  console.log(JSON.stringify(findings, null, 2));
}
