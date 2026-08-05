import { addMonths, ageInMonths } from '@lemonhead/schemas';
import type { Attendance, FamilyProfile, FeeSchedule, IsoMonth } from '@lemonhead/schemas';

/**
 * A child's fee-band situation in one month. Carrying the band label and the
 * attendance here means downstream steps never index back into the profile or
 * schedule, so they cannot hit a missing entry.
 */
export type ChildBandStatus =
  | { status: 'in-band'; ageBandId: string; bandLabel: string }
  | { status: 'not-born' }
  | { status: 'no-matching-band' };

export interface ChildMonth {
  childIndex: number;
  ageMonths: number;
  attendance: Attendance;
  band: ChildBandStatus;
}

export interface TimelineMonth {
  month: IsoMonth;
  children: ChildMonth[];
}

export const DEFAULT_HORIZON_MONTHS = 12;

/**
 * Build the month-by-month horizon: each child's age and applicable nursery
 * age band per month (design doc §4.3 step 1). A child not yet born, or whose
 * age no band covers, is carried with that status rather than dropped, so the
 * projection can flag it instead of silently charging nothing.
 */
export function buildTimeline(
  profile: FamilyProfile,
  schedule: FeeSchedule,
  startMonth: IsoMonth,
  horizonMonths: number = DEFAULT_HORIZON_MONTHS,
): TimelineMonth[] {
  const months: TimelineMonth[] = [];
  for (let offset = 0; offset < horizonMonths; offset += 1) {
    const month = addMonths(startMonth, offset);
    months.push({
      month,
      children: profile.children.map((child, childIndex) => ({
        childIndex,
        ageMonths: ageInMonths(child.dobMonth, month),
        attendance: child.attendance,
        band: bandFor(schedule, ageInMonths(child.dobMonth, month)),
      })),
    });
  }
  return months;
}

function bandFor(schedule: FeeSchedule, ageMonths: number): ChildBandStatus {
  if (ageMonths < 0) return { status: 'not-born' };
  const band = schedule.ageBands.find(
    (candidate) =>
      ageMonths >= candidate.fromMonths &&
      (candidate.toMonths === undefined || ageMonths < candidate.toMonths),
  );
  return band
    ? { status: 'in-band', ageBandId: band.id, bandLabel: band.label }
    : { status: 'no-matching-band' };
}
