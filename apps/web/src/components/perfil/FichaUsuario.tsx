'use client';

import { useEffect, useState } from 'react';
import { AtSign, Briefcase, Building2, CalendarDays, Clock, Landmark, Loader2, Phone, ShieldCheck } from 'lucide-react';
import api from '@/lib/api';
import PerfilHero from '@/components/perfil/PerfilHero';
import Seguimiento, { type PasoHistorial } from '@/components/perfil/Seguimiento';
import { estadoBadgeClass, estadoLabel } from '@/lib/solicitud-estados';
import { formatCurrency, formatDate } from '@/lib/format';
import { ROL_ETIQUETA, type RolSlug } from '@/lib/roles';

interface FichaSolicitud {
  id: number;
  folio: string;
  titulo_proyecto: string;
  estado: string;
  monto_solicitado?: number | string | null;
  created_at?: string;
  convocatoria?: { id: number; nombre: string; periodo?: { nombre: string } | null } | null;
  ministracion?: { cuenta_clabe?: string | null; numero_cuenta?: string | null; titular_cuenta?: string | null; datos_bancarios_enmascarados?: boolean } | null;
  historial?: PasoHistorial[];
}

interface Ficha {
  user: {
    id: number; name: string; email: string; telefono?: string | null; cargo?: string | null; activo: boolean;
    created_at?: string; ultimo_acceso?: string | null; avatar_url: string | null; banner_url: string | null;
    rol?: { slug: string; nombre: string } | null; empresa?: { nombre: string; rfc?: string | null } | null;
  };
  solicitudes: FichaSolicitud[];
  resumen: { label: string; value: number }[];
}

/**
 * Ficha completa de un usuario/folio (E45, punto 3): foto, portada y TODOS sus datos, sus solicitudes y el
 * seguimiento de cada una. El backend decide qué se ve (alcance) y enmascara datos bancarios según el rol.
 * `folioId` resalta y abre primero esa solicitud.
 */
export default function FichaUsuario({ userId, folioId }: { userId: number; folioId?: number }) {
  const [ficha, setFicha] = useState<Ficha | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    api.get(`/perfiles/${userId}`)
      .then(({ data }) => { if (vivo) setFicha(data as Ficha); })
      .catch((e) => { if (vivo) setError(e?.response?.status === 404 ? 'No tienes acceso a esta ficha o no existe.' : 'No se pudo cargar la ficha.'); });
    return () => { vivo = false; };
  }, [userId]);

  if (error) return <p className="perfil-tarjeta text-sm text-[var(--app-ink-2)]">{error}</p>;
  if (!ficha) {
    return <div className="grid place-items-center py-24"><Loader2 className="h-6 w-6 animate-spin text-[var(--app-ink-2)]" aria-label="Cargando ficha" /></div>;
  }

  const u = ficha.user;
  const rol = ROL_ETIQUETA[(u.rol?.slug ?? '') as RolSlug] ?? u.rol?.nombre ?? '';
  const solicitudes = Array.isArray(ficha.solicitudes) ? [...ficha.solicitudes] : [];
  if (folioId) solicitudes.sort((a, b) => (a.id === folioId ? -1 : b.id === folioId ? 1 : 0));

  const datos: { icono: React.ReactNode; etiqueta: string; valor: React.ReactNode }[] = [
    { icono: <ShieldCheck />, etiqueta: 'Rol', valor: rol || '—' },
    { icono: <AtSign />, etiqueta: 'Correo', valor: u.email },
    { icono: <Phone />, etiqueta: 'Teléfono', valor: u.telefono || '—' },
    { icono: <Briefcase />, etiqueta: 'Cargo', valor: u.cargo || '—' },
    { icono: <Building2 />, etiqueta: 'Institución / empresa', valor: u.empresa?.nombre || '—' },
    { icono: <CalendarDays />, etiqueta: 'Cuenta creada', valor: u.created_at ? formatDate(u.created_at) : '—' },
    { icono: <Clock />, etiqueta: 'Último acceso', valor: u.ultimo_acceso ? formatDate(u.ultimo_acceso) : '—' },
  ];

  return (
    <div className="space-y-6">
      <PerfilHero
        user={u}
        pildoras={[{ texto: rol, tono: 'vino' as const }, ...(u.empresa?.nombre ? [{ texto: u.empresa.nombre }] : [])].filter((p) => p.texto)}
        estado={{ texto: u.activo ? 'Cuenta activa' : 'Cuenta desactivada', activo: u.activo }}
        indicadores={ficha.resumen}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <section className="perfil-tarjeta" aria-labelledby="ficha-datos">
          <h2 id="ficha-datos" className="perfil-tarjeta-titulo"><ShieldCheck aria-hidden="true" />Datos completos</h2>
          <ul className="space-y-2.5">
            {datos.map((d) => (
              <li key={d.etiqueta} className="perfil-dato">
                <span className="perfil-dato-icono" aria-hidden="true">{d.icono}</span>
                <span className="min-w-0">
                  <span className="perfil-dato-etiqueta">{d.etiqueta}</span>
                  <span className="perfil-dato-valor">{d.valor}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-4" aria-label="Solicitudes y seguimiento">
          {solicitudes.length === 0 && <p className="perfil-tarjeta text-sm text-[var(--app-ink-2)]">Sin solicitudes visibles.</p>}
          {solicitudes.map((s) => (
            <article key={s.id} className="perfil-tarjeta" data-destacada={s.id === folioId ? 'true' : undefined}>
              <header className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-xs font-bold tracking-wide text-[var(--sg-vino)]">{s.folio}</p>
                  <h3 className="mt-0.5 text-base font-semibold text-[var(--app-ink)]">{s.titulo_proyecto}</h3>
                  <p className="mt-1 text-xs text-[var(--app-ink-2)]">
                    {s.convocatoria?.nombre ?? '—'}{s.convocatoria?.periodo?.nombre ? ` · ${s.convocatoria.periodo.nombre}` : ''}
                    {s.monto_solicitado ? ` · ${formatCurrency(s.monto_solicitado)}` : ''}
                  </p>
                </div>
                <span className={estadoBadgeClass(s.estado)}>{estadoLabel(s.estado)}</span>
              </header>

              {s.ministracion && (s.ministracion.cuenta_clabe || s.ministracion.titular_cuenta) && (
                <div className="perfil-dato mt-4">
                  <span className="perfil-dato-icono" aria-hidden="true"><Landmark /></span>
                  <span className="min-w-0">
                    <span className="perfil-dato-etiqueta">Datos bancarios{s.ministracion.datos_bancarios_enmascarados ? ' (ocultos por tu rol)' : ''}</span>
                    <span className="perfil-dato-valor">
                      {s.ministracion.titular_cuenta ?? '—'} · CLABE {s.ministracion.cuenta_clabe ?? '—'}
                    </span>
                  </span>
                </div>
              )}

              <div className="mt-5">
                <p className="mb-3 text-sm font-semibold text-[var(--app-ink)]">Seguimiento</p>
                <Seguimiento pasos={Array.isArray(s.historial) ? s.historial : []} />
              </div>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
