'use client';

import { useState } from 'react';
import { UserPlus, Users, UserCog, Trash2, Repeat, Crown, Mail, Lock, User as UserIcon } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import StepFrame from '@/components/ui/step-frame';
import { PASSWORD_HINT, validarPassword } from '@/lib/password-policy';
import { PATRON_CORREO } from '@/lib/registro';
import { formatDate } from '@/lib/format';

export type TipoAcceso = 'lider_b' | 'director';
export interface AccesoClub { nombre: string | null; email: string | null; colider: boolean; colider_desde: string | null; desde: string | null }
export type AccesosClubApi = Record<TipoAcceso, AccesoClub | null>;

const INFO: Record<TipoAcceso, { titulo: string; ayuda: string }> = {
  lider_b: { titulo: 'Líder B', ayuda: 'Sigue el registro, ve los datos del club e integrantes, el QR y la credencial, y la logística. Solo ve: no hace cambios.' },
  director: { titulo: 'Director(a) de la escuela', ayuda: 'Opcional. Acompaña al club (no cuenta como integrante) y ve lo mismo que el líder B. Puedes compartirle tu rol de líder si no puedes asistir.' },
};

export function leerAccesos(v: unknown): AccesosClubApi | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const uno = (x: unknown): AccesoClub | null => {
    if (!x || typeof x !== 'object') return null;
    const a = x as Record<string, unknown>;
    return { nombre: typeof a.nombre === 'string' ? a.nombre : null, email: typeof a.email === 'string' ? a.email : null, colider: a.colider === true,
      colider_desde: typeof a.colider_desde === 'string' ? a.colider_desde : null, desde: typeof a.desde === 'string' ? a.desde : null };
  };
  return { lider_b: uno(o.lider_b), director: uno(o.director) };
}

function mensaje(e: unknown, def: string): string {
  const d = (e as { response?: { status?: number; data?: { message?: string; errors?: Record<string, string[]> } } })?.response;
  if (d?.status === 429) return 'Demasiados cambios seguidos. Espera unos minutos.';
  const primero = d?.data?.errors ? Object.values(d.data.errors).flat()[0] : null;
  return primero || d?.data?.message || def;
}

/**
 * E61 — Acompañantes del club (solo el líder): líder B y, opcional, el director. El líder define nombre, correo y
 * contraseña (la persona la cambia al entrar); si el correo ya tiene cuenta solo se le da el acceso. Uno de cada tipo,
 * se puede cambiar o quitar con confirmación. El director puede compartir el rol de líder (colíder) cuando el líder quiera.
 */
export default function AccesosClub({ clubId, accesos, onCambio, onAviso }: {
  clubId: number; accesos: AccesosClubApi; onCambio: (a: AccesosClubApi) => void; onAviso: (ok: boolean, texto: string) => void;
}) {
  const [form, setForm] = useState<{ tipo: TipoAcceso; nombre: string; email: string; password: string; confirmacion: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [quitar, setQuitar] = useState<TipoAcceso | null>(null);
  const [colider, setColider] = useState<boolean | null>(null);

  const abrir = (tipo: TipoAcceso) => { setError(null); setForm({ tipo, nombre: '', email: '', password: '', confirmacion: '' }); };

  const guardar = async () => {
    if (!form) return;
    setGuardando(true); setError(null);
    try {
      const { data } = await api.post(`/club/clubes/${clubId}/accesos`, { tipo: form.tipo, nombre: form.nombre.trim(), email: form.email.trim(), password: form.password, password_confirmation: form.confirmacion });
      const a = leerAccesos(data?.accesos); if (a) onCambio(a);
      setForm(null);
      onAviso(true, typeof data?.message === 'string' ? data.message : 'Acceso registrado.');
    } catch (e) {
      setError(mensaje(e, 'No se pudo registrar el acceso.'));
    } finally {
      setGuardando(false);
    }
  };

  const ejecutar = async (fn: () => Promise<{ data: { accesos?: unknown; message?: string } }>, def: string) => {
    try {
      const { data } = await fn();
      const a = leerAccesos(data?.accesos); if (a) onCambio(a);
      onAviso(true, data?.message ?? def);
    } catch (e) {
      onAviso(false, mensaje(e, 'No se pudo completar la acción.'));
    }
  };

  const tarjeta = (tipo: TipoAcceso) => {
    const a = accesos[tipo];
    return (
      <li key={tipo} className="space-y-3 rounded-[16px] border p-4" style={{ borderColor: 'var(--app-rule)' }}>
        <div className="flex items-start gap-3">
          <span className="tone-chip shrink-0" data-tone={tipo === 'lider_b' ? 'sky' : 'violet'} aria-hidden="true">{tipo === 'lider_b' ? <Users /> : <UserCog />}</span>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-[var(--app-ink)]">{INFO[tipo].titulo}</p>
            <p className="text-xs text-[var(--app-ink-2)]">{INFO[tipo].ayuda}</p>
          </div>
        </div>
        {a ? (
          <>
            <div className="rounded-[12px] bg-[var(--auth-field)] px-3 py-2 text-sm">
              <p className="break-words font-semibold text-[var(--app-ink)]">{a.nombre}</p>
              <p className="break-words text-[var(--app-ink-2)]">{a.email}{a.desde ? ` · desde el ${formatDate(a.desde)}` : ''}</p>
            </div>
            {tipo === 'director' && (
              <div className="flex flex-wrap items-center gap-3 rounded-[12px] border px-3 py-2" style={{ borderColor: a.colider ? 'var(--tile-gold-fg)' : 'var(--app-rule)', backgroundColor: a.colider ? 'var(--tile-gold-bg)' : 'transparent' }}>
                <Crown className="h-4 w-4 shrink-0" style={{ color: 'var(--tile-gold-fg)' }} aria-hidden="true" />
                <span className="min-w-0 flex-1 text-sm">
                  <span className="block font-semibold text-[var(--app-ink)]">Compartir mi rol de líder</span>
                  <span className="block text-xs text-[var(--app-ink-2)]">{a.colider ? `Activo${a.colider_desde ? ` desde el ${formatDate(a.colider_desde)}` : ''}: puede editar, enviar y atender la logística.` : 'Para cuando no puedas asistir. Lo retomas cuando quieras.'}</span>
                </span>
                <button type="button" role="switch" aria-checked={a.colider} aria-label="Compartir mi rol de líder con el director" onClick={() => setColider(!a.colider)}
                  className="tema-switch" data-oscuro={a.colider ? '' : undefined}>
                  <span className="tema-switch-icono" aria-hidden="true" />
                  <span className="tema-switch-icono" aria-hidden="true" />
                  <span className="tema-switch-perilla" aria-hidden="true">{a.colider ? <Crown /> : <UserIcon />}</span>
                </button>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="soft" onClick={() => abrir(tipo)}><Repeat className="h-4 w-4" aria-hidden="true" />Cambiar</Button>
              <Button size="sm" variant="destructive" onClick={() => setQuitar(tipo)}><Trash2 className="h-4 w-4" aria-hidden="true" />Quitar acceso</Button>
            </div>
          </>
        ) : (
          <Button size="sm" onClick={() => abrir(tipo)}><UserPlus className="h-4 w-4" aria-hidden="true" />{tipo === 'lider_b' ? 'Registrar líder B' : 'Registrar director(a)'}</Button>
        )}
      </li>
    );
  };

  const f = form;
  const director = accesos.director;
  return (
    <section className="app-card space-y-4 p-5" aria-labelledby="sec-accesos">
      <div>
        <h2 id="sec-accesos" className="flex items-center gap-2 text-base font-bold text-[var(--app-ink)]"><Users className="h-5 w-5" style={{ color: 'var(--auth-vino)' }} aria-hidden="true" />Acompañantes del club</h2>
        <p className="text-sm text-[var(--app-ink-2)]">Dales acceso para que sigan a tu club. No cuentan como integrantes.</p>
      </div>
      <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">{tarjeta('lider_b')}{tarjeta('director')}</ul>

      <StepFrame open={f !== null} size="md" title={f ? `${accesos[f.tipo] ? 'Cambiar' : 'Registrar'} ${INFO[f.tipo].titulo.toLowerCase()}` : ''} icon={<UserPlus className="h-5 w-5" />}
        intro={<>Escribe sus datos y una contraseña para su primer acceso. <strong>Compártela en persona</strong>: nunca la enviamos por correo y se le pedirá cambiarla al entrar.{f && accesos[f.tipo] ? ' Al guardar, la persona anterior pierde el acceso.' : ''}</>}
        onClose={() => setForm(null)} onSubmit={guardar} submitting={guardando} submitLabel="Dar acceso" error={error}
        steps={[{
          key: 'datos', label: 'Datos', question: '¿Quién va a acompañar a tu club?',
          validate: () => {
            if (!f) return null;
            if (f.nombre.trim().length < 3) return 'Escribe su nombre completo.';
            if (!PATRON_CORREO.test(f.email.trim())) return 'Escribe un correo válido.';
            const r = validarPassword(f.password); if (r) return r;
            if (f.password !== f.confirmacion) return 'La confirmación no coincide con la contraseña.';
            return null;
          },
          content: f ? (
            <div className="space-y-4">
              {([['nombre', 'Nombre completo', 'text', UserIcon, 'name'], ['email', 'Correo', 'email', Mail, 'email'], ['password', 'Contraseña para su primer acceso', 'password', Lock, 'new-password'], ['confirmacion', 'Confirma la contraseña', 'password', Lock, 'new-password']] as const).map(([k, label, tipo, Icono, auto]) => (
                <div key={k} className="space-y-1.5">
                  <label htmlFor={`acc-${k}`} className="text-xs font-bold uppercase tracking-widest text-[var(--app-ink-2)]">{label} *</label>
                  <div className="relative">
                    <Icono className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--app-ink-2)]" aria-hidden="true" />
                    <input id={`acc-${k}`} type={tipo} autoComplete={auto} maxLength={k === 'nombre' ? 150 : 255} className="auth-input auth-input-static !pl-9"
                      value={f[k]} onChange={(e) => setForm({ ...f, [k]: e.target.value })} />
                  </div>
                  {k === 'password' && <p className="text-xs text-[var(--app-ink-2)]">{PASSWORD_HINT}</p>}
                  {k === 'email' && <p className="text-xs text-[var(--app-ink-2)]">Si ya tiene cuenta en SIDECyT con ese correo, solo le damos el acceso: entra con su contraseña de siempre.</p>}
                </div>
              ))}
            </div>
          ) : null,
        }]} />

      <ConfirmDialog open={quitar !== null} variant="destructive" title={quitar ? `¿Quitar el acceso del ${INFO[quitar].titulo.toLowerCase()}?` : ''}
        description="Dejará de ver tu club y le avisaremos. Puedes volver a darle acceso después." confirmLabel="Sí, quitar acceso"
        onCancel={() => setQuitar(null)}
        onConfirm={() => { const t = quitar; setQuitar(null); if (t) void ejecutar(() => api.delete(`/club/clubes/${clubId}/accesos/${t}`), 'Acceso retirado.'); }} />
      <ConfirmDialog open={colider !== null} title={colider ? '¿Compartir tu rol de líder con el director?' : '¿Retomar tu rol de líder?'}
        description={colider
          ? `${director?.nombre ?? 'El director'} podrá editar el club, enviarlo, pedir transporte y box lunch y subir documentos, y recibirá los avisos del club. Puedes retomar el rol cuando quieras.`
          : 'El director volverá a solo ver el club.'}
        confirmLabel={colider ? 'Sí, compartir' : 'Sí, retomar'} onCancel={() => setColider(null)}
        onConfirm={() => { const v = colider; setColider(null); if (v !== null) void ejecutar(() => api.put(`/club/clubes/${clubId}/accesos/director/colider`, { colider: v }), v ? 'El director ya comparte el rol de líder.' : 'Retomaste el rol de líder.'); }} />
    </section>
  );
}
