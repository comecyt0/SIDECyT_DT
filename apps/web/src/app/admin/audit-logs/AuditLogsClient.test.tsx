import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AuditLogsClient from './AuditLogsClient';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, refresh: vi.fn() }),
}));

describe('AuditLogsClient', () => {
  const baseLogs = {
    data: [
      {
        id: 1,
        action: 'solicitud.aprobada_documentalmente',
        user_id: 2,
        user: { id: 2, name: 'Juan Revisor', email: 'juan@x.mx', rol_id: 2 },
        subject_type: 'App\\Models\\Solicitud',
        subject_id: 42,
        metadata: { estado_previo: 'enviada' },
        ip: '127.0.0.1',
        created_at: '2026-05-20T15:30:00Z',
      },
    ],
    current_page: 1,
    last_page: 3,
    per_page: 25,
    total: 60,
  };

  it('renderiza los rows y pinta acción + usuario', () => {
    render(<AuditLogsClient logs={baseLogs} initialFilters={{ action: '', user_id: '', from: '', to: '' }} />);
    expect(screen.getByText('solicitud.aprobada_documentalmente')).toBeInTheDocument();
    expect(screen.getByText('Juan Revisor')).toBeInTheDocument();
    expect(screen.getByText('juan@x.mx')).toBeInTheDocument();
    expect(screen.getByText('Solicitud#42')).toBeInTheDocument();
  });

  it('botón Aplicar pushea querystring con los filtros', () => {
    pushMock.mockReset();
    render(<AuditLogsClient logs={baseLogs} initialFilters={{ action: 'convenio', user_id: '5', from: '2026-01-01', to: '', page: undefined } as any} />);
    fireEvent.click(screen.getByRole('button', { name: /Aplicar/i }));
    expect(pushMock).toHaveBeenCalled();
    const last = pushMock.mock.calls[pushMock.mock.calls.length - 1][0] as string;
    expect(last).toMatch(/action=convenio/);
    expect(last).toMatch(/user_id=5/);
    expect(last).toMatch(/from=2026-01-01/);
  });

  it('paginación: Siguiente avanza a página 2', () => {
    pushMock.mockReset();
    render(<AuditLogsClient logs={baseLogs} initialFilters={{ action: '', user_id: '', from: '', to: '' }} />);
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));
    expect(pushMock).toHaveBeenCalled();
    const last = pushMock.mock.calls[pushMock.mock.calls.length - 1][0] as string;
    expect(last).toMatch(/page=2/);
  });

  it('mensaje vacío cuando no hay rows', () => {
    render(<AuditLogsClient logs={{ ...baseLogs, data: [], total: 0 }} initialFilters={{ action: '', user_id: '', from: '', to: '' }} />);
    expect(screen.getByText(/Sin eventos para los filtros actuales/i)).toBeInTheDocument();
  });
});
