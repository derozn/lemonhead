'use client';

import { calculateProjection } from '@lemonhead/entitlements';
import type { FamilyProfile, FeeSchedule, IsoDate, ProjectionLine } from '@lemonhead/schemas';
import { useMemo, useState } from 'react';

import { pounds, renderAmounts } from '../lib/format.ts';

function Source({ line }: { line: ProjectionLine }) {
  if (line.source.type === 'rule') {
    return (
      <a href={line.source.citation.url} target="_blank" rel="noreferrer">
        gov.uk rule (checked {line.source.citation.retrievedOn})
      </a>
    );
  }
  if (line.source.type === 'fee-schedule') {
    return <span className="note">from your price list</span>;
  }
  return null;
}

const STATUS_LABEL = {
  eligible: 'eligible',
  ineligible: 'not eligible',
  'needs-info': 'needs an answer',
} as const;

export function ProjectionView({
  schedule,
  profile,
  asOfDate,
}: {
  schedule: FeeSchedule;
  profile: FamilyProfile;
  asOfDate: IsoDate;
}) {
  const projection = useMemo(
    () => calculateProjection(schedule, profile, { asOfDate }),
    [schedule, profile, asOfDate],
  );
  const [openMonth, setOpenMonth] = useState(0);
  const month = projection.months[openMonth] ?? projection.months[0];

  return (
    <section className="card">
      <h2>What you&apos;ll pay at {schedule.nursery.name}</h2>
      <p className="total">{pounds(projection.months[0]?.totalPence ?? 0)} this month</p>
      <p className="note">
        {pounds(projection.annual.netPence)} over the next 12 months, after{' '}
        {pounds(projection.annual.deductionsPence)} of funding and support comes off{' '}
        {pounds(projection.annual.grossPence)} in fees. Computed with rule set{' '}
        <code>{projection.ruleSetId}</code>.
      </p>

      <div className="chips">
        {projection.eligibility.children.map((child) => (
          <span
            key={child.childIndex}
            className="chip"
            data-status={child.workingParentFundedHours.status}
          >
            Child {child.childIndex + 1}: 30 funded hours{' '}
            {STATUS_LABEL[child.workingParentFundedHours.status]}
          </span>
        ))}
        <span className="chip" data-status={projection.eligibility.universalCredit.status}>
          UC childcare element {STATUS_LABEL[projection.eligibility.universalCredit.status]}
        </span>
      </div>

      <table>
        <thead>
          <tr>
            <th>Month</th>
            <th className="amount">You pay</th>
          </tr>
        </thead>
        <tbody>
          {projection.months.map((entry, index) => (
            <tr key={entry.month}>
              <td>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => {
                    setOpenMonth(index);
                  }}
                >
                  {entry.month}
                </button>
              </td>
              <td className="amount">{pounds(entry.totalPence)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {month && (
        <>
          <h3>Every line in {month.month}</h3>
          <table>
            <tbody>
              {month.lines.map((line, index) => (
                <tr key={index}>
                  <td>
                    {renderAmounts(line.description, line.amounts)}
                    {line.excludedFromTotal && ' (not counted in the total)'}
                    {line.assumptions.map((assumption, aIndex) => (
                      <p key={aIndex} className="assumption">
                        {renderAmounts(assumption, line.amounts)}
                      </p>
                    ))}
                    <div>
                      <Source line={line} />
                    </div>
                  </td>
                  <td className="amount">{pounds(line.amountPence)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}
