import { Pence } from '@lemonhead/schemas';
import type {
  Attendance,
  FamilyProfile,
  FeeSchedule,
  FundingPolicy,
  IsoMonth,
} from '@lemonhead/schemas';

import { assessFundedHours } from '../eligibility/funded-hours.ts';
import type { FundedHoursAssessment, FundedHoursAssessments } from '../eligibility/funded-hours.ts';
import { multiplyRate, negate, proRata, sumPence } from '../money.ts';
import type { Citation, FundedHoursParams } from '../rules/types.ts';

import { WEEKS_PER_YEAR } from './gross.ts';
import type { GrossLine, MonthlyGross } from './gross.ts';
import type { TimelineMonth } from './timeline.ts';

/**
 * Apply funded hours to the gross months (design doc §4.3 step 4): nursery
 * funding conditions first, then the deduction per FundingPolicy variant,
 * then consumables charges. Every no-funding outcome is an explainable line,
 * never a silently missing deduction. Deductions are computed in annual
 * quarter-hours and divided by 12 once, so term-time and stretched patterns
 * share one formula (the weeks cancel: hours/week × weeks ÷ 12 = annual ÷ 12).
 */
export function applyFunding(
  profile: FamilyProfile,
  schedule: FeeSchedule,
  params: FundedHoursParams,
  timeline: TimelineMonth[],
  grossMonths: MonthlyGross[],
): MonthlyGross[] {
  const assessmentsByChild = profile.children.map((child) =>
    assessFundedHours(profile, child, params),
  );

  return timeline.map((timelineMonth, monthIndex) => {
    const grossMonth = grossMonths[monthIndex];
    if (!grossMonth) {
      throw new RangeError('applyFunding needs grossMonths aligned with the timeline');
    }
    const fundingLines: GrossLine[] = [];

    for (const childMonth of timelineMonth.children) {
      if (childMonth.band.status !== 'in-band') continue;
      const assessments = assessmentsByChild[childMonth.childIndex];
      if (!assessments) {
        throw new RangeError('applyFunding needs a timeline built from the same profile');
      }
      const feeLine = grossMonth.lines.find(
        (line) => line.kind === 'gross-fees' && line.childIndex === childMonth.childIndex,
      );
      if (!feeLine) continue; // no priced fee this month (unknown-flag case)
      const discountTotal = grossMonth.lines
        .filter(
          (line) => line.kind === 'sibling-discount' && line.childIndex === childMonth.childIndex,
        )
        .reduce((total, line) => total + line.amountPence, 0);
      fundingLines.push(
        ...childFundingLines(
          schedule,
          params,
          assessments,
          childMonth.childIndex,
          childMonth.child.attendance,
          grossMonth.month,
          feeLine,
          discountTotal,
        ),
      );
    }

    const lines = [...grossMonth.lines, ...fundingLines];
    const totalPence = sumPence(
      lines.filter((line) => !line.excludedFromTotal).map((line) => line.amountPence),
    );
    return { month: grossMonth.month, lines, totalPence };
  });
}

interface ActiveEntitlement {
  assessment: FundedHoursAssessment;
  label: string;
}

function fundingNote(
  childIndex: number,
  description: string,
  assumptions: string[],
  citation: Citation | undefined,
): GrossLine {
  return {
    kind: 'funding-note',
    childIndex,
    amountPence: Pence.parse(0),
    description,
    sessionId: undefined,
    ageBandId: undefined,
    excludedFromTotal: false,
    citation,
    assumptions,
  };
}

function childFundingLines(
  schedule: FeeSchedule,
  params: FundedHoursParams,
  assessments: FundedHoursAssessments,
  childIndex: number,
  attendance: Attendance,
  month: IsoMonth,
  feeLine: GrossLine,
  discountTotal: number,
): GrossLine[] {
  const citation = params.sources[0];
  const { workingParent, universal } = assessments;

  // Which entitlement is live this month. The working-parent 30 hours
  // subsumes the universal 15 when both are active.
  let active: ActiveEntitlement | undefined;
  const notes: string[] = [];
  if (workingParent.result.status === 'eligible' && month >= workingParent.startMonth) {
    active = { assessment: workingParent, label: 'working-parent offer' };
  } else {
    if (workingParent.result.status === 'needs-info' && month >= workingParent.startMonth) {
      notes.push(
        'Up to 30 funded hours a week may apply once the eligibility questions are answered.',
      );
    }
    if (month >= universal.startMonth) {
      active = { assessment: universal, label: 'universal 3-to-4 offer' };
    }
  }
  if (!active) {
    return notes.length > 0
      ? [fundingNote(childIndex, 'Funded hours not applied yet', notes, citation)]
      : [];
  }

  const policy = schedule.fundingPolicy;
  if (policy.kind === 'not-offered') {
    return [
      fundingNote(
        childIndex,
        'Funding not applied: this nursery does not offer funded places',
        notes,
        citation,
      ),
    ];
  }
  if (policy.kind === 'unknown') {
    return [
      fundingNote(
        childIndex,
        'Funding not applied: funding policy unknown',
        [
          ...notes,
          "The nursery's funding policy is not known, so fees are shown without funding rather than guessed. Add the policy to see funded costs.",
        ],
        citation,
      ),
    ];
  }

  // Nursery-imposed conditions (spec §3, owner request 2026-08-05).
  const conditions = policy.conditions;
  const conditionAssumptions = [...notes];
  if (
    conditions?.minDaysPerWeek !== undefined &&
    attendance.daysPerWeek < conditions.minDaysPerWeek
  ) {
    return [
      fundingNote(
        childIndex,
        `Funding not applied: this nursery requires at least ${String(conditions.minDaysPerWeek)} days a week for funded places`,
        notes,
        citation,
      ),
    ];
  }
  if (conditions?.termTimeOnly === true && attendance.pattern === 'stretched-all-year') {
    return [
      fundingNote(
        childIndex,
        'Funding not applied: this nursery applies funding to term-time attendance only',
        notes,
        citation,
      ),
    ];
  }
  if (
    conditions?.restrictedToSessionIds !== undefined &&
    (feeLine.sessionId === undefined ||
      !conditions.restrictedToSessionIds.includes(feeLine.sessionId))
  ) {
    return [
      fundingNote(
        childIndex,
        'Funding not applied: this nursery restricts funding to sessions you are not booked on',
        notes,
        citation,
      ),
    ];
  }
  if (conditions?.conditionsUnknown === true) {
    conditionAssumptions.push(
      "The nursery's funding conditions are not fully known; confirm them before relying on this deduction.",
    );
  }

  // Annual quarter-hours: attendance is on a quarter-hour grid, so these are
  // integers and the single rounding happens at the ÷ 12.
  const weeksPerYear = WEEKS_PER_YEAR[attendance.pattern];
  const attendedAnnualQh = attendance.hoursPerDay * 4 * attendance.daysPerWeek * weeksPerYear;
  const entitledAnnualQh = active.assessment.hoursPerWeek * 4 * active.assessment.weeksPerYear;
  const capAnnualQh =
    conditions?.maxFundedHoursPerWeek !== undefined
      ? conditions.maxFundedHoursPerWeek * 4 * weeksPerYear
      : Number.POSITIVE_INFINITY;
  const fundedAnnualQh = Math.min(entitledAnnualQh, attendedAnnualQh, capAnnualQh);
  if (conditions?.maxFundedHoursPerWeek !== undefined && capAnnualQh < entitledAnnualQh) {
    conditionAssumptions.push(
      `This nursery accepts at most ${String(conditions.maxFundedHoursPerWeek)} funded hours a week.`,
    );
  }

  const deduction = deductionFor(schedule, policy, feeLine, fundedAnnualQh, attendedAnnualQh);
  if (deduction === undefined) {
    return [
      fundingNote(
        childIndex,
        'Funding not applied: your booked session is not one this nursery funds',
        notes,
        citation,
      ),
    ];
  }

  // A deduction never exceeds the fee it deducts from, after sibling
  // discounts, so funding can never turn a child's month negative
  // (property-tested). discountTotal is negative or zero.
  const capped = Math.min(deduction, feeLine.amountPence + discountTotal);

  const consumables = policy.consumablesCharge;
  const consumablesAmount = consumables
    ? consumables.per === 'day'
      ? proRata(multiplyRate(consumables.amount, attendance.daysPerWeek), weeksPerYear, 12)
      : consumables.per === 'week'
        ? proRata(consumables.amount, weeksPerYear, 12)
        : proRata(multiplyRate(consumables.amount, fundedAnnualQh / 4), 1, 12)
    : Pence.parse(0);

  // Found by the property suite in CI: at low attendance, a flat consumables
  // charge can exceed what funding saves, making the family worse off. Real
  // parents decline funding then, so the engine does too, and says why.
  // This also keeps net ≤ gross true by construction.
  if (capped <= consumablesAmount) {
    return [
      fundingNote(
        childIndex,
        'Funding not applied: the consumables charge would cost more than the funding saves',
        [
          ...conditionAssumptions,
          `At your attendance, funding would save £${(capped / 100).toFixed(2)} a month but this nursery's consumables charge would add £${(consumablesAmount / 100).toFixed(2)}. Ask the nursery about unfunded attendance or reduced charges.`,
        ],
        citation,
      ),
    ];
  }

  const lines: GrossLine[] = [
    {
      kind: 'funded-hours-deduction',
      childIndex,
      amountPence: negate(Pence.parse(capped)),
      description: `Funded hours (${active.label}): ${String(fundedAnnualQh / 4)} of ${String(attendedAnnualQh / 4)} attended hours a year funded`,
      sessionId: feeLine.sessionId,
      ageBandId: feeLine.ageBandId,
      excludedFromTotal: false,
      citation,
      assumptions: conditionAssumptions,
    },
  ];

  if (consumables) {
    lines.push({
      kind: 'consumables-charge',
      childIndex,
      amountPence: consumablesAmount,
      description: `Consumables charge on funded sessions (per ${consumables.per})`,
      sessionId: feeLine.sessionId,
      ageBandId: feeLine.ageBandId,
      excludedFromTotal: false,
      citation: undefined,
      assumptions: [],
    });
  }

  return lines;
}

/**
 * The deduction per policy variant, monthly (annual ÷ 12, rounded once).
 * Returns undefined when a sessions-allocated policy cannot fund the booked
 * session, which the caller turns into an explainable no-funding line.
 */
function deductionFor(
  schedule: FeeSchedule,
  policy: Exclude<FundingPolicy, { kind: 'not-offered' } | { kind: 'unknown' }>,
  feeLine: GrossLine,
  fundedAnnualQh: number,
  attendedAnnualQh: number,
): number | undefined {
  switch (policy.kind) {
    case 'hours-deduction':
      // Funded hours off at the effective booked rate: the funded share of
      // the attended hours, applied to the monthly fee. Works identically
      // for hourly, per-day, and weekly pricing.
      return proRata(feeLine.amountPence, fundedAnnualQh, attendedAnnualQh);
    case 'funded-rate-deduction':
      return proRata(multiplyRate(policy.fundedRate, fundedAnnualQh / 4), 1, 12);
    case 'sessions-allocated': {
      if (feeLine.sessionId === undefined || !policy.fundedSessionIds.includes(feeLine.sessionId)) {
        return undefined;
      }
      const session = schedule.sessions.find((candidate) => candidate.id === feeLine.sessionId);
      if (!session) return undefined; // parse-enforced integrity; stay defensive
      const rate = schedule.prices.find(
        (price) => price.sessionId === feeLine.sessionId && price.ageBandId === feeLine.ageBandId,
      );
      if (!rate) return undefined; // same defensiveness
      const sessionQh = session.hours * 4;
      const annualAttendedSessions = attendedAnnualQh / sessionQh;
      const annualFundedSessions = Math.min(
        Math.floor(fundedAnnualQh / sessionQh),
        Math.floor(annualAttendedSessions),
      );
      return proRata(multiplyRate(rate.rate, annualFundedSessions), 1, 12);
    }
  }
}
