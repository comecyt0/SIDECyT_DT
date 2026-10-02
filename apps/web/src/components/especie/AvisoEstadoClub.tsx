'use client';

import { useRef } from 'react';
import { AlertTriangle, Clock, PartyPopper, XCircle, Hourglass, Send, Sparkles, CalendarClock, FileSignature, QrCode } from 'lucide-react';
import CuentaRegresiva from '@/components/especie/CuentaRegresiva';
import { lanzarConfeti, useConfetiAlVer } from '@/lib/confeti';
import type { AvanceClub } from '@/lib/especie';

/**
 * E52 · F2 — Qué pasa con el club y qué le toca al líder, en una tarjeta: observaciones con cuenta regresiva, plazo
 * vencido, en revisión, esperando comité, aceptado (con confeti cada vez que la tarjeta entra en pantalla, decisión del
 * usuario: hasta que se entregue el kit) o no aceptado con el motivo.
 */
export default function AvisoEstadoClub({ estado, avance, onVence, nombreClub }: { estado: string; avance: Partial<AvanceClub>; onVence?: () => void; nombreClub?: string }) {
  const ref = useRef<HTMLElement>(null);
  useConfetiAlVer(ref, estado === 'aceptado', { fiesta: true });

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
      // Celebración (rediseño 02/10/2026): confeti cada vez que la tarjeta entra en pantalla y botón para repetirlo.
      return (
        <section ref={ref} role="status" aria-live="polite" className="celebra-club">
          <div className="flex items-start gap-4">
            <span className="celebra-club-icono" aria-hidden="true"><PartyPopper /></span>
            <div className="min-w-0">
              <p className="celebra-club-titulo">¡Tu club fue aceptado!</p>
              <p className="celebra-club-sub">{nombreClub ? <>Felicidades, <strong>{nombreClub}</strong> ya forma parte de la convocatoria. </> : 'Felicidades, tu club ya forma parte de la convocatoria. '}Esto es lo que sigue:</p>
            </div>
          </div>
          <ol className="celebra-club-pasos">
            <li className="celebra-club-paso"><CalendarClock aria-hidden="true" /><span>Te avisaremos la <strong>fecha y el lugar</strong> de entrega de tu kit por aquí y por correo.</span></li>
            <li className="celebra-club-paso"><FileSignature aria-hidden="true" /><span>Descarga la <strong>carta de resguardo</strong>, fírmala y súbela escaneada en PDF.</span></li>
            <li className="celebra-club-paso"><QrCode aria-hidden="true" /><span>Cuando el COMECYT lo habilite, aquí tendrás tu <strong>QR y credencial</strong>.</span></li>
          </ol>
          <button type="button" className="celebra-club-boton" onClick={() => lanzarConfeti({ fiesta: true })}>
            <Sparkles className="h-4 w-4" aria-hidden="true" />Celebrar otra vez
          </button>
        </section>
      );
    case 'kit_entregado':
      return caja('emerald', <PartyPopper className="h-5 w-5" aria-hidden="true" />, 'Tu club recibió su kit',
        <p>¡Mucho éxito con el proyecto! Aquí verás los eventos y tu QR cuando estén listos.</p>);
    case 'rechazado':
      return caja('vino', <XCircle className="h-5 w-5" aria-hidden="true" />, 'Tu club no fue aceptado',
        avance.rechazo_motivo ? <p className="whitespace-pre-wrap break-words">Motivo: {avance.rechazo_motivo}</p> : undefined);
    default:
      return null;
  }
}
