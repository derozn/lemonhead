'use client';

import { FeeSchedule } from '@lemonhead/schemas';
import { useState } from 'react';

import { penceToInputString, pounds, toPence } from '../lib/format.ts';
import { nurseryNameTaken } from '../lib/storage.ts';

interface BandDraft {
  id: string;
  label: string;
  fromMonths: string;
  toMonths: string;
}

interface SessionDraft {
  id: string;
  kind: string;
  label: string;
  hours: string;
}

interface ExtraDraft {
  label: string;
  amount: string;
  per: string;
  refundable: boolean;
}

interface Draft {
  name: string;
  postcodeArea: string;
  bands: BandDraft[];
  sessions: SessionDraft[];
  /** `${bandId}|${sessionId}` → pounds string; blank = no price. */
  prices: Record<string, string>;
  discountPercent: string;
  discountAppliesTo: string;
  extras: ExtraDraft[];
  policyKind: string;
  fundedRate: string;
  fundedSessionIds: string[];
  minDaysPerWeek: string;
  maxFundedHoursPerWeek: string;
  termTimeOnly: boolean;
  conditionsUnknown: boolean;
  consumablesAmount: string;
  consumablesPer: string;
  patterns: string[];
}

function draftFrom(initial: FeeSchedule | null): Draft {
  if (!initial) {
    return {
      name: '',
      postcodeArea: '',
      bands: [{ id: 'band-1', label: '', fromMonths: '0', toMonths: '' }],
      sessions: [{ id: 'session-1', kind: 'full-day', label: '', hours: '10' }],
      prices: {},
      discountPercent: '',
      discountAppliesTo: 'oldest-child',
      extras: [],
      policyKind: 'unknown',
      fundedRate: '',
      fundedSessionIds: [],
      minDaysPerWeek: '',
      maxFundedHoursPerWeek: '',
      termTimeOnly: false,
      conditionsUnknown: false,
      consumablesAmount: '',
      consumablesPer: 'day',
      patterns: ['term-time-38'],
    };
  }
  const prices: Record<string, string> = {};
  for (const price of initial.prices) {
    prices[`${price.ageBandId}|${price.sessionId}`] = penceToInputString(price.rate);
  }
  const policy = initial.fundingPolicy;
  const offering = policy.kind !== 'not-offered' && policy.kind !== 'unknown' ? policy : undefined;
  const [discount] = initial.discounts;
  return {
    name: initial.nursery.name,
    postcodeArea: initial.nursery.postcodeArea ?? '',
    bands: initial.ageBands.map((band) => ({
      id: band.id,
      label: band.label,
      fromMonths: String(band.fromMonths),
      toMonths: band.toMonths === undefined ? '' : String(band.toMonths),
    })),
    sessions: initial.sessions.map((session) => ({
      id: session.id,
      kind: session.kind,
      label: session.label,
      hours: String(session.hours),
    })),
    prices,
    discountPercent: discount ? String(discount.percentOff) : '',
    discountAppliesTo: discount?.appliesTo ?? 'oldest-child',
    extras: initial.extras.map((extra) => ({
      label: extra.label,
      amount: penceToInputString(extra.amount),
      per: extra.per,
      refundable: extra.refundable,
    })),
    policyKind: policy.kind,
    fundedRate:
      policy.kind === 'funded-rate-deduction' ? penceToInputString(policy.fundedRate) : '',
    fundedSessionIds: policy.kind === 'sessions-allocated' ? [...policy.fundedSessionIds] : [],
    minDaysPerWeek:
      offering?.conditions?.minDaysPerWeek === undefined
        ? ''
        : String(offering.conditions.minDaysPerWeek),
    maxFundedHoursPerWeek:
      offering?.conditions?.maxFundedHoursPerWeek === undefined
        ? ''
        : String(offering.conditions.maxFundedHoursPerWeek),
    termTimeOnly: offering?.conditions?.termTimeOnly ?? false,
    conditionsUnknown: offering?.conditions?.conditionsUnknown ?? false,
    consumablesAmount: offering?.consumablesCharge
      ? penceToInputString(offering.consumablesCharge.amount)
      : '',
    consumablesPer: offering?.consumablesCharge?.per ?? 'day',
    patterns: [...initial.attendancePatterns],
  };
}

function assemble(draft: Draft): unknown {
  const prices = Object.entries(draft.prices)
    .filter(([, value]) => value.trim() !== '')
    .map(([key, value]) => {
      const [ageBandId, sessionId] = key.split('|');
      return { ageBandId, sessionId, rate: toPence(value) };
    });
  const conditions: Record<string, unknown> = {};
  if (draft.minDaysPerWeek !== '') conditions.minDaysPerWeek = Number(draft.minDaysPerWeek);
  if (draft.maxFundedHoursPerWeek !== '') {
    conditions.maxFundedHoursPerWeek = Number(draft.maxFundedHoursPerWeek);
  }
  if (draft.termTimeOnly) conditions.termTimeOnly = true;
  if (draft.conditionsUnknown) conditions.conditionsUnknown = true;
  const offeringFields = {
    ...(draft.consumablesAmount !== ''
      ? {
          consumablesCharge: {
            amount: toPence(draft.consumablesAmount),
            per: draft.consumablesPer,
          },
        }
      : {}),
    ...(Object.keys(conditions).length > 0 ? { conditions } : {}),
  };
  const fundingPolicy =
    draft.policyKind === 'hours-deduction'
      ? { kind: 'hours-deduction', ...offeringFields }
      : draft.policyKind === 'funded-rate-deduction'
        ? {
            kind: 'funded-rate-deduction',
            fundedRate: toPence(draft.fundedRate),
            ...offeringFields,
          }
        : draft.policyKind === 'sessions-allocated'
          ? {
              kind: 'sessions-allocated',
              fundedSessionIds: draft.fundedSessionIds,
              ...offeringFields,
            }
          : { kind: draft.policyKind };

  return {
    nursery: {
      name: draft.name,
      ...(draft.postcodeArea.trim() === '' ? {} : { postcodeArea: draft.postcodeArea.trim() }),
      source: 'manual-entry',
    },
    ageBands: draft.bands.map((band) => ({
      id: band.id,
      label: band.label,
      fromMonths: Number(band.fromMonths),
      ...(band.toMonths.trim() === '' ? {} : { toMonths: Number(band.toMonths) }),
    })),
    sessions: draft.sessions.map((session) => ({
      id: session.id,
      kind: session.kind,
      label: session.label,
      hours: Number(session.hours),
    })),
    prices,
    discounts:
      draft.discountPercent.trim() === ''
        ? []
        : [{ percentOff: Number(draft.discountPercent), appliesTo: draft.discountAppliesTo }],
    extras: draft.extras.map((extra) => ({
      label: extra.label,
      amount: toPence(extra.amount),
      per: extra.per,
      refundable: extra.refundable,
    })),
    fundingPolicy,
    attendancePatterns: draft.patterns,
  };
}

export function NurseryForm({
  initial,
  currentName,
  onSave,
}: {
  initial: FeeSchedule | null;
  /** The saved name this form is editing, or null when adding a new nursery.
   * Guards the saved list: a name that already belongs to a different
   * nursery is rejected here, before it can overwrite that entry. */
  currentName: string | null;
  onSave: (schedule: FeeSchedule) => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => draftFrom(initial));
  const [errors, setErrors] = useState<string[]>([]);

  const set = (patch: Partial<Draft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };
  const offersFunding = draft.policyKind !== 'not-offered' && draft.policyKind !== 'unknown';

  const submit = () => {
    const result = FeeSchedule.safeParse(assemble(draft));
    if (!result.success) {
      setErrors(result.error.issues.map((issue) => issue.message));
      return;
    }
    const name = result.data.nursery.name;
    if (nurseryNameTaken(name, currentName ?? undefined)) {
      setErrors([`A nursery called ${name} is already saved. Select it from the bar to edit it.`]);
      return;
    }
    setErrors([]);
    onSave(result.data);
  };

  return (
    <section className="card">
      <h2>Your nursery&apos;s price list</h2>
      <p className="note">
        Enter the whole price list, band by band. Anything you honestly don&apos;t know can stay
        blank or be marked unknown; the projection flags it instead of guessing.
      </p>

      <fieldset>
        <legend>Nursery</legend>
        <label>
          Name
          <input
            value={draft.name}
            onChange={(event) => {
              set({ name: event.target.value });
            }}
          />
        </label>
        <label>
          Postcode area (optional, e.g. SE15)
          <input
            value={draft.postcodeArea}
            onChange={(event) => {
              set({ postcodeArea: event.target.value });
            }}
          />
        </label>
      </fieldset>

      <fieldset>
        <legend>Age bands (months)</legend>
        {draft.bands.map((band, index) => (
          <div key={band.id}>
            <label>
              Label
              <input
                value={band.label}
                onChange={(event) => {
                  const bands = [...draft.bands];
                  bands[index] = { ...band, label: event.target.value };
                  set({ bands });
                }}
              />
            </label>
            <label>
              From (months)
              <input
                type="number"
                value={band.fromMonths}
                onChange={(event) => {
                  const bands = [...draft.bands];
                  bands[index] = { ...band, fromMonths: event.target.value };
                  set({ bands });
                }}
              />
            </label>
            <label>
              Up to, exclusive (blank = open-ended)
              <input
                type="number"
                value={band.toMonths}
                onChange={(event) => {
                  const bands = [...draft.bands];
                  bands[index] = { ...band, toMonths: event.target.value };
                  set({ bands });
                }}
              />
            </label>
          </div>
        ))}
        <button
          type="button"
          className="ghost"
          onClick={() => {
            set({
              bands: [
                ...draft.bands,
                {
                  id: `band-${String(draft.bands.length + 1)}`,
                  label: '',
                  fromMonths: '',
                  toMonths: '',
                },
              ],
            });
          }}
        >
          Add age band
        </button>
      </fieldset>

      <fieldset>
        <legend>Sessions</legend>
        {draft.sessions.map((session, index) => (
          <div key={session.id}>
            <label>
              Label
              <input
                value={session.label}
                onChange={(event) => {
                  const sessions = [...draft.sessions];
                  sessions[index] = { ...session, label: event.target.value };
                  set({ sessions });
                }}
              />
            </label>
            <label>
              Kind
              <select
                value={session.kind}
                onChange={(event) => {
                  const sessions = [...draft.sessions];
                  sessions[index] = { ...session, kind: event.target.value };
                  set({ sessions });
                }}
              >
                <option value="full-day">Full day</option>
                <option value="half-day">Half day</option>
                <option value="hourly">Hourly</option>
                <option value="weekly">Weekly</option>
              </select>
            </label>
            <label>
              Hours
              <input
                type="number"
                step="0.25"
                value={session.hours}
                onChange={(event) => {
                  const sessions = [...draft.sessions];
                  sessions[index] = { ...session, hours: event.target.value };
                  set({ sessions });
                }}
              />
            </label>
          </div>
        ))}
        <button
          type="button"
          className="ghost"
          onClick={() => {
            set({
              sessions: [
                ...draft.sessions,
                {
                  id: `session-${String(draft.sessions.length + 1)}`,
                  kind: 'full-day',
                  label: '',
                  hours: '',
                },
              ],
            });
          }}
        >
          Add session
        </button>
      </fieldset>

      <fieldset>
        <legend>Prices (£ per session; leave blank if not offered)</legend>
        <table>
          <thead>
            <tr>
              <th>Band</th>
              {draft.sessions.map((session) => (
                <th key={session.id}>{session.label || session.id}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {draft.bands.map((band) => (
              <tr key={band.id}>
                <td>{band.label || band.id}</td>
                {draft.sessions.map((session) => {
                  const key = `${band.id}|${session.id}`;
                  return (
                    <td key={session.id}>
                      <input
                        aria-label={`Price for ${band.label || band.id}, ${session.label || session.id}`}
                        value={draft.prices[key] ?? ''}
                        onChange={(event) => {
                          set({ prices: { ...draft.prices, [key]: event.target.value } });
                        }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </fieldset>

      <fieldset>
        <legend>Funded hours policy</legend>
        <label>
          How this nursery applies funded hours
          <select
            value={draft.policyKind}
            onChange={(event) => {
              set({ policyKind: event.target.value });
            }}
          >
            <option value="unknown">I don&apos;t know yet</option>
            <option value="hours-deduction">Deducts funded hours at its normal rate</option>
            <option value="funded-rate-deduction">Deducts at a lower funded rate</option>
            <option value="sessions-allocated">Funds specific whole sessions</option>
            <option value="not-offered">Does not offer funded places</option>
          </select>
        </label>
        {draft.policyKind === 'funded-rate-deduction' && (
          <label>
            Funded rate (£ per hour)
            <input
              value={draft.fundedRate}
              onChange={(event) => {
                set({ fundedRate: event.target.value });
              }}
            />
          </label>
        )}
        {draft.policyKind === 'sessions-allocated' &&
          draft.sessions.map((session) => (
            <label key={session.id} className="inline">
              <input
                type="checkbox"
                checked={draft.fundedSessionIds.includes(session.id)}
                onChange={(event) => {
                  set({
                    fundedSessionIds: event.target.checked
                      ? [...draft.fundedSessionIds, session.id]
                      : draft.fundedSessionIds.filter((id) => id !== session.id),
                  });
                }}
              />
              {session.label || session.id} can be funded
            </label>
          ))}
        {offersFunding && (
          <>
            <label>
              Minimum days/week for funding (blank if none)
              <input
                type="number"
                value={draft.minDaysPerWeek}
                onChange={(event) => {
                  set({ minDaysPerWeek: event.target.value });
                }}
              />
            </label>
            <label>
              Maximum funded hours/week accepted (blank if all)
              <input
                type="number"
                step="0.25"
                value={draft.maxFundedHoursPerWeek}
                onChange={(event) => {
                  set({ maxFundedHoursPerWeek: event.target.value });
                }}
              />
            </label>
            <label className="inline">
              <input
                type="checkbox"
                checked={draft.termTimeOnly}
                onChange={(event) => {
                  set({ termTimeOnly: event.target.checked });
                }}
              />
              Funding applies to term-time attendance only
            </label>
            <label className="inline">
              <input
                type="checkbox"
                checked={draft.conditionsUnknown}
                onChange={(event) => {
                  set({ conditionsUnknown: event.target.checked });
                }}
              />
              I don&apos;t know this nursery&apos;s funding conditions
            </label>
            <label>
              Consumables charge on funded sessions (£, blank if none)
              <input
                value={draft.consumablesAmount}
                onChange={(event) => {
                  set({ consumablesAmount: event.target.value });
                }}
              />
            </label>
            <label>
              Charged per
              <select
                value={draft.consumablesPer}
                onChange={(event) => {
                  set({ consumablesPer: event.target.value });
                }}
              >
                <option value="day">day</option>
                <option value="week">week</option>
                <option value="funded-hour">funded hour</option>
              </select>
            </label>
          </>
        )}
      </fieldset>

      <fieldset>
        <legend>Discounts and extras</legend>
        <label>
          Sibling discount % (blank if none)
          <input
            value={draft.discountPercent}
            onChange={(event) => {
              set({ discountPercent: event.target.value });
            }}
          />
        </label>
        <label>
          Applies to
          <select
            value={draft.discountAppliesTo}
            onChange={(event) => {
              set({ discountAppliesTo: event.target.value });
            }}
          >
            <option value="oldest-child">the oldest child</option>
            <option value="second-and-subsequent-children">second and later children</option>
            <option value="all-children">all children</option>
          </select>
        </label>
        {draft.extras.map((extra, index) => (
          <div key={index}>
            <label>
              Extra
              <input
                value={extra.label}
                onChange={(event) => {
                  const extras = [...draft.extras];
                  extras[index] = { ...extra, label: event.target.value };
                  set({ extras });
                }}
              />
            </label>
            <label>
              Amount (£)
              <input
                value={extra.amount}
                onChange={(event) => {
                  const extras = [...draft.extras];
                  extras[index] = { ...extra, amount: event.target.value };
                  set({ extras });
                }}
              />
            </label>
            <label>
              Per
              <select
                value={extra.per}
                onChange={(event) => {
                  const extras = [...draft.extras];
                  extras[index] = { ...extra, per: event.target.value };
                  set({ extras });
                }}
              >
                <option value="one-off">one-off</option>
                <option value="day">day</option>
                <option value="week">week</option>
                <option value="month">month</option>
                <option value="term">term</option>
                <option value="year">year</option>
              </select>
            </label>
            <label className="inline">
              <input
                type="checkbox"
                checked={extra.refundable}
                onChange={(event) => {
                  const extras = [...draft.extras];
                  extras[index] = { ...extra, refundable: event.target.checked };
                  set({ extras });
                }}
              />
              refundable
            </label>
          </div>
        ))}
        <button
          type="button"
          className="ghost"
          onClick={() => {
            set({
              extras: [
                ...draft.extras,
                { label: '', amount: '', per: 'one-off', refundable: false },
              ],
            });
          }}
        >
          Add extra
        </button>
      </fieldset>

      <fieldset>
        <legend>Attendance patterns this nursery offers</legend>
        {(['term-time-38', 'stretched-all-year'] as const).map((pattern) => (
          <label key={pattern} className="inline">
            <input
              type="checkbox"
              checked={draft.patterns.includes(pattern)}
              onChange={(event) => {
                set({
                  patterns: event.target.checked
                    ? [...draft.patterns, pattern]
                    : draft.patterns.filter((entry) => entry !== pattern),
                });
              }}
            />
            {pattern === 'term-time-38' ? 'Term time (38 weeks)' : 'All year (stretched)'}
          </label>
        ))}
      </fieldset>

      {errors.length > 0 && (
        <ul className="errors">
          {errors.map((error, index) => (
            <li key={index}>{error}</li>
          ))}
        </ul>
      )}
      <button type="button" onClick={submit}>
        Save nursery
      </button>
      {initial && (
        <p className="note">
          Currently saved: {initial.nursery.name}, cheapest listed price{' '}
          {pounds(Math.min(...initial.prices.map((price) => price.rate)))}.
        </p>
      )}
    </section>
  );
}
