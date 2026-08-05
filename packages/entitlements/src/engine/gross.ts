import { Pence } from '@lemonhead/schemas';
import type {
  AgeBandId,
  Attendance,
  AttendancePattern,
  Extra,
  FeeSchedule,
  IsoMonth,
  SessionDef,
  SessionId,
} from '@lemonhead/schemas';

import { applyPercent, multiplyRate, negate, proRata, sumPence } from '../money.ts';

import type { ChildMonth, TimelineMonth } from './timeline.ts';

/**
 * Weeks billed per year for each attendance pattern. Term time is the
 * statutory 38. All-year nurseries typically bill 51 weeks (a closure week at
 * Christmas is near-universal); this is an assumption, noted on every line it
 * produces, until per-nursery opening weeks are captured.
 */
const WEEKS_PER_YEAR: Record<AttendancePattern, number> = {
  'term-time-38': 38,
  'stretched-all-year': 51,
};

export interface GrossLine {
  /** 'unknown-flag' marks missing data (design doc §3.4), always £0. */
  kind: 'gross-fees' | 'sibling-discount' | 'extra' | 'unknown-flag';
  childIndex: number | undefined;
  /** Negative for discounts. */
  amountPence: Pence;
  description: string;
  sessionId: SessionId | undefined;
  ageBandId: AgeBandId | undefined;
  /** Refundable extras are shown but never summed into totals. */
  excludedFromTotal: boolean;
  /** Modelling assumptions behind this line, stated to the user, one each. */
  assumptions: string[];
}

export interface MonthlyGross {
  month: IsoMonth;
  lines: GrossLine[];
  /** Sum of the non-excluded lines — and provably nothing else. */
  totalPence: Pence;
}

interface PricedSession {
  session: SessionDef;
  rate: Pence;
}

interface WeeklyCost {
  pence: Pence;
  sessionId: SessionId;
  sessionLabel: string;
  assumption: string | undefined;
}

function pricedSessionsFor(schedule: FeeSchedule, ageBandId: AgeBandId): PricedSession[] {
  return schedule.prices
    .filter((price) => price.ageBandId === ageBandId)
    .flatMap((price) => {
      const session = schedule.sessions.find((candidate) => candidate.id === price.sessionId);
      return session ? [{ session, rate: price.rate }] : [];
    });
}

/** First-wins extremum without mutating its input (unlike sort). */
function extremeBy<T>(items: readonly T[], better: (a: T, b: T) => boolean): T | undefined {
  return items.reduce<T | undefined>(
    (best, item) => (best === undefined || better(item, best) ? item : best),
    undefined,
  );
}

/**
 * Resolve one week of fees for a child from the nursery's priced sessions.
 * Selection order, each step deterministic and stated when it assumes:
 * exact-hours session → hourly rate → smallest session covering the day →
 * weekly rate → longest available session (flagged as shorter than asked).
 */
export function weeklyCostFor(
  schedule: FeeSchedule,
  ageBandId: AgeBandId,
  attendance: Attendance,
): WeeklyCost | undefined {
  const priced = pricedSessionsFor(schedule, ageBandId);
  const daily = priced.filter(
    ({ session }) => session.kind === 'full-day' || session.kind === 'half-day',
  );

  const cost = (
    picked: PricedSession,
    pence: Pence,
    assumption: string | undefined,
  ): WeeklyCost => ({
    pence,
    sessionId: picked.session.id,
    sessionLabel: picked.session.label,
    assumption,
  });
  const perDay = (picked: PricedSession, assumption: string | undefined): WeeklyCost =>
    cost(picked, multiplyRate(picked.rate, attendance.daysPerWeek), assumption);

  const exact = daily.find(({ session }) => session.hours === attendance.hoursPerDay);
  if (exact) return perDay(exact, undefined);

  const hourly = priced.find(({ session }) => session.kind === 'hourly');
  if (hourly) {
    return cost(
      hourly,
      multiplyRate(hourly.rate, attendance.hoursPerDay * attendance.daysPerWeek),
      undefined,
    );
  }

  const covering = extremeBy(
    daily.filter(({ session }) => session.hours >= attendance.hoursPerDay),
    (a, b) => a.session.hours < b.session.hours,
  );
  if (covering) {
    return perDay(
      covering,
      `Booked the ${covering.session.label} (${String(covering.session.hours)}h) to cover ${String(attendance.hoursPerDay)}h a day; the nursery has no shorter session that fits.`,
    );
  }

  const weekly = priced.find(({ session }) => session.kind === 'weekly');
  if (weekly) {
    const requestedWeeklyHours = attendance.hoursPerDay * attendance.daysPerWeek;
    return cost(
      weekly,
      weekly.rate,
      requestedWeeklyHours > weekly.session.hours
        ? `The weekly rate covers ${String(weekly.session.hours)}h; you asked for ${String(requestedWeeklyHours)}h a week, so check extra-hours pricing with the nursery.`
        : undefined,
    );
  }

  const longest = extremeBy(daily, (a, b) => a.session.hours > b.session.hours);
  if (longest) {
    return perDay(
      longest,
      `The longest session (${String(longest.session.hours)}h) is shorter than the ${String(attendance.hoursPerDay)}h a day you asked for, so check extra-hours pricing with the nursery.`,
    );
  }

  return undefined;
}

function monthlyExtraAmount(
  extra: Extra,
  attendance: Attendance,
  isFirstAttendingMonth: boolean,
): Pence | undefined {
  const weeksPerYear = WEEKS_PER_YEAR[attendance.pattern];
  switch (extra.per) {
    case 'one-off':
      return isFirstAttendingMonth ? extra.amount : undefined;
    case 'day':
      return proRata(multiplyRate(extra.amount, attendance.daysPerWeek), weeksPerYear, 12);
    case 'week':
      return proRata(extra.amount, weeksPerYear, 12);
    case 'month':
      return extra.amount;
    case 'term':
      return proRata(extra.amount, 3, 12);
    case 'year':
      return proRata(extra.amount, 1, 12);
  }
}

interface AttendingChild {
  childMonth: ChildMonth;
  ageBandId: AgeBandId;
  feePence: Pence;
}

function discountTargets(
  appliesTo: 'oldest-child' | 'second-and-subsequent-children' | 'all-children',
  attending: AttendingChild[],
): AttendingChild[] {
  const oldest = attending.reduce((a, b) =>
    b.childMonth.ageMonths > a.childMonth.ageMonths ? b : a,
  );
  switch (appliesTo) {
    case 'oldest-child':
      return [oldest];
    case 'second-and-subsequent-children':
      return attending.filter((entry) => entry !== oldest);
    case 'all-children':
      return attending;
  }
}

/**
 * Gross fees per month: attendance × sessions × rates, sibling discounts,
 * and extras (design doc §4.3 step 3). Monthly amounts are annualised —
 * weekly cost × weeks-per-year ÷ 12 — which is how nurseries bill and the
 * only fair comparison basis. One-off extras land in each child's first
 * attending month; refundable ones are shown but excluded from totals.
 */
export function calculateGross(schedule: FeeSchedule, timeline: TimelineMonth[]): MonthlyGross[] {
  const firstAttendingMonth = new Map<number, IsoMonth>();
  for (const timelineMonth of timeline) {
    for (const childMonth of timelineMonth.children) {
      if (childMonth.band.status === 'in-band' && !firstAttendingMonth.has(childMonth.childIndex)) {
        firstAttendingMonth.set(childMonth.childIndex, timelineMonth.month);
      }
    }
  }

  return timeline.map((timelineMonth) => {
    const lines: GrossLine[] = [];
    const attending: AttendingChild[] = [];

    for (const childMonth of timelineMonth.children) {
      if (childMonth.band.status !== 'in-band') continue;
      const { ageBandId, bandLabel } = childMonth.band;
      const attendance = childMonth.child.attendance;
      const weeksPerYear = WEEKS_PER_YEAR[attendance.pattern];
      const weekly = weeklyCostFor(schedule, ageBandId, attendance);

      if (!weekly) {
        lines.push({
          kind: 'unknown-flag',
          childIndex: childMonth.childIndex,
          amountPence: Pence.parse(0),
          description: `No price entered for ${bandLabel}`,
          sessionId: undefined,
          ageBandId,
          excludedFromTotal: false,
          assumptions: [
            `The nursery has no priced session for ${bandLabel}; this month is shown as £0 until a price is added.`,
          ],
        });
        continue;
      }

      const assumptions: string[] = [];
      if (weekly.assumption) assumptions.push(weekly.assumption);
      if (attendance.pattern === 'stretched-all-year') {
        assumptions.push(
          'All-year billing assumed at 51 weeks; confirm opening weeks with the nursery.',
        );
      }
      if (!schedule.attendancePatterns.includes(attendance.pattern)) {
        assumptions.push(
          'The nursery does not list this attendance pattern; confirm it is offered.',
        );
      }

      const monthly = proRata(weekly.pence, weeksPerYear, 12);
      lines.push({
        kind: 'gross-fees',
        childIndex: childMonth.childIndex,
        amountPence: monthly,
        description: `${weekly.sessionLabel} × ${String(attendance.daysPerWeek)} days/week, ${bandLabel} rate, over ${String(weeksPerYear)} weeks ÷ 12`,
        sessionId: weekly.sessionId,
        ageBandId,
        excludedFromTotal: false,
        assumptions,
      });
      attending.push({ childMonth, ageBandId, feePence: monthly });
    }

    if (attending.length >= 2) {
      for (const discount of schedule.discounts) {
        for (const target of discountTargets(discount.appliesTo, attending)) {
          lines.push({
            kind: 'sibling-discount',
            childIndex: target.childMonth.childIndex,
            amountPence: negate(applyPercent(target.feePence, discount.percentOff)),
            description: `${String(discount.percentOff)}% sibling discount (${discount.appliesTo.replaceAll('-', ' ')})`,
            sessionId: undefined,
            ageBandId: target.ageBandId,
            excludedFromTotal: false,
            assumptions: [],
          });
        }
      }
    }

    for (const extra of schedule.extras) {
      for (const entry of attending) {
        const amount = monthlyExtraAmount(
          extra,
          entry.childMonth.child.attendance,
          firstAttendingMonth.get(entry.childMonth.childIndex) === timelineMonth.month,
        );
        if (amount === undefined) continue;
        lines.push({
          kind: 'extra',
          childIndex: entry.childMonth.childIndex,
          amountPence: amount,
          description: `${extra.label}${extra.refundable ? ' (refundable: shown, not counted in totals)' : ''} (${extra.per})`,
          sessionId: undefined,
          ageBandId: undefined,
          excludedFromTotal: extra.refundable,
          assumptions: [],
        });
      }
    }

    const totalPence = sumPence(
      lines.filter((line) => !line.excludedFromTotal).map((line) => line.amountPence),
    );
    return { month: timelineMonth.month, lines, totalPence };
  });
}
