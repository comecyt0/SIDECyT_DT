'use client';

import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { ClipboardCheck } from 'lucide-react';
import api from '@/lib/api';

/**
 * E72 paso 5 — Acceso al panel de evaluación compartido (/evaluador) desde los demás paneles.
 * Solo aparece si la cuenta tiene el rol de evaluador aprobado en SIGAE y no es su rol activo. Al pulsarlo cambia el
 * rol activo (el backend reemite la sesión) y guarda el anterior para el botón «Regresar a…» del panel de evaluación.
 * Es comodidad de interfaz: quién puede evaluar lo decide el backend.
 */
export const ROL_PREVIO = 'sidecyt:rol-previo';

export default function BotonPanelEvaluacion() {
  const [activo, setActivo] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [cambiando, setCambiando] = useState(false);

  useEffect(() => {
    let vivo = true;
    api.get('/mis-roles').then(({ data }) => {
      if (!vivo) return;
      const roles = Array.isArray(data?.roles) ? data.roles.map((r: { slug?: unknown }) => String(r?.slug ?? '')) : [];
      const act = typeof data?.activo === 'string' ? data.activo : null;
      setActivo(act);
      setVisible(roles.includes('evaluador') && act !== 'evaluador');
    }).catch(() => { /* sin botón */ });
    return () => { vivo = false; };
  }, []);

  if (!visible) return null;

  const ir = async () => {
    setCambiando(true);
    try {
      await api.post('/mis-roles/cambiar', { rol: 'evaluador' });
      const opts = { expires: 1, path: '/', sameSite: 'strict' as const, secure: window.location.protocol === 'https:' };
      Cookies.set('userRole', 'evaluador', opts);
      try { if (activo) sessionStorage.setItem(ROL_PREVIO, activo); } catch { /* sin almacenamiento */ }
      window.location.href = '/evaluador';
    } catch {
      setCambiando(false);
    }
  };

  return (
    <button type="button" onClick={ir} disabled={cambiando}
      className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-neutral-300 dark:border-neutral-600 px-3 py-1.5 text-xs font-semibold hover:border-primary hover:text-primary disabled:opacity-60"
      title="Cambiar a tu rol de evaluador y abrir el panel de evaluación (puedes regresar desde ahí)">
      <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
      <span className="hidden lg:inline">Panel de evaluación</span>
      <span className="lg:hidden sr-only">Panel de evaluación</span>
    </button>
  );
}
