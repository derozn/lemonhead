'use client';

import { FamilyProfile } from '@lemonhead/schemas';
import { useId, useState } from 'react';

import { toPence } from '../lib/format.ts';
import type { StoredFamily } from '../lib/storage.ts';

interface ChildDraft {
  dobMonth: string;
  disabled: boolean;
  daysPerWeek: string;
  hoursPerDay: string;
  pattern: string;
}

interface Draft {
  children: ChildDraft[];
  parentCount: string;
  allInPaidWork: string;
  allMeetMinimumEarnings: string;
  anyOver100k: string;
  receivesUc: boolean;
  netMonthlyEarnings: string;
  currentMonthlyAward: string;
}

const EMPTY_CHILD: ChildDraft = {
  dobMonth: '',
  disabled: false,
  daysPerWeek: '3',
  hoursPerDay: '10',
  pattern: 'term-time-38',
};

function draftFrom(stored: StoredFamily | null): Draft {
  if (!stored) {
    return {
      children: [EMPTY_CHILD],
      parentCount: '2',
      allInPaidWork: 'yes',
      allMeetMinimumEarnings: 'yes',
      anyOver100k: 'no',
      receivesUc: false,
      netMonthlyEarnings: '',
      currentMonthlyAward: '',
    };
  }
  return {
    children: stored.children.map((child) => ({
      dobMonth: child.dobMonth,
      disabled: child.disabled,
      daysPerWeek: String(child.attendance.daysPerWeek),
      hoursPerDay: String(child.attendance.hoursPerDay),
      pattern: child.attendance.pattern,
    })),
    parentCount: String(stored.parents.count),
    allInPaidWork: stored.parents.allInPaidWork,
    allMeetMinimumEarnings: stored.parents.allMeetMinimumEarnings,
    anyOver100k: stored.parents.anyOver100k,
    receivesUc: stored.receivesUniversalCredit,
    netMonthlyEarnings: '',
    currentMonthlyAward: '',
  };
}

function assemble(draft: Draft): unknown {
  return {
    children: draft.children.map((child) => ({
      dobMonth: child.dobMonth,
      disabled: child.disabled,
      attendance: {
        daysPerWeek: Number(child.daysPerWeek),
        hoursPerDay: Number(child.hoursPerDay),
        pattern: child.pattern,
      },
    })),
    parents: {
      count: Number(draft.parentCount),
      allInPaidWork: draft.allInPaidWork,
      allMeetMinimumEarnings: draft.allMeetMinimumEarnings,
      anyOver100k: draft.anyOver100k,
    },
    universalCredit: draft.receivesUc
      ? {
          receives: true,
          netMonthlyEarnings: toPence(draft.netMonthlyEarnings),
          currentMonthlyAward: toPence(draft.currentMonthlyAward),
        }
      : { receives: false },
    jurisdiction: 'england',
  };
}

function YesNoUnsureField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const hintId = useId();
  return (
    <>
      <label>
        {label}
        <select
          aria-describedby={hint === undefined ? undefined : hintId}
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
          }}
        >
          <option value="yes">Yes</option>
          <option value="no">No</option>
          <option value="unsure">Not sure</option>
        </select>
      </label>
      {hint !== undefined && (
        <p className="hint" id={hintId}>
          {hint}
        </p>
      )}
    </>
  );
}

export function FamilyForm({
  stored,
  onSave,
}: {
  stored: StoredFamily | null;
  onSave: (profile: FamilyProfile) => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => draftFrom(stored));
  const [errors, setErrors] = useState<string[]>([]);
  const hintId = useId();
  const set = (patch: Partial<Draft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  const submit = () => {
    const result = FamilyProfile.safeParse(assemble(draft));
    if (result.success) {
      setErrors([]);
      onSave(result.data);
    } else {
      setErrors(result.error.issues.map((issue) => issue.message));
    }
  };

  return (
    <section className="card">
      <h2>Your family</h2>
      <p className="note">
        These questions work out which government help your family can get. Answer what you know.
        &apos;Not sure&apos; is always a safe answer.
      </p>
      {draft.children.map((child, index) => (
        <fieldset key={index}>
          <legend>Child {index + 1}</legend>
          <label>
            Birth month
            <input
              type="month"
              aria-describedby={`${hintId}-dob-${String(index)}`}
              value={child.dobMonth}
              onChange={(event) => {
                const children = [...draft.children];
                children[index] = { ...child, dobMonth: event.target.value };
                set({ children });
              }}
            />
          </label>
          <p className="hint" id={`${hintId}-dob-${String(index)}`}>
            We only ever ask for the month and year, never the full date.
          </p>
          <label>
            Days at nursery each week
            <input
              type="number"
              min="1"
              max="7"
              value={child.daysPerWeek}
              onChange={(event) => {
                const children = [...draft.children];
                children[index] = { ...child, daysPerWeek: event.target.value };
                set({ children });
              }}
            />
          </label>
          <label>
            Hours each day
            <input
              type="number"
              step="0.25"
              aria-describedby={`${hintId}-hours-${String(index)}`}
              value={child.hoursPerDay}
              onChange={(event) => {
                const children = [...draft.children];
                children[index] = { ...child, hoursPerDay: event.target.value };
                set({ children });
              }}
            />
          </label>
          <p className="hint" id={`${hintId}-hours-${String(index)}`}>
            Count from drop-off to pick-up. 8am to 6pm is 10 hours.
          </p>
          <label>
            Which weeks will they attend?
            <select
              aria-describedby={`${hintId}-weeks-${String(index)}`}
              value={child.pattern}
              onChange={(event) => {
                const children = [...draft.children];
                children[index] = { ...child, pattern: event.target.value };
                set({ children });
              }}
            >
              <option value="term-time-38">School term weeks only (38 weeks a year)</option>
              <option value="stretched-all-year">All year round</option>
            </select>
          </label>
          <p className="hint" id={`${hintId}-weeks-${String(index)}`}>
            Term time means no nursery in the school holidays. All year round spreads the same
            funded hours across every week, so you get fewer funded hours each week.
          </p>
          <label className="inline">
            <input
              type="checkbox"
              aria-describedby={`${hintId}-disabled-${String(index)}`}
              checked={child.disabled}
              onChange={(event) => {
                const children = [...draft.children];
                children[index] = { ...child, disabled: event.target.checked };
                set({ children });
              }}
            />
            This child is disabled
          </label>
          <p className="hint" id={`${hintId}-disabled-${String(index)}`}>
            Support for a disabled child is higher and lasts to an older age.
          </p>
        </fieldset>
      ))}
      <button
        type="button"
        className="ghost"
        onClick={() => {
          set({ children: [...draft.children, EMPTY_CHILD] });
        }}
      >
        Add a child
      </button>

      <fieldset>
        <legend>You and any partner</legend>
        <label>
          How many parents live in your home?
          <select
            aria-describedby={`${hintId}-parent-count`}
            value={draft.parentCount}
            onChange={(event) => {
              set({ parentCount: event.target.value });
            }}
          >
            <option value="1">1</option>
            <option value="2">2</option>
          </select>
        </label>
        <p className="hint" id={`${hintId}-parent-count`}>
          Count yourself and a partner who lives with you, not a parent who lives elsewhere.
        </p>
        <YesNoUnsureField
          label="Is every parent at home in paid work?"
          hint="Employed or self-employed both count. There is no minimum number of hours."
          value={draft.allInPaidWork}
          onChange={(value) => {
            set({ allInPaidWork: value });
          }}
        />
        <YesNoUnsureField
          label="Does each parent earn at least the same as 16 hours a week at minimum wage?"
          hint="If everyone works 16 hours a week or more, the answer is yes. If someone works fewer hours but is well paid, it can still be yes. Pick 'Not sure' if income changes month to month."
          value={draft.allMeetMinimumEarnings}
          onChange={(value) => {
            set({ allMeetMinimumEarnings: value });
          }}
        />
        <YesNoUnsureField
          label="Will any parent have income over £100,000 this tax year?"
          hint="This means taxable income after pension contributions. If nobody comes close to £100,000, answer No."
          value={draft.anyOver100k}
          onChange={(value) => {
            set({ anyOver100k: value });
          }}
        />
      </fieldset>

      <fieldset>
        <legend>Universal Credit</legend>
        <label className="inline">
          <input
            type="checkbox"
            aria-describedby={`${hintId}-uc`}
            checked={draft.receivesUc}
            onChange={(event) => {
              set({ receivesUc: event.target.checked });
            }}
          />
          Our household gets Universal Credit
        </label>
        <p className="hint" id={`${hintId}-uc`}>
          If you get Tax-Free Childcare instead, leave this unticked. You cannot get both at once.
        </p>
        {draft.receivesUc && (
          <>
            <p className="memory-note">
              These two figures never leave your browser and are never saved, not even on this
              device. You will be asked again after a reload.
            </p>
            <label>
              Take-home pay each month (£)
              <input
                aria-describedby={`${hintId}-earnings`}
                value={draft.netMonthlyEarnings}
                onChange={(event) => {
                  set({ netMonthlyEarnings: event.target.value });
                }}
              />
            </label>
            <p className="hint" id={`${hintId}-earnings`}>
              What you and any partner receive from work in a month after tax and National
              Insurance. Do not include the Universal Credit payment itself.
            </p>
            <label>
              Monthly Universal Credit payment (£)
              <input
                aria-describedby={`${hintId}-award`}
                value={draft.currentMonthlyAward}
                onChange={(event) => {
                  set({ currentMonthlyAward: event.target.value });
                }}
              />
            </label>
            <p className="hint" id={`${hintId}-award`}>
              The total on your latest statement. In your Universal Credit online account it is
              under &apos;Payments&apos;.
            </p>
          </>
        )}
      </fieldset>

      {errors.length > 0 && (
        <ul className="errors">
          {errors.map((error, index) => (
            <li key={index}>{error}</li>
          ))}
        </ul>
      )}
      <button type="button" onClick={submit}>
        See what you&apos;ll pay
      </button>
    </section>
  );
}
