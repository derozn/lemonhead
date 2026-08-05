import { z } from 'zod';

import { AttendancePattern, NonNegativePence } from './primitives.ts';

export const AgeBandId = z.string().min(1, 'Age band ids cannot be empty').brand<'AgeBandId'>();
export type AgeBandId = z.infer<typeof AgeBandId>;

export const SessionId = z.string().min(1, 'Session ids cannot be empty').brand<'SessionId'>();
export type SessionId = z.infer<typeof SessionId>;

/**
 * A nursery-defined age band in months: `fromMonths` inclusive, `toMonths`
 * exclusive, so adjacent bands meet cleanly (0–24, 24–36, 36–60). An omitted
 * `toMonths` means open-ended ("3 years and up") and is only valid on the
 * oldest band.
 */
export const AgeBand = z
  .object({
    id: AgeBandId,
    /** The nursery's own wording, e.g. "Babies", "Toddlers", "Preschool". */
    label: z.string().min(1, 'Age band labels cannot be empty'),
    fromMonths: z
      .number()
      .int('Age band boundaries are whole months')
      .nonnegative('Age bands cannot start before birth'),
    toMonths: z
      .number()
      .int('Age band boundaries are whole months')
      .positive('Age bands must end after birth')
      .optional(),
  })
  .check((ctx) => {
    if (ctx.value.toMonths !== undefined && ctx.value.toMonths <= ctx.value.fromMonths) {
      ctx.issues.push({
        code: 'custom',
        message: 'An age band must end after it starts (fromMonths < toMonths)',
        path: ['toMonths'],
        input: ctx.value,
      });
    }
  });
export type AgeBand = z.infer<typeof AgeBand>;

/**
 * A bookable unit of care. `hours` is the contact time one unit buys, in
 * quarter-hour steps (nurseries bill in clean blocks; this mirrors the entry
 * form and is not load-bearing for arithmetic). Hourly sessions have hours 1;
 * weekly sessions carry the hours included in one week.
 */
export const SessionDef = z.object({
  id: SessionId,
  kind: z.enum(['full-day', 'half-day', 'hourly', 'weekly']),
  label: z.string().min(1, 'Session labels cannot be empty'),
  hours: z
    .number()
    .gt(0, 'A session must include some hours')
    .lte(24, 'A session cannot exceed 24 hours')
    .multipleOf(0.25, 'Session hours are in quarter-hour steps'),
});
export type SessionDef = z.infer<typeof SessionDef>;

export const PriceEntry = z.object({
  ageBandId: AgeBandId,
  sessionId: SessionId,
  rate: NonNegativePence,
});
export type PriceEntry = z.infer<typeof PriceEntry>;

export const SiblingDiscount = z.object({
  percentOff: z
    .number()
    .gt(0, 'A discount must be more than 0%')
    .lte(100, 'A discount cannot exceed 100%'),
  /** Which child's bill the discount lands on, per the nursery's stated policy. */
  appliesTo: z.enum(['oldest-child', 'second-and-subsequent-children', 'all-children']),
});
export type SiblingDiscount = z.infer<typeof SiblingDiscount>;

export const Extra = z.object({
  label: z.string().min(1, 'Extras need a label'),
  amount: NonNegativePence,
  per: z.enum(['one-off', 'day', 'week', 'month', 'term', 'year']),
  /** Refundable extras (deposits) are shown but excluded from net cost totals. */
  refundable: z.boolean(),
});
export type Extra = z.infer<typeof Extra>;

/** A charge the nursery adds to funded sessions (meals, consumables, snacks). */
export const ConsumablesCharge = z.object({
  amount: NonNegativePence,
  per: z.enum(['day', 'week', 'funded-hour']),
});
export type ConsumablesCharge = z.infer<typeof ConsumablesCharge>;

/**
 * Nursery-imposed conditions on accepting funded hours (spec §3, added at
 * owner's request 2026-08-05). An unmet condition must surface as an
 * explainable "funding not applied" line, never a silently missing deduction.
 */
export const FundingConditions = z.object({
  /** e.g. funding only applied from 3 attended days per week. */
  minDaysPerWeek: z
    .number()
    .int('Days per week must be a whole number')
    .min(1, 'A minimum-days condition needs at least one day')
    .max(7, 'There are at most 7 days in a week')
    .optional(),
  /** e.g. the nursery accepts only 15 of the 30 funded hours. */
  maxFundedHoursPerWeek: z
    .number()
    .gt(0, 'A funded-hours cap must be more than zero')
    .lte(50, 'A funded-hours cap above 50 hours/week is not plausible')
    .multipleOf(0.25, 'Funded hours are in quarter-hour steps')
    .optional(),
  /** Funding not applied to stretched (all-year) attendance patterns. */
  termTimeOnly: z.boolean().optional(),
  /** Funding only usable against these sessions. */
  restrictedToSessionIds: z
    .array(SessionId)
    .min(1, 'A session restriction needs at least one session')
    .optional(),
  /** The nursery's conditions are not known; flag downstream, never guess. */
  conditionsUnknown: z.boolean().optional(),
});
export type FundingConditions = z.infer<typeof FundingConditions>;

const offeringFields = {
  consumablesCharge: ConsumablesCharge.optional(),
  conditions: FundingConditions.optional(),
};

/**
 * How this nursery applies funded hours to a bill — the place real nurseries
 * diverge most (spec §3, design doc §3.2).
 */
export const FundingPolicy = z.discriminatedUnion('kind', [
  /** Funded hours come off the bill at the headline rate. */
  z.object({ kind: z.literal('hours-deduction'), ...offeringFields }),
  /** Funded hours are deducted at a stated rate below the headline rate. */
  z.object({
    kind: z.literal('funded-rate-deduction'),
    fundedRate: NonNegativePence,
    ...offeringFields,
  }),
  /** Funding is consumed as whole named sessions. */
  z.object({
    kind: z.literal('sessions-allocated'),
    fundedSessionIds: z.array(SessionId).min(1, 'Allocated funding needs at least one session'),
    ...offeringFields,
  }),
  z.object({ kind: z.literal('not-offered') }),
  /** Manual entry may honestly not know; projections flag, never guess. */
  z.object({ kind: z.literal('unknown') }),
]);
export type FundingPolicy = z.infer<typeof FundingPolicy>;

export const NurseryInfo = z.object({
  name: z.string().min(1, 'The nursery needs a name'),
  /** Outward postcode only (e.g. "SE15") — enough for comparison, no address held. */
  postcodeArea: z
    .string()
    .regex(/^[A-Za-z]{1,2}\d[A-Za-z\d]?$/, 'Expected an outward postcode like SE15 or M1')
    .optional(),
  /** Where this schedule came from; extraction adds richer sources in Phase 3. */
  source: z.enum(['manual-entry']),
});
export type NurseryInfo = z.infer<typeof NurseryInfo>;

function findDuplicates(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

/**
 * One nursery's complete price list, designed once for manual entry now and
 * extraction later. Cross-references (prices → bands/sessions, funding →
 * sessions) are validated so a parsed FeeSchedule is internally consistent.
 */
export const FeeSchedule = z
  .object({
    nursery: NurseryInfo,
    ageBands: z.array(AgeBand).min(1, 'A fee schedule needs at least one age band'),
    sessions: z.array(SessionDef).min(1, 'A fee schedule needs at least one session type'),
    prices: z.array(PriceEntry).min(1, 'A fee schedule needs at least one price'),
    discounts: z.array(SiblingDiscount),
    extras: z.array(Extra),
    fundingPolicy: FundingPolicy,
    attendancePatterns: z
      .array(AttendancePattern)
      .min(1, 'State at least one attendance pattern the nursery offers'),
  })
  .check((ctx) => {
    const schedule = ctx.value;
    const issue = (message: string, path: (string | number)[]) => {
      ctx.issues.push({ code: 'custom', message, path, input: schedule });
    };

    for (const id of findDuplicates(schedule.ageBands.map((band) => band.id))) {
      issue(`Duplicate age band id "${id}"`, ['ageBands']);
    }
    for (const id of findDuplicates(schedule.sessions.map((session) => session.id))) {
      issue(`Duplicate session id "${id}"`, ['sessions']);
    }
    for (const pattern of findDuplicates(schedule.attendancePatterns)) {
      issue(`Attendance pattern "${pattern}" is listed twice`, ['attendancePatterns']);
    }

    const sorted = [...schedule.ageBands].sort((a, b) => a.fromMonths - b.fromMonths);
    for (let i = 1; i < sorted.length; i += 1) {
      const previous = sorted[i - 1];
      const current = sorted[i];
      if (!previous || !current) continue;
      if (previous.toMonths === undefined || current.fromMonths < previous.toMonths) {
        issue(
          `Age bands "${previous.id}" and "${current.id}" overlap; bands must not share months`,
          ['ageBands'],
        );
      }
    }

    const bandIds = new Set<string>(schedule.ageBands.map((band) => band.id));
    const sessionIds = new Set<string>(schedule.sessions.map((session) => session.id));

    schedule.prices.forEach((price, index) => {
      if (!bandIds.has(price.ageBandId)) {
        issue(`Price refers to unknown age band "${price.ageBandId}"`, ['prices', index]);
      }
      if (!sessionIds.has(price.sessionId)) {
        issue(`Price refers to unknown session "${price.sessionId}"`, ['prices', index]);
      }
    });
    for (const pair of findDuplicates(
      schedule.prices.map((price) => `${price.ageBandId} ${price.sessionId}`),
    )) {
      const [bandId, sessionId] = pair.split(' ');
      issue(`More than one price for age band "${bandId ?? ''}" and session "${sessionId ?? ''}"`, [
        'prices',
      ]);
    }

    const policy = schedule.fundingPolicy;
    if (policy.kind === 'sessions-allocated') {
      policy.fundedSessionIds.forEach((id, index) => {
        if (!sessionIds.has(id)) {
          issue(`Funded session "${id}" is not a defined session`, [
            'fundingPolicy',
            'fundedSessionIds',
            index,
          ]);
        }
      });
    }
    if (policy.kind !== 'not-offered' && policy.kind !== 'unknown') {
      policy.conditions?.restrictedToSessionIds?.forEach((id, index) => {
        if (!sessionIds.has(id)) {
          issue(`Funding restriction names unknown session "${id}"`, [
            'fundingPolicy',
            'conditions',
            'restrictedToSessionIds',
            index,
          ]);
        }
      });
    }
  });
export type FeeSchedule = z.infer<typeof FeeSchedule>;
