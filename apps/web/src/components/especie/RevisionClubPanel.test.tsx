import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { axe } from '@/test/axe-helper';
import RevisionClubPanel, { type PermisosRevision } from './RevisionClubPanel';

vi.mock('next/link', () => ({ default: ({ children, href, ...r }: { children: React.ReactNode; href: string }) => <a href={href} {...r}>{children}</a> }));
const post = vi.fn();
vi.mock('@/lib/api', () => ({ default: { post: (...a: unknown[]) => post(...a), get: vi.fn() } }));

const nada: PermisosRevision = { resolver: false, observar: false, rechazar: false, prorroga: false, visto_bueno: false, comite: false, acta: false };
const avance = { etapa_actual: { id: 1, orden: 1, nombre: 'Revisión documental', max_subsanaciones: 1, plazo_horas: 24, revisa: 'revisor' as const }, etapas: [{ orden: 1, nombre: 'Revisión documental' }, { orden: 2, nombre: 'Proyecto' }], ronda: 0 };

describe('RevisionClubPanel (E52 · F2)', () => {
  beforeEach(() => post.mockReset());

  it('muestra solo las acciones que el servidor permite y es accesible', async () => {
    const { container } = render(<RevisionClubPanel clubId={5} estado="enviado" avance={avance} permisos={{ ...nada, resolver: true, observar: true, rechazar: true }} hayActa={false} convocatoriaId={1} onHecho={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Aprobar etapa/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pedir correcciones/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Dar visto bueno/ })).toBeNull();
    expect(screen.getByText(/Etapa 1 de 2/)).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('pedir correcciones exige comentario y muestra el error del servidor dentro de la ventana', async () => {
    post.mockImplementation((url?: string) => (url === '/revision/clubes/5/resolver'
      ? Promise.reject({ response: { status: 422, data: { message: 'x', errors: { club: ['Este club ya no está esperando tu revisión.'] } } } })
      : Promise.resolve({ data: null })));
    const onHecho = vi.fn();
    render(<RevisionClubPanel clubId={5} estado="enviado" avance={avance} permisos={{ ...nada, resolver: true, observar: true, rechazar: true }} hayActa={false} convocatoriaId={1} onHecho={onHecho} />);
    fireEvent.click(screen.getByRole('button', { name: /Pedir correcciones/ }));
    const dlg = screen.getByRole('dialog');
    fireEvent.click(within(dlg).getByRole('button', { name: 'Enviar observaciones' }));
    expect(within(dlg).getByRole('alert')).toHaveTextContent('Escribe el comentario para el líder.');
    expect(post).not.toHaveBeenCalled();
    fireEvent.change(within(dlg).getByLabelText('Qué debe corregir *'), { target: { value: 'Falta el sello' } });
    fireEvent.click(within(dlg).getByRole('button', { name: 'Enviar observaciones' }));
    await waitFor(() => expect(within(dlg).getByRole('alert')).toHaveTextContent('Club: Este club ya no está esperando tu revisión.'));
    expect(post).toHaveBeenCalledWith('/revision/clubes/5/resolver', { resultado: 'observar', comentario: 'Falta el sello' });
    expect(onHecho).not.toHaveBeenCalled();
  });

  it('sin correcciones disponibles lo explica; con visto bueno y sin acta pide subirla', () => {
    const { rerender } = render(<RevisionClubPanel clubId={5} estado="subsanado" avance={{ ...avance, ronda: 1 }} permisos={{ ...nada, resolver: true, rechazar: true }} hayActa={false} convocatoriaId={1} onHecho={vi.fn()} />);
    expect(screen.getByText(/ya usó sus correcciones permitidas/)).toBeInTheDocument();
    rerender(<RevisionClubPanel clubId={5} estado="aprobado_revision" avance={{ etapas: avance.etapas, visto_bueno_at: '2026-09-29T10:00:00Z' }} permisos={{ ...nada, acta: true }} hayActa={false} convocatoriaId={7} onHecho={vi.fn()} />);
    expect(screen.getByRole('link', { name: /sube el acta/ })).toHaveAttribute('href', '/admin/clubes?convocatoria=7');
  });
});
