import { describe, it, expect, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { axe } from '@/test/axe-helper';
import SavedFiltersBar from './SavedFiltersBar';

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({
      data: [
        { id: 1, scope: 'admin.solicitudes', nombre: 'Pendientes', filtros: {}, predeterminado: true },
      ],
    }),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('SavedFiltersBar — accesibilidad', () => {
  it('no tiene violaciones axe con filtros cargados', async () => {
    const { container } = render(
      <SavedFiltersBar scope="admin.solicitudes" currentFilters={{ search: '' }} onApply={() => {}} />
    );
    await waitFor(() => {
      expect(container.querySelector('button[aria-label]')).toBeTruthy();
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
