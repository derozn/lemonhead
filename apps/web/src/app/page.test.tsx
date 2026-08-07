import { fundedRateDeduction, perDayHoursDeduction } from '@lemonhead/schemas/fixtures';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { clearAll, listNurseries, saveNursery } from '../lib/storage.ts';

import Home from './page.tsx';

describe('Home nursery switching', () => {
  beforeEach(() => {
    clearAll();
  });

  it('shows the saved-nurseries bar and the active nursery in the form', () => {
    saveNursery(perDayHoursDeduction);
    saveNursery(fundedRateDeduction);
    render(<Home />);
    expect(screen.getByRole('button', { name: 'Sunny Bank Day Nursery' })).toBeInTheDocument();
    const active = screen.getByRole('button', { name: 'The Orchard Nursery School' });
    expect(active).toHaveAttribute('aria-current', 'true');
    // The form on the nursery step is prefilled with the active nursery.
    expect(screen.getByLabelText('Name')).toHaveValue('The Orchard Nursery School');
  });

  it('opens a blank form when adding another nursery', async () => {
    saveNursery(perDayHoursDeduction);
    render(<Home />);
    await userEvent.click(screen.getByRole('button', { name: 'Add another nursery' }));
    expect(screen.getByLabelText('Name')).toHaveValue('');
  });

  it('switches the form when a different nursery is selected', async () => {
    saveNursery(perDayHoursDeduction);
    saveNursery(fundedRateDeduction);
    render(<Home />);
    await userEvent.click(screen.getByRole('button', { name: 'Sunny Bank Day Nursery' }));
    expect(screen.getByLabelText('Name')).toHaveValue('Sunny Bank Day Nursery');
  });

  it('deletes a nursery through the two-step confirm and updates the store', async () => {
    saveNursery(perDayHoursDeduction);
    saveNursery(fundedRateDeduction);
    render(<Home />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Delete The Orchard Nursery School' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Yes, delete The Orchard Nursery School' }),
    );
    expect(
      screen.queryByRole('button', { name: 'The Orchard Nursery School' }),
    ).not.toBeInTheDocument();
    expect(listNurseries()).toEqual([perDayHoursDeduction]);
    // The survivor becomes active.
    expect(screen.getByRole('button', { name: 'Sunny Bank Day Nursery' })).toHaveAttribute(
      'aria-current',
      'true',
    );
  });
});
