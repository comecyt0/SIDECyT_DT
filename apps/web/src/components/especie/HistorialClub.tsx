import { History } from 'lucide-react';
import { RESULTADO_HISTORIAL, fechaHora, type EntradaHistorial } from '@/lib/especie';

const TONO: Record<string, string> = {
  aprobado: 'emerald', aprobacion: 'mint', comite_aceptado: 'emerald', visto_bueno: 'teal', observado: 'gold', prorroga: 'gold',
  rechazado: 'red', comite_no_aceptado: 'red', subsanado: 'violet', enviado: 'sky',
};
const ROL: Record<string, string> = { admin: 'Admin', admin_convocatoria: 'Admin de convocatoria', revisor: 'Revisor', lider_club: 'Líder', acompanante_club: 'Acompañante con permiso' };

/**
 * E52 · F2 — Historial del club (envíos, resoluciones, prórrogas, correcciones, visto bueno y comité), del más reciente al
 * más antiguo. Para el personal incluye quién actuó; el líder recibe la lista sin esos datos (lo decide el servidor).
 */
export default function HistorialClub({ entradas }: { entradas: EntradaHistorial[] }) {
  if (!entradas.length) return null;
  const lista = [...entradas].reverse();
  return (
    <section className="space-y-3" aria-labelledby="hist-club">
      <h3 id="hist-club" className="flex items-center gap-2 text-sm font-bold text-[var(--app-ink)]"><History className="h-4 w-4" aria-hidden="true" />Historial</h3>
      <ol className="space-y-2 border-l-2 pl-4" style={{ borderColor: 'var(--app-rule)' }}>
        {lista.map((h, i) => (
          <li key={`${h.fecha}-${i}`} className="relative">
            <span className="absolute -left-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: 'var(--auth-vino)' }} aria-hidden="true" />
            <p className="flex flex-wrap items-center gap-2 text-sm">
              <span className="pill" data-tone={TONO[h.resultado] ?? 'neutral'}>{RESULTADO_HISTORIAL[h.resultado] ?? h.resultado}</span>
              {h.etapa && <span className="text-xs text-[var(--app-ink-2)]">{h.etapa}</span>}
              <span className="text-xs text-[var(--app-ink-2)]">{fechaHora(h.fecha)}</span>
            </p>
            {(h.quien || h.rol) && <p className="text-xs text-[var(--app-ink-2)]">{h.quien ?? ''}{h.rol ? ` · ${ROL[h.rol] ?? h.rol}` : ''}</p>}
            {h.comentario && <p className="mt-1 whitespace-pre-wrap break-words rounded-[12px] bg-[var(--auth-field)] px-3 py-2 text-sm text-[var(--app-ink)]">{h.comentario}</p>}
            {h.resultado === 'observado' && h.vence_at && <p className="mt-0.5 text-xs text-[var(--app-ink-2)]">Plazo para corregir: {fechaHora(h.vence_at)}</p>}
            {h.resultado === 'prorroga' && h.vence_at && <p className="mt-0.5 text-xs text-[var(--app-ink-2)]">+{h.horas} h · nuevo plazo: {fechaHora(h.vence_at)}</p>}
          </li>
        ))}
      </ol>
    </section>
  );
}
