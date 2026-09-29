'use client';

import { useRef } from 'react';
import { AlertTriangle, Clock, PartyPopper, XCircle, Hourglass, Send } from 'lucide-react';
import CuentaRegresiva from '@/components/especie/CuentaRegresiva';
import { useConfetiAlVer } from '@/lib/confeti';
import type { AvanceClub } from '@/lib/especie';

/**
 * E52 · F2 — Qué pasa con el club y qué le toca al líder, en una tarjeta: observaciones con cuenta regresiva, plazo
 * vencido, en revisión, esperando comité, aceptado (con confeti cada vez que la tarjeta entra en pantalla, decisión del
 * usuario: hasta que se entregue el kit) o no aceptado con el motivo.
 */
export default function AvisoEstadoClub({ estado, avance, onVence }: { estado: string; avance: Partial<AvanceClub>; onVence?: () => void }) {
  const ref = useRef<HTMLElement>(null);
  useConfetiAlVer(ref, estado === 'aceptado');

  const caja = (tono: string, icono: React.ReactNode, titulo: string, cuerpo?: React.ReactNode) => (
    <section ref={ref} role="status" className="rounded-[18px] border-2 px-5 py-4"
      style={{ borderColor: tono === 'vino' ? 'var(--auth-danger)' : `var(--tile-${tono}-fg)`, backgroundColor: `var(--tile-${tono}-bg)` }}>
      <p className="flex items-center gap-2 font-bold text-[var(--app-ink)]">{icono}{titulo}</p>
      {cuerpo && <div className="mt-2 space-y-2 text-sm text-[var(--app-ink)]">{cuerpo}</div>}
    </section>
  );

  const etapa = avance.etapa_actual;
  switch (estado) {
    case 'observado':
      return caja('gold', <AlertTriangle className="h-5 w-5" aria-hidden="true" />, 'Tu club tiene observaciones', <>
        {avance.observacion && <p className="whitespace-pre-wrap break-words rounded-[12px] bg-[var(--app-card-bg)] px-3 py-2">{avance.observacion}</p>}
        {avance.vence_at && <CuentaRegresiva vence={avance.vence_at} onVence={onVence} />}
        <p>Corrige lo que se indica (puedes cambiar cualquier dato) y pulsa <strong>Enviar correcciones</strong> al final de la página.</p>
      </>);
    case 'vencido':
      return caja('vino', <Clock className="h-5 w-5" aria-hidden="true" />, 'El plazo para corregir venció', <>
        {avance.observacion && <p className="whitespace-pre-wrap break-words rounded-[12px] bg-[var(--app-card-bg)] px-3 py-2">{avance.observacion}</p>}
        <p>Ya no puedes editar el club. El COMECYT decidirá si te da una prórroga; te avisaremos por aquí y por correo.</p>
      </>);
    case 'enviado':
    case 'subsanado':
      return caja('sky', estado === 'subsanado' ? <Send className="h-5 w-5" aria-hidden="true" /> : <Hourglass className="h-5 w-5" aria-hidden="true" />,
        estado === 'subsanado' ? 'Recibimos tus correcciones' : 'Tu club está en revisión',
        etapa ? <p>Etapa {etapa.orden}{avance.etapas?.length ? ` de ${avance.etapas.length}` : ''}: <strong>{etapa.nombre}</strong>. Te avisaremos si hay observaciones.</p> : undefined);
    case 'aprobado_revision':
      return caja('sky', <Hourglass className="h-5 w-5" aria-hidden="true" />, 'Tu club aprobó todas las revisiones',
        <p>Falta el visto bueno del admin de convocatoria y la decisión del comité. Te avisaremos del resultado.</p>);
    case 'aceptado':
      return caja('emerald', <PartyPopper className="h-5 w-5" aria-hidden="true" />, '¡Tu club fue aceptado!',
        <p>Pronto recibirás la fecha y el lugar de entrega de tu kit.</p>);
    case 'rechazado':
      return caja('vino', <XCircle className="h-5 w-5" aria-hidden="true" />, 'Tu club no fue aceptado',
        avance.rechazo_motivo ? <p className="whitespace-pre-wrap break-words">Motivo: {avance.rechazo_motivo}</p> : undefined);
    default:
      return null;
  }
}
