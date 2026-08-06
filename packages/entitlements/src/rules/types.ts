import type { IsoDate, Jurisdiction, NonNegativePence } from '@lemonhead/schemas';

/**
 * Every parameter in a rule set traces back to an official source captured at
 * encoding time (spec §3: never trust training data for rates or thresholds).
 */
export interface Citation {
  url: string;
  /** The exact wording the parameter was read from. */
  quote: string;
  /** When the source was checked, YYYY-MM-DD. */
  retrievedOn: string;
}

interface SchemeParamsBase {
  /** The date these figures took effect; superseded by any later params file. */
  effectiveFrom: IsoDate;
  sources: Citation[];
}

/** Quarterly minimum-earnings thresholds by the parent's age (NMW-linked). */
export interface QuarterlyEarningsThresholds {
  age21AndOverPence: NonNegativePence;
  age18To20Pence: NonNegativePence;
  under18OrApprenticePence: NonNegativePence;
}

export interface FundedHoursParams extends SchemeParamsBase {
  jurisdiction: Jurisdiction;
  /** Months in which school terms start (1 = January). Entitlements begin the term after the qualifying birthday. */
  termStartMonths: readonly number[];
  workingParent: {
    hoursPerWeek: number;
    weeksPerYear: number;
    /** Child qualifies from this age; hours start the term after reaching it. */
    minAgeMonths: number;
    minQuarterlyEarnings: QuarterlyEarningsThresholds;
    /** Adjusted net income cliff edge, per parent, per year. */
    maxAdjustedNetIncomePerParentPence: NonNegativePence;
  };
  /** The universal entitlement for 3–4-year-olds. No work or income test. */
  universalThreeToFour: {
    hoursPerWeek: number;
    weeksPerYear: number;
    minAgeMonths: number;
  };
  /**
   * The benefits-linked offer for 2-year-olds. Signposted, not modelled:
   * its qualifying-benefit tests are outside this product's questionnaire.
   */
  disadvantagedTwos: {
    hoursPerWeek: number;
    weeksPerYear: number;
    minAgeMonths: number;
  };
}

export interface TaxFreeChildcareParams extends SchemeParamsBase {
  /** "For every £8 you pay in, the government will top it up by £2" — stored in pence (800 and 200), like every money field here. */
  topUp: { parentPaysPence: NonNegativePence; governmentAddsPence: NonNegativePence };
  quarterlyCapPence: NonNegativePence;
  disabledQuarterlyCapPence: NonNegativePence;
  /** Child age limits in whole years ("11 or younger; 16 or younger if disabled"). */
  maxAgeYears: { standard: number; disabled: number };
  minQuarterlyEarnings: QuarterlyEarningsThresholds;
  maxAdjustedNetIncomePerParentPence: NonNegativePence;
}

export interface UniversalCreditParams extends SchemeParamsBase {
  childcare: {
    /** Percentage of eligible childcare costs covered. */
    percentCovered: number;
    monthlyCapOneChildPence: NonNegativePence;
    monthlyCapTwoPlusChildrenPence: NonNegativePence;
  };
  /** Pence withdrawn per pound of net earnings above the work allowance. */
  taperPercent: number;
  workAllowanceMonthly: {
    /** "Higher work allowance (no housing amount)". */
    noHousingPence: NonNegativePence;
    /** "Lower work allowance" (household gets help with housing costs). */
    withHousingPence: NonNegativePence;
  };
  benefitCap: {
    /** Net monthly household earnings at or above this exempt the household. */
    earningsExemptionMonthlyNetPence: NonNegativePence;
    monthlyWithChildrenOutsideLondonPence: NonNegativePence;
    monthlyWithChildrenLondonPence: NonNegativePence;
  };
}

/** The composite rule set the engine runs against, stamped into projections. */
export interface RuleSet {
  id: string;
  jurisdiction: Jurisdiction;
  fundedHours: FundedHoursParams;
  taxFreeChildcare: TaxFreeChildcareParams;
  universalCredit: UniversalCreditParams;
}
