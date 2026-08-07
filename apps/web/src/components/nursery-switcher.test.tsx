import { fundedRateDeduction, perDayHoursDeduction } from '@lemonhead/schemas/fixtures';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { NurserySwitcher } from './nursery-switcher.tsx';

const nurseries = [perDayHoursDeduction, fundedRateDeduction];

function renderSwitcher(overrides: Partial<Parameters<typeof NurserySwitcher>[0]> = {}) {
  const handlers = {
    onSelect: vi.fn(),
    onAdd: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
  };
  render(
    <NurserySwitcher
      nurseries={nurseries}
      activeName={perDayHoursDeduction.nursery.name}
      {...handlers}
      {...overrides}
    />,
  );
  return handlers;
}

describe('NurserySwitcher', () => {
  it('lists every saved nursery and marks the active one', () => {
    renderSwitcher();
    const active = screen.getByRole('button', { name: 'Sunny Bank Day Nursery' });
    expect(active).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('button', { name: 'The Orchard Nursery School' })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('selects a nursery on click', async () => {
    const handlers = renderSwitcher();
    await userEvent.click(screen.getByRole('button', { name: 'The Orchard Nursery School' }));
    expect(handlers.onSelect).toHaveBeenCalledWith('The Orchard Nursery School');
  });

  it('offers add and edit', async () => {
    const handlers = renderSwitcher();
    await userEvent.click(screen.getByRole('button', { name: 'Add another nursery' }));
    expect(handlers.onAdd).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole('button', { name: 'Edit Sunny Bank Day Nursery' }));
    expect(handlers.onEdit).toHaveBeenCalledOnce();
  });

  it('deletes only after the inline second step', async () => {
    const handlers = renderSwitcher();
    await userEvent.click(screen.getByRole('button', { name: 'Delete Sunny Bank Day Nursery' }));
    expect(handlers.onDelete).not.toHaveBeenCalled();
    await userEvent.click(
      screen.getByRole('button', { name: 'Yes, delete Sunny Bank Day Nursery' }),
    );
    expect(handlers.onDelete).toHaveBeenCalledWith('Sunny Bank Day Nursery');
  });

  it('keeps keyboard focus on the flow through the two-step delete', async () => {
    renderSwitcher();
    await userEvent.click(screen.getByRole('button', { name: 'Delete Sunny Bank Day Nursery' }));
    // The delete button unmounted; focus must land on the confirm button,
    // not fall to the body.
    expect(
      screen.getByRole('button', { name: 'Yes, delete Sunny Bank Day Nursery' }),
    ).toHaveFocus();
    await userEvent.click(screen.getByRole('button', { name: 'Keep it' }));
    expect(screen.getByRole('button', { name: 'Delete Sunny Bank Day Nursery' })).toHaveFocus();
  });

  it('backs out of a delete without deleting', async () => {
    const handlers = renderSwitcher();
    await userEvent.click(screen.getByRole('button', { name: 'Delete Sunny Bank Day Nursery' }));
    await userEvent.click(screen.getByRole('button', { name: 'Keep it' }));
    expect(handlers.onDelete).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: 'Delete Sunny Bank Day Nursery' }),
    ).toBeInTheDocument();
  });
});
