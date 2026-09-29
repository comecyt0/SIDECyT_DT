'use client';

import { useEffect, useRef, useState } from 'react';
import { PartyPopper } from 'lucide-react';
import { useConfetiAlVer } from '@/lib/confeti';

/**
 * E45 (punto 4) — Folios aprobados que el admin CONFIRMÓ publicar (GET /api/folios-aprobados). Solo el número de
 * folio, agrupado por convocatoria (decisión del usuario). Confeti cada vez que se entra o se regresa a la sección.
 *  - Datos validados antes de pintar (tipos, longitudes, patrón del folio, topes de cantidad) y pintados como texto.
 *  - Confeti propio en canvas (sin dependencias), en la paleta vino/pastel de la landing; no se lanza con
 *    `prefers-reduced-motion`.
 *  - Si no hay nada publicado, la sección no aparece.
 */
interface Grupo {
  convocatoria: string;
  ejercicio: string;
  publicado: string;
  folios: string[];
}

const FOLIO_RE = /^[A-Za-z0-9][A-Za-z0-9._\-/ ]{0,59}$/;
const texto = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

function parsear(raw: unknown): Grupo[] {
  const lista = (raw as { grupos?: unknown })?.grupos;
  if (!Array.isArray(lista)) return [];
  return lista.slice(0, 50).flatMap((g) => {
    const convocatoria = texto((g as Record<string, unknown>)?.convocatoria, 200);
    const folios = Array.isArray((g as Record<string, unknown>)?.folios)
      ? ((g as { folios: unknown[] }).folios.filter((f): f is string => typeof f === 'string' && FOLIO_RE.test(f)).slice(0, 1000))
      : [];
    if (!convocatoria || folios.length === 0) return [];
    return [{
      convocatoria,
      ejercicio: texto((g as Record<string, unknown>)?.ejercicio_fiscal, 10) ?? '',
      publicado: texto((g as Record<string, unknown>)?.publicado, 10) ?? '',
      folios,
    }];
  });
}

export default function FoliosAprobados() {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch('/api/folios-aprobados', { credentials: 'omit', signal: ctrl.signal, headers: { Accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setGrupos(parsear(d)))
      .catch(() => setGrupos([]));
    return () => ctrl.abort();
  }, []);

  // Confeti cada vez que la sección ENTRA en pantalla (al avanzar o al regresar), no solo la primera.
  useConfetiAlVer(ref, grupos.length > 0);

  if (grupos.length === 0) return null;
  const total = grupos.reduce((n, g) => n + g.folios.length, 0);

  return (
    <section id="folios-aprobados" ref={ref} className="lp-section lp-folios-section" aria-labelledby="lp-folios">
      <div className="lp-wrap">
        <div className="lp-head">
          <h2 id="lp-folios" className="lp-h2">
            Folios aprobados <PartyPopper className="lp-folios-icono" aria-hidden="true" />
          </h2>
          <p className="lp-h2-sub">
            {total === 1 ? '1 proyecto aprobado' : `${total} proyectos aprobados`}. Si tu folio aparece aquí, revisa tu
            panel en SIGAE: ahí sigue el convenio.
          </p>
        </div>
        <div className="lp-folios">
          {grupos.map((g) => (
            <article key={g.convocatoria} className="lp-folios-grupo">
              <header>
                <h3>{g.convocatoria}</h3>
                <p>{[g.ejercicio && `Ejercicio ${g.ejercicio}`, `${g.folios.length} ${g.folios.length === 1 ? 'folio' : 'folios'}`].filter(Boolean).join(' · ')}</p>
              </header>
              <ul aria-label={`Folios aprobados de ${g.convocatoria}`}>
                {g.folios.map((f) => <li key={f}>{f}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
