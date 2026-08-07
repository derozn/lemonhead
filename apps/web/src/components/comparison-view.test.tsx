import { isoDate } from '@lemonhead/schemas';
import { familyOf, fundedRateDeduction, perDayHoursDeduction } from '@lemonhead/schemas/fixtures';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ComparisonView } from './comparison-view.tsx';

const profile = familyOf({ dobMonth: '2024-11' });
const asOfDate = isoDate('2026-08-05');

describe('ComparisonView', () => {
  it('renders a headline card per nursery with the engine annual figures', () => {
    render(
      <ComparisonView
        schedules={[perDayHoursDeduction, fundedRateDeduction]}
        profile={profile}
        asOfDate={asOfDate}
      />,
    );
    // Sunny Bank: £8,429.00 gross, £7,522.60 off, £906.40 net (acceptance
    // scenario A), average £75.53 a month.
    const sunny = screen.getByRole('heading', { name: 'Sunny Bank Day Nursery' });
    expect(sunny).toBeInTheDocument();
    expect(screen.getByText('£8,429.00')).toBeInTheDocument();
    expect(screen.getByText('£7,522.60')).toBeInTheDocument();
    expect(screen.getByText('£906.40')).toBeInTheDocument();
    expect(screen.getByText('£75.53')).toBeInTheDocument();
    // The Orchard: £5,472.00 gross, £4,366.26 off, £1,105.74 net, £92.15 a month.
    expect(screen.getByRole('heading', { name: 'The Orchard Nursery School' })).toBeInTheDocument();
    expect(screen.getByText('£5,472.00')).toBeInTheDocument();
    expect(screen.getByText('£4,366.26')).toBeInTheDocument();
    expect(screen.getByText('£1,105.74')).toBeInTheDocument();
    expect(screen.getByText('£92.15')).toBeInTheDocument();
  });

  it('shows 12 month rows with one column per nursery', () => {
    render(
      <ComparisonView
        schedules={[perDayHoursDeduction, fundedRateDeduction]}
        profile={profile}
        asOfDate={asOfDate}
      />,
    );
    expect(
      screen.getByRole('columnheader', { name: 'Sunny Bank Day Nursery' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'The Orchard Nursery School' }),
    ).toBeInTheDocument();
    // 12 month rows, each with a rowheader like "2026-08".
    const monthHeaders = screen
      .getAllByRole('rowheader')
      .filter((header) => /^\d{4}-\d{2}$/.test(header.textContent));
    expect(monthHeaders).toHaveLength(12);
  });

  it('marks the cheapest nursery per row, flipping when the cheaper one changes mid-year', () => {
    render(
      <ComparisonView
        schedules={[perDayHoursDeduction, fundedRateDeduction]}
        profile={profile}
        asOfDate={asOfDate}
      />,
    );
    // August 2026: The Orchard is term-time only, so it costs £0.00 while
    // Sunny Bank costs £112.20 (acceptance scenario A's first month).
    const august = screen.getByRole('row', { name: /2026-08/ });
    const augustCells = within(august).getAllByRole('cell');
    expect(augustCells[0]).toHaveTextContent('£112.20');
    expect(augustCells[0]).not.toHaveTextContent('lowest');
    expect(augustCells[1]).toHaveTextContent('£0.00');
    expect(augustCells[1]).toHaveTextContent('lowest');
    // January 2027: term has started, and the cheapest flips to Sunny Bank
    // (£72.20 against The Orchard's £122.86).
    const january = screen.getByRole('row', { name: /2027-01/ });
    const januaryCells = within(january).getAllByRole('cell');
    expect(januaryCells[0]).toHaveTextContent('£72.20');
    expect(januaryCells[0]).toHaveTextContent('lowest');
    expect(januaryCells[1]).toHaveTextContent('£122.86');
    expect(januaryCells[1]).not.toHaveTextContent('lowest');
  });

  it('renders nothing with fewer than two nurseries', () => {
    const { container } = render(
      <ComparisonView schedules={[perDayHoursDeduction]} profile={profile} asOfDate={asOfDate} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
