'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Trophy, ArrowDown, X } from 'lucide-react';
import { lanzarConfeti } from '@/lib/confeti';

/**
 * 02/10/2026 — Momento de celebración a pantalla completa cuando el club está aceptado: una vez por sesión y por club
 * (sessionStorage; si no está disponible, se muestra igual), con confeti que llena la pantalla. Se cierra con el botón,
 * con Escape o tocando fuera; el foco va al botón principal y vuelve a donde estaba al cerrar.
 */
export default function CelebracionAceptado({ clubId, nombreClub, onVerSiguiente }: { clubId: number; nombreClub: string; onVerSiguiente?: () => void }) {
  const [abierta, setAbierta] = useState(false);
  const boton = useRef<HTMLButtonElement>(null);
  const previo = useRef<Element | null>(null);
  const clave = `celebra-club-${clubId}`;

  useEffect(() => {
    let visto = false;
    try { visto = sessionStorage.getItem(clave) === '1'; } catch { /* almacenamiento bloqueado: se muestra */ }
    if (visto) return;
    previo.current = document.activeElement;
    setAbierta(true);
    try { sessionStorage.setItem(clave, '1'); } catch { /* sin almacenamiento */ }
    lanzarConfeti({ fiesta: true });
    const t = window.setTimeout(() => lanzarConfeti({ fiesta: true }), 1800);
    return () => window.clearTimeout(t);
  }, [clave]);

  useEffect(() => {
    if (!abierta) return;
    boton.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { cerrar(); return; }
      if (e.key !== 'Tab') return;
      // Foco atrapado dentro del diálogo.
      const f = Array.from(document.querySelectorAll<HTMLElement>('.celebra-dialogo button'));
      if (f.length === 0) return;
      const i = f.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierta]);

  const cerrar = (siguiente = false) => {
    setAbierta(false);
    if (siguiente) onVerSiguiente?.();
    else if (previo.current instanceof HTMLElement) previo.current.focus();
  };

  if (!abierta || typeof document === 'undefined') return null;
  // Portal a <body>: los contenedores de la página usan transform en su transición y encerraban al position: fixed.
  return createPortal(
    <div className="celebra-overlay" onClick={(e) => { if (e.target === e.currentTarget) cerrar(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="celebra-titulo" aria-describedby="celebra-texto" className="celebra-dialogo">
        <button type="button" className="celebra-cerrar" aria-label="Cerrar" onClick={() => cerrar()}><X className="h-5 w-5" aria-hidden="true" /></button>
        <span className="celebra-trofeo" aria-hidden="true"><Trophy /></span>
        <p className="celebra-eyebrow">¡Felicidades!</p>
        <h2 id="celebra-titulo" className="celebra-dialogo-titulo">¡Tu club fue aceptado!</h2>
        <p id="celebra-texto" className="celebra-dialogo-texto"><strong>{nombreClub}</strong> ya forma parte de la convocatoria. Ahora sigue la entrega de tu kit.</p>
        <div className="celebra-dialogo-acciones">
          <button ref={boton} type="button" className="celebra-club-boton !mt-0" onClick={() => cerrar(true)}>
            <ArrowDown className="h-4 w-4" aria-hidden="true" />Ver lo que sigue
          </button>
          <button type="button" className="celebra-otra" onClick={() => lanzarConfeti({ fiesta: true })}>Más confeti</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
