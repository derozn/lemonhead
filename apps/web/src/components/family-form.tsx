'use client';

import { FamilyProfile } from '@lemonhead/schemas';
import { useState } from 'react';

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
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      {label}
      <select
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
      {draft.children.map((child, index) => (
        <fieldset key={index}>
          <legend>Child {index + 1}</legend>
          <label>
            Birth month
            <input
              type="month"
              value={child.dobMonth}
              onChange={(event) => {
                const children = [...draft.children];
                children[index] = { ...child, dobMonth: event.target.value };
                set({ children });
              }}
            />
          </label>
          <label>
            Days a week
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
            Hours a day
            <input
              type="number"
              step="0.25"
              value={child.hoursPerDay}
              onChange={(event) => {
                const children = [...draft.children];
                children[index] = { ...child, hoursPerDay: event.target.value };
                set({ children });
              }}
            />
          </label>
          <label>
            Weeks pattern
            <select
              value={child.pattern}
              onChange={(event) => {
                const children = [...draft.children];
                children[index] = { ...child, pattern: event.target.value };
                set({ children });
              }}
            >
              <option value="term-time-38">Term time (38 weeks)</option>
              <option value="stretched-all-year">All year (stretched)</option>
            </select>
          </label>
          <label className="inline">
            <input
              type="checkbox"
              checked={child.disabled}
              onChange={(event) => {
                const children = [...draft.children];
                children[index] = { ...child, disabled: event.target.checked };
                set({ children });
              }}
            />
            This child is disabled (raises some support caps)
          </label>
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
        <legend>Parents</legend>
        <label>
          Parents in the household
          <select
            value={draft.parentCount}
            onChange={(event) => {
              set({ parentCount: event.target.value });
            }}
          >
            <option value="1">1</option>
            <option value="2">2</option>
          </select>
        </label>
        <YesNoUnsureField
          label="Are all parents in paid work (any hours)?"
          value={draft.allInPaidWork}
          onChange={(value) => {
            set({ allInPaidWork: value });
          }}
        />
        <YesNoUnsureField
          label="Does each parent earn at least 16 hours a week at minimum wage?"
          value={draft.allMeetMinimumEarnings}
          onChange={(value) => {
            set({ allMeetMinimumEarnings: value });
          }}
        />
        <YesNoUnsureField
          label="Does any parent expect over £100,000 adjusted net income this tax year?"
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
            checked={draft.receivesUc}
            onChange={(event) => {
              set({ receivesUc: event.target.checked });
            }}
          />
          This household receives Universal Credit
        </label>
        {draft.receivesUc && (
          <>
            <p className="memory-note">
              These two figures never leave your browser and are never saved, not even on this
              device. You will be asked again after a reload.
            </p>
            <label>
              Household net monthly earnings (£, after tax and NI)
              <input
                value={draft.netMonthlyEarnings}
                onChange={(event) => {
                  set({ netMonthlyEarnings: event.target.value });
                }}
              />
            </label>
            <label>
              Current monthly UC award (£, from your statement)
              <input
                value={draft.currentMonthlyAward}
                onChange={(event) => {
                  set({ currentMonthlyAward: event.target.value });
                }}
              />
            </label>
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
