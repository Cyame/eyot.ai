import { render, screen } from '@testing-library/react';
import { Inbox, Layers } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import EmptyState from '@/components/EmptyState';

describe('EmptyState', () => {
  it('renders title, description, and action', () => {
    render(
      <EmptyState
        icon={Layers}
        title="No habitats"
        description="Create one to start."
        action={<button type="button">Create</button>}
      />,
    );
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('No habitats')).toBeInTheDocument();
    expect(screen.getByText('Create one to start.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
  });

  it('uses the default inbox icon when none is passed', () => {
    render(<EmptyState icon={Inbox} title="Empty" />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('uses earth fill and ink text for the continent empty state', () => {
    render(<EmptyState tone="earth" title="No continents yet" description="Create one." />);
    const box = screen.getByTestId('empty-state');
    expect(box).toHaveClass('bg-earth');
    expect(box).toHaveClass('border-earth-line');
    expect(screen.getByText('No continents yet')).toHaveClass('text-ink');
    expect(screen.getByText('Create one.')).toHaveClass('text-ink');
  });
});
