import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ProgenitorAvatar from '@/components/ProgenitorAvatar';

describe('ProgenitorAvatar', () => {
  it('renders the progenitor portrait for a known slug', () => {
    render(<ProgenitorAvatar slug="fox" label="Fox" />);
    const avatar = screen.getByTestId('progenitor-avatar');
    expect(avatar).toHaveAttribute('data-progenitor-slug', 'fox');
    expect(screen.getByRole('img', { name: 'Fox' })).toHaveAttribute(
      'src',
      '/assets/progenitors/fox.svg',
    );
  });

  it('resolves a prefixed entity slug to the progenitor portrait', () => {
    render(<ProgenitorAvatar slug="beaver-builder" label="Builder" />);
    expect(screen.getByTestId('progenitor-avatar')).toHaveAttribute(
      'data-progenitor-slug',
      'beaver',
    );
  });

  it('falls back to an initial avatar for unknown slugs', () => {
    render(<ProgenitorAvatar slug="custom-line" label="Custom" />);
    expect(screen.queryByTestId('progenitor-avatar')).not.toBeInTheDocument();
    expect(screen.getByTestId('initial-avatar')).toHaveTextContent('C');
  });
});
