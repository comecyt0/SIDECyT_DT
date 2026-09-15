import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const pushMock = vi.fn();
const backMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, back: backMock, replace: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

vi.mock('@/lib/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
  getProgramaCatalog: vi.fn(),
}));

// El hook hace fetch al montar el componente — mockéalo a un estado vacío estable.
// Con el catálogo vacío el asistente tiene 3 pasos: convocatoria → proyecto → revisar.
vi.mock('@/hooks/useProgramaCatalog', () => ({
  useProgramaCatalog: () => ({
    programa: null,
    campos: [],
    rubros: [],
    modalidades: [],
    etapas: [],
    documentos: [],
    loading: false,
    error: null,
  }),
}));

import api from '@/lib/api';
import NuevaSolicitud from './page';

const mockedGet = vi.mocked(api.get);
const mockedPost = vi.mocked(api.post);

const fakeConvocatorias = [
  {
    id: 1,
    nombre: 'Convocatoria PROT 2026',
    ejercicio_fiscal: '2026',
    tipo_programa: { id: 5, clave: 'PROT', nombre: 'Programa Test' },
  },
];

const fakeAreas = [
  { id: 10, nombre: 'Ciencias Exactas' },
  { id: 11, nombre: 'Ciencias Sociales' },
];

function mockInitData() {
  mockedGet.mockImplementation((url: string) => {
    if (url === '/solicitudes/convocatorias-activas') {
      return Promise.resolve({ data: fakeConvocatorias });
    }
    if (url === '/catalogos') {
      return Promise.resolve({ data: { areas_conocimiento: fakeAreas } });
    }
    return Promise.resolve({ data: [] });
  });
}

const next = () => fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));

describe('NuevaSolicitud (solicitante)', () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedPost.mockReset();
    pushMock.mockReset();
    backMock.mockReset();
  });

  it('carga convocatorias activas y áreas de conocimiento al montar', async () => {
    mockInitData();

    render(<NuevaSolicitud />);

    await waitFor(() => {
      expect(mockedGet).toHaveBeenCalledWith('/solicitudes/convocatorias-activas');
      expect(mockedGet).toHaveBeenCalledWith('/catalogos');
    });

    expect(screen.getByRole('heading', { name: /Nueva solicitud/i })).toBeInTheDocument();
    expect(screen.getByText(/¿A qué convocatoria aplicas\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Paso 1 de 3/i)).toBeInTheDocument();
  });

  it('no avanza sin convocatoria y muestra el error del paso', async () => {
    mockInitData();

    render(<NuevaSolicitud />);
    await waitFor(() => expect(mockedGet).toHaveBeenCalledWith('/catalogos'));

    next();

    expect(await screen.findByRole('alert')).toHaveTextContent(/Selecciona una convocatoria/i);
    expect(mockedPost).not.toHaveBeenCalled();
  });

  it('muestra mensaje de error si la API de carga falla', async () => {
    mockedGet.mockRejectedValue({
      response: { data: { message: 'Servicio no disponible' }, status: 500 },
    });

    render(<NuevaSolicitud />);

    await waitFor(() => {
      expect(screen.getByText(/Servicio no disponible/i)).toBeInTheDocument();
    });
  });

  it('en el paso del proyecto exige título, área, monto y resumen', async () => {
    mockInitData();

    render(<NuevaSolicitud />);
    await waitFor(() => expect(screen.getByText('Convocatoria PROT 2026 (2026)')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/^Convocatoria/i), { target: { value: '1' } });
    next();
    expect(await screen.findByText(/¿De qué trata tu proyecto\?/i)).toBeInTheDocument();

    next();
    expect(await screen.findByRole('alert')).toHaveTextContent(/El título es obligatorio/i);
    expect(screen.getByText(/Selecciona un área/i)).toBeInTheDocument();
    expect(mockedPost).not.toHaveBeenCalled();
  });

  it('con los datos básicos completos llega a "Revisar" y hace POST /solicitudes', async () => {
    mockInitData();
    mockedPost.mockResolvedValue({ data: { solicitud: { id: 99 } } });

    render(<NuevaSolicitud />);
    await waitFor(() => expect(screen.getByText('Convocatoria PROT 2026 (2026)')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/^Convocatoria/i), { target: { value: '1' } });
    next();

    fireEvent.change(await screen.findByLabelText(/Título del proyecto/i), { target: { value: 'Mi Proyecto Test' } });
    fireEvent.change(screen.getByLabelText(/Área de conocimiento/i), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText(/Monto que solicitas/i), { target: { value: '50000' } });
    fireEvent.change(screen.getByLabelText(/Resumen del proyecto/i), { target: { value: 'Descripción detallada del proyecto' } });
    next();

    expect(await screen.findByText(/¿Todo en orden\?/i)).toBeInTheDocument();
    expect(screen.getByText('Mi Proyecto Test')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Guardar solicitud/i }));

    await waitFor(() => {
      expect(mockedPost).toHaveBeenCalledWith(
        '/solicitudes',
        expect.objectContaining({
          convocatoria_id: '1',
          titulo_proyecto: 'Mi Proyecto Test',
          area_conocimiento_id: '10',
          monto_solicitado: 50000,
        }),
      );
    });
  });

  it('botón Cancelar llama a router.back', async () => {
    mockInitData();

    render(<NuevaSolicitud />);
    await waitFor(() => expect(mockedGet).toHaveBeenCalledWith('/catalogos'));

    fireEvent.click(screen.getByRole('button', { name: /^Cancelar$/i }));
    expect(backMock).toHaveBeenCalled();
  });
});
