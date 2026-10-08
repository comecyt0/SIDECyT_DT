'use client';

import { useState } from 'react';
import { UserPlus, Users, UserCog, Trash2, Repeat, Crown, Mail, Lock, User as UserIcon, ArrowLeftRight } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import StepFrame from '@/components/ui/step-frame';
import { BotonVerContrasena, SemaforoContrasena } from '@/components/ui/campo-contrasena';
import { Asterisco } from '@/components/ui/obligatorio';
import { validarPassword } from '@/lib/password-policy';
import { PATRON_CORREO } from '@/lib/registro';
import { formatDate } from '@/lib/format';

export type TipoAcceso = 'lider_a' | 'lider_b' | 'director';
export interface AccesoClub { nombre: string | null; email: string | null; colider: boolean; colider_desde: string | null; desde: string | null }
/** 08/10/2026: forma de la API (lista blanca): tipos según quién registró el club y qué puede hacer quien mira. */
export interface AccesosClubApi {
  dueno_director: boolean;
  tipos: TipoAcceso[];
  puede: { gestionar: boolean; compartir: TipoAcceso[]; ceder: TipoAcceso[] };
  items: Partial<Record<TipoAcceso, AccesoClub | null>>;
}

const TIPOS: TipoAcceso[] = ['lider_a', 'lider_b', 'director'];
const TITULO: Record<TipoAcceso, string> = { lider_a: 'Líder A', lider_b: 'Líder B', director: 'Director(a) de la escuela' };

function ayuda(tipo: TipoAcceso, duenoDirector: boolean): string {
  if (tipo === 'lider_a') return 'Cuenta como integrante: al darle acceso aparece en Integrantes. Es el docente responsable del club; ve todo y opera cuando le compartas el permiso.';
  if (tipo === 'lider_b') return `Cuenta como integrante: al darle acceso aparece en Integrantes para completar sus datos. Ve el registro, el QR, la credencial y la logística; opera cuando ${duenoDirector ? 'el líder A o tú le compartan' : 'le compartas'} el permiso.`;
  return 'Opcional. Acompaña al club (no cuenta como integrante) y ve lo mismo que el líder B. Puedes compartirle el permiso si no puedes asistir.';
}

export function leerAccesos(v: unknown): AccesosClubApi | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const lista = (x: unknown): TipoAcceso[] => (Array.isArray(x) ? x.filter((t): t is TipoAcceso => TIPOS.includes(t as TipoAcceso)) : []);
  const uno = (x: unknown): AccesoClub | null => {
    if (!x || typeof x !== 'object') return null;
    const a = x as Record<string, unknown>;
    return { nombre: typeof a.nombre === 'string' ? a.nombre : null, email: typeof a.email === 'string' ? a.email : null, colider: a.colider === true,
      colider_desde: typeof a.colider_desde === 'string' ? a.colider_desde : null, desde: typeof a.desde === 'string' ? a.desde : null };
  };
  const tipos = lista(o.tipos);
  if (!tipos.length) return null;
  const p = (o.puede && typeof o.puede === 'object' ? o.puede : {}) as Record<string, unknown>;
  const items = (o.items && typeof o.items === 'object' ? o.items : {}) as Record<string, unknown>;
  return {
    dueno_director: o.dueno_director === true,
    tipos,
    puede: { gestionar: p.gestionar === true, compartir: lista(p.compartir), ceder: lista(p.ceder) },
    items: Object.fromEntries(tipos.map((t) => [t, uno(items[t])])),
  };
}

function mensaje(e: unknown, def: string): string {
  const d = (e as { response?: { status?: number; data?: { message?: string; errors?: Record<string, string[]> } } })?.response;
  if (d?.status === 429) return 'Demasiados cambios seguidos. Espera unos minutos.';
  const primero = d?.data?.errors ? Object.values(d.data.errors).flat()[0] : null;
  return primero || d?.data?.message || def;
}

/**
 * E61 + 08/10/2026 — Acompañantes del club. Club de un docente: líder B y, opcional, director. Club del director: líder A
 * y líder B. El dueño da de alta (nombre, correo y contraseña de primer acceso) y quita; en cadena director → líder A →
 * líder B se puede **compartir** el permiso (los dos operan) o **ceder** el lugar (intercambian rol y permisos).
 */
export default function AccesosClub({ clubId, accesos, onCambio, onAviso, onCedido }: {
  clubId: number; accesos: AccesosClubApi; onCambio: (a: AccesosClubApi) => void; onAviso: (ok: boolean, texto: string) => void;
  /** Tras ceder cambia lo que ve quien cedió: la página recarga. */
  onCedido?: () => void;
}) {
  const [form, setForm] = useState<{ tipo: TipoAcceso; nombre: string; email: string; password: string; confirmacion: string } | null>(null);
  const [ver, setVer] = useState({ password: false, confirmacion: false });
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [quitar, setQuitar] = useState<TipoAcceso | null>(null);
  const [compartir, setCompartir] = useState<{ tipo: TipoAcceso; activo: boolean } | null>(null);
  const [ceder, setCeder] = useState<TipoAcceso | null>(null);
  const { puede } = accesos;

  const abrir = (tipo: TipoAcceso) => { setError(null); setVer({ password: false, confirmacion: false }); setForm({ tipo, nombre: '', email: '', password: '', confirmacion: '' }); };

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

  const ejecutar = async (fn: () => Promise<{ data: { accesos?: unknown; message?: string } }>, def: string, despues?: () => void) => {
    try {
      const { data } = await fn();
      const a = leerAccesos(data?.accesos); if (a) onCambio(a);
      onAviso(true, data?.message ?? def);
      despues?.();
    } catch (e) {
      onAviso(false, mensaje(e, 'No se pudo completar la acción.'));
    }
  };

  const tarjeta = (tipo: TipoAcceso) => {
    const a = accesos.items[tipo] ?? null;
    const puedeCompartir = puede.compartir.includes(tipo);
    const puedeCeder = puede.ceder.includes(tipo);
    return (
      <li key={tipo} className="space-y-3 rounded-[16px] border p-4" style={{ borderColor: 'var(--app-rule)' }}>
        <div className="flex items-start gap-3">
          <span className="tone-chip shrink-0" data-tone={tipo === 'director' ? 'violet' : tipo === 'lider_a' ? 'gold' : 'sky'} aria-hidden="true">{tipo === 'director' ? <UserCog /> : tipo === 'lider_a' ? <Crown /> : <Users />}</span>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-[var(--app-ink)]">{TITULO[tipo]}</p>
            <p className="text-xs text-[var(--app-ink-2)]">{ayuda(tipo, accesos.dueno_director)}</p>
          </div>
        </div>
        {a ? (
          <>
            <div className="rounded-[12px] bg-[var(--auth-field)] px-3 py-2 text-sm">
              <p className="break-words font-semibold text-[var(--app-ink)]">{a.nombre}</p>
              <p className="break-words text-[var(--app-ink-2)]">{a.email}{a.desde ? ` · desde el ${formatDate(a.desde)}` : ''}</p>
            </div>
            {(puedeCompartir || a.colider) && (
              <div className="flex flex-wrap items-center gap-3 rounded-[12px] border px-3 py-2" style={{ borderColor: a.colider ? 'var(--tile-gold-fg)' : 'var(--app-rule)', backgroundColor: a.colider ? 'var(--tile-gold-bg)' : 'transparent' }}>
                <Crown className="h-4 w-4 shrink-0" style={{ color: 'var(--tile-gold-fg)' }} aria-hidden="true" />
                <span className="min-w-0 flex-1 text-sm">
                  <span className="block font-semibold text-[var(--app-ink)]">Compartir el permiso de operar</span>
                  <span className="block text-xs text-[var(--app-ink-2)]">{a.colider ? `Activo${a.colider_desde ? ` desde el ${formatDate(a.colider_desde)}` : ''}: puede editar, enviar y atender la logística.` : 'Los dos podrán operar el club. Lo retiras cuando quieras.'}</span>
                </span>
                {puedeCompartir && (
                  <button type="button" role="switch" aria-checked={a.colider} aria-label={`Compartir el permiso con ${TITULO[tipo]}`} onClick={() => setCompartir({ tipo, activo: !a.colider })}
                    className="tema-switch" data-oscuro={a.colider ? '' : undefined}>
                    <span className="tema-switch-icono" aria-hidden="true" />
                    <span className="tema-switch-icono" aria-hidden="true" />
                    <span className="tema-switch-perilla" aria-hidden="true">{a.colider ? <Crown /> : <UserIcon />}</span>
                  </button>
                )}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {puedeCeder && <Button size="sm" variant="soft" onClick={() => setCeder(tipo)}><ArrowLeftRight className="h-4 w-4" aria-hidden="true" />Ceder mi lugar</Button>}
              {puede.gestionar && <Button size="sm" variant="soft" onClick={() => abrir(tipo)}><Repeat className="h-4 w-4" aria-hidden="true" />Cambiar</Button>}
              {puede.gestionar && <Button size="sm" variant="destructive" onClick={() => setQuitar(tipo)}><Trash2 className="h-4 w-4" aria-hidden="true" />Quitar acceso</Button>}
            </div>
          </>
        ) : puede.gestionar ? (
          <Button size="sm" onClick={() => abrir(tipo)}><UserPlus className="h-4 w-4" aria-hidden="true" />Registrar {TITULO[tipo].toLowerCase()}</Button>
        ) : (
          <p className="text-xs text-[var(--app-ink-2)]">Aún no está registrado.</p>
        )}
      </li>
    );
  };

  const f = form;
  const nombreDe = (t: TipoAcceso | null) => (t ? accesos.items[t]?.nombre ?? TITULO[t] : '');
  return (
    <section className="app-card space-y-4 p-5" aria-labelledby="sec-accesos">
      <div>
        <h2 id="sec-accesos" className="flex items-center gap-2 text-base font-bold text-[var(--app-ink)]"><Users className="h-5 w-5" style={{ color: 'var(--auth-vino)' }} aria-hidden="true" />{accesos.dueno_director ? 'Líderes del club' : 'Acompañantes del club'}</h2>
        <p className="text-sm text-[var(--app-ink-2)]">
          {accesos.dueno_director
            ? 'Como director(a), da de alta al líder A y al líder B. Los dos cuentan como integrantes; tú no.'
            : 'Dales acceso para que sigan a tu club. El líder B cuenta como integrante; el director no.'}
        </p>
      </div>
      <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">{accesos.tipos.map(tarjeta)}</ul>

      <StepFrame open={f !== null} size="md" title={f ? `${accesos.items[f.tipo] ? 'Cambiar' : 'Registrar'} ${TITULO[f.tipo].toLowerCase()}` : ''} icon={<UserPlus className="h-5 w-5" />}
        intro={<>Escribe sus datos y una contraseña para su primer acceso. <strong>Compártela en persona</strong>: nunca la enviamos por correo y se le pedirá cambiarla al entrar.{f && accesos.items[f.tipo] ? ' Al guardar, la persona anterior pierde el acceso.' : ''}</>}
        onClose={() => setForm(null)} onSubmit={guardar} submitting={guardando} submitLabel="Dar acceso" error={error}
        steps={[{
          key: 'datos', label: 'Datos', question: '¿Quién va a acompañar al club?',
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
              {([['nombre', 'Nombre completo', 'text', UserIcon, 'name'], ['email', 'Correo', 'email', Mail, 'email'], ['password', 'Contraseña para su primer acceso', 'password', Lock, 'new-password'], ['confirmacion', 'Confirma la contraseña', 'password', Lock, 'new-password']] as const).map(([k, label, tipo, Icono, auto]) => {
                const esClave = k === 'password' || k === 'confirmacion';
                const visible = esClave && ver[k];
                return (
                  <div key={k} className="space-y-1.5">
                    <label htmlFor={`acc-${k}`} className="text-xs font-bold uppercase tracking-widest text-[var(--app-ink-2)]">{label} <Asterisco /></label>
                    <div className="relative">
                      <Icono className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--app-ink-2)]" aria-hidden="true" />
                      <input id={`acc-${k}`} type={esClave ? (visible ? 'text' : 'password') : tipo} autoComplete={auto} maxLength={k === 'nombre' ? 150 : 255}
                        className={`auth-input auth-input-static !pl-9 ${esClave ? '!pr-12' : ''}`}
                        value={f[k]} onChange={(e) => setForm({ ...f, [k]: e.target.value })} />
                      {esClave && <BotonVerContrasena visible={visible} onToggle={() => setVer((v) => ({ ...v, [k]: !v[k] }))} etiqueta={k === 'password' ? 'contraseña' : 'confirmación'} />}
                    </div>
                    {k === 'password' && <SemaforoContrasena valor={f.password} />}
                    {k === 'confirmacion' && f.confirmacion && (
                      <p className="text-xs font-semibold" style={{ color: f.password === f.confirmacion ? 'var(--tile-emerald-fg)' : 'var(--destructive)' }}>
                        {f.password === f.confirmacion ? 'Las contraseñas coinciden.' : 'Las contraseñas no coinciden.'}
                      </p>
                    )}
                    {k === 'email' && <p className="text-xs text-[var(--app-ink-2)]">Si ya tiene cuenta en SIDECyT con ese correo, solo le damos el acceso: entra con su contraseña de siempre.</p>}
                  </div>
                );
              })}
            </div>
          ) : null,
        }]} />

      <ConfirmDialog open={quitar !== null} variant="destructive" title={quitar ? `¿Quitar el acceso del ${TITULO[quitar].toLowerCase()}?` : ''}
        description="Dejará de ver el club y le avisaremos. Si cuenta como integrante, también sale de Integrantes. Puedes volver a darle acceso después." confirmLabel="Sí, quitar acceso"
        onCancel={() => setQuitar(null)}
        onConfirm={() => { const t = quitar; setQuitar(null); if (t) void ejecutar(() => api.delete(`/club/clubes/${clubId}/accesos/${t}`), 'Acceso retirado.'); }} />
      <ConfirmDialog open={compartir !== null} title={compartir?.activo ? `¿Compartir el permiso con ${nombreDe(compartir.tipo)}?` : '¿Retirar el permiso compartido?'}
        description={compartir?.activo
          ? 'Podrá editar el club, enviarlo, pedir transporte y box lunch y subir documentos, y recibirá los avisos del club. Tú sigues igual y puedes retirarlo cuando quieras.'
          : 'Volverá a solo ver el club.'}
        confirmLabel={compartir?.activo ? 'Sí, compartir' : 'Sí, retirar'} onCancel={() => setCompartir(null)}
        onConfirm={() => { const c = compartir; setCompartir(null); if (c) void ejecutar(() => api.put(`/club/clubes/${clubId}/accesos/${c.tipo}/compartir`, { colider: c.activo }), 'Listo.'); }} />
      <ConfirmDialog open={ceder !== null} title={`¿Ceder tu lugar a ${nombreDe(ceder)}?`}
        description={`Intercambiarán rol y permisos: ${nombreDe(ceder)} quedará en tu lugar y tú en el suyo (${ceder ? TITULO[ceder] : ''}). Si después quieren regresar, ella o él puede cederte el lugar otra vez.`}
        confirmLabel="Sí, ceder mi lugar" onCancel={() => setCeder(null)}
        onConfirm={() => { const t = ceder; setCeder(null); if (t) void ejecutar(() => api.post(`/club/clubes/${clubId}/ceder`, { tipo: t, confirmar: true }), 'Lugar cedido.', onCedido); }} />
    </section>
  );
}
