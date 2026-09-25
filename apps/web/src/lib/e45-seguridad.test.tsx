import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import UserAvatar from '@/components/ui/user-avatar';
import { acceptDe, formatosDe, validarArchivo } from '@/lib/archivos';
import { subrutaPermitida } from '@/lib/roles';
import FoliosAprobados from '@/app/sigae/FoliosAprobados';

/** E45 — pruebas del caso malicioso de las piezas nuevas (regla §0 de CLAUDE.md). */
describe('UserAvatar', () => {
  it('muestra la foto solo si es una ruta propia /api/media/perfil/<40>.webp', () => {
    const buena = `/api/media/perfil/${'a'.repeat(40)}.webp`;
    const { container } = render(<UserAvatar user={{ id: 1, name: 'Ana Pérez', avatar_url: buena }} />);
    expect(container.querySelector('img')?.getAttribute('src')).toBe(buena);
  });

  it('ignora URLs externas o javascript: y muestra iniciales', () => {
    for (const mala of ['https://evil.example/x.png', 'javascript:alert(1)', '//evil.example/a.webp', `/api/media/perfil/../../.env`]) {
      const { container, unmount } = render(<UserAvatar user={{ id: 2, name: 'Ana Pérez', avatar_url: mala }} />);
      expect(container.querySelector('img')).toBeNull();
      expect(container.textContent).toContain('AP');
      unmount();
    }
  });
});

describe('validarArchivo (límites por campo)', () => {
  const archivo = (nombre: string, bytes: number) => new File([new Uint8Array(bytes)], nombre);

  it('respeta tipo y tamaño configurados', () => {
    expect(validarArchivo(archivo('a.pdf', 1024), ['pdf'], 5)).toBeNull();
    expect(validarArchivo(archivo('a.pdf', 6 * 1024 * 1024), ['pdf'], 5)).toMatch(/5 MB/);
    expect(validarArchivo(archivo('foto.png', 10), ['pdf'], 5)).toMatch(/no permitido/);
    expect(validarArchivo(archivo('foto.png', 10), ['pdf', 'imagen'], 5)).toBeNull();
  });

  it('rechaza extensiones peligrosas aunque se permita office o zip', () => {
    expect(validarArchivo(archivo('macro.docm', 10), ['office'], 5)).not.toBeNull();
    expect(validarArchivo(archivo('x.exe', 10), ['zip'], 5)).not.toBeNull();
    expect(validarArchivo(archivo('imagen.svg', 10), ['imagen'], 5)).not.toBeNull();
  });

  it('normaliza formatos desconocidos a PDF y arma accept', () => {
    expect(formatosDe('exe, html')).toEqual(['pdf']);
    expect(acceptDe(['imagen'])).toContain('.webp');
    expect(acceptDe(['imagen'])).not.toContain('.svg');
  });
});

describe('subrutaPermitida (menú y proxy por rol)', () => {
  it('consulta: solo lectura, sin altas ni ediciones ni configuración', () => {
    expect(subrutaPermitida('consulta', '/admin/solicitudes')).toBe(true);
    expect(subrutaPermitida('consulta', '/admin/usuarios')).toBe(false);
    expect(subrutaPermitida('consulta', '/admin/convocatorias')).toBe(false);
    expect(subrutaPermitida('consulta', '/admin/solicitudes/nueva')).toBe(false);
  });
  it('admin de convocatoria: opera, pero no crea/edita convocatorias ni ve usuarios', () => {
    expect(subrutaPermitida('admin_convocatoria', '/admin/convocatorias/12')).toBe(true);
    expect(subrutaPermitida('admin_convocatoria', '/admin/convocatorias/nueva')).toBe(false);
    expect(subrutaPermitida('admin_convocatoria', '/admin/convocatorias/12/editar')).toBe(false);
    expect(subrutaPermitida('admin_convocatoria', '/admin/usuarios')).toBe(false);
    expect(subrutaPermitida('admin_convocatoria', '/admin/periodos')).toBe(false);
  });
});

describe('FoliosAprobados (landing pública)', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('pinta solo folios válidos como texto y descarta HTML/script', async () => {
    vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} unobserve() {} });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      grupos: [
        { convocatoria: '<img src=x onerror=alert(1)>Convocatoria A', ejercicio_fiscal: '2026', folios: ['PROT-2026-001', '<script>alert(1)</script>', 'javascript:x', 'OK-2'] },
        { convocatoria: '', folios: ['X-1'] },
      ],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

    const { container } = render(<FoliosAprobados />);
    await waitFor(() => expect(screen.getByText('PROT-2026-001')).toBeInTheDocument());
    expect(screen.getByText('OK-2')).toBeInTheDocument();
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(screen.queryByText('X-1')).toBeNull(); // grupo sin nombre descartado
    expect(container.textContent).not.toContain('<script>');
  });

  it('no aparece si no hay folios publicados', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ grupos: [] }), { status: 200 }));
    const { container } = render(<FoliosAprobados />);
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    expect(container.querySelector('section')).toBeNull();
  });
});
