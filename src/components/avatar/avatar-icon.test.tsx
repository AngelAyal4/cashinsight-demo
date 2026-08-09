// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AvatarIcon } from '@/components/avatar/avatar-icon';

describe('AvatarIcon', () => {
  it('renderiza con role img y aria-label para id válido (bruno)', () => {
    render(<AvatarIcon id="bruno" />);
    const svg = screen.getByRole('img', { name: 'Bruno' });
    expect(svg.tagName.toLowerCase()).toBe('svg');
    expect(svg.getAttribute('aria-label')).toBe('Bruno');
  });

  it('renderiza con aria-label para mateo', () => {
    render(<AvatarIcon id="mateo" />);
    const svg = screen.getByRole('img', { name: 'Mateo' });
    expect(svg.tagName.toLowerCase()).toBe('svg');
    expect(svg.getAttribute('aria-label')).toBe('Mateo');
  });
});
