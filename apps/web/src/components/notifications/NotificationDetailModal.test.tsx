import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import NotificationDetailModal, { type NotificationDetail } from './NotificationDetailModal';

// next/link es sólo un wrapper de <a>; lo dejamos como pass-through.
vi.mock('next/link', () => ({
  default: ({ children, href, onClick }: { children: React.ReactNode; href: string; onClick?: () => void }) => (
    <a href={href} onClick={onClick}>
      {children}
    </a>
  ),
}));

describe('NotificationDetailModal', () => {
  const base: NotificationDetail = {
    id: 1,
    asunto: 'Asunto de prueba',
    mensaje: '<strong>Hola</strong> mundo',
    tipo: 'info',
    created_at: '2026-01-15T10:00:00Z',
  };

  it('no renderiza nada cuando notification es null', () => {
    const { container } = render(<NotificationDetailModal notification={null} onClose={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renderiza asunto y mensaje con HTML', () => {
    render(<NotificationDetailModal notification={base} onClose={() => {}} />);

    expect(screen.getByText('Asunto de prueba')).toBeInTheDocument();
    // dangerouslySetInnerHTML: el <strong> debe haberse inyectado
    expect(screen.getByText('Hola').tagName).toBe('STRONG');
    expect(screen.getByText(/mundo/)).toBeInTheDocument();
  });

  it('clic en el botón X llama onClose', () => {
    const onClose = vi.fn();
    render(<NotificationDetailModal notification={base} onClose={onClose} />);

    fireEvent.click(screen.getByLabelText('Cerrar'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('presionar Escape llama onClose', () => {
    const onClose = vi.fn();
    render(<NotificationDetailModal notification={base} onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('muestra link "Ver solicitud" cuando hay solicitudHrefPattern y solicitud_id', () => {
    const pattern = (id: number) => `/admin/solicitudes/${id}`;
    render(
      <NotificationDetailModal
        notification={{ ...base, solicitud_id: 42 }}
        onClose={() => {}}
        solicitudHrefPattern={pattern}
      />,
    );

    const link = screen.getByRole('link', { name: /Ver solicitud/i });
    expect(link).toHaveAttribute('href', '/admin/solicitudes/42');
  });

  it('no muestra link "Ver solicitud" cuando falta solicitudHrefPattern', () => {
    render(
      <NotificationDetailModal notification={{ ...base, solicitud_id: 42 }} onClose={() => {}} />,
    );
    expect(screen.queryByRole('link', { name: /Ver solicitud/i })).not.toBeInTheDocument();
  });

  it('muestra el folio en el link cuando la solicitud anidada lo trae', () => {
    render(
      <NotificationDetailModal
        notification={{ ...base, solicitud: { id: 7, folio: 'X-2026-007' } }}
        onClose={() => {}}
        solicitudHrefPattern={(id) => `/r/${id}`}
      />,
    );

    expect(screen.getByRole('link', { name: /X-2026-007/ })).toBeInTheDocument();
  });

  it('muestra placeholder "Sin contenido adicional" cuando no hay mensaje', () => {
    render(
      <NotificationDetailModal notification={{ id: 1, asunto: 'A' }} onClose={() => {}} />,
    );
    expect(screen.getByText(/Sin contenido adicional/i)).toBeInTheDocument();
  });
});
