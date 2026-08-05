import { FeeSchedule } from '../fee-schedule.ts';

/**
 * Three realistic nursery fixtures spanning the pricing and funding styles
 * the engine must handle (task 3). Rates are plausible 2026 England prices,
 * in pence. Parsed at module load so an invalid fixture fails fast.
 */

/**
 * Per-day pricer applying funded hours at the headline rate, with a per-day
 * consumables charge on funded sessions and a sibling discount.
 */
export const perDayHoursDeduction: FeeSchedule = FeeSchedule.parse({
  nursery: { name: 'Sunny Bank Day Nursery', postcodeArea: 'SE15', source: 'manual-entry' },
  ageBands: [
    { id: 'babies', label: 'Babies (0-2)', fromMonths: 0, toMonths: 24 },
    { id: 'toddlers', label: 'Toddlers (2-3)', fromMonths: 24, toMonths: 36 },
    { id: 'preschool', label: 'Preschool (3+)', fromMonths: 36 },
  ],
  sessions: [
    { id: 'full-day', kind: 'full-day', label: 'Full day (7.30am-6pm)', hours: 10.5 },
    { id: 'half-day', kind: 'half-day', label: 'Half day', hours: 5.25 },
  ],
  prices: [
    { ageBandId: 'babies', sessionId: 'full-day', rate: 7800 },
    { ageBandId: 'babies', sessionId: 'half-day', rate: 4680 },
    { ageBandId: 'toddlers', sessionId: 'full-day', rate: 7200 },
    { ageBandId: 'toddlers', sessionId: 'half-day', rate: 4320 },
    { ageBandId: 'preschool', sessionId: 'full-day', rate: 6900 },
    { ageBandId: 'preschool', sessionId: 'half-day', rate: 4140 },
  ],
  discounts: [{ percentOff: 10, appliesTo: 'oldest-child' }],
  extras: [
    { label: 'Registration fee', amount: 5000, per: 'one-off', refundable: false },
    { label: 'Deposit', amount: 20000, per: 'one-off', refundable: true },
  ],
  fundingPolicy: {
    kind: 'hours-deduction',
    consumablesCharge: { amount: 950, per: 'day' },
  },
  attendancePatterns: ['term-time-38', 'stretched-all-year'],
});

/**
 * Per-hour pricer that accepts funding only from two days a week and caps
 * the funded hours it will take.
 */
export const perHourConditionalFunding: FeeSchedule = FeeSchedule.parse({
  nursery: { name: 'Little Acorns Childcare', postcodeArea: 'M20', source: 'manual-entry' },
  ageBands: [
    { id: 'under-3', label: 'Under 3s', fromMonths: 9, toMonths: 36 },
    { id: 'over-3', label: '3 to 5', fromMonths: 36, toMonths: 60 },
  ],
  sessions: [{ id: 'hourly', kind: 'hourly', label: 'Per hour', hours: 1 }],
  prices: [
    { ageBandId: 'under-3', sessionId: 'hourly', rate: 850 },
    { ageBandId: 'over-3', sessionId: 'hourly', rate: 790 },
  ],
  discounts: [],
  extras: [{ label: 'Lunch', amount: 400, per: 'day', refundable: false }],
  fundingPolicy: {
    kind: 'hours-deduction',
    conditions: { minDaysPerWeek: 2, maxFundedHoursPerWeek: 15 },
  },
  attendancePatterns: ['term-time-38'],
});

/**
 * Deducts funding at a stated rate below the headline rate, term-time only,
 * with a per-week consumables charge on funded attendance.
 */
export const fundedRateDeduction: FeeSchedule = FeeSchedule.parse({
  nursery: { name: 'The Orchard Nursery School', postcodeArea: 'BS6', source: 'manual-entry' },
  ageBands: [
    { id: 'twos', label: 'Two year olds', fromMonths: 24, toMonths: 36 },
    { id: 'preschool', label: 'Preschool', fromMonths: 36, toMonths: 60 },
  ],
  sessions: [
    { id: 'day', kind: 'full-day', label: 'Day (8am-6pm)', hours: 10 },
    { id: 'morning', kind: 'half-day', label: 'Morning', hours: 5 },
  ],
  prices: [
    { ageBandId: 'twos', sessionId: 'day', rate: 6400 },
    { ageBandId: 'twos', sessionId: 'morning', rate: 3520 },
    { ageBandId: 'preschool', sessionId: 'day', rate: 6100 },
    { ageBandId: 'preschool', sessionId: 'morning', rate: 3355 },
  ],
  discounts: [{ percentOff: 5, appliesTo: 'second-and-subsequent-children' }],
  extras: [],
  fundingPolicy: {
    kind: 'funded-rate-deduction',
    fundedRate: 570,
    consumablesCharge: { amount: 2750, per: 'week' },
    conditions: { termTimeOnly: true },
  },
  attendancePatterns: ['term-time-38', 'stretched-all-year'],
});
