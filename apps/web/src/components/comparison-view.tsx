'use client';

import { calculateProjection } from '@lemonhead/entitlements';
import type { FamilyProfile, FeeSchedule, IsoDate } from '@lemonhead/schemas';
import { useMemo } from 'react';

import { pounds, poundsPerMonth } from '../lib/format.ts';

/**
 * Side-by-side view over every saved nursery (FR4). Each column is the same
 * engine calculation the single-nursery view renders, run against the same
 * family profile; nothing here computes money beyond ordering the engine's
 * totals. Renders only when there are at least two nurseries to compare.
 */
export function ComparisonView({
  schedules,
  profile,
  asOfDate,
}: {
  schedules: FeeSchedule[];
  profile: FamilyProfile;
  asOfDate: IsoDate;
}) {
  const projections = useMemo(
    () =>
      schedules.map((schedule) => ({
        name: schedule.nursery.name,
        projection: calculateProjection(schedule, profile, { asOfDate }),
      })),
    [schedules, profile, asOfDate],
  );

  const [first] = projections;
  if (projections.length < 2 || !first) return null;

  const rows = first.projection.months.map((anchor, index) => {
    const cells = projections.map(({ name, projection }) => {
      const month = projection.months[index];
      return { name, totalPence: month ? month.totalPence : null };
    });
    const lowest = Math.min(
      ...cells.flatMap((cell) => (cell.totalPence === null ? [] : [cell.totalPence])),
    );
    return { month: anchor.month, cells, lowest };
  });

  return (
    <section className="card">
      <h2>How your nurseries compare</h2>
      <p className="note">
        Every figure comes from the same calculation as the view above, using the same family
        details. The monthly average is the 12-month total divided by 12. Select a nursery in the
        bar above to see its full breakdown, line by line, with sources.
      </p>

      <div className="compare-cards">
        {projections.map(({ name, projection }) => (
          <div key={name} className="compare-card">
            <h3>{name}</h3>
            <dl>
              <dt>Fees over 12 months</dt>
              <dd>{pounds(projection.annual.grossPence)}</dd>
              <dt>Funding and support taken off</dt>
              <dd>{pounds(projection.annual.deductionsPence)}</dd>
              <dt>You pay over 12 months</dt>
              <dd>{pounds(projection.annual.netPence)}</dd>
              <dt>Monthly average</dt>
              <dd>{poundsPerMonth(projection.annual.netPence)}</dd>
            </dl>
          </div>
        ))}
      </div>

      <table>
        <thead>
          <tr>
            <th scope="col">Month</th>
            {projections.map(({ name }) => (
              <th key={name} scope="col" className="amount">
                {name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.month}>
              <th scope="row">{row.month}</th>
              {row.cells.map((cell) => (
                <td key={cell.name} className="amount">
                  {cell.totalPence !== null && (
                    <>
                      {pounds(cell.totalPence)}
                      {cell.totalPence === row.lowest && <span className="lowest">lowest</span>}
                    </>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
