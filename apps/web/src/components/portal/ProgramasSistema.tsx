'use client';

import { ArrowUpRight, Mail } from 'lucide-react';
import { useSitio, type Sistema } from '@/lib/sitio';
import IconoPrograma from './IconoPrograma';

/**
 * E49: programas ACTIVOS de un sistema, desde /api/sitio/{sistema} (administrables en /admin/sitio).
 * Si no hay ninguno (o falla la carga) no pinta nada: SICEI sigue pendiente hasta que el admin los active.
 */
export default function ProgramasSistema({ sistema }: { sistema: Sistema }) {
  const { estado, datos } = useSitio(sistema);
  if (estado !== 'listo' || datos.programas.length === 0) return null;
  return (
    <section className="pt-sicei-programas" aria-labelledby={`pt-${sistema}-programas`}>
      <h2 id={`pt-${sistema}-programas`} className="pt-h2">Programas</h2>
      <ul>
        {datos.programas.map((p, i) => (
          <li key={`${p.nombre}-${i}`} className="pt-sicei-programa" data-tono={p.tono}>
            <span className="pt-acceso-icono"><IconoPrograma icono={p.icono} /></span>
            <div>
              <p className="pt-acceso-etiqueta">{p.nombre}</p>
              {p.dirigido_a && <p className="pt-acceso-detalle">Para: {p.dirigido_a}</p>}
              {p.resumen && <p className="pt-acceso-detalle">{p.resumen}</p>}
              <p className="pt-sicei-programa-enlaces">
                {p.correo && <a href={`mailto:${p.correo}`}><Mail aria-hidden="true" />{p.correo}</a>}
                {p.url_info && <a href={p.url_info} target="_blank" rel="noopener noreferrer">Página oficial <ArrowUpRight aria-hidden="true" /></a>}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
