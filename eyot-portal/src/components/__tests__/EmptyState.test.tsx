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
});
