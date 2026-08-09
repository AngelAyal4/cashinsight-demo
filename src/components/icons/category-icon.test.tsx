// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CategoryIcon } from '@/components/icons/category-icon';

describe('CategoryIcon', () => {
  it('renderiza svg para nombre conocido (utensils)', () => {
    const { container } = render(<CategoryIcon name="utensils" />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.tagName.toLowerCase()).toBe('svg');
  });

  it('renderiza fallback tag para nombre desconocido', () => {
    const { container } = render(<CategoryIcon name="inexistente" />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.tagName.toLowerCase()).toBe('svg');
  });
});
