import type { FamilyProfile, FeeSchedule } from '@lemonhead/schemas';
import { isoDate } from '@lemonhead/schemas';
import {
  familyOf,
  fundedRateDeduction,
  perDayHoursDeduction,
  ucHouseholdTwoChildren,
} from '@lemonhead/schemas/fixtures';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { clearAll, listNurseries, saveNursery } from '../lib/storage.ts';

import { FamilyForm } from './family-form.tsx';
import { NurseryForm } from './nursery-form.tsx';
import { ProjectionView } from './projection-view.tsx';

describe('NurseryForm', () => {
  beforeEach(() => {
    clearAll();
  });

  it('round-trips a full fixture schedule through the form', async () => {
    const onSave = vi.fn<(schedule: FeeSchedule) => void>();
    render(<NurseryForm initial={perDayHoursDeduction} currentName={null} onSave={onSave} />);
    await userEvent.click(screen.getByRole('button', { name: 'Save nursery' }));
    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave.mock.calls[0]?.[0]).toEqual(perDayHoursDeduction);
  });

  it('shows schema errors instead of saving invalid input', async () => {
    const onSave = vi.fn();
    render(<NurseryForm initial={perDayHoursDeduction} currentName={null} onSave={onSave} />);
    await userEvent.clear(screen.getByLabelText('Name'));
    await userEvent.click(screen.getByRole('button', { name: 'Save nursery' }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('The nursery needs a name')).toBeInTheDocument();
  });

  it('refuses to add a nursery whose name is already saved, without overwriting', async () => {
    saveNursery(perDayHoursDeduction);
    const onSave = vi.fn();
    // Add mode (currentName null) with a draft carrying the saved name.
    render(<NurseryForm initial={perDayHoursDeduction} currentName={null} onSave={onSave} />);
    await userEvent.click(screen.getByRole('button', { name: 'Save nursery' }));
    expect(onSave).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        'A nursery called Sunny Bank Day Nursery is already saved. Select it from the bar to edit it.',
      ),
    ).toBeInTheDocument();
    expect(listNurseries()).toEqual([perDayHoursDeduction]);
  });

  it('refuses a rename onto another saved nursery, but allows keeping your own name', async () => {
    saveNursery(perDayHoursDeduction);
    saveNursery(fundedRateDeduction);
    const onSave = vi.fn<(schedule: FeeSchedule) => void>();
    render(
      <NurseryForm
        initial={perDayHoursDeduction}
        currentName={perDayHoursDeduction.nursery.name}
        onSave={onSave}
      />,
    );
    // Keeping the current name is not a collision.
    await userEvent.click(screen.getByRole('button', { name: 'Save nursery' }));
    expect(onSave).toHaveBeenCalledOnce();
    // Renaming onto the other saved nursery is.
    await userEvent.clear(screen.getByLabelText('Name'));
    await userEvent.type(screen.getByLabelText('Name'), fundedRateDeduction.nursery.name);
    await userEvent.click(screen.getByRole('button', { name: 'Save nursery' }));
    expect(onSave).toHaveBeenCalledOnce();
    expect(
      screen.getByText(
        'A nursery called The Orchard Nursery School is already saved. Select it from the bar to edit it.',
      ),
    ).toBeInTheDocument();
  });
});

describe('FamilyForm', () => {
  it('reveals the memory-only UC figure fields only for claimants', async () => {
    render(<FamilyForm stored={null} onSave={vi.fn()} />);
    expect(screen.queryByText(/never leave your browser/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByLabelText(/gets Universal Credit/));
    expect(screen.getByText(/never leave your browser/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Take-home pay each month/)).toBeInTheDocument();
  });

  it('describes an input through its hint via aria-describedby', () => {
    render(<FamilyForm stored={null} onSave={vi.fn()} />);
    expect(screen.getByLabelText('Birth month')).toHaveAccessibleDescription(
      'We only ever ask for the month and year, never the full date.',
    );
  });

  it('submits a valid claimant household as a parsed FamilyProfile', async () => {
    const onSave = vi.fn<(profile: FamilyProfile) => void>();
    render(<FamilyForm stored={null} onSave={onSave} />);
    await userEvent.type(screen.getByLabelText('Birth month'), '2024-11');
    await userEvent.click(screen.getByLabelText(/gets Universal Credit/));
    await userEvent.type(screen.getByLabelText(/Take-home pay each month/), '1450');
    await userEvent.type(screen.getByLabelText(/Monthly Universal Credit payment/), '896');
    await userEvent.click(screen.getByRole('button', { name: /See what/ }));
    expect(onSave).toHaveBeenCalledOnce();
    const profile = onSave.mock.calls[0]?.[0];
    expect(profile?.universalCredit).toEqual({
      receives: true,
      netMonthlyEarnings: 145000,
      currentMonthlyAward: 89600,
    });
  });

  it('rejects a claimant without figures, naming the missing fields', async () => {
    const onSave = vi.fn();
    render(<FamilyForm stored={null} onSave={onSave} />);
    await userEvent.type(screen.getByLabelText('Birth month'), '2024-11');
    await userEvent.click(screen.getByLabelText(/gets Universal Credit/));
    await userEvent.click(screen.getByRole('button', { name: /See what/ }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getAllByRole('listitem').length).toBeGreaterThan(0);
  });
});

describe('ProjectionView', () => {
  it('renders totals, eligibility chips, and cited sources', () => {
    render(
      <ProjectionView
        schedule={perDayHoursDeduction}
        profile={familyOf({ dobMonth: '2024-11' })}
        asOfDate={isoDate('2026-08-05')}
      />,
    );
    // Acceptance scenario A: £112.20 in month 1, £906.40 over the year.
    expect(screen.getByText('£112.20 this month')).toBeInTheDocument();
    expect(screen.getByText(/£906\.40 over the next 12 months/)).toBeInTheDocument();
    expect(screen.getByText('Child 1: 30 funded hours eligible')).toBeInTheDocument();
    const ruleLinks = screen.getAllByRole('link', { name: /gov\.uk rule/ });
    expect(ruleLinks.length).toBeGreaterThan(0);
    expect(ruleLinks[0]).toHaveAttribute('href', expect.stringContaining('gov.uk'));
  });

  it('renders a UC household with the element applied', () => {
    render(
      <ProjectionView
        schedule={perDayHoursDeduction}
        profile={ucHouseholdTwoChildren}
        asOfDate={isoDate('2026-08-05')}
      />,
    );
    expect(screen.getByText('UC childcare element eligible')).toBeInTheDocument();
    expect(screen.getByText(/Universal Credit childcare element: 85%/)).toBeInTheDocument();
  });

  it('renders placeholder amounts as formatted pounds, never raw tokens', () => {
    render(
      <ProjectionView
        schedule={perDayHoursDeduction}
        profile={ucHouseholdTwoChildren}
        asOfDate={isoDate('2026-08-05')}
      />,
    );
    // The UC line's description carries {monthlyCap}; two children puts the
    // 2026-04-06 cap at 183616 pence, so the formatted figure must appear.
    expect(screen.getByText(/up to £1,836\.16 a month/)).toBeInTheDocument();
    expect(screen.queryByText(/\{monthlyCap\}/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\{\w+\}/)).not.toBeInTheDocument();
  });
});
