import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from '@/test/axe-helper';
import NotificationDetailModal from './NotificationDetailModal';

vi.mock('next/link', () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));

describe('NotificationDetailModal — accesibilidad', () => {
  it('no tiene violaciones axe cuando renderiza una notificación', async () => {
    const { container } = render(
      <NotificationDetailModal
        notification={{
          id: 1,
          asunto: 'Solicitud aprobada',
          mensaje: 'Tu solicitud ha sido aprobada.',
          tipo: 'aprobacion',
          solicitud_id: 42,
          created_at: '2026-05-21T10:00:00Z',
        }}
        onClose={() => {}}
        solicitudHrefPattern={(id) => `/solicitudes/${id}`}
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('no tiene violaciones axe cuando no hay notificación (DOM vacío)', async () => {
    const { container } = render(
      <NotificationDetailModal notification={null} onClose={() => {}} />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
