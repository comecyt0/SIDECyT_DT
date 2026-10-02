'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Shapes, School, ChevronRight, Inbox, Timer, Eye } from 'lucide-react';
import api from '@/lib/api';
import FotoClub from '@/components/especie/FotoClub';
import { restante } from '@/components/especie/CuentaRegresiva';
import Folio from '@/components/ui/folio';
import { Button } from '@/components/ui/button';
import LineaAvanceClub from '@/components/especie/LineaAvanceClub';
import VistaPreviaClub from '@/components/especie/VistaPreviaClub';
import { ESTADO_CLUB, SISTEMA_ESCUELA, fechaHora } from '@/lib/especie';

interface FilaBandeja {
  id: number; folio: string; convocatoria_corto?: string | null; nombre: string; estado: string; logo_url: string | null; enviado_at: string | null; vence_at: string | null;
  integrantes_count: number; etapa: { orden: number; nombre: string } | null; visto_bueno_at: string | null;
  escuela: { nombre: string; municipio: string; sistema: string } | null; convocatoria: { id: number; nombre: string } | null; puede_resolver: boolean;
}

/**
 * E52 · F2 — Bandeja de clubes para el personal (GET /revision/clubes): `pendientes` = lo que esta persona puede resolver
 * ahora (según quién revisa cada etapa y su alcance), `comite` = aprobados en revisión y aceptados. Enlaza a la ficha.
 */
export default function BandejaClubes({ vista, hrefFicha, convocatoriaId, vacio }: {
  vista: 'pendientes' | 'comite' | 'todos'; hrefFicha: (id: number) => string; convocatoriaId?: number | null; vacio?: string;
}) {
  const [filas, setFilas] = useState<FilaBandeja[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previa, setPrevia] = useState<number | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const params: Record<string, string | number> = { vista };
      if (convocatoriaId) params.convocatoria_id = convocatoriaId;
      const { data } = await api.get('/revision/clubes', { params });
      setFilas(Array.isArray(data) ? data.filter((x) => x && typeof x.id === 'number') : []);
      setError(null);
    } catch {
      setError('No se pudo cargar la bandeja.');
      setFilas([]);
    } finally {
      setCargando(false);
    }
  }, [vista, convocatoriaId]);
  useEffect(() => { void cargar(); }, [cargar]);

  if (cargando) return <div className="grid place-items-center py-12"><Loader2 className="h-6 w-6 animate-spin" aria-label="Cargando" /></div>;
  if (error) return <p className="text-sm" style={{ color: 'var(--auth-danger)' }}>{error}</p>;
  if (filas.length === 0) {
    return (
      <div className="empty-state rounded-[20px] bg-[var(--app-card-bg)]">
        <span className="tone-chip" data-tone="emerald"><Inbox aria-hidden="true" /></span>
        <p className="font-bold text-[var(--app-ink)]">{vacio ?? 'No hay clubes esperando tu revisión'}</p>
        <p className="text-sm text-[var(--app-ink-2)]">Cuando un líder envíe su club o sus correcciones, aparecerá aquí y recibirás un aviso.</p>
      </div>
    );
  }
  return (
    <ul className="data-grid grid grid-cols-1 gap-3 xl:grid-cols-2">
      {filas.map((c) => {
        const est = ESTADO_CLUB[c.estado] ?? { etiqueta: c.estado, tono: 'neutral' };
        const falta = c.vence_at ? new Date(c.vence_at).getTime() - Date.now() : null;
        return (
          <li key={c.id} className="app-card data-card flex flex-col gap-3 p-4">
            <Link href={hrefFicha(c.id)} className="flex items-center gap-3 rounded-[14px] transition-transform active:scale-[0.99]">
              <FotoClub src={c.logo_url} fallback={<Shapes className="h-5 w-5 text-[var(--app-ink-2)]" aria-hidden="true" />} />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="break-words font-semibold text-[var(--app-ink)]">{c.nombre}</span>
                  <span className="pill" data-tone={est.tono}>{est.etiqueta}</span>
                  {c.puede_resolver && <span className="pill" data-tone="vino">Te toca</span>}
                </span>
                <span className="block text-xs text-[var(--app-ink-2)]">
                  <Folio folio={c.folio} corto={c.convocatoria_corto} />
                  {c.etapa ? ` · etapa ${c.etapa.orden}: ${c.etapa.nombre}` : ''}
                  {c.estado === 'aprobado_revision' ? (c.visto_bueno_at ? ' · con visto bueno' : ' · falta visto bueno') : ''}
                  {c.convocatoria ? ` · ${c.convocatoria.nombre}` : ''}
                </span>
                {c.escuela && (
                  <span className="mt-0.5 flex items-center gap-1 text-xs text-[var(--app-ink-2)]">
                    <School className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">{c.escuela.nombre} · {c.escuela.municipio} · {SISTEMA_ESCUELA[c.escuela.sistema] ?? c.escuela.sistema}</span>
                  </span>
                )}
                {(c.estado === 'observado' || c.estado === 'vencido') && c.vence_at && (
                  <span className="mt-0.5 flex items-center gap-1 text-xs" style={{ color: falta !== null && falta <= 0 ? 'var(--auth-danger)' : 'var(--app-ink-2)' }}>
                    <Timer className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {falta !== null && falta > 0 ? `El líder tiene ${restante(falta)} para corregir` : `Plazo vencido el ${fechaHora(c.vence_at)}`}
                  </span>
                )}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-[var(--app-ink-2)]" aria-hidden="true" />
            </Link>
            <LineaAvanceClub estado={c.estado} avance={c} />
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" size="sm" variant="soft" onClick={() => setPrevia(c.id)} aria-label={`Vista previa de ${c.nombre}`}>
                <Eye className="h-4 w-4" aria-hidden="true" />Vista previa
              </Button>
            </div>
          </li>
        );
      })}
      <VistaPreviaClub clubId={previa} onClose={() => setPrevia(null)} hrefFicha={hrefFicha}
        endpoint={(id) => (hrefFicha(id).startsWith('/admin') ? `/admin/clubes/${id}` : `/revision/clubes/${id}`)} />
    </ul>
  );
}
