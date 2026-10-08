'use client';

import { useState } from 'react';
import { KeyRound, Loader2, LogOut, Lock } from 'lucide-react';
import { BandaInstitucional } from '@/components/branding/Logos';
import api from '@/lib/api';
import { PASSWORD_HINT, validarPassword } from '@/lib/password-policy';
import { BotonVerContrasena, SemaforoContrasena } from '@/components/ui/campo-contrasena';
import { PANEL_POR_ROL, type RolSlug } from '@/lib/roles';

/**
 * E61 — Cambio obligatorio de contraseña. Lo ve quien entra con una contraseña que definió otra persona (el líder de club
 * al dar acceso a su líder B o director). proxy.ts manda aquí mientras el JWT traiga `cambiar`; el servidor bloquea el
 * resto del API con 403 hasta que se cambie. Al terminar, el servidor entrega un JWT nuevo y se entra al panel.
 */
export default function CambiarContrasenaPage() {
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [ver, setVer] = useState({ actual: false, nueva: false, confirmacion: false });

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const regla = validarPassword(nueva);
    if (regla) { setError(regla); return; }
    if (nueva !== confirmacion) { setError('La confirmación no coincide con la nueva contraseña.'); return; }
    if (nueva === actual) { setError('La nueva contraseña debe ser distinta de la que te dieron.'); return; }
    setGuardando(true);
    try {
      const { data } = await api.put('/auth/change-password', { current_password: actual, new_password: nueva, new_password_confirmation: confirmacion });
      const slug = (data?.user?.rol?.slug ?? '') as RolSlug;
      // Recarga completa: el proxy debe leer la cookie nueva (sin la marca de cambio).
      window.location.assign(PANEL_POR_ROL[slug] ?? '/login');
    } catch (er) {
      const d = (er as { response?: { status?: number; data?: { error?: string; message?: string; errors?: Record<string, string[]> } } })?.response;
      const primero = d?.data?.errors ? Object.values(d.data.errors).flat()[0] : null;
      setError(d?.status === 429 ? 'Demasiados intentos. Espera un momento.' : primero || d?.data?.error || d?.data?.message || 'No se pudo cambiar la contraseña. Inténtalo de nuevo.');
      setGuardando(false);
    }
  };

  const salir = async () => {
    try { await api.post('/auth/logout'); } catch { /* sin sesión: igual se sale */ }
    window.location.assign('/login');
  };

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--auth-paper)] font-sans text-[var(--auth-ink)]">
      <BandaInstitucional className="flex-none" />
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-[420px] rounded-[24px] bg-[var(--auth-white,#fff)] p-6 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.35)] sm:p-8">
          <span className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl" style={{ background: 'var(--auth-vino-soft)', color: 'var(--auth-vino)' }}>
            <KeyRound className="h-7 w-7" aria-hidden="true" />
          </span>
          <h1 className="text-center text-2xl font-bold leading-tight tracking-[-0.02em]">Crea tu propia contraseña</h1>
          <p className="mt-2 text-center text-[15px] leading-relaxed text-[var(--auth-ink-2)]">
            Entraste con la contraseña que te dio el líder del club. Por seguridad, cámbiala por una que solo tú conozcas.
          </p>
          {error && <p role="alert" className="mt-5 rounded-[14px] px-4 py-3 text-sm" style={{ backgroundColor: 'var(--tile-vino-bg)', color: 'var(--auth-danger)' }}>{error}</p>}
          <form onSubmit={enviar} className="mt-6 space-y-4" noValidate>
            {([
              ['actual', 'Contraseña que te dieron', actual, setActual, 'current-password'],
              ['nueva', 'Nueva contraseña', nueva, setNueva, 'new-password'],
              ['confirmacion', 'Confirma la nueva contraseña', confirmacion, setConfirmacion, 'new-password'],
            ] as const).map(([id, label, valor, set, auto]) => (
              <div key={id} className="space-y-1.5">
                <label htmlFor={`cc-${id}`} className="text-sm font-semibold">{label}</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--auth-ink-2)]" aria-hidden="true" />
                  <input id={`cc-${id}`} type={ver[id] ? 'text' : 'password'} autoComplete={auto} required value={valor} onChange={(e) => set(e.target.value)}
                    className="auth-input auth-input-static !pl-9 !pr-12" aria-describedby={id === 'nueva' ? 'cc-regla' : undefined} />
                  <BotonVerContrasena visible={ver[id]} onToggle={() => setVer((v) => ({ ...v, [id]: !v[id] }))} etiqueta={label.toLowerCase()} />
                </div>
                {id === 'nueva' && <p id="cc-regla" className="text-xs text-[var(--auth-ink-2)]">{PASSWORD_HINT}</p>}
                {id === 'nueva' && <SemaforoContrasena valor={nueva} />}
              </div>
            ))}
            <button type="submit" disabled={guardando || !actual || !nueva || !confirmacion} className="auth-submit w-full">
              {guardando ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Guardando…</> : 'Guardar y entrar'}
            </button>
          </form>
          <button type="button" onClick={() => void salir()} className="auth-link mx-auto mt-6 flex items-center gap-1.5 text-sm">
            <LogOut className="h-4 w-4" aria-hidden="true" />Salir
          </button>
        </div>
      </main>
    </div>
  );
}
