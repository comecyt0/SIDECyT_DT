import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from '@/test/axe-helper';
import GlobalSearch from './GlobalSearch';

vi.mock('@/lib/api', () => ({
  default: { get: vi.fn().mockResolvedValue({ data: { solicitudes: [], usuarios: [], instituciones: [] } }) },
}));

describe('GlobalSearch — accesibilidad', () => {
  it('no tiene violaciones axe en el estado inicial', async () => {
    const { container } = render(<GlobalSearch />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
